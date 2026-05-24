// ─── Dexie hooks → triggerPush ──────────────────────────────────────
// Toda vez que algo é criado/atualizado/deletado localmente, marca
// updatedAt automaticamente e agenda um push debounced.
//
// Tabelas internas do sync (syncMappings, syncMeta) NÃO disparam push —
// elas existem só pra rastreabilidade local.

import { db } from '@/db/schema'
import { TABLES } from '@/lib/sync/config'
import { triggerPush } from '@/lib/sync/engine'
import { deleteMapping, getRemoteId } from '@/lib/sync/mapping'
import { supabase, getUserId } from '@/lib/supabase'

let installed = false

export function setupSyncHooks() {
  if (installed) return
  installed = true

  // Pra cada tabela sincronizável, instala hooks
  for (const tableName of Object.keys(TABLES)) {
    const config = TABLES[tableName]
    const table = config.dexie()

    // creating: garante updatedAt antes do INSERT
    table.hook('creating', (_pk, obj: Record<string, unknown>) => {
      if (obj.updatedAt == null) obj.updatedAt = Date.now()
      // Dispara push debounced (espera o ID ser atribuído)
      queueMicrotask(() => triggerPush())
    })

    // updating: atualiza updatedAt + dispara push (SEMPRE)
    // Bug histórico: o triggerPush() só rodava no `else` (quando o caller
    // NÃO passava updatedAt). Mas TODOS os helpers passam updatedAt
    // manualmente — resultado: edits silenciosamente paravam de sincronizar
    // até o próximo create/delete. Agora dispara push em qualquer update.
    table.hook('updating', (mods: Record<string, unknown>) => {
      queueMicrotask(() => triggerPush())
      if (!('updatedAt' in mods)) {
        return { ...mods, updatedAt: Date.now() }
      }
      return undefined
    })

    // deleting: soft delete no remoto (UPDATE deleted=true) + remove mapping local
    table.hook('deleting', (localId: number) => {
      // Captura o uuid antes de apagar
      const remoteUuid = getRemoteId(tableName, localId)
      if (remoteUuid) {
        // Async fire-and-forget: marca deleted=true no Supabase
        queueMicrotask(async () => {
          try {
            const userId = await getUserId()
            if (!userId) return
            await supabase
              .from(config.remoteTable)
              .update({ deleted: true, updated_at: new Date().toISOString() })
              .eq('id', remoteUuid)
              .eq('user_id', userId)
            await deleteMapping(tableName, localId)
          } catch (e) {
            console.warn(`[sync delete] ${tableName}:`, e)
          }
        })
      }
    })
  }

  // syncMappings e syncMeta: nenhum hook — são internas

  // Categorias seed: muitas inserções de uma vez, debounce já protege
}

export function isSyncHooksInstalled() {
  return installed
}

// Mantém referência pro lint não reclamar
export { db }

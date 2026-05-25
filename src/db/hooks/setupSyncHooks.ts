// ─── Dexie hooks → triggerPush ──────────────────────────────────────
// Toda vez que algo é criado/atualizado/deletado localmente, marca
// updatedAt automaticamente e agenda um push debounced.
//
// Tabelas internas do sync (syncMappings, syncMeta) NÃO disparam push —
// elas existem só pra rastreabilidade local.

import { db } from '@/db/schema'
import { TABLES } from '@/lib/sync/config'
import { triggerPush, isPulling } from '@/lib/sync/engine'
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
    // Pull também cria records remotamente — checa isPulling() pra não
    // disparar push do que acabou de chegar (echo loop entre 2 devices).
    table.hook('creating', (_pk, obj: Record<string, unknown>) => {
      if (obj.updatedAt == null) obj.updatedAt = Date.now()
      if (!isPulling()) {
        queueMicrotask(() => triggerPush())
      }
    })

    // updating: atualiza updatedAt + dispara push (SEMPRE, exceto durante pull)
    // Bug histórico 1: o triggerPush() só rodava no `else` (quando o caller
    // NÃO passava updatedAt). Mas TODOS os helpers passam updatedAt
    // manualmente — resultado: edits silenciosamente paravam de sincronizar
    // até o próximo create/delete. Agora dispara push em qualquer update.
    // Bug histórico 2: pull em device A escrevia local → updating hook → push
    // → device B recebia → updating hook → push de volta = loop perpétuo.
    // Fix: pull seta isPulling()=true, hook checa e pula triggerPush.
    // BUG R11/12: retornar `{ ...mods, updatedAt }` (objeto INTEIRO) corrompia
    // o `optimisticOps` do dexie-react-hooks → crash 'null is not an object
    // evaluating n.type' em dr@reduce após 'entrar na plataforma'.
    // Docs Dexie: hook updating deve retornar APENAS o DELTA de novas mods,
    // não mods inteiro. Returning `{ updatedAt: Date.now() }` é correto.
    table.hook('updating', (mods: Record<string, unknown>) => {
      if (!isPulling()) {
        queueMicrotask(() => triggerPush())
      }
      if (!('updatedAt' in mods)) {
        return { updatedAt: Date.now() }  // só o DELTA — não { ...mods }
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

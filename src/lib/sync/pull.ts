// ─── Pull: traz mudanças remotas pro local ──────────────────────────

import { supabase, getUserId } from '@/lib/supabase'
import { TABLES, SYNC_TABLES_ORDERED } from './config'
import { snakeToCamel } from './camelSnake'
import { getLocalId, setMapping, deleteMapping, getMeta, setMeta, lastPullKey, resolveFksToLocal } from './mapping'
import { setPulling } from './engine'

// Converte record remoto pro shape local do Dexie.
function remoteToLocalRecord(
  remote: Record<string, unknown>,
  config: typeof TABLES[string],
): Record<string, unknown> {
  // Renomeia snake_case → camelCase, exclui campos só-do-server
  const skip = new Set(['user_id', 'created_at', 'local_id', 'deleted'])
  const local: Record<string, unknown> = {}
  for (const k of Object.keys(remote)) {
    if (skip.has(k)) continue
    local[snakeToCamel(k)] = remote[k]
  }

  // Converte updated_at (ISO string) → number (ms)
  if (typeof local.updatedAt === 'string') {
    local.updatedAt = new Date(local.updatedAt).getTime()
  }

  // Resolve FKs uuid → local_id
  const resolved = resolveFksToLocal(local, config.fks)

  // Remove o uuid 'id' do payload local (Dexie usa local int id)
  delete resolved.id
  return resolved
}

// Pull de uma única tabela: busca registros remotos com updated_at maior
// que o último pull. Aplica LWW.
export async function pullTable(tableName: string, opts: { full?: boolean } = {}): Promise<{ pulled: number; errors: number }> {
  const config = TABLES[tableName]
  if (!config) return { pulled: 0, errors: 0 }
  const userId = await getUserId()
  if (!userId) return { pulled: 0, errors: 0 }

  const sinceKey = lastPullKey(tableName)
  const sinceIso = opts.full ? null : await getMeta(sinceKey)

  let query = supabase
    .from(config.remoteTable)
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: true })
    .limit(500)
  if (sinceIso) query = query.gt('updated_at', sinceIso)

  const { data, error } = await query
  if (error) {
    console.warn(`[sync pull] ${tableName}:`, error.message)
    return { pulled: 0, errors: 1 }
  }
  if (!data || data.length === 0) return { pulled: 0, errors: 0 }

  let pulled = 0
  let maxAppliedUpdatedAt: string | null = null
  let hadErrors = false

  for (const remote of data) {
    const r = remote as Record<string, unknown>
    const remoteUuid = r.id as string
    const remoteUpdatedAt = r.updated_at as string
    const isDeleted = r.deleted === true

    if (typeof remoteUuid !== 'string') continue

    // Lookup local existente
    const localId = getLocalId(tableName, remoteUuid)

    if (isDeleted) {
      // Soft delete remoto → apaga local. Pra anexos, também limpa o
      // blob no Storage — sem isso, anexos deletados em outro device
      // ficam órfãos eternamente.
      //
      // CRÍTICO: deletar o mapping também — senão, próximo INSERT que reuse
      // local_id (Dexie autoincrement skips, mas mappings ficam stale)
      // tentaria UPDATE no remote uuid já marcado deleted=true e falharia
      // silenciosamente. Bug histórico: pull soft-delete deixava mapping
      // pendurado eternamente.
      if (localId != null) {
        try {
          if (tableName === 'anexos') {
            const anexo = await config.dexie().get(localId) as { storagePath?: string } | undefined
            if (anexo?.storagePath) {
              const { deleteAnexoFromStorage } = await import('@/lib/storage')
              await deleteAnexoFromStorage(anexo.storagePath).catch(() => { /* noop */ })
            }
          }
          await config.dexie().delete(localId)
          await deleteMapping(tableName, localId)
          // Soft-delete aplicado com sucesso — pode avançar cursor
          maxAppliedUpdatedAt = remoteUpdatedAt
        } catch {
          hadErrors = true
        }
      } else {
        // Soft-delete remoto pra row que nunca existiu local — também avança
        // cursor pra não re-pullar a mesma row mais tarde
        maxAppliedUpdatedAt = remoteUpdatedAt
      }
      continue
    }

    const localRecord = remoteToLocalRecord(r, config)
    const remoteUpdatedMs = new Date(remoteUpdatedAt).getTime()

    if (localId != null) {
      // UPDATE existente — LWW. Usa `>` (não `>=`) pra evitar que um
      // tie em ms reverta um edit local recente com a versão remota antiga.
      const existing = await config.dexie().get(localId) as Record<string, unknown> | undefined
      const existingUpdatedAt = (existing?.updatedAt as number) ?? 0
      if (remoteUpdatedMs > existingUpdatedAt) {
        try {
          await config.dexie().update(localId, localRecord)
          pulled += 1
          maxAppliedUpdatedAt = remoteUpdatedAt
        } catch (e) {
          console.warn(`[sync pull update] ${tableName}:`, e)
          hadErrors = true
        }
      } else {
        // LWW pulou (versão local é mais nova) — também avança cursor
        // porque não precisamos re-tentar essa row remota mais tarde
        maxAppliedUpdatedAt = remoteUpdatedAt
      }
    } else {
      // INSERT novo. Bug histórico: cursor avançava MESMO se INSERT falhasse
      // (unique violation, FK pending) → row nunca era re-pullada até full sync.
      // Agora só avança se o INSERT realmente aplicou.
      try {
        const newLocalId = await config.dexie().add(localRecord) as number
        await setMapping(tableName, newLocalId, remoteUuid)
        pulled += 1
        maxAppliedUpdatedAt = remoteUpdatedAt
      } catch (e) {
        console.warn(`[sync pull insert] ${tableName}:`, e)
        hadErrors = true
      }
    }
  }

  // Cursor advance é ALL-OR-NOTHING por batch. Se QUALQUER row falhou
  // (INSERT/UPDATE/storage), NÃO avança — próximo pull re-tenta TODAS
  // as rows desde o último ts aplicado com sucesso, incluindo as que
  // sucederam (LWW garante idempotência: rows já-aplicadas têm
  // remoteUpdatedMs === existingUpdatedAt → strict `>` pula). Custo:
  // re-pull de até 500 rows até o erro resolver (FK órfã, unique race).
  // Benefício: zero data-loss silenciosa por hole no cursor.
  if (maxAppliedUpdatedAt && !hadErrors) {
    await setMeta(sinceKey, maxAppliedUpdatedAt)
  }
  return { pulled, errors: hadErrors ? 1 : 0 }
}

export async function pullAll(opts: { full?: boolean } = {}): Promise<{ pulled: number; errors: number }> {
  let totalPulled = 0, totalErrors = 0
  // Sinaliza pros Dexie hooks (setupSyncHooks) que writes vêm do remoto.
  // Evita echo loop: pull → updating hook → triggerPush → outro device
  // recebe → push de volta = loop perpétuo entre devices sincronizando.
  setPulling(true)
  try {
    // Duas passadas pra resolver FKs órfãs que chegaram após filhos
    for (let pass = 0; pass < 2; pass += 1) {
      for (const t of SYNC_TABLES_ORDERED) {
        const r = await pullTable(t, { full: opts.full && pass === 0 })
        totalPulled += r.pulled
        totalErrors += r.errors
      }
    }
  } finally {
    setPulling(false)
  }
  return { pulled: totalPulled, errors: totalErrors }
}

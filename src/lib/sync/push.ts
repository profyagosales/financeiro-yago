// ─── Push: envia mudanças locais pro Supabase ───────────────────────

import { supabase, getUserId } from '@/lib/supabase'
import { TABLES, SYNC_TABLES_ORDERED } from './config'
import { camelToSnake } from './camelSnake'
import { getRemoteId, setMapping, resolveFksToRemote, getMeta, setMeta } from './mapping'

function lastPushKey(tableName: string): string { return `lastPush:${tableName}` }

// Converte um record do Dexie pro shape esperado pelo Supabase.
// - Remove campos que não existem no remoto (id local, syncId)
// - Renomeia camelCase → snake_case
// - Resolve FKs (local_id → uuid)
// - Inclui updated_at (LWW)
// Retorna null se FK órfã (pula esse record nessa iteração).
function recordToRemotePayload(
  record: Record<string, unknown>,
  config: typeof TABLES[string],
  userId: string,
): Record<string, unknown> | null {
  // Skip campos locais
  const skip = new Set(['id', 'syncId', ...(config.skipFields ?? [])])
  const clean: Record<string, unknown> = {}
  for (const k of Object.keys(record)) {
    if (!skip.has(k)) clean[k] = record[k]
  }

  // Resolve FKs antes de converter chaves
  const resolved = resolveFksToRemote(clean, config.fks)
  if (!resolved) return null  // FK órfã

  // Garante updated_at (LWW)
  if (resolved.updatedAt == null || typeof resolved.updatedAt !== 'number') {
    resolved.updatedAt = Date.now()
  }

  // Converte camelCase → snake_case
  const remote: Record<string, unknown> = {}
  for (const k of Object.keys(resolved)) {
    remote[camelToSnake(k)] = resolved[k]
  }

  // updated_at vem como number (ms) — converte pra ISO string
  if (typeof remote.updated_at === 'number') {
    remote.updated_at = new Date(remote.updated_at).toISOString()
  }

  // local_id mantém o int do Dexie (rastreabilidade)
  remote.local_id = record.id
  remote.user_id = userId

  return remote
}

// Push de uma única tabela: pega registros locais não-mappeados ou
// modificados desde último push, e faz upsert no Supabase.
//
// Dirty tracking: persistimos lastPushMs por tabela em syncMeta. Só
// considera registros com `updatedAt > lastPushMs` OU sem mapping (nunca
// foram pushed). Sem isso, push escaneava TODA a tabela toda vez —
// performance degradava com volume (5k transações × upsert dummy a cada
// edição).
//
// `opts.force = true` ignora o dirty filter (útil pra recovery após erros).
export async function pushTable(tableName: string, opts: { force?: boolean } = {}): Promise<{ pushed: number; orphans: number; errors: number }> {
  const config = TABLES[tableName]
  if (!config) return { pushed: 0, orphans: 0, errors: 0 }
  const userId = await getUserId()
  if (!userId) return { pushed: 0, orphans: 0, errors: 0 }

  // Cutoff de modificação. Se nunca pushed, lastIso=null → considera tudo.
  const lastIso = opts.force ? null : await getMeta(lastPushKey(tableName))
  const lastMs = lastIso ? new Date(lastIso).getTime() : 0

  const allRaw = await config.dexie().toArray() as Array<Record<string, unknown>>
  // Dirty filter: registros sem mapping (novos) OU modificados desde lastPush.
  const all = allRaw.filter(r => {
    if (r.id == null || typeof r.id !== 'number') return false
    const unmapped = getRemoteId(tableName, r.id) == null
    if (unmapped) return true
    const u = (r.updatedAt as number) ?? 0
    return u > lastMs
  })
  if (all.length === 0) return { pushed: 0, orphans: 0, errors: 0 }

  let pushed = 0, orphans = 0, errors = 0
  const batchSize = 50
  let maxUpdatedAt = lastMs

  for (let i = 0; i < all.length; i += batchSize) {
    const batch = all.slice(i, i + batchSize)
    const payloads: Record<string, unknown>[] = []
    const localIds: number[] = []

    for (const r of batch) {
      if (r.id == null || typeof r.id !== 'number') continue
      const payload = recordToRemotePayload(r, config, userId)
      if (!payload) { orphans += 1; continue }
      // Se já tem mapping, inclui o id remoto pra UPDATE em vez de INSERT
      const existingRemote = getRemoteId(tableName, r.id)
      if (existingRemote) payload.id = existingRemote

      // R12f defesa: NUNCA envia id como null/undefined no payload.
      // Algumas tabelas (ex: app_config legacy) tinham id NOT NULL no remote
      // mas sem default funcionando — null causava 400 'violates not-null'.
      // Se não tem mapping (insert novo), deixa Supabase gerar via default.
      if (payload.id == null) delete payload.id

      payloads.push(payload)
      localIds.push(r.id)
      const u = (r.updatedAt as number) ?? 0
      if (u > maxUpdatedAt) maxUpdatedAt = u
    }

    if (payloads.length === 0) continue

    const { data, error } = await supabase
      .from(config.remoteTable)
      .upsert(payloads, { onConflict: config.onConflictColumn ?? 'id' })
      .select('id, local_id')

    if (error) {
      errors += payloads.length
      console.warn(`[sync push] ${tableName}:`, error.message)
      continue
    }

    // Atualiza mappings com os uuids retornados
    if (data) {
      for (const row of data) {
        if (typeof row.local_id === 'number' && typeof row.id === 'string') {
          await setMapping(tableName, row.local_id, row.id)
        }
      }
    }
    pushed += payloads.length
  }

  // Avança o cutoff só se tudo deu certo, pra não pular registros num
  // próximo push em caso de erro parcial.
  if (errors === 0 && maxUpdatedAt > lastMs) {
    await setMeta(lastPushKey(tableName), new Date(maxUpdatedAt).toISOString())
  }

  return { pushed, orphans, errors }
}

// Push de todas as tabelas em ordem topológica.
// Tabelas com FKs órfãs são re-tentadas após os pais sincronizarem.
export async function pushAll(): Promise<{ pushed: number; errors: number }> {
  let totalPushed = 0, totalErrors = 0
  // Primeira passada: ordem topológica natural
  for (const t of SYNC_TABLES_ORDERED) {
    const r = await pushTable(t)
    totalPushed += r.pushed
    totalErrors += r.errors
  }
  // Segunda passada pra FKs órfãs que agora têm pai mapeado
  for (const t of SYNC_TABLES_ORDERED) {
    const r = await pushTable(t)
    totalPushed += r.pushed
    totalErrors += r.errors
  }
  return { pushed: totalPushed, errors: totalErrors }
}

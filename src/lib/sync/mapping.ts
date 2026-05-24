// ─── Mapping local_id (int Dexie) ↔ remote uuid (Supabase) ───────────
// Cache em memória pra lookup rápido + persistência em IndexedDB
// (table syncMappings) pra sobreviver reload.

import { db } from '@/db/schema'

// Cache em memória: tableName → Map<localId, remoteUuid>
const localToRemote = new Map<string, Map<number, string>>()
// Inverso: tableName → Map<remoteUuid, localId>
const remoteToLocal = new Map<string, Map<string, number>>()

function ensure(table: string) {
  if (!localToRemote.has(table)) localToRemote.set(table, new Map())
  if (!remoteToLocal.has(table)) remoteToLocal.set(table, new Map())
}

// Carrega todo o mapping do IndexedDB pra memória (chamado no boot)
export async function loadMappingsFromDB() {
  const all = await db.syncMappings.toArray()
  for (const m of all) {
    ensure(m.tableName)
    localToRemote.get(m.tableName)!.set(m.localId, m.remoteId)
    remoteToLocal.get(m.tableName)!.set(m.remoteId, m.localId)
  }
}

export function getRemoteId(table: string, localId: number): string | null {
  return localToRemote.get(table)?.get(localId) ?? null
}

export function getLocalId(table: string, remoteId: string): number | null {
  return remoteToLocal.get(table)?.get(remoteId) ?? null
}

export async function setMapping(table: string, localId: number, remoteId: string) {
  ensure(table)
  // Atualiza memória
  localToRemote.get(table)!.set(localId, remoteId)
  remoteToLocal.get(table)!.set(remoteId, localId)
  // Persiste em IndexedDB (upsert via &[tableName+localId] unique index)
  const existing = await db.syncMappings.where('[tableName+localId]').equals([table, localId]).first()
  if (existing?.id) {
    await db.syncMappings.update(existing.id, { remoteId, syncedAt: Date.now() })
  } else {
    await db.syncMappings.add({ tableName: table, localId, remoteId, syncedAt: Date.now() })
  }
}

export async function deleteMapping(table: string, localId: number) {
  const remoteId = localToRemote.get(table)?.get(localId)
  localToRemote.get(table)?.delete(localId)
  if (remoteId) remoteToLocal.get(table)?.delete(remoteId)
  const existing = await db.syncMappings.where('[tableName+localId]').equals([table, localId]).first()
  if (existing?.id) await db.syncMappings.delete(existing.id)
}

// Resolve FKs do record local pros uuids remotos.
// Retorna null se algum FK obrigatório não tem mapping (pai não sincronizado ainda).
export function resolveFksToRemote(
  record: Record<string, unknown>,
  fks: Record<string, string>,
): Record<string, unknown> | null {
  const out = { ...record }
  for (const [field, parentTable] of Object.entries(fks)) {
    const localId = record[field]
    if (localId == null || localId === undefined) continue  // FK opcional, ok
    if (typeof localId !== 'number') continue
    const remote = getRemoteId(parentTable, localId)
    if (!remote) {
      // FK órfã — pai ainda não sincronizou. Pula esse record agora,
      // tenta de novo depois.
      return null
    }
    out[field] = remote
  }
  return out
}

// Resolve FKs do record remoto pros local_ids locais.
// Se algum FK não tem mapping, deixa null no campo (será resolvido quando
// o pai chegar via pull).
export function resolveFksToLocal(
  record: Record<string, unknown>,
  fks: Record<string, string>,
): Record<string, unknown> {
  const out = { ...record }
  for (const [field, parentTable] of Object.entries(fks)) {
    const remoteUuid = record[field]
    if (remoteUuid == null || typeof remoteUuid !== 'string') continue
    const local = getLocalId(parentTable, remoteUuid)
    if (local) out[field] = local
    else out[field] = null  // pai ainda não chegou
  }
  return out
}

// ─── Meta key-value (last pull timestamp, etc) ──────────────────────
export async function getMeta(key: string): Promise<string | null> {
  const row = await db.syncMeta.where('key').equals(key).first()
  return row?.value ?? null
}

export async function setMeta(key: string, value: string) {
  const existing = await db.syncMeta.where('key').equals(key).first()
  if (existing?.id) {
    await db.syncMeta.update(existing.id, { value, updatedAt: Date.now() })
  } else {
    await db.syncMeta.add({ key, value, updatedAt: Date.now() })
  }
}

export function lastPullKey(table: string): string {
  return `lastPull:${table}`
}

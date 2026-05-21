import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Meta } from '../schema'

export function useMetas() {
  return useLiveQuery(() => db.metas.filter(m => m.ativo).toArray(), []) ?? []
}
export async function addMeta(data: Omit<Meta, 'id' | 'syncId' | 'updatedAt'>) {
  return db.metas.add({ ...data, updatedAt: Date.now() })
}
export async function aportarMeta(id: number, valor: number) {
  const meta = await db.metas.get(id)
  if (!meta) return
  return db.metas.update(id, { valorAtual: Math.min(meta.valorAtual + valor, meta.valorAlvo), updatedAt: Date.now() })
}
export async function deleteMeta(id: number) {
  return db.metas.update(id, { ativo: false, updatedAt: Date.now() })
}

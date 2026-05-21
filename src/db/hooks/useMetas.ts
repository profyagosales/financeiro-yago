import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Meta } from '../schema'

export function useMetas() {
  return useLiveQuery(() => db.metas.where('ativo').equals(1).toArray(), []) ?? []
}
export async function addMeta(data: Omit<Meta, 'id' | 'syncId' | 'updatedAt'>) {
  return db.metas.add({ ...data, updatedAt: Date.now() })
}
export async function aportarMeta(id: number, valor: number) {
  const meta = await db.metas.get(id)
  if (!meta) return
  const novoValor = Math.min(meta.valorAtual + valor, meta.valorAlvo)
  return db.metas.update(id, { valorAtual: novoValor, updatedAt: Date.now() })
}
export async function deleteMeta(id: number) {
  return db.metas.update(id, { ativo: false, updatedAt: Date.now() })
}

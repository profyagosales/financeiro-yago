import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Orcamento } from '../schema'

export function useOrcamentos() {
  return useLiveQuery(() => db.orcamentos.toArray(), []) ?? []
}
export async function addOrcamento(data: Omit<Orcamento, 'id' | 'syncId'>) {
  return db.orcamentos.add(data)
}
export async function editOrcamento(id: number, data: Partial<import('../schema').Orcamento>) {
  return db.orcamentos.update(id, data)
}
export async function deleteOrcamento(id: number) {
  return db.orcamentos.delete(id)
}

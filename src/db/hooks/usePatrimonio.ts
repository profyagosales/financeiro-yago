import { useLiveQuery } from 'dexie-react-hooks'
import { db, type PatrimonioItem } from '../schema'

export function usePatrimonio() {
  return useLiveQuery(() => db.patrimonio.toArray(), []) ?? []
}
export function useNetWorth() {
  const items = usePatrimonio()
  const ativos = items.filter(i => i.tipo === 'ativo').reduce((s, i) => s + i.valor, 0)
  const passivos = items.filter(i => i.tipo === 'passivo').reduce((s, i) => s + i.valor, 0)
  return { ativos, passivos, netWorth: ativos - passivos, items }
}
export async function addPatrimonioItem(data: Omit<PatrimonioItem, 'id' | 'syncId' | 'updatedAt'>) {
  return db.patrimonio.add({ ...data, updatedAt: Date.now() })
}
export async function updatePatrimonioItem(id: number, data: Partial<PatrimonioItem>) {
  return db.patrimonio.update(id, { ...data, updatedAt: Date.now() })
}
export async function deletePatrimonioItem(id: number) {
  return db.patrimonio.delete(id)
}

import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Conta } from '../schema'

export function useContas() {
  const contas = useLiveQuery(() => db.contas.where('ativo').equals(1).toArray(), [])
  return contas ?? []
}

export function useSaldoTotal() {
  const contas = useContas()
  return contas.reduce((sum, c) => sum + c.saldoAtual, 0)
}

export async function addConta(data: Omit<Conta, 'id' | 'syncId' | 'updatedAt'>) {
  return db.contas.add({ ...data, updatedAt: Date.now() })
}

export async function updateConta(id: number, data: Partial<Conta>) {
  return db.contas.update(id, { ...data, updatedAt: Date.now() })
}

export async function deleteConta(id: number) {
  return db.contas.update(id, { ativo: false, updatedAt: Date.now() })
}

import { useLiveQuery } from 'dexie-react-hooks'
import { db, type ContaFixa } from '../schema'

export function useContasFixas() {
  return useLiveQuery(() => db.contasFixas.filter(c => c.ativo).toArray(), []) ?? []
}
export function usePagamentosFixos(mes: number, ano: number) {
  return useLiveQuery(
    () => db.pagamentosFixos.where('[mes+ano]').equals([mes, ano]).toArray(),
    [mes, ano]
  ) ?? []
}
export async function addContaFixa(data: Omit<ContaFixa, 'id' | 'syncId'>) {
  const id = await db.contasFixas.add(data)
  const now = new Date()
  for (let i = 0; i < 4; i++) {
    let m = now.getMonth() + 1 + i
    let a = now.getFullYear()
    while (m > 12) { m -= 12; a += 1 }
    await db.pagamentosFixos.add({ contaFixaId: id as number, mes: m, ano: a, status: 'pendente' })
  }
  return id
}
export async function marcarPago(contaFixaId: number, mes: number, ano: number, valor: number) {
  const existing = await db.pagamentosFixos.where({ contaFixaId, mes, ano }).first()
  const today = new Date().toISOString().split('T')[0]
  if (existing) await db.pagamentosFixos.update(existing.id!, { status: 'pago', dataPagamento: today, valor })
  else await db.pagamentosFixos.add({ contaFixaId, mes, ano, status: 'pago', dataPagamento: today, valor })
}
export async function marcarPendente(contaFixaId: number, mes: number, ano: number) {
  const existing = await db.pagamentosFixos.where({ contaFixaId, mes, ano }).first()
  if (existing) await db.pagamentosFixos.update(existing.id!, { status: 'pendente', dataPagamento: undefined })
}
export async function deleteContaFixa(id: number) {
  return db.contasFixas.update(id, { ativo: false })
}

import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Cartao, type LancamentoCartao } from '../schema'

export function useCartoes() {
  return useLiveQuery(() => db.cartoes.filter(c => c.ativo).toArray(), []) ?? []
}
export async function addCartao(data: Omit<Cartao, 'id' | 'syncId'>) {
  return db.cartoes.add(data)
}
export async function deleteCartao(id: number) {
  return db.cartoes.update(id, { ativo: false })
}
export function useLancamentosCartao(cartaoId: number, mes: number, ano: number) {
  return useLiveQuery(
    () => db.lancamentosCartao.where('[cartaoId+mes+ano]').equals([cartaoId, mes, ano]).toArray(),
    [cartaoId, mes, ano]
  ) ?? []
}
export function useTotalFatura(cartaoId: number, mes: number, ano: number) {
  const l = useLancamentosCartao(cartaoId, mes, ano)
  return l.reduce((s, i) => s + i.valor, 0)
}
export function useAllLancamentosAtivos() {
  return useLiveQuery(
    () => db.lancamentosCartao.filter(l => l.parcelaAtual < l.totalParcelas || l.totalParcelas === 1).toArray(),
    []
  ) ?? []
}
export async function addLancamentoCartao(data: {
  cartaoId: number; descricao: string; valor: number; data: string
  categoriaId: number; totalParcelas: number; mes: number; ano: number
}) {
  const { totalParcelas, valor, ...base } = data
  const valorParcela = valor / totalParcelas
  const firstId = await db.lancamentosCartao.add({
    ...base, valor: valorParcela, parcelaAtual: 1, totalParcelas, mes: base.mes, ano: base.ano,
  })
  for (let p = 2; p <= totalParcelas; p++) {
    let m = base.mes + p - 1
    let a = base.ano
    while (m > 12) { m -= 12; a += 1 }
    await db.lancamentosCartao.add({
      ...base, valor: valorParcela, parcelaAtual: p, totalParcelas, mes: m, ano: a, parcelaPaiId: firstId as number,
    })
  }
  return firstId
}

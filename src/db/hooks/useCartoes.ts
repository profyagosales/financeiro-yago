import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Cartao, type LancamentoCartao } from '../schema'

export function useCartoes() {
  return useLiveQuery(() => db.cartoes.filter(c => c.ativo).toArray(), []) ?? []
}
export async function addCartao(data: Omit<Cartao, 'id' | 'syncId'>) {
  return db.cartoes.add(data)
}

// Soft-delete: marca ativo=false. updatedAt explícito garante que o sync
// detecte o write como dirty e propague pros outros devices. (Sem isso, o
// hook updating add updatedAt mas o flag dirty só dispara via triggerPush.)
export async function deleteCartao(id: number) {
  return db.cartoes.update(id, { ativo: false, updatedAt: Date.now() })
}

// Quantos lançamentos ATIVOS estão pendurados nesse cartão (em vida útil).
// Use antes de oferecer "Excluir cartão" pra avisar o usuário.
export async function countLancamentosAtivosByCartao(cartaoId: number): Promise<number> {
  return db.lancamentosCartao
    .where('cartaoId').equals(cartaoId)
    .filter(l => l.parcelaAtual <= l.totalParcelas)
    .count()
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
  // Lançamentos AINDA na vida útil (parcela atual <= total).
  // Bug histórico: o filtro `parcelaAtual < total || total === 1` EXCLUÍA
  // a última parcela (parcelaAtual === totalParcelas && total > 1) → limite
  // usado vinha subestimado, alertas de "cartão > 80%" não disparavam.
  return useLiveQuery(
    () => db.lancamentosCartao.filter(l => l.parcelaAtual <= l.totalParcelas).toArray(),
    []
  ) ?? []
}
export async function addLancamentoCartao(data: {
  cartaoId: number; descricao: string; valor: number; data: string
  categoriaId: number; totalParcelas: number; mes: number; ano: number
}) {
  const { totalParcelas, valor, ...base } = data
  // Distribuição de centavos: trunca cada parcela a 2 casas e joga o resto
  // na ÚLTIMA parcela. Sem isso, 100 / 3 dava 3× 33,33 = 99,99 (perda).
  const valorParcelaArredondado = Math.round((valor / totalParcelas) * 100) / 100
  const valorUltima = Math.round((valor - valorParcelaArredondado * (totalParcelas - 1)) * 100) / 100

  // Se a DATA da compra é DEPOIS do dia de fechamento, a primeira parcela
  // cai na fatura do mês seguinte. Convenção mercado BR/Visa: compras NO
  // dia do fechamento ainda entram na fatura ATUAL (corte ao final do dia).
  // Por isso `>` e não `>=`.
  const cartao = await db.cartoes.get(data.cartaoId)
  let startMes = base.mes
  let startAno = base.ano
  if (cartao) {
    const diaCompra = new Date(data.data + 'T00:00:00').getDate()
    if (diaCompra > cartao.diaFechamento) {
      startMes = base.mes + 1
      if (startMes > 12) { startMes = 1; startAno = base.ano + 1 }
    }
  }

  const valorParcelaPara = (p: number) => p === totalParcelas ? valorUltima : valorParcelaArredondado

  const firstId = await db.lancamentosCartao.add({
    ...base, valor: valorParcelaPara(1), parcelaAtual: 1, totalParcelas, mes: startMes, ano: startAno,
  })
  for (let p = 2; p <= totalParcelas; p++) {
    let m = startMes + p - 1
    let a = startAno
    while (m > 12) { m -= 12; a += 1 }
    await db.lancamentosCartao.add({
      ...base, valor: valorParcelaPara(p), parcelaAtual: p, totalParcelas, mes: m, ano: a, parcelaPaiId: firstId as number,
    })
  }
  return firstId
}

export async function editCartao(id: number, data: Partial<import('../schema').Cartao>) {
  return db.cartoes.update(id, { ...data, updatedAt: Date.now() })
}

// ─── Editar / Excluir lançamentos do cartão ───────────────────────────
export async function editLancamentoCartao(
  id: number,
  data: Partial<Omit<LancamentoCartao, 'id' | 'syncId'>>,
) {
  return db.lancamentosCartao.update(id, { ...data, updatedAt: Date.now() })
}

// Exclui um único lançamento (uma parcela específica)
export async function deleteLancamentoCartao(id: number) {
  return db.lancamentosCartao.delete(id)
}

// Exclui o lançamento e TODAS as parcelas dele (cascata)
export async function deleteLancamentoComParcelas(id: number) {
  const lanc = await db.lancamentosCartao.get(id)
  if (!lanc) return
  // Se for parcela 1, ID é o pai. Senão, busca o pai.
  const paiId = lanc.parcelaAtual === 1 ? id : lanc.parcelaPaiId
  if (paiId === undefined) {
    return db.lancamentosCartao.delete(id)
  }
  // Deleta o pai e todas as parcelas
  await db.lancamentosCartao.delete(paiId)
  const filhos = await db.lancamentosCartao.where('parcelaPaiId').equals(paiId).toArray()
  for (const f of filhos) {
    if (f.id !== undefined) await db.lancamentosCartao.delete(f.id)
  }
}

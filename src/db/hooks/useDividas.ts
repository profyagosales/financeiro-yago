import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Divida, type DividaMovimentacao, type MovimentacaoTipo } from '../schema'
import { addContaFixa } from './useContasFixas'

export function useDividas() {
  return useLiveQuery(() => db.dividas.filter(d => d.ativo).toArray(), []) ?? []
}

export function useDividasComputed() {
  const dividas = useDividas()
  const todasMovs = useLiveQuery(() => db.dividasMovimentacoes.toArray(), []) ?? []
  return dividas.map(d => {
    const movs = todasMovs.filter(m => m.dividaId === d.id)
    const totMov = calcMovimentacoesTotais(movs)
    // valorTotal armazenado é o ORIGINAL (do form). Total efetivo aplica ajustes.
    const valorTotalEfetivo = d.valorTotal + totMov.ajustes
    const saldoDevedor = Math.max(0, valorTotalEfetivo - d.valorPago)
    const parcelasRestantes = Math.max(0, d.parcelasTotal - d.parcelasPagas)
    const progresso = valorTotalEfetivo > 0 ? (d.valorPago / valorTotalEfetivo) * 100 : 0
    const quitada = saldoDevedor < 0.01 || progresso >= 99.99
    return {
      ...d,
      valorTotalEfetivo,
      saldoDevedor,
      parcelasRestantes,
      progresso,
      quitada,
      totalAmortizado: totMov.amortizado,
      totalDescontos: totMov.descontos,
      totalAjustes: totMov.ajustes,
    }
  })
}

// ─── Movimentações (amortização, desconto, quitação, ajuste) ─────────
export function useMovimentacoes(dividaId: number | undefined) {
  return useLiveQuery(
    () => dividaId === undefined
      ? Promise.resolve([])
      : db.dividasMovimentacoes.where('dividaId').equals(dividaId).reverse().sortBy('data'),
    [dividaId],
  ) ?? []
}

export async function addMovimentacao(data: Omit<DividaMovimentacao, 'id' | 'syncId' | 'updatedAt'>) {
  const id = await db.dividasMovimentacoes.add({ ...data, updatedAt: Date.now() })
  await recalcDividaFromAll(data.dividaId)
  return id
}

export async function deleteMovimentacao(id: number) {
  const mov = await db.dividasMovimentacoes.get(id)
  if (!mov) return
  await db.dividasMovimentacoes.delete(id)
  await recalcDividaFromAll(mov.dividaId)
}

export function calcMovimentacoesTotais(movs: DividaMovimentacao[]) {
  let amortizado = 0
  let descontos = 0
  let ajustes = 0
  let quitacoes = 0
  let parcelasAdiantadas = 0
  for (const m of movs) {
    if (m.tipo === 'amortizacao') {
      amortizado += m.valor
      parcelasAdiantadas += m.reduzParcelas ?? 0
    } else if (m.tipo === 'desconto') {
      descontos += m.valor
    } else if (m.tipo === 'quitacao') {
      quitacoes += m.valor
    } else if (m.tipo === 'ajuste') {
      ajustes += m.valor
    }
  }
  return { amortizado, descontos, ajustes, quitacoes, parcelasAdiantadas }
}

export const MOVIMENTACAO_LABEL: Record<MovimentacaoTipo, string> = {
  amortizacao: 'Amortização',
  desconto: 'Desconto',
  quitacao: 'Quitação',
  ajuste: 'Ajuste',
}

export const MOVIMENTACAO_COR: Record<MovimentacaoTipo, string> = {
  amortizacao: '#3A8580',
  desconto: '#D4A017',
  quitacao: '#1E7D5A',
  ajuste: '#7A5C4F',
}

export function useTotalDividas() {
  const dividas = useDividas()
  const totalDevido = dividas.reduce((s, d) => s + Math.max(0, d.valorTotal - d.valorPago), 0)
  const totalParcelaMensal = dividas
    .filter(d => d.parcelasPagas < d.parcelasTotal)
    .reduce((s, d) => s + d.valorParcela, 0)
  return { totalDevido, totalParcelaMensal }
}

// ─── Add/Edit/Delete ─────────────────────────────────────────────────
// Ao criar uma dívida com parcela mensal + categoriaId, cria automaticamente
// uma ContaFixa vinculada que aparece no orçamento do mês.
export async function addDivida(
  data: Omit<Divida, 'id' | 'syncId' | 'updatedAt' | 'contaFixaId'>,
) {
  const dividaId = (await db.dividas.add({ ...data, updatedAt: Date.now() })) as number

  if (data.valorParcela > 0 && data.categoriaId) {
    const contaFixaId = await addContaFixa({
      nome: data.nome,
      valor: data.valorParcela,
      diaVencimento: data.diaVencimento,
      categoriaId: data.categoriaId,
      contaId: null,
      recorrencia: 'mensal',
      alertaDiasAntes: 3,
      ativo: true,
    })
    await db.dividas.update(dividaId, { contaFixaId: contaFixaId as number })
  }

  return dividaId
}

export async function editDivida(id: number, data: Partial<Divida>) {
  return db.dividas.update(id, { ...data, updatedAt: Date.now() })
}

export async function deleteDivida(id: number) {
  // Soft delete da dívida + desativa contaFixa vinculada
  const divida = await db.dividas.get(id)
  if (divida?.contaFixaId) {
    await db.contasFixas.update(divida.contaFixaId, { ativo: false })
  }
  return db.dividas.update(id, { ativo: false, updatedAt: Date.now() })
}

// ─── Recálculo consolidado (parcelas + movimentações) ────────────────
// Source of truth do `valorPago` e `parcelasPagas` é uma combinação de:
//   1. Pagamentos de parcela registrados na Conta Fixa vinculada
//   2. Movimentações da tabela dividasMovimentacoes
//
// IMPORTANTE: `valorTotal` armazenado é o ORIGINAL (do form de criação)
// e nunca é alterado por recalc. Ajustes/descontos são aplicados apenas
// no cálculo de saldoDevedor em useDividasComputed.
export async function recalcDividaFromAll(dividaId: number) {
  const divida = await db.dividas.get(dividaId)
  if (!divida) return

  // 1. Pagamentos de parcelas (Conta Fixa)
  let valorPagoParcelas = 0
  let parcelasPagas = 0
  if (divida.contaFixaId) {
    const pagamentos = await db.pagamentosFixos.where('contaFixaId').equals(divida.contaFixaId).toArray()
    const pagas = pagamentos.filter(p => p.status === 'pago')
    parcelasPagas = pagas.length
    valorPagoParcelas = pagas.reduce((s, p) => s + (p.valor ?? divida.valorParcela), 0)
  }

  // 2. Movimentações
  const movs = await db.dividasMovimentacoes.where('dividaId').equals(dividaId).toArray()
  const totais = calcMovimentacoesTotais(movs)

  // valorPago = pagamentos reais (parcelas + amortizações + quitações) + descontos
  // (descontos contam como "liquidados sem desembolso")
  const valorPago = valorPagoParcelas + totais.amortizado + totais.quitacoes + totais.descontos
  const parcelasPagasFinal = Math.min(divida.parcelasTotal, parcelasPagas + totais.parcelasAdiantadas)

  await db.dividas.update(dividaId, {
    valorPago: Math.round(valorPago * 100) / 100,
    parcelasPagas: parcelasPagasFinal,
    updatedAt: Date.now(),
  })
}

// Alias mantido para compat — agora só chama recalcDividaFromAll.
export async function sincronizarDividaComContaFixa(dividaId: number) {
  await recalcDividaFromAll(dividaId)
}

export async function sincronizarTodasDividas() {
  const dividas = await db.dividas.filter(d => d.ativo).toArray()
  for (const d of dividas) {
    if (d.id !== undefined) await recalcDividaFromAll(d.id)
  }
}

// ─── useRelatoriosData: hook orquestrador da página de Relatórios ───
// Recebe o estado do `usePeriodo`, faz as queries necessárias,
// cruza com helpers de `calculos.ts` e devolve um objeto rico.

import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/schema'
import { useContas, useSaldoTotal } from '@/db/hooks/useContas'
import { useCategorias } from '@/db/hooks/useCategorias'
import { useCartoes, useAllLancamentosAtivos } from '@/db/hooks/useCartoes'
import { useContasFixas, usePagamentosFixos } from '@/db/hooks/useContasFixas'
import { useInvestimentos, useTotalInvestimentos } from '@/db/hooks/useInvestimentos'
import { useDividasComputed } from '@/db/hooks/useDividas'
import { useMetasComputed, useReservaEmergencia } from '@/db/hooks/useMetas'
import { usePeriodoResolved } from './usePeriodo'
import {
  serieMensal, serieDiaria, heatmapDiaSemana,
  agregarPorCategoria, agregarPorConta,
  totaisPeriodo, extremosMeses, projecaoSaldo,
  indicadores, rankAvalanche, rankSnowball,
  distribuicaoInvestimentos, performersInvestimentos, vencimentosProximos,
  compromissosProximos, maioresTransacoes,
  type PontoMensal, type AgrCategoria, type PerformerInvest,
} from './calculos'
import { gerarInsightsAnaliticos, type InsightAnalitico } from './insights'
import {
  calcSaudeScore, statusFromScore, type SaudeScore, type StatusFinanceiro,
} from '@/modules/dashboard/lib/calculos'

export function useRelatoriosData() {
  const { state, intervalo } = usePeriodoResolved()

  // ─── Queries Dexie ───────────────────────────────────────────────
  const contas = useContas()
  const saldoContas = useSaldoTotal()
  const categorias = useCategorias()
  const cartoes = useCartoes()
  const lancsAtivos = useAllLancamentosAtivos()
  const contasFixas = useContasFixas()
  const investimentos = useInvestimentos()
  const { total: totalInvestido, aplicado: investAplicado } = useTotalInvestimentos()
  const dividas = useDividasComputed()
  const metas = useMetasComputed()
  const reserva = useReservaEmergencia()

  // Transações do período filtrado. SEMPRE exclui transferências
  // (transferId) — elas criam dupla entrada (despesa+receita) que
  // inflaria todos os totais e médias deste módulo.
  const txsPeriodo = useLiveQuery(() => {
    let q = db.transacoes.where('data').between(intervalo.start, intervalo.end, true, true)
    if (state.contaId !== null) q = q.filter(t => t.contaId === state.contaId)
    if (state.categoriaId !== null) q = q.filter(t => t.categoriaId === state.categoriaId)
    if (state.tipo !== 'todos') q = q.filter(t => t.tipo === state.tipo)
    return q.filter(t => !t.transferId).toArray()
  }, [intervalo.start, intervalo.end, state.contaId, state.categoriaId, state.tipo]) ?? []

  // Transações do período anterior (pra comparativo)
  const txsAnt = useLiveQuery(() => {
    let q = db.transacoes.where('data').between(intervalo.prev.start, intervalo.prev.end, true, true)
    if (state.contaId !== null) q = q.filter(t => t.contaId === state.contaId)
    if (state.categoriaId !== null) q = q.filter(t => t.categoriaId === state.categoriaId)
    if (state.tipo !== 'todos') q = q.filter(t => t.tipo === state.tipo)
    return q.filter(t => !t.transferId).toArray()
  }, [intervalo.prev.start, intervalo.prev.end, state.contaId, state.categoriaId, state.tipo]) ?? []

  // Série 12m fixa (sempre últimos 12 meses, independente do filtro)
  // — usada pra projeções e sazonalidade. Exclui transferências.
  const txs12m = useLiveQuery(() => {
    const hoje = new Date()
    const startDate = new Date(hoje.getFullYear(), hoje.getMonth() - 11, 1)
    const start = startDate.toISOString().slice(0, 10)
    const end = hoje.toISOString().slice(0, 10)
    return db.transacoes.where('data').between(start, end, true, true)
      .filter(t => !t.transferId)
      .toArray()
  }, []) ?? []

  // Pagamentos fixos do mês atual (referência)
  const pagamentos = usePagamentosFixos(intervalo.meses[intervalo.meses.length - 1]?.mes ?? new Date().getMonth() + 1,
    intervalo.meses[intervalo.meses.length - 1]?.ano ?? new Date().getFullYear())

  // ─── Derivações ──────────────────────────────────────────────────
  return useMemo(() => {
    // Série mensal do período (1+ meses)
    const serie: PontoMensal[] = serieMensal(txsPeriodo, intervalo.meses)
    // Série 12m
    const meses12: { mes: number; ano: number; label: string }[] = (() => {
      const hoje = new Date()
      const out: { mes: number; ano: number; label: string }[] = []
      for (let i = 11; i >= 0; i -= 1) {
        const dt = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
        out.push({
          mes: dt.getMonth() + 1, ano: dt.getFullYear(),
          label: dt.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
        })
      }
      return out
    })()
    const serie12m = serieMensal(txs12m, meses12)

    // Série diária + heatmap
    const diaria = serieDiaria(txsPeriodo, intervalo.start, intervalo.end)
    const heatmap = heatmapDiaSemana(diaria)

    // Categorias (com comparativo)
    const catsAgr: AgrCategoria[] = agregarPorCategoria(txsPeriodo, categorias, txsAnt, 'despesa')
    const catsReceitaAgr = agregarPorCategoria(txsPeriodo, categorias, txsAnt, 'receita')

    // Contas
    const contasAgr = agregarPorConta(contas, txsPeriodo)

    // Totais
    const numMeses = Math.max(1, intervalo.meses.length)
    const totais = totaisPeriodo(txsPeriodo, numMeses, txsAnt)

    // Extremos
    const extremos = extremosMeses(serie)

    // Projeção 12m (usa série histórica 12m + saldo base = saldoContas)
    const projecao = projecaoSaldo(serie12m, 6, saldoContas - serie12m.reduce((s, p) => s + p.saldo, 0))

    // Indicadores — só dívidas ATIVAS (não quitadas) entram no burden mensal.
    const parcelaDividas = dividas
      .filter(d => d.parcelasPagas < d.parcelasTotal)
      .reduce((s, d) => s + (d.valorParcela || 0), 0)
    const indc = indicadores({
      receitasMensal: totais.receitasMensalMedia,
      despesasMensal: totais.despesasMensalMedia,
      parcelaDividas,
      saldoContas,
      totalInvestido,
      totalDividas: dividas.reduce((s, d) => s + d.saldoDevedor, 0),
    })

    // Investimentos
    const distribInv = distribuicaoInvestimentos(investimentos)
    const performers: PerformerInvest[] = performersInvestimentos(investimentos)
    const venctos = vencimentosProximos(investimentos, 90)
    const rentMesPct = investAplicado > 0 ? ((totalInvestido - investAplicado) / investAplicado) * 100 : 0

    // Dívidas
    const avalanche = rankAvalanche(dividas)
    const snowball = rankSnowball(dividas)

    // Metas
    const metasAtivas = metas.filter(m => m.tipo !== 'reserva_emergencia')

    // Compromissos
    const compromissos = compromissosProximos(contasFixas, pagamentos, cartoes, lancsAtivos, 90)

    // Maiores transações
    const maiores = maioresTransacoes(txsPeriodo, 20)

    // Reserva
    const reservaCobertura = reserva?.progressoPct ?? 0
    const reservaMeses = totais.despesasMensalMedia > 0
      ? (reserva?.valorAtualTotal ?? 0) / totais.despesasMensalMedia
      : 0

    // Score
    const score: SaudeScore = calcSaudeScore({
      reservaAtual: reserva?.valorAtualTotal ?? 0,
      reservaAlvo: reserva?.valorAlvo ?? 0,
      receitasMes: totais.receitasMensalMedia,
      despesasMes: totais.despesasMensalMedia,
      parcelaDividaMensal: parcelaDividas,
      saldoContas,
      despesaMediaMensal: totais.despesasMensalMedia,
    })
    const status: StatusFinanceiro = statusFromScore(score.total)

    // Insights
    const insights: InsightAnalitico[] = gerarInsightsAnaliticos({
      serieMensal: serie,
      serie12m,
      categorias: catsAgr,
      receitasTotal: totais.receitas,
      despesasTotal: totais.despesas,
      receitasAnt: totais.receitasAnt,
      despesasAnt: totais.despesasAnt,
      performersInvest: performers,
      totalInvestido,
      totalDividas: dividas.reduce((s, d) => s + d.saldoDevedor, 0),
      saldoContas,
      reservaCobertura,
      reservaMeses,
    })

    return {
      // Contexto
      intervalo,
      state,
      // Coleções base (pra filtros)
      contas, categorias, cartoes, contasFixas, investimentos, dividas, metas, reserva,
      // Séries
      serie, serie12m, diaria, heatmap,
      // Categorias / contas
      categoriasAgr: catsAgr,
      categoriasReceitaAgr: catsReceitaAgr,
      contasAgr,
      // Totais
      totais, extremos,
      // Patrimônio
      saldoContas, totalInvestido, investAplicado,
      rendimentoTotal: totalInvestido - investAplicado,
      totalDividas: dividas.reduce((s, d) => s + d.saldoDevedor, 0),
      patrimonioLiquido: indc.patrimonioLiquido,
      // Indicadores
      indicadores: indc,
      score, status,
      // Projeção
      projecao,
      // Investimentos
      distribInv, performers, vencimentos: venctos, rentMesPct,
      // Dívidas
      avalanche, snowball,
      // Metas
      metasAtivas,
      reservaCobertura, reservaMeses,
      // Compromissos
      compromissos,
      // Maiores transações
      maiores,
      // Insights
      insights,
      // Transações do período (pra tabela detalhada)
      txsPeriodo,
    }
  }, [
    intervalo, state, contas, categorias, cartoes, contasFixas,
    investimentos, dividas, metas, reserva,
    txsPeriodo, txsAnt, txs12m, pagamentos, lancsAtivos,
    saldoContas, totalInvestido, investAplicado,
  ])
}

export type RelatoriosData = ReturnType<typeof useRelatoriosData>

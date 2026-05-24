// ─── useDashboardData ───────────────────────────────────────────────
// Hook único que reúne TODOS os dados precisos do Dashboard.
// Faz queries Dexie e cruza pra entregar um objeto pronto pra renderizar.

import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/schema'
import { useContas, useSaldoTotal } from '@/db/hooks/useContas'
import { useTransacoes, useTotaisMes, useGastosPorCategoria, useTransacoesByMes } from '@/db/hooks/useTransacoes'
import { useCategorias } from '@/db/hooks/useCategorias'
import { useCartoes, useAllLancamentosAtivos } from '@/db/hooks/useCartoes'
import { useContasFixas, usePagamentosFixos } from '@/db/hooks/useContasFixas'
import { useMetasComputed, useReservaEmergencia } from '@/db/hooks/useMetas'
import { useDividasComputed } from '@/db/hooks/useDividas'
import { useInvestimentos, useTotalInvestimentos } from '@/db/hooks/useInvestimentos'
import { mesAnoAtual } from '@/lib/format'
import {
  serieUltimosMeses,
  delta,
  media,
  comprometidoRestante,
  projecao30d,
  calcSaudeScore,
  statusFromScore,
  type MesData,
  type Projecao30d,
  type SaudeScore,
  type StatusFinanceiro,
} from './calculos'
import { gerarInsights, type Insight } from './insights'

export interface DashboardData {
  // Contexto
  mes: number
  ano: number
  hoje: number
  diasNoMes: number

  // Saldos & patrimônio
  saldoContas: number
  totalInvestido: number
  rendimentoTotal: number
  totalDividas: number
  patrimonioLiquido: number

  // Mês atual
  receitas: number
  despesas: number
  saldoMes: number
  trendReceitas: number
  trendDespesas: number
  trendSaldo: number

  // Comprometido + projeção
  comprometidoFixas: number
  comprometidoParcelas: number
  totalComprometido: number
  saldoLivre: number
  projecao: Projecao30d

  // Série 6m
  serieMeses: MesData[]
  sparkReceitas: number[]
  sparkDespesas: number[]
  sparkSaldo: number[]
  sparkAcumulado: number[]

  // Top despesas mês
  top5Despesas: Array<{ id?: number; descricao: string; valor: number; categoriaId: number; tipo: string }>

  // Categorias com maior gasto + delta vs média 3m
  topCategorias: Array<{ id: number; nome: string; cor: string; icone: string; valor: number; deltaPct: number }>

  // Atenção imediata
  alertas: Alerta[]

  // Próximos 7 dias
  proximos7Dias: ProximoEvento[]

  // Investimentos
  topInvestimento: { nome: string; pctMes: number; cor: string; tipo: string } | null
  piorInvestimento: { nome: string; pctMes: number; cor: string; tipo: string } | null
  rentMesPct: number          // % sobre carteira total

  // Metas
  metasPrioritarias: Array<{ id: number; nome: string; valorAtual: number; valorAlvo: number; pct: number; cor: string; icone: string; tipo: string }>
  reservaCobertura: number    // 0..>100
  reservaMeses: number
  reservaAlvo: number
  reservaAtual: number

  // Saúde
  score: SaudeScore
  status: StatusFinanceiro

  // Insights
  insights: Insight[]

  // Movimentações recentes
  ultimasTxs: Array<{ id?: number; data: string; valor: number; tipo: string; descricao: string; categoriaId: number; contaId: number }>

  // Loading
  loading: boolean
}

export interface Alerta {
  id: string
  severity: 'critical' | 'warning' | 'info' | 'success'
  iconKey: 'conta-fixa' | 'cartao' | 'orcamento' | 'reserva' | 'parcela' | 'meta' | 'saldo'
  title: string
  subtitle?: string
  value?: string
  meta?: string
  /** Route to navigate when chip is clicked */
  href?: string
  priority: number
}

export interface ProximoEvento {
  id: string
  data: string                // ISO YYYY-MM-DD
  diasFalta: number           // 0..7
  tipo: 'conta-fixa' | 'parcela-cartao' | 'fatura-fechamento' | 'fatura-vencimento'
  titulo: string
  subtitulo?: string
  valor: number
  cor: string
}

export function useDashboardData(): DashboardData {
  const { mes, ano } = mesAnoAtual()
  const hoje = new Date().getDate()
  const diasNoMes = new Date(ano, mes, 0).getDate()

  // Hooks base
  const contas = useContas()
  const saldoContas = useSaldoTotal()
  const { receitas, despesas } = useTotaisMes(mes, ano)
  const txsMes = useTransacoesByMes(mes, ano)
  const categorias = useCategorias('despesa')
  const gastosPorCat = useGastosPorCategoria(mes, ano)
  const cartoes = useCartoes()
  const lancsAtivos = useAllLancamentosAtivos()
  const contasFixas = useContasFixas()
  const pagamentos = usePagamentosFixos(mes, ano)
  const metas = useMetasComputed()
  const reserva = useReservaEmergencia()
  const dividas = useDividasComputed()
  const { total: totalInvestido, aplicado: investAplicado } = useTotalInvestimentos()
  const investimentos = useInvestimentos()
  const ultimasTxs = useTransacoes(8)

  // Série 12m + 6m
  const txsAno = useLiveQuery(() => {
    const inicio = `${ano - 1}-01-01`
    const fim = `${ano}-12-31`
    return db.transacoes.where('data').between(inicio, fim, true, true).toArray()
  }, [ano]) ?? []

  const serie12m = serieUltimosMeses(txsAno, 12, mes, ano)
  const serieMeses = serie12m.slice(-6)
  const sparkReceitas = serieMeses.map(m => m.receitas)
  const sparkDespesas = serieMeses.map(m => m.despesas)
  const sparkSaldo = serieMeses.map(m => m.saldo)
  let acc = 0
  const sparkAcumulado = serieMeses.map(m => { acc += m.saldo; return acc })

  // Tendências
  const prev = serie12m[serie12m.length - 2]
  const trendReceitas = prev ? delta(receitas, prev.receitas) : 0
  const trendDespesas = prev ? delta(despesas, prev.despesas) : 0
  const trendSaldo = prev ? delta(receitas - despesas, prev.saldo) : 0

  // Patrimônio
  const totalDividas = dividas.reduce((s, d) => s + d.saldoDevedor, 0)
  const patrimonioLiquido = saldoContas + totalInvestido - totalDividas
  const rendimentoTotal = totalInvestido - investAplicado

  // Comprometido & projeção
  const parcelasMes = lancsAtivos.filter(l => l.mes === mes && l.ano === ano)
  const comp = comprometidoRestante(contasFixas, pagamentos, parcelasMes, hoje)
  const totalComprometido = despesas + comp.fixasPendentes + comp.parcelas
  const saldoLivre = receitas - totalComprometido

  const receitasMediaMensal = media(serie12m.slice(-6).map(m => m.receitas)) || receitas
  const despesasMediaMensal = media(serie12m.slice(-6).map(m => m.despesas)) || despesas

  const proj = projecao30d({
    saldoAtual: saldoContas,
    receitasMediaMensal,
    despesasMediaMensal,
    comprometidoRestante: comp.total,
    diasNoMes,
    diaAtual: hoje,
  })

  // Top 5 despesas
  const top5Despesas = [...txsMes]
    .filter(t => t.tipo === 'despesa')
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 5)

  // Top categorias (com delta vs média 3m anterior)
  const ultMeses3 = serie12m.slice(-4, -1)  // exclui mês atual
  const txs3m = useLiveQuery(async () => {
    if (ultMeses3.length === 0) return []
    const ini = `${ultMeses3[0].ano}-${String(ultMeses3[0].mes).padStart(2, '0')}-01`
    const ultimo = ultMeses3[ultMeses3.length - 1]
    const fim = `${ultimo.ano}-${String(ultimo.mes).padStart(2, '0')}-31`
    return db.transacoes.where('data').between(ini, fim, true, true).filter(t => t.tipo === 'despesa').toArray()
  }, [ano, mes]) ?? []

  const mediaCategoria3m = new Map<number, number>()
  txs3m.forEach(t => {
    mediaCategoria3m.set(t.categoriaId, (mediaCategoria3m.get(t.categoriaId) ?? 0) + t.valor)
  })
  mediaCategoria3m.forEach((v, k) => mediaCategoria3m.set(k, v / Math.max(1, ultMeses3.length)))

  const topCategorias = categorias
    .map(c => {
      const valor = gastosPorCat.get(c.id!) ?? 0
      const media3 = mediaCategoria3m.get(c.id!) ?? 0
      const deltaPct = media3 > 0 ? ((valor - media3) / media3) * 100 : 0
      return { id: c.id!, nome: c.nome, cor: c.cor, icone: c.icone, valor, deltaPct }
    })
    .filter(c => c.valor > 0)
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 5)

  // Alertas
  const alertas: Alerta[] = []
  // Contas fixas próximas
  contasFixas.filter(cf => cf.ativo).forEach(cf => {
    const paga = pagamentos.find(p => p.contaFixaId === cf.id && p.status === 'pago')
    if (paga) return
    const dias = cf.diaVencimento - hoje
    if (dias < 0) {
      alertas.push({
        id: `cf-${cf.id}`, severity: 'critical', iconKey: 'conta-fixa',
        title: cf.nome, subtitle: `${cf.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} · venceu há ${Math.abs(dias)}d`,
        value: undefined, meta: `${Math.abs(dias)}d`, href: '/contas-fixas', priority: 10,
      })
    } else if (dias <= 3) {
      alertas.push({
        id: `cf-${cf.id}`, severity: dias === 0 ? 'critical' : 'warning', iconKey: 'conta-fixa',
        title: cf.nome,
        subtitle: cf.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        meta: dias === 0 ? 'Hoje' : `${dias}d`, href: '/contas-fixas',
        priority: 8 - dias,
      })
    }
  })

  // Cartões > 80% do limite (faturas em aberto)
  cartoes.filter(c => c.ativo).forEach(c => {
    const lancsCartao = lancsAtivos.filter(l => l.cartaoId === c.id)
    const usado = lancsCartao.reduce((s, l) => s + l.valor, 0)
    const pct = c.limite > 0 ? (usado / c.limite) * 100 : 0
    if (pct >= 80) {
      alertas.push({
        id: `cc-${c.id}`, severity: pct >= 95 ? 'critical' : 'warning', iconKey: 'cartao',
        title: c.nome,
        subtitle: `${pct.toFixed(0)}% do limite (${(c.limite - usado).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} disponível)`,
        meta: `${pct.toFixed(0)}%`, href: '/cartoes',
        priority: pct >= 95 ? 9 : 6,
      })
    }
  })

  // Reserva baixa
  if (reserva && reserva.valorAlvo > 0 && reserva.progressoPct < 50) {
    alertas.push({
      id: 'reserva-baixa', severity: 'warning', iconKey: 'reserva',
      title: 'Reserva de emergência baixa',
      subtitle: `${reserva.progressoPct.toFixed(0)}% do alvo`,
      meta: `${reserva.progressoPct.toFixed(0)}%`,
      href: '/metas', priority: 7,
    })
  }

  // Saldo previsto negativo
  if (proj.saldoFimMes < 0) {
    alertas.push({
      id: 'saldo-neg', severity: 'critical', iconKey: 'saldo',
      title: 'Saldo previsto negativo no fim do mês',
      subtitle: `Previsto: ${proj.saldoFimMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
      meta: 'fim do mês',
      priority: 10,
    })
  }

  alertas.sort((a, b) => b.priority - a.priority)

  // Próximos 7 dias
  const proximos7Dias: ProximoEvento[] = []
  for (let i = 0; i <= 7; i += 1) {
    const dt = new Date(ano, mes - 1, hoje + i)
    const dia = dt.getDate()
    const mesIt = dt.getMonth() + 1
    const anoIt = dt.getFullYear()
    const iso = `${anoIt}-${String(mesIt).padStart(2, '0')}-${String(dia).padStart(2, '0')}`

    contasFixas.filter(cf => cf.ativo && cf.diaVencimento === dia && mesIt === mes && anoIt === ano).forEach(cf => {
      const paga = pagamentos.find(p => p.contaFixaId === cf.id && p.status === 'pago')
      if (paga) return
      proximos7Dias.push({
        id: `cf7-${cf.id}-${i}`, data: iso, diasFalta: i, tipo: 'conta-fixa',
        titulo: cf.nome, valor: cf.valor, cor: '#D4A017',
      })
    })

    cartoes.filter(c => c.ativo).forEach(c => {
      if (c.diaFechamento === dia && mesIt === mes && anoIt === ano) {
        const lancs = lancsAtivos.filter(l => l.cartaoId === c.id)
        const fatura = lancs.reduce((s, l) => s + l.valor, 0)
        proximos7Dias.push({
          id: `cc-fech-${c.id}-${i}`, data: iso, diasFalta: i, tipo: 'fatura-fechamento',
          titulo: c.nome, subtitulo: 'Fecha fatura', valor: fatura, cor: '#504E76',
        })
      }
      if (c.diaVencimento === dia && mesIt === mes && anoIt === ano) {
        proximos7Dias.push({
          id: `cc-venc-${c.id}-${i}`, data: iso, diasFalta: i, tipo: 'fatura-vencimento',
          titulo: c.nome, subtitulo: 'Vence fatura', valor: 0, cor: '#C4553B',
        })
      }
    })
  }

  // Investimentos top/pior do mês (proxy: rentabilidade no período)
  const performanceMes = investimentos.map(i => {
    const aplicado = i.valorAplicado || 0
    const atual = i.valorAtual || 0
    const ganho = atual - aplicado
    const pct = aplicado > 0 ? (ganho / aplicado) * 100 : 0
    return { nome: i.nome, pctMes: pct, cor: i.cor, tipo: i.tipo }
  })
  const topInvestimento = performanceMes.length > 0
    ? [...performanceMes].sort((a, b) => b.pctMes - a.pctMes)[0]
    : null
  const piorInvestimento = performanceMes.length > 1
    ? [...performanceMes].sort((a, b) => a.pctMes - b.pctMes)[0]
    : null
  const rentMesPct = totalInvestido > 0 && investAplicado > 0
    ? ((totalInvestido - investAplicado) / investAplicado) * 100
    : 0

  // Metas prioritárias (top 3 não-reserva por progresso descendente, exceto 100%)
  const metasPrioritarias = metas
    .filter(m => m.tipo !== 'reserva_emergencia')
    .map(m => ({
      id: m.id!, nome: m.nome, valorAtual: m.valorAtualTotal, valorAlvo: m.valorAlvo,
      pct: m.progressoPct, cor: m.cor, icone: m.icone, tipo: m.tipo ?? 'outros',
    }))
    .filter(m => m.pct < 100)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 3)

  // Reserva
  const reservaAtual = reserva?.valorAtualTotal ?? 0
  const reservaAlvo = reserva?.valorAlvo ?? 0
  const reservaCobertura = reservaAlvo > 0 ? (reservaAtual / reservaAlvo) * 100 : 0
  const reservaMeses = despesasMediaMensal > 0 ? reservaAtual / despesasMediaMensal : 0

  // Score
  const parcelaDividaMensal = dividas.reduce((s, d) => s + (d.valorParcela || 0), 0)
  const score = calcSaudeScore({
    reservaAtual,
    reservaAlvo,
    receitasMes: receitas || receitasMediaMensal,
    despesasMes: despesas || despesasMediaMensal,
    parcelaDividaMensal,
    saldoContas,
    despesaMediaMensal: despesasMediaMensal,
  })
  const status = statusFromScore(score.total)

  // Categoria spike / economia
  const catSpike = topCategorias.find(c => c.deltaPct >= 25)
  const catEcon = topCategorias.find(c => c.deltaPct <= -20)
  const cartaoApertado = (() => {
    const result = cartoes.filter(c => c.ativo).map(c => {
      const lancs = lancsAtivos.filter(l => l.cartaoId === c.id)
      const usado = lancs.reduce((s, l) => s + l.valor, 0)
      return { nome: c.nome, pctLimite: c.limite > 0 ? (usado / c.limite) * 100 : 0 }
    }).sort((a, b) => b.pctLimite - a.pctLimite)[0]
    return result?.pctLimite >= 70 ? result : undefined
  })()

  // Insights
  const insights = gerarInsights({
    serieMeses,
    receitasMes: receitas,
    despesasMes: despesas,
    categoriaSpike: catSpike ? { nome: catSpike.nome, deltaPct: catSpike.deltaPct } : undefined,
    categoriaEconomia: catEcon ? { nome: catEcon.nome, deltaPct: catEcon.deltaPct } : undefined,
    reservaCobertura,
    reservaMeses,
    cartaoApertado,
    metaProxima: metasPrioritarias[0] ? { nome: metasPrioritarias[0].nome, progresso: metasPrioritarias[0].pct } : undefined,
    rentMesPct,
  })

  const loading = !contas || !categorias

  return {
    mes, ano, hoje, diasNoMes,
    saldoContas, totalInvestido, rendimentoTotal, totalDividas, patrimonioLiquido,
    receitas, despesas, saldoMes: receitas - despesas,
    trendReceitas, trendDespesas, trendSaldo,
    comprometidoFixas: comp.fixasPendentes, comprometidoParcelas: comp.parcelas,
    totalComprometido, saldoLivre, projecao: proj,
    serieMeses, sparkReceitas, sparkDespesas, sparkSaldo, sparkAcumulado,
    top5Despesas, topCategorias,
    alertas,
    proximos7Dias: proximos7Dias.sort((a, b) => a.diasFalta - b.diasFalta).slice(0, 8),
    topInvestimento, piorInvestimento, rentMesPct,
    metasPrioritarias,
    reservaCobertura, reservaMeses, reservaAlvo, reservaAtual,
    score, status,
    insights,
    ultimasTxs,
    loading,
  }
}

// Saudação dinâmica baseada na hora
export function saudacao(): { texto: string; emoji: string } {
  const h = new Date().getHours()
  if (h < 5) return { texto: 'Boa madrugada', emoji: '🌙' }
  if (h < 12) return { texto: 'Bom dia', emoji: '🌅' }
  if (h < 18) return { texto: 'Boa tarde', emoji: '☀️' }
  return { texto: 'Boa noite', emoji: '🌆' }
}

// ─── Cálculos analíticos da página de Relatórios ────────────────────
// Helpers puros — recebem dados, retornam séries / agregações / projeções.
// Operam sobre intervalos arbitrários (não só "mês atual" como o Dashboard).

import type {
  Transacao, Conta, Categoria, ContaFixa, PagamentoFixo,
  LancamentoCartao, Cartao, Investimento, Divida,
} from '@/db/schema'

// ─── Série temporal por mês ────────────────────────────────────────
export interface PontoMensal {
  mes: number
  ano: number
  label: string
  labelLong: string
  receitas: number
  despesas: number
  saldo: number
  saldoAcumulado: number  // soma de saldos desde o início
}

export function serieMensal(
  txs: Transacao[],
  meses: { mes: number; ano: number; label: string }[],
): PontoMensal[] {
  let acc = 0
  return meses.map(({ mes, ano, label }) => {
    const mm = String(mes).padStart(2, '0')
    const list = txs.filter(t => {
      const [ya, ma] = t.data.split('-')
      return ya === String(ano) && ma === mm
    })
    const receitas = list.filter(t => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0)
    const despesas = list.filter(t => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0)
    const saldo = receitas - despesas
    acc += saldo
    const labelLong = new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: '2-digit' })
    return { mes, ano, label, labelLong, receitas, despesas, saldo, saldoAcumulado: acc }
  })
}

// ─── Série por dia (heatmap / sparkline diário) ─────────────────────
export interface PontoDiario {
  data: string         // YYYY-MM-DD
  weekday: number      // 0=Dom .. 6=Sáb
  receitas: number
  despesas: number
  saldo: number
}

export function serieDiaria(txs: Transacao[], start: string, end: string): PontoDiario[] {
  const out: PontoDiario[] = []
  const ds = new Date(start + 'T00:00:00')
  const de = new Date(end + 'T00:00:00')
  for (let d = new Date(ds); d <= de; d.setDate(d.getDate() + 1)) {
    // hora LOCAL (toISOString seria UTC → off-by-one no BRT após 21h)
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const list = txs.filter(t => t.data === iso)
    const receitas = list.filter(t => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0)
    const despesas = list.filter(t => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0)
    out.push({ data: iso, weekday: d.getDay(), receitas, despesas, saldo: receitas - despesas })
  }
  return out
}

// ─── Heatmap por dia da semana × semana do mês ─────────────────────
// Útil pra detectar padrão: "sempre gasta mais em sexta/sábado"
export function heatmapDiaSemana(diaria: PontoDiario[]): number[] {
  // Soma despesas por dia da semana (0=Dom .. 6=Sáb)
  const out = [0, 0, 0, 0, 0, 0, 0]
  diaria.forEach(d => { out[d.weekday] += d.despesas })
  return out
}

// ─── Agregação por categoria ──────────────────────────────────────
export interface AgrCategoria {
  id: number
  nome: string
  cor: string
  icone: string
  valor: number
  pct: number
  count: number       // nº de transações
  ticketMedio: number
  // Comparativo com período anterior (se fornecido)
  deltaPct?: number
}

export function agregarPorCategoria(
  txs: Transacao[],
  categorias: Categoria[],
  txsAnt?: Transacao[],
  tipo: 'despesa' | 'receita' = 'despesa',
): AgrCategoria[] {
  const filtradas = txs.filter(t => t.tipo === tipo)
  const total = filtradas.reduce((s, t) => s + t.valor, 0)
  const map = new Map<number, { soma: number; count: number }>()
  filtradas.forEach(t => {
    const cur = map.get(t.categoriaId) ?? { soma: 0, count: 0 }
    map.set(t.categoriaId, { soma: cur.soma + t.valor, count: cur.count + 1 })
  })

  let antMap: Map<number, number> | undefined
  if (txsAnt) {
    antMap = new Map()
    txsAnt.filter(t => t.tipo === tipo).forEach(t => {
      antMap!.set(t.categoriaId, (antMap!.get(t.categoriaId) ?? 0) + t.valor)
    })
  }

  return categorias
    .filter(c => map.has(c.id!))
    .map(c => {
      const { soma, count } = map.get(c.id!)!
      const ant = antMap?.get(c.id!) ?? 0
      const deltaPct = txsAnt ? (ant > 0 ? ((soma - ant) / ant) * 100 : (soma > 0 ? 100 : 0)) : undefined
      return {
        id: c.id!, nome: c.nome, cor: c.cor, icone: c.icone,
        valor: soma,
        pct: total > 0 ? (soma / total) * 100 : 0,
        count,
        ticketMedio: count > 0 ? soma / count : 0,
        deltaPct,
      }
    })
    .sort((a, b) => b.valor - a.valor)
}

// ─── Agregação por conta ──────────────────────────────────────────
export interface AgrConta {
  id: number
  nome: string
  cor: string
  saldo: number
  receitas: number
  despesas: number
  pct: number
}

export function agregarPorConta(contas: Conta[], txs: Transacao[]): AgrConta[] {
  const totalSaldo = contas.reduce((s, c) => s + c.saldoAtual, 0)
  return contas.map(c => {
    const cTxs = txs.filter(t => t.contaId === c.id)
    return {
      id: c.id!, nome: c.nome, cor: c.cor, saldo: c.saldoAtual,
      receitas: cTxs.filter(t => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0),
      despesas: cTxs.filter(t => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0),
      pct: totalSaldo > 0 ? (c.saldoAtual / totalSaldo) * 100 : 0,
    }
  }).sort((a, b) => b.saldo - a.saldo)
}

// ─── Total / médias do período ────────────────────────────────────
export interface TotaisPeriodo {
  receitas: number
  despesas: number
  saldo: number
  ticketMedioReceita: number
  ticketMedioDespesa: number
  countTotal: number
  // Médias mensais
  receitasMensalMedia: number
  despesasMensalMedia: number
  saldoMensalMedio: number
  // Comparativo
  receitasAnt?: number
  despesasAnt?: number
  saldoAnt?: number
  deltaReceitas?: number   // %
  deltaDespesas?: number   // %
  deltaSaldo?: number      // %
}

export function totaisPeriodo(
  txs: Transacao[],
  numMeses: number,
  txsAnt?: Transacao[],
): TotaisPeriodo {
  const receitas = txs.filter(t => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0)
  const despesas = txs.filter(t => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0)
  const saldo = receitas - despesas
  const txsRec = txs.filter(t => t.tipo === 'receita')
  const txsDes = txs.filter(t => t.tipo === 'despesa')

  const out: TotaisPeriodo = {
    receitas, despesas, saldo,
    ticketMedioReceita: txsRec.length > 0 ? receitas / txsRec.length : 0,
    ticketMedioDespesa: txsDes.length > 0 ? despesas / txsDes.length : 0,
    countTotal: txs.length,
    receitasMensalMedia: numMeses > 0 ? receitas / numMeses : 0,
    despesasMensalMedia: numMeses > 0 ? despesas / numMeses : 0,
    saldoMensalMedio: numMeses > 0 ? saldo / numMeses : 0,
  }

  if (txsAnt) {
    const ra = txsAnt.filter(t => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0)
    const da = txsAnt.filter(t => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0)
    const sa = ra - da
    out.receitasAnt = ra
    out.despesasAnt = da
    out.saldoAnt = sa
    out.deltaReceitas = ra > 0 ? ((receitas - ra) / ra) * 100 : (receitas > 0 ? 100 : 0)
    out.deltaDespesas = da > 0 ? ((despesas - da) / da) * 100 : (despesas > 0 ? 100 : 0)
    out.deltaSaldo = sa !== 0 ? ((saldo - sa) / Math.abs(sa)) * 100 : (saldo > 0 ? 100 : saldo < 0 ? -100 : 0)
  }

  return out
}

// ─── Mês mais caro / mais econômico ───────────────────────────────
export function extremosMeses(serie: PontoMensal[]): {
  maisCaro: PontoMensal | null
  maisEconomico: PontoMensal | null
  melhorSaldo: PontoMensal | null
  piorSaldo: PontoMensal | null
} {
  if (serie.length === 0) return { maisCaro: null, maisEconomico: null, melhorSaldo: null, piorSaldo: null }
  const comDespesa = serie.filter(s => s.despesas > 0)
  const maisCaro = comDespesa.length > 0
    ? comDespesa.reduce((a, b) => (a.despesas > b.despesas ? a : b))
    : null
  const maisEconomico = comDespesa.length > 0
    ? comDespesa.reduce((a, b) => (a.despesas < b.despesas ? a : b))
    : null
  const melhorSaldo = serie.reduce((a, b) => (a.saldo > b.saldo ? a : b))
  const piorSaldo = serie.reduce((a, b) => (a.saldo < b.saldo ? a : b))
  return { maisCaro, maisEconomico, melhorSaldo, piorSaldo }
}

// ─── Projeção saldo futuro (próximos N meses) ─────────────────────
// Usa regressão simples (média móvel + tendência) sobre série passada.
// Inclui banda otimista/pessimista (+/- 15%).
export interface PontoProjecao {
  mes: number
  ano: number
  label: string
  esperado: number
  otimista: number
  pessimista: number
  isProjetado: boolean
}

export function projecaoSaldo(
  serieHistorica: PontoMensal[],
  proximos: number,
  saldoBase: number,
): PontoProjecao[] {
  if (serieHistorica.length === 0) return []

  // Histórico: saldo acumulado mês a mês (cur substitui o `let acc` antigo que
  // era reatribuído na linha seguinte — era dead code).
  const hist: PontoProjecao[] = serieHistorica.map(p => {
    const cur = saldoBase + p.saldoAcumulado
    return {
      mes: p.mes, ano: p.ano, label: p.label,
      esperado: cur, otimista: cur, pessimista: cur, isProjetado: false,
    }
  })

  // Média dos últimos 3-6 meses como base
  const tail = serieHistorica.slice(-Math.min(6, serieHistorica.length))
  const saldoMedio = tail.reduce((s, p) => s + p.saldo, 0) / tail.length
  // Tendência: diferença entre primeira metade e segunda metade
  const half = Math.floor(tail.length / 2)
  if (half > 0) {
    const m1 = tail.slice(0, half).reduce((s, p) => s + p.saldo, 0) / half
    const m2 = tail.slice(half).reduce((s, p) => s + p.saldo, 0) / (tail.length - half)
    const tendencia = (m2 - m1) / Math.max(1, half) // ajuste por mês
    let cur = hist[hist.length - 1]?.esperado ?? saldoBase
    const proj: PontoProjecao[] = []
    for (let i = 1; i <= proximos; i += 1) {
      const ult = serieHistorica[serieHistorica.length - 1]
      const dt = new Date(ult.ano, ult.mes - 1 + i, 1)
      const mes = dt.getMonth() + 1
      const ano = dt.getFullYear()
      const label = dt.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
      // Tendência CAP: pra não explodir exponencialmente no horizonte 6m.
      // Bug histórico: `tendencia * i` cumulado em `cur += incremento` fazia
      // forecast positivo crescer linear (i=6 → 6x a tendência mensal). Agora
      // o tendencia*i é cap em ±50% da magnitude do saldoMedio — preserva
      // direção sem extrapolar absurdo.
      const tendenciaCap = Math.sign(tendencia) * Math.min(Math.abs(tendencia) * i, Math.abs(saldoMedio) * 0.5)
      const incremento = saldoMedio + tendenciaCap
      cur += incremento
      // Bandas: ±12% e ±15% ABSOLUTOS pra não inverter em saldos negativos
      // (`cur * 1.12` de -R$1000 daria -R$1120, pior que pessimista).
      // Adicionado piso mínimo de 5% do saldoMedio: quando cur ≈ 0, banda
      // some e projeção parece certeira. Piso garante banda visível.
      const baseRange = Math.max(Math.abs(cur), Math.abs(saldoMedio) * 0.3)
      const range12 = baseRange * 0.12
      const range15 = baseRange * 0.15
      proj.push({
        mes, ano, label,
        esperado: cur,
        otimista: cur + range12,
        pessimista: cur - range15,
        isProjetado: true,
      })
    }
    return [...hist, ...proj]
  }
  return hist
}

// ─── Cobertura de receita / endividamento ─────────────────────────
export function indicadores(opts: {
  receitasMensal: number
  despesasMensal: number
  parcelaDividas: number
  saldoContas: number
  totalInvestido: number
  totalDividas: number
}) {
  const { receitasMensal, despesasMensal, parcelaDividas, saldoContas, totalInvestido, totalDividas } = opts
  const taxaEconomia = receitasMensal > 0 ? ((receitasMensal - despesasMensal) / receitasMensal) * 100 : 0
  const endividamentoPct = receitasMensal > 0 ? (parcelaDividas / receitasMensal) * 100 : 0
  const liquidezMeses = despesasMensal > 0 ? saldoContas / despesasMensal : 0
  const patrimonioLiquido = saldoContas + totalInvestido - totalDividas
  const expoDividaPct = patrimonioLiquido !== 0 ? (totalDividas / Math.abs(patrimonioLiquido + totalDividas)) * 100 : 0
  return { taxaEconomia, endividamentoPct, liquidezMeses, patrimonioLiquido, expoDividaPct }
}

// ─── Debt avalanche / snowball ────────────────────────────────────
// Avalanche = paga primeiro a de MAIOR juro
// Snowball  = paga primeiro a de MENOR saldo
export interface DividaRanked {
  id: number
  nome: string
  saldoDevedor: number
  jurosAnual: number
  parcela: number
  parcelasRestantes: number
  prioridade: number
}

export function rankAvalanche(dividas: Array<Divida & { saldoDevedor: number; parcelasRestantes: number }>): DividaRanked[] {
  return [...dividas]
    .filter(d => d.saldoDevedor > 0)
    .sort((a, b) => (b.jurosAnual ?? 0) - (a.jurosAnual ?? 0))
    .map((d, i) => ({
      id: d.id!, nome: d.nome,
      saldoDevedor: d.saldoDevedor,
      jurosAnual: (d.jurosAnual ?? 0) * 100,
      parcela: d.valorParcela,
      parcelasRestantes: d.parcelasRestantes,
      prioridade: i + 1,
    }))
}

export function rankSnowball(dividas: Array<Divida & { saldoDevedor: number; parcelasRestantes: number }>): DividaRanked[] {
  return [...dividas]
    .filter(d => d.saldoDevedor > 0)
    .sort((a, b) => a.saldoDevedor - b.saldoDevedor)
    .map((d, i) => ({
      id: d.id!, nome: d.nome,
      saldoDevedor: d.saldoDevedor,
      jurosAnual: (d.jurosAnual ?? 0) * 100,
      parcela: d.valorParcela,
      parcelasRestantes: d.parcelasRestantes,
      prioridade: i + 1,
    }))
}

// ─── Distribuição de investimentos ────────────────────────────────
export interface DistribuicaoInvest {
  tipo: string
  total: number
  pct: number
  cor: string
  count: number
}

export function distribuicaoInvestimentos(invs: Investimento[]): DistribuicaoInvest[] {
  const total = invs.reduce((s, i) => s + i.valorAtual, 0)
  const map = new Map<string, { total: number; cor: string; count: number }>()
  invs.forEach(i => {
    const cur = map.get(i.tipo) ?? { total: 0, cor: i.cor, count: 0 }
    map.set(i.tipo, { total: cur.total + i.valorAtual, cor: cur.cor, count: cur.count + 1 })
  })
  return Array.from(map.entries()).map(([tipo, v]) => ({
    tipo, total: v.total, pct: total > 0 ? (v.total / total) * 100 : 0, cor: v.cor, count: v.count,
  })).sort((a, b) => b.total - a.total)
}

// ─── Top performers / piores investimentos ────────────────────────
export interface PerformerInvest {
  id: number
  nome: string
  tipo: string
  cor: string
  valorAplicado: number
  valorAtual: number
  ganho: number
  pctRendimento: number
}

export function performersInvestimentos(invs: Investimento[]): PerformerInvest[] {
  return invs
    .map(i => {
      const ganho = i.valorAtual - i.valorAplicado
      const pctRendimento = i.valorAplicado > 0 ? (ganho / i.valorAplicado) * 100 : 0
      return {
        id: i.id!, nome: i.nome, tipo: i.tipo, cor: i.cor,
        valorAplicado: i.valorAplicado, valorAtual: i.valorAtual,
        ganho, pctRendimento,
      }
    })
    .sort((a, b) => b.pctRendimento - a.pctRendimento)
}

// ─── Vencimentos de investimentos próximos ────────────────────────
export function vencimentosProximos(invs: Investimento[], diasLimite = 90): PerformerInvest[] {
  const hoje = new Date()
  const limite = new Date(hoje.getTime() + diasLimite * 86_400_000)
  return invs
    .filter(i => i.dataVencimento)
    .filter(i => {
      const dv = new Date(i.dataVencimento!)
      return dv >= hoje && dv <= limite
    })
    .map(i => {
      const ganho = i.valorAtual - i.valorAplicado
      return {
        id: i.id!, nome: i.nome, tipo: i.tipo, cor: i.cor,
        valorAplicado: i.valorAplicado, valorAtual: i.valorAtual,
        ganho, pctRendimento: i.valorAplicado > 0 ? (ganho / i.valorAplicado) * 100 : 0,
      }
    })
    .sort((a, b) => {
      const da = new Date(invs.find(i => i.id === a.id)!.dataVencimento!).getTime()
      const db = new Date(invs.find(i => i.id === b.id)!.dataVencimento!).getTime()
      return da - db
    })
}

// ─── Próximos compromissos (90 dias) ──────────────────────────────
export interface Compromisso {
  id: string
  data: string         // YYYY-MM-DD
  diasFalta: number
  tipo: 'conta-fixa' | 'parcela-cartao' | 'fatura'
  titulo: string
  subtitulo?: string
  valor: number
  cor: string
  status?: 'pago' | 'pendente'
}

export function compromissosProximos(
  contasFixas: ContaFixa[],
  pagamentos: PagamentoFixo[],
  cartoes: Cartao[],
  lancsAtivos: LancamentoCartao[],
  diasLimite = 90,
): Compromisso[] {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const out: Compromisso[] = []

  for (let i = 0; i <= diasLimite; i += 1) {
    const dt = new Date(hoje.getTime() + i * 86_400_000)
    const dia = dt.getDate()
    const mes = dt.getMonth() + 1
    const ano = dt.getFullYear()
    const iso = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`

    contasFixas.filter(cf => cf.ativo && cf.diaVencimento === dia).forEach(cf => {
      const paga = pagamentos.find(p => p.contaFixaId === cf.id && p.status === 'pago' && p.mes === mes && p.ano === ano)
      out.push({
        id: `cf-${cf.id}-${iso}`, data: iso, diasFalta: i,
        tipo: 'conta-fixa', titulo: cf.nome, valor: cf.valor, cor: '#D4A017',
        status: paga ? 'pago' : 'pendente',
      })
    })

    cartoes.filter(c => c.ativo).forEach(c => {
      if (c.diaVencimento === dia) {
        const lancs = lancsAtivos.filter(l => l.cartaoId === c.id && l.mes === mes && l.ano === ano)
        const total = lancs.reduce((s, l) => s + l.valor, 0)
        if (total > 0) {
          out.push({
            id: `fv-${c.id}-${iso}`, data: iso, diasFalta: i,
            tipo: 'fatura', titulo: c.nome, subtitulo: 'Fatura cartão',
            valor: total, cor: '#C4553B',
          })
        }
      }
    })
  }

  return out
}

// ─── Maiores transações (despesas) do período ────────────────────
export function maioresTransacoes(txs: Transacao[], limit = 20): Transacao[] {
  return [...txs]
    .filter(t => t.tipo === 'despesa')
    .sort((a, b) => b.valor - a.valor)
    .slice(0, limit)
}

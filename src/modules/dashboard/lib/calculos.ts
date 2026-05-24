// ─── Cálculos do Dashboard ──────────────────────────────────────────
// Helpers puros (sem hooks) — recebem dados, retornam séries/deltas/projeções.

import type { Transacao, ContaFixa, PagamentoFixo, LancamentoCartao } from '@/db/schema'

export interface MesData {
  mes: number
  ano: number
  label: string
  receitas: number
  despesas: number
  saldo: number
}

// Constrói série dos últimos N meses a partir de uma lista de transações.
export function serieUltimosMeses(txs: Transacao[], n: number, mesRef?: number, anoRef?: number): MesData[] {
  const d = new Date()
  const baseMes = mesRef ?? d.getMonth() + 1
  const baseAno = anoRef ?? d.getFullYear()
  const out: MesData[] = []
  for (let i = n - 1; i >= 0; i -= 1) {
    const dt = new Date(baseAno, baseMes - 1 - i, 1)
    const mes = dt.getMonth() + 1
    const ano = dt.getFullYear()
    const mm = String(mes).padStart(2, '0')
    const label = dt.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
    const list = txs.filter(t => {
      const [ya, ma] = t.data.split('-')
      return ya === String(ano) && ma === mm
    })
    const receitas = list.filter(t => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0)
    const despesas = list.filter(t => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0)
    out.push({ mes, ano, label, receitas, despesas, saldo: receitas - despesas })
  }
  return out
}

// Delta % entre dois valores (cur vs prev)
export function delta(cur: number, prev: number): number {
  if (prev === 0) return cur === 0 ? 0 : 100
  return ((cur - prev) / Math.abs(prev)) * 100
}

// Média simples
export function media(arr: number[]): number {
  if (arr.length === 0) return 0
  return arr.reduce((s, v) => s + v, 0) / arr.length
}

// Soma
export function soma(arr: number[]): number {
  return arr.reduce((s, v) => s + v, 0)
}

// ─── Projeção 30 dias (saldo previsto) ──────────────────────────────
// Recebe: saldo atual em contas + média mensal de receita + média de despesa
// + contas fixas pendentes do mês + parcelas cartão futuras + dias restantes
// Retorna: { previsto30d, melhor, pior, runwayDias? }
export interface Projecao30d {
  saldoAtual: number
  comprometidoRestante: number   // despesas já agendadas até fim do mês
  receitaEsperada: number        // receitas restantes baseadas na média
  saldoFimMes: number
  saldoProjetado30d: number
  // Bandas otimista (+10%) / pessimista (-15%) sobre o saldo projetado
  otimista: number
  pessimista: number
}

interface ProjecaoOpts {
  saldoAtual: number
  receitasMediaMensal: number
  despesasMediaMensal: number
  comprometidoRestante: number   // contas fixas pendentes + parcelas restantes
  diasNoMes: number
  diaAtual: number
}

export function projecao30d(opts: ProjecaoOpts): Projecao30d {
  const { saldoAtual, receitasMediaMensal, despesasMediaMensal, comprometidoRestante, diasNoMes, diaAtual } = opts
  const diasRest = Math.max(0, diasNoMes - diaAtual)
  const frac = diasRest / diasNoMes
  // Receita esperada no resto do mês = média × proporção
  const receitaEsperada = receitasMediaMensal * frac
  // Despesa esperada (não-fixa) no resto do mês = (média - fixos) × proporção
  // Como não temos discriminação aqui, usamos média × frac como estimativa
  const despesaEsperadaVariavel = Math.max(0, despesasMediaMensal * frac - comprometidoRestante)
  const saldoFimMes = saldoAtual + receitaEsperada - comprometidoRestante - despesaEsperadaVariavel
  const saldoProjetado30d = saldoFimMes  // simplificação: 30 dias ~= fim do mês
  return {
    saldoAtual,
    comprometidoRestante,
    receitaEsperada,
    saldoFimMes,
    saldoProjetado30d,
    otimista: saldoProjetado30d * 1.1,
    pessimista: saldoProjetado30d * 0.8,
  }
}

// ─── Comprometido restante (contas fixas + parcelas) ───────────────
export function comprometidoRestante(
  contasFixas: ContaFixa[],
  pagamentos: PagamentoFixo[],
  parcelasFuturas: LancamentoCartao[],
  diaAtual: number,
): { fixasPendentes: number; parcelas: number; total: number } {
  const fixasPendentes = contasFixas
    .filter(cf => cf.ativo)
    .filter(cf => cf.diaVencimento >= diaAtual)
    .filter(cf => !pagamentos.find(p => p.contaFixaId === cf.id && p.status === 'pago'))
    .reduce((s, cf) => s + cf.valor, 0)
  // Parcelas restantes (todas que caem dentro do mês corrente após hoje)
  const parcelas = parcelasFuturas.reduce((s, p) => s + p.valor, 0)
  return { fixasPendentes, parcelas, total: fixasPendentes + parcelas }
}

// ─── Score de Saúde Financeira (0-100) ──────────────────────────────
// Pondera 4 fatores. Usado no Dashboard como "termômetro".
//   1. Reserva de emergência (peso 30): % de cobertura do alvo
//   2. Taxa de poupança (peso 25): (receitas - despesas) / receitas
//   3. Endividamento (peso 25): 100 - (parcela mensal de dívida / receita * 100, cap 100)
//   4. Liquidez (peso 20): saldo em contas / despesa mensal média (cap em 3 meses = 100%)
export interface SaudeScore {
  total: number
  fatores: {
    reserva: number       // 0..100
    poupanca: number
    endividamento: number
    liquidez: number
  }
}

interface ScoreOpts {
  reservaAtual: number
  reservaAlvo: number
  receitasMes: number
  despesasMes: number
  parcelaDividaMensal: number
  saldoContas: number
  despesaMediaMensal: number
}

export function calcSaudeScore(opts: ScoreOpts): SaudeScore {
  // 1. Reserva (alvo = 6 meses ou alvoAutoCalculado)
  let reserva = 0
  if (opts.reservaAlvo > 0) {
    reserva = Math.min(100, (opts.reservaAtual / opts.reservaAlvo) * 100)
  } else if (opts.despesaMediaMensal > 0) {
    // Sem meta — assume 6 meses de despesa como alvo padrão
    reserva = Math.min(100, (opts.reservaAtual / (opts.despesaMediaMensal * 6)) * 100)
  } else {
    reserva = 50
  }

  // 2. Poupança
  let poupanca = 0
  if (opts.receitasMes > 0) {
    const pct = ((opts.receitasMes - opts.despesasMes) / opts.receitasMes) * 100
    // 30% é ótimo. Escala: 0 → 0, 30 → 100, 100 → 100. Abaixo de 0 = penalidade.
    if (pct >= 30) poupanca = 100
    else if (pct >= 0) poupanca = (pct / 30) * 100
    else poupanca = Math.max(0, 50 + pct)  // se -50% gasta, vira 0
  }

  // 3. Endividamento (parcela / receita)
  let endividamento = 100
  if (opts.receitasMes > 0 && opts.parcelaDividaMensal > 0) {
    const burdenPct = (opts.parcelaDividaMensal / opts.receitasMes) * 100
    // 0% = 100, 30% = 50, 60%+ = 0
    endividamento = Math.max(0, 100 - burdenPct * (100 / 60))
  }

  // 4. Liquidez (saldo / despesa mensal — 3 meses = ótimo)
  let liquidez = 0
  if (opts.despesaMediaMensal > 0) {
    const meses = opts.saldoContas / opts.despesaMediaMensal
    liquidez = Math.min(100, (meses / 3) * 100)
  } else {
    liquidez = 80  // sem despesa pra comparar — assume alto
  }

  // Pesos: 30/25/25/20
  const total = reserva * 0.3 + poupanca * 0.25 + endividamento * 0.25 + liquidez * 0.2
  return {
    total: Math.round(Math.max(0, Math.min(100, total))),
    fatores: {
      reserva: Math.round(reserva),
      poupanca: Math.round(poupanca),
      endividamento: Math.round(endividamento),
      liquidez: Math.round(liquidez),
    },
  }
}

// ─── Status financeiro derivado do score ────────────────────────────
export type StatusFinanceiro = 'excelente' | 'saudavel' | 'atencao' | 'critico'

export function statusFromScore(score: number): StatusFinanceiro {
  if (score >= 80) return 'excelente'
  if (score >= 60) return 'saudavel'
  if (score >= 40) return 'atencao'
  return 'critico'
}

export function corStatus(status: StatusFinanceiro): { bg: string; text: string; soft: string } {
  switch (status) {
    case 'excelente': return { bg: '#1E7D5A', text: '#FFFFFF', soft: 'rgba(30,125,90,0.12)' }
    case 'saudavel':  return { bg: '#3A8580', text: '#FFFFFF', soft: 'rgba(58,133,128,0.12)' }
    case 'atencao':   return { bg: '#D4A017', text: '#2C1A0F', soft: 'rgba(212,160,23,0.16)' }
    case 'critico':   return { bg: '#C4553B', text: '#FFFFFF', soft: 'rgba(196,85,59,0.14)' }
  }
}

export function labelStatus(status: StatusFinanceiro): string {
  switch (status) {
    case 'excelente': return 'Excelente'
    case 'saudavel':  return 'Saudável'
    case 'atencao':   return 'Atenção'
    case 'critico':   return 'Crítico'
  }
}

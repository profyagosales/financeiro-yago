// ─── Insights operacionais do Dashboard ─────────────────────────────
// Engine que detecta padrões nos dados atuais e gera "chips" curtos e
// acionáveis. Foco: o que aconteceu RECENTE e o que merece atenção AGORA.
// Análises profundas (tendências sazonais, etc) ficam em Relatórios.

import type {
  IconAlertTriangle as AlertIcon,
} from '@tabler/icons-react'
import {
  IconTrendingUp, IconTrendingDown, IconSparkles, IconAlertTriangle,
  IconCircleCheck, IconClockHour4, IconTarget, IconShieldCheck,
  IconCreditCard, IconCoin, IconArrowUpRight,
} from '@tabler/icons-react'
import { fmt, fmtPct } from '@/lib/format'
import { delta as calcDelta, type MesData } from './calculos'

export type InsightTone = 'positive' | 'negative' | 'neutral' | 'highlight'
export interface Insight {
  id: string
  text: React.ReactNode
  tone: InsightTone
  icon: typeof AlertIcon
  priority: number    // 0-10, maior = mais relevante (ordena exibição)
}

interface InsightInputs {
  serieMeses: MesData[]                  // últimos 6 meses
  receitasMes: number
  despesasMes: number
  // Top categorias do mês com delta vs média 3m anterior
  categoriaSpike?: { nome: string; deltaPct: number }
  categoriaEconomia?: { nome: string; deltaPct: number }
  // Reserva
  reservaCobertura?: number              // % do alvo
  reservaMeses?: number                  // quantos meses cobre
  // Cartões próximos do limite
  cartaoApertado?: { nome: string; pctLimite: number }
  // Metas
  metaProxima?: { nome: string; progresso: number }
  metaConcluida?: { nome: string }
  // Dívidas
  dividaQuitada?: { nome: string }
  // Investimentos
  rentMesPct?: number                    // rentabilidade do mês em %
}

export function gerarInsights(inp: InsightInputs): Insight[] {
  const out: Insight[] = []

  // 1. Tendência de gastos vs mês anterior
  if (inp.serieMeses.length >= 2) {
    const cur = inp.serieMeses[inp.serieMeses.length - 1]
    const prev = inp.serieMeses[inp.serieMeses.length - 2]
    const d = calcDelta(cur.despesas, prev.despesas)
    if (Math.abs(d) >= 10) {
      const isUp = d > 0
      out.push({
        id: 'gastos-mom',
        text: isUp
          ? <>Gastos <strong>{fmtPct(Math.abs(d), 0)} maiores</strong> que mês passado</>
          : <>Gastos <strong>{fmtPct(Math.abs(d), 0)} menores</strong> que mês passado</>,
        tone: isUp ? 'negative' : 'positive',
        icon: isUp ? IconTrendingUp : IconTrendingDown,
        priority: isUp ? 8 : 6,
      })
    }
  }

  // 2. Categoria que disparou
  if (inp.categoriaSpike && inp.categoriaSpike.deltaPct >= 25) {
    out.push({
      id: 'cat-spike',
      text: <><strong>{inp.categoriaSpike.nome}</strong> subiu {fmtPct(inp.categoriaSpike.deltaPct, 0)} vs média</>,
      tone: 'negative',
      icon: IconAlertTriangle,
      priority: 9,
    })
  }

  // 3. Categoria onde economizou
  if (inp.categoriaEconomia && inp.categoriaEconomia.deltaPct <= -20) {
    out.push({
      id: 'cat-econ',
      text: <>Você economizou em <strong>{inp.categoriaEconomia.nome}</strong></>,
      tone: 'positive',
      icon: IconSparkles,
      priority: 5,
    })
  }

  // 4. Taxa de economia (savings rate = receitas - despesas / receitas)
  if (inp.receitasMes > 0) {
    const pct = ((inp.receitasMes - inp.despesasMes) / inp.receitasMes) * 100
    if (pct >= 30) {
      out.push({
        id: 'economia-alta',
        text: <>Está guardando <strong>{fmtPct(pct, 0)}</strong> da renda este mês</>,
        tone: 'positive',
        icon: IconCircleCheck,
        priority: 6,
      })
    } else if (pct < 0) {
      out.push({
        id: 'economia-negativa',
        text: <>Gastando <strong>{fmtPct(Math.abs(pct), 0)}</strong> mais do que recebe</>,
        tone: 'negative',
        icon: IconTrendingDown,
        priority: 10,
      })
    } else if (pct < 10) {
      out.push({
        id: 'economia-baixa',
        text: <>Só sobra <strong>{fmtPct(pct, 0)}</strong> da renda — fica apertado</>,
        tone: 'highlight',
        icon: IconClockHour4,
        priority: 7,
      })
    }
  }

  // 5. Reserva de emergência
  if (inp.reservaCobertura !== undefined) {
    if (inp.reservaCobertura >= 100) {
      out.push({
        id: 'reserva-ok',
        text: <>Reserva de emergência <strong>completa</strong></>,
        tone: 'positive',
        icon: IconShieldCheck,
        priority: 4,
      })
    } else if (inp.reservaMeses !== undefined && inp.reservaMeses < 3) {
      out.push({
        id: 'reserva-baixa',
        text: <>Reserva cobre só <strong>{inp.reservaMeses.toFixed(1)} {inp.reservaMeses === 1 ? 'mês' : 'meses'}</strong> de despesa</>,
        tone: 'highlight',
        icon: IconAlertTriangle,
        priority: 9,
      })
    }
  }

  // 6. Cartão próximo do limite
  if (inp.cartaoApertado && inp.cartaoApertado.pctLimite >= 80) {
    out.push({
      id: 'cartao-limite',
      text: <><strong>{inp.cartaoApertado.nome}</strong> em {fmtPct(inp.cartaoApertado.pctLimite, 0)} do limite</>,
      tone: 'negative',
      icon: IconCreditCard,
      priority: 9,
    })
  }

  // 7. Metas
  if (inp.metaConcluida) {
    out.push({
      id: 'meta-feita',
      text: <>Você bateu a meta <strong>{inp.metaConcluida.nome}</strong>!</>,
      tone: 'positive',
      icon: IconTarget,
      priority: 8,
    })
  } else if (inp.metaProxima && inp.metaProxima.progresso >= 75) {
    out.push({
      id: 'meta-proxima',
      text: <><strong>{inp.metaProxima.nome}</strong> em {fmtPct(inp.metaProxima.progresso, 0)} — quase lá!</>,
      tone: 'positive',
      icon: IconArrowUpRight,
      priority: 5,
    })
  }

  // 8. Dívida quitada
  if (inp.dividaQuitada) {
    out.push({
      id: 'divida-zero',
      text: <>Dívida <strong>{inp.dividaQuitada.nome}</strong> quitada</>,
      tone: 'positive',
      icon: IconCircleCheck,
      priority: 7,
    })
  }

  // 9. Rentabilidade
  if (inp.rentMesPct !== undefined && Math.abs(inp.rentMesPct) >= 0.5) {
    const isPos = inp.rentMesPct > 0
    out.push({
      id: 'rent-mes',
      text: isPos
        ? <>Investimentos renderam <strong>{fmtPct(inp.rentMesPct, 1, true)}</strong> no mês</>
        : <>Investimentos caíram <strong>{fmtPct(inp.rentMesPct, 1)}</strong> no mês</>,
      tone: isPos ? 'positive' : 'negative',
      icon: IconCoin,
      priority: 4,
    })
  }

  // Ordena por prioridade desc + limita
  return out.sort((a, b) => b.priority - a.priority)
}

// Re-export pra facilitar import
export { fmt }

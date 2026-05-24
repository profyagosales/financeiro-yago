// ─── Insights analíticos da página de Relatórios ────────────────────
// Diferente do Dashboard (foco em ação operacional), aqui:
//   - Detecta tendências sazonais ("últimos 3 meses receita caindo")
//   - Compara médias longas vs curto prazo
//   - Detecta anomalias estatísticas
//   - Sugere otimização ("redistribuir investimentos")

import {
  IconTrendingUp, IconTrendingDown, IconChartArrows, IconSparkles,
  IconAlertTriangle, IconCircleCheck, IconBulb, IconChartBar,
  IconClockHour4, IconTarget, IconCalculator, IconCoin, IconShieldCheck,
  IconArrowsExchange,
  type Icon,
} from '@tabler/icons-react'
import { fmt } from '@/lib/format'
import type { PontoMensal, AgrCategoria, PerformerInvest } from './calculos'

export type InsightTone = 'positive' | 'negative' | 'neutral' | 'highlight'
export interface InsightAnalitico {
  id: string
  title: string
  body: React.ReactNode
  tone: InsightTone
  icon: Icon
  priority: number
  categoria: 'tendencia' | 'comparativo' | 'anomalia' | 'sugestao' | 'conquista'
}

interface Inputs {
  serieMensal: PontoMensal[]                    // série do período (filtrado)
  serie12m: PontoMensal[]                       // série fixa 12m pra detectar sazonalidade
  categorias: AgrCategoria[]                    // com deltaPct vs período anterior
  receitasTotal: number
  despesasTotal: number
  receitasAnt?: number
  despesasAnt?: number
  performersInvest: PerformerInvest[]
  totalInvestido: number
  totalDividas: number
  saldoContas: number
  reservaCobertura?: number      // %
  reservaMeses?: number
}

export function gerarInsightsAnaliticos(inp: Inputs): InsightAnalitico[] {
  const out: InsightAnalitico[] = []

  // ─── 1. Tendência de gastos (regressão simples sobre série mensal) ─
  if (inp.serieMensal.length >= 3) {
    const tail = inp.serieMensal.slice(-Math.min(6, inp.serieMensal.length))
    const half = Math.floor(tail.length / 2)
    if (half > 0) {
      const m1 = tail.slice(0, half).reduce((s, p) => s + p.despesas, 0) / half
      const m2 = tail.slice(half).reduce((s, p) => s + p.despesas, 0) / (tail.length - half)
      if (m1 > 0) {
        const variacao = ((m2 - m1) / m1) * 100
        if (variacao >= 20) {
          out.push({
            id: 'tend-desp-up',
            title: 'Tendência: gastos em alta',
            body: <>Despesas subiram <strong>{variacao.toFixed(0)}%</strong> entre as primeiras e últimas semanas do período. Cuidado pra não consolidar esse novo patamar.</>,
            tone: 'negative', icon: IconTrendingUp, priority: 9, categoria: 'tendencia',
          })
        } else if (variacao <= -15) {
          out.push({
            id: 'tend-desp-down',
            title: 'Tendência: gastos em queda',
            body: <>Conseguiu reduzir gastos em <strong>{Math.abs(variacao).toFixed(0)}%</strong> ao longo do período. Continue assim.</>,
            tone: 'positive', icon: IconTrendingDown, priority: 7, categoria: 'tendencia',
          })
        }
      }
    }
  }

  // ─── 2. Mês mais caro do período ────────────────────────────────
  if (inp.serieMensal.length >= 3) {
    const maisCaro = [...inp.serieMensal].sort((a, b) => b.despesas - a.despesas)[0]
    const mediaOutros = inp.serieMensal.filter(p => p !== maisCaro).reduce((s, p) => s + p.despesas, 0) / Math.max(1, inp.serieMensal.length - 1)
    if (maisCaro.despesas > mediaOutros * 1.35 && mediaOutros > 0) {
      out.push({
        id: 'mes-pico',
        title: `${maisCaro.labelLong} foi atípico`,
        body: <>Gastou <strong>{fmt(maisCaro.despesas)}</strong> — {((maisCaro.despesas / mediaOutros - 1) * 100).toFixed(0)}% acima da média dos outros meses.</>,
        tone: 'highlight', icon: IconChartBar, priority: 5, categoria: 'anomalia',
      })
    }
  }

  // ─── 3. Categoria que mais cresceu vs período anterior ──────────
  const subiu = inp.categorias.filter(c => (c.deltaPct ?? 0) >= 30 && c.valor > 100).sort((a, b) => (b.deltaPct ?? 0) - (a.deltaPct ?? 0))[0]
  if (subiu) {
    out.push({
      id: 'cat-subiu',
      title: 'Categoria que mais cresceu',
      body: <><strong>{subiu.nome}</strong> subiu <strong>{subiu.deltaPct!.toFixed(0)}%</strong> ({fmt(subiu.valor)}) vs período anterior. Vale revisitar.</>,
      tone: 'negative', icon: IconTrendingUp, priority: 8, categoria: 'comparativo',
    })
  }

  // ─── 4. Categoria onde reduziu mais ─────────────────────────────
  const caiu = inp.categorias.filter(c => (c.deltaPct ?? 0) <= -25 && c.valor > 50).sort((a, b) => (a.deltaPct ?? 0) - (b.deltaPct ?? 0))[0]
  if (caiu) {
    out.push({
      id: 'cat-caiu',
      title: 'Conquista em economia',
      body: <>Reduziu <strong>{Math.abs(caiu.deltaPct!).toFixed(0)}%</strong> em <strong>{caiu.nome}</strong>. Manteve {fmt(caiu.valor)}.</>,
      tone: 'positive', icon: IconSparkles, priority: 6, categoria: 'conquista',
    })
  }

  // ─── 5. Concentração em uma categoria (>40% do total) ────────────
  if (inp.categorias.length > 0) {
    const dominante = inp.categorias[0]
    if (dominante.pct > 40) {
      out.push({
        id: 'cat-dominante',
        title: 'Gasto concentrado',
        body: <><strong>{dominante.pct.toFixed(0)}%</strong> das despesas estão em <strong>{dominante.nome}</strong>. Diversificar a alocação pode trazer mais controle.</>,
        tone: 'highlight', icon: IconChartArrows, priority: 5, categoria: 'sugestao',
      })
    }
  }

  // ─── 6. Taxa de economia (savings rate) ─────────────────────────
  if (inp.receitasTotal > 0) {
    const pct = ((inp.receitasTotal - inp.despesasTotal) / inp.receitasTotal) * 100
    if (pct >= 35) {
      out.push({
        id: 'econ-otima',
        title: 'Taxa de economia excelente',
        body: <>Guardando <strong>{pct.toFixed(0)}%</strong> da renda. Ideal pra ampliar investimentos diversificados.</>,
        tone: 'positive', icon: IconCircleCheck, priority: 7, categoria: 'conquista',
      })
    } else if (pct < 0) {
      out.push({
        id: 'econ-negativa',
        title: 'Você está gastando mais do que ganha',
        body: <>Déficit de <strong>{Math.abs(pct).toFixed(0)}%</strong> no período. Saldo só se mantém com reserva ou crédito. Priorize cortar despesas variáveis.</>,
        tone: 'negative', icon: IconAlertTriangle, priority: 10, categoria: 'sugestao',
      })
    } else if (pct < 10) {
      out.push({
        id: 'econ-baixa',
        title: 'Margem de segurança apertada',
        body: <>Só <strong>{pct.toFixed(0)}%</strong> da renda restam após despesas. Ideal mínimo: 10%, recomendado: 20%+.</>,
        tone: 'highlight', icon: IconClockHour4, priority: 7, categoria: 'sugestao',
      })
    }
  }

  // ─── 7. Reserva de emergência ───────────────────────────────────
  if (inp.reservaCobertura !== undefined) {
    if (inp.reservaCobertura >= 100) {
      out.push({
        id: 'res-completa',
        title: 'Reserva de emergência completa',
        body: <>Você cobre <strong>{inp.reservaMeses?.toFixed(1) ?? '?'}</strong> meses de despesas. Pode pensar em alocações com mais retorno (CDB longo, ações).</>,
        tone: 'positive', icon: IconShieldCheck, priority: 4, categoria: 'sugestao',
      })
    } else if (inp.reservaMeses !== undefined && inp.reservaMeses < 3) {
      out.push({
        id: 'res-baixa',
        title: 'Reserva insuficiente',
        body: <>Cobre apenas <strong>{inp.reservaMeses.toFixed(1)} {inp.reservaMeses === 1 ? 'mês' : 'meses'}</strong> de despesa. Meta mínima: 3 meses. Priorize ativos líquidos (CDB liquidez diária, Tesouro Selic).</>,
        tone: 'negative', icon: IconAlertTriangle, priority: 9, categoria: 'sugestao',
      })
    }
  }

  // ─── 8. Performance de investimentos (winners/losers) ───────────
  if (inp.performersInvest.length >= 3) {
    const top = inp.performersInvest[0]
    if (top.pctRendimento >= 5) {
      out.push({
        id: 'inv-top',
        title: 'Destaque positivo na carteira',
        body: <><strong>{top.nome}</strong> rendeu <strong>+{top.pctRendimento.toFixed(2)}%</strong> ({fmt(top.ganho)}).</>,
        tone: 'positive', icon: IconCoin, priority: 4, categoria: 'conquista',
      })
    }
    const pior = inp.performersInvest[inp.performersInvest.length - 1]
    if (pior.pctRendimento <= -3 && pior.valorAplicado > 500) {
      out.push({
        id: 'inv-pior',
        title: 'Ativo com prejuízo',
        body: <><strong>{pior.nome}</strong> está em <strong>{pior.pctRendimento.toFixed(2)}%</strong> ({fmt(pior.ganho)}). Avalie se faz sentido manter.</>,
        tone: 'negative', icon: IconTrendingDown, priority: 6, categoria: 'sugestao',
      })
    }
  }

  // ─── 9. Concentração de investimentos em um único tipo ──────────
  if (inp.performersInvest.length >= 2 && inp.totalInvestido > 0) {
    const porTipo = new Map<string, number>()
    inp.performersInvest.forEach(p => {
      porTipo.set(p.tipo, (porTipo.get(p.tipo) ?? 0) + p.valorAtual)
    })
    const maior = Array.from(porTipo.entries()).sort((a, b) => b[1] - a[1])[0]
    if (maior && maior[1] / inp.totalInvestido > 0.7) {
      out.push({
        id: 'inv-concentrado',
        title: 'Carteira concentrada',
        body: <><strong>{(maior[1] / inp.totalInvestido * 100).toFixed(0)}%</strong> em <strong>{maior[0]}</strong>. Diversificar entre classes (RF, RV, Caixa) reduz risco sistêmico.</>,
        tone: 'highlight', icon: IconArrowsExchange, priority: 5, categoria: 'sugestao',
      })
    }
  }

  // ─── 10. Endividamento ──────────────────────────────────────────
  if (inp.totalDividas > 0 && inp.saldoContas + inp.totalInvestido > 0) {
    const exposicao = inp.totalDividas / (inp.saldoContas + inp.totalInvestido) * 100
    if (exposicao >= 50) {
      out.push({
        id: 'divida-alta',
        title: 'Endividamento elevado',
        body: <>Dívidas representam <strong>{exposicao.toFixed(0)}%</strong> dos seus ativos líquidos. Priorize quitar as de maior juros.</>,
        tone: 'negative', icon: IconAlertTriangle, priority: 8, categoria: 'sugestao',
      })
    }
  } else if (inp.totalDividas === 0) {
    out.push({
      id: 'sem-divida',
      title: 'Sem dívidas',
      body: <>Você está sem comprometimentos de longo prazo. Mantenha a disciplina pra não retomar parcelamentos longos.</>,
      tone: 'positive', icon: IconCircleCheck, priority: 3, categoria: 'conquista',
    })
  }

  // ─── 11. Sazonalidade do gasto (12 meses) ───────────────────────
  if (inp.serie12m.length === 12) {
    const desvios = inp.serie12m.map(p => p.despesas)
    const media = desvios.reduce((s, v) => s + v, 0) / 12
    if (media > 0) {
      const pico = inp.serie12m.reduce((a, b) => a.despesas > b.despesas ? a : b)
      if (pico.despesas > media * 1.5) {
        out.push({
          id: 'sazonal-pico',
          title: 'Padrão sazonal detectado',
          body: <><strong>{pico.labelLong}</strong> é seu mês historicamente mais caro ({((pico.despesas / media - 1) * 100).toFixed(0)}% acima da média anual). Planeje reservas adicionais com antecedência.</>,
          tone: 'neutral', icon: IconBulb, priority: 4, categoria: 'tendencia',
        })
      }
    }
  }

  return out.sort((a, b) => b.priority - a.priority)
}

export { fmt }

// ─── Dashboard — cockpit operacional ─────────────────────────────────
// Página inicial do app. Foco: o usuário abre e em 5-10s entende
//   1. Como está sua situação financeira AGORA
//   2. O que precisa de atenção
//   3. O que vem nos próximos dias
// Análises profundas e históricas ficam em /relatorios.

import { motion } from 'framer-motion'
import { useDashboardData } from './lib/useDashboardData'
import { HeroBar } from './sections/HeroBar'
import { KpiRow } from './sections/KpiRow'
import { AlertCenter } from './sections/AlertCenter'
import { OrcamentoMes } from './sections/OrcamentoMes'
import { InvestimentosResumo } from './sections/InvestimentosResumo'
import { MetasResumo } from './sections/MetasResumo'
import { Proximos7Dias } from './sections/Proximos7Dias'
import { AtividadeRecente } from './sections/AtividadeRecente'

const PAGE = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
}
const SECTION = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 220, damping: 26 } },
}

export function DashboardPage() {
  const d = useDashboardData()

  return (
    <motion.div
      variants={PAGE} initial="hidden" animate="show"
      style={{
        width: '100%',
        maxWidth: 1400,
        margin: '0 auto',
        padding: 'clamp(20px, 3vw, 32px)',
        paddingBottom: 64,
        display: 'flex', flexDirection: 'column',
        gap: 20,
      }}
    >
      {/* 1. HERO */}
      <motion.div variants={SECTION}>
        <HeroBar
          saldoContas={d.saldoContas}
          patrimonioLiquido={d.patrimonioLiquido}
          trendSaldo={d.trendSaldo}
          saldoPrevisto={d.projecao.saldoFimMes}
          sparkAcumulado={d.sparkAcumulado}
          status={d.status}
          score={d.score}
        />
      </motion.div>

      {/* 2. KPI ROW */}
      <motion.div variants={SECTION}>
        <KpiRow
          receitas={d.receitas}
          despesas={d.despesas}
          totalInvestido={d.totalInvestido}
          totalDividas={d.totalDividas}
          trendReceitas={d.trendReceitas}
          trendDespesas={d.trendDespesas}
          sparkReceitas={d.sparkReceitas}
          sparkDespesas={d.sparkDespesas}
          rentMesPct={d.rentMesPct}
        />
      </motion.div>

      {/* 3. ATENÇÃO + ORÇAMENTO MÊS (lado a lado em desktop) */}
      <motion.div variants={SECTION}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: 18,
        }}>
        <AlertCenter alertas={d.alertas} />
        <OrcamentoMes
          receitas={d.receitas}
          despesasGastas={d.despesas}
          comprometidoFixas={d.comprometidoFixas}
          comprometidoParcelas={d.comprometidoParcelas}
          saldoLivre={d.saldoLivre}
          diaAtual={d.hoje}
          diasNoMes={d.diasNoMes}
        />
      </motion.div>

      {/* 4. INVESTIMENTOS + METAS (lado a lado em desktop) */}
      <motion.div variants={SECTION}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: 18,
        }}>
        <InvestimentosResumo
          totalInvestido={d.totalInvestido}
          rendimento={d.rendimentoTotal}
          rentMesPct={d.rentMesPct}
          top={d.topInvestimento}
          pior={d.piorInvestimento}
          reservaAtual={d.reservaAtual}
          reservaAlvo={d.reservaAlvo}
          reservaMeses={d.reservaMeses}
        />
        <MetasResumo metas={d.metasPrioritarias} />
      </motion.div>

      {/* 5. PRÓXIMOS 7 DIAS + ATIVIDADE RECENTE (lado a lado) */}
      <motion.div variants={SECTION}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: 18,
        }}>
        <Proximos7Dias eventos={d.proximos7Dias} />
        <AtividadeRecente txs={d.ultimasTxs} insights={d.insights} />
      </motion.div>
    </motion.div>
  )
}

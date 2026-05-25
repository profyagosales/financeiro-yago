// ─── KpiRow: 4 cards horizontais com sparkline + delta ──────────────
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  IconArrowDownRight, IconArrowUpRight, IconCoin, IconCreditCardOff,
} from '@tabler/icons-react'
import { KpiCard } from '@/components/ui/KpiCard'
import { fmt, fmtPct } from '@/lib/format'

interface KpiRowProps {
  receitas: number
  despesas: number
  totalInvestido: number
  totalDividas: number
  trendReceitas: number
  trendDespesas: number
  sparkReceitas: number[]
  sparkDespesas: number[]
  sparkInvestido?: number[]
  sparkDividas?: number[]
  rentMesPct: number
}

const STAGGER = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}
const ITEM = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 260, damping: 24 } },
}

export function KpiRow({
  receitas, despesas, totalInvestido, totalDividas,
  trendReceitas, trendDespesas, sparkReceitas, sparkDespesas,
  rentMesPct,
}: KpiRowProps) {
  const navigate = useNavigate()
  return (
    <motion.div
      variants={STAGGER} initial="hidden" animate="show"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 14,
      }}
      className="kpi-row"
    >
      <motion.div variants={ITEM}>
        <KpiCard
          label="Receitas · mês"
          value={fmt(receitas)}
          serie={sparkReceitas}
          delta={trendReceitas}
          color="#3A8580"
          colorTo="#2E6F6B"
          icon={<IconArrowUpRight size={14} stroke={2.4} color="rgba(255,255,255,0.85)" />}
          onClick={() => navigate('/transacoes?tipo=receita')}
        />
      </motion.div>

      <motion.div variants={ITEM}>
        <KpiCard
          label="Despesas · mês"
          value={fmt(despesas)}
          serie={sparkDespesas}
          delta={trendDespesas}
          deltaVariant="inverse"
          color="#C4553B"
          colorTo="#9F432F"
          icon={<IconArrowDownRight size={14} stroke={2.4} color="rgba(255,255,255,0.85)" />}
          onClick={() => navigate('/transacoes?tipo=despesa')}
        />
      </motion.div>

      <motion.div variants={ITEM}>
        <KpiCard
          label="Investido"
          value={fmt(totalInvestido)}
          delta={rentMesPct}
          color="#504E76"
          colorTo="#3D3B5F"
          icon={<IconCoin size={14} stroke={2.4} color="rgba(255,255,255,0.85)" />}
          subtitle={rentMesPct !== 0 ? `${fmtPct(rentMesPct, 1, true)} acumulado` : undefined}
          onClick={() => navigate('/investimentos')}
        />
      </motion.div>

      <motion.div variants={ITEM}>
        <KpiCard
          label="Dívidas"
          value={fmt(totalDividas)}
          color={totalDividas > 0 ? '#7A3424' : '#1E7D5A'}
          colorTo={totalDividas > 0 ? '#5C2A1E' : '#155F45'}
          icon={<IconCreditCardOff size={14} stroke={2.4} color="rgba(255,255,255,0.85)" />}
          subtitle={totalDividas === 0 ? 'Você está sem dívidas' : undefined}
          onClick={() => navigate('/dividas')}
        />
      </motion.div>
    </motion.div>
  )
}

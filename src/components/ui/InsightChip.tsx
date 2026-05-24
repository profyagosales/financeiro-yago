// ─── InsightChip: chip de insight gerado automaticamente ────────────
// Usado pra mostrar análises rápidas ("Gastos subiram 12% essa semana").

import { motion } from 'framer-motion'
import type { Icon } from '@tabler/icons-react'

export type InsightTone = 'positive' | 'negative' | 'neutral' | 'highlight'

interface InsightChipProps {
  icon: Icon
  text: React.ReactNode
  tone?: InsightTone
  onClick?: () => void
}

const TONE: Record<InsightTone, { bg: string; border: string; iconColor: string; textColor: string }> = {
  positive: {
    bg: 'linear-gradient(135deg, rgba(58,133,128,0.08), rgba(30,125,90,0.04))',
    border: 'rgba(58,133,128,0.25)',
    iconColor: '#1E7D5A',
    textColor: '#1E5944',
  },
  negative: {
    bg: 'linear-gradient(135deg, rgba(196,85,59,0.08), rgba(168,68,43,0.04))',
    border: 'rgba(196,85,59,0.25)',
    iconColor: '#A8442B',
    textColor: '#8A3722',
  },
  neutral: {
    bg: 'linear-gradient(135deg, rgba(155,123,106,0.08), rgba(122,92,79,0.04))',
    border: 'rgba(155,123,106,0.22)',
    iconColor: '#7A5C4F',
    textColor: '#5A3F33',
  },
  highlight: {
    bg: 'linear-gradient(135deg, rgba(212,160,23,0.1), rgba(212,160,23,0.04))',
    border: 'rgba(212,160,23,0.32)',
    iconColor: '#A8730F',
    textColor: '#6E4D08',
  },
}

export function InsightChip({ icon: Icon, text, tone = 'neutral', onClick }: InsightChipProps) {
  const t = TONE[tone]
  return (
    <motion.div
      onClick={onClick}
      whileHover={onClick ? { y: -1, scale: 1.01 } : undefined}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px',
        background: t.bg,
        border: `1px solid ${t.border}`,
        borderRadius: 12,
        cursor: onClick ? 'pointer' : 'default',
        fontFamily: "'Plus Jakarta Sans',sans-serif",
      }}
    >
      <Icon size={16} stroke={2.2} color={t.iconColor} style={{ flexShrink: 0 }} />
      <span style={{ fontSize: 12.5, fontWeight: 600, color: t.textColor, lineHeight: 1.4, letterSpacing: '-0.1px' }}>
        {text}
      </span>
    </motion.div>
  )
}

// ─── AlertChip: card de alerta acionável ────────────────────────────
// Usado na Central de Alertas do Dashboard.
// Severidade muda cor de fundo + ícone + acentuação.

import { motion } from 'framer-motion'
import { IconChevronRight, type Icon } from '@tabler/icons-react'

export type AlertSeverity = 'critical' | 'warning' | 'info' | 'success'

interface AlertChipProps {
  icon: Icon
  title: string
  subtitle?: string
  value?: string
  severity?: AlertSeverity
  onClick?: () => void
  /** Texto pequeno no canto direito (ex: "em 2 dias") */
  meta?: string
}

const STYLES: Record<AlertSeverity, { bg: string; border: string; iconBg: string; iconColor: string; valueColor: string }> = {
  critical: {
    bg: 'linear-gradient(135deg, rgba(229,94,60,0.13), rgba(196,85,59,0.08))',
    border: 'rgba(196,85,59,0.32)',
    iconBg: 'rgba(196,85,59,0.18)',
    iconColor: '#A8442B',
    valueColor: '#A8442B',
  },
  warning: {
    bg: 'linear-gradient(135deg, rgba(212,160,23,0.13), rgba(212,160,23,0.06))',
    border: 'rgba(212,160,23,0.36)',
    iconBg: 'rgba(212,160,23,0.2)',
    iconColor: '#A8730F',
    valueColor: '#A8730F',
  },
  info: {
    bg: 'linear-gradient(135deg, rgba(80,78,118,0.1), rgba(80,78,118,0.04))',
    border: 'rgba(80,78,118,0.28)',
    iconBg: 'rgba(80,78,118,0.16)',
    iconColor: '#3D3B5F',
    valueColor: '#3D3B5F',
  },
  success: {
    bg: 'linear-gradient(135deg, rgba(58,133,128,0.12), rgba(58,133,128,0.05))',
    border: 'rgba(58,133,128,0.32)',
    iconBg: 'rgba(58,133,128,0.18)',
    iconColor: '#1E7D5A',
    valueColor: '#1E7D5A',
  },
}

export function AlertChip({ icon: Icon, title, subtitle, value, severity = 'warning', onClick, meta }: AlertChipProps) {
  const s = STYLES[severity]
  return (
    <motion.button
      onClick={onClick}
      whileHover={onClick ? { y: -1, scale: 1.005 } : undefined}
      whileTap={onClick ? { scale: 0.99 } : undefined}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      style={{
        width: '100%',
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px',
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderRadius: 14,
        cursor: onClick ? 'pointer' : 'default',
        textAlign: 'left',
        fontFamily: "'Plus Jakarta Sans',sans-serif",
        transition: 'box-shadow .2s',
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 11,
        background: s.iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={18} stroke={2.2} color={s.iconColor} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          margin: 0, fontSize: 13, fontWeight: 700, color: '#2C1A0F',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{title}</p>
        {subtitle && (
          <p style={{
            margin: '2px 0 0', fontSize: 11, fontWeight: 500, color: '#7A5C4F',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{subtitle}</p>
        )}
      </div>

      {value && (
        <span style={{
          fontSize: 14, fontWeight: 700, color: s.valueColor,
          letterSpacing: '-0.2px', whiteSpace: 'nowrap',
        }}>{value}</span>
      )}
      {meta && !value && (
        <span style={{
          fontSize: 11, fontWeight: 600, color: s.valueColor,
          opacity: 0.85, whiteSpace: 'nowrap',
        }}>{meta}</span>
      )}
      {onClick && (
        <IconChevronRight size={15} stroke={2.2} color={s.iconColor} style={{ opacity: 0.55, flexShrink: 0 }} />
      )}
    </motion.button>
  )
}

// ─── KpiCard: card de KPI com sparkline + delta ─────────────────────
// Variantes:
//   - 'tinted'  (default): bg colorido + texto branco — usado no Dashboard
//   - 'plain':              bg branco + texto colorido — usado em Relatórios
//
// Conteúdo:
//   - label (UPPERCASE)
//   - valor grande (fmt monetário externamente)
//   - sparkline + delta pill
//   - subtítulo opcional (ex: "vs mês anterior")

import { motion } from 'framer-motion'
import { Sparkline } from './Sparkline'
import { DeltaPill, type DeltaVariant } from './DeltaPill'

interface KpiCardProps {
  label: string
  value: string
  /** Série pra sparkline (opcional) */
  serie?: number[]
  /** Delta % vs período anterior (opcional) */
  delta?: number
  deltaVariant?: DeltaVariant
  /** Variante visual */
  variant?: 'tinted' | 'plain'
  /** Cor sólida ou gradient hex inicial */
  color?: string
  /** Fim do gradient (se omitido, sólido) */
  colorTo?: string
  /** Ícone */
  icon?: React.ReactNode
  /** Subtítulo abaixo do valor */
  subtitle?: string
  /** Click → ação */
  onClick?: () => void
  /** Hover lifts */
  interactive?: boolean
  /** Tamanho — afeta padding e fonte do valor */
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function KpiCard({
  label,
  value,
  serie,
  delta,
  deltaVariant = 'auto',
  variant = 'tinted',
  color = '#3A8580',
  colorTo,
  icon,
  subtitle,
  onClick,
  interactive = true,
  size = 'md',
  className,
}: KpiCardProps) {
  const isTinted = variant === 'tinted'
  const bg = isTinted
    ? colorTo ? `linear-gradient(135deg, ${color}, ${colorTo})` : color
    : 'rgba(255,255,255,0.78)'
  const textColor = isTinted ? '#FFFFFF' : '#2C1A0F'
  const labelColor = isTinted ? 'rgba(255,255,255,0.7)' : '#9B7B6A'
  const sparkColor = isTinted ? '#FFFFFF' : color
  const sparkAccent = isTinted ? '#F2C745' : color

  const padding = size === 'sm' ? '12px 14px' : size === 'lg' ? '20px 22px' : '16px 18px'
  const valueSize = size === 'sm' ? 19 : size === 'lg' ? 30 : 24

  const shadow = isTinted
    ? `0 6px 18px ${color}55, 0 1px 3px rgba(44,26,15,0.05)`
    : '0 1px 3px rgba(44,26,15,0.05), 0 4px 16px rgba(44,26,15,0.06)'
  const hoverShadow = isTinted
    ? `0 14px 32px ${color}80, 0 1px 3px rgba(44,26,15,0.06)`
    : '0 2px 4px rgba(44,26,15,0.06), 0 10px 28px rgba(44,26,15,0.1)'

  return (
    <motion.div
      onClick={onClick}
      whileHover={interactive ? { y: -2, boxShadow: hoverShadow } : undefined}
      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      className={className}
      style={{
        position: 'relative',
        background: bg,
        backdropFilter: isTinted ? undefined : 'blur(14px)',
        WebkitBackdropFilter: isTinted ? undefined : 'blur(14px)',
        border: isTinted ? '1px solid rgba(255,255,255,0.18)' : '1px solid #EDE6DC',
        borderRadius: 18,
        padding,
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: shadow,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        minHeight: size === 'sm' ? 84 : size === 'lg' ? 130 : 110,
      }}
    >
      {/* Header: label + icon + delta */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          {icon}
          <span style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 10, fontWeight: 700,
            color: labelColor,
            letterSpacing: '.12em', textTransform: 'uppercase',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{label}</span>
        </div>
        {delta !== undefined && (
          <DeltaPill value={delta} variant={isTinted ? 'gold' : deltaVariant} size="sm" />
        )}
      </div>

      {/* Sparkline */}
      {serie && serie.length > 0 && (
        <Sparkline data={serie} color={sparkColor} accent={sparkAccent} height={22} flat={isTinted} />
      )}

      {/* Valor */}
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          fontSize: valueSize, fontWeight: 700,
          color: textColor,
          letterSpacing: '-0.4px',
          lineHeight: 1.05,
        }}>{value}</span>
        {subtitle && (
          <span style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 11, fontWeight: 500,
            color: isTinted ? 'rgba(255,255,255,0.65)' : '#9B7B6A',
            lineHeight: 1.2,
          }}>{subtitle}</span>
        )}
      </div>
    </motion.div>
  )
}

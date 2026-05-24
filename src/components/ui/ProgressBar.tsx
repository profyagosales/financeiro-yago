// ─── ProgressBar: barra de progresso premium ────────────────────────
// Suporta gradient, indicador "alvo" (linha vertical) e overflow visual.

import { motion } from 'framer-motion'

interface ProgressBarProps {
  value: number
  max?: number
  /** Cor sólida ou início do gradient */
  color?: string
  /** Final do gradient — se omitido, usa color sozinho */
  colorTo?: string
  height?: number
  /** Linha vertical sutil em % específico (ex: 100% = alvo) */
  marker?: number
  /** Mostra valor > max em vermelho com efeito de pulso */
  redOnOverflow?: boolean
  background?: string
  rounded?: boolean
  className?: string
  /** Tempo de animação em segundos */
  animateDuration?: number
}

export function ProgressBar({
  value,
  max = 100,
  color = '#3A8580',
  colorTo,
  height = 8,
  marker,
  redOnOverflow = false,
  background = '#EDE6DC',
  rounded = true,
  className,
  animateDuration = 0.9,
}: ProgressBarProps) {
  const pct = max > 0 ? (value / max) * 100 : 0
  const clamped = Math.max(0, Math.min(100, pct))
  const isOver = redOnOverflow && pct > 100
  const fillBg = isOver
    ? 'linear-gradient(90deg, #E55E3C, #C4553B)'
    : colorTo
      ? `linear-gradient(90deg, ${color}, ${colorTo})`
      : color

  return (
    <div className={className}
      style={{
        position: 'relative',
        width: '100%',
        height,
        background,
        borderRadius: rounded ? height : 0,
        overflow: 'hidden',
      }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ duration: animateDuration, ease: [0.22, 0.6, 0.36, 1] }}
        style={{
          height: '100%',
          background: fillBg,
          borderRadius: rounded ? height : 0,
          boxShadow: isOver ? '0 0 12px rgba(229,94,60,0.55)' : 'none',
        }}
      />
      {marker !== undefined && marker > 0 && marker <= 100 && (
        <div style={{
          position: 'absolute',
          top: -1, bottom: -1,
          left: `${marker}%`,
          width: 1.5,
          background: 'rgba(44,26,15,0.35)',
          transform: 'translateX(-50%)',
        }} />
      )}
    </div>
  )
}

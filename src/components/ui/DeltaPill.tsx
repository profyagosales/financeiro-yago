// ─── DeltaPill: pill com seta + % ──────────────────────────────────
// Variantes:
//   'auto'      — verde se positivo, vermelho se negativo (default pra receitas)
//   'inverse'   — inverte: positivo é vermelho (pra despesas/dívidas)
//   'gold'      — dourado neutro (variante "destaque" do KPI atual)
//   'neutral'   — cinza muted

import { IconArrowUpRight, IconArrowDownRight, IconMinus } from '@tabler/icons-react'

export type DeltaVariant = 'auto' | 'inverse' | 'gold' | 'neutral'

interface DeltaPillProps {
  value: number              // -100..+inf (em %, ex 12.3)
  variant?: DeltaVariant
  size?: 'sm' | 'md'
  /** Texto opcional após o %, ex "vs mês anterior" */
  suffix?: string
  /** Esconde a seta. */
  hideArrow?: boolean
}

function colorsFor(v: number, variant: DeltaVariant) {
  const isZero = Math.abs(v) < 0.05
  if (variant === 'gold') {
    return { bg: 'rgba(212,160,23,0.18)', border: 'rgba(212,160,23,0.45)', text: '#FFFFFF', arrow: '#F2C745' }
  }
  if (variant === 'neutral' || isZero) {
    return { bg: 'rgba(155,123,106,0.12)', border: 'rgba(155,123,106,0.3)', text: '#7A5C4F', arrow: '#9B7B6A' }
  }
  // auto / inverse
  const isPositive = v > 0
  const wantsGreen = variant === 'inverse' ? !isPositive : isPositive
  if (wantsGreen) {
    return { bg: 'rgba(58,133,128,0.12)', border: 'rgba(58,133,128,0.3)', text: '#1E7D5A', arrow: '#1E7D5A' }
  }
  return { bg: 'rgba(196,85,59,0.12)', border: 'rgba(196,85,59,0.3)', text: '#A8442B', arrow: '#A8442B' }
}

export function DeltaPill({ value, variant = 'auto', size = 'md', suffix, hideArrow }: DeltaPillProps) {
  if (!isFinite(value)) return null
  const c = colorsFor(value, variant)
  const isZero = Math.abs(value) < 0.05
  const Arrow = isZero ? IconMinus : value > 0 ? IconArrowUpRight : IconArrowDownRight
  const sign = value > 0 ? '+' : ''
  const fontSize = size === 'sm' ? 9.5 : 10.5
  const px = size === 'sm' ? '2px 7px' : '3px 9px'
  const iconSize = size === 'sm' ? 10 : 11

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontFamily: "'Plus Jakarta Sans',sans-serif",
      fontSize, fontWeight: 700,
      color: c.text,
      background: c.bg,
      border: `1px solid ${c.border}`,
      padding: px, borderRadius: 999,
      letterSpacing: '.01em',
      whiteSpace: 'nowrap',
      lineHeight: 1,
    }}>
      {!hideArrow && <Arrow size={iconSize} stroke={2.4} color={c.arrow} />}
      {sign}{Math.abs(value).toFixed(value % 1 === 0 ? 0 : 1)}%
      {suffix && <span style={{ opacity: 0.7, marginLeft: 2, fontWeight: 500 }}>{suffix}</span>}
    </span>
  )
}

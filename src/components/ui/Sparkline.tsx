// ─── Sparkline: mini-chart inline pra cards ─────────────────────────
// Linha + área sutil + dot dourado no último ponto.
// Lida com séries vazias/planas mostrando linha tracejada placeholder.

interface SparklineProps {
  data: number[]
  color?: string
  height?: number
  /** Se true, esconde o dot dourado e usa cor uniforme. */
  flat?: boolean
  /** Cor de destaque do dot final (default dourado #F2C745). */
  accent?: string
  className?: string
}

export function Sparkline({
  data,
  color = '#3A8580',
  height = 22,
  flat = false,
  accent = '#F2C745',
  className,
}: SparklineProps) {
  const valid = data.length >= 2 && data.some(v => v !== 0)

  if (!valid) {
    return (
      <svg viewBox="0 0 100 24" preserveAspectRatio="none"
        className={className}
        style={{ width: '100%', height, opacity: 0.3, display: 'block' }}>
        <line x1="0" y1="18" x2="100" y2="18" stroke={color}
          strokeWidth="1.2" strokeDasharray="3 3" strokeLinecap="round" />
      </svg>
    )
  }

  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 100
    const y = 22 - ((v - min) / range) * 20 - 1
    return [x, y] as [number, number]
  })
  const poly = pts.map(p => p.join(',')).join(' ')
  const last = pts[pts.length - 1]
  const area = `${poly} 100,22 0,22`

  return (
    <svg viewBox="0 0 100 24" preserveAspectRatio="none"
      className={className}
      style={{ width: '100%', height, overflow: 'visible', display: 'block' }}>
      <polygon points={area} fill={color} opacity="0.06" />
      <polyline points={poly} fill="none" stroke={color}
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
      {!flat && (
        <>
          <circle cx={last[0]} cy={last[1]} r="4.5" fill={accent} opacity="0.25" />
          <circle cx={last[0]} cy={last[1]} r="2.6" fill={accent} />
        </>
      )}
    </svg>
  )
}

// ─── Chip EMV dourado SVG ─────────────────────────────────────────────
// Chip dourado com 8 pads de contato. Usado em RealCardVisual pra
// renderizar cartão de crédito realista.

interface CardChipProps {
  size?: number      // largura do chip (proporcional)
  variant?: 'gold' | 'silver'
}

export function CardChip({ size = 36, variant = 'gold' }: CardChipProps) {
  // Proporção 18x13 do chip, escalonando proporcionalmente
  const w = size
  const h = Math.round(size * 13 / 18)
  const padId = `chip-pad-${variant}-${Math.random().toString(36).slice(2, 7)}`
  const gradId = `chip-grad-${variant}-${Math.random().toString(36).slice(2, 7)}`

  const colorStart = variant === 'gold' ? '#F2C745' : '#C8C8D0'
  const colorMid   = variant === 'gold' ? '#D4A017' : '#8C8C95'
  const colorEnd   = variant === 'gold' ? '#A8730F' : '#6C6C75'

  return (
    <svg width={w} height={h} viewBox="0 0 18 13" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor={colorStart}/>
          <stop offset="55%" stopColor={colorMid}/>
          <stop offset="100%" stopColor={colorEnd}/>
        </linearGradient>
      </defs>
      {/* Corpo do chip */}
      <rect width="18" height="13" rx="2" fill={`url(#${gradId})`}/>
      <rect width="18" height="13" rx="2" fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth=".4"/>
      {/* 8 pads de contato (2 colunas × 4 linhas) */}
      {[0, 1, 2, 3].map(row => {
        const y = 1.2 + row * 2.7
        return (
          <g key={row}>
            <rect x="1.2"  y={y} width="7.2" height="2.0" rx=".6" fill="rgba(0,0,0,0.28)"/>
            <rect x="1.2"  y={y} width="7.2" height=".4"  rx=".6" fill="rgba(255,245,180,0.32)"/>
            <rect x="9.6"  y={y} width="7.2" height="2.0" rx=".6" fill="rgba(0,0,0,0.28)"/>
            <rect x="9.6"  y={y} width="7.2" height=".4"  rx=".6" fill="rgba(255,245,180,0.32)"/>
          </g>
        )
      })}
      {/* Linhas centrais (separação entre colunas) */}
      <line x1="9" y1="1.2" x2="9" y2="11.8" stroke="rgba(0,0,0,0.18)" strokeWidth=".3"/>
    </svg>
  )
}

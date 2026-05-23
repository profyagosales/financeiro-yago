// ─── Bandeiras de cartão (SVGs inline) ──────────────────────────────
// Representações visuais simplificadas das principais bandeiras do BR.
// Cada bandeira em duas cores: light (pra fundos escuros) e dark (pra claros).

type Bandeira = 'visa' | 'mastercard' | 'elo' | 'hipercard' | 'amex' | 'outro'

interface BandeiraLogoProps {
  bandeira: string
  size?: number
  variant?: 'light' | 'dark'  // light pra usar em fundos coloridos/escuros
}

function normalize(b: string): Bandeira {
  const l = b.toLowerCase().trim()
  if (l.includes('visa')) return 'visa'
  if (l.includes('master')) return 'mastercard'
  if (l.includes('elo')) return 'elo'
  if (l.includes('hiper')) return 'hipercard'
  if (l.includes('amex') || l.includes('americ')) return 'amex'
  return 'outro'
}

export function BandeiraLogo({ bandeira, size = 40, variant = 'light' }: BandeiraLogoProps) {
  const b = normalize(bandeira)
  const fill = variant === 'light' ? '#FFFFFF' : '#2C1A0F'
  const h = Math.round(size * 0.42)

  if (b === 'mastercard') {
    // 2 círculos sobrepostos (vermelho + amarelo)
    return (
      <svg width={size} height={h * 1.15} viewBox="0 0 60 36">
        <circle cx="22" cy="18" r="14" fill="#EB001B"/>
        <circle cx="38" cy="18" r="14" fill="#F79E1B"/>
        <path d="M30 8.5a14 14 0 0 0 0 19 14 14 0 0 0 0-19Z" fill="#FF5F00"/>
      </svg>
    )
  }
  if (b === 'visa') {
    // VISA wordmark
    return (
      <svg width={size} height={h} viewBox="0 0 60 18">
        <text x="0" y="14" fontFamily="Arial,Helvetica,sans-serif" fontWeight="900" fontSize="17"
          fill={fill} letterSpacing="-1.2">VISA</text>
      </svg>
    )
  }
  if (b === 'elo') {
    // ELO em pílula
    return (
      <svg width={size} height={h * 0.9} viewBox="0 0 60 22">
        <rect width="60" height="22" rx="11" fill={fill} opacity={variant === 'light' ? 0.15 : 0.85}/>
        <text x="30" y="15.5" textAnchor="middle" fontFamily="Arial,Helvetica,sans-serif" fontWeight="800" fontSize="11"
          fill={variant === 'light' ? '#FFFFFF' : '#FFFFFF'} letterSpacing="1.2">ELO</text>
      </svg>
    )
  }
  if (b === 'hipercard') {
    return (
      <svg width={size} height={h} viewBox="0 0 80 18">
        <text x="0" y="14" fontFamily="Arial,Helvetica,sans-serif" fontWeight="900" fontSize="13"
          fill={fill} letterSpacing="-0.4">HIPERCARD</text>
      </svg>
    )
  }
  if (b === 'amex') {
    // AMEX em retângulo
    return (
      <svg width={size} height={h} viewBox="0 0 60 18">
        <rect width="60" height="18" rx="2" fill="#2E77BB"/>
        <text x="30" y="13" textAnchor="middle" fontFamily="Arial,Helvetica,sans-serif" fontWeight="900" fontSize="9"
          fill="#FFFFFF" letterSpacing=".6">AMEX</text>
      </svg>
    )
  }
  // Outro: card icon genérico
  return (
    <svg width={size} height={h} viewBox="0 0 60 18">
      <rect x="2" y="3" width="56" height="12" rx="2" fill={fill} opacity={0.32}/>
      <rect x="2" y="6" width="56" height="2.5" fill={fill} opacity={0.5}/>
    </svg>
  )
}

export const BANDEIRAS_DISPONIVEIS: { value: string; label: string }[] = [
  { value: 'visa',       label: 'Visa' },
  { value: 'mastercard', label: 'Mastercard' },
  { value: 'elo',        label: 'Elo' },
  { value: 'hipercard',  label: 'Hipercard' },
  { value: 'amex',       label: 'Amex' },
  { value: 'outro',      label: 'Outro' },
]

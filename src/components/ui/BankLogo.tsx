// ─── BankLogo ─────────────────────────────────────────────────────────
// Renderiza:
//  - Se `logo` (base64 ou URL) presente → <img>
//  - Senão → iniciais em gradient bonito derivado de `cor`
//
// O wrapper é sempre quadrado com border-radius proporcional.

interface BankLogoProps {
  logo?: string
  nome: string
  cor: string
  size?: number
  radiusRatio?: number // 0..1 — proporção do border-radius vs size (default .25)
  border?: boolean
}

function initials(nome: string): string {
  const parts = nome.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '??'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// Lighten color helper for gradient
function lighten(hex: string, pct: number): string {
  const n = hex.replace('#', '')
  if (n.length !== 6) return hex
  const r = parseInt(n.slice(0, 2), 16)
  const g = parseInt(n.slice(2, 4), 16)
  const b = parseInt(n.slice(4, 6), 16)
  const lr = Math.min(255, Math.round(r + (255 - r) * pct))
  const lg = Math.min(255, Math.round(g + (255 - g) * pct))
  const lb = Math.min(255, Math.round(b + (255 - b) * pct))
  return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`
}

export function BankLogo({
  logo, nome, cor,
  size = 56,
  radiusRatio = 0.25,
  border = false,
}: BankLogoProps) {
  const radius = Math.round(size * radiusRatio)
  const wrapStyle: React.CSSProperties = {
    width: size, height: size, borderRadius: radius,
    flexShrink: 0, overflow: 'hidden',
    border: border ? '1px solid rgba(255,255,255,0.85)' : undefined,
    boxShadow: '0 4px 14px rgba(44,26,15,0.12), 0 1px 3px rgba(44,26,15,0.06)',
    background: '#FFFFFF',
  }

  // Logo customizado (uploaded ou URL)
  if (logo && (logo.startsWith('data:') || logo.startsWith('http'))) {
    return (
      <div style={wrapStyle}>
        <img src={logo} alt={`Logo ${nome}`}
          loading="lazy" decoding="async"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
      </div>
    )
  }

  // Fallback: iniciais em gradient da cor
  const gradStart = lighten(cor, 0.18)
  const gradEnd = cor
  return (
    <div style={{
      ...wrapStyle,
      background: `linear-gradient(135deg, ${gradStart} 0%, ${gradEnd} 100%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative',
    }}>
      <span style={{
        fontFamily: "'Plus Jakarta Sans',sans-serif",
        fontWeight: 800,
        fontSize: Math.round(size * 0.38),
        letterSpacing: size > 40 ? '-0.5px' : 0,
        color: '#FFFFFF',
        textShadow: '0 1px 2px rgba(0,0,0,0.15)',
        lineHeight: 1,
      }}>{initials(nome)}</span>
      {/* highlight diagonal subtle */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 50%)',
        pointerEvents: 'none',
      }}/>
    </div>
  )
}

// ─── Logo: componente canônico da marca Financeiro do Yago ──────────
// Variantes:
//   - 'mark'        → símbolo completo (cartão + monograma FY)
//   - 'mark-mono'   → monograma sem cartão, monocromático (white/dark)
//   - 'horizontal'  → símbolo + wordmark lado a lado
//   - 'vertical'    → símbolo em cima, wordmark embaixo
//   - 'wordmark'    → só o texto
//
// Renderiza SVG inline (zero dependência de arquivo) pra suportar
// gradients e funcionar em qualquer contexto (modais, PDFs, prints).

import type { CSSProperties } from 'react'

export type LogoVariant = 'mark' | 'mark-mono' | 'horizontal' | 'vertical' | 'wordmark'
export type LogoTone = 'auto' | 'white' | 'dark'

interface LogoProps {
  variant?: LogoVariant
  /** Lado maior em px (controla largura do mark / altura proporcional). */
  size?: number
  /** Pra mark-mono: white em fundos escuros, dark em fundos claros. */
  tone?: LogoTone
  /** Esconde o ponto laranja após "Financeiro" no wordmark. */
  cleanDot?: boolean
  className?: string
  style?: CSSProperties
  title?: string
}

const TITLE_DEFAULT = 'Financeiro do Yago'

export function Logo({
  variant = 'mark',
  size = 64,
  tone = 'auto',
  cleanDot = false,
  className,
  style,
  title = TITLE_DEFAULT,
}: LogoProps) {
  if (variant === 'mark') return <Mark size={size} className={className} style={style} title={title} />
  if (variant === 'mark-mono') return <MarkMono size={size} tone={tone === 'auto' ? 'dark' : tone} className={className} style={style} title={title} />
  if (variant === 'wordmark') return <Wordmark height={size} cleanDot={cleanDot} className={className} style={style} title={title} />
  if (variant === 'vertical') return <LogoVertical size={size} cleanDot={cleanDot} className={className} style={style} title={title} />
  return <LogoHorizontal size={size} cleanDot={cleanDot} className={className} style={style} title={title} />
}

// ─── Internals ──────────────────────────────────────────────────────

function uniq(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`
}

function Mark({ size, className, style, title }: { size: number; className?: string; style?: CSSProperties; title: string }) {
  const idBg = uniq('mb')
  const idFy = uniq('mf')
  const idGlow = uniq('mg')
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 180 180"
      role="img"
      aria-label={title}
      className={className}
      style={{ display: 'block', flexShrink: 0, ...style }}
    >
      <defs>
        <linearGradient id={idBg} x1="0" y1="0" x2="180" y2="180" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2A1E3F" />
          <stop offset="100%" stopColor="#3D3457" />
        </linearGradient>
        <linearGradient id={idFy} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FBF8F3" />
          <stop offset="100%" stopColor="#D4D0C5" />
        </linearGradient>
        <radialGradient id={idGlow} cx="68%" cy="55%" r="42%">
          <stop offset="0%" stopColor="#F2C745" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#D4A017" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="180" height="180" rx="44" fill={`url(#${idBg})`} />
      <circle cx="122" cy="96" r="62" fill={`url(#${idGlow})`} />
      <path
        d="M 46 44 L 46 136 M 46 44 L 90 44 M 46 86 L 80 86"
        stroke={`url(#${idFy})`}
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M 100 64 L 122 96 L 144 64 M 122 96 L 122 136"
        stroke={`url(#${idFy})`}
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="122" cy="96" r="6" fill="#F2C745" />
    </svg>
  )
}

function MarkMono({ size, tone, className, style, title }: { size: number; tone: 'white' | 'dark'; className?: string; style?: CSSProperties; title: string }) {
  const color = tone === 'white' ? '#FFFFFF' : '#2C1A0F'
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 180 180"
      role="img"
      aria-label={title}
      className={className}
      style={{ display: 'block', flexShrink: 0, ...style }}
    >
      <path
        d="M 46 44 L 46 136 M 46 44 L 90 44 M 46 86 L 80 86"
        stroke={color}
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M 100 64 L 122 96 L 144 64 M 122 96 L 122 136"
        stroke={color}
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}

function Wordmark({ height, cleanDot, className, style, title }: { height: number; cleanDot: boolean; className?: string; style?: CSSProperties; title: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height={height}
      viewBox="0 0 360 84"
      role="img"
      aria-label={title}
      className={className}
      style={{ display: 'block', flexShrink: 0, ...style }}
    >
      <text x="0" y="50"
        fontFamily="Fraunces, Georgia, serif"
        fontSize="42"
        fontWeight="700"
        letterSpacing="-1.2"
        fill="#2C1A0F">
        Financeiro{!cleanDot && <tspan fill="#C4553B">.</tspan>}
      </text>
      <text x="2" y="74"
        fontFamily="'Plus Jakarta Sans', sans-serif"
        fontSize="11"
        fontWeight="700"
        letterSpacing="2.8"
        fill="#7A5C4F">DO YAGO</text>
    </svg>
  )
}

function LogoHorizontal({ size, cleanDot, className, style, title }: { size: number; cleanDot: boolean; className?: string; style?: CSSProperties; title: string }) {
  const idBg = uniq('lhb')
  const idFy = uniq('lhf')
  const idGlow = uniq('lhg')
  // size aqui controla a altura do mark
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height={size}
      viewBox="0 0 520 140"
      role="img"
      aria-label={title}
      className={className}
      style={{ display: 'block', flexShrink: 0, ...style }}
    >
      <defs>
        <linearGradient id={idBg} x1="0" y1="0" x2="140" y2="140" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2A1E3F" />
          <stop offset="100%" stopColor="#3D3457" />
        </linearGradient>
        <linearGradient id={idFy} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FBF8F3" />
          <stop offset="100%" stopColor="#D4D0C5" />
        </linearGradient>
        <radialGradient id={idGlow} cx="68%" cy="55%" r="42%">
          <stop offset="0%" stopColor="#F2C745" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#D4A017" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g>
        <rect width="140" height="140" rx="34" fill={`url(#${idBg})`} />
        <circle cx="95" cy="74" r="48" fill={`url(#${idGlow})`} />
        <path
          d="M 36 34 L 36 106 M 36 34 L 70 34 M 36 67 L 62 67"
          stroke={`url(#${idFy})`}
          strokeWidth="11"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M 78 50 L 95 75 L 112 50 M 95 75 L 95 106"
          stroke={`url(#${idFy})`}
          strokeWidth="11"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <circle cx="95" cy="75" r="4.6" fill="#F2C745" />
      </g>
      <g transform="translate(168 0)">
        <text x="0" y="78"
          fontFamily="Fraunces, Georgia, serif"
          fontSize="48"
          fontWeight="700"
          letterSpacing="-1.4"
          fill="#2C1A0F">
          Financeiro{!cleanDot && <tspan fill="#C4553B">.</tspan>}
        </text>
        <text x="2" y="106"
          fontFamily="'Plus Jakarta Sans', sans-serif"
          fontSize="12"
          fontWeight="700"
          letterSpacing="3"
          fill="#7A5C4F">DO YAGO</text>
      </g>
    </svg>
  )
}

function LogoVertical({ size, cleanDot, className, style, title }: { size: number; cleanDot: boolean; className?: string; style?: CSSProperties; title: string }) {
  const idBg = uniq('lvb')
  const idFy = uniq('lvf')
  const idGlow = uniq('lvg')
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      viewBox="0 0 280 320"
      role="img"
      aria-label={title}
      className={className}
      style={{ display: 'block', flexShrink: 0, ...style }}
    >
      <defs>
        <linearGradient id={idBg} x1="0" y1="0" x2="160" y2="160" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2A1E3F" />
          <stop offset="100%" stopColor="#3D3457" />
        </linearGradient>
        <linearGradient id={idFy} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FBF8F3" />
          <stop offset="100%" stopColor="#D4D0C5" />
        </linearGradient>
        <radialGradient id={idGlow} cx="68%" cy="55%" r="42%">
          <stop offset="0%" stopColor="#F2C745" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#D4A017" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g transform="translate(60 0)">
        <rect width="160" height="160" rx="40" fill={`url(#${idBg})`} />
        <circle cx="108" cy="85" r="55" fill={`url(#${idGlow})`} />
        <path
          d="M 40 38 L 40 121 M 40 38 L 80 38 M 40 77 L 71 77"
          stroke={`url(#${idFy})`}
          strokeWidth="12.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M 89 57 L 108 85 L 128 57 M 108 85 L 108 121"
          stroke={`url(#${idFy})`}
          strokeWidth="12.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <circle cx="108" cy="85" r="5.3" fill="#F2C745" />
      </g>
      <g transform="translate(0 200)">
        <text x="140" y="60"
          textAnchor="middle"
          fontFamily="Fraunces, Georgia, serif"
          fontSize="42"
          fontWeight="700"
          letterSpacing="-1.2"
          fill="#2C1A0F">
          Financeiro{!cleanDot && <tspan fill="#C4553B">.</tspan>}
        </text>
        <text x="140" y="88"
          textAnchor="middle"
          fontFamily="'Plus Jakarta Sans', sans-serif"
          fontSize="11"
          fontWeight="700"
          letterSpacing="3"
          fill="#7A5C4F">DO YAGO</text>
      </g>
    </svg>
  )
}

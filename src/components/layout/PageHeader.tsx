// ─── PageHeader: cabeçalho padrão das páginas internas ──────────────
import { motion } from 'framer-motion'

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  icon?: React.ReactNode
  /** Cor inicial do gradient do ícone. Default = roxo institucional. */
  accent?: string
  accentTo?: string
  /** Acima do título — uppercase tagline. */
  eyebrow?: string
}

const DEFAULT_ACCENT = '#2A1E3F'
const DEFAULT_ACCENT_TO = '#504E76'

export function PageHeader({ title, subtitle, action, icon, accent = DEFAULT_ACCENT, accentTo = DEFAULT_ACCENT_TO, eyebrow }: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 28 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 'clamp(20px, 3vw, 28px)',
        paddingBottom: 'clamp(14px, 2vw, 20px)',
        borderBottom: '1px solid #EDE6DC',
        flexWrap: 'wrap',
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: '1 1 0' }}>
        {icon && (
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: `linear-gradient(145deg, ${accent}, ${accentTo})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 8px 22px ${accent}55`,
            flexShrink: 0,
          }}>
            {icon}
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          {eyebrow && (
            <p style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 10.5, fontWeight: 700, color: accent,
              letterSpacing: '.18em', textTransform: 'uppercase',
              margin: '0 0 4px',
            }}>{eyebrow}</p>
          )}
          <h1 style={{
            fontFamily: "'Fraunces', Georgia, serif",
            fontSize: 'clamp(26px, 4vw, 36px)',
            fontWeight: 700,
            color: '#2C1A0F',
            letterSpacing: '-1.1px',
            lineHeight: 1.05,
            margin: 0,
          }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 13, color: '#7A5C4F',
              margin: '4px 0 0',
              fontWeight: 500,
            }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </motion.div>
  )
}

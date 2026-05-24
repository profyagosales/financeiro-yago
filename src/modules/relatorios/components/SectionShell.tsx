// ─── SectionShell: container padrão de cada seção de Relatórios ─────
import { motion } from 'framer-motion'
import { forwardRef, type ReactNode } from 'react'

interface SectionShellProps {
  id: string                  // âncora pra scrollIntoView
  eyebrow: string             // UPPERCASE
  title: string
  description?: string
  icon?: ReactNode
  action?: ReactNode          // botão/link à direita
  children: ReactNode
  delay?: number
  /** Cor de destaque (left bar do header) */
  accent?: string
  /** Variante visual */
  variant?: 'plain' | 'tinted'
}

export const SectionShell = forwardRef<HTMLElement, SectionShellProps>(function SectionShell({
  id, eyebrow, title, description, icon, action, children, delay = 0, accent = '#C4553B', variant = 'plain',
}, ref) {
  return (
    <motion.section
      id={id}
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ type: 'spring', stiffness: 200, damping: 26, delay }}
      style={{
        scrollMarginTop: 170,  // pra sticky shelf (filtros + nav) não cobrir
      }}
    >
      {/* Header da seção */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        marginBottom: 16,
        paddingLeft: 14,
        position: 'relative',
      }}>
        <div aria-hidden style={{
          position: 'absolute', left: 0, top: 4, bottom: 4,
          width: 3, borderRadius: 999,
          background: `linear-gradient(180deg, ${accent}, ${accent}66)`,
        }} />
        {icon && (
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: `${accent}1a`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>{icon}</div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 10, fontWeight: 700,
            color: accent, letterSpacing: '.14em', textTransform: 'uppercase',
            margin: 0,
          }}>{eyebrow}</p>
          <h2 style={{
            fontFamily: "'Fraunces',Georgia,serif",
            fontSize: 'clamp(22px, 2.5vw, 28px)', fontWeight: 700,
            color: '#2C1A0F', letterSpacing: '-0.6px',
            margin: '4px 0 0', lineHeight: 1.15,
          }}>{title}</h2>
          {description && (
            <p style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 13, color: '#7A5C4F', fontWeight: 500,
              margin: '6px 0 0', lineHeight: 1.4, maxWidth: 720,
            }}>{description}</p>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>

      {/* Conteúdo */}
      <div style={{
        background: variant === 'tinted' ? '#FBF8F3' : '#FFFFFF',
        border: '1px solid #EDE6DC',
        borderRadius: 22,
        padding: 'clamp(18px, 2.4vw, 26px)',
        boxShadow: '0 1px 3px rgba(44,26,15,0.04), 0 6px 22px rgba(44,26,15,0.05)',
      }}>
        {children}
      </div>
    </motion.section>
  )
})

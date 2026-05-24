// ─── AuthHeader: logo FY + título + subtítulo ───────────────────────
// Reaproveitado por todas as telas de auth pra manter consistência.

import { motion } from 'framer-motion'
import { Logo } from '@/components/brand'

interface AuthHeaderProps {
  title: string
  subtitle?: React.ReactNode
  /** Tamanho do mark; default 64 */
  logoSize?: number
  /** "Eyebrow" — pequeno label uppercase acima do título */
  eyebrow?: string
}

export function AuthHeader({ title, subtitle, logoSize = 64, eyebrow }: AuthHeaderProps) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 22 }}>
      <motion.div
        initial={{ scale: 0.6, opacity: 0, y: -6 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 22 }}
        style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}
      >
        <Logo variant="mark" size={logoSize} />
      </motion.div>

      {eyebrow && (
        <p style={{
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          fontSize: 10.5, fontWeight: 700,
          color: '#C4553B', letterSpacing: '.18em', textTransform: 'uppercase',
          margin: '0 0 6px',
        }}>{eyebrow}</p>
      )}

      <h1 style={{
        fontFamily: "'Fraunces',Georgia,serif",
        fontSize: 'clamp(24px, 4vw, 30px)', fontWeight: 700,
        color: '#2C1A0F', letterSpacing: '-0.6px', lineHeight: 1.05,
        margin: 0,
      }}>
        {title}
      </h1>

      {subtitle && (
        <p style={{
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          fontSize: 13, color: '#7A5C4F', fontWeight: 500,
          margin: '10px 0 0', lineHeight: 1.5, maxWidth: 340, marginLeft: 'auto', marginRight: 'auto',
        }}>
          {subtitle}
        </p>
      )}
    </div>
  )
}

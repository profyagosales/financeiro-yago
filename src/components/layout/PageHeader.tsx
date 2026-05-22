import { motion } from 'framer-motion'

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  icon?: React.ReactNode
}

export function PageHeader({ title, subtitle, action, icon }: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 28 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 28,
        paddingBottom: 20,
        borderBottom: '1px solid #EDE6DC',
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {icon && (
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'linear-gradient(145deg, #C4553B, #A8442B)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(196,85,59,0.35)',
            flexShrink: 0,
          }}>
            {icon}
          </div>
        )}
        <div>
          <h1 style={{
            fontFamily: "'Fraunces', Georgia, serif",
            fontSize: 36,
            fontWeight: 700,
            color: '#2C1A0F',
            letterSpacing: '-1.5px',
            lineHeight: 1.1,
          }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 13,
              color: '#9B7B6A',
              marginTop: 3,
            }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && <div>{action}</div>}
    </motion.div>
  )
}

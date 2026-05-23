import { motion } from 'framer-motion'
import { itemVariants } from '@/lib/animations'

interface StatBlockProps {
  label: string
  value: string | number
  sub?: string
  color?: string
  icon?: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  onClick?: () => void
  size?: 'sm' | 'md' | 'lg'
}

export function StatBlock({
  label,
  value,
  sub,
  color = '#2C1A0F',
  icon,
  trend,
  trendValue,
  onClick,
  size = 'md',
}: StatBlockProps) {
  const fontSize = size === 'sm' ? 20 : size === 'lg' ? 36 : 28
  return (
    <motion.div
      variants={itemVariants}
      onClick={onClick}
      whileHover={onClick ? { y: -3, boxShadow: '0 8px 28px rgba(44,26,15,0.1)' } : undefined}
      style={{
        background: '#FFFFFF',
        border: '1px solid #EDE6DC',
        borderRadius: 18,
        padding: '16px 18px',
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: '0 1px 3px rgba(44,26,15,0.05), 0 4px 16px rgba(44,26,15,0.06)',
        transition: 'box-shadow .18s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        {icon && (
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 7,
              background: `${color}18`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </div>
        )}
        <p
          style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 11,
            fontWeight: 700,
            color: '#9B7B6A',
            letterSpacing: '.07em',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </p>
      </div>
      <p
        style={{
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          fontSize,
          fontWeight: 700,
          color,
          letterSpacing: '-0.3px',
          lineHeight: 1.1,
          marginBottom: sub ? 4 : 0,
        }}
      >
        {typeof value === 'number'
          ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
          : value}
      </p>
      {(sub || trendValue) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
          {trendValue && (
            <span
              style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontSize: 10,
                fontWeight: 700,
                background:
                  trend === 'up' ? '#EBF5F0' : trend === 'down' ? '#FAF0EE' : '#F5F0E8',
                color:
                  trend === 'up' ? '#3A8580' : trend === 'down' ? '#C4553B' : '#9B7B6A',
                padding: '2px 7px',
                borderRadius: 20,
              }}
            >
              {trendValue}
            </span>
          )}
          {sub && (
            <p
              style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontSize: 11,
                color: '#9B7B6A',
              }}
            >
              {sub}
            </p>
          )}
        </div>
      )}
    </motion.div>
  )
}

import { motion } from 'framer-motion'
import { Dobrao } from '@/components/mascot/Dobrao'

type EmptyStateType =
  | 'contas'
  | 'cartoes'
  | 'transacoes'
  | 'metas'
  | 'patrimonio'
  | 'parcelamentos'
  | 'relatorios'
  | 'default'

const ILLUSTRATIONS: Record<EmptyStateType, React.ReactNode> = {
  contas: (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
      <circle cx="40" cy="40" r="36" fill="#FAF0EE" />
      <rect x="16" y="30" width="48" height="28" rx="6" fill="#EDE6DC" />
      <rect x="16" y="30" width="48" height="10" rx="6" fill="#C4553B" opacity="0.6" />
      <rect x="22" y="46" width="12" height="4" rx="2" fill="#9B7B6A" opacity="0.5" />
      <rect x="38" y="46" width="20" height="4" rx="2" fill="#9B7B6A" opacity="0.3" />
      <circle cx="58" cy="22" r="12" fill="#F5F0E8" stroke="#EDE6DC" strokeWidth="1.5" />
      <text x="58" y="27" textAnchor="middle" fill="#C4553B" fontSize="12" fontWeight="700">
        R$
      </text>
    </svg>
  ),
  cartoes: (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
      <circle cx="40" cy="40" r="36" fill="#FAF0EE" />
      <rect x="14" y="26" width="42" height="26" rx="5" fill="#C4553B" opacity="0.2" />
      <rect x="20" y="32" width="42" height="26" rx="5" fill="#C4553B" opacity="0.5" />
      <rect x="20" y="32" width="42" height="9" rx="5" fill="#C4553B" />
      <rect x="26" y="48" width="8" height="4" rx="2" fill="white" opacity="0.7" />
      <rect x="36" y="48" width="8" height="4" rx="2" fill="white" opacity="0.5" />
    </svg>
  ),
  transacoes: <Dobrao mood="sleeping" size={72} />,
  metas: (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
      <circle cx="40" cy="40" r="36" fill="#EBF5F0" />
      <circle cx="40" cy="40" r="24" fill="none" stroke="#EDE6DC" strokeWidth="6" />
      <circle
        cx="40"
        cy="40"
        r="24"
        fill="none"
        stroke="#3A8580"
        strokeWidth="6"
        strokeDasharray="75 75"
        strokeLinecap="round"
        transform="rotate(-90 40 40)"
        opacity="0.6"
      />
      <circle cx="40" cy="40" r="10" fill="#3A8580" opacity="0.2" />
      <circle cx="40" cy="40" r="4" fill="#3A8580" />
    </svg>
  ),
  patrimonio: (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
      <circle cx="40" cy="40" r="36" fill="#FAF0EE" />
      <rect x="24" y="42" width="32" height="18" rx="3" fill="#EDE6DC" />
      <rect x="30" y="48" width="8" height="12" rx="2" fill="#9B7B6A" opacity="0.4" />
      <rect x="42" y="52" width="8" height="8" rx="2" fill="#C4553B" opacity="0.3" />
      <polygon points="20,42 40,22 60,42" fill="#C4553B" opacity="0.4" />
      <rect x="36" y="28" width="8" height="6" rx="1" fill="white" opacity="0.5" />
    </svg>
  ),
  parcelamentos: (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
      <circle cx="40" cy="40" r="36" fill="#FDF4E3" />
      <rect x="18" y="28" width="44" height="6" rx="3" fill="#D4A017" opacity="0.3" />
      <rect x="18" y="38" width="36" height="6" rx="3" fill="#D4A017" opacity="0.4" />
      <rect x="18" y="48" width="28" height="6" rx="3" fill="#D4A017" opacity="0.5" />
      <circle cx="58" cy="54" r="10" fill="#D4A017" opacity="0.2" />
      <text x="58" y="59" textAnchor="middle" fill="#D4A017" fontSize="11" fontWeight="700">
        %
      </text>
    </svg>
  ),
  relatorios: (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
      <circle cx="40" cy="40" r="36" fill="#EBF5F0" />
      <rect x="20" y="52" width="8" height="12" rx="2" fill="#3A8580" opacity="0.3" />
      <rect x="32" y="40" width="8" height="24" rx="2" fill="#3A8580" opacity="0.5" />
      <rect x="44" y="30" width="8" height="34" rx="2" fill="#3A8580" opacity="0.7" />
      <rect x="56" y="44" width="8" height="20" rx="2" fill="#3A8580" opacity="0.4" />
      <polyline
        points="24,52 36,40 48,30 60,44"
        stroke="#3A8580"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  default: <Dobrao mood="sleeping" size={72} />,
}

interface EmptyStateProps {
  type?: EmptyStateType
  title: string
  subtitle?: string
  cta?: { label: string; onClick: () => void }
}

export function EmptyState({ type = 'default', title, subtitle, cta }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '56px 24px',
        textAlign: 'center',
      }}
    >
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        style={{ marginBottom: 20 }}
      >
        {ILLUSTRATIONS[type]}
      </motion.div>
      <p
        style={{
          fontFamily: "'Fraunces',Georgia,serif",
          fontSize: 20,
          fontWeight: 700,
          color: '#2C1A0F',
          marginBottom: 6,
        }}
      >
        {title}
      </p>
      {subtitle && (
        <p
          style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 14,
            color: '#9B7B6A',
            marginBottom: cta ? 20 : 0,
            maxWidth: 280,
            lineHeight: 1.5,
          }}
        >
          {subtitle}
        </p>
      )}
      {cta && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={cta.onClick}
          style={{
            background: '#C4553B',
            color: 'white',
            border: 'none',
            borderRadius: 12,
            padding: '11px 24px',
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(196,85,59,0.3)',
          }}
        >
          {cta.label}
        </motion.button>
      )}
    </motion.div>
  )
}

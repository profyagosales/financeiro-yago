import { motion } from 'framer-motion'

type DobraoMood = 'happy' | 'sleeping' | 'celebrating' | 'sad' | 'waving'
interface DobraoProps { mood?: DobraoMood; size?: number; className?: string }

export function Dobrao({ mood = 'happy', size = 120, className = '' }: DobraoProps) {
  return (
    <motion.div className={className} style={{ display: 'inline-block', width: size, height: size * 1.1 }}
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' as const }}>
      <svg width={size} height={size * 1.1} viewBox="0 0 140 150" fill="none">
        <ellipse cx="70" cy="142" rx="38" ry="8" fill="#2C1A0F" opacity="0.1" />
        <motion.g style={{ transformOrigin: '16px 43px' }} animate={{ opacity: [1, 0.2, 1], scale: [1, 0.4, 1] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' as const }}>
          <path d="M16 36L17.8 43L16 50L9 43Z" fill="#D4A017" />
          <path d="M9 43L16 41.2L23 43L16 44.8Z" fill="#D4A017" />
        </motion.g>
        <motion.g style={{ transformOrigin: '124px 36px' }} animate={{ opacity: [1, 0.2, 1], scale: [1, 0.4, 1] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' as const, delay: 0.7 }}>
          <path d="M124 29L125.8 36L124 43L117 36Z" fill="#D4A017" />
          <path d="M117 36L124 34.2L131 36L124 37.8Z" fill="#D4A017" />
        </motion.g>
        <motion.circle cx="12" cy="95" r="5" fill="#3A8580" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' as const, delay: 1 }} />
        <circle cx="128" cy="92" r="3.5" fill="#3A8580" opacity="0.8" />
        <path d="M24 88C12 74 8 52 20 38" stroke="#C4553B" strokeWidth="14" strokeLinecap="round" />
        <path d="M116 88C128 74 132 52 120 38" stroke="#C4553B" strokeWidth="14" strokeLinecap="round" />
        <circle cx="70" cy="78" r="50" fill="#C4553B" />
        <circle cx="70" cy="78" r="43" stroke="#B84D33" strokeWidth="1.5" fill="none" />
        <path d="M44 46C52 34 68 32 78 40C66 38 54 46 50 60Z" fill="#D4653B" opacity="0.55" />
        <rect x="45" y="5" width="50" height="25" rx="8" fill="#2C1A0F" />
        <rect x="45" y="22" width="50" height="8" fill="#C4553B" />
        <ellipse cx="70" cy="30" rx="36" ry="8" fill="#2C1A0F" />
        {mood === 'sleeping' ? (
          <>
            <path d="M51 72Q57 68 63 72" stroke="#2C1A0F" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <path d="M77 72Q83 68 89 72" stroke="#2C1A0F" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          </>
        ) : (
          <>
            <circle cx="57" cy="72" r="7" fill="#2C1A0F" />
            <circle cx="83" cy="72" r="7" fill="#2C1A0F" />
            <circle cx="60" cy="69" r="2.5" fill="white" />
            <circle cx="86" cy="69" r="2.5" fill="white" />
          </>
        )}
        <circle cx="47" cy="83" r="7.5" fill="#E07060" opacity="0.38" />
        <circle cx="93" cy="83" r="7.5" fill="#E07060" opacity="0.38" />
        {mood === 'sad'
          ? <path d="M56 96Q70 88 84 96" stroke="#2C1A0F" strokeWidth="3" strokeLinecap="round" fill="none" />
          : <path d="M56 92Q70 104 84 92" stroke="#2C1A0F" strokeWidth="3" strokeLinecap="round" fill="none" />
        }
        <text x="70" y="88" textAnchor="middle" fontFamily="Georgia,serif" fontSize="14" fontWeight="700" fill="#FAF6F0" opacity="0.85">R$</text>
      </svg>
    </motion.div>
  )
}

import { motion } from 'framer-motion'

type DobraoMood = 'happy' | 'sleeping' | 'sad' | 'waving' | 'dancing' | 'celebrating'

interface DobraoProps { mood?: DobraoMood; size?: number }

export function Dobrao({ mood = 'happy', size = 80 }: DobraoProps) {
  const s = size
  const eyeAnim = mood === 'sleeping' ? { scaleY: 0.1 } : { scaleY: 1 }
  const bodyAnim = mood === 'dancing'
    ? { rotate: [-5, 5, -5], transition: { duration: 0.6, repeat: Infinity } }
    : mood === 'waving'
    ? { x: [0, 4, 0], transition: { duration: 1.2, repeat: Infinity } }
    : mood === 'celebrating'
    ? { y: [0, -6, 0], transition: { duration: 0.5, repeat: Infinity } }
    : {}

  const mouthPath = {
    happy: 'M 30 52 Q 40 60 50 52',
    sleeping: 'M 32 52 Q 40 48 48 52',
    sad: 'M 30 58 Q 40 50 50 58',
    waving: 'M 28 52 Q 40 62 52 52',
    dancing: 'M 28 50 Q 40 64 52 50',
    celebrating: 'M 27 50 Q 40 66 53 50',
  }

  return (
    <motion.div animate={bodyAnim} style={{ display: 'inline-block', cursor: 'default', flexShrink: 0 }}>
      <svg width={s} height={s * 1.1} viewBox="0 0 80 90" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Shadow */}
        <ellipse cx="40" cy="87" rx="22" ry="4" fill="#2C1A0F" opacity="0.12" />
        {/* Body */}
        <circle cx="40" cy="44" r="32" fill="#C4553B" />
        {/* Shine */}
        <ellipse cx="30" cy="28" rx="9" ry="6" fill="white" opacity="0.18" transform="rotate(-20 30 28)" />
        {/* Hat brim */}
        <rect x="14" y="14" width="52" height="5" rx="2.5" fill="#2C1A0F" />
        {/* Hat top */}
        <rect x="22" y="0" width="36" height="18" rx="4" fill="#2C1A0F" />
        {/* Hat band */}
        <rect x="22" y="13" width="36" height="4" rx="1.5" fill="#D4A017" />
        {/* R$ badge */}
        <circle cx="40" cy="44" r="13" fill="#2C1A0F" opacity="0.18" />
        <text x="40" y="49" textAnchor="middle" fill="white" fontSize="10" fontWeight="700" fontFamily="Georgia,serif">R$</text>
        {/* Left arm */}
        {mood === 'waving' ? (
          <motion.path animate={{ rotate: [0, -30, 0] }} style={{ originX: '15px', originY: '44px' }}
            transition={{ duration: 1.2, repeat: Infinity }}
            d="M 14 40 Q 4 32 6 24" stroke="#C4553B" strokeWidth="7" strokeLinecap="round" fill="none" />
        ) : (
          <path d="M 14 44 Q 4 40 8 34" stroke="#B04030" strokeWidth="7" strokeLinecap="round" />
        )}
        {/* Right arm */}
        <path d="M 66 44 Q 76 40 72 34" stroke="#B04030" strokeWidth="7" strokeLinecap="round" />
        {/* Eyes */}
        <motion.ellipse animate={eyeAnim} cx="31" cy="40" rx="4" ry="4.5" fill="#2C1A0F" />
        <motion.ellipse animate={eyeAnim} cx="49" cy="40" rx="4" ry="4.5" fill="#2C1A0F" />
        {/* Eye shine */}
        {mood !== 'sleeping' && <>
          <circle cx="33" cy="38" r="1.5" fill="white" />
          <circle cx="51" cy="38" r="1.5" fill="white" />
        </>}
        {/* Sleeping Z */}
        {mood === 'sleeping' && (
          <text x="56" y="26" fill="#2C1A0F" fontSize="10" fontWeight="700" opacity="0.5" fontFamily="Georgia,serif">z</text>
        )}
        {/* Mouth */}
        <motion.path d={mouthPath[mood]} stroke="#2C1A0F" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        {/* Tears for sad */}
        {mood === 'sad' && <>
          <motion.ellipse animate={{ y: [0, 6] }} transition={{ duration: 0.8, repeat: Infinity }} cx="29" cy="46" rx="1.5" ry="2" fill="#6EC9C4" opacity="0.8" />
          <motion.ellipse animate={{ y: [0, 6] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }} cx="51" cy="46" rx="1.5" ry="2" fill="#6EC9C4" opacity="0.8" />
        </>}
        {/* Stars for celebrating */}
        {mood === 'celebrating' && <>
          <motion.text animate={{ opacity: [0, 1, 0], y: [-2, -8] }} transition={{ duration: 0.8, repeat: Infinity }} x="12" y="32" fontSize="10">⭐</motion.text>
          <motion.text animate={{ opacity: [0, 1, 0], y: [-2, -8] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.3 }} x="58" y="28" fontSize="10">🌟</motion.text>
        </>}
      </svg>
    </motion.div>
  )
}

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const COLORS = ['#C4553B','#3A8580','#D4A017','#8B4BC8','#3D7EB5','#E89527','#D94F8A']

interface ConfettiProps { show: boolean; onDone?: () => void }

export function Confetti({ show, onDone }: ConfettiProps) {
  useEffect(() => {
    if (show && onDone) setTimeout(onDone, 2500)
  }, [show])

  if (!show) return null

  const pieces = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: COLORS[i % COLORS.length],
    delay: Math.random() * 0.4,
    size: 6 + Math.random() * 8,
    rotate: Math.random() * 360,
  }))

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}>
      {pieces.map(p => (
        <motion.div key={p.id}
          initial={{ y: -20, x: `${p.x}vw`, opacity: 1, rotate: 0 }}
          animate={{ y: '110vh', opacity: 0, rotate: p.rotate + 360 }}
          transition={{ duration: 1.5 + Math.random(), delay: p.delay, ease: 'easeIn' }}
          style={{ position: 'absolute', top: 0, width: p.size, height: p.size * 0.6, background: p.color, borderRadius: 2 }}
        />
      ))}
    </div>
  )
}

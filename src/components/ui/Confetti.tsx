import { useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'

const COLORS = ['#C4553B','#3A8580','#D4A017','#8B4BC8','#3D7EB5','#E89527','#D94F8A']

interface ConfettiProps { show: boolean; onDone?: () => void }

interface Piece {
  id: number
  x: number
  color: string
  delay: number
  size: number
  rotate: number
  duration: number
}

function makePieces(): Piece[] {
  return Array.from({ length: 40 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: COLORS[i % COLORS.length],
    delay: Math.random() * 0.4,
    size: 6 + Math.random() * 8,
    rotate: Math.random() * 360,
    duration: 1.5 + Math.random(),
  }))
}

export function Confetti({ show, onDone }: ConfettiProps) {
  // useEffect só pra disparar o callback onDone — sem setState dentro
  useEffect(() => {
    if (!show || !onDone) return
    const t = setTimeout(onDone, 2500)
    return () => clearTimeout(t)
  }, [show, onDone])

  // Math.random dentro de useMemo é puro pelo lint (compute pontual, não no body de render).
  // eslint-disable-next-line react-hooks/exhaustive-deps -- show é trigger intencional pra regenerar peças
  const pieces = useMemo(() => makePieces(), [show])

  if (!show) return null

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}>
      {pieces.map(p => (
        <motion.div key={p.id}
          initial={{ y: -20, x: `${p.x}vw`, opacity: 1, rotate: 0 }}
          animate={{ y: '110vh', opacity: 0, rotate: p.rotate + 360 }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn' }}
          style={{ position: 'absolute', top: 0, width: p.size, height: p.size * 0.6, background: p.color, borderRadius: 2 }}
        />
      ))}
    </div>
  )
}

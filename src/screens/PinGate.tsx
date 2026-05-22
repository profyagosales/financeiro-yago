import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/auth'
import { Dobrao } from '@/components/mascot/Dobrao'
import { sounds, haptic } from '@/lib/sounds'

const KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫']

export function PinGate() {
  const [digits, setDigits] = useState<string[]>([])
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)
  const { unlock } = useAuthStore()

  const handleKey = async (k: string) => {
    if (k === '⌫') {
      haptic('light')
      setDigits(d => d.slice(0, -1))
      return
    }
    if (!k) return
    if (digits.length >= 6) return
    sounds.pin_digit()
    haptic('light')
    const next = [...digits, k]
    setDigits(next)
    if (next.length === 6) {
      const ok = await unlock(next.join(''))
      if (!ok) {
        sounds.error()
        haptic('heavy')
        setShake(true); setError(true)
        setTimeout(() => { setShake(false); setDigits([]) }, 700)
        setTimeout(() => setError(false), 2500)
      } else {
        sounds.success()
        haptic('medium')
      }
    }
  }

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') handleKey(e.key)
      if (e.key === 'Backspace') handleKey('⌫')
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [digits])

  return (
    <div style={{ position: 'relative', minHeight: '100dvh', overflow: 'hidden' }}>
      {/* Animated background orbs */}
      <div style={{ position: 'fixed', inset: 0, background: '#FAF6F0', overflow: 'hidden' }}>
        <motion.div
          animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
          style={{ position: 'absolute', left: '10%', top: '5%', width: 400, height: 400, borderRadius: '50%', background: 'rgba(196,85,59,0.08)', filter: 'blur(120px)' }}
        />
        <motion.div
          animate={{ x: [0, -30, 25, 0], y: [0, 20, -15, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          style={{ position: 'absolute', right: '5%', top: '30%', width: 350, height: 350, borderRadius: '50%', background: 'rgba(58,133,128,0.07)', filter: 'blur(100px)' }}
        />
        <motion.div
          animate={{ x: [0, 20, -30, 0], y: [0, -20, 25, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
          style={{ position: 'absolute', left: '40%', bottom: '10%', width: 300, height: 300, borderRadius: '50%', background: 'rgba(212,160,23,0.05)', filter: 'blur(90px)' }}
        />
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', padding: 24 }}>
        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', borderRadius: 32, padding: '40px 36px', width: '100%', maxWidth: 380, boxShadow: '0 20px 60px rgba(44,26,15,0.12), 0 4px 16px rgba(44,26,15,0.08)', border: '1px solid rgba(255,255,255,0.9)' }}>

          {/* Dobrao */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22, delay: 0.2 }}
            style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
              <Dobrao mood={error ? 'sad' : digits.length === 6 ? 'celebrating' : 'happy'} size={88} />
            </motion.div>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 26, fontWeight: 700, color: '#2C1A0F', textAlign: 'center', marginBottom: 4 }}>
            Financeiro do Yago
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#9B7B6A', textAlign: 'center', marginBottom: 28 }}>
            Digite seu PIN para entrar
          </motion.p>

          {/* PIN dots */}
          <motion.div
            animate={shake ? { x: [-12, 12, -10, 10, -6, 6, 0] } : { x: 0 }}
            transition={{ duration: 0.5 }}
            style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 28 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <motion.div key={i}
                animate={i < digits.length
                  ? { scale: [1, 1.3, 1], backgroundColor: '#C4553B' }
                  : { scale: 1, backgroundColor: '#EDE6DC' }}
                transition={{ duration: 0.2 }}
                style={{ width: 10, height: 10, borderRadius: '50%' }}
              />
            ))}
          </motion.div>

          {/* Keypad */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {KEYS.map((key, i) => (
              <motion.button key={i}
                whileTap={key !== '' ? { scale: 0.88 } : undefined}
                onClick={() => key !== '' && handleKey(String(key))}
                style={{
                  height: 64, borderRadius: 16, border: 'none',
                  cursor: key !== '' ? 'pointer' : 'default',
                  background: key === '⌫' ? '#FEE2DC' : key === '' ? 'transparent' : '#FFFFFF',
                  boxShadow: key !== '' && key !== '⌫' ? '0 2px 8px rgba(44,26,15,0.08)' : 'none',
                  fontFamily: "'Fraunces',Georgia,serif", fontSize: 24, fontWeight: 700,
                  color: key === '⌫' ? '#C4553B' : '#2C1A0F',
                }}>
                {key}
              </motion.button>
            ))}
          </motion.div>

          {/* Error message */}
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#C4553B', textAlign: 'center', marginTop: 12, fontWeight: 600 }}>
                PIN incorreto. Tente novamente.
              </motion.p>
            )}
          </AnimatePresence>

          {/* Default PIN hint */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#C4B4A8', textAlign: 'center', marginTop: error ? 8 : 16 }}>
            PIN padrão: 123456
          </motion.p>
        </motion.div>
      </div>
    </div>
  )
}

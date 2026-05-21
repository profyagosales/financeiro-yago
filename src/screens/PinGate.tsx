import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/auth'
import { Dobrao } from '@/components/mascot/Dobrao'
import { DoodleCircles, DoodleDots, DoodleStar } from '@/components/ui/Doodle'

const KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫']

export function PinGate() {
  const [digits, setDigits] = useState<string[]>([])
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)
  const { unlock } = useAuthStore()

  const handleKey = async (k: string) => {
    if (k === '⌫') { setDigits(d => d.slice(0, -1)); return }
    if (!k) return
    if (digits.length >= 6) return
    const next = [...digits, k]
    setDigits(next)
    if (next.length === 6) {
      const ok = await unlock(next.join(''))
      if (!ok) {
        setShake(true); setError(true)
        setTimeout(() => { setShake(false); setDigits([]) }, 700)
        setTimeout(() => setError(false), 2500)
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
    <div style={{ minHeight: '100dvh', background: '#FAF6F0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', gap: '1.5rem', position: 'relative', overflow: 'hidden' }}>

      {/* Background doodles */}
      <div style={{ position: 'absolute', top: 20, right: 20, opacity: 0.4 }}>
        <DoodleCircles color="#C4553B" opacity={0.12} />
      </div>
      <div style={{ position: 'absolute', bottom: 40, left: 20, opacity: 0.4 }}>
        <DoodleDots color="#C4553B" opacity={0.1} />
      </div>
      <motion.div style={{ position: 'absolute', top: 60, left: 40 }} animate={{ rotate: [0, 10, 0] }} transition={{ duration: 4, repeat: Infinity }}>
        <DoodleStar color="#D4A017" size={24} opacity={0.4} />
      </motion.div>
      <motion.div style={{ position: 'absolute', bottom: 120, right: 40 }} animate={{ rotate: [0, -15, 0] }} transition={{ duration: 5, repeat: Infinity }}>
        <DoodleStar color="#3A8580" size={18} opacity={0.4} />
      </motion.div>
      <motion.div style={{ position: 'absolute', top: 160, right: 60 }} animate={{ rotate: [0, 8, 0] }} transition={{ duration: 3.5, repeat: Infinity }}>
        <DoodleStar color="#C4553B" size={14} opacity={0.3} />
      </motion.div>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center' }}>
        <Dobrao mood={error ? 'sad' : 'happy'} size={120} />
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h1 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 30, fontWeight: 700, color: '#2C1A0F', marginTop: 8, letterSpacing: '-0.5px' }}>
            Financeiro do Yago
          </h1>
          <AnimatePresence mode="wait">
            <motion.p key={error ? 'err' : 'ok'} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, color: error ? '#C4553B' : '#9B7B6A', marginTop: 6, fontWeight: error ? 600 : 400 }}>
              {error ? 'PIN incorreto. Tente novamente.' : 'Digite seu PIN para entrar'}
            </motion.p>
          </AnimatePresence>
        </motion.div>
      </motion.div>

      {/* Dots */}
      <motion.div animate={shake ? { x: [-12, 12, -10, 10, -6, 6, 0] } : { x: 0 }}
        transition={{ duration: 0.5 }}
        style={{ display: 'flex', gap: 16 }}>
        {[0,1,2,3,4,5].map(i => (
          <motion.div key={i}
            animate={{ scale: digits.length > i ? 1.1 : 0.85, backgroundColor: digits.length > i ? (error ? '#B94040' : '#C4553B') : '#E8E0D5' }}
            transition={{ type: 'spring', stiffness: 500, damping: 22 }}
            style={{ width: 14, height: 14, borderRadius: '50%' }} />
        ))}
      </motion.div>

      {/* Keypad */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, width: '100%', maxWidth: 280 }}>
        {KEYS.map((k, i) => (
          <motion.button key={i} onClick={() => handleKey(k)}
            whileTap={{ scale: 0.88 }} whileHover={{ scale: k ? 1.05 : 1 }}
            style={{
              height: 68, borderRadius: 18, border: k && k !== '⌫' ? '1px solid #E8E0D5' : 'none',
              cursor: k ? 'pointer' : 'default',
              background: k === '⌫' ? '#F5E8E4' : k ? '#FFFDF9' : 'transparent',
              boxShadow: k && k !== '⌫' ? '0 2px 8px rgba(44,26,15,0.06)' : 'none',
              fontSize: k === '⌫' ? 20 : 24, fontWeight: 600,
              color: k === '⌫' ? '#C4553B' : '#2C1A0F',
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              transition: 'background .15s',
            }}>
            {k}
          </motion.button>
        ))}
      </motion.div>

      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
        style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#C4B4A8' }}>
        PIN padrão: 123456
      </motion.p>
    </div>
  )
}

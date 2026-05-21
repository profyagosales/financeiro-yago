import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/auth'
import { Dobrao } from '@/components/mascot/Dobrao'

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
        setTimeout(() => setError(false), 2000)
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
    <div style={{ minHeight: '100dvh', background: '#FAF6F0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', gap: '2rem' }}>
      <div style={{ textAlign: 'center' }}>
        <Dobrao mood={error ? 'sad' : 'happy'} size={110} />
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 28, fontWeight: 700, color: '#2C1A0F', marginTop: 8 }}>Financeiro do Yago</h1>
          <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, color: error ? '#B94040' : '#9B7B6A', marginTop: 4 }}>
            {error ? 'PIN incorreto. Tente novamente.' : 'Digite seu PIN para entrar'}
          </p>
        </motion.div>
      </div>

      <motion.div animate={shake ? { x: [-10, 10, -8, 8, -4, 4, 0] } : { x: 0 }} style={{ display: 'flex', gap: 14 }}>
        {[0,1,2,3,4,5].map(i => (
          <motion.div key={i}
            animate={{ scale: digits.length > i ? 1 : 0.8, backgroundColor: digits.length > i ? (error ? '#B94040' : '#C4553B') : '#E8E0D5' }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            style={{ width: 16, height: 16, borderRadius: '50%' }} />
        ))}
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, width: '100%', maxWidth: 300 }}>
        {KEYS.map((k, i) => (
          <motion.button key={i} onClick={() => handleKey(k)}
            whileTap={{ scale: 0.92 }} whileHover={{ scale: k ? 1.04 : 1 }}
            style={{
              height: 72, borderRadius: 18, border: k && k !== '⌫' ? '0.5px solid #E8E0D5' : 'none',
              cursor: k ? 'pointer' : 'default',
              background: k === '⌫' ? '#F5E8E4' : k ? '#FFFDF9' : 'transparent',
              boxShadow: k && k !== '⌫' ? '0 2px 8px rgba(44,26,15,0.06)' : 'none',
              fontSize: k === '⌫' ? 22 : 26, fontWeight: 600,
              color: k === '⌫' ? '#C4553B' : '#2C1A0F',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}>
            {k}
          </motion.button>
        ))}
      </div>

      <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, color: '#C4B4A8' }}>PIN padrão: 123456</p>
    </div>
  )
}

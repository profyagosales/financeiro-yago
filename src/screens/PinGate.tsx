import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/auth'
import { Dobrao } from '@/components/mascot/Dobrao'
import { sounds, haptic } from '@/lib/sounds'

const KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫']

// ─── PinGate ─────────────────────────────────────────────────────────
// Mostrada quando user tem sessão Supabase + PIN local definido.
// Pede PIN pra desbloquear. "Esqueci o PIN" faz logout completo
// (volta pra Welcome).

const PIN_LENGTH = 4  // mesma length usada no CreatePinScreen

export function PinGate() {
  const [digits, setDigits] = useState<string[]>([])
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const { unlock, signOut, email } = useAuthStore()

  const handleKey = async (k: string) => {
    if (k === '⌫') {
      haptic('light')
      setDigits(d => d.slice(0, -1))
      return
    }
    if (!k) return
    if (digits.length >= PIN_LENGTH) return
    sounds.pin_digit()
    haptic('light')
    const next = [...digits, k]
    setDigits(next)
    if (next.length === PIN_LENGTH) {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits])

  return (
    <>
      {/* Dobrao */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 22, delay: 0.1 }}
        style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
          <Dobrao mood={error ? 'sad' : digits.length === PIN_LENGTH ? 'celebrating' : 'happy'} size={88} />
        </motion.div>
      </motion.div>

      <h1 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 26, fontWeight: 700, color: '#2C1A0F', textAlign: 'center', marginBottom: 4, letterSpacing: '-0.5px' }}>
        Financeiro do Yago
      </h1>
      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#9B7B6A', textAlign: 'center', marginBottom: 24 }}>
        {email ? <>Digite o PIN · <span style={{ color: '#7A5C4F' }}>{email}</span></> : 'Digite seu PIN para entrar'}
      </p>

      {/* PIN dots */}
      <motion.div
        animate={shake ? { x: [-12, 12, -10, 10, -6, 6, 0] } : { x: 0 }}
        transition={{ duration: 0.5 }}
        style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 24 }}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <motion.div key={i}
            animate={i < digits.length
              ? { scale: [1, 1.3, 1], backgroundColor: '#C4553B' }
              : { scale: 1, backgroundColor: '#EDE6DC' }}
            transition={{ duration: 0.2 }}
            style={{ width: 14, height: 14, borderRadius: '50%' }}
          />
        ))}
      </motion.div>

      {/* Keypad */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
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
      </div>

      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#C4553B', fontWeight: 600, textAlign: 'center', marginTop: 14 }}>
            PIN incorreto
          </motion.p>
        )}
      </AnimatePresence>

      <button onClick={() => setConfirmReset(true)}
        style={{
          width: '100%', marginTop: 18, padding: '8px 0',
          background: 'transparent', border: 'none',
          fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600,
          color: '#9B7B6A', cursor: 'pointer',
        }}>
        Esqueci o PIN
      </button>

      {/* Confirm reset overlay */}
      <AnimatePresence>
        {confirmReset && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setConfirmReset(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(28,10,5,0.6)', backdropFilter: 'blur(8px)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <motion.div initial={{ scale: 0.92 }} animate={{ scale: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ background: '#FFFDF9', borderRadius: 22, padding: '26px 24px', maxWidth: 340, width: '100%', textAlign: 'center' }}>
              <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 18, fontWeight: 700, color: '#2C1A0F', margin: '0 0 8px' }}>Esqueceu o PIN?</p>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#7A5C4F', margin: '0 0 18px', lineHeight: 1.5 }}>
                Vamos sair da sua conta e enviar um novo link de acesso por email. Depois você cria um PIN novo neste dispositivo.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setConfirmReset(false)}
                  style={{ flex: 1, padding: '11px 0', borderRadius: 11, border: '1.5px solid #E8E0D5', background: 'white', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, color: '#7A5C4F', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button onClick={() => signOut()}
                  style={{ flex: 1, padding: '11px 0', borderRadius: 11, border: 'none', background: '#C4553B', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, color: 'white', cursor: 'pointer', boxShadow: '0 4px 12px rgba(196,85,59,0.3)' }}>
                  Continuar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

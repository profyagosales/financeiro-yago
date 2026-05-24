import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Dobrao } from '@/components/mascot/Dobrao'
import { IconShieldLock, IconLogout } from '@tabler/icons-react'
import { useAuthStore } from '@/store/auth'
import { sounds, haptic } from '@/lib/sounds'

const KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫']

// ─── CreatePinScreen ─────────────────────────────────────────────────
// Mostrada quando user tem sessão Supabase mas não tem PIN local
// (primeira vez nesse dispositivo). Pede pra criar PIN de 4 dígitos +
// confirmação.

type Step = 'create' | 'confirm'

export function CreatePinScreen() {
  const [step, setStep] = useState<Step>('create')
  const [firstPin, setFirstPin] = useState('')
  const [digits, setDigits] = useState<string[]>([])
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)
  const { setPin, email, signOut } = useAuthStore()

  const PIN_LENGTH = 4

  const handleKey = (k: string) => {
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
      if (step === 'create') {
        setFirstPin(next.join(''))
        setStep('confirm')
        setTimeout(() => setDigits([]), 200)
      } else {
        // confirmar
        if (next.join('') === firstPin) {
          sounds.success()
          haptic('medium')
          // Salva PIN — store atualiza isUnlocked → AuthFlow vai pro app
          setPin(firstPin)
        } else {
          sounds.error()
          haptic('heavy')
          setShake(true); setError(true)
          setTimeout(() => { setShake(false); setDigits([]) }, 700)
          setTimeout(() => {
            setError(false)
            setStep('create')
            setFirstPin('')
          }, 1500)
        }
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
  }, [digits, step, firstPin])

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
          <Dobrao mood={error ? 'sad' : step === 'confirm' ? 'celebrating' : 'happy'} size={84} />
        </motion.div>
      </div>

      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 6, width: '100%' }}>
        <IconShieldLock size={18} stroke={2} color="#C4553B" />
        <h1 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700, color: '#2C1A0F', textAlign: 'center', margin: 0, letterSpacing: '-0.4px' }}>
          {step === 'create' ? 'Crie seu PIN' : 'Confirme o PIN'}
        </h1>
      </div>
      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#7A5C4F', textAlign: 'center', marginBottom: 22, lineHeight: 1.5 }}>
        {step === 'create'
          ? `4 dígitos pra proteger o app neste dispositivo`
          : 'Digite o PIN novamente pra confirmar'}
        {email && step === 'create' && (
          <><br/><span style={{ color: '#9B7B6A', fontSize: 11 }}>Conta: {email}</span></>
        )}
      </p>

      {/* PIN dots */}
      <motion.div
        animate={shake ? { x: [-12, 12, -10, 10, -6, 6, 0] } : { x: 0 }}
        transition={{ duration: 0.5 }}
        style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 24 }}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <motion.div key={i}
            animate={i < digits.length
              ? { scale: [1, 1.3, 1], backgroundColor: error ? '#C4553B' : '#3A8580' }
              : { scale: 1, backgroundColor: '#EDE6DC' }}
            transition={{ duration: 0.2 }}
            style={{ width: 14, height: 14, borderRadius: '50%' }}
          />
        ))}
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#C4553B', fontWeight: 600, textAlign: 'center', marginBottom: 12 }}>
            PINs não coincidem. Vamos de novo.
          </motion.p>
        )}
      </AnimatePresence>

      {/* Keypad */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {KEYS.map((key, i) => (
          <motion.button key={i}
            whileTap={key !== '' ? { scale: 0.88 } : undefined}
            onClick={() => key !== '' && handleKey(String(key))}
            style={{
              height: 60, borderRadius: 14, border: 'none',
              cursor: key !== '' ? 'pointer' : 'default',
              background: key === '⌫' ? '#FEE2DC' : key === '' ? 'transparent' : '#FFFFFF',
              boxShadow: key !== '' && key !== '⌫' ? '0 2px 8px rgba(44,26,15,0.08)' : 'none',
              fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700,
              color: key === '⌫' ? '#C4553B' : '#2C1A0F',
            }}>
            {key}
          </motion.button>
        ))}
      </div>

      <button onClick={() => signOut()}
        style={{
          width: '100%', marginTop: 18, padding: '10px 0',
          background: 'transparent', border: 'none',
          fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600,
          color: '#9B7B6A', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
        }}>
        <IconLogout size={13} stroke={2} /> Usar outra conta
      </button>
    </>
  )
}

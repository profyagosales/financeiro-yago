// ─── CreatePinScreen ────────────────────────────────────────────────
// Mostrada quando user tem sessão Supabase mas ainda não tem PIN local
// nesse device. Pede pra criar PIN de 4 dígitos + confirmação.

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconShieldLock, IconLogout, IconArrowLeft } from '@tabler/icons-react'
import { useAuthStore } from '@/store/auth'
import { sounds, haptic } from '@/lib/sounds'
import { AuthHeader } from './AuthHeader'

const KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫']
const PIN_LENGTH = 4

type Step = 'create' | 'confirm'

export function CreatePinScreen() {
  const [step, setStep] = useState<Step>('create')
  const [firstPin, setFirstPin] = useState('')
  const [digits, setDigits] = useState<string[]>([])
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)
  const { setPin, email, signOut } = useAuthStore()

  const handleKey = useCallback((k: string) => {
    if (k === '⌫') {
      haptic('light')
      setDigits(d => d.slice(0, -1))
      return
    }
    if (!k) return
    setDigits(d => {
      if (d.length >= PIN_LENGTH) return d
      sounds.pin_digit()
      haptic('light')
      const next = [...d, k]
      if (next.length === PIN_LENGTH) {
        if (step === 'create') {
          setFirstPin(next.join(''))
          setTimeout(() => { setStep('confirm'); setDigits([]) }, 220)
        } else {
          if (next.join('') === firstPin) {
            sounds.success(); haptic('medium')
            setPin(firstPin)
          } else {
            sounds.error(); haptic('heavy')
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
      return next
    })
  }, [step, firstPin, setPin])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') handleKey(e.key)
      if (e.key === 'Backspace') handleKey('⌫')
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [handleKey])

  const goBack = () => {
    setStep('create')
    setFirstPin('')
    setDigits([])
    setError(false)
  }

  return (
    <>
      <AuthHeader
        eyebrow={step === 'create' ? 'Quase lá' : 'Confirme'}
        title={step === 'create' ? 'Crie um PIN local' : 'Confirme seu PIN'}
        subtitle={
          step === 'create'
            ? <>4 dígitos pra proteger o app <strong style={{ color: '#7A5C4F' }}>neste dispositivo</strong>. {email && <><br /><span style={{ color: '#9B7B6A', fontSize: 11.5 }}>Conta: {email}</span></>}</>
            : <>Digite novamente o PIN que você acabou de criar.</>
        }
      />

      {/* Indicador de etapa 1/2 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 18,
      }}>
        <StepDot active={step === 'create'} done={step === 'confirm'} />
        <div style={{ width: 24, height: 1, background: step === 'confirm' ? '#3A8580' : '#EDE6DC' }} />
        <StepDot active={step === 'confirm'} done={false} />
      </div>

      {/* PIN dots */}
      <motion.div
        animate={shake ? { x: [-12, 12, -10, 10, -6, 6, 0] } : { x: 0 }}
        transition={{ duration: 0.5 }}
        style={{ display: 'flex', justifyContent: 'center', gap: 14, marginBottom: 26 }}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => {
          const filled = i < digits.length
          const bg = error ? '#C4553B' : step === 'confirm' ? '#3A8580' : '#504E76'
          return (
            <motion.div key={i}
              animate={filled
                ? { scale: [1, 1.35, 1], background: bg, borderColor: bg }
                : { scale: 1, background: 'transparent', borderColor: '#EDE6DC' }}
              transition={{ duration: 0.22 }}
              style={{
                width: 16, height: 16, borderRadius: '50%',
                border: '2px solid',
                boxShadow: filled ? `0 4px 12px ${bg}66` : 'none',
              }}
            />
          )
        })}
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 12.5, fontWeight: 700, color: '#A8442B',
              textAlign: 'center', margin: '0 0 16px',
            }}>
            PINs não coincidem. Vamos de novo.
          </motion.p>
        )}
      </AnimatePresence>

      {/* Keypad */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {KEYS.map((key, i) => (
          <KeypadButton key={i} k={key} onClick={() => key !== '' && handleKey(key)} />
        ))}
      </div>

      {/* Bottom actions */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 20, paddingTop: 16, borderTop: '1px dashed #EDE6DC',
      }}>
        {step === 'confirm' ? (
          <button onClick={goBack}
            style={ACTION_BTN}>
            <IconArrowLeft size={13} stroke={2.2} /> Refazer PIN
          </button>
        ) : (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#7A5C4F' }}>
            <IconShieldLock size={13} stroke={2} />
            <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600 }}>
              PIN fica só no seu device
            </span>
          </div>
        )}
        <button onClick={() => signOut()}
          style={ACTION_BTN}>
          <IconLogout size={13} stroke={2} /> Trocar conta
        </button>
      </div>
    </>
  )
}

// ─── Atoms ──────────────────────────────────────────────────────────

function StepDot({ active, done }: { active: boolean; done: boolean }) {
  return (
    <motion.div
      animate={{
        scale: active ? 1.15 : 1,
        background: done ? '#3A8580' : active ? '#2A1E3F' : '#EDE6DC',
      }}
      transition={{ duration: 0.2 }}
      style={{
        width: 8, height: 8, borderRadius: '50%',
      }}
    />
  )
}

function KeypadButton({ k, onClick }: { k: string; onClick: () => void }) {
  if (k === '') return <div />
  const isBack = k === '⌫'
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      style={{
        height: 60, borderRadius: 14, border: 'none',
        cursor: 'pointer',
        background: isBack ? 'rgba(196,85,59,0.08)' : '#FFFFFF',
        boxShadow: isBack ? 'none' : '0 1px 2px rgba(44,26,15,0.06), 0 4px 10px rgba(44,26,15,0.06)',
        fontFamily: "'Fraunces',Georgia,serif",
        fontSize: 22, fontWeight: 700,
        color: isBack ? '#A8442B' : '#2C1A0F',
        transition: 'box-shadow .15s',
      }}>
      {k}
    </motion.button>
  )
}

const ACTION_BTN: React.CSSProperties = {
  background: 'transparent', border: 'none', cursor: 'pointer',
  fontFamily: "'Plus Jakarta Sans',sans-serif",
  fontSize: 11.5, fontWeight: 600, color: '#7A5C4F',
  display: 'inline-flex', alignItems: 'center', gap: 5,
  padding: '6px 4px',
}

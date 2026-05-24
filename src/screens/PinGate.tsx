// ─── PinGate ────────────────────────────────────────────────────────
// Mostrada quando user tem sessão Supabase + PIN local já definido.
// Pede PIN pra desbloquear. "Esqueci o PIN" leva pra reset (logout).

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconShieldCheck, IconAlertTriangle } from '@tabler/icons-react'
import { useAuthStore } from '@/store/auth'
import { useDisplayName } from '@/db/hooks/useAppConfig'
import { sounds, haptic } from '@/lib/sounds'
import { AuthHeader } from './AuthHeader'

const KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫']
const PIN_LENGTH = 4

export function PinGate() {
  const [digits, setDigits] = useState<string[]>([])
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)
  const [unlocking, setUnlocking] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const { unlock, signOut, email } = useAuthStore()
  const displayName = useDisplayName()

  const handleKey = useCallback(async (k: string) => {
    if (k === '⌫') {
      haptic('light')
      setDigits(d => d.slice(0, -1))
      return
    }
    if (!k) return
    if (unlocking) return

    const cur = digits
    if (cur.length >= PIN_LENGTH) return
    sounds.pin_digit()
    haptic('light')
    const next = [...cur, k]
    setDigits(next)

    if (next.length === PIN_LENGTH) {
      setUnlocking(true)
      const ok = await unlock(next.join(''))
      if (!ok) {
        sounds.error(); haptic('heavy')
        setShake(true); setError(true)
        setTimeout(() => { setShake(false); setDigits([]); setUnlocking(false) }, 700)
        setTimeout(() => setError(false), 2500)
      } else {
        sounds.success(); haptic('medium')
        // Vai pro app — AuthFlow desmonta
      }
    }
  }, [digits, unlock, unlocking])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') handleKey(e.key)
      if (e.key === 'Backspace') handleKey('⌫')
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [handleKey])

  const greeting = displayName ? `Oi, ${displayName}` : 'Bem-vindo de volta'

  return (
    <>
      <AuthHeader
        eyebrow={greeting}
        title="Digite seu PIN"
        subtitle={email && (
          <span style={{ color: '#9B7B6A' }}>
            Conta: <strong style={{ color: '#7A5C4F' }}>{email}</strong>
          </span>
        )}
      />

      {/* PIN dots */}
      <motion.div
        animate={shake ? { x: [-12, 12, -10, 10, -6, 6, 0] } : { x: 0 }}
        transition={{ duration: 0.5 }}
        style={{ display: 'flex', justifyContent: 'center', gap: 14, marginBottom: 22 }}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => {
          const filled = i < digits.length
          const bg = error ? '#C4553B' : '#504E76'
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
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              margin: '-4px 0 14px',
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 12.5, fontWeight: 700, color: '#A8442B',
            }}>
            <IconAlertTriangle size={13} stroke={2.4} />
            PIN incorreto. Tente de novo.
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keypad */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {KEYS.map((key, i) => (
          <KeypadButton key={i} k={key} onClick={() => key !== '' && handleKey(key)} disabled={unlocking} />
        ))}
      </div>

      {/* Bottom row */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 18, paddingTop: 14, borderTop: '1px dashed #EDE6DC',
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#7A5C4F' }}>
          <IconShieldCheck size={13} stroke={2} />
          <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600 }}>
            Protegido neste device
          </span>
        </div>
        <button onClick={() => setConfirmReset(true)}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 11.5, fontWeight: 600, color: '#7A5C4F',
            padding: '6px 4px',
          }}>
          Esqueci o PIN
        </button>
      </div>

      {/* Confirm reset overlay */}
      <AnimatePresence>
        {confirmReset && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setConfirmReset(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 500,
              background: 'rgba(13,5,25,0.6)', backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
            }}>
            <motion.div
              initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 24 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: '#FFFFFF', borderRadius: 22,
                padding: '26px 24px', maxWidth: 360, width: '100%',
                textAlign: 'center',
                boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
              }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14, margin: '0 auto 14px',
                background: 'rgba(196,85,59,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <IconAlertTriangle size={22} stroke={2} color="#A8442B" />
              </div>
              <p style={{
                fontFamily: "'Fraunces',Georgia,serif",
                fontSize: 20, fontWeight: 700, color: '#2C1A0F',
                margin: '0 0 8px', letterSpacing: '-0.3px',
              }}>
                Esqueceu o PIN?
              </p>
              <p style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontSize: 13, color: '#7A5C4F', margin: '0 0 20px', lineHeight: 1.55,
              }}>
                Vamos sair da sua conta neste device. Depois você faz login de novo com email + senha e cria um novo PIN.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setConfirmReset(false)}
                  style={{
                    flex: 1, padding: '11px 0', borderRadius: 11,
                    border: '1.5px solid #E8E0D5', background: '#FFFFFF',
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                    fontSize: 13, fontWeight: 700, color: '#7A5C4F', cursor: 'pointer',
                  }}>
                  Cancelar
                </button>
                <button onClick={() => signOut()}
                  style={{
                    flex: 1, padding: '11px 0', borderRadius: 11, border: 'none',
                    background: 'linear-gradient(135deg, #C4553B, #A8442B)',
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                    fontSize: 13, fontWeight: 700, color: '#FFFFFF', cursor: 'pointer',
                    boxShadow: '0 6px 16px rgba(196,85,59,0.4)',
                  }}>
                  Sair e resetar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ─── Keypad button ──────────────────────────────────────────────────

function KeypadButton({ k, onClick, disabled }: { k: string; onClick: () => void; disabled?: boolean }) {
  if (k === '') return <div />
  const isBack = k === '⌫'
  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.03 } : undefined}
      whileTap={!disabled ? { scale: 0.92 } : undefined}
      onClick={onClick}
      disabled={disabled}
      style={{
        height: 64, borderRadius: 16, border: 'none',
        cursor: disabled ? 'default' : 'pointer',
        background: isBack ? 'rgba(196,85,59,0.08)' : '#FFFFFF',
        boxShadow: isBack ? 'none' : '0 1px 2px rgba(44,26,15,0.06), 0 4px 10px rgba(44,26,15,0.06)',
        fontFamily: "'Fraunces',Georgia,serif",
        fontSize: 24, fontWeight: 700,
        color: isBack ? '#A8442B' : '#2C1A0F',
        opacity: disabled ? 0.5 : 1,
        transition: 'box-shadow .15s, opacity .15s',
      }}>
      {k}
    </motion.button>
  )
}

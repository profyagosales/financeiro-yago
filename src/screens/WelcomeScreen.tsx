// ─── WelcomeScreen ──────────────────────────────────────────────────
// Tela de entrada do app: login com email + senha (sign in / sign up).
// Identidade visual nova com Logo FY institucional.

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  IconMail, IconLock, IconArrowRight, IconEye, IconEyeOff,
  IconAlertCircle, IconCircleCheck, IconShieldLock,
} from '@tabler/icons-react'
import { signInWithPassword, signUpWithPassword } from '@/lib/auth'
import { AuthBackground, AuthCard } from './AuthBackground'
import { AuthHeader } from './AuthHeader'

type Mode = 'login' | 'signup'

export function WelcomeScreen() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const minLen = mode === 'signup' ? 8 : 6
  const canSubmit = !!email && password.length >= minLen && !sending

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setError(null); setInfo(null)
    setSending(true)
    try {
      if (mode === 'login') {
        const r = await signInWithPassword(email, password)
        if (!r.ok) setError(r.error ?? 'Erro ao entrar')
      } else {
        const r = await signUpWithPassword(email, password)
        if (!r.ok) setError(r.error ?? 'Erro ao criar conta')
        else if (r.needsConfirmation) {
          setInfo('Conta criada! Verifique seu email pra confirmar e depois faça login.')
          setMode('login')
        }
      }
    } finally {
      setSending(false)
    }
  }

  const switchMode = () => {
    setMode(m => m === 'login' ? 'signup' : 'login')
    setError(null); setInfo(null)
  }

  return (
    <>
      <AuthBackground />
      <AuthCard>
        <AuthHeader
          eyebrow={mode === 'login' ? 'Bem-vindo de volta' : 'Comece agora'}
          title={mode === 'login' ? 'Entre na sua conta' : 'Criar nova conta'}
          subtitle={mode === 'login'
            ? 'Email e senha pra identificar a conta. PIN local protege o app no dia-a-dia.'
            : 'Defina email e senha. Você só usa em devices novos — depois é só PIN.'}
        />

        <form onSubmit={handleSubmit} noValidate>
          {/* Email */}
          <Field label="Email">
            <IconMail size={16} stroke={2} color="#9B7B6A" />
            <input
              type="email"
              autoFocus
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              autoComplete="email"
              inputMode="email"
              style={INPUT}
            />
          </Field>

          {/* Senha */}
          <Field label="Senha" hint={mode === 'signup' ? 'Mínimo 8 caracteres' : undefined}>
            <IconLock size={16} stroke={2} color="#9B7B6A" />
            <input
              type={showPass ? 'text' : 'password'}
              required
              minLength={minLen}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'crie uma senha forte' : 'sua senha'}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              style={INPUT}
            />
            <button type="button" onClick={() => setShowPass(s => !s)}
              aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}
              style={IGHOST}>
              {showPass ? <IconEyeOff size={15} stroke={2} color="#9B7B6A" />
                         : <IconEye size={15} stroke={2} color="#9B7B6A" />}
            </button>
          </Field>

          {/* Feedback */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div key="err"
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={FEEDBACK_BOX('error')}>
                <IconAlertCircle size={14} stroke={2} color="#A8442B" style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </motion.div>
            )}
            {info && (
              <motion.div key="info"
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={FEEDBACK_BOX('success')}>
                <IconCircleCheck size={14} stroke={2.4} color="#1E7D5A" style={{ flexShrink: 0 }} />
                <span>{info}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit */}
          <motion.button type="submit"
            whileHover={canSubmit ? { y: -1 } : undefined}
            whileTap={canSubmit ? { scale: 0.98 } : undefined}
            disabled={!canSubmit}
            style={{
              width: '100%', marginTop: 18, padding: '14px 0',
              border: 'none', borderRadius: 14,
              background: !canSubmit
                ? '#E8E0D5'
                : 'linear-gradient(135deg, #2A1E3F, #504E76)',
              color: !canSubmit ? '#9B7B6A' : '#FFFFFF',
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 14, fontWeight: 700, letterSpacing: '.01em',
              cursor: !canSubmit ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: !canSubmit ? 'none' : '0 10px 28px rgba(42,30,63,0.45)',
              transition: 'box-shadow .15s, background .15s',
            }}>
            {sending ? (mode === 'login' ? 'Entrando…' : 'Criando…') : (
              <>{mode === 'login' ? 'Entrar' : 'Criar conta'} <IconArrowRight size={16} stroke={2.4} /></>
            )}
          </motion.button>
        </form>

        {/* Switch mode */}
        <button type="button" onClick={switchMode}
          style={{
            width: '100%', background: 'transparent', border: 'none', cursor: 'pointer',
            marginTop: 12, padding: 8,
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 12.5, color: '#7A5C4F', fontWeight: 500,
          }}>
          {mode === 'login' ? (
            <>Ainda não tem conta? <strong style={{ color: '#C4553B' }}>Criar conta →</strong></>
          ) : (
            <>Já tem conta? <strong style={{ color: '#C4553B' }}>Entrar →</strong></>
          )}
        </button>

        {/* Trust line */}
        <div style={{
          marginTop: 18, paddingTop: 16,
          borderTop: '1px dashed #EDE6DC',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <IconShieldLock size={12} stroke={2} color="#7A5C4F" />
          <p style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 10.5, color: '#9B7B6A', textAlign: 'center',
            margin: 0, lineHeight: 1.5, fontWeight: 500,
          }}>
            Dados <strong style={{ color: '#7A5C4F' }}>criptografados no dispositivo</strong> · sync seguro entre devices
          </p>
        </div>
      </AuthCard>
    </>
  )
}

// ─── Atoms ──────────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 5,
      }}>
        <label style={LABEL}>{label}</label>
        {hint && (
          <span style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 10, color: '#9B7B6A', fontWeight: 500,
          }}>{hint}</span>
        )}
      </div>
      <div style={BOX}>{children}</div>
    </div>
  )
}

const LABEL: React.CSSProperties = {
  display: 'block',
  fontFamily: "'Plus Jakarta Sans',sans-serif",
  fontSize: 10, fontWeight: 700,
  color: '#7A5C4F', letterSpacing: '.12em', textTransform: 'uppercase',
}

const BOX: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8,
  background: '#FFFFFF',
  border: '1.5px solid #EDE6DC',
  borderRadius: 12,
  padding: '12px 14px',
  transition: 'border-color .15s, box-shadow .15s',
}

const INPUT: React.CSSProperties = {
  flex: 1, border: 'none', outline: 'none', background: 'transparent',
  fontFamily: "'Plus Jakarta Sans',sans-serif",
  // 16px é o mínimo pra evitar auto-zoom do iOS Safari em campos.
  fontSize: 16, fontWeight: 500, color: '#2C1A0F',
  minWidth: 0,
}

const IGHOST: React.CSSProperties = {
  background: 'transparent', border: 'none', cursor: 'pointer',
  padding: 4, display: 'flex', alignItems: 'center',
}

function FEEDBACK_BOX(kind: 'error' | 'success'): React.CSSProperties {
  const isErr = kind === 'error'
  return {
    display: 'flex', alignItems: 'flex-start', gap: 8,
    marginTop: 12, padding: '10px 12px',
    background: isErr ? 'rgba(196,85,59,0.08)' : 'rgba(58,133,128,0.08)',
    border: `1px solid ${isErr ? 'rgba(196,85,59,0.25)' : 'rgba(58,133,128,0.25)'}`,
    borderRadius: 10,
    fontFamily: "'Plus Jakarta Sans',sans-serif",
    fontSize: 12.5, fontWeight: 600,
    color: isErr ? '#A8442B' : '#1E5944',
    lineHeight: 1.4,
  }
}

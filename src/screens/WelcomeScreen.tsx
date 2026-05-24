import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Dobrao } from '@/components/mascot/Dobrao'
import { IconMail, IconArrowRight, IconLock, IconEye, IconEyeOff } from '@tabler/icons-react'
import { signInWithPassword, signUpWithPassword } from '@/lib/auth'
import { AuthBackground, AuthCard } from './AuthBackground'

// ─── Welcome screen ──────────────────────────────────────────────────
// Login com email + senha. Modo "Entrar" (default) e "Criar conta".
// Após sucesso, AuthFlow redireciona pro próximo passo (CreatePin / PinGate).
// Não há dependência de email/SMTP — direto via Supabase Auth.

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
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
            <Dobrao mood="waving" size={88} />
          </motion.div>
        </div>

        <h1 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 26, fontWeight: 700, color: '#2C1A0F', textAlign: 'center', marginBottom: 6, letterSpacing: '-0.5px' }}>
          {mode === 'login' ? 'Bem-vindo' : 'Criar conta'}
        </h1>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#7A5C4F', textAlign: 'center', marginBottom: 24, lineHeight: 1.5 }}>
          {mode === 'login'
            ? 'Entre com seu email e senha. PIN local protege o app no dia-a-dia.'
            : 'Defina email e senha. Você só usa em devices novos — depois é só PIN.'}
        </p>

        <form onSubmit={handleSubmit}>
          {/* Email */}
          <label style={LABEL_STYLE}>Email</label>
          <div style={INPUT_BOX}>
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
              style={INPUT_STYLE}
            />
          </div>

          {/* Senha */}
          <label style={{ ...LABEL_STYLE, marginTop: 10 }}>Senha</label>
          <div style={INPUT_BOX}>
            <IconLock size={16} stroke={2} color="#9B7B6A" />
            <input
              type={showPass ? 'text' : 'password'}
              required
              minLength={minLen}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'mínimo 8 caracteres' : 'sua senha'}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              style={INPUT_STYLE}
            />
            <button type="button" onClick={() => setShowPass(s => !s)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
              {showPass ? <IconEyeOff size={15} stroke={2} color="#9B7B6A" /> : <IconEye size={15} stroke={2} color="#9B7B6A" />}
            </button>
          </div>

          <AnimatePresence>
            {error && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#C4553B', fontWeight: 600, margin: '10px 0 0', textAlign: 'center' }}>
                {error}
              </motion.p>
            )}
            {info && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#1E7D5A', fontWeight: 600, margin: '10px 0 0', textAlign: 'center' }}>
                {info}
              </motion.p>
            )}
          </AnimatePresence>

          <motion.button type="submit"
            whileTap={canSubmit ? { scale: 0.97 } : undefined}
            disabled={!canSubmit}
            style={{
              width: '100%', padding: '14px 0', border: 'none', borderRadius: 14, marginTop: 16,
              background: !canSubmit ? '#E8E0D5' : 'linear-gradient(135deg, #D4643A, #C4553B)',
              color: !canSubmit ? '#9B7B6A' : '#FFFFFF',
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 700,
              cursor: !canSubmit ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: !canSubmit ? 'none' : '0 4px 16px rgba(196,85,59,0.35)',
            }}>
            {sending ? (mode === 'login' ? 'Entrando…' : 'Criando…') : (
              <>{mode === 'login' ? 'Entrar' : 'Criar conta'} <IconArrowRight size={16} stroke={2.4} /></>
            )}
          </motion.button>
        </form>

        <button type="button" onClick={switchMode}
          style={{
            width: '100%', background: 'transparent', border: 'none', cursor: 'pointer',
            marginTop: 14, padding: 6,
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#7A5C4F',
          }}>
          {mode === 'login' ? (
            <>Ainda não tem conta? <strong style={{ color: '#C4553B' }}>Criar conta</strong></>
          ) : (
            <>Já tem conta? <strong style={{ color: '#C4553B' }}>Entrar</strong></>
          )}
        </button>

        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#9B7B6A', textAlign: 'center', marginTop: 14, lineHeight: 1.5 }}>
          Seus dados ficam <strong>criptografados no seu dispositivo</strong>.<br/>
          Email + senha servem só pra identificar a conta e sincronizar entre devices.
        </p>
      </AuthCard>
    </>
  )
}

const LABEL_STYLE: React.CSSProperties = {
  display: 'block', marginBottom: 6,
  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700,
  color: '#7A5C4F', letterSpacing: '.1em', textTransform: 'uppercase',
}

const INPUT_BOX: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8,
  background: '#FFFFFF', border: '1.5px solid #EDE6DC',
  borderRadius: 12, padding: '12px 14px',
}

const INPUT_STYLE: React.CSSProperties = {
  flex: 1, border: 'none', outline: 'none', background: 'transparent',
  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 500, color: '#2C1A0F',
  minWidth: 0,
}

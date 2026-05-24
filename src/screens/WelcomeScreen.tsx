import { useState } from 'react'
import { motion } from 'framer-motion'
import { Dobrao } from '@/components/mascot/Dobrao'
import { IconMail, IconArrowRight, IconCircleCheck } from '@tabler/icons-react'
import { sendMagicLink } from '@/lib/auth'
import { AuthBackground, AuthCard } from './AuthBackground'

// ─── Welcome screen ──────────────────────────────────────────────────
// Pede email → envia magic link → mostra tela de "verifique seu email".
// Quando user clica no link, Supabase auth state muda e o AuthFlow
// redireciona pro próximo passo (CreatePin ou PinGate).

export function WelcomeScreen() {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setError(null)
    setSending(true)
    const r = await sendMagicLink(email)
    setSending(false)
    if (r.ok) setSent(true)
    else setError(r.error ?? 'Erro ao enviar')
  }

  return (
    <>
      <AuthBackground />
      <AuthCard>
        {!sent ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
                <Dobrao mood="waving" size={88} />
              </motion.div>
            </div>

            <h1 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 26, fontWeight: 700, color: '#2C1A0F', textAlign: 'center', marginBottom: 6, letterSpacing: '-0.5px' }}>
              Bem-vindo
            </h1>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#7A5C4F', textAlign: 'center', marginBottom: 28, lineHeight: 1.5 }}>
              Digite seu email para entrar. Enviamos um link de acesso — sem senha pra lembrar.
            </p>

            <form onSubmit={handleSend}>
              <label style={{ display: 'block', marginBottom: 6, fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: '#7A5C4F', letterSpacing: '.1em', textTransform: 'uppercase' }}>
                Email
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FFFFFF', border: '1.5px solid #EDE6DC', borderRadius: 12, padding: '12px 14px', marginBottom: 12 }}>
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
                  style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 500, color: '#2C1A0F' }}
                />
              </div>

              {error && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#C4553B', fontWeight: 600, marginBottom: 12, textAlign: 'center' }}>
                  {error}
                </motion.p>
              )}

              <motion.button type="submit"
                whileTap={!sending && email ? { scale: 0.97 } : undefined}
                disabled={sending || !email}
                style={{
                  width: '100%', padding: '14px 0', border: 'none', borderRadius: 14,
                  background: sending || !email ? '#E8E0D5' : 'linear-gradient(135deg, #D4643A, #C4553B)',
                  color: sending || !email ? '#9B7B6A' : '#FFFFFF',
                  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 700,
                  cursor: sending || !email ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: sending || !email ? 'none' : '0 4px 16px rgba(196,85,59,0.35)',
                }}>
                {sending ? 'Enviando…' : (<>Enviar link de acesso <IconArrowRight size={16} stroke={2.4} /></>)}
              </motion.button>
            </form>

            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#9B7B6A', textAlign: 'center', marginTop: 18, lineHeight: 1.5 }}>
              Seus dados ficam <strong>criptografados no seu dispositivo</strong>.<br/>
              Email serve só pra identificar a conta e sincronizar entre devices.
            </p>
          </>
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
              <div style={{ width: 80, height: 80, borderRadius: 24, background: 'rgba(58,133,128,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconCircleCheck size={42} stroke={2} color="#1E7D5A" />
              </div>
            </div>
            <h1 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 24, fontWeight: 700, color: '#2C1A0F', textAlign: 'center', marginBottom: 8, letterSpacing: '-0.5px' }}>
              Verifique seu email
            </h1>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#7A5C4F', textAlign: 'center', marginBottom: 18, lineHeight: 1.6 }}>
              Enviamos um link de acesso para<br/>
              <strong style={{ color: '#2C1A0F' }}>{email}</strong>
            </p>
            <div style={{ background: 'rgba(212,160,23,0.1)', border: '1px solid rgba(212,160,23,0.25)', borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#A8730F', margin: 0, lineHeight: 1.5 }}>
                <strong>Importante:</strong> abra o link no <strong>mesmo dispositivo</strong> em que você está agora.
                Se não chegar em 1-2 min, confere a caixa de spam ou tente outro email.
              </p>
            </div>
            <button onClick={() => { setSent(false); setError(null) }}
              style={{ width: '100%', padding: '11px 0', background: 'transparent', border: '1.5px solid #EDE6DC', borderRadius: 12, fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 600, color: '#7A5C4F', cursor: 'pointer' }}>
              Usar outro email
            </button>
          </motion.div>
        )}
      </AuthCard>
    </>
  )
}

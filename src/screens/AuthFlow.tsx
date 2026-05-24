import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/auth'
import { AuthBackground, AuthCard } from './AuthBackground'
import { WelcomeScreen } from './WelcomeScreen'
import { CreatePinScreen } from './CreatePinScreen'
import { PinGate } from './PinGate'

// ─── AuthFlow ────────────────────────────────────────────────────────
// Orquestra as 3 telas de autenticação baseado no estado da auth store:
//   - loading           → spinner
//   - sem sessão        → WelcomeScreen (email + magic link)
//   - sessão sem PIN    → CreatePinScreen (define PIN local)
//   - sessão + PIN      → PinGate (digite PIN)
//   - tudo OK           → children (app)

export function AuthFlow({ children }: { children: React.ReactNode }) {
  const { loading, hasSession, hasPin, isUnlocked, init } = useAuthStore()

  useEffect(() => { init() }, [init])

  // App liberado
  if (!loading && hasSession && hasPin && isUnlocked) {
    return <>{children}</>
  }

  // Loading inicial
  if (loading) {
    return (
      <>
        <AuthBackground />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            style={{ width: 32, height: 32, border: '3px solid rgba(196,85,59,0.2)', borderTopColor: '#C4553B', borderRadius: '50%' }}
          />
        </div>
      </>
    )
  }

  // Sem sessão Supabase: tela de boas-vindas com magic link
  if (!hasSession) {
    return <WelcomeScreen />
  }

  // Tem sessão mas falta PIN neste dispositivo
  if (!hasPin) {
    return (
      <>
        <AuthBackground />
        <AuthCard>
          <CreatePinScreen />
        </AuthCard>
      </>
    )
  }

  // Tem sessão + PIN, mas precisa desbloquear
  return (
    <>
      <AuthBackground />
      <AuthCard>
        <PinGate />
      </AuthCard>
    </>
  )
}

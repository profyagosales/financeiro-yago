// ─── AuthFlow ────────────────────────────────────────────────────────
// Orquestra as 3 telas de autenticação baseado no estado da auth store:
//   - loading           → splash com mark FY
//   - sem sessão        → WelcomeScreen (email + senha)
//   - sessão sem PIN    → CreatePinScreen
//   - sessão + PIN      → PinGate
//   - tudo OK           → children (app)

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/auth'
import { AuthBackground, AuthCard } from './AuthBackground'
import { WelcomeScreen } from './WelcomeScreen'
import { CreatePinScreen } from './CreatePinScreen'
import { PinGate } from './PinGate'
import { Logo } from '@/components/brand'

export function AuthFlow({ children }: { children: React.ReactNode }) {
  const { loading, hasSession, hasPin, isUnlocked, init } = useAuthStore()

  useEffect(() => { init() }, [init])

  if (!loading && hasSession && hasPin && isUnlocked) return <>{children}</>

  if (loading) {
    return (
      <>
        <AuthBackground />
        <div style={{
          position: 'relative', zIndex: 1,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: '100dvh', gap: 20,
        }}>
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          >
            <Logo variant="mark" size={72} />
          </motion.div>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            style={{
              width: 26, height: 26,
              border: '2.5px solid rgba(242,199,69,0.18)',
              borderTopColor: '#F2C745',
              borderRadius: '50%',
            }}
          />
        </div>
      </>
    )
  }

  if (!hasSession) return <WelcomeScreen />

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

  return (
    <>
      <AuthBackground />
      <AuthCard>
        <PinGate />
      </AuthCard>
    </>
  )
}

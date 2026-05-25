// ─── AuthFlow ────────────────────────────────────────────────────────
// Orquestra as 3 telas de autenticação baseado no estado da auth store:
//   - loading           → splash com mark FY
//   - sem sessão        → WelcomeScreen (email + senha)
//   - sessão sem PIN    → CreatePinScreen
//   - sessão + PIN      → PinGate
//   - tudo OK           → children (app)

import { useEffect } from 'react'
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
    // R12i: SEM framer-motion no splash. spinner é CSS pura (animação leve).
    return (
      <>
        <AuthBackground />
        <div style={{
          position: 'relative', zIndex: 1,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: '100dvh', gap: 20,
        }}>
          <Logo variant="mark" size={72} />
          <div
            style={{
              width: 26, height: 26,
              border: '2.5px solid rgba(242,199,69,0.18)',
              borderTopColor: '#F2C745',
              borderRadius: '50%',
              animation: 'fy-splash-spin 1s linear infinite',
            }}
          />
          <style>{`@keyframes fy-splash-spin{to{transform:rotate(360deg)}}`}</style>
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

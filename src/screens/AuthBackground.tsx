// ─── Fundo das telas de autenticação ────────────────────────────────
// R12i: TUDO ESTÁTICO. Orbs animados infinitos (4 motion.div com blur
// grande) eram um dos culpados da tela branca de 5-10s no boot. PWA
// Safari iOS desabilita JIT — parse de framer-motion + 4 orbs animando
// simultâneo destruía perf. Gradient + orbs estáticos preservam estilo.

import type { ReactNode } from 'react'

export function AuthBackground() {
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed', inset: 0, zIndex: 0,
        // Gradiente já cobre 95% do estilo visual sem custo de animação
        background: `
          radial-gradient(circle at 78% -8%, rgba(212,160,23,0.18), transparent 35%),
          radial-gradient(circle at -6% 58%, rgba(196,85,59,0.14), transparent 40%),
          radial-gradient(circle at 50% 88%, rgba(80,78,118,0.24), transparent 45%),
          radial-gradient(circle at 25% 15%, #3A2D54 0%, #2A1E3F 38%, #1A1228 100%)
        `,
        overflow: 'hidden',
      }}
    >
      {/* Vinheta sutil pra puxar foco pro centro */}
      <div
        style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(circle at 50% 50%, transparent 30%, rgba(0,0,0,0.32) 100%)',
        }}
      />
    </div>
  )
}

// ─── AuthCard: vidro premium centralizado ───────────────────────────
// Layout pattern: margin auto pra centrar quando cabe + anchor topo
// quando estoura (keyboard aberto, iPhone SE, etc.). Safe-area top/bot
// respeitados via max(clamp, env) — não cola no notch/home-indicator.
export function AuthCard({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  // R12i: motion.div substituído por <div> puro. Spring scale+y no mount
  // era ~250ms de animation block — perceptível em devices lentos.
  return (
    <div style={{
      position: 'relative', zIndex: 1,
      display: 'flex',
      minHeight: '100dvh',
      paddingTop: 'max(clamp(16px, 4vw, 32px), env(safe-area-inset-top))',
      paddingBottom: 'max(clamp(16px, 4vw, 32px), env(safe-area-inset-bottom))',
      paddingLeft: 'clamp(16px, 4vw, 32px)',
      paddingRight: 'clamp(16px, 4vw, 32px)',
    }}>
      <div
        style={{
          position: 'relative',
          background: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: 28,
          padding: 'clamp(24px, 4vw, 36px) clamp(20px, 4vw, 32px)',
          width: '100%',
          maxWidth: wide ? 480 : 400,
          margin: 'auto',
          boxShadow:
            '0 24px 60px rgba(13,5,25,0.42), 0 6px 18px rgba(13,5,25,0.24), inset 0 1px 0 rgba(255,255,255,0.6)',
          border: '1px solid rgba(255,255,255,0.7)',
        }}
      >
        <div
          aria-hidden
          style={{
            position: 'absolute', top: 0, left: 24, right: 24, height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent)',
            borderRadius: 999,
          }}
        />
        {children}
      </div>
    </div>
  )
}

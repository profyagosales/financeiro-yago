// ─── Fundo das telas de autenticação ────────────────────────────────
// Gradient profundo roxo (mesmo do hero do Dashboard) + orbs decorativos
// + ruído sutil. AuthCard é o cartão "vidro" centralizado por cima.

import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

export function AuthBackground() {
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed', inset: 0, zIndex: 0,
        background: 'radial-gradient(circle at 25% 15%, #3A2D54 0%, #2A1E3F 38%, #1A1228 100%)',
        overflow: 'hidden',
      }}
    >
      {/* Orbs animados — paleta direta da marca */}
      <Orb left="78%" top="-8%"   size={520} color="rgba(212,160,23,0.32)" dur={22} delay={0} />
      <Orb left="-6%" top="58%"   size={460} color="rgba(196,85,59,0.22)"  dur={26} delay={3} />
      <Orb left="50%" top="88%"   size={620} color="rgba(80,78,118,0.36)"  dur={30} delay={6} />
      <Orb left="14%" top="12%"   size={300} color="rgba(242,199,69,0.16)" dur={18} delay={9} />

      {/* Ruído sutil (textura fina) */}
      <div
        style={{
          position: 'absolute', inset: 0,
          backgroundImage:
            'radial-gradient(rgba(255,255,255,0.02) 1px, transparent 1px)',
          backgroundSize: '3px 3px',
          mixBlendMode: 'overlay',
          opacity: 0.6,
        }}
      />

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

function Orb({ left, top, size, color, dur, delay }: {
  left: string; top: string; size: number; color: string; dur: number; delay: number
}) {
  return (
    <motion.div
      animate={{
        x: [0, 40, -28, 0],
        y: [0, -32, 22, 0],
        scale: [1, 1.06, 0.96, 1],
      }}
      transition={{ duration: dur, repeat: Infinity, ease: 'easeInOut', delay }}
      style={{
        position: 'absolute', left, top, width: size, height: size,
        borderRadius: '50%', background: color,
        filter: `blur(${Math.round(size / 2.6)}px)`,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
      }}
    />
  )
}

// ─── AuthCard: vidro premium centralizado ───────────────────────────
// Layout pattern: margin auto pra centrar quando cabe + anchor topo
// quando estoura (keyboard aberto, iPhone SE, etc.). Safe-area top/bot
// respeitados via max(clamp, env) — não cola no notch/home-indicator.
export function AuthCard({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
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
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 24 }}
        style={{
          position: 'relative',
          background: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: 28,
          padding: 'clamp(24px, 4vw, 36px) clamp(20px, 4vw, 32px)',
          width: '100%',
          maxWidth: wide ? 480 : 400,
          // Auto margins: centraliza quando cabe, anchor no topo se estoura
          margin: 'auto',
          boxShadow:
            '0 24px 60px rgba(13,5,25,0.42), 0 6px 18px rgba(13,5,25,0.24), inset 0 1px 0 rgba(255,255,255,0.6)',
          border: '1px solid rgba(255,255,255,0.7)',
        }}
      >
        {/* Highlight superior sutil — borda luminosa */}
        <div
          aria-hidden
          style={{
            position: 'absolute', top: 0, left: 24, right: 24, height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent)',
            borderRadius: 999,
          }}
        />
        {children}
      </motion.div>
    </div>
  )
}

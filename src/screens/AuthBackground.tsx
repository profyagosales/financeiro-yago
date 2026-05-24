import { motion } from 'framer-motion'

// Fundo animado compartilhado entre as telas de auth (Welcome, CreatePin, PinGate)
export function AuthBackground() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#FAF6F0', overflow: 'hidden', zIndex: 0 }}>
      <motion.div
        animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'absolute', left: '10%', top: '5%', width: 400, height: 400, borderRadius: '50%', background: 'rgba(196,85,59,0.08)', filter: 'blur(120px)' }}
      />
      <motion.div
        animate={{ x: [0, -30, 25, 0], y: [0, 20, -15, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        style={{ position: 'absolute', right: '5%', top: '30%', width: 350, height: 350, borderRadius: '50%', background: 'rgba(58,133,128,0.07)', filter: 'blur(100px)' }}
      />
      <motion.div
        animate={{ x: [0, 20, -30, 0], y: [0, -20, 25, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
        style={{ position: 'absolute', left: '40%', bottom: '10%', width: 300, height: 300, borderRadius: '50%', background: 'rgba(212,160,23,0.05)', filter: 'blur(90px)' }}
      />
    </div>
  )
}

export function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', padding: 24 }}>
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        style={{
          background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)',
          borderRadius: 32, padding: '40px 36px', width: '100%', maxWidth: 420,
          boxShadow: '0 20px 60px rgba(44,26,15,0.12), 0 4px 16px rgba(44,26,15,0.08)',
          border: '1px solid rgba(255,255,255,0.9)',
        }}>
        {children}
      </motion.div>
    </div>
  )
}

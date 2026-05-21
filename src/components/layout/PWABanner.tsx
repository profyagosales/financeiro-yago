import { motion, AnimatePresence } from 'framer-motion'
import { usePWAInstall } from '@/hooks/usePWAInstall'
export function PWABanner() {
  const { canInstall, install } = usePWAInstall()
  return (
    <AnimatePresence>
      {canInstall && (
        <motion.div initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -60, opacity: 0 }}
          style={{ position: 'fixed', top: 12, left: 12, right: 12, zIndex: 500, background: '#2C1A0F', borderRadius: 16, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>📱</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 14, fontWeight: 700, color: '#FAF6F0' }}>Instalar como app</p>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#9B7B6A' }}>Acesse direto da tela inicial</p>
          </div>
          <motion.button onClick={install} whileTap={{ scale: 0.95 }}
            style={{ background: '#C4553B', color: 'white', border: 'none', borderRadius: 10, padding: '8px 14px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            Instalar
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

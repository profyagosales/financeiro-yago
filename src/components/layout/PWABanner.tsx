import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import { IconDeviceMobile, IconX } from '@tabler/icons-react'
import { usePWAInstall } from '@/hooks/usePWAInstall'

// Banner de install do PWA — discreto, dismissível, esconde em /configuracoes
// (onde já tem a seção completa de instalação).
//
// Quando o user fecha, salva timestamp em localStorage. Volta a aparecer
// só depois de 7 dias (pra não atrapalhar mas também não sumir pra sempre).

const STORAGE_KEY = 'fy-pwa-banner-dismissed-at'
const REAPPEAR_AFTER_MS = 7 * 24 * 60 * 60 * 1000  // 7 dias

function isDismissed(): boolean {
  try {
    const ts = localStorage.getItem(STORAGE_KEY)
    if (!ts) return false
    const dismissedAt = parseInt(ts, 10)
    if (isNaN(dismissedAt)) return false
    return Date.now() - dismissedAt < REAPPEAR_AFTER_MS
  } catch { return false }
}

export function PWABanner() {
  const { canInstall, install } = usePWAInstall()
  const location = useLocation()
  // Lazy initializer: lê o localStorage só uma vez, sem useEffect
  const [dismissed, setDismissed] = useState(() => isDismissed())

  const handleDismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, String(Date.now())) } catch { /* noop */ }
    setDismissed(true)
  }

  const handleInstall = () => {
    install()
    handleDismiss()  // ao instalar, marca como dismissido
  }

  // Esconde em /configuracoes (já tem seção completa lá)
  const ehConfiguracoes = location.pathname === '/configuracoes'
  const visivel = canInstall && !dismissed && !ehConfiguracoes

  return (
    <AnimatePresence>
      {visivel && (
        <motion.div
          initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          style={{
            position: 'fixed', bottom: 90, right: 16,
            zIndex: 180, maxWidth: 360,
            background: '#2C1A0F',
            borderRadius: 14,
            padding: '12px 14px',
            display: 'flex', alignItems: 'center', gap: 10,
            boxShadow: '0 12px 32px rgba(28,10,5,0.4)',
          }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: 'rgba(196,85,59,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <IconDeviceMobile size={16} stroke={2} color="#FFFFFF" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700, color: '#FAF6F0', margin: 0 }}>Instalar como app</p>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: '#7A5C4F', margin: '2px 0 0' }}>Acesso rápido pela tela inicial</p>
          </div>
          <motion.button onClick={handleInstall} whileTap={{ scale: 0.95 }}
            style={{ background: '#C4553B', color: 'white', border: 'none', borderRadius: 9, padding: '7px 12px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
            Instalar
          </motion.button>
          <button onClick={handleDismiss}
            title="Fechar (volta em 7 dias)"
            aria-label="Fechar banner de instalação"
            style={{
              background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8,
              // 40x40 cumpre touch target mínimo (era 24)
              width: 40, height: 40, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, color: '#7A5C4F',
            }}>
            <IconX size={15} stroke={2} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

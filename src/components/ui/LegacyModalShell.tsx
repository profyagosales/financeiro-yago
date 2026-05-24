// ─── LegacyModalShell ──────────────────────────────────────────────
// Wrapper responsivo pra modais legados que têm overlay próprio.
// Em mobile: full-screen slide-up (estilo iOS sheet) com gradient peach.
// Em desktop: centralizado com tamanho máximo configurável.
//
// Substitui o pattern repetido:
//   <motion.div fixed inset-0 backdrop-blur>
//     <motion.div white card center>
//
// Uso:
//   <LegacyModalShell open onClose={...} maxWidth={620}>
//     <CustomHeader />
//     <CustomBody />
//     <CustomFooter />
//   </LegacyModalShell>

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, type ReactNode } from 'react'
import { useIsMobile } from '@/hooks/useIsMobile'

interface Props {
  open: boolean
  onClose: () => void
  children: ReactNode
  maxWidth?: number
  closeOnBackdrop?: boolean
  /** Z-index do overlay (default 200) */
  zIndex?: number
}

export function LegacyModalShell({
  open, onClose, children,
  maxWidth = 620, closeOnBackdrop = true,
  zIndex = 200,
}: Props) {
  const isMobile = useIsMobile()

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={closeOnBackdrop ? onClose : undefined}
          style={{
            position: 'fixed', inset: 0, zIndex,
            background: isMobile ? 'rgba(28,10,5,0.4)' : 'rgba(28,10,5,0.55)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: isMobile ? 'flex-end' : 'center',
            justifyContent: 'center',
            padding: isMobile ? 0 : 24,
          }}>
          <motion.div
            role="dialog" aria-modal="true"
            initial={isMobile ? { y: '100%' } : { opacity: 0, y: 24, scale: 0.96 }}
            animate={isMobile ? { y: 0 } : { opacity: 1, y: 0, scale: 1 }}
            exit={isMobile ? { y: '100%' } : { opacity: 0, y: 16, scale: 0.97 }}
            transition={isMobile
              ? { type: 'spring', stiffness: 320, damping: 32 }
              : { type: 'spring', stiffness: 260, damping: 28 }}
            onClick={e => e.stopPropagation()}
            style={{
              background: isMobile
                ? 'linear-gradient(180deg, #FFE2C7 0%, #FFF1DE 30%, #FFE9D7 100%)'
                : '#FFFFFF',
              borderRadius: isMobile ? '24px 24px 0 0' : 24,
              width: '100%',
              maxWidth: isMobile ? '100%' : `min(${maxWidth}px, calc(100vw - 48px))`,
              maxHeight: isMobile ? '94dvh' : 'calc(100vh - 48px)',
              minHeight: isMobile ? '60dvh' : undefined,
              display: 'flex', flexDirection: 'column',
              boxShadow: isMobile
                ? '0 -10px 40px rgba(28,10,5,0.32)'
                : '0 28px 80px rgba(28,10,5,0.45), 0 4px 16px rgba(28,10,5,0.18)',
              overflow: 'hidden',
              paddingBottom: isMobile ? 'env(safe-area-inset-bottom)' : 0,
            }}>
            {/* Drag handle mobile */}
            {isMobile && (
              <div aria-hidden style={{
                paddingTop: 10, paddingBottom: 4,
                display: 'flex', justifyContent: 'center', flexShrink: 0,
              }}>
                <div style={{ width: 40, height: 4, borderRadius: 999, background: 'rgba(44,26,15,0.18)' }} />
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

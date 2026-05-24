// ─── LegacyModalShell ──────────────────────────────────────────────
// Wrapper responsivo pra modais legados.
//
// Em mobile: full-screen slide-up estilo iOS sheet
// Em desktop: centralizado, scale+fade
//
// IMPORTANTE: a estrutura tem 3 slots:
//   - header (opcional, FIXO no topo, não scrolla)
//   - children (BODY scrollável — único que scrolla)
//   - footer (opcional, FIXO no rodapé, sempre visível, c/ safe-area)
//
// O footer respeita env(safe-area-inset-bottom) automaticamente no mobile.

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useIsMobile } from '@/hooks/useIsMobile'

interface Props {
  open: boolean
  onClose: () => void
  /** Body (única área scrollável) */
  children: ReactNode
  /** Header fixo no topo (não scrolla) */
  header?: ReactNode
  /** Footer fixo no rodapé com safe-area-inset (sempre visível) */
  footer?: ReactNode
  maxWidth?: number
  closeOnBackdrop?: boolean
  zIndex?: number
}

export function LegacyModalShell({
  open, onClose, children, header, footer,
  maxWidth = 620, closeOnBackdrop = true,
  zIndex = 200,
}: Props) {
  const isMobile = useIsMobile()
  const dialogRef = useRef<HTMLDivElement>(null)

  // Focus trap A11Y: auto-focus primeiro input, prende Tab dentro,
  // restaura foco ao fechar (WCAG 2.4.3).
  useFocusTrap(dialogRef, open)

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

  // Portal pra escapar do stacking context do <main> (que tem position:relative
  // + z-index:1 no AppShell). Sem portal, qualquer z-index aqui ficaria preso
  // abaixo do BottomNav (sibling do main, z-index 100 no contexto raiz).
  return createPortal(
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
            ref={dialogRef}
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
              height: isMobile ? '94dvh' : undefined,
              maxHeight: isMobile ? '94dvh' : 'calc(100vh - 48px)',
              display: 'flex', flexDirection: 'column',
              boxShadow: isMobile
                ? '0 -10px 40px rgba(28,10,5,0.32)'
                : '0 28px 80px rgba(28,10,5,0.45), 0 4px 16px rgba(28,10,5,0.18)',
              overflow: 'hidden',
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

            {/* HEADER fixo */}
            {header && (
              <div style={{ flexShrink: 0 }}>
                {header}
              </div>
            )}

            {/* BODY scrollável (única área que scrolla) */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              WebkitOverflowScrolling: 'touch',
              minHeight: 0,
            }}>
              {children}
            </div>

            {/* FOOTER fixo com safe-area-inset-bottom + base buffer */}
            {footer && (
              <div style={{
                flexShrink: 0,
                paddingBottom: isMobile ? 'calc(12px + env(safe-area-inset-bottom))' : 0,
                background: isMobile
                  ? 'rgba(255,233,215,0.96)'
                  : '#FFFFFF',
                backdropFilter: isMobile ? 'blur(8px)' : undefined,
                WebkitBackdropFilter: isMobile ? 'blur(8px)' : undefined,
                borderTop: '1px solid rgba(44,26,15,0.08)',
              }}>
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

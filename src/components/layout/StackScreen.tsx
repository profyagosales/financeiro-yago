// ─── StackScreen: bottom sheet modal (estilo iOS sheet) ─────────────
// Desliza de baixo, ocupa 94dvh, gradient peach. Mesma estética do
// LegacyModalShell pra uniformidade visual entre forms e detail screens.
//
// API mantida pra compat: title/eyebrow/rightAction/closeIcon ainda
// funcionam, mas renderizam como bottom sheet em vez de full-screen.
//
// Uso:
//   <StackScreen open={open} onClose={...} title="Detalhes" eyebrow="Transação">
//     {content}
//   </StackScreen>

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { IconX } from '@tabler/icons-react'
import type { ReactNode } from 'react'

interface StackScreenProps {
  open: boolean
  onClose: () => void
  title?: string
  eyebrow?: string
  /** Ação no canto direito do header (ex: ícone editar). */
  rightAction?: ReactNode
  children: ReactNode
  /** Footer fixo no rodapé (botões de ação). */
  footer?: ReactNode
  /** Mantido pra compat — não usado mais (sempre X). */
  closeIcon?: 'back' | 'close'
}

export function StackScreen({
  open, onClose, title, eyebrow, rightAction, children, footer,
}: StackScreenProps) {
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

  // Portal pra escapar do stacking context do <main>
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(28,10,5,0.4)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}>
          <motion.div
            role="dialog" aria-modal="true"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            onClick={e => e.stopPropagation()}
            style={{
              background: 'linear-gradient(180deg, #FFE2C7 0%, #FFF1DE 30%, #FFE9D7 100%)',
              borderRadius: '24px 24px 0 0',
              width: '100%',
              height: '94dvh',
              maxHeight: '94dvh',
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 -10px 40px rgba(28,10,5,0.32)',
              overflow: 'hidden',
            }}>
            {/* Drag handle */}
            <div aria-hidden style={{
              paddingTop: 10, paddingBottom: 4,
              display: 'flex', justifyContent: 'center', flexShrink: 0,
            }}>
              <div style={{
                width: 40, height: 4, borderRadius: 999,
                background: 'rgba(44,26,15,0.18)',
              }} />
            </div>

            {/* HEADER fixo */}
            {(title || eyebrow || rightAction) && (
              <header style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 22px 14px',
                borderBottom: '1px solid rgba(44,26,15,0.08)',
                flexShrink: 0,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {eyebrow && (
                    <p style={{
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                      fontSize: 9.5, fontWeight: 700,
                      color: '#7A5C4F', letterSpacing: '.14em', textTransform: 'uppercase',
                      margin: 0, lineHeight: 1,
                    }}>{eyebrow}</p>
                  )}
                  {title && (
                    <h2 style={{
                      fontFamily: "'Fraunces',Georgia,serif",
                      fontSize: 18, fontWeight: 700, color: '#2C1A0F',
                      letterSpacing: '-0.4px', margin: eyebrow ? '3px 0 0' : 0, lineHeight: 1.1,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{title}</h2>
                  )}
                </div>
                {rightAction && (
                  <div style={{ flexShrink: 0 }}>{rightAction}</div>
                )}
                <button
                  onClick={onClose}
                  aria-label="Fechar"
                  style={{
                    width: 34, height: 34, borderRadius: 10,
                    background: 'rgba(255,255,255,0.7)',
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                  <IconX size={16} stroke={2.2} color="#7A5C4F" />
                </button>
              </header>
            )}

            {/* BODY scrollável */}
            <div style={{
              flex: 1, overflowY: 'auto', overflowX: 'hidden',
              WebkitOverflowScrolling: 'touch',
              minHeight: 0,
            }}>
              {children}
            </div>

            {/* FOOTER fixo (safe-area-inset-bottom + base buffer) */}
            {footer && (
              <div style={{
                flexShrink: 0,
                paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
                background: 'rgba(255,233,215,0.96)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
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

// ─── StackScreen: modal full-screen sliding (estilo iOS push) ───────
// Pra detail screens e forms no mobile. Desliza de baixo pra cima,
// cobre 100% da viewport, tem botão "voltar" no topo.
//
// Uso:
//   <StackScreen open={open} onClose={...} title="Detalhes" eyebrow="Transação">
//     {content}
//   </StackScreen>

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import { IconChevronLeft, IconX } from '@tabler/icons-react'
import type { ReactNode } from 'react'

interface StackScreenProps {
  open: boolean
  onClose: () => void
  title?: string
  eyebrow?: string
  /** Ação no canto direito do header (ex: "Salvar", "..." menu) */
  rightAction?: ReactNode
  children: ReactNode
  /** Estilo do ícone de fechar — "back" (←) ou "close" (×). Default 'back' */
  closeIcon?: 'back' | 'close'
}

export function StackScreen({
  open, onClose, title, eyebrow, rightAction, children, closeIcon = 'back',
}: StackScreenProps) {
  // Lock body scroll quando aberto
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  // ESC fecha
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  const Icon = closeIcon === 'close' ? IconX : IconChevronLeft

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: '#FBF8F3',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
          }}
          role="dialog"
          aria-modal="true"
        >
          {/* Header sticky */}
          <header style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '14px 14px 12px',
            background: 'rgba(251,248,243,0.94)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid #EDE6DC',
            flexShrink: 0,
            paddingTop: 'max(14px, env(safe-area-inset-top))',
          }}>
            <button
              onClick={onClose}
              aria-label="Voltar"
              style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'rgba(80,78,118,0.08)',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
              <Icon size={18} stroke={2.4} color="#2C1A0F" />
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              {eyebrow && (
                <p style={{
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontSize: 9.5, fontWeight: 700,
                  color: '#9B7B6A', letterSpacing: '.14em', textTransform: 'uppercase',
                  margin: 0, lineHeight: 1,
                }}>{eyebrow}</p>
              )}
              {title && (
                <h2 style={{
                  fontFamily: "'Fraunces',Georgia,serif",
                  fontSize: 17, fontWeight: 700, color: '#2C1A0F',
                  letterSpacing: '-0.4px', margin: '3px 0 0', lineHeight: 1.1,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{title}</h2>
              )}
            </div>
            {rightAction && (
              <div style={{ flexShrink: 0 }}>{rightAction}</div>
            )}
          </header>

          {/* Conteúdo scrollável */}
          <div style={{
            flex: 1, overflowY: 'auto', overflowX: 'hidden',
            paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
          }}>
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

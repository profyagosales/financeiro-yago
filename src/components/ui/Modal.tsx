import { motion, AnimatePresence } from 'framer-motion'
import { useEffect } from 'react'
import { IconX } from '@tabler/icons-react'

// ─── Modal premium reutilizável ──────────────────────────────────────
//
// Características:
//  - Backdrop blur + fade
//  - Animação spring scale + translate
//  - 4 tamanhos predefinidos (sm/md/lg/xl)
//  - Header fixo (sticky) + Footer fixo (sticky) opcionais
//  - Esc fecha
//  - Click fora fecha (configurável)
//  - Lock body scroll quando aberto
//  - Acessível: aria-labelledby, focus trap visual
//
// Uso típico:
//   <Modal open={x} onClose={...} title="..." size="xl">
//     <Modal.Body>...</Modal.Body>
//     <Modal.Footer>...</Modal.Footer>
//   </Modal>
//
// Ou sem header/footer (controle total):
//   <Modal open={x} onClose={...} bare><...></Modal>

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: React.ReactNode
  subtitle?: React.ReactNode
  icon?: React.ReactNode
  size?: ModalSize
  closeOnBackdrop?: boolean
  showCloseButton?: boolean
  children: React.ReactNode
  bare?: boolean // sem header/footer chrome
  className?: string
}

const SIZE_MAP: Record<ModalSize, number> = {
  sm:  440,
  md:  560,
  lg:  680,
  xl:  860,
  '2xl': 1040,
}

export function Modal({
  open, onClose,
  title, subtitle, icon,
  size = 'lg',
  closeOnBackdrop = true,
  showCloseButton = true,
  children, bare = false,
  className,
}: ModalProps) {
  const maxWidth = SIZE_MAP[size]

  // ESC fecha + lock body scroll
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={closeOnBackdrop ? onClose : undefined}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(28,10,5,0.55)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24,
          }}
        >
          <motion.div
            role="dialog" aria-modal="true"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            onClick={e => e.stopPropagation()}
            className={className}
            style={{
              background: '#FFFFFF',
              borderRadius: 24,
              width: '100%',
              maxWidth: `min(${maxWidth}px, calc(100vw - 48px))`,
              maxHeight: 'calc(100vh - 48px)',
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 28px 80px rgba(28,10,5,0.45), 0 4px 16px rgba(28,10,5,0.18)',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            {!bare && (title || subtitle || showCloseButton) && (
              <div style={{
                padding: '22px 28px',
                borderBottom: '1px solid #EDE6DC',
                display: 'flex', alignItems: 'center', gap: 14,
                background: '#FFFFFF',
                flexShrink: 0,
              }}>
                {icon && (
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: '#FBF8F3',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {icon}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {title && (
                    <h2 style={{
                      fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700,
                      color: '#2C1A0F', margin: 0, letterSpacing: '-0.6px', lineHeight: 1.15,
                    }}>{title}</h2>
                  )}
                  {subtitle && (
                    <p style={{
                      fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 500,
                      color: '#9B7B6A', margin: '3px 0 0',
                    }}>{subtitle}</p>
                  )}
                </div>
                {showCloseButton && (
                  <button onClick={onClose}
                    aria-label="Fechar"
                    style={{
                      background: '#F5F0E8', border: 'none', borderRadius: 10,
                      width: 34, height: 34, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, transition: 'background .15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#EDE6DC')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#F5F0E8')}
                  >
                    <IconX size={16} stroke={2} color="#7A5C4F" />
                  </button>
                )}
              </div>
            )}

            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Subcomponentes ─────────────────────────────────────────────────
Modal.Body = function ModalBody({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      padding: '24px 28px',
      overflowY: 'auto',
      flex: 1,
      ...style,
    }}>
      {children}
    </div>
  )
}

Modal.Footer = function ModalFooter({ children, align = 'end' }: { children: React.ReactNode; align?: 'end' | 'between' | 'start' }) {
  const justify = align === 'between' ? 'space-between' : align === 'start' ? 'flex-start' : 'flex-end'
  return (
    <div style={{
      padding: '16px 28px',
      borderTop: '1px solid #EDE6DC',
      display: 'flex', justifyContent: justify, alignItems: 'center', gap: 10,
      background: '#FFFFFF',
      flexShrink: 0,
    }}>
      {children}
    </div>
  )
}

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect } from 'react'
import { IconX } from '@tabler/icons-react'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { useIsMobile } from '@/hooks/useIsMobile'

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
  const isMobile = useIsMobile()

  // Lock body scroll quando aberto (compartilhado via hook)
  useBodyScrollLock(open)

  // ESC fecha
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  // ── Mobile: full-screen slide-up (estilo iOS sheet) ──
  // ── Desktop: centralizado scale + fade ──
  const backdropPad = isMobile ? 0 : 24
  const sheetInitial = isMobile ? { y: '100%' } : { opacity: 0, y: 24, scale: 0.96 }
  const sheetAnimate = isMobile ? { y: 0 } : { opacity: 1, y: 0, scale: 1 }
  const sheetExit = isMobile ? { y: '100%' } : { opacity: 0, y: 16, scale: 0.97 }
  const sheetTransition = isMobile
    ? { type: 'spring' as const, stiffness: 320, damping: 32 }
    : { type: 'spring' as const, stiffness: 260, damping: 28 }

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
            background: isMobile ? 'rgba(28,10,5,0.4)' : 'rgba(28,10,5,0.55)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: isMobile ? 'flex-end' : 'center',
            justifyContent: 'center',
            padding: backdropPad,
          }}
        >
          <motion.div
            role="dialog" aria-modal="true"
            initial={sheetInitial}
            animate={sheetAnimate}
            exit={sheetExit}
            transition={sheetTransition}
            onClick={e => e.stopPropagation()}
            className={className}
            style={{
              // Em mobile: bg peach quente igual ao app
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
            }}
          >
            {/* Drag handle visual (mobile) */}
            {isMobile && (
              <div aria-hidden style={{
                paddingTop: 10, paddingBottom: 4,
                display: 'flex', justifyContent: 'center', flexShrink: 0,
              }}>
                <div style={{
                  width: 40, height: 4, borderRadius: 999,
                  background: 'rgba(44,26,15,0.18)',
                }} />
              </div>
            )}
            {/* Header */}
            {!bare && (title || subtitle || showCloseButton) && (
              <div style={{
                padding: isMobile ? '12px 18px 14px' : '22px 28px',
                borderBottom: isMobile ? '1px solid rgba(44,26,15,0.06)' : '1px solid #EDE6DC',
                display: 'flex', alignItems: 'center', gap: 12,
                background: isMobile ? 'transparent' : '#FFFFFF',
                flexShrink: 0,
              }}>
                {icon && (
                  <div style={{
                    width: isMobile ? 38 : 44, height: isMobile ? 38 : 44, borderRadius: 12,
                    background: isMobile ? 'rgba(255,255,255,0.7)' : '#FBF8F3',
                    backdropFilter: isMobile ? 'blur(14px)' : undefined,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {icon}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {title && (
                    <h2 style={{
                      fontFamily: "'Fraunces',Georgia,serif",
                      fontSize: isMobile ? 18 : 22, fontWeight: 700,
                      color: '#2C1A0F', margin: 0,
                      letterSpacing: '-0.5px', lineHeight: 1.15,
                    }}>{title}</h2>
                  )}
                  {subtitle && (
                    <p style={{
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                      fontSize: isMobile ? 11.5 : 12, fontWeight: 500,
                      color: '#7A5C4F', margin: '2px 0 0',
                    }}>{subtitle}</p>
                  )}
                </div>
                {showCloseButton && (
                  <button onClick={onClose}
                    aria-label="Fechar"
                    style={{
                      background: isMobile ? 'rgba(255,255,255,0.7)' : '#F5F0E8',
                      backdropFilter: isMobile ? 'blur(14px)' : undefined,
                      border: 'none', borderRadius: 10,
                      width: isMobile ? 36 : 34, height: isMobile ? 36 : 34,
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, transition: 'background .15s',
                    }}
                  >
                    <IconX size={isMobile ? 17 : 16} stroke={2.2} color="#7A5C4F" />
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

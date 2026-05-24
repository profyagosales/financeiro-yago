// ─── ConfirmDialog ──────────────────────────────────────────────────
// Diálogo de confirmação estilizado, em substituição ao confirm() nativo
// do browser (que quebra a estética premium em PWA mobile).
//
// Uso típico:
//   <ConfirmDialog
//     open={open}
//     title="Excluir transação?"
//     body="Isso não pode ser desfeito."
//     confirmLabel="Excluir"
//     onConfirm={async () => { await delete(); close() }}
//     onClose={close}
//     destructive
//   />

import { AnimatePresence, motion } from 'framer-motion'
import { createPortal } from 'react-dom'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { IconAlertTriangle } from '@tabler/icons-react'
import { useFocusTrap } from '@/hooks/useFocusTrap'

interface Props {
  open: boolean
  title: string
  body?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void | Promise<void>
  onClose: () => void
}

export function ConfirmDialog({
  open, title, body,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = false,
  onConfirm, onClose,
}: Props) {
  const [busy, setBusy] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)

  // Focus trap A11Y: foco vai pro botão cancelar/confirmar e fica preso
  // dentro do dialog. Sem isso, Tab vaza pro background atrás do overlay.
  useFocusTrap(dialogRef, open)

  useEffect(() => {
    if (!open) return
    setBusy(false)  // reset ao abrir
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose, busy])

  const handleConfirm = async () => {
    if (busy) return
    setBusy(true)
    try { await onConfirm() } finally { setBusy(false) }
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={() => { if (!busy) onClose() }}
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            background: 'rgba(13,5,25,0.55)', backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}>
          <motion.div
            ref={dialogRef}
            role="alertdialog" aria-modal="true"
            initial={{ scale: 0.92, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            onClick={e => e.stopPropagation()}
            style={{
              background: '#FFFDF9', borderRadius: 20,
              padding: '24px 22px 20px', maxWidth: 380, width: '100%',
              textAlign: 'center',
              boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, margin: '0 auto 14px',
              background: destructive ? 'rgba(196,85,59,0.12)' : 'rgba(80,78,118,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <IconAlertTriangle size={26} stroke={2} color={destructive ? '#A8442B' : '#504E76'} />
            </div>
            <p style={{
              fontFamily: "'Fraunces',Georgia,serif",
              fontSize: 20, fontWeight: 700, color: '#2C1A0F',
              margin: '0 0 8px', letterSpacing: '-0.3px',
            }}>{title}</p>
            {body && (
              <div style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontSize: 13, color: '#7A5C4F', margin: '0 0 20px', lineHeight: 1.5,
              }}>{body}</div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={onClose} disabled={busy}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 12,
                  border: '1.5px solid #E8E0D5', background: '#FFFFFF',
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontSize: 13, fontWeight: 700, color: '#7A5C4F',
                  cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1,
                }}>{cancelLabel}</button>
              <button onClick={handleConfirm} disabled={busy}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 12, border: 'none',
                  background: destructive
                    ? 'linear-gradient(135deg, #C4553B, #A8442B)'
                    : 'linear-gradient(135deg, #504E76, #3D3B5F)',
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontSize: 13, fontWeight: 700, color: '#FFFFFF',
                  cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.7 : 1,
                  boxShadow: destructive
                    ? '0 6px 16px rgba(196,85,59,0.4)'
                    : '0 6px 16px rgba(80,78,118,0.4)',
                }}>{busy ? 'Processando…' : confirmLabel}</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

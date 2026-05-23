import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { IconChevronDown, IconCheck, IconX } from '@tabler/icons-react'

// ─── Dropdown genérico ──────────────────────────────────────────────
//
// Multi-select dropdown com:
//  - Trigger pill (com label, contagem, chevron)
//  - Painel flutuante (portal-like, absolute pra trigger)
//  - Click fora fecha, Esc fecha
//  - Items com checkbox + ícone/cor opcional
//  - "Limpar seleção"
//  - Suporte a render custom de item

export interface DropdownItem<T = string | number> {
  value: T
  label: string
  cor?: string
  icon?: React.ReactNode
}

interface DropdownProps<T> {
  label: string
  items: DropdownItem<T>[]
  selected: T[]
  onChange: (selected: T[]) => void
  multi?: boolean
  width?: number
  emptyLabel?: string
}

export function Dropdown<T extends string | number>({
  label, items, selected, onChange,
  multi = true, width = 240, emptyLabel = 'Limpar',
}: DropdownProps<T>) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    if (!open) return
    const r = triggerRef.current?.getBoundingClientRect()
    if (r) setCoords({ top: r.bottom + 6, left: r.left })
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node) && !triggerRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const toggle = (value: T) => {
    if (multi) {
      onChange(selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value])
    } else {
      onChange([value])
      setOpen(false)
    }
  }

  const active = selected.length > 0

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen(o => !o)}
        style={{
          background: active ? '#2C1A0F' : '#FFFFFF',
          color: active ? '#FFFFFF' : '#2C1A0F',
          border: `1px solid ${active ? '#2C1A0F' : '#EDE6DC'}`,
          borderRadius: 10,
          padding: '8px 12px',
          cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 7,
          fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600,
          whiteSpace: 'nowrap',
          letterSpacing: '.02em',
          transition: 'all .12s',
        }}>
        <span>{label}</span>
        {active && (
          <span style={{
            background: 'rgba(255,255,255,0.18)',
            padding: '1px 7px', borderRadius: 8, fontSize: 10, fontWeight: 700,
          }}>{selected.length}</span>
        )}
        <IconChevronDown size={13} stroke={2.4}
          style={{ transition: 'transform .15s', transform: open ? 'rotate(180deg)' : 'none' }}/>
      </button>

      {createPortal(
      <AnimatePresence>
        {open && coords && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            style={{
              position: 'fixed',
              top: coords.top, left: coords.left,
              width, maxHeight: 360,
              background: '#FFFFFF',
              border: '1px solid #EDE6DC',
              borderRadius: 12,
              boxShadow: '0 12px 32px rgba(28,10,5,0.18)',
              zIndex: 9999,
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
            }}>
            <div style={{ overflowY: 'auto', flex: 1, padding: 4 }}>
              {items.map(item => {
                const isSelected = selected.includes(item.value)
                return (
                  <button key={String(item.value)}
                    onClick={() => toggle(item.value)}
                    style={{
                      width: '100%', background: 'transparent', border: 'none', cursor: 'pointer',
                      padding: '8px 10px', borderRadius: 8,
                      display: 'flex', alignItems: 'center', gap: 10,
                      textAlign: 'left',
                      fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600,
                      color: '#2C1A0F',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#FBF8F3')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Checkbox */}
                    {multi && (
                      <span style={{
                        width: 16, height: 16, borderRadius: 4,
                        background: isSelected ? '#C4553B' : 'transparent',
                        border: `1.5px solid ${isSelected ? '#C4553B' : '#D4C8BC'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {isSelected && <IconCheck size={11} stroke={3} color="#FFFFFF" />}
                      </span>
                    )}
                    {/* Color dot / icon */}
                    {item.cor && <span style={{ width: 8, height: 8, borderRadius: 2, background: item.cor, flexShrink: 0 }}/>}
                    {item.icon}
                    {/* Label */}
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {!multi && isSelected && <IconCheck size={13} stroke={2.4} color="#C4553B" />}
                  </button>
                )
              })}
            </div>
            {active && (
              <div style={{
                padding: 8, borderTop: '1px solid #EDE6DC',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 600, color: '#9B7B6A' }}>
                  {selected.length} selecionado{selected.length !== 1 ? 's' : ''}
                </span>
                <button onClick={() => { onChange([]); setOpen(false) }}
                  style={{
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700,
                    color: '#C4553B', padding: '4px 8px',
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                  }}>
                  <IconX size={11} stroke={2.4}/> {emptyLabel}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>,
      document.body)}
    </>
  )
}

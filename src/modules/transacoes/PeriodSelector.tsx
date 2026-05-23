import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { IconChevronDown, IconCalendar } from '@tabler/icons-react'

// ─── Period Selector (dropdown) ─────────────────────────────────────
//
// Retorna um intervalo [start, end] em YYYY-MM-DD.
// Opções: Hoje / Esta semana / Este mês / Mês passado / Últimos 30d /
// Este ano / Tudo / Custom.

export interface Period {
  label: string
  start: string  // YYYY-MM-DD
  end: string    // YYYY-MM-DD
  key: string
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function buildPeriods(): Period[] {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  // Esta semana (segunda → domingo)
  const dow = hoje.getDay()  // 0=dom, 1=seg, ...
  const segunda = new Date(hoje); segunda.setDate(hoje.getDate() - ((dow + 6) % 7))
  const domingo = new Date(segunda); domingo.setDate(segunda.getDate() + 6)

  // Este mês
  const mesInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  const mesFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)

  // Mês passado
  const mesPassadoInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
  const mesPassadoFim = new Date(hoje.getFullYear(), hoje.getMonth(), 0)

  // Últimos 30d
  const trinta = new Date(hoje); trinta.setDate(hoje.getDate() - 29)

  // Este ano
  const anoInicio = new Date(hoje.getFullYear(), 0, 1)
  const anoFim = new Date(hoje.getFullYear(), 11, 31)

  const mesNome = hoje.toLocaleDateString('pt-BR', { month: 'long' })
  const mesPassadoNome = mesPassadoInicio.toLocaleDateString('pt-BR', { month: 'long' })

  return [
    { key: 'hoje',         label: 'Hoje',                                              start: ymd(hoje),             end: ymd(hoje) },
    { key: 'semana',       label: 'Esta semana',                                       start: ymd(segunda),          end: ymd(domingo) },
    { key: 'mes',          label: `Este mês · ${capitalize(mesNome)}`,                 start: ymd(mesInicio),        end: ymd(mesFim) },
    { key: 'mesPassado',   label: `Mês passado · ${capitalize(mesPassadoNome)}`,       start: ymd(mesPassadoInicio), end: ymd(mesPassadoFim) },
    { key: '30d',          label: 'Últimos 30 dias',                                   start: ymd(trinta),           end: ymd(hoje) },
    { key: 'ano',          label: `Este ano · ${hoje.getFullYear()}`,                  start: ymd(anoInicio),        end: ymd(anoFim) },
    { key: 'tudo',         label: 'Tudo',                                              start: '1970-01-01',          end: '2999-12-31' },
  ]
}

function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1) }

interface Props {
  period: Period
  onChange: (p: Period) => void
}

export function PeriodSelector({ period, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [showCustom, setShowCustom] = useState(false)
  const [customStart, setCustomStart] = useState(period.start)
  const [customEnd, setCustomEnd] = useState(period.end)
  const periods = buildPeriods()
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
        setOpen(false); setShowCustom(false)
      }
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); setShowCustom(false) } }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <>
      <button ref={triggerRef}
        onClick={() => setOpen(o => !o)}
        style={{
          background: '#FFFFFF',
          color: '#2C1A0F',
          border: '1px solid #EDE6DC',
          borderRadius: 10,
          padding: '8px 14px',
          cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 8,
          fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700,
          letterSpacing: '.02em',
          transition: 'all .12s',
        }}>
        <IconCalendar size={14} stroke={2} color="#7A5C4F" />
        <span>{period.label.split('·')[0].trim()}</span>
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
              width: 280,
              background: '#FFFFFF',
              border: '1px solid #EDE6DC',
              borderRadius: 12,
              boxShadow: '0 12px 32px rgba(28,10,5,0.18)',
              zIndex: 9999,
              overflow: 'hidden',
            }}>
            {!showCustom ? (
              <div style={{ padding: 4 }}>
                {periods.map(p => {
                  const active = p.key === period.key
                  return (
                    <button key={p.key}
                      onClick={() => { onChange(p); setOpen(false) }}
                      style={{
                        width: '100%', background: active ? '#FBEEEA' : 'transparent',
                        border: 'none', cursor: 'pointer',
                        padding: '9px 12px', borderRadius: 8,
                        textAlign: 'left',
                        fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12,
                        fontWeight: active ? 700 : 600,
                        color: active ? '#C4553B' : '#2C1A0F',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}
                      onMouseEnter={e => { if (!active) (e.currentTarget.style.background = '#FBF8F3') }}
                      onMouseLeave={e => { if (!active) (e.currentTarget.style.background = 'transparent') }}
                    >
                      {p.label}
                    </button>
                  )
                })}
                <div style={{ height: 1, background: '#EDE6DC', margin: '4px 0' }}/>
                <button onClick={() => setShowCustom(true)}
                  style={{
                    width: '100%', background: 'transparent', border: 'none', cursor: 'pointer',
                    padding: '9px 12px', borderRadius: 8,
                    textAlign: 'left',
                    fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700,
                    color: '#7A5C4F',
                    display: 'flex', alignItems: 'center', gap: 7,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#FBF8F3')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <IconCalendar size={13} stroke={2} /> Período personalizado…
                </button>
              </div>
            ) : (
              <div style={{ padding: 14 }}>
                <p style={{
                  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700,
                  color: '#7A5C4F', letterSpacing: '.1em', textTransform: 'uppercase', margin: '0 0 8px',
                }}>Período personalizado</p>
                <label style={{ display: 'block', marginBottom: 8 }}>
                  <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600, color: '#9B7B6A', marginBottom: 4, display: 'block' }}>De</span>
                  <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', background: '#FBF8F3', border: '1.5px solid #EDE6DC', borderRadius: 8, padding: '7px 10px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#2C1A0F', outline: 'none' }}/>
                </label>
                <label style={{ display: 'block', marginBottom: 14 }}>
                  <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600, color: '#9B7B6A', marginBottom: 4, display: 'block' }}>Até</span>
                  <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', background: '#FBF8F3', border: '1.5px solid #EDE6DC', borderRadius: 8, padding: '7px 10px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#2C1A0F', outline: 'none' }}/>
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setShowCustom(false)}
                    style={{ flex: 1, background: 'transparent', color: '#7A5C4F', border: '1.5px solid #EDE6DC', borderRadius: 10, padding: '8px 12px', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700 }}>
                    Voltar
                  </button>
                  <button onClick={() => {
                    onChange({ key: 'custom', label: `${customStart} a ${customEnd}`, start: customStart, end: customEnd })
                    setOpen(false); setShowCustom(false)
                  }}
                    style={{ flex: 1, background: 'linear-gradient(135deg, #D4643A, #C4553B)', color: '#FFFFFF', border: 'none', borderRadius: 10, padding: '8px 12px', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700, boxShadow: '0 3px 10px rgba(196,85,59,0.32)' }}>
                    Aplicar
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>,
      document.body)}
    </>
  )
}

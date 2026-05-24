// ─── FiltrosBar: barra sticky com período + filtros adicionais ──────
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  IconCalendar, IconWallet, IconCategory,
  IconRefresh, IconChevronDown, IconCheck,
} from '@tabler/icons-react'
import { usePeriodo, type PeriodoPreset } from '../lib/usePeriodo'
import { useContas } from '@/db/hooks/useContas'
import { useCategorias } from '@/db/hooks/useCategorias'

const PRESETS: Array<{ key: PeriodoPreset; label: string }> = [
  { key: 'mes', label: 'Mês' },
  { key: '3m', label: '3M' },
  { key: '6m', label: '6M' },
  { key: '12m', label: '12M' },
  { key: 'ytd', label: 'YTD' },
  { key: 'custom', label: 'Custom' },
]

export function FiltrosBar({ periodoLabel }: { periodoLabel: string }) {
  const state = usePeriodo()
  const contas = useContas()
  const categorias = useCategorias()
  const [openConta, setOpenConta] = useState(false)
  const [openCat, setOpenCat] = useState(false)
  const [openCustom, setOpenCustom] = useState(false)

  const contaSel = contas.find(c => c.id === state.contaId) ?? null
  const catSel = categorias.find(c => c.id === state.categoriaId) ?? null

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        style={{
          background: '#FFFFFF',
          border: '1px solid #EDE6DC',
          borderRadius: 16,
          padding: '10px 12px',
          boxShadow: '0 1px 3px rgba(44,26,15,0.05), 0 4px 14px rgba(44,26,15,0.06)',
          display: 'flex', alignItems: 'center', gap: 10,
          flexWrap: 'wrap',
        }}>
        {/* Presets período */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#FBF8F3', borderRadius: 12, padding: 4, border: '1px solid #EDE6DC' }}>
          {PRESETS.map(p => {
            const active = state.preset === p.key
            return (
              <button key={p.key}
                onClick={() => {
                  if (p.key === 'custom') { setOpenCustom(o => !o); return }
                  state.setPreset(p.key)
                }}
                style={{
                  padding: '6px 12px', border: 'none', borderRadius: 9,
                  background: active ? '#FFFFFF' : 'transparent',
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontSize: 12, fontWeight: 700,
                  color: active ? '#2C1A0F' : '#7A5C4F',
                  cursor: 'pointer',
                  boxShadow: active ? '0 1px 3px rgba(44,26,15,0.1)' : 'none',
                  transition: 'all .15s',
                }}>{p.label}</button>
            )
          })}
        </div>

        {/* Setas mês (só quando preset = 'mes') */}
        {state.preset === 'mes' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <ArrowBtn dir="left" onClick={() => state.shiftMes(-1)} />
            <span style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 12.5, fontWeight: 700, color: '#2C1A0F',
              padding: '0 10px', minWidth: 130, textAlign: 'center',
            }}>{periodoLabel}</span>
            <ArrowBtn dir="right" onClick={() => state.shiftMes(1)} />
          </div>
        )}
        {state.preset !== 'mes' && state.preset !== 'custom' && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 12px',
            background: '#FBF8F3', border: '1px solid #EDE6DC', borderRadius: 12,
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 12, fontWeight: 700, color: '#2C1A0F',
          }}>
            <IconCalendar size={13} stroke={2} color="#7A5C4F" />
            {periodoLabel}
          </span>
        )}

        <div style={{ flex: 1 }} />

        {/* Filtro Conta */}
        <FilterDropdown
          icon={<IconWallet size={13} stroke={2.2} color={contaSel ? contaSel.cor : '#7A5C4F'} />}
          label={contaSel?.nome ?? 'Todas as contas'}
          active={!!contaSel}
          open={openConta}
          setOpen={setOpenConta}
        >
          <DropdownItem
            label="Todas as contas"
            selected={state.contaId === null}
            onClick={() => { state.setConta(null); setOpenConta(false) }}
          />
          {contas.map(c => (
            <DropdownItem key={c.id}
              label={c.nome}
              swatch={c.cor}
              selected={state.contaId === c.id}
              onClick={() => { state.setConta(c.id!); setOpenConta(false) }}
            />
          ))}
        </FilterDropdown>

        {/* Filtro Categoria */}
        <FilterDropdown
          icon={<IconCategory size={13} stroke={2.2} color={catSel ? catSel.cor : '#7A5C4F'} />}
          label={catSel?.nome ?? 'Todas as categorias'}
          active={!!catSel}
          open={openCat}
          setOpen={setOpenCat}
        >
          <DropdownItem
            label="Todas as categorias"
            selected={state.categoriaId === null}
            onClick={() => { state.setCategoria(null); setOpenCat(false) }}
          />
          {categorias.map(c => (
            <DropdownItem key={c.id}
              label={c.nome}
              swatch={c.cor}
              selected={state.categoriaId === c.id}
              onClick={() => { state.setCategoria(c.id!); setOpenCat(false) }}
            />
          ))}
        </FilterDropdown>

        {/* Tipo */}
        <div style={{ display: 'flex', gap: 4, background: '#FBF8F3', borderRadius: 12, padding: 4, border: '1px solid #EDE6DC' }}>
          {(['todos', 'receita', 'despesa'] as const).map(t => {
            const active = state.tipo === t
            const color = t === 'receita' ? '#1E7D5A' : t === 'despesa' ? '#A8442B' : '#2C1A0F'
            return (
              <button key={t}
                onClick={() => state.setTipo(t)}
                style={{
                  padding: '6px 10px', border: 'none', borderRadius: 9,
                  background: active ? '#FFFFFF' : 'transparent',
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontSize: 11.5, fontWeight: 700,
                  color: active ? color : '#7A5C4F',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  boxShadow: active ? '0 1px 3px rgba(44,26,15,0.1)' : 'none',
                  transition: 'all .15s',
                }}>{t === 'todos' ? 'Todos' : t}</button>
            )
          })}
        </div>

        {/* Reset */}
        {(state.contaId !== null || state.categoriaId !== null || state.tipo !== 'todos' || state.preset !== 'mes') && (
          <button onClick={() => state.reset()}
            title="Limpar filtros"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '6px 10px', border: '1px solid #EDE6DC', borderRadius: 12,
              background: '#FFFFFF', cursor: 'pointer',
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 11.5, fontWeight: 600, color: '#7A5C4F',
            }}>
            <IconRefresh size={12} stroke={2.2} /> Limpar
          </button>
        )}
      </motion.div>

      {/* Custom date picker popover */}
      <AnimatePresence>
        {openCustom && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{
              marginTop: 8,
              background: '#FFFFFF',
              border: '1px solid #EDE6DC',
              borderRadius: 14,
              padding: 14,
              boxShadow: '0 10px 28px rgba(44,26,15,0.12)',
              display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap',
            }}>
            <div>
              <label style={{
                display: 'block', marginBottom: 4,
                fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10,
                fontWeight: 700, color: '#7A5C4F', letterSpacing: '.1em', textTransform: 'uppercase',
              }}>De</label>
              <input type="date" value={state.customStart}
                onChange={e => state.setCustom(e.target.value, state.customEnd)}
                style={INPUT_DATE_STYLE} />
            </div>
            <div>
              <label style={{
                display: 'block', marginBottom: 4,
                fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10,
                fontWeight: 700, color: '#7A5C4F', letterSpacing: '.1em', textTransform: 'uppercase',
              }}>Até</label>
              <input type="date" value={state.customEnd}
                onChange={e => state.setCustom(state.customStart, e.target.value)}
                style={INPUT_DATE_STYLE} />
            </div>
            <button onClick={() => setOpenCustom(false)}
              style={{
                padding: '9px 14px', background: '#C4553B', border: 'none', borderRadius: 10,
                color: '#FFFFFF', cursor: 'pointer',
                fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700,
              }}>Aplicar</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ArrowBtn({ dir, onClick }: { dir: 'left' | 'right'; onClick: () => void }) {
  return (
    <button onClick={onClick}
      style={{
        width: 28, height: 28, borderRadius: 8,
        background: '#FBF8F3', border: '1px solid #EDE6DC',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#7A5C4F',
      }}>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d={dir === 'left' ? 'M7 2L3 6L7 10' : 'M5 2L9 6L5 10'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}

function FilterDropdown({ icon, label, active, open, setOpen, children }: {
  icon: React.ReactNode
  label: string
  active: boolean
  open: boolean
  setOpen: (o: boolean | ((o: boolean) => boolean)) => void
  children: React.ReactNode
}) {
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 10px',
          background: active ? '#FFFFFF' : '#FBF8F3',
          border: active ? '1px solid rgba(196,85,59,0.4)' : '1px solid #EDE6DC',
          borderRadius: 12, cursor: 'pointer',
          fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11.5, fontWeight: 600,
          color: active ? '#2C1A0F' : '#7A5C4F',
          maxWidth: 180,
        }}>
        {icon}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        <IconChevronDown size={12} stroke={2.2} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{
              position: 'absolute', top: 'calc(100% + 6px)', right: 0,
              minWidth: 220, maxHeight: 320, overflowY: 'auto',
              background: '#FFFFFF', border: '1px solid #EDE6DC',
              borderRadius: 12, padding: 4,
              boxShadow: '0 12px 32px rgba(44,26,15,0.15)',
              zIndex: 60,
            }}>
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function DropdownItem({ label, swatch, selected, onClick }: {
  label: string; swatch?: string; selected: boolean; onClick: () => void
}) {
  return (
    <button onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 10px', borderRadius: 8,
        background: selected ? 'rgba(196,85,59,0.08)' : 'transparent',
        border: 'none', cursor: 'pointer', textAlign: 'left',
        fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12.5,
        fontWeight: selected ? 700 : 500, color: '#2C1A0F',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = selected ? 'rgba(196,85,59,0.12)' : '#FBF8F3')}
      onMouseLeave={e => (e.currentTarget.style.background = selected ? 'rgba(196,85,59,0.08)' : 'transparent')}
    >
      {swatch && <span style={{ width: 9, height: 9, borderRadius: 3, background: swatch, flexShrink: 0 }} />}
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      {selected && <IconCheck size={13} stroke={2.4} color="#C4553B" />}
    </button>
  )
}

const INPUT_DATE_STYLE: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 9, border: '1px solid #EDE6DC',
  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12.5,
  color: '#2C1A0F', background: '#FFFFFF', outline: 'none',
}

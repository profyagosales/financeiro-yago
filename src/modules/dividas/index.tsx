import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconPlus, IconCash, IconCalendar, IconCheck } from '@tabler/icons-react'
import { fmt } from '@/lib/format'
import {
  useDividasComputed, useTotalDividas,
  deleteDivida, sincronizarTodasDividas,
} from '@/db/hooks/useDividas'
import type { Divida, DividaTipo } from '@/db/schema'
import { TIPOS, TIPO_META } from './constants'
import { DividaCard } from './DividaCard'
import { DividaForm } from './DividaForm'

export function Page() {
  const dividas = useDividasComputed()
  const { totalDevido, totalParcelaMensal } = useTotalDividas()

  const [filterTipo, setFilterTipo] = useState<DividaTipo | null>(null)
  const [showQuitadas, setShowQuitadas] = useState(false)
  const [editing, setEditing] = useState<Divida | null>(null)
  const [adding, setAdding] = useState(false)

  // Sincroniza ao carregar página (pagamentos da Conta Fixa → Dívida)
  useEffect(() => { sincronizarTodasDividas() }, [])

  const ativas = dividas.filter(d => !d.quitada)
  const quitadas = dividas.filter(d => d.quitada)
  const display = showQuitadas ? quitadas : ativas
  const filtered = filterTipo ? display.filter(d => d.tipo === filterTipo) : display

  // Prazo médio (em meses) das dívidas ativas
  const prazoMedio = useMemo(() => {
    if (ativas.length === 0) return 0
    const total = ativas.reduce((s, d) => s + d.parcelasRestantes, 0)
    return Math.round(total / ativas.length)
  }, [ativas])

  const countByTipo = useMemo(() => {
    const map = new Map<DividaTipo, number>()
    display.forEach(d => map.set(d.tipo, (map.get(d.tipo) ?? 0) + 1))
    return map
  }, [display])

  const handleDelete = async (id: number) => {
    if (confirm('Excluir esta dívida? A Conta Fixa vinculada será desativada também.')) {
      await deleteDivida(id)
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: 32, width: '100%' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, paddingBottom: 18, borderBottom: '1px solid #EDE6DC' }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces',Georgia,serif", fontWeight: 700, fontSize: 38, color: '#2C1A0F', margin: 0, letterSpacing: '-1.5px' }}>Dívidas</h1>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#9B7B6A', marginTop: 4 }}>
            Empréstimos, financiamentos e parcelamentos — pagamentos sincronizam com Contas Fixas
          </p>
        </div>
        <button onClick={() => setAdding(true)}
          style={{
            background: 'linear-gradient(135deg, #D4643A, #C4553B)', color: '#FFFFFF', border: 'none',
            borderRadius: 12, padding: '11px 18px', cursor: 'pointer',
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 6,
            boxShadow: '0 4px 16px rgba(196,85,59,0.35)', flexShrink: 0,
          }}>
          <IconPlus size={16} stroke={2.5} /> Nova dívida
        </button>
      </div>

      {/* Hero stats (terra dark) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        style={{
          position: 'relative',
          background: 'linear-gradient(155deg, #A8442B 0%, #6E2918 100%)',
          borderRadius: 24, padding: '28px 32px',
          boxShadow: '0 8px 32px rgba(168,68,43,0.28)',
          marginBottom: 24, overflow: 'hidden',
        }}>
        {/* Decoração */}
        <svg style={{ position: 'absolute', right: -10, top: -20, width: 220, height: 220, opacity: 0.08, pointerEvents: 'none' }} viewBox="0 0 200 200" fill="none">
          <circle cx="100" cy="100" r="90" stroke="white" strokeWidth="1"/>
          <circle cx="100" cy="100" r="62" stroke="white" strokeWidth="1"/>
          <circle cx="100" cy="100" r="35" stroke="white" strokeWidth="1"/>
        </svg>

        <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 32, alignItems: 'center' }}>
          <div>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: 'rgba(255,212,200,0.7)', letterSpacing: '.18em', textTransform: 'uppercase', margin: 0 }}>
              Saldo devedor total
            </p>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 44, fontWeight: 700, color: '#FFFFFF', margin: '6px 0 0', letterSpacing: '-0.3px', lineHeight: 1 }}>
              {fmt(totalDevido)}
            </p>
            <div style={{ height: 1, background: 'linear-gradient(90deg, rgba(255,200,140,0.4) 0%, rgba(255,255,255,0.08) 60%, transparent 100%)', marginTop: 14 }}/>
          </div>
          <Stat
            icon={<IconCash size={16} stroke={2} color="#FFCDB4" />}
            label="Parcela mensal total"
            value={fmt(totalParcelaMensal)}
          />
          <Stat
            icon={<IconCalendar size={16} stroke={2} color="#FFCDB4" />}
            label="Prazo médio"
            value={`${prazoMedio} ${prazoMedio === 1 ? 'mês' : 'meses'}`}
          />
        </div>
      </motion.div>

      {/* Toggle ativas/quitadas + filtros */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4, background: '#FFFFFF', padding: 4, borderRadius: 12, border: '1px solid #EDE6DC' }}>
          <ToggleBtn active={!showQuitadas} onClick={() => setShowQuitadas(false)}>
            Ativas · {ativas.length}
          </ToggleBtn>
          <ToggleBtn active={showQuitadas} onClick={() => setShowQuitadas(true)}>
            Quitadas · {quitadas.length}
          </ToggleBtn>
        </div>

        {display.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <FilterChip active={filterTipo === null} onClick={() => setFilterTipo(null)}>
              Todos
            </FilterChip>
            {TIPOS.map(t => {
              const c = countByTipo.get(t.value) ?? 0
              if (c === 0) return null
              const active = filterTipo === t.value
              return (
                <FilterChip key={t.value} active={active} cor={t.cor} onClick={() => setFilterTipo(t.value)}>
                  <t.Icon size={12} stroke={2} />
                  {t.label} · {c}
                </FilterChip>
              )
            })}
          </div>
        )}
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        showQuitadas
          ? <EmptyStateQuitadas />
          : <EmptyState onAdd={() => setAdding(true)} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(d => (
            <DividaCard
              key={d.id}
              divida={d}
              onEdit={() => setEditing(d)}
              onDelete={() => d.id !== undefined && handleDelete(d.id)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {(adding || editing) && (
          <DividaForm divida={editing} onClose={() => { setAdding(false); setEditing(null) }} />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: 'rgba(255,212,200,0.6)', letterSpacing: '.1em', textTransform: 'uppercase', margin: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
        {icon}{label}
      </p>
      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 20, fontWeight: 700, color: '#FFFFFF', margin: '4px 0 0', letterSpacing: '-0.3px', lineHeight: 1 }}>
        {value}
      </p>
    </div>
  )
}

function ToggleBtn({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      background: active ? '#A8442B' : 'transparent',
      color: active ? '#FFFFFF' : '#7A5C4F',
      border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer',
      fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700,
      letterSpacing: '.02em',
      transition: 'all .15s',
    }}>{children}</button>
  )
}

function FilterChip({ children, active, cor, onClick }: {
  children: React.ReactNode
  active: boolean
  cor?: string
  onClick: () => void
}) {
  return (
    <button onClick={onClick} style={{
      background: active ? (cor ?? '#2C1A0F') : '#FFFFFF',
      color: active ? '#FFFFFF' : '#7A5C4F',
      border: `1.5px solid ${active ? (cor ?? '#2C1A0F') : '#EDE6DC'}`,
      borderRadius: 22, padding: '6px 12px', cursor: 'pointer',
      fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700,
      display: 'inline-flex', alignItems: 'center', gap: 5,
      letterSpacing: '.02em', transition: 'all .15s',
    }}>{children}</button>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div style={{
      background: '#FFFFFF', border: '1px dashed #D4C8BC', borderRadius: 22,
      padding: '48px 32px', textAlign: 'center',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 20,
        background: 'linear-gradient(135deg, #D4643A, #A8442B)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 24px rgba(168,68,43,0.32)',
      }}>
        <IconCash size={32} stroke={1.6} color="#FFFFFF" />
      </div>
      <div>
        <h3 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700, color: '#2C1A0F', margin: 0, letterSpacing: '-0.6px' }}>
          Sem dívidas cadastradas
        </h3>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#7A5C4F', marginTop: 6, maxWidth: 460 }}>
          Cadastre empréstimos, financiamentos e parcelamentos. Cada dívida cria automaticamente uma Conta Fixa para a parcela mensal — quando você paga, a dívida atualiza sozinha.
        </p>
      </div>
      <button onClick={onAdd} style={{
        background: 'linear-gradient(135deg, #D4643A, #C4553B)', color: '#FFFFFF', border: 'none',
        borderRadius: 12, padding: '11px 20px', cursor: 'pointer',
        fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700,
        display: 'flex', alignItems: 'center', gap: 6,
        boxShadow: '0 4px 16px rgba(196,85,59,0.35)', marginTop: 4,
      }}>
        <IconPlus size={16} stroke={2.5} /> Adicionar primeira dívida
      </button>
    </div>
  )
}

function EmptyStateQuitadas() {
  return (
    <div style={{
      background: '#FFFFFF', border: '1px dashed #D4C8BC', borderRadius: 22,
      padding: '48px 32px', textAlign: 'center',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 20,
        background: 'linear-gradient(135deg, #3A8580, #2C7470)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 24px rgba(58,133,128,0.3)',
      }}>
        <IconCheck size={32} stroke={2} color="#FFFFFF" />
      </div>
      <h3 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700, color: '#2C1A0F', margin: 0, letterSpacing: '-0.6px' }}>
        Nenhuma dívida quitada ainda
      </h3>
      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#7A5C4F', margin: 0, maxWidth: 380 }}>
        Quando uma dívida for totalmente paga, ela aparece aqui no histórico.
      </p>
    </div>
  )
}

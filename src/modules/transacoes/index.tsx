import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  IconPlus, IconSearch, IconReceipt, IconArrowUpRight, IconArrowDownRight,
} from '@tabler/icons-react'
import type { Transacao } from '@/db/schema'
import { db } from '@/db/schema'
import { useContas } from '@/db/hooks/useContas'
import { useCategorias } from '@/db/hooks/useCategorias'
import { fmt } from '@/lib/format'
import { useUIStore } from '@/store/ui'
import { TransactionListRow } from './TransactionListRow'
import { TransactionDetail } from './TransactionDetail'
import { PeriodSelector, buildPeriods, type Period } from './PeriodSelector'
import { Dropdown } from '@/components/ui/Dropdown'

export function Page() {
  const contas = useContas()
  const categorias = useCategorias()
  const { openFab } = useUIStore()

  // Período
  const initialPeriod = useMemo(() => buildPeriods().find(p => p.key === 'mes')!, [])
  const [period, setPeriod] = useState<Period>(initialPeriod)

  // Filtros
  const [search, setSearch] = useState('')
  const [tipos, setTipos] = useState<string[]>([])
  const [contasFiltro, setContasFiltro] = useState<number[]>([])
  const [categoriasFiltro, setCategoriasFiltro] = useState<number[]>([])
  const [statusFiltro, setStatusFiltro] = useState<string[]>([])

  // Seleção
  const [selectedId, setSelectedId] = useState<number | null>(null)

  // Transações do período
  const txsPeriodo = useLiveQuery(
    () => db.transacoes.where('data').between(period.start, period.end, true, true).toArray(),
    [period.start, period.end],
  ) ?? []

  // Aplicar filtros
  const txsFiltradas = useMemo(() => {
    let r = txsPeriodo
    if (tipos.length > 0) r = r.filter(t => tipos.includes(t.tipo))
    if (contasFiltro.length > 0) r = r.filter(t => contasFiltro.includes(t.contaId))
    if (categoriasFiltro.length > 0) r = r.filter(t => categoriasFiltro.includes(t.categoriaId))
    if (statusFiltro.length > 0) r = r.filter(t => statusFiltro.includes(t.status))
    if (search) {
      const q = search.toLowerCase()
      r = r.filter(t => {
        if (t.descricao.toLowerCase().includes(q)) return true
        const cat = categorias.find(c => c.id === t.categoriaId)
        if (cat?.nome.toLowerCase().includes(q)) return true
        const conta = contas.find(c => c.id === t.contaId)
        if (conta?.nome.toLowerCase().includes(q)) return true
        return false
      })
    }
    return r.sort((a, b) => (b.data ?? '').localeCompare(a.data ?? ''))
  }, [txsPeriodo, tipos, contasFiltro, categoriasFiltro, statusFiltro, search, categorias, contas])

  // Stats do período
  const stats = useMemo(() => {
    const rec = txsFiltradas.filter(t => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0)
    const des = txsFiltradas.filter(t => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0)
    return { receitas: rec, despesas: des, saldo: rec - des, total: txsFiltradas.length }
  }, [txsFiltradas])

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, Transacao[]>()
    txsFiltradas.forEach(t => {
      const list = map.get(t.data) ?? []
      list.push(t)
      map.set(t.data, list)
    })
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
  }, [txsFiltradas])

  const selected = txsFiltradas.find(t => t.id === selectedId)
    ?? txsPeriodo.find(t => t.id === selectedId)
    ?? null

  // Quando seleção fica fora do filtro, limpa
  useEffect(() => {
    if (selectedId !== null && !txsFiltradas.some(t => t.id === selectedId)) {
      setSelectedId(null)
    }
  }, [selectedId, txsFiltradas])

  const hasActiveFilters = tipos.length > 0 || contasFiltro.length > 0 || categoriasFiltro.length > 0 || statusFiltro.length > 0 || !!search

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      style={{
        padding: 32, width: '100%',
        height: '100dvh',
        display: 'flex', flexDirection: 'column',
      }}>

      {/* ─── Header ─── */}
      <div style={{ marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid #EDE6DC', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
            <h1 style={{ fontFamily: "'Fraunces',Georgia,serif", fontWeight: 700, fontSize: 38, color: '#2C1A0F', margin: 0, letterSpacing: '-1.5px' }}>
              Transações
            </h1>
            <PeriodSelector period={period} onChange={setPeriod} />
          </div>

          {/* Mini-stats inline + Lançar */}
          <div style={{ display: 'flex', gap: 22, alignItems: 'center' }}>
            <InlineStat icon={<IconArrowUpRight size={14} stroke={2.2} color="#1E7D5A" />} label="Receitas" value={fmt(stats.receitas)} cor="#1E7D5A" />
            <Divider />
            <InlineStat icon={<IconArrowDownRight size={14} stroke={2.2} color="#C4553B" />} label="Despesas" value={fmt(stats.despesas)} cor="#C4553B" />
            <Divider />
            <InlineStat label="Saldo" value={fmt(stats.saldo)} cor={stats.saldo >= 0 ? '#2C1A0F' : '#C4553B'} />
            <button onClick={() => openFab()}
              style={{
                background: 'linear-gradient(135deg, #D4643A, #C4553B)', color: '#FFFFFF', border: 'none',
                borderRadius: 12, padding: '11px 18px', cursor: 'pointer',
                fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 6,
                boxShadow: '0 4px 16px rgba(196,85,59,0.35)', marginLeft: 8,
              }}>
              <IconPlus size={16} stroke={2.5} /> Lançar
            </button>
          </div>
        </div>
      </div>

      {/* ─── Filter bar ─── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexShrink: 0, flexWrap: 'wrap',
      }}>
        {/* Search */}
        <div style={{
          flex: 1, minWidth: 240, maxWidth: 360,
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#FFFFFF', border: '1px solid #EDE6DC',
          borderRadius: 10, padding: '8px 12px',
        }}>
          <IconSearch size={14} stroke={2} color="#9B7B6A" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar transações..."
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 500,
              color: '#2C1A0F',
            }}
          />
          {search && (
            <button onClick={() => setSearch('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9B7B6A', padding: 2, fontSize: 11 }}>✕</button>
          )}
        </div>

        <Dropdown
          label="Tipo"
          items={[
            { value: 'receita',       label: 'Receitas',        cor: '#1E7D5A' },
            { value: 'despesa',       label: 'Despesas',        cor: '#C4553B' },
            { value: 'transferencia', label: 'Transferências',  cor: '#8B4BC8' },
          ]}
          selected={tipos}
          onChange={setTipos}
          width={200}
        />

        <Dropdown
          label="Conta"
          items={contas.map(c => ({ value: c.id!, label: c.nome, cor: c.cor }))}
          selected={contasFiltro}
          onChange={setContasFiltro}
          width={240}
        />

        <Dropdown
          label="Categoria"
          items={categorias.map(c => ({ value: c.id!, label: c.nome, cor: c.cor }))}
          selected={categoriasFiltro}
          onChange={setCategoriasFiltro}
          width={260}
        />

        <Dropdown
          label="Status"
          items={[
            { value: 'efetivada', label: 'Confirmado', cor: '#1E7D5A' },
            { value: 'pago',      label: 'Pago',       cor: '#1E7D5A' },
            { value: 'pendente',  label: 'Pendente',   cor: '#D4A017' },
          ]}
          selected={statusFiltro}
          onChange={setStatusFiltro}
          width={200}
        />

        {hasActiveFilters && (
          <button onClick={() => {
            setSearch('')
            setTipos([])
            setContasFiltro([])
            setCategoriasFiltro([])
            setStatusFiltro([])
          }}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700,
              color: '#C4553B', padding: '4px 8px',
            }}>
            Limpar tudo
          </button>
        )}
      </div>

      {/* ─── Master-detail ─── */}
      <div style={{
        flex: 1, minHeight: 0,
        display: 'grid',
        gridTemplateColumns: selected ? '420px 1fr' : '1fr',
        gap: 16, alignItems: 'stretch',
      }}>
        {/* LEFT — list */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #EDE6DC',
          borderRadius: 22,
          boxShadow: '0 1px 3px rgba(44,26,15,0.05), 0 4px 14px rgba(44,26,15,0.04)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          height: '100%',
          minHeight: 0,
        }}>
          {/* Locked header da lista */}
          <div style={{
            padding: '12px 18px',
            borderBottom: '1px solid #EDE6DC',
            background: '#FBF8F3',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: '#7A5C4F', letterSpacing: '.1em', textTransform: 'uppercase' }}>
              {txsFiltradas.length} {txsFiltradas.length === 1 ? 'transação' : 'transações'}
            </span>
            {stats.saldo !== 0 && (
              <span style={{
                fontFamily: "'Fraunces',Georgia,serif", fontSize: 14, fontWeight: 700,
                color: stats.saldo >= 0 ? '#1E7D5A' : '#C4553B',
                letterSpacing: '-0.4px',
              }}>
                {stats.saldo >= 0 ? '+' : ''}{fmt(stats.saldo)}
              </span>
            )}
          </div>

          {/* Scroll list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px 16px' }}>
            {grouped.length === 0 ? (
              <EmptyList hasFilters={hasActiveFilters} onLancar={() => openFab()} />
            ) : (
              grouped.map(([data, txs]) => {
                const dateInfo = formatGroupDate(data)
                const totalReceitas = txs.filter(t => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0)
                const totalDespesas = txs.filter(t => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0)
                const liq = totalReceitas - totalDespesas
                return (
                  <div key={data} style={{ marginBottom: 14 }}>
                    {/* Date header */}
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '6px 8px 6px 10px', margin: '4px 0 4px',
                    }}>
                      <span style={{
                        fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700,
                        color: '#9B7B6A', letterSpacing: '.12em', textTransform: 'uppercase',
                      }}>{dateInfo.label}</span>
                      <span style={{
                        fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700,
                        color: liq >= 0 ? '#1E7D5A' : '#C4553B',
                        background: liq >= 0 ? 'rgba(58,133,128,0.12)' : 'rgba(196,85,59,0.12)',
                        padding: '2px 8px', borderRadius: 6, letterSpacing: '.02em',
                      }}>
                        {liq >= 0 ? '+' : ''}{fmt(liq)}
                      </span>
                    </div>
                    {txs.map(t => (
                      <TransactionListRow
                        key={t.id}
                        tx={t}
                        active={selectedId === t.id}
                        onClick={() => t.id !== undefined && setSelectedId(t.id)}
                      />
                    ))}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* RIGHT — detail */}
        {selected && (
          <TransactionDetail tx={selected} onClose={() => setSelectedId(null)} />
        )}
      </div>
    </motion.div>
  )
}

// ─── helpers ─────────────────────────────────────────────────────────
function formatGroupDate(data: string): { label: string } {
  const d = new Date(data + 'T00:00:00')
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  const diff = Math.round((hoje.getTime() - d.getTime()) / 86400000)
  if (diff === 0) return { label: 'Hoje · ' + d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) }
  if (diff === 1) return { label: 'Ontem · ' + d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) }
  if (diff > 0 && diff < 7) return { label: d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' }) }
  return { label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) }
}

function InlineStat({ icon, label, value, cor }: { icon?: React.ReactNode; label: string; value: string; cor: string }) {
  return (
    <div>
      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 700, color: '#9B7B6A', letterSpacing: '.12em', textTransform: 'uppercase', margin: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
        {icon}{label}
      </p>
      <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 18, fontWeight: 700, color: cor, margin: '4px 0 0', letterSpacing: '-0.5px', lineHeight: 1 }}>
        {value}
      </p>
    </div>
  )
}

function Divider() {
  return <div style={{ width: 1, height: 32, background: '#EDE6DC' }} />
}

function EmptyList({ hasFilters, onLancar }: { hasFilters: boolean; onLancar: () => void }) {
  if (hasFilters) {
    return (
      <div style={{
        padding: '32px 16px', textAlign: 'center',
        background: '#FBF8F3', border: '1px dashed #D4C8BC',
        borderRadius: 14, margin: 8,
      }}>
        <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 15, fontWeight: 700, color: '#2C1A0F', margin: 0, letterSpacing: '-0.4px' }}>
          Nenhuma transação encontrada
        </p>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#9B7B6A', margin: '6px 0 0' }}>
          Tente ajustar os filtros ou o período
        </p>
      </div>
    )
  }
  return (
    <div style={{
      padding: '40px 24px', textAlign: 'center',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16,
        background: 'linear-gradient(135deg, #D4643A, #C4553B)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 24px rgba(196,85,59,0.32)',
      }}>
        <IconReceipt size={28} stroke={1.6} color="#FFFFFF" />
      </div>
      <div>
        <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 18, fontWeight: 700, color: '#2C1A0F', margin: 0, letterSpacing: '-0.5px' }}>
          Sem transações no período
        </p>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#7A5C4F', margin: '6px 0 0' }}>
          Lance suas receitas e despesas pra começar
        </p>
      </div>
      <button onClick={onLancar} style={{
        background: 'linear-gradient(135deg, #D4643A, #C4553B)', color: '#FFFFFF', border: 'none',
        borderRadius: 12, padding: '10px 18px', cursor: 'pointer',
        fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700,
        display: 'inline-flex', alignItems: 'center', gap: 6,
        boxShadow: '0 4px 16px rgba(196,85,59,0.35)',
      }}>
        <IconPlus size={14} stroke={2.5} /> Lançar primeira
      </button>
    </div>
  )
}

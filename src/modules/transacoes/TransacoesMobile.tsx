// ─── Transações mobile — lista limpa em rows agrupadas por dia ──────
// Mesma identidade do Dashboard mobile (peach gradient + glass).
// Tap em uma transação → StackScreen com detalhe full-screen.
// FAB do nav já cobre "Nova transação" — sem CTA duplicado.

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  IconBell, IconSearch, IconX, IconArrowUpRight, IconArrowDownRight,
  IconFilter, IconCircleCheck, IconArrowsExchange,
  IconCheck, IconTrash, IconClock,
} from '@tabler/icons-react'
import { db, type Transacao } from '@/db/schema'
import { useContas } from '@/db/hooks/useContas'
import { useCategorias } from '@/db/hooks/useCategorias'
import { editTransacao, deleteTransacao } from '@/db/hooks/useTransacoes'
import { fmt, fmtDate } from '@/lib/format'
import { StackScreen } from '@/components/layout/StackScreen'
import { useUIStore } from '@/store/ui'
import { sounds, haptic } from '@/lib/sounds'

// ─── Tokens (mesma identidade Dashboard mobile) ────────────────────
const C = {
  bgTop:    '#FFE2C7',
  bgMid:    '#FFF1DE',
  bgBottom: '#FFE9D7',
  ink:      '#2C1A0F',
  inkSoft:  '#5C4339',
  muted:    '#9B7B6A',
  purple:   '#2A1E3F',
  orange:   '#C4553B',
  orangeBri:'#F1642E',
  gold:     '#D4A017',
  green:    '#1E7D5A',
  glass:        'rgba(255,255,255,0.65)',
  glassStrong:  'rgba(255,255,255,0.85)',
  glassBorder:  'rgba(255,255,255,0.7)',
  glassShadow:  '0 1px 2px rgba(196,85,59,0.06), 0 8px 24px rgba(196,85,59,0.08)',
}

// ─── Animation ─────────────────────────────────────────────────────
const PAGE = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
}
const ITEM = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 200, damping: 24 } },
}

// ─── Preset de período ─────────────────────────────────────────────
type PeriodKey = 'hoje' | 'semana' | 'mes' | 'tudo'
interface Periodo { key: PeriodKey; label: string; start: string; end: string }

function buildPeriodos(): Periodo[] {
  const hoje = new Date()
  const isoHoje = hoje.toISOString().slice(0, 10)
  const inicioSemana = new Date(hoje)
  inicioSemana.setDate(hoje.getDate() - hoje.getDay())
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
  const pad = (d: Date) => d.toISOString().slice(0, 10)
  return [
    { key: 'hoje',   label: 'Hoje',     start: isoHoje, end: isoHoje },
    { key: 'semana', label: 'Semana',   start: pad(inicioSemana), end: isoHoje },
    { key: 'mes',    label: 'Mês',      start: pad(inicioMes), end: pad(fimMes) },
    { key: 'tudo',   label: 'Tudo',     start: '2000-01-01', end: '2999-12-31' },
  ]
}

// ─── Component ─────────────────────────────────────────────────────

export function TransacoesMobile() {
  const periodos = useMemo(buildPeriodos, [])
  const [periodoKey, setPeriodoKey] = useState<PeriodKey>('mes')
  const periodo = periodos.find(p => p.key === periodoKey)!
  const [search, setSearch] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState<'todos' | 'receita' | 'despesa'>('todos')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [showSearch, setShowSearch] = useState(false)

  const contas = useContas()
  const categorias = useCategorias()

  const txs = useLiveQuery(
    () => db.transacoes.where('data').between(periodo.start, periodo.end, true, true).toArray(),
    [periodo.start, periodo.end],
  ) ?? []

  // Filtros aplicados
  const txsFiltradas = useMemo(() => {
    let r = txs
    if (tipoFiltro !== 'todos') r = r.filter(t => t.tipo === tipoFiltro)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      r = r.filter(t => {
        if (t.descricao.toLowerCase().includes(q)) return true
        const cat = categorias.find(c => c.id === t.categoriaId)
        if (cat?.nome.toLowerCase().includes(q)) return true
        const conta = contas.find(c => c.id === t.contaId)
        return !!conta?.nome.toLowerCase().includes(q)
      })
    }
    return r.sort((a, b) => (b.data ?? '').localeCompare(a.data ?? ''))
  }, [txs, search, tipoFiltro, categorias, contas])

  // Stats compactas
  const stats = useMemo(() => {
    const rec = txsFiltradas.filter(t => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0)
    const des = txsFiltradas.filter(t => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0)
    return { receitas: rec, despesas: des, saldo: rec - des, count: txsFiltradas.length }
  }, [txsFiltradas])

  // Agrupa por dia
  const grouped = useMemo(() => {
    const out = new Map<string, Transacao[]>()
    txsFiltradas.forEach(t => {
      const arr = out.get(t.data) ?? []
      arr.push(t)
      out.set(t.data, arr)
    })
    return Array.from(out.entries())
  }, [txsFiltradas])

  const selectedTx = selectedId !== null ? txs.find(t => t.id === selectedId) : null

  return (
    <div style={{
      position: 'relative',
      minHeight: '100dvh',
      width: '100%',
      background: `linear-gradient(180deg, ${C.bgTop} 0%, ${C.bgMid} 35%, ${C.bgBottom} 100%)`,
    }}>
      {/* Halos decorativos */}
      <div aria-hidden style={{
        position: 'absolute', right: -80, top: -120,
        width: 340, height: 340, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(241,100,46,0.18), transparent 65%)',
        filter: 'blur(20px)', pointerEvents: 'none',
      }} />
      <div aria-hidden style={{
        position: 'absolute', left: -100, bottom: -80,
        width: 320, height: 320, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(212,160,23,0.16), transparent 60%)',
        filter: 'blur(28px)', pointerEvents: 'none',
      }} />

      <motion.div
        variants={PAGE} initial="hidden" animate="show"
        style={{
          position: 'relative',
          padding: '16px 18px',
          paddingTop: 'calc(20px + env(safe-area-inset-top))',
          paddingBottom: 'calc(120px + env(safe-area-inset-bottom))',
          display: 'flex', flexDirection: 'column',
          gap: 16,
        }}>

        {/* HEADER */}
        <motion.header variants={ITEM}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h1 style={{
              fontFamily: "'Fraunces',Georgia,serif",
              fontSize: 30, fontWeight: 700,
              color: C.ink, letterSpacing: '-1px',
              margin: 0, lineHeight: 1,
            }}>Transações</h1>
            <p style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 11.5, color: C.muted, margin: '4px 0 0', fontWeight: 500,
            }}>
              {stats.count > 0
                ? `${stats.count} ${stats.count === 1 ? 'movimentação' : 'movimentações'} em ${periodo.label.toLowerCase()}`
                : `Nada lançado em ${periodo.label.toLowerCase()}`}
            </p>
          </div>
          <button onClick={() => setShowSearch(s => !s)}
            aria-label="Buscar"
            style={{
              width: 44, height: 44, borderRadius: 14,
              background: showSearch ? C.purple : 'rgba(255,255,255,0.7)',
              backdropFilter: 'blur(16px)',
              border: showSearch ? 'none' : '1px solid rgba(255,255,255,0.8)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              boxShadow: showSearch
                ? '0 6px 20px rgba(42,30,63,0.32)'
                : '0 4px 14px rgba(196,85,59,0.1)',
              transition: 'all .15s',
            }}>
            {showSearch
              ? <IconX size={19} stroke={2.4} color="#FFFFFF" />
              : <IconSearch size={19} stroke={2} color={C.ink} />}
          </button>
        </motion.header>

        {/* SEARCH (expansível) */}
        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              style={{ overflow: 'hidden' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '12px 14px',
                background: C.glassStrong,
                backdropFilter: 'blur(16px)',
                border: `1px solid ${C.glassBorder}`,
                borderRadius: 14,
                boxShadow: C.glassShadow,
              }}>
                <IconSearch size={16} stroke={2} color={C.muted} />
                <input
                  autoFocus
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar por descrição, categoria, conta…"
                  style={{
                    flex: 1, border: 'none', background: 'transparent', outline: 'none',
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                    fontSize: 13, fontWeight: 500, color: C.ink,
                    minWidth: 0,
                  }}
                />
                {search && (
                  <button onClick={() => setSearch('')}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', padding: 2 }}>
                    <IconX size={14} stroke={2.2} color={C.muted} />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* STATS COMPACTAS */}
        <motion.div variants={ITEM}
          style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
          }}>
          <StatPill label="Recebido" value={stats.receitas} color={C.green} />
          <StatPill label="Gasto" value={stats.despesas} color={C.orange} />
          <StatPill label="Saldo" value={stats.saldo} color={stats.saldo >= 0 ? C.ink : C.orange} signed />
        </motion.div>

        {/* PERÍODO + TIPO (filtros) */}
        <motion.div variants={ITEM}
          style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' }}
          className="filter-row">
          {periodos.map(p => {
            const active = p.key === periodoKey
            return (
              <button key={p.key}
                onClick={() => setPeriodoKey(p.key)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 999,
                  background: active ? C.ink : 'rgba(255,255,255,0.6)',
                  border: active ? 'none' : '1px solid rgba(255,255,255,0.8)',
                  color: active ? '#FFFFFF' : C.inkSoft,
                  cursor: 'pointer',
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontSize: 12, fontWeight: 700,
                  letterSpacing: '.01em',
                  whiteSpace: 'nowrap', flexShrink: 0,
                  boxShadow: active ? '0 4px 14px rgba(44,26,15,0.3)' : 'none',
                  transition: 'all .15s',
                }}>{p.label}</button>
            )
          })}
          <div style={{ width: 6, flexShrink: 0 }} />
          <div style={{ width: 1, background: 'rgba(44,26,15,0.12)', margin: '6px 0', flexShrink: 0 }} />
          <div style={{ width: 6, flexShrink: 0 }} />
          {(['todos', 'receita', 'despesa'] as const).map(t => {
            const active = tipoFiltro === t
            const col = t === 'receita' ? C.green : t === 'despesa' ? C.orange : C.ink
            return (
              <button key={t}
                onClick={() => setTipoFiltro(t)}
                style={{
                  padding: '7px 14px', borderRadius: 999,
                  background: active ? col : 'rgba(255,255,255,0.6)',
                  border: active ? 'none' : '1px solid rgba(255,255,255,0.8)',
                  color: active ? '#FFFFFF' : C.inkSoft,
                  cursor: 'pointer',
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontSize: 12, fontWeight: 700,
                  letterSpacing: '.01em',
                  textTransform: 'capitalize',
                  whiteSpace: 'nowrap', flexShrink: 0,
                  boxShadow: active ? `0 4px 14px ${col}55` : 'none',
                  transition: 'all .15s',
                }}>
                {t === 'todos' ? 'Tudo' : t === 'receita' ? 'Receitas' : 'Despesas'}
              </button>
            )
          })}
        </motion.div>

        {/* LISTA AGRUPADA POR DIA */}
        {grouped.length === 0 ? (
          <EmptyTxs hasFilters={!!search || tipoFiltro !== 'todos'} />
        ) : (
          <motion.div variants={ITEM}
            style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {grouped.map(([data, lista]) => (
              <DayGroup
                key={data}
                data={data}
                txs={lista}
                onSelect={id => setSelectedId(id)}
              />
            ))}
          </motion.div>
        )}

        <style>{`.filter-row::-webkit-scrollbar { display: none; }`}</style>
      </motion.div>

      {/* DETAIL STACK SCREEN */}
      <StackScreen
        open={selectedTx !== null}
        onClose={() => setSelectedId(null)}
        title={selectedTx?.descricao || 'Transação'}
        eyebrow={selectedTx ? (selectedTx.tipo === 'receita' ? 'Receita' : selectedTx.tipo === 'despesa' ? 'Despesa' : 'Transferência') : undefined}
      >
        {selectedTx && (
          <MobileTxDetail
            tx={selectedTx}
            onClose={() => setSelectedId(null)}
          />
        )}
      </StackScreen>
    </div>
  )
}

// ─── Stat pill compacto ────────────────────────────────────────────

function StatPill({ label, value, color, signed }: {
  label: string; value: number; color: string; signed?: boolean
}) {
  const display = signed && value !== 0 ? `${value > 0 ? '+' : ''}${fmt(value).replace('-', '−')}` : fmt(Math.abs(value))
  return (
    <div style={{
      background: C.glass,
      backdropFilter: 'blur(14px)',
      border: `1px solid ${C.glassBorder}`,
      borderRadius: 14,
      padding: '10px 12px',
      display: 'flex', flexDirection: 'column', gap: 2,
      boxShadow: C.glassShadow,
    }}>
      <span style={{
        fontFamily: "'Plus Jakarta Sans',sans-serif",
        fontSize: 9.5, fontWeight: 700, color: C.muted,
        letterSpacing: '.12em', textTransform: 'uppercase',
      }}>{label}</span>
      <span style={{
        fontFamily: "'Plus Jakarta Sans',sans-serif",
        fontSize: 14, fontWeight: 700, color,
        letterSpacing: '-0.3px', lineHeight: 1.1,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>{display}</span>
    </div>
  )
}

// ─── Day group ─────────────────────────────────────────────────────

function DayGroup({ data, txs, onSelect }: {
  data: string; txs: Transacao[]; onSelect: (id: number) => void
}) {
  const hoje = new Date().toISOString().slice(0, 10)
  const ontemDt = new Date(Date.now() - 86400_000).toISOString().slice(0, 10)
  let label: string
  if (data === hoje) label = 'Hoje'
  else if (data === ontemDt) label = 'Ontem'
  else {
    const d = new Date(data + 'T00:00:00')
    label = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }).replace('.', '')
  }
  const total = txs.reduce((s, t) => s + (t.tipo === 'receita' ? t.valor : -t.valor), 0)

  return (
    <section>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 4px 8px',
      }}>
        <span style={{
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          fontSize: 11, fontWeight: 700, color: C.inkSoft,
          letterSpacing: '.14em', textTransform: 'uppercase',
        }}>{label}</span>
        <span style={{
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          fontSize: 11, fontWeight: 700,
          color: total >= 0 ? C.green : C.orange,
        }}>
          {total >= 0 ? '+' : '−'}{fmt(Math.abs(total))}
        </span>
      </div>

      <div style={{
        background: C.glass,
        backdropFilter: 'blur(16px)',
        border: `1px solid ${C.glassBorder}`,
        borderRadius: 18,
        padding: '4px 14px',
        boxShadow: C.glassShadow,
      }}>
        {txs.map((tx, i) => (
          <TxRow key={tx.id ?? i} tx={tx} onClick={() => onSelect(tx.id!)} divider={i > 0} />
        ))}
      </div>
    </section>
  )
}

function TxRow({ tx, onClick, divider }: { tx: Transacao; onClick: () => void; divider: boolean }) {
  const cats = useCategorias()
  const contas = useContas()
  const cat = cats.find(c => c.id === tx.categoriaId)
  const conta = contas.find(c => c.id === tx.contaId)
  const isRec = tx.tipo === 'receita'
  const isTransfer = tx.tipo === 'transferencia'

  return (
    <button
      onClick={() => { haptic('light'); onClick() }}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 0',
        width: '100%',
        background: 'transparent', border: 'none', cursor: 'pointer',
        textAlign: 'left',
        borderTop: divider ? '1px dashed rgba(44,26,15,0.08)' : 'none',
        fontFamily: "'Plus Jakarta Sans',sans-serif",
      }}>
      <div style={{
        width: 36, height: 36, borderRadius: 11,
        background: cat ? `${cat.cor}1f` : 'rgba(155,123,106,0.13)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        position: 'relative',
      }}>
        {isTransfer
          ? <IconArrowsExchange size={17} stroke={2.2} color={cat?.cor ?? '#8B4BC8'} />
          : isRec
          ? <IconArrowUpRight size={17} stroke={2.4} color={cat?.cor ?? C.green} />
          : <IconArrowDownRight size={17} stroke={2.4} color={cat?.cor ?? C.orange} />}
        {tx.status === 'pendente' && (
          <span style={{
            position: 'absolute', top: -2, right: -2,
            width: 10, height: 10, borderRadius: '50%',
            background: C.gold, border: '2px solid #FFE9D7',
          }} />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 13, fontWeight: 600, color: C.ink, margin: 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{tx.descricao || cat?.nome || 'Transação'}</p>
        <p style={{
          fontSize: 11, color: C.muted, margin: '1px 0 0', fontWeight: 500,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {[cat?.nome, conta?.nome].filter(Boolean).join(' · ') || 'Sem categoria'}
        </p>
      </div>
      <span style={{
        fontSize: 14, fontWeight: 700,
        color: isTransfer ? '#8B4BC8' : isRec ? C.green : C.orange,
        letterSpacing: '-0.2px', whiteSpace: 'nowrap',
      }}>
        {isRec ? '+' : isTransfer ? '' : '−'}{fmt(tx.valor).replace('-', '').replace('+', '')}
      </span>
    </button>
  )
}

// ─── Empty state ───────────────────────────────────────────────────

function EmptyTxs({ hasFilters }: { hasFilters: boolean }) {
  const { openFab } = useUIStore()
  return (
    <motion.section variants={ITEM}
      style={{
        background: C.glass,
        backdropFilter: 'blur(16px)',
        border: `1px solid ${C.glassBorder}`,
        borderRadius: 18,
        padding: '28px 20px',
        textAlign: 'center',
        boxShadow: C.glassShadow,
        marginTop: 8,
      }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16, margin: '0 auto 12px',
        background: 'rgba(196,85,59,0.13)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <IconArrowsExchange size={24} stroke={1.8} color={C.orange} />
      </div>
      <p style={{
        fontFamily: "'Fraunces',Georgia,serif",
        fontSize: 18, fontWeight: 700, color: C.ink, margin: 0,
        letterSpacing: '-0.4px',
      }}>
        {hasFilters ? 'Nada encontrado' : 'Sem transações por aqui'}
      </p>
      <p style={{
        fontFamily: "'Plus Jakarta Sans',sans-serif",
        fontSize: 12.5, color: C.muted, margin: '6px 0 0', fontWeight: 500,
        lineHeight: 1.5,
      }}>
        {hasFilters
          ? 'Tente outro período ou limpe os filtros.'
          : 'Use o + na barra inferior pra lançar a primeira.'}
      </p>
    </motion.section>
  )
}

// ─── DETAIL — StackScreen content ──────────────────────────────────

function MobileTxDetail({ tx, onClose }: { tx: Transacao; onClose: () => void }) {
  const cats = useCategorias()
  const contas = useContas()
  const cat = cats.find(c => c.id === tx.categoriaId)
  const conta = contas.find(c => c.id === tx.contaId)
  const isRec = tx.tipo === 'receita'

  const togglePago = async () => {
    if (!tx.id) return
    const novoStatus = tx.status === 'efetivada' ? 'pendente' : 'efetivada'
    await editTransacao(tx.id, { status: novoStatus })
    sounds.success(); haptic('medium')
  }

  const handleDelete = async () => {
    if (!tx.id) return
    if (!confirm('Excluir esta transação?')) return
    await deleteTransacao(tx.id)
    sounds.success(); haptic('heavy')
    onClose()
  }

  return (
    <div style={{
      padding: '20px 18px',
      background: `linear-gradient(180deg, ${C.bgTop} 0%, ${C.bgMid} 50%, ${C.bgBottom} 100%)`,
      minHeight: '100%',
    }}>
      {/* Valor grande */}
      <div style={{ textAlign: 'center', padding: '24px 0 16px' }}>
        <p style={{
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          fontSize: 10.5, fontWeight: 700,
          color: C.muted, letterSpacing: '.18em', textTransform: 'uppercase',
          margin: '0 0 8px',
        }}>{isRec ? 'Receita' : 'Despesa'}</p>
        <h2 style={{
          fontFamily: "'Fraunces',Georgia,serif",
          fontSize: 'clamp(36px, 11vw, 48px)', fontWeight: 700,
          color: isRec ? C.green : C.orange,
          letterSpacing: '-1.4px', lineHeight: 1,
          margin: 0,
        }}>
          {isRec ? '+' : '−'}{fmt(tx.valor).replace('-', '').replace('+', '')}
        </h2>
        <p style={{
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          fontSize: 13, color: C.inkSoft, margin: '10px 0 0', fontWeight: 600,
        }}>{tx.descricao || cat?.nome || 'Transação'}</p>
      </div>

      {/* Info rows */}
      <div style={{
        background: C.glassStrong,
        backdropFilter: 'blur(16px)',
        border: `1px solid ${C.glassBorder}`,
        borderRadius: 18,
        padding: '4px 16px',
        marginTop: 8,
        boxShadow: C.glassShadow,
      }}>
        <InfoRow label="Data" value={fmtDate(tx.data)} />
        <InfoRow label="Categoria" value={cat?.nome ?? '—'} swatch={cat?.cor} divider />
        <InfoRow label="Conta" value={conta?.nome ?? '—'} divider />
        <InfoRow
          label="Status"
          value={
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '3px 9px', borderRadius: 999,
              background: tx.status === 'pago' ? 'rgba(30,125,90,0.14)' : 'rgba(212,160,23,0.16)',
              color: tx.status === 'pago' ? C.green : C.gold,
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 11, fontWeight: 700,
            }}>
              {tx.status === 'pago' ? <IconCheck size={11} stroke={2.4} /> : <IconClock size={11} stroke={2.4} />}
              {tx.status === 'pago' ? 'Pago' : 'Pendente'}
            </span>
          }
          divider
        />
        {tx.notas && (
          <InfoRow label="Notas" value={tx.notas} divider multiline />
        )}
      </div>

      {/* Ações */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 18 }}>
        <button
          onClick={togglePago}
          style={{
            padding: '14px 16px',
            background: tx.status === 'pago'
              ? `rgba(155,123,106,0.14)`
              : `linear-gradient(135deg, ${C.green}, ${C.green}d0)`,
            color: tx.status === 'pago' ? C.inkSoft : '#FFFFFF',
            border: 'none', borderRadius: 14, cursor: 'pointer',
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 14, fontWeight: 700, letterSpacing: '.01em',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: tx.status === 'pago' ? 'none' : '0 8px 22px rgba(30,125,90,0.32)',
          }}>
          {tx.status === 'pago' ? <IconClock size={16} stroke={2.2} /> : <IconCheck size={16} stroke={2.4} />}
          {tx.status === 'pago' ? 'Marcar como pendente' : 'Marcar como pago'}
        </button>
        <button
          onClick={handleDelete}
          style={{
            padding: '12px 16px',
            background: 'rgba(196,85,59,0.08)',
            color: C.orange,
            border: '1px solid rgba(196,85,59,0.25)',
            borderRadius: 14, cursor: 'pointer',
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 13, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
          <IconTrash size={14} stroke={2.2} /> Excluir transação
        </button>
      </div>
    </div>
  )
}

function InfoRow({ label, value, swatch, divider, multiline }: {
  label: string; value: React.ReactNode; swatch?: string; divider?: boolean; multiline?: boolean
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: multiline ? 'column' : 'row',
      alignItems: multiline ? 'flex-start' : 'center',
      justifyContent: 'space-between',
      gap: multiline ? 4 : 12,
      padding: '12px 0',
      borderTop: divider ? '1px dashed rgba(44,26,15,0.08)' : 'none',
      fontFamily: "'Plus Jakarta Sans',sans-serif",
    }}>
      <span style={{
        fontSize: 11, fontWeight: 700, color: C.muted,
        letterSpacing: '.1em', textTransform: 'uppercase',
      }}>{label}</span>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: 13, fontWeight: 600, color: C.ink,
        textAlign: multiline ? 'left' : 'right',
        flex: multiline ? 1 : 'initial',
      }}>
        {swatch && <span style={{ width: 8, height: 8, borderRadius: 3, background: swatch }} />}
        {value}
      </span>
    </div>
  )
}

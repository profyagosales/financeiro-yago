import { useState, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  IconPlus, IconSearch, IconReceipt, IconArrowUpRight, IconArrowDownRight,
  IconClock, IconCalendarEvent, IconTrash, IconCheck, IconX,
  IconKeyboard,
} from '@tabler/icons-react'
import type { Transacao } from '@/db/schema'
import { db } from '@/db/schema'
import { useContas } from '@/db/hooks/useContas'
import { useCategorias } from '@/db/hooks/useCategorias'
import { deleteTransacao, editTransacao } from '@/db/hooks/useTransacoes'
import { fmt } from '@/lib/format'
import { useUIStore } from '@/store/ui'
import { TransactionListRow } from './TransactionListRow'
import { TransactionDetail } from './TransactionDetail'
import { PeriodSelector, buildPeriods, type Period } from './PeriodSelector'
import { Dropdown } from '@/components/ui/Dropdown'
import { Modal } from '@/components/ui/Modal'

export function TransacoesDesktop() {
  const contas = useContas()
  const categorias = useCategorias()
  const { openFab } = useUIStore()
  const searchRef = useRef<HTMLInputElement | null>(null)

  // Período
  const initialPeriod = useMemo(() => buildPeriods().find(p => p.key === 'mes')!, [])
  const [period, setPeriod] = useState<Period>(initialPeriod)

  // Filtros
  const [search, setSearch] = useState('')
  const [tipos, setTipos] = useState<string[]>([])
  const [contasFiltro, setContasFiltro] = useState<number[]>([])
  const [categoriasFiltro, setCategoriasFiltro] = useState<number[]>([])
  const [statusFiltro, setStatusFiltro] = useState<string[]>([])

  // Quick filter state
  const [quickToday, setQuickToday] = useState(false)
  const [quickPendente, setQuickPendente] = useState(false)
  const [quickReceitas, setQuickReceitas] = useState(false)
  const [quickDespesas, setQuickDespesas] = useState(false)

  // Bulk selection
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkSelected, setBulkSelected] = useState<Set<number>>(new Set())
  const [bulkAction, setBulkAction] = useState<'delete' | 'efetivada' | 'pendente' | null>(null)

  // Seleção (detail)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  // Help modal
  const [showHelp, setShowHelp] = useState(false)

  // Transações do período
  const txsPeriodo = useLiveQuery(
    () => db.transacoes.where('data').between(period.start, period.end, true, true).toArray(),
    [period.start, period.end],
  ) ?? []

  // Hoje (pra quick filter)
  const hojeStr = useMemo(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }, [])

  // Aplicar filtros
  const txsFiltradas = useMemo(() => {
    let r = txsPeriodo
    if (quickToday) r = r.filter(t => t.data === hojeStr)
    if (quickPendente) r = r.filter(t => t.status === 'pendente')
    if (quickReceitas) r = r.filter(t => t.tipo === 'receita')
    if (quickDespesas) r = r.filter(t => t.tipo === 'despesa')
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
  }, [txsPeriodo, quickToday, quickPendente, quickReceitas, quickDespesas, hojeStr, tipos, contasFiltro, categoriasFiltro, statusFiltro, search, categorias, contas])

  // Stats do período — exclui transferências (transferId) pra não
  // inflar receitas/despesas. Uma transferência R$1k entre contas próprias
  // contaria 2x (despesa origem + receita destino) sem o filtro.
  const stats = useMemo(() => {
    const semTransfer = txsFiltradas.filter(t => !t.transferId)
    const rec = semTransfer.filter(t => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0)
    const des = semTransfer.filter(t => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0)
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

  // Quando seleção fica fora do filtro, limpa (derived state pattern)
  if (selectedId !== null && !txsFiltradas.some(t => t.id === selectedId)) {
    setSelectedId(null)
  }

  const hasActiveFilters = tipos.length > 0 || contasFiltro.length > 0 || categoriasFiltro.length > 0 || statusFiltro.length > 0 || !!search || quickToday || quickPendente || quickReceitas || quickDespesas

  // ─── Keyboard shortcuts ────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Skip if user is typing in an input/textarea
      const target = e.target as HTMLElement
      const isInputFocused = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
      const cmdKey = e.metaKey || e.ctrlKey

      // / focuses search (works even outside)
      if (e.key === '/' && !isInputFocused) {
        e.preventDefault()
        searchRef.current?.focus()
        return
      }
      // ? mostra help
      if (e.key === '?' && !isInputFocused) {
        e.preventDefault()
        setShowHelp(true)
        return
      }
      if (isInputFocused) return

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        openFab()
      } else if (e.key === 'Escape') {
        if (bulkMode) { setBulkMode(false); setBulkSelected(new Set()) }
        else if (selectedId !== null) setSelectedId(null)
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const ids = txsFiltradas.map(t => t.id).filter((x): x is number => x !== undefined)
        if (ids.length === 0) return
        const idx = selectedId !== null ? ids.indexOf(selectedId) : -1
        const next = e.key === 'ArrowDown'
          ? Math.min(ids.length - 1, idx + 1)
          : Math.max(0, idx - 1)
        setSelectedId(ids[next] ?? ids[0])
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId !== null) {
        e.preventDefault()
        deleteTransacao(selectedId)
        setSelectedId(null)
      } else if (cmdKey && e.key === 'a') {
        e.preventDefault()
        // Select all in bulk
        setBulkMode(true)
        const ids = new Set<number>()
        txsFiltradas.forEach(t => { if (t.id !== undefined) ids.add(t.id) })
        setBulkSelected(ids)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [bulkMode, selectedId, txsFiltradas, openFab])

  // Bulk handlers
  const toggleBulk = (id: number) => {
    setBulkSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setBulkMode(true)
  }

  const handleBulkDelete = async () => {
    for (const id of bulkSelected) await deleteTransacao(id)
    setBulkSelected(new Set())
    setBulkMode(false)
    setBulkAction(null)
  }
  const handleBulkStatus = async (status: 'efetivada' | 'pendente') => {
    for (const id of bulkSelected) await editTransacao(id, { status })
    setBulkSelected(new Set())
    setBulkMode(false)
    setBulkAction(null)
  }

  // Clear all filters
  const clearAll = () => {
    setSearch('')
    setTipos([]); setContasFiltro([]); setCategoriasFiltro([]); setStatusFiltro([])
    setQuickToday(false); setQuickPendente(false); setQuickReceitas(false); setQuickDespesas(false)
  }

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
                background: 'linear-gradient(135deg, #2A1E3F, #504E76)', color: '#FFFFFF', border: 'none',
                borderRadius: 12, padding: '11px 18px', cursor: 'pointer',
                fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 6,
                boxShadow: '0 8px 22px rgba(42,30,63,0.42)', marginLeft: 8,
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
            ref={searchRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar transações... (pressione /)"
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
            { value: 'efetivada', label: 'Efetivada', cor: '#1E7D5A' },
            { value: 'pendente',  label: 'Pendente',  cor: '#D4A017' },
          ]}
          selected={statusFiltro}
          onChange={setStatusFiltro}
          width={200}
        />

        {hasActiveFilters && (
          <button onClick={clearAll}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700,
              color: '#504E76', padding: '4px 8px',
            }}>
            Limpar tudo
          </button>
        )}

        {/* Help shortcut */}
        <button onClick={() => setShowHelp(true)} title="Atalhos de teclado"
          style={{
            marginLeft: 'auto',
            background: '#FFFFFF', border: '1px solid #EDE6DC', borderRadius: 10,
            padding: '8px 10px', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700,
            color: '#7A5C4F',
          }}>
          <IconKeyboard size={13} stroke={2}/> Atalhos
        </button>
      </div>

      {/* ─── Quick filter chips ─── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, flexShrink: 0, flexWrap: 'wrap',
      }}>
        <span style={{
          fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700,
          color: '#9B7B6A', letterSpacing: '.12em', textTransform: 'uppercase',
          marginRight: 6,
        }}>Atalhos:</span>
        <QuickChip icon={<IconCalendarEvent size={11} stroke={2}/>} active={quickToday} onClick={() => setQuickToday(t => !t)}>
          Hoje
        </QuickChip>
        <QuickChip icon={<IconClock size={11} stroke={2}/>} active={quickPendente} cor="#D4A017" onClick={() => setQuickPendente(p => !p)}>
          Pendentes
        </QuickChip>
        <QuickChip icon={<IconArrowUpRight size={11} stroke={2}/>} active={quickReceitas} cor="#1E7D5A" onClick={() => setQuickReceitas(r => !r)}>
          Só receitas
        </QuickChip>
        <QuickChip icon={<IconArrowDownRight size={11} stroke={2}/>} active={quickDespesas} cor="#C4553B" onClick={() => setQuickDespesas(d => !d)}>
          Só despesas
        </QuickChip>
        <div style={{ flex: 1 }} />
        <button onClick={() => {
          if (bulkMode) { setBulkMode(false); setBulkSelected(new Set()) }
          else setBulkMode(true)
        }}
          style={{
            background: bulkMode ? '#2C1A0F' : '#FFFFFF',
            color: bulkMode ? '#FFFFFF' : '#7A5C4F',
            border: `1px solid ${bulkMode ? '#2C1A0F' : '#EDE6DC'}`,
            borderRadius: 10, padding: '6px 12px', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700,
          }}>
          <IconCheck size={11} stroke={2.4}/> {bulkMode ? 'Sair do modo seleção' : 'Selecionar várias'}
        </button>
      </div>

      {/* ─── Bulk action bar (aparece quando há seleção) ─── */}
      <AnimatePresence>
        {bulkSelected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            style={{
              background: '#2C1A0F', color: '#FFFFFF',
              borderRadius: 12, padding: '10px 16px',
              marginBottom: 14,
              display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0,
              boxShadow: '0 8px 24px rgba(28,10,5,0.22)',
            }}>
            <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700 }}>
              {bulkSelected.size} {bulkSelected.size === 1 ? 'selecionada' : 'selecionadas'}
            </span>
            <div style={{ flex: 1 }} />
            <button onClick={() => handleBulkStatus('efetivada')}
              style={{
                background: 'rgba(58,133,128,0.22)', color: '#A7E0DC', border: '1px solid rgba(58,133,128,0.4)',
                borderRadius: 10, padding: '6px 12px', cursor: 'pointer',
                fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', gap: 5,
              }}>
              <IconCheck size={12} stroke={2.4}/> Marcar como efetivada
            </button>
            <button onClick={() => handleBulkStatus('pendente')}
              style={{
                background: 'rgba(212,160,23,0.22)', color: '#F2C745', border: '1px solid rgba(212,160,23,0.4)',
                borderRadius: 10, padding: '6px 12px', cursor: 'pointer',
                fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', gap: 5,
              }}>
              <IconClock size={12} stroke={2.2}/> Pendente
            </button>
            <button onClick={() => setBulkAction('delete')}
              style={{
                background: 'rgba(196,85,59,0.28)', color: '#FFBFAE', border: '1px solid rgba(196,85,59,0.5)',
                borderRadius: 10, padding: '6px 12px', cursor: 'pointer',
                fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', gap: 5,
              }}>
              <IconTrash size={12} stroke={2}/> Excluir
            </button>
            <button onClick={() => { setBulkSelected(new Set()); setBulkMode(false) }}
              style={{
                background: 'transparent', color: 'rgba(255,255,255,0.6)', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer',
                display: 'flex', alignItems: 'center',
              }}>
              <IconX size={14} stroke={2}/>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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
                fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 700,
                color: stats.saldo >= 0 ? '#1E7D5A' : '#C4553B',
                letterSpacing: '-0.3px',
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
              grouped.map(([data, txs], groupIdx) => {
                const dateInfo = formatGroupDate(data)
                const totalReceitas = txs.filter(t => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0)
                const totalDespesas = txs.filter(t => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0)
                const liq = totalReceitas - totalDespesas
                return (
                  <motion.div key={data}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: Math.min(groupIdx * 0.04, 0.2) }}
                    style={{ marginBottom: 14 }}>
                    {/* Date header — sticky dentro do scroll */}
                    <div style={{
                      position: 'sticky', top: -8, zIndex: 5,
                      background: 'linear-gradient(180deg, #FFFFFF 0%, #FFFFFF 80%, rgba(255,255,255,0) 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 8px 8px 10px', marginBottom: 4,
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
                    <AnimatePresence initial={false}>
                      {txs.map((t, rowIdx) => (
                        <motion.div key={t.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -8 }}
                          transition={{ duration: 0.2, delay: Math.min(rowIdx * 0.02, 0.12) }}
                        >
                          <TransactionListRow
                            tx={t}
                            active={!bulkMode && selectedId === t.id}
                            bulkMode={bulkMode}
                            bulkSelected={t.id !== undefined && bulkSelected.has(t.id)}
                            onClick={() => {
                              if (bulkMode) {
                                if (t.id !== undefined) toggleBulk(t.id)
                              } else {
                                if (t.id !== undefined) setSelectedId(t.id)
                              }
                            }}
                            onToggleBulk={() => t.id !== undefined && toggleBulk(t.id)}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>
                )
              })
            )}
          </div>
        </div>

        {/* RIGHT — detail */}
        {selected && !bulkMode && (
          <TransactionDetail tx={selected} onClose={() => setSelectedId(null)} />
        )}
      </div>

      {/* Bulk delete confirm */}
      <Modal
        open={bulkAction === 'delete'}
        onClose={() => setBulkAction(null)}
        size="sm"
        title={`Excluir ${bulkSelected.size} ${bulkSelected.size === 1 ? 'transação' : 'transações'}?`}
        subtitle="Esta ação não pode ser desfeita"
        icon={<IconTrash size={20} stroke={1.8} color="#C4553B" />}
      >
        <Modal.Body>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#7A5C4F', lineHeight: 1.5, margin: 0 }}>
            Os saldos das contas envolvidas serão ajustados automaticamente.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <button onClick={() => setBulkAction(null)}
            style={{ background: 'transparent', color: '#7A5C4F', border: '1.5px solid #EDE6DC', borderRadius: 12, padding: '11px 20px', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700 }}>
            Cancelar
          </button>
          <button onClick={handleBulkDelete}
            style={{ background: 'linear-gradient(135deg, #D4643A, #C4553B)', color: '#FFFFFF', border: 'none', borderRadius: 12, padding: '11px 22px', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 7, boxShadow: '0 4px 16px rgba(196,85,59,0.35)' }}>
            <IconTrash size={15} stroke={2.4} /> Excluir {bulkSelected.size}
          </button>
        </Modal.Footer>
      </Modal>

      {/* Help / Shortcuts modal */}
      <Modal
        open={showHelp}
        onClose={() => setShowHelp(false)}
        size="md"
        title="Atalhos de teclado"
        subtitle="Acelere seu fluxo de trabalho"
        icon={<IconKeyboard size={20} stroke={1.8} color="#7A5C4F" />}
      >
        <Modal.Body>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Shortcut keys={['N']} label="Nova transação" />
            <Shortcut keys={['/']} label="Focar busca" />
            <Shortcut keys={['↑', '↓']} label="Navegar entre transações" />
            <Shortcut keys={['Esc']} label="Fechar detalhe ou seleção" />
            <Shortcut keys={['Del']} label="Excluir transação selecionada" />
            <Shortcut keys={['⌘', 'A']} label="Selecionar todas (modo bulk)" />
            <Shortcut keys={['?']} label="Mostrar esta ajuda" />
          </div>
        </Modal.Body>
      </Modal>
    </motion.div>
  )
}

function Shortcut({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 12px', background: '#FBF8F3', borderRadius: 10,
    }}>
      <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 600, color: '#2C1A0F' }}>
        {label}
      </span>
      <div style={{ display: 'flex', gap: 4 }}>
        {keys.map((k, i) => (
          <kbd key={i} style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            minWidth: 24, height: 24, padding: '0 6px',
            background: '#FFFFFF', border: '1px solid #EDE6DC', borderRadius: 6,
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700,
            color: '#2C1A0F',
            boxShadow: '0 1px 2px rgba(28,10,5,0.06)',
          }}>{k}</kbd>
        ))}
      </div>
    </div>
  )
}

function QuickChip({ children, icon, active, cor = '#2C1A0F', onClick }: {
  children: React.ReactNode
  icon?: React.ReactNode
  active: boolean
  cor?: string
  onClick: () => void
}) {
  return (
    <button onClick={onClick}
      style={{
        background: active ? cor : '#FFFFFF',
        color: active ? '#FFFFFF' : '#7A5C4F',
        border: `1px solid ${active ? cor : '#EDE6DC'}`,
        borderRadius: 16, padding: '5px 10px', cursor: 'pointer',
        fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700,
        display: 'inline-flex', alignItems: 'center', gap: 5,
        whiteSpace: 'nowrap',
        transition: 'all .12s',
      }}>
      {icon}{children}
    </button>
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
      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 18, fontWeight: 700, color: cor, margin: '4px 0 0', letterSpacing: '-0.3px', lineHeight: 1 }}>
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
        background: 'linear-gradient(135deg, #2A1E3F, #504E76)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 10px 26px rgba(42,30,63,0.4)',
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
        background: 'linear-gradient(135deg, #2A1E3F, #504E76)', color: '#FFFFFF', border: 'none',
        borderRadius: 12, padding: '10px 18px', cursor: 'pointer',
        fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700,
        display: 'inline-flex', alignItems: 'center', gap: 6,
        boxShadow: '0 8px 22px rgba(42,30,63,0.4)',
      }}>
        <IconPlus size={14} stroke={2.5} /> Lançar primeira
      </button>
    </div>
  )
}

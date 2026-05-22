import { useState, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { BarChart, Bar, ResponsiveContainer, Tooltip } from 'recharts'
import { useTransacoes, deleteTransacao, editTransacao } from '@/db/hooks/useTransacoes'
import { useAnexos, addAnexo, deleteAnexo } from '@/db/hooks/useAnexos'
import { useCategorias } from '@/db/hooks/useCategorias'
import { useContas } from '@/db/hooks/useContas'
import { fmt, fmtDate } from '@/lib/format'
import { db } from '@/db/schema'
import { Dobrao } from '@/components/mascot/Dobrao'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { IconEdit, IconTrash, IconPaperclip, IconX, IconSearch, IconClock, IconCheck, IconFilter, IconArrowUpRight, IconArrowDownRight } from '@tabler/icons-react'

const DISPLAY: React.CSSProperties = { fontFamily: "'Fraunces',Georgia,serif", fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1.1 }
const LABEL: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#9B7B6A' }
const BODY: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans',sans-serif" }

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return `${r},${g},${b}`
}

// ── Mini sparkline hook ────────────────────────────────────────────────────
function useSparklineData(mes: number | null, ano: number, txs: any[]) {
  if (!mes) return []
  const diasNoMes = new Date(ano, mes, 0).getDate()
  const map: Record<number, number> = {}
  txs
    .filter(t => t.tipo === 'despesa' && t.data.startsWith(`${ano}-${String(mes).padStart(2,'0')}`))
    .forEach(t => {
      const dia = parseInt(t.data.split('-')[2])
      map[dia] = (map[dia] ?? 0) + t.valor
    })
  return Array.from({ length: diasNoMes }, (_, i) => ({ dia: i + 1, valor: map[i + 1] ?? 0 }))
}

function EditTxModal({ tx, onClose }: { tx: any; onClose: () => void }) {
  const [valor, setValor] = useState(String(tx.valor))
  const [desc, setDesc] = useState(tx.descricao)
  const [catId, setCatId] = useState(tx.categoriaId)
  const [contaId, setContaId] = useState(tx.contaId)
  const [data, setData] = useState(tx.data)
  const categorias = useCategorias(tx.tipo)
  const contas = useContas()

  const handleSave = async () => {
    await editTransacao(tx.id, { valor: parseFloat(valor.replace(',', '.')) || tx.valor, descricao: desc, categoriaId: catId, contaId, data })
    onClose()
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(20,8,0,0.65)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 520, background: '#FFFDF9', borderRadius: '28px 28px 0 0', padding: '8px 22px 48px', maxHeight: '90dvh', overflowY: 'auto' }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: '#E8E0D5', margin: '12px auto 20px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h3 style={{ ...DISPLAY, fontSize: 22, color: '#2C1A0F' }}>Editar lançamento</h3>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: tx.tipo === 'receita' ? '#EBF5F0' : '#FAF0EE', marginTop: 6 }}>
              {tx.tipo === 'receita' ? <IconArrowUpRight size={11} color="#3A8580" stroke={2.5} /> : <IconArrowDownRight size={11} color="#C4553B" stroke={2.5} />}
              <span style={{ ...BODY, fontSize: 11, fontWeight: 700, color: tx.tipo === 'receita' ? '#3A8580' : '#C4553B' }}>
                {tx.tipo === 'receita' ? 'Receita' : 'Despesa'}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: '#F5F0E8', border: 'none', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconX size={16} color="#9B7B6A" />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 14, padding: '12px 15px', gap: 8, marginBottom: 12 }}>
          <span style={{ ...DISPLAY, fontSize: 18, color: tx.tipo === 'receita' ? '#3A8580' : '#C4553B' }}>R$</span>
          <input value={valor} onChange={e => setValor(e.target.value)} type="tel"
            style={{ border: 'none', background: 'transparent', ...DISPLAY, fontSize: 26, color: '#2C1A0F', flex: 1, outline: 'none' }} />
        </div>
        <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descrição"
          style={{ width: '100%', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 13, padding: '12px 15px', ...BODY, fontSize: 14, color: '#2C1A0F', outline: 'none', marginBottom: 10, boxSizing: 'border-box' }} />
        <input value={data} onChange={e => setData(e.target.value)} type="date"
          style={{ width: '100%', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 13, padding: '12px 15px', ...BODY, fontSize: 14, color: '#2C1A0F', outline: 'none', marginBottom: 14, boxSizing: 'border-box' }} />

        {contas.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <p style={{ ...LABEL, marginBottom: 8 }}>CONTA</p>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {contas.map(c => (
                <button key={c.id} onClick={() => setContaId(c.id!)}
                  style={{ padding: '7px 13px', borderRadius: 20, border: contaId === c.id ? `2px solid ${c.cor}` : '1.5px solid #E8E0D5', cursor: 'pointer', background: contaId === c.id ? `${c.cor}18` : 'white', ...BODY, fontSize: 12, fontWeight: 600, color: contaId === c.id ? c.cor : '#7A5C4F', display: 'flex', alignItems: 'center', gap: 5, transition: 'all .15s' }}>
                  <div style={{ width: 9, height: 9, borderRadius: '50%', background: c.cor }} />{c.nome}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginBottom: 22 }}>
          <p style={{ ...LABEL, marginBottom: 10 }}>CATEGORIA</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', gap: 7 }}>
            {categorias.map(c => (
              <motion.button key={c.id} onClick={() => setCatId(c.id!)} whileTap={{ scale: 0.92 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 4px', borderRadius: 14, border: catId === c.id ? `2px solid ${c.cor}` : '1.5px solid #EDE6DC', background: catId === c.id ? `${c.cor}12` : 'white', cursor: 'pointer', boxShadow: catId === c.id ? `0 2px 8px ${c.cor}30` : 'none', transition: 'all .15s' }}>
                <CategoryIcon nome={c.nome} cor={c.cor} size={36} radius={10} />
                <span style={{ ...BODY, fontSize: 9, fontWeight: 600, color: catId === c.id ? c.cor : '#7A5C4F', textAlign: 'center', lineHeight: 1.2 }}>{c.nome}</span>
              </motion.button>
            ))}
          </div>
        </div>

        <motion.button onClick={handleSave} whileTap={{ scale: 0.97 }}
          style={{ width: '100%', padding: '15px 0', borderRadius: 15, border: 'none', cursor: 'pointer', background: '#C4553B', color: 'white', ...BODY, fontSize: 15, fontWeight: 700, boxShadow: '0 4px 16px rgba(196,85,59,0.3)' }}>
          Salvar alterações
        </motion.button>
      </motion.div>
    </motion.div>
  )
}

function TxRow({ tx, i }: { tx: any; i: number }) {
  const [cat, setCat] = useState<any>(null)
  const [conta, setConta] = useState<any>(null)
  const [showActions, setShowActions] = useState(false)
  const [showAnexos, setShowAnexos] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [hovered, setHovered] = useState(false)
  const anexos = useAnexos(tx.id!)
  const fileRef = useRef<HTMLInputElement>(null)

  useState(() => {
    db.categorias.get(tx.categoriaId).then(setCat)
    db.contas.get(tx.contaId).then(setConta)
  })

  const catCor = cat?.cor ?? '#9B8A7A'
  const isReceita = tx.tipo === 'receita'

  // Badge da conta: sigla de 2 letras
  const contaSigla = conta?.nome
    ? conta.nome.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
    : ''

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.03, type: 'spring', stiffness: 300, damping: 25 }}
        onClick={() => setShowActions(s => !s)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          borderRadius: 18, cursor: 'pointer', overflow: 'hidden',
          background: showActions
            ? `rgba(${hexToRgb(catCor)}, 0.07)`
            : hovered
              ? 'rgba(196,85,59,0.03)'
              : '#FFFFFF',
          border: showActions
            ? `1.5px solid rgba(${hexToRgb(catCor)}, 0.35)`
            : '1px solid #EDE6DC',
          boxShadow: '0 1px 3px rgba(44,26,15,0.04)',
          transition: 'background .12s, border .18s, box-shadow .18s',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '11px 16px' }}>
          <CategoryIcon nome={cat?.nome ?? ''} cor={catCor} size={38} radius={12} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ ...BODY, fontSize: 13, fontWeight: 700, color: '#2C1A0F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.descricao}</p>
            <div style={{ display: 'flex', gap: 6, marginTop: 3, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ ...BODY, fontSize: 11, fontWeight: 600, color: catCor }}>{cat?.nome}</span>
              <span style={{ color: '#D0C4B8', fontSize: 9 }}>•</span>
              <span style={{ ...BODY, fontSize: 11, color: '#9B7B6A' }}>{fmtDate(tx.data)}</span>
              {conta && (
                <span style={{
                  ...BODY, fontSize: 10, fontWeight: 700,
                  background: `rgba(${hexToRgb(conta.cor)},0.10)`,
                  color: conta.cor,
                  padding: '2px 8px 2px 5px',
                  borderRadius: 20,
                  border: `1px solid rgba(${hexToRgb(conta.cor)},0.18)`,
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                }}>
                  <span style={{
                    background: conta.cor, color: 'white',
                    borderRadius: 20, padding: '0px 4px',
                    fontSize: 9, fontWeight: 800, lineHeight: '16px',
                    letterSpacing: '.03em',
                  }}>{contaSigla}</span>
                  {conta.nome}
                </span>
              )}
              {tx.status === 'pendente' && (
                <span style={{ ...BODY, fontSize: 10, background: '#FDF4E3', color: '#D4A017', padding: '2px 7px', borderRadius: 20, fontWeight: 700, border: '1px solid #F0D8A8', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <IconClock size={9} stroke={2.5} color="#D4A017" /> pendente
                </span>
              )}
              {anexos.length > 0 && <IconPaperclip size={12} color="#3A8580" stroke={1.8} />}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ ...DISPLAY, fontSize: 17, color: isReceita ? '#3A8580' : '#C4553B' }}>
              {isReceita ? '+' : '−'}{fmt(tx.valor)}
            </p>
          </div>
        </div>

        <AnimatePresence>
          {showActions && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              style={{ overflow: 'hidden' }}>
              <div style={{ display: 'flex', borderTop: `1px solid rgba(${hexToRgb(catCor)},0.15)` }}>
                {[
                  { label: 'Editar', icon: <IconEdit size={13} stroke={1.8} />, color: '#C4553B', bg: `rgba(${hexToRgb(catCor)},0.07)`, action: () => setShowEdit(true) },
                  { label: `Anexos${anexos.length > 0 ? ` (${anexos.length})` : ''}`, icon: <IconPaperclip size={13} stroke={1.8} />, color: '#3A8580', bg: 'rgba(58,133,128,0.06)', action: () => setShowAnexos(true) },
                  { label: 'Excluir', icon: <IconTrash size={13} stroke={1.8} />, color: '#9B7B6A', bg: 'rgba(155,123,106,0.06)', action: () => tx.id && deleteTransacao(tx.id) },
                ].map((btn, bi) => (
                  <button key={bi} onClick={e => { e.stopPropagation(); btn.action() }}
                    style={{ flex: 1, padding: '11px 0', border: 'none', background: btn.bg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, ...BODY, fontSize: 12, fontWeight: 600, color: btn.color, borderRight: bi < 2 ? `1px solid rgba(${hexToRgb(catCor)},0.12)` : 'none' }}>
                    {btn.icon}{btn.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {showEdit && <EditTxModal tx={tx} onClose={() => setShowEdit(false)} />}
        {showAnexos && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowAnexos(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(20,8,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: 520, background: '#FFFDF9', borderRadius: '28px 28px 0 0', padding: '8px 22px 48px', maxHeight: '80dvh', overflowY: 'auto' }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: '#E8E0D5', margin: '12px auto 18px' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ ...DISPLAY, fontSize: 20, color: '#2C1A0F' }}>Anexos</h3>
                <div style={{ display: 'flex', gap: 8 }}>
                  <motion.button whileTap={{ scale: 0.95 }} onClick={() => fileRef.current?.click()}
                    style={{ background: '#C4553B', color: 'white', border: 'none', borderRadius: 11, padding: '8px 14px', ...BODY, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>+ Adicionar</motion.button>
                  <button onClick={() => setShowAnexos(false)} style={{ background: '#F5F0E8', border: 'none', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IconX size={16} color="#9B7B6A" />
                  </button>
                </div>
                <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={async e => { const f = e.target.files?.[0]; if (f && tx.id) await addAnexo(tx.id, f) }} />
              </div>
              {anexos.length === 0
                ? <p style={{ ...BODY, fontSize: 14, color: '#9B7B6A', textAlign: 'center', padding: '24px 0' }}>Nenhum anexo</p>
                : anexos.map(a => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#FAF6F0', borderRadius: 14, padding: '11px 13px', marginBottom: 8 }}>
                    {a.tipo.startsWith('image/')
                      ? <img src={a.dados} alt="" onClick={() => window.open(a.dados, '_blank')} style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 10, cursor: 'pointer', flexShrink: 0 }} />
                      : <div style={{ width: 52, height: 52, background: '#3D7EB5', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }} onClick={() => { const l = document.createElement('a'); l.href = a.dados; l.download = a.nomeArquivo; l.click() }}>
                          <IconPaperclip size={22} color="white" stroke={1.5} />
                        </div>}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ ...BODY, fontSize: 12, fontWeight: 600, color: '#2C1A0F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.nomeArquivo}</p>
                      <p style={{ ...BODY, fontSize: 11, color: '#9B7B6A' }}>{(a.tamanho/1024).toFixed(0)} KB</p>
                    </div>
                    <button onClick={() => a.id && deleteAnexo(a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <IconX size={15} stroke={2} color="#C4B4A8" />
                    </button>
                  </div>
                ))
              }
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function groupByDate(txs: any[]) {
  const groups: Record<string, any[]> = {}
  txs.forEach(tx => {
    if (!groups[tx.data]) groups[tx.data] = []
    groups[tx.data].push(tx)
  })
  return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a))
}

function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: '#FFFFFF',
      border: `1.5px solid ${focused || value ? '#C4553B' : '#E8E0D5'}`,
      borderRadius: 14,
      padding: '10px 16px',
      marginBottom: 12,
      boxShadow: focused || value ? '0 0 0 4px rgba(196,85,59,0.08)' : '0 1px 3px rgba(44,26,15,0.05)',
      transition: 'all .2s',
    }}>
      <IconSearch size={16} color={focused ? '#C4553B' : '#9B7B6A'} stroke={1.8} style={{ transition: 'color .18s', flexShrink: 0 }} />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Buscar transações..."
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{ flex: 1, border: 'none', background: 'transparent', ...BODY, fontSize: 14, color: '#2C1A0F', outline: 'none' }}
      />
      {value && (
        <button onClick={() => onChange('')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0 }}>
          <IconX size={14} color="#C4B4A8" />
        </button>
      )}
    </div>
  )
}

export function Page() {
  const transacoes = useTransacoes(200)
  const contas = useContas()
  const categoriasTodas = useCategorias()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [busca, setBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'receita' | 'despesa'>('todos')
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'confirmado' | 'pendente'>('todos')
  const [filtroCategoria, setFiltroCategoria] = useState<number | null>(null)
  const [filtroMes, setFiltroMes] = useState<number | null>(null)
  const [filtroAno, setFiltroAno] = useState<number>(new Date().getFullYear())

  const filtroContaId = searchParams.get('conta') ? Number(searchParams.get('conta')) : null
  const contaFiltrada = filtroContaId ? contas.find(c => c.id === filtroContaId) : null

  const filtradas = transacoes.filter(tx => {
    const okTipo = filtroTipo === 'todos' || tx.tipo === filtroTipo
    const okBusca = !busca || tx.descricao.toLowerCase().includes(busca.toLowerCase())
    const okConta = !filtroContaId || tx.contaId === filtroContaId
    const okStatus = filtroStatus === 'todos' || (tx.status ?? 'confirmado') === filtroStatus
    const okCat = !filtroCategoria || tx.categoriaId === filtroCategoria
    const okMes = !filtroMes || tx.data.startsWith(`${filtroAno}-${String(filtroMes).padStart(2,'0')}`)
    return okTipo && okBusca && okConta && okStatus && okCat && okMes
  })

  // Sparkline data calculated from all transactions (not just filtered)
  const sparklineData = useSparklineData(filtroMes, filtroAno, transacoes)

  const grupos = groupByDate(filtradas)
  const hoje = new Date().toISOString().split('T')[0]
  const ontem = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const labelData = (d: string) => d === hoje ? 'Hoje' : d === ontem ? 'Ontem' : new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  const hasFilter = filtroTipo !== 'todos' || filtroStatus !== 'todos' || filtroCategoria !== null || filtroMes !== null

  return (
    <div style={{ padding: '32px', width: '100%', paddingBottom: 32 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ ...DISPLAY, fontSize: 38, color: '#2C1A0F', letterSpacing: '-1.5px' }}>Transações</h1>
          {contaFiltrada && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: contaFiltrada.cor }} />
              <span style={{ ...BODY, fontSize: 12, fontWeight: 600, color: contaFiltrada.cor }}>{contaFiltrada.nome}</span>
              <button onClick={() => navigate('/transacoes')} style={{ background: 'none', border: 'none', cursor: 'pointer', ...BODY, fontSize: 11, color: '#9B7B6A', padding: 0 }}>× limpar</button>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {hasFilter && (
            <button onClick={() => { setFiltroTipo('todos'); setFiltroStatus('todos'); setFiltroCategoria(null); setFiltroMes(null) }}
              style={{ ...BODY, fontSize: 11, fontWeight: 600, color: '#9B7B6A', background: '#F5F0E8', border: 'none', borderRadius: 20, padding: '6px 12px', cursor: 'pointer' }}>
              Limpar filtros
            </button>
          )}
          <div style={{ ...BODY, fontSize: 12, fontWeight: 600, color: '#7A5C4F', background: '#F5F0E8', padding: '6px 14px', borderRadius: 20 }}>
            {filtradas.length} item{filtradas.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Search bar with focus transition */}
      <SearchBar value={busca} onChange={setBusca} />

      {/* Month filter pills */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, overflowX: 'auto', paddingBottom: 4 }}>
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => setFiltroMes(null)}
          style={{ padding: '6px 12px', borderRadius: 20, border: filtroMes === null ? 'none' : '1.5px solid #E8E0D5', cursor: 'pointer', ...BODY, fontSize: 11, fontWeight: 700, background: filtroMes === null ? '#2C1A0F' : 'transparent', color: filtroMes === null ? 'white' : '#7A5C4F', whiteSpace: 'nowrap', flexShrink: 0, transition: 'all .15s' }}>
          Todos
        </motion.button>
        {Array.from({ length: 12 }, (_, idx) => {
          const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - idx)
          const m = d.getMonth() + 1, a = d.getFullYear()
          const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
          const active = filtroMes === m && filtroAno === a
          return (
            <motion.button key={`${a}-${m}`} whileTap={{ scale: 0.95 }} onClick={() => { setFiltroMes(m); setFiltroAno(a) }}
              style={{ padding: '6px 12px', borderRadius: 20, border: active ? 'none' : '1.5px solid #E8E0D5', cursor: 'pointer', ...BODY, fontSize: 11, fontWeight: active ? 700 : 500, background: active ? '#C4553B' : 'transparent', color: active ? 'white' : '#7A5C4F', whiteSpace: 'nowrap', flexShrink: 0, textTransform: 'capitalize', transition: 'all .15s', boxShadow: active ? '0 2px 8px rgba(196,85,59,0.25)' : 'none' }}>
              {label}
            </motion.button>
          )
        })}
      </div>

      {/* Tipo + Status filter bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Tipo */}
        <div style={{ display: 'flex', background: '#F5F0E8', borderRadius: 12, padding: 3, gap: 3 }}>
          {([['todos', 'Todos', null], ['receita', '+ Receitas', '#3A8580'], ['despesa', '− Despesas', '#C4553B']] as const).map(([val, label, cor]) => (
            <button key={val} onClick={() => setFiltroTipo(val as any)}
              style={{ padding: '7px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', ...BODY, fontSize: 12, fontWeight: 700, transition: 'all .15s',
                background: filtroTipo === val ? (cor ?? '#2C1A0F') : 'transparent',
                color: filtroTipo === val ? 'white' : '#7A5C4F',
                boxShadow: filtroTipo === val ? `0 2px 8px ${cor ?? '#2C1A0F'}30` : 'none' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Status */}
        <div style={{ display: 'flex', background: '#F5F0E8', borderRadius: 12, padding: 3, gap: 3 }}>
          {([['todos', 'Todos', null], ['confirmado', null, '#3A8580'], ['pendente', null, '#D4A017']] as const).map(([val, , cor]) => (
            <button key={val} onClick={() => setFiltroStatus(val as any)}
              style={{ padding: '7px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', ...BODY, fontSize: 11, fontWeight: 700, transition: 'all .15s',
                background: filtroStatus === val ? 'white' : 'transparent',
                color: filtroStatus === val ? (cor ?? '#2C1A0F') : '#7A5C4F',
                boxShadow: filtroStatus === val ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                display: 'flex', alignItems: 'center', gap: 4 }}>
              {val === 'confirmado' && <IconCheck size={11} stroke={2.5} />}
              {val === 'pendente' && <IconClock size={11} stroke={2} />}
              {val === 'todos' ? 'Todos' : val === 'confirmado' ? 'Pago' : 'Pendente'}
            </button>
          ))}
        </div>

        {hasFilter && (
          <button onClick={() => { setFiltroTipo('todos'); setFiltroStatus('todos'); setFiltroCategoria(null); setFiltroMes(null) }}
            style={{ padding: '7px 12px', borderRadius: 10, border: '1.5px solid #E8E0D5', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, ...BODY, fontSize: 11, fontWeight: 600, color: '#9B7B6A', transition: 'all .15s' }}>
            <IconFilter size={11} stroke={2} />Limpar
          </button>
        )}
      </div>

      {/* Category filter pills — no emojis, uses CategoryIcon */}
      {categoriasTodas.length > 0 && (
        <div style={{ display: 'flex', gap: 7, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => setFiltroCategoria(null)}
            style={{ padding: '7px 14px', borderRadius: 20, border: filtroCategoria === null ? 'none' : '1.5px solid #E8E0D5', cursor: 'pointer', ...BODY, fontSize: 11, fontWeight: 700, background: filtroCategoria === null ? '#F5F0E8' : 'transparent', color: filtroCategoria === null ? '#2C1A0F' : '#9B7B6A', whiteSpace: 'nowrap', flexShrink: 0 }}>
            Todas
          </motion.button>
          {categoriasTodas.map(c => (
            <motion.button key={c.id} whileTap={{ scale: 0.95 }} onClick={() => setFiltroCategoria(filtroCategoria === c.id! ? null : c.id!)}
              style={{ padding: '5px 12px 5px 6px', borderRadius: 20, border: filtroCategoria === c.id ? 'none' : '1.5px solid #E8E0D5', cursor: 'pointer', ...BODY, fontSize: 11, fontWeight: 600, background: filtroCategoria === c.id ? c.cor : 'transparent', color: filtroCategoria === c.id ? 'white' : '#9B7B6A', whiteSpace: 'nowrap', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, transition: 'all .15s', boxShadow: filtroCategoria === c.id ? `0 2px 8px ${c.cor}40` : 'none' }}>
              <CategoryIcon nome={c.nome} cor={filtroCategoria === c.id ? 'rgba(255,255,255,0.28)' : c.cor} size={20} radius={6} />
              {c.nome}
            </motion.button>
          ))}
        </div>
      )}

      {/* Mini sparkline chart — shown when a month is selected */}
      <AnimatePresence>
        {filtroMes && sparklineData.some(d => d.valor > 0) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ background: '#FFFFFF', border: '1px solid #EDE6DC', borderRadius: 16, padding: '16px 16px 10px', marginBottom: 14, boxShadow: '0 1px 3px rgba(44,26,15,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <p style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 11, fontWeight: 700, color: '#9B7B6A', letterSpacing: '.07em', textTransform: 'uppercase', margin: 0 }}>
                Gastos por dia — {new Date(filtroAno, filtroMes - 1, 1).toLocaleDateString('pt-BR', { month: 'long' })}
              </p>
              <p style={{ fontFamily: "'Fraunces'", fontSize: 14, fontWeight: 700, color: '#C4553B', margin: 0 }}>
                {fmt(sparklineData.reduce((s, d) => s + d.valor, 0))}
              </p>
            </div>
            <ResponsiveContainer width="100%" height={70}>
              <BarChart data={sparklineData} barSize={8}>
                <Bar dataKey="valor" radius={[3, 3, 0, 0]} fill="#C4553B" opacity={0.75} />
                <Tooltip
                  content={({ active, payload, label }) => active && payload?.length ? (
                    <div style={{ background: '#2C1A0F', borderRadius: 8, padding: '5px 10px' }}>
                      <p style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 10, color: 'rgba(255,255,255,0.6)', marginBottom: 2, margin: '0 0 2px' }}>Dia {label}</p>
                      <p style={{ fontFamily: "'Fraunces'", fontSize: 12, fontWeight: 700, color: 'white', margin: 0 }}>{fmt(payload[0].value as number)}</p>
                    </div>
                  ) : null}
                  cursor={{ fill: 'rgba(196,85,59,0.08)' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Month KPI bar — shown when a month is selected */}
      {filtroMes && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
          {[
            { label: 'ENTRADAS', val: filtradas.filter(t => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0), cor: '#3A8580' },
            { label: 'SAÍDAS', val: filtradas.filter(t => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0), cor: '#C4553B' },
            { label: 'SALDO', val: filtradas.reduce((s, t) => s + (t.tipo === 'receita' ? t.valor : -t.valor), 0), cor: '#2C1A0F' },
          ].map(kpi => (
            <div key={kpi.label} style={{ background: '#FFFFFF', border: '1px solid #EDE6DC', borderRadius: 14, padding: '10px 12px', boxShadow: '0 1px 3px rgba(44,26,15,0.05)' }}>
              <p style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 9, fontWeight: 700, color: '#9B7B6A', letterSpacing: '.07em', marginBottom: 3, margin: '0 0 3px', textTransform: 'uppercase' }}>{kpi.label}</p>
              <p style={{ fontFamily: "'Fraunces'", fontSize: 16, fontWeight: 700, color: kpi.cor, letterSpacing: '-0.5px', margin: 0 }}>{fmt(kpi.val)}</p>
            </div>
          ))}
        </div>
      )}

      {filtradas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 28px' }}>
          <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
            <Dobrao mood="sleeping" size={80} />
          </motion.div>
          <p style={{ fontFamily: "'Fraunces'", fontSize: 20, fontWeight: 700, color: '#2C1A0F', marginTop: 14, marginBottom: 6 }}>
            {busca ? 'Nenhum resultado' : 'Sem transações ainda'}
          </p>
          <p style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 14, color: '#9B7B6A', margin: 0 }}>
            {busca ? `Nada encontrado para "${busca}"` : 'Toque no + para registrar seu primeiro lançamento'}
          </p>
        </div>
      ) : (
        <div>
          {grupos.map(([data, txs], idx) => {
            const saldoDia = txs.reduce((s, t) => s + (t.tipo === 'receita' ? t.valor : -t.valor), 0)
            const isToday = data === hoje
            return (
              <div key={data} style={{ marginBottom: 22 }}>
                {/* Date group header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, marginTop: idx > 0 ? 22 : 0 }}>
                  <div style={{ background: isToday ? '#C4553B' : '#F5F0E8', borderRadius: 8, padding: '3px 10px', flexShrink: 0 }}>
                    <p style={{ ...BODY, fontSize: 11, fontWeight: 700, color: isToday ? 'white' : '#7A5C4F', textTransform: 'capitalize', margin: 0 }}>{labelData(data)}</p>
                  </div>
                  <div style={{ flex: 1, height: 1, background: '#F0EAE2' }} />
                  <div style={{ background: saldoDia >= 0 ? '#EBF5F0' : '#FAF0EE', borderRadius: 8, padding: '3px 10px' }}>
                    <p style={{ ...DISPLAY, fontSize: 11, color: saldoDia >= 0 ? '#3A8580' : '#C4553B', margin: 0 }}>
                      {saldoDia >= 0 ? '+' : ''}{fmt(saldoDia)}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {txs.map((tx, i) => <TxRow key={tx.id} tx={tx} i={i} />)}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

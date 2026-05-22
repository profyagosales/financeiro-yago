import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMetas, addMeta, editMeta, aportarMeta, deleteMeta } from '@/db/hooks/useMetas'
import { useOrcamentos, addOrcamento, editOrcamento, deleteOrcamento } from '@/db/hooks/useOrcamentos'
import { useCategorias } from '@/db/hooks/useCategorias'
import { useGastosPorCategoria } from '@/db/hooks/useTransacoes'
import { fmt, mesAnoAtual } from '@/lib/format'
import { sounds } from "@/lib/sounds"
import { Dobrao } from '@/components/mascot/Dobrao'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { IconEdit, IconX, IconTrash, IconAlertTriangle, IconTrophy, IconPlus } from '@tabler/icons-react'

const DISPLAY: React.CSSProperties = { fontFamily: "'Fraunces',Georgia,serif", fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1.1 }
const LABEL: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }
const SUB: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#9B7B6A' }
const CARD: React.CSSProperties = { background: '#FFFFFF', border: '1px solid #EDE6DC', borderRadius: 20, boxShadow: '0 1px 3px rgba(44,26,15,0.05), 0 4px 16px rgba(44,26,15,0.06)' }

function CircularProgress({ pct, cor, size = 60 }: { pct: number; cor: string; size?: number }) {
  const stroke = 5
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = Math.min(100, pct) / 100 * circ
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#F0EAE2" strokeWidth={stroke} />
      <motion.circle cx={size/2} cy={size/2} r={r} fill="none" stroke={pct >= 100 ? '#3A8580' : cor} strokeWidth={stroke}
        strokeLinecap="round"
        initial={{ strokeDasharray: `0 ${circ}` }}
        animate={{ strokeDasharray: `${dash} ${circ}` }}
        transition={{ type: 'spring', stiffness: 100, damping: 22 }}
      />
    </svg>
  )
}

const ICONS_META = ['🏠','✈️','🚗','📱','💻','🎓','💍','🏖️','📦','💰','🎯','🌟']
const CORES_META = ['#C4553B','#3A8580','#D4A017','#8B4BC8','#3D7EB5','#E89527','#D94F8A','#1E7D5A']

function MetaCard({ meta, onEdit }: { meta: any; onEdit: () => void }) {
  const pct = meta.valorAlvo > 0 ? Math.min(100, (meta.valorAtual / meta.valorAlvo) * 100) : 0
  const falta = meta.valorAlvo - meta.valorAtual
  const [aporting, setAporting] = useState(false)
  const [aporte, setAporte] = useState('')
  const atingida = pct >= 100

  const diasRestantes = meta.prazo ? Math.ceil((new Date(meta.prazo).getTime() - Date.now()) / 86400000) : null
  const aporteMensal = diasRestantes && diasRestantes > 0 ? falta / (diasRestantes / 30) : null

  return (
    <motion.div
      layout
      whileHover={{ y: -4, boxShadow: '0 4px 12px rgba(44,26,15,0.08), 0 8px 24px rgba(44,26,15,0.07)' }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      style={{ ...CARD, padding: '16px 18px' }}>
      <div style={{ display: 'flex', gap: 14, marginBottom: 12 }}>
        {/* Circular progress */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <CircularProgress pct={pct} cor={meta.cor} size={60} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: atingida ? 18 : 14, lineHeight: 1 }}>{atingida ? '🎉' : meta.icone}</span>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 700, color: '#2C1A0F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meta.nome}</p>
              <p style={{ ...LABEL as object, color: atingida ? '#3A8580' : meta.cor, marginTop: 2 }}>{Math.round(pct)}% concluído</p>
            </div>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginLeft: 8 }}>
              <button onClick={onEdit} style={{ background: '#F5F0E8', border: 'none', borderRadius: 8, width: 26, height: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconEdit size={12} stroke={1.8} color="#7A5C4F" /></button>
              <button onClick={() => deleteMeta(meta.id)} style={{ background: '#FAF0EE', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26 }}><IconTrash size={12} stroke={2} color="#C4553B" /></button>
            </div>
          </div>

          {/* Linear progress bar */}
          <div style={{ background: '#F0EAE2', borderRadius: 6, height: 5, margin: '8px 0 6px', overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ type: 'spring', stiffness: 180, damping: 24 }}
              style={{ height: '100%', background: atingida ? '#3A8580' : meta.cor, borderRadius: 6 }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ ...SUB as object }}>
              {fmt(meta.valorAtual)} de {fmt(meta.valorAlvo)}
            </p>
            {meta.prazo && !atingida && (
              <p style={{ ...SUB as object, fontSize: 10 }}>
                {diasRestantes !== null && diasRestantes > 0 ? `${diasRestantes}d` : 'Prazo'}
                {aporteMensal ? ` · ${fmt(aporteMensal)}/mês` : ''}
              </p>
            )}
          </div>

          {atingida && (
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#3A8580', fontWeight: 700, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <IconTrophy size={12} color="#3A8580" stroke={2} /> Meta atingida!
            </p>
          )}
        </div>
      </div>

      {!atingida && (
        aporting ? (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 10, padding: '8px 12px', gap: 4 }}>
              <span style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 14, color: '#C4553B', fontWeight: 700 }}>R$</span>
              <input value={aporte} onChange={e => setAporte(e.target.value)} placeholder="0,00" autoFocus type="tel"
                style={{ border: 'none', background: 'transparent', fontFamily: "'Fraunces',Georgia,serif", fontSize: 16, fontWeight: 700, color: '#2C1A0F', flex: 1, outline: 'none' }} />
            </div>
            <motion.button whileTap={{ scale: 0.95 }}
              onClick={async () => { await aportarMeta(meta.id, parseFloat(aporte.replace(',','.'))||0); setAporting(false); setAporte('') }}
              style={{ background: meta.cor, color: 'white', border: 'none', borderRadius: 10, padding: '8px 16px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Aportar
            </motion.button>
            <button onClick={() => setAporting(false)} style={{ background: '#F5F0E8', border: 'none', borderRadius: 10, padding: '0', cursor: 'pointer', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconX size={15} stroke={2} color="#9B7B6A" /></button>
          </motion.div>
        ) : (
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => setAporting(true)}
            style={{ marginTop: 4, width: '100%', padding: '9px 0', borderRadius: 10, border: `1.5px solid ${meta.cor}`, background: 'transparent', color: meta.cor, fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            + Registrar aporte · faltam {fmt(falta)}
          </motion.button>
        )
      )}
    </motion.div>
  )
}

function OrcamentoRow({ orc, gastos, onEdit }: { orc: any; gastos: Map<number, number>; onEdit: () => void }) {
  const [catNome, setCatNome] = useState('')
  const [catCor, setCatCor] = useState('#9B8A7A')
  const shook = useRef(false)
  useState(() => {
    import('@/db/schema').then(({ db }) => db.categorias.get(orc.categoriaId).then(c => { if (c) { setCatNome(c.nome); setCatCor(c.cor) } }))
  })
  const gasto = gastos.get(orc.categoriaId) ?? 0
  const pct = Math.min(100, (gasto / orc.valorLimite) * 100)
  const estourado = gasto > orc.valorLimite

  useEffect(() => {
    if (estourado && !shook.current) {
      shook.current = true
      sounds.error()
    }
  }, [estourado])

  return (
    <motion.div
      layout
      animate={estourado ? { x: [0, -5, 5, -5, 5, -3, 3, 0] } : { x: 0 }}
      whileHover={{ y: -4, boxShadow: '0 4px 12px rgba(44,26,15,0.08), 0 8px 24px rgba(44,26,15,0.07)' }}
      transition={{ duration: 0.45, type: 'spring', stiffness: 260, damping: 26 }}
      style={{ ...CARD, padding: '14px 16px', border: estourado ? '1px solid rgba(196,85,59,0.25)' : '1px solid #EDE6DC' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, color: '#2C1A0F', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <CategoryIcon nome={catNome} cor={catCor} size={32} radius={9} />
          {catNome}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ ...DISPLAY as object, fontSize: 15, color: estourado ? '#C4553B' : '#2C1A0F' }}>{fmt(gasto)}</span>
            <span style={{ ...SUB as object }}> / {fmt(orc.valorLimite)}</span>
          </div>
          <div style={{ display: 'flex', gap: 3 }}>
            <button onClick={e => { e.stopPropagation(); onEdit() }} style={{ background: '#F5F0E8', border: 'none', borderRadius: 7, width: 26, height: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconEdit size={11} stroke={1.8} color="#7A5C4F" /></button>
            <button onClick={e => { e.stopPropagation(); deleteOrcamento(orc.id) }} style={{ background: '#FAF0EE', border: 'none', borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26 }}><IconX size={14} stroke={2} color="#C4553B" /></button>
          </div>
        </div>
      </div>
      <div style={{ background: '#F0EAE2', borderRadius: 6, height: 7, overflow: 'hidden' }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          style={{ height: '100%', background: estourado ? '#C4553B' : pct > 80 ? '#D4A017' : catCor, borderRadius: 6 }} />
      </div>
      {estourado && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6 }}>
          <IconAlertTriangle size={13} color="#C4553B" stroke={2} />
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: '#C4553B', fontWeight: 700 }}>
            Estourou em {fmt(gasto - orc.valorLimite)}!
          </p>
        </div>
      )}
    </motion.div>
  )
}

export function Page() {
  const { mes, ano } = mesAnoAtual()
  const metas = useMetas()
  const orcamentos = useOrcamentos()
  const categorias = useCategorias('despesa')
  const gastos = useGastosPorCategoria(mes, ano)
  const [tab, setTab] = useState<'metas' | 'orcamento'>('metas')
  const [addingMeta, setAddingMeta] = useState(false)
  const [editingMetaId, setEditingMetaId] = useState<number | null>(null)
  const [addingOrc, setAddingOrc] = useState(false)
  const [editingOrcId, setEditingOrcId] = useState<number | null>(null)
  const [formMeta, setFormMeta] = useState({ nome: '', valorAlvo: '', valorAtual: '0', prazo: '', cor: '#C4553B', icone: '🎯' })
  const [formOrc, setFormOrc] = useState({ categoriaId: null as number | null, valorLimite: '' })

  const openEditMeta = (meta: any) => {
    setEditingMetaId(meta.id)
    setFormMeta({ nome: meta.nome, valorAlvo: String(meta.valorAlvo), valorAtual: String(meta.valorAtual), prazo: meta.prazo ?? '', cor: meta.cor, icone: meta.icone })
    setAddingMeta(true)
  }

  const handleSaveMeta = async () => {
    if (!formMeta.nome || !formMeta.valorAlvo) return
    const data = { nome: formMeta.nome, valorAlvo: parseFloat(formMeta.valorAlvo.replace(',','.')), valorAtual: parseFloat(formMeta.valorAtual.replace(',','.')) || 0, prazo: formMeta.prazo || undefined, cor: formMeta.cor, icone: formMeta.icone }
    if (editingMetaId !== null) {
      await editMeta(editingMetaId, data)
    } else {
      await addMeta({ ...data, ativo: true })
    }
    setAddingMeta(false)
    setEditingMetaId(null)
    setFormMeta({ nome: '', valorAlvo: '', valorAtual: '0', prazo: '', cor: '#C4553B', icone: '🎯' })
  }

  const openEditOrc = (orc: any) => {
    setEditingOrcId(orc.id)
    setFormOrc({ categoriaId: orc.categoriaId, valorLimite: String(orc.valorLimite) })
    setAddingOrc(true)
  }

  const handleSaveOrc = async () => {
    if (!formOrc.categoriaId || !formOrc.valorLimite) return
    const valor = parseFloat(formOrc.valorLimite.replace(',','.'))
    if (editingOrcId !== null) {
      await editOrcamento(editingOrcId, { valorLimite: valor })
    } else {
      await addOrcamento({ categoriaId: formOrc.categoriaId, valorLimite: valor, periodo: 'mensal', rollover: false })
    }
    setAddingOrc(false)
    setEditingOrcId(null)
    setFormOrc({ categoriaId: null, valorLimite: '' })
  }

  const metasAtivas = metas.filter(m => (m.valorAlvo > 0 ? (m.valorAtual / m.valorAlvo) * 100 : 0) < 100)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '24px 28px', width: '100%' }}>

      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ ...DISPLAY as object, fontSize: 28, color: '#2C1A0F' }}>Metas & Orçamento</h1>
          <p style={{ ...SUB as object, marginTop: 4 }}>{metasAtivas.length} meta{metasAtivas.length !== 1 ? 's' : ''} ativa{metasAtivas.length !== 1 ? 's' : ''} · mês atual</p>
        </div>
        <motion.button whileTap={{ scale: 0.95 }}
          onClick={() => {
            if (tab === 'metas') {
              setEditingMetaId(null)
              setFormMeta({ nome: '', valorAlvo: '', valorAtual: '0', prazo: '', cor: '#C4553B', icone: '🎯' })
              setAddingMeta(true)
            } else {
              setEditingOrcId(null)
              setFormOrc({ categoriaId: null, valorLimite: '' })
              setAddingOrc(true)
            }
          }}
          style={{ background: 'linear-gradient(135deg, #D4643A, #C4553B)', color: 'white', border: 'none', borderRadius: 14, padding: '11px 18px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 16px rgba(196,85,59,0.35)', flexShrink: 0 }}>
          <IconPlus size={16} stroke={2.5} /> Adicionar
        </motion.button>
      </div>

      {/* Tab switcher — pill style */}
      <div style={{ display: 'flex', background: '#F5F0E8', borderRadius: 12, padding: 3, gap: 3, marginBottom: 20, width: 'fit-content' }}>
        {(['metas', 'orcamento'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{
              padding: '8px 20px', borderRadius: 9, border: 'none', cursor: 'pointer',
              background: tab === t ? '#C4553B' : 'transparent',
              color: tab === t ? 'white' : '#7A5C4F',
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700,
              boxShadow: tab === t ? '0 2px 8px rgba(196,85,59,0.3)' : 'none',
              transition: 'all .15s'
            }}>
            {t === 'metas' ? `Metas (${metas.length})` : `Orçamento (${orcamentos.length})`}
          </button>
        ))}
      </div>

      {tab === 'metas' && (
        metas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <Dobrao mood="sleeping" size={100} />
            <p style={{ ...DISPLAY as object, fontSize: 18, color: '#2C1A0F', marginTop: 12 }}>Nenhuma meta</p>
            <p style={{ ...SUB as object, fontSize: 14, marginTop: 6 }}>Crie sua primeira meta financeira</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {metas.map((m, i) => (
              <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 26, delay: i * 0.05 }}>
                <MetaCard meta={m} onEdit={() => openEditMeta(m)} />
              </motion.div>
            ))}
          </div>
        )
      )}

      {tab === 'orcamento' && (
        orcamentos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <Dobrao mood="sleeping" size={100} />
            <p style={{ ...DISPLAY as object, fontSize: 18, color: '#2C1A0F', marginTop: 12 }}>Nenhum orçamento</p>
            <p style={{ ...SUB as object, fontSize: 14, marginTop: 6 }}>Defina limites por categoria</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {orcamentos.map((o, i) => (
              <motion.div key={o.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 26, delay: i * 0.05 }}>
                <OrcamentoRow orc={o} gastos={gastos} onEdit={() => openEditOrc(o)} />
              </motion.div>
            ))}
          </div>
        )
      )}

      <AnimatePresence>
        {addingMeta && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setAddingMeta(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(44,26,15,0.55)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: 520, background: '#FFFDF9', borderRadius: '24px 24px 0 0', padding: '20px 20px 48px', maxHeight: '90dvh', overflowY: 'auto' }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: '#E8E0D5', margin: '0 auto 16px' }} />
              <h3 style={{ ...DISPLAY as object, fontSize: 20, color: '#2C1A0F', marginBottom: 14 }}>{editingMetaId ? 'Editar meta' : 'Nova meta'}</h3>
              <p style={{ ...LABEL as object, color: '#9B7B6A', marginBottom: 6 }}>Ícone</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                {ICONS_META.map(ic => (
                  <button key={ic} onClick={() => setFormMeta(f => ({ ...f, icone: ic }))}
                    style={{ width: 40, height: 40, borderRadius: 12, border: formMeta.icone === ic ? '2px solid #C4553B' : '1.5px solid #E8E0D5', background: formMeta.icone === ic ? '#FAF0EE' : '#FAF6F0', cursor: 'pointer', fontSize: 20 }}>
                    {ic}
                  </button>
                ))}
              </div>
              <input value={formMeta.nome} onChange={e => setFormMeta(f => ({ ...f, nome: e.target.value }))} placeholder="Nome da meta (ex: Viagem para Europa)"
                style={{ width: '100%', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '10px 14px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, outline: 'none', marginBottom: 10, boxSizing: 'border-box', color: '#2C1A0F' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <p style={{ ...LABEL as object, color: '#9B7B6A', marginBottom: 4 }}>Valor Alvo</p>
                  <div style={{ display: 'flex', alignItems: 'center', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '9px 12px', gap: 4 }}>
                    <span style={{ ...DISPLAY as object, fontSize: 14, color: '#C4553B' }}>R$</span>
                    <input value={formMeta.valorAlvo} onChange={e => setFormMeta(f => ({ ...f, valorAlvo: e.target.value }))} placeholder="0,00" type="tel"
                      style={{ border: 'none', background: 'transparent', fontFamily: "'Fraunces',Georgia,serif", fontSize: 16, fontWeight: 700, color: '#2C1A0F', flex: 1, outline: 'none' }} />
                  </div>
                </div>
                <div>
                  <p style={{ ...LABEL as object, color: '#9B7B6A', marginBottom: 4 }}>Já tenho</p>
                  <div style={{ display: 'flex', alignItems: 'center', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '9px 12px', gap: 4 }}>
                    <span style={{ ...DISPLAY as object, fontSize: 14, color: '#3A8580' }}>R$</span>
                    <input value={formMeta.valorAtual} onChange={e => setFormMeta(f => ({ ...f, valorAtual: e.target.value }))} placeholder="0,00" type="tel"
                      style={{ border: 'none', background: 'transparent', fontFamily: "'Fraunces',Georgia,serif", fontSize: 16, fontWeight: 700, color: '#2C1A0F', flex: 1, outline: 'none' }} />
                  </div>
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <p style={{ ...LABEL as object, color: '#9B7B6A', marginBottom: 4 }}>Prazo <span style={{ fontWeight: 400, textTransform: 'none' }}>(opcional)</span></p>
                <input value={formMeta.prazo} onChange={e => setFormMeta(f => ({ ...f, prazo: e.target.value }))} type="date"
                  style={{ width: '100%', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '10px 14px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, color: '#2C1A0F', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <p style={{ ...LABEL as object, color: '#9B7B6A', marginBottom: 6 }}>Cor</p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {CORES_META.map(c => <button key={c} onClick={() => setFormMeta(f => ({ ...f, cor: c }))} style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: formMeta.cor === c ? '3px solid #2C1A0F' : '2px solid transparent', cursor: 'pointer' }} />)}
              </div>
              <motion.button onClick={handleSaveMeta} whileTap={{ scale: 0.97 }} disabled={!formMeta.nome || !formMeta.valorAlvo}
                style={{ width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', cursor: 'pointer', background: formMeta.nome && formMeta.valorAlvo ? 'linear-gradient(135deg, #D4643A, #C4553B)' : '#E8E0D5', color: formMeta.nome && formMeta.valorAlvo ? 'white' : '#9B7B6A', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, fontWeight: 700, transition: 'all .2s', boxShadow: formMeta.nome && formMeta.valorAlvo ? '0 4px 20px rgba(196,85,59,0.35)' : 'none' }}>
                {editingMetaId ? 'Salvar alterações' : 'Criar meta'}
              </motion.button>
            </motion.div>
          </motion.div>
        )}

        {addingOrc && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setAddingOrc(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(44,26,15,0.55)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: 520, background: '#FFFDF9', borderRadius: '24px 24px 0 0', padding: '20px 20px 48px' }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: '#E8E0D5', margin: '0 auto 16px' }} />
              <h3 style={{ ...DISPLAY as object, fontSize: 20, color: '#2C1A0F', marginBottom: 14 }}>{editingOrcId ? 'Editar orçamento' : 'Novo orçamento mensal'}</h3>
              <p style={{ ...LABEL as object, color: '#9B7B6A', marginBottom: 6 }}>Categoria</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {categorias.map(c => (
                  <button key={c.id} onClick={() => !editingOrcId && setFormOrc(f => ({ ...f, categoriaId: c.id! }))}
                    style={{ padding: '5px 10px', borderRadius: 20, border: 'none', cursor: editingOrcId ? 'default' : 'pointer', background: formOrc.categoriaId === c.id ? c.cor : '#F5F0E8', color: formOrc.categoriaId === c.id ? 'white' : '#7A5C4F', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 5, opacity: editingOrcId && formOrc.categoriaId !== c.id ? 0.4 : 1 }}>
                    <CategoryIcon nome={c.nome} cor={formOrc.categoriaId === c.id ? 'white' : c.cor} size={18} radius={5} /> {c.nome}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '10px 14px', gap: 6, marginBottom: 16 }}>
                <span style={{ ...DISPLAY as object, fontSize: 16, color: '#C4553B' }}>R$</span>
                <input value={formOrc.valorLimite} onChange={e => setFormOrc(f => ({ ...f, valorLimite: e.target.value }))} placeholder="Limite mensal" type="tel" autoFocus
                  style={{ border: 'none', background: 'transparent', fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700, color: '#2C1A0F', flex: 1, outline: 'none' }} />
              </div>
              <motion.button onClick={handleSaveOrc} whileTap={{ scale: 0.97 }} disabled={!formOrc.categoriaId || !formOrc.valorLimite}
                style={{ width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', cursor: 'pointer', background: formOrc.categoriaId && formOrc.valorLimite ? 'linear-gradient(135deg, #D4643A, #C4553B)' : '#E8E0D5', color: formOrc.categoriaId && formOrc.valorLimite ? 'white' : '#9B7B6A', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, fontWeight: 700, transition: 'all .2s', boxShadow: formOrc.categoriaId && formOrc.valorLimite ? '0 4px 20px rgba(196,85,59,0.35)' : 'none' }}>
                {editingOrcId ? 'Salvar alterações' : 'Criar orçamento'}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

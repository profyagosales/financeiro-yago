import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMetas, addMeta, editMeta, aportarMeta, deleteMeta } from '@/db/hooks/useMetas'
import { useOrcamentos, addOrcamento, editOrcamento, deleteOrcamento } from '@/db/hooks/useOrcamentos'
import { useCategorias } from '@/db/hooks/useCategorias'
import { useGastosPorCategoria } from '@/db/hooks/useTransacoes'
import { fmt, mesAnoAtual } from '@/lib/format'
import { Confetti } from "@/components/ui/Confetti"
import { sounds, haptic } from "@/lib/sounds"
import { Dobrao } from '@/components/mascot/Dobrao'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { IconEdit, IconX, IconTrash, IconTarget, IconChartBar, IconAlertTriangle, IconTrophy } from '@tabler/icons-react'

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
    <motion.div layout style={{ background: '#FFFDF9', border: `0.5px solid ${atingida ? '#D0E8D8' : '#E8E0D5'}`, borderRadius: 20, padding: '16px 18px' }}>
      <div style={{ display: 'flex', gap: 14, marginBottom: 10 }}>
        {/* Circular progress */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <CircularProgress pct={pct} cor={meta.cor} size={60} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: atingida ? 18 : 14, lineHeight: 1 }}>{atingida ? '🎉' : meta.icone}</span>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 16, fontWeight: 700, color: '#2C1A0F' }}>{meta.nome}</p>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: atingida ? '#3A8580' : meta.cor, marginTop: 1 }}>{Math.round(pct)}%</p>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={onEdit} style={{ background: '#F5F0E8', border: 'none', borderRadius: 8, width: 26, height: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconEdit size={12} stroke={1.8} color="#7A5C4F" /></button>
              <button onClick={() => deleteMeta(meta.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26 }}><IconX size={14} stroke={2} color="#C4B4A8" /></button>
            </div>
          </div>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#9B7B6A', marginTop: 4 }}>
            {fmt(meta.valorAtual)} de {fmt(meta.valorAlvo)}
          </p>
          {meta.prazo && !atingida && (
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: '#9B7B6A', marginTop: 2 }}>
              {diasRestantes !== null && diasRestantes > 0 ? `${diasRestantes}d restantes` : 'Prazo atingido'}
              {aporteMensal && ` · ${fmt(aporteMensal)}/mês`}
            </p>
          )}
          {atingida && <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#3A8580', fontWeight: 600, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}><IconTrophy size={12} color="#3A8580" stroke={2} /> Meta atingida!</p>}
        </div>
      </div>
      {!atingida && (
        aporting ? (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ display: 'flex', gap: 8, marginTop: 10 }}>
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
            style={{ marginTop: 10, width: '100%', padding: '9px 0', borderRadius: 10, border: `1.5px solid ${meta.cor}`, background: 'transparent', color: meta.cor, fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
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
      animate={estourado ? { x: [0, -5, 5, -5, 5, -3, 3, 0] } : { x: 0 }}
      transition={{ duration: 0.45 }}
      style={{ background: '#FFFDF9', border: `0.5px solid ${estourado ? '#FAD0D0' : '#E8E0D5'}`, borderRadius: 14, padding: '12px 14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 600, color: '#2C1A0F', display: 'inline-flex', alignItems: 'center', gap: 6 }}><CategoryIcon nome={catNome} cor={catCor} size={22} radius={6} />{catNome}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 14, fontWeight: 700, color: estourado ? '#C4553B' : '#2C1A0F' }}>{fmt(gasto)}</span>
            <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#9B7B6A' }}> / {fmt(orc.valorLimite)}</span>
          </div>
          <div style={{ display: 'flex', gap: 3 }}>
            <button onClick={e => { e.stopPropagation(); onEdit() }} style={{ background: '#F5F0E8', border: 'none', borderRadius: 7, width: 24, height: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconEdit size={11} stroke={1.8} color="#7A5C4F" /></button>
            <button onClick={e => { e.stopPropagation(); deleteOrcamento(orc.id) }} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24 }}><IconX size={14} stroke={2} color="#C4B4A8" /></button>
          </div>
        </div>
      </div>
      <div style={{ background: '#F0EAE2', borderRadius: 6, height: 7, overflow: 'hidden' }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          style={{ height: '100%', background: estourado ? '#C4553B' : pct > 80 ? '#D4A017' : catCor, borderRadius: 6 }} />
      </div>
      {estourado && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
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

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: "24px 28px", width: "100%" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 26, fontWeight: 700, color: '#2C1A0F' }}>Metas & Orçamento</h1>
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => { if (tab === 'metas') { setEditingMetaId(null); setFormMeta({ nome: '', valorAlvo: '', valorAtual: '0', prazo: '', cor: '#C4553B', icone: '🎯' }); setAddingMeta(true) } else { setEditingOrcId(null); setFormOrc({ categoriaId: null, valorLimite: '' }); setAddingOrc(true) } }}
          style={{ background: '#C4553B', color: 'white', border: 'none', borderRadius: 12, padding: '10px 18px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          + Adicionar
        </motion.button>
      </div>

      <div style={{ display: 'flex', background: '#F5F0E8', borderRadius: 12, padding: 4, marginBottom: 20 }}>
        {(['metas', 'orcamento'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ flex: 1, padding: '9px 0', borderRadius: 9, border: 'none', cursor: 'pointer', background: tab === t ? '#C4553B' : 'transparent', color: tab === t ? 'white' : '#9B7B6A', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 600, transition: 'all .15s' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              {t === 'metas' ? <IconTarget size={14} stroke={1.8} /> : <IconChartBar size={14} stroke={1.8} />}
              {t === 'metas' ? `Metas (${metas.length})` : `Orçamento (${orcamentos.length})`}
            </span>
          </button>
        ))}
      </div>

      {tab === 'metas' && (
        metas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <Dobrao mood="sleeping" size={100} />
            <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 18, fontWeight: 700, color: '#2C1A0F', marginTop: 12 }}>Nenhuma meta</p>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, color: '#9B7B6A', marginTop: 6 }}>Crie sua primeira meta financeira</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {metas.map(m => <MetaCard key={m.id} meta={m} onEdit={() => openEditMeta(m)} />)}
          </div>
        )
      )}

      {tab === 'orcamento' && (
        orcamentos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <Dobrao mood="sleeping" size={100} />
            <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 18, fontWeight: 700, color: '#2C1A0F', marginTop: 12 }}>Nenhum orçamento</p>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, color: '#9B7B6A', marginTop: 6 }}>Defina limites por categoria</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {orcamentos.map(o => <OrcamentoRow key={o.id} orc={o} gastos={gastos} onEdit={() => openEditOrc(o)} />)}
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
              <h3 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: '#2C1A0F', marginBottom: 14 }}>{editingMetaId ? 'Editar meta' : 'Nova meta'}</h3>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600, color: '#9B7B6A', marginBottom: 6 }}>ÍCONE</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                {ICONS_META.map(ic => (
                  <button key={ic} onClick={() => setFormMeta(f => ({ ...f, icone: ic }))}
                    style={{ width: 40, height: 40, borderRadius: 12, border: formMeta.icone === ic ? '2px solid #C4553B' : '1.5px solid #E8E0D5', background: formMeta.icone === ic ? '#FAF0EE' : '#FAF6F0', cursor: 'pointer', fontSize: 20 }}>
                    {ic}
                  </button>
                ))}
              </div>
              <input value={formMeta.nome} onChange={e => setFormMeta(f => ({ ...f, nome: e.target.value }))} placeholder="Nome da meta (ex: Viagem para Europa)"
                style={{ width: '100%', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '10px 14px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, outline: 'none', marginBottom: 10 }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 600, color: '#9B7B6A', marginBottom: 4 }}>VALOR ALVO</p>
                  <div style={{ display: 'flex', alignItems: 'center', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '9px 12px', gap: 4 }}>
                    <span style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 14, color: '#C4553B', fontWeight: 700 }}>R$</span>
                    <input value={formMeta.valorAlvo} onChange={e => setFormMeta(f => ({ ...f, valorAlvo: e.target.value }))} placeholder="0,00" type="tel"
                      style={{ border: 'none', background: 'transparent', fontFamily: "'Fraunces',Georgia,serif", fontSize: 16, fontWeight: 700, color: '#2C1A0F', flex: 1, outline: 'none' }} />
                  </div>
                </div>
                <div>
                  <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 600, color: '#9B7B6A', marginBottom: 4 }}>JÁ TENHO</p>
                  <div style={{ display: 'flex', alignItems: 'center', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '9px 12px', gap: 4 }}>
                    <span style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 14, color: '#3A8580', fontWeight: 700 }}>R$</span>
                    <input value={formMeta.valorAtual} onChange={e => setFormMeta(f => ({ ...f, valorAtual: e.target.value }))} placeholder="0,00" type="tel"
                      style={{ border: 'none', background: 'transparent', fontFamily: "'Fraunces',Georgia,serif", fontSize: 16, fontWeight: 700, color: '#2C1A0F', flex: 1, outline: 'none' }} />
                  </div>
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 600, color: '#9B7B6A', marginBottom: 4 }}>PRAZO (opcional)</p>
                <input value={formMeta.prazo} onChange={e => setFormMeta(f => ({ ...f, prazo: e.target.value }))} type="date"
                  style={{ width: '100%', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '10px 14px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, color: '#2C1A0F', outline: 'none' }} />
              </div>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600, color: '#9B7B6A', marginBottom: 6 }}>COR</p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {CORES_META.map(c => <button key={c} onClick={() => setFormMeta(f => ({ ...f, cor: c }))} style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: formMeta.cor === c ? '3px solid #2C1A0F' : '2px solid transparent', cursor: 'pointer' }} />)}
              </div>
              <motion.button onClick={handleSaveMeta} whileTap={{ scale: 0.97 }} disabled={!formMeta.nome || !formMeta.valorAlvo}
                style={{ width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', cursor: 'pointer', background: formMeta.nome && formMeta.valorAlvo ? '#C4553B' : '#E8E0D5', color: formMeta.nome && formMeta.valorAlvo ? 'white' : '#9B7B6A', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, fontWeight: 700, transition: 'all .2s' }}>
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
              <h3 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: '#2C1A0F', marginBottom: 14 }}>{editingOrcId ? 'Editar orçamento' : 'Novo orçamento mensal'}</h3>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600, color: '#9B7B6A', marginBottom: 6 }}>CATEGORIA</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {categorias.map(c => (
                  <button key={c.id} onClick={() => !editingOrcId && setFormOrc(f => ({ ...f, categoriaId: c.id! }))}
                    style={{ padding: '5px 10px', borderRadius: 20, border: 'none', cursor: editingOrcId ? 'default' : 'pointer', background: formOrc.categoriaId === c.id ? c.cor : '#F5F0E8', color: formOrc.categoriaId === c.id ? 'white' : '#7A5C4F', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 5, opacity: editingOrcId && formOrc.categoriaId !== c.id ? 0.4 : 1 }}>
                    <CategoryIcon nome={c.nome} cor={formOrc.categoriaId === c.id ? 'white' : c.cor} size={18} radius={5} /> {c.nome}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '10px 14px', gap: 6, marginBottom: 16 }}>
                <span style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 16, color: '#C4553B', fontWeight: 700 }}>R$</span>
                <input value={formOrc.valorLimite} onChange={e => setFormOrc(f => ({ ...f, valorLimite: e.target.value }))} placeholder="Limite mensal" type="tel" autoFocus
                  style={{ border: 'none', background: 'transparent', fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700, color: '#2C1A0F', flex: 1, outline: 'none' }} />
              </div>
              <motion.button onClick={handleSaveOrc} whileTap={{ scale: 0.97 }} disabled={!formOrc.categoriaId || !formOrc.valorLimite}
                style={{ width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', cursor: 'pointer', background: formOrc.categoriaId && formOrc.valorLimite ? '#C4553B' : '#E8E0D5', color: formOrc.categoriaId && formOrc.valorLimite ? 'white' : '#9B7B6A', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, fontWeight: 700, transition: 'all .2s' }}>
                {editingOrcId ? 'Salvar alterações' : 'Criar orçamento'}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNetWorth, addPatrimonioItem, deletePatrimonioItem, updatePatrimonioItem } from '@/db/hooks/usePatrimonio'
import { fmt } from '@/lib/format'
import { Dobrao } from '@/components/mascot/Dobrao'
import { IconEdit, IconX, IconHome, IconCar, IconChartLine, IconPigMoney, IconArchive, IconBuildingBank, IconCreditCard, IconCash, IconListDetails, IconPlus } from '@tabler/icons-react'

const DISPLAY: React.CSSProperties = { fontFamily: "'Fraunces',Georgia,serif", fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1.1 }
const LABEL: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }
const SUB: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#9B7B6A' }
const CARD: React.CSSProperties = { background: '#FFFFFF', border: '1px solid #EDE6DC', borderRadius: 20, boxShadow: '0 1px 3px rgba(44,26,15,0.05), 0 4px 16px rgba(44,26,15,0.06)' }

const SUBTIPOS_ATIVO = [
  { v: 'imovel', l: 'Imóvel', icon: IconHome },
  { v: 'veiculo', l: 'Veículo', icon: IconCar },
  { v: 'investimento', l: 'Investimento', icon: IconChartLine },
  { v: 'poupanca', l: 'Poupança', icon: IconPigMoney },
  { v: 'outros', l: 'Outros', icon: IconArchive },
]
const SUBTIPOS_PASSIVO = [
  { v: 'financiamento', l: 'Financiamento', icon: IconBuildingBank },
  { v: 'cartao', l: 'Cartão', icon: IconCreditCard },
  { v: 'emprestimo', l: 'Empréstimo', icon: IconCash },
  { v: 'outros', l: 'Outros', icon: IconListDetails },
]

export function Page() {
  const { ativos, passivos, netWorth, items } = useNetWorth()
  const liquido = netWorth
  const totalAtivos = ativos
  const totalPassivos = passivos
  const [adding, setAdding] = useState(false)
  const [tipo, setTipo] = useState<'ativo' | 'passivo'>('ativo')
  const [form, setForm] = useState({ nome: '', valor: '', subtipo: 'imovel', jurosAnual: '' })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingTipo, setEditingTipo] = useState<'ativo' | 'passivo'>('ativo')

  const openEdit = (item: any) => {
    setEditingId(item.id)
    setEditingTipo(item.tipo)
    setTipo(item.tipo)
    setForm({ nome: item.nome, valor: String(item.valor), subtipo: item.subtipo, jurosAnual: item.jurosAnual ? String(item.jurosAnual * 100) : '' })
    setAdding(true)
  }

  const handleSave = async () => {
    if (!form.nome || !form.valor) return
    const data = { nome: form.nome, tipo, subtipo: form.subtipo, valor: parseFloat(form.valor.replace(',','.')), jurosAnual: form.jurosAnual ? parseFloat(form.jurosAnual.replace(',','.')) / 100 : undefined }
    if (editingId !== null) {
      await updatePatrimonioItem(editingId, data)
    } else {
      await addPatrimonioItem(data)
    }
    setAdding(false)
    setEditingId(null)
    setForm({ nome: '', valor: '', subtipo: 'imovel', jurosAnual: '' })
  }

  const ativosItems = items.filter(i => i.tipo === 'ativo')
  const passivosItems = items.filter(i => i.tipo === 'passivo')

  // Debt avalanche (highest interest first)
  const dividas = passivosItems.filter(i => i.jurosAnual).sort((a, b) => (b.jurosAnual ?? 0) - (a.jurosAnual ?? 0))

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '32px', width: '100%' }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid #EDE6DC' }}>
        <div>
          <h1 style={{ ...DISPLAY as object, fontSize: 38, color: '#2C1A0F', letterSpacing: '-1.5px' }}>Patrimônio</h1>
          <p style={{ ...SUB as object, fontSize: 13, marginTop: 4 }}>Visão geral dos seus ativos e passivos</p>
        </div>
        <motion.button whileTap={{ scale: 0.95 }}
          onClick={() => { setEditingId(null); setTipo('ativo'); setForm({ nome: '', valor: '', subtipo: 'imovel', jurosAnual: '' }); setAdding(true) }}
          style={{ background: 'linear-gradient(135deg, #D4643A, #C4553B)', color: 'white', border: 'none', borderRadius: 14, padding: '11px 18px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 16px rgba(196,85,59,0.35)', flexShrink: 0 }}>
          <IconPlus size={16} stroke={2.5} /> Adicionar
        </motion.button>
      </div>

      {/* KPI card premium — full width, impactante */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        style={{ background: '#FFFFFF', border: '1px solid #EDE6DC', borderLeft: '4px solid #3A8580', borderRadius: 20, padding: '28px 32px', marginBottom: 24, boxShadow: '0 1px 3px rgba(44,26,15,0.05), 0 4px 16px rgba(44,26,15,0.06)', width: '100%', boxSizing: 'border-box' }}>
        <p style={{ ...LABEL as object, color: '#3A8580', marginBottom: 8 }}>Patrimônio Líquido</p>
        <p style={{ ...DISPLAY as object, fontSize: 48, color: liquido >= 0 ? '#2C1A0F' : '#C4553B', letterSpacing: '-2px', marginBottom: 20 }}>{fmt(liquido)}</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <div style={{ background: '#EBF5F0', borderRadius: 14, padding: '14px 18px' }}>
            <p style={{ ...LABEL as object, color: '#3A8580', marginBottom: 4 }}>Total em Ativos</p>
            <p style={{ ...DISPLAY as object, fontSize: 22, color: '#3A8580' }}>{fmt(totalAtivos)}</p>
            <p style={{ ...SUB as object, fontSize: 11, marginTop: 3 }}>{ativosItems.length} item{ativosItems.length !== 1 ? 's' : ''}</p>
          </div>
          <div style={{ background: '#FAF0EE', borderRadius: 14, padding: '14px 18px' }}>
            <p style={{ ...LABEL as object, color: '#C4553B', marginBottom: 4 }}>Total em Passivos</p>
            <p style={{ ...DISPLAY as object, fontSize: 22, color: '#C4553B' }}>{fmt(totalPassivos)}</p>
            <p style={{ ...SUB as object, fontSize: 11, marginTop: 3 }}>{passivosItems.length} item{passivosItems.length !== 1 ? 's' : ''}</p>
          </div>
          <div style={{ background: '#F5F0E8', borderRadius: 14, padding: '14px 18px' }}>
            <p style={{ ...LABEL as object, color: '#7A5C4F', marginBottom: 4 }}>Cobertura</p>
            <p style={{ ...DISPLAY as object, fontSize: 22, color: '#2C1A0F' }}>{totalPassivos > 0 ? (totalAtivos / totalPassivos).toFixed(1) + 'x' : '—'}</p>
            <p style={{ ...SUB as object, fontSize: 11, marginTop: 3 }}>Ativos / Passivos</p>
          </div>
        </div>
      </motion.div>

      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <Dobrao mood="sleeping" size={90} />
          <p style={{ ...DISPLAY as object, fontSize: 17, color: '#2C1A0F', marginTop: 12 }}>Nenhum item cadastrado</p>
          <p style={{ ...SUB as object, fontSize: 13, marginTop: 6 }}>Adicione imóveis, veículos, investimentos e dívidas</p>
        </div>
      ) : (
        <>
          {ativosItems.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ ...LABEL as object, color: '#3A8580' }}>Ativos</span>
                <div style={{ flex: 1, height: 1, background: '#EDE6DC' }} />
                <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: '#3A8580' }}>{fmt(totalAtivos)}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
                {ativosItems.map((item, i) => {
                  const sub = SUBTIPOS_ATIVO.find(s => s.v === item.subtipo)
                  const SubIcon = sub?.icon ?? IconArchive
                  return (
                    <motion.div key={item.id} layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ y: -4, boxShadow: '0 4px 12px rgba(44,26,15,0.08), 0 8px 24px rgba(44,26,15,0.07)' }}
                      transition={{ type: 'spring', stiffness: 260, damping: 26, delay: i * 0.05 }}
                      style={{ ...CARD, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 42, height: 42, borderRadius: 13, background: '#EBF5F0', border: '1px solid rgba(58,133,128,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <SubIcon size={20} stroke={1.8} color="#3A8580" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 700, color: '#2C1A0F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nome}</p>
                        <span style={{ ...LABEL as object, fontSize: 9, color: '#3A8580', background: 'rgba(58,133,128,0.1)', padding: '2px 7px', borderRadius: 10, display: 'inline-block', marginTop: 3 }}>{sub?.l ?? item.subtipo}</span>
                      </div>
                      <p style={{ ...DISPLAY as object, fontSize: 16, color: '#3A8580', flexShrink: 0 }}>{fmt(item.valor)}</p>
                      <button onClick={() => openEdit(item)} style={{ background: '#F5F0E8', border: 'none', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><IconEdit size={13} stroke={1.8} color="#7A5C4F" /></button>
                      <button onClick={() => deletePatrimonioItem(item.id!)} style={{ background: '#FAF0EE', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, flexShrink: 0 }}><IconX size={15} stroke={2} color="#C4553B" /></button>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )}

          {passivosItems.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ ...LABEL as object, color: '#C4553B' }}>Passivos / Dívidas</span>
                <div style={{ flex: 1, height: 1, background: '#EDE6DC' }} />
                <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: '#C4553B' }}>{fmt(totalPassivos)}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
                {passivosItems.map((item, i) => {
                  const sub = SUBTIPOS_PASSIVO.find(s => s.v === item.subtipo)
                  const SubIcon = sub?.icon ?? IconListDetails
                  return (
                    <motion.div key={item.id} layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ y: -4, boxShadow: '0 4px 12px rgba(44,26,15,0.08), 0 8px 24px rgba(44,26,15,0.07)' }}
                      transition={{ type: 'spring', stiffness: 260, damping: 26, delay: i * 0.05 }}
                      style={{ ...CARD, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, borderLeft: '3px solid rgba(196,85,59,0.3)' }}>
                      <div style={{ width: 42, height: 42, borderRadius: 13, background: '#FAF0EE', border: '1px solid rgba(196,85,59,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <SubIcon size={20} stroke={1.8} color="#C4553B" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 700, color: '#2C1A0F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nome}</p>
                        <div style={{ display: 'flex', gap: 6, marginTop: 3, alignItems: 'center' }}>
                          <span style={{ ...LABEL as object, fontSize: 9, color: '#C4553B', background: 'rgba(196,85,59,0.1)', padding: '2px 7px', borderRadius: 10 }}>{sub?.l ?? item.subtipo}</span>
                          {item.jurosAnual && <span style={{ ...SUB as object, fontSize: 10, color: '#C4553B', fontWeight: 700 }}>{(item.jurosAnual * 100).toFixed(1)}% a.a.</span>}
                        </div>
                      </div>
                      <p style={{ ...DISPLAY as object, fontSize: 16, color: '#C4553B', flexShrink: 0 }}>{fmt(item.valor)}</p>
                      <button onClick={() => openEdit(item)} style={{ background: '#F5F0E8', border: 'none', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><IconEdit size={13} stroke={1.8} color="#7A5C4F" /></button>
                      <button onClick={() => deletePatrimonioItem(item.id!)} style={{ background: '#FAF0EE', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, flexShrink: 0 }}><IconX size={15} stroke={2} color="#C4553B" /></button>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )}

          {dividas.length > 1 && (
            <div style={{ ...CARD, padding: '16px 18px' }}>
              <p style={{ ...DISPLAY as object, fontSize: 15, color: '#2C1A0F', marginBottom: 10 }}>Estratégia Avalanche — quitar nesta ordem:</p>
              {dividas.map((d, i) => (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: i < dividas.length - 1 ? '1px solid #EDE6DC' : 'none' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#C4553B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: 'white' }}>{i + 1}</span>
                  </div>
                  <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#2C1A0F', flex: 1 }}>{d.nome}</span>
                  <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#C4553B', fontWeight: 700 }}>{(d.jurosAnual! * 100).toFixed(1)}% a.a.</span>
                  <span style={{ ...DISPLAY as object, fontSize: 13, color: '#2C1A0F' }}>{fmt(d.valor)}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <AnimatePresence>
        {adding && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setAdding(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(44,26,15,0.55)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: 520, background: '#FFFDF9', borderRadius: '24px 24px 0 0', padding: '20px 20px 48px', maxHeight: '90dvh', overflowY: 'auto' }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: '#E8E0D5', margin: '0 auto 16px' }} />
              <h3 style={{ ...DISPLAY as object, fontSize: 20, color: '#2C1A0F', marginBottom: 14 }}>{editingId ? 'Editar item' : 'Novo item'}</h3>
              <div style={{ display: 'flex', background: '#F5F0E8', borderRadius: 12, padding: 4, marginBottom: 12 }}>
                {(['ativo', 'passivo'] as const).map(t => (
                  <button key={t} onClick={() => { setTipo(t); setForm(f => ({ ...f, subtipo: t === 'ativo' ? 'imovel' : 'financiamento' })) }}
                    style={{ flex: 1, padding: '9px 0', borderRadius: 9, border: 'none', cursor: 'pointer', background: tipo === t ? (t === 'ativo' ? '#3A8580' : '#C4553B') : 'transparent', color: tipo === t ? 'white' : '#9B7B6A', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, transition: 'all .15s' }}>
                    {t === 'ativo' ? '+ Ativo' : '− Passivo / Dívida'}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {(tipo === 'ativo' ? SUBTIPOS_ATIVO : SUBTIPOS_PASSIVO).map(s => (
                  <button key={s.v} onClick={() => setForm(f => ({ ...f, subtipo: s.v }))}
                    style={{ padding: '6px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', background: form.subtipo === s.v ? '#C4553B' : '#F5F0E8', color: form.subtipo === s.v ? 'white' : '#7A5C4F', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <s.icon size={13} stroke={1.8} color={form.subtipo === s.v ? 'white' : '#7A5C4F'} />
                    {s.l}
                  </button>
                ))}
              </div>
              <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome (ex: Apartamento Brasília)"
                style={{ width: '100%', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '10px 14px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, outline: 'none', marginBottom: 10, boxSizing: 'border-box', color: '#2C1A0F' }} />
              <div style={{ display: 'flex', alignItems: 'center', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '10px 14px', gap: 6, marginBottom: 10 }}>
                <span style={{ ...DISPLAY as object, fontSize: 16, color: '#C4553B' }}>R$</span>
                <input value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} placeholder={tipo === 'ativo' ? 'Valor atual' : 'Saldo devedor'} type="tel"
                  style={{ border: 'none', background: 'transparent', fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700, color: '#2C1A0F', flex: 1, outline: 'none' }} />
              </div>
              {tipo === 'passivo' && (
                <div style={{ display: 'flex', alignItems: 'center', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '10px 14px', gap: 6, marginBottom: 14 }}>
                  <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#C4553B', fontWeight: 600 }}>% a.a.</span>
                  <input value={form.jurosAnual} onChange={e => setForm(f => ({ ...f, jurosAnual: e.target.value }))} placeholder="Juros anuais (opcional)" type="tel"
                    style={{ border: 'none', background: 'transparent', fontFamily: "'Fraunces',Georgia,serif", fontSize: 18, fontWeight: 700, color: '#2C1A0F', flex: 1, outline: 'none' }} />
                </div>
              )}
              <motion.button onClick={handleSave} whileTap={{ scale: 0.97 }} disabled={!form.nome || !form.valor}
                style={{ width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', cursor: 'pointer', background: form.nome && form.valor ? 'linear-gradient(135deg, #D4643A, #C4553B)' : '#E8E0D5', color: form.nome && form.valor ? 'white' : '#9B7B6A', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, fontWeight: 700, transition: 'all .2s', boxShadow: form.nome && form.valor ? '0 4px 20px rgba(196,85,59,0.35)' : 'none' }}>
                {editingId ? 'Salvar alterações' : 'Adicionar'}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNetWorth, addPatrimonioItem, deletePatrimonioItem, updatePatrimonioItem } from '@/db/hooks/usePatrimonio'
import { fmt } from '@/lib/format'
import { Dobrao } from '@/components/mascot/Dobrao'
import { IconEdit, IconX, IconTrash, IconHome, IconCar, IconChartLine, IconPigMoney, IconArchive, IconBuildingBank, IconCreditCard, IconCash, IconListDetails } from '@tabler/icons-react'

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
  const positive = netWorth >= 0

  // Debt avalanche (highest interest first)
  const dividas = passivosItems.filter(i => i.jurosAnual).sort((a, b) => (b.jurosAnual ?? 0) - (a.jurosAnual ?? 0))

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: "24px 28px", width: "100%" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 26, fontWeight: 700, color: '#2C1A0F' }}>Patrimônio</h1>
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setEditingId(null); setTipo('ativo'); setForm({ nome: '', valor: '', subtipo: 'imovel', jurosAnual: '' }); setAdding(true) }}
          style={{ background: '#C4553B', color: 'white', border: 'none', borderRadius: 12, padding: '10px 18px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          + Adicionar
        </motion.button>
      </div>

      {/* Net worth card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        style={{ background: positive ? '#EBF5F0' : '#FAF0EE', borderRadius: 22, padding: '20px 22px', marginBottom: 20 }}>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600, color: positive ? '#3A8580' : '#C4553B', marginBottom: 4 }}>PATRIMÔNIO LÍQUIDO</p>
        <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 36, fontWeight: 700, color: '#2C1A0F', letterSpacing: '-1px' }}>{fmt(netWorth)}</p>
        <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
          <div>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#3A8580', fontWeight: 600 }}>ATIVOS</p>
            <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 18, fontWeight: 700, color: '#2C1A0F' }}>{fmt(ativos)}</p>
          </div>
          <div style={{ width: 1, background: '#E8E0D5' }} />
          <div>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#C4553B', fontWeight: 600 }}>PASSIVOS</p>
            <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 18, fontWeight: 700, color: '#2C1A0F' }}>{fmt(passivos)}</p>
          </div>
        </div>
      </motion.div>

      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <Dobrao mood="sleeping" size={90} />
          <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 17, fontWeight: 700, color: '#2C1A0F', marginTop: 12 }}>Nenhum item cadastrado</p>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#9B7B6A', marginTop: 6 }}>Adicione imóveis, veículos, investimentos e dívidas</p>
        </div>
      ) : (
        <>
          {ativosItems.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600, color: '#3A8580', marginBottom: 8, letterSpacing: '.05em' }}>ATIVOS</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ativosItems.map(item => {
                  const sub = SUBTIPOS_ATIVO.find(s => s.v === item.subtipo)
                  const SubIcon = sub?.icon ?? IconArchive
                  return (
                    <motion.div key={item.id} layout style={{ background: '#FFFDF9', border: '0.5px solid #D0E8D8', borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 11, background: '#EBF5F0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <SubIcon size={18} stroke={1.8} color="#3A8580" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 600, color: '#2C1A0F' }}>{item.nome}</p>
                        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#9B7B6A', marginTop: 2 }}>{sub?.l ?? item.subtipo}</p>
                      </div>
                      <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 16, fontWeight: 700, color: '#3A8580' }}>{fmt(item.valor)}</p>
                      <button onClick={() => openEdit(item)} style={{ background: '#F5F0E8', border: 'none', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><IconEdit size={13} stroke={1.8} color="#7A5C4F" /></button>
                      <button onClick={() => deletePatrimonioItem(item.id!)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28 }}><IconX size={15} stroke={2} color="#C4B4A8" /></button>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )}

          {passivosItems.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600, color: '#C4553B', marginBottom: 8, letterSpacing: '.05em' }}>PASSIVOS / DÍVIDAS</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {passivosItems.map(item => {
                  const sub = SUBTIPOS_PASSIVO.find(s => s.v === item.subtipo)
                  const SubIcon = sub?.icon ?? IconListDetails
                  return (
                    <motion.div key={item.id} layout style={{ background: '#FFFDF9', border: '0.5px solid #FAD0D0', borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 11, background: '#FAF0EE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <SubIcon size={18} stroke={1.8} color="#C4553B" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 600, color: '#2C1A0F' }}>{item.nome}</p>
                        <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                          <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: '#9B7B6A' }}>{sub?.l ?? item.subtipo}</span>
                          {item.jurosAnual && <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: '#C4553B', fontWeight: 600 }}>{(item.jurosAnual * 100).toFixed(1)}% a.a.</span>}
                        </div>
                      </div>
                      <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 16, fontWeight: 700, color: '#C4553B' }}>{fmt(item.valor)}</p>
                      <button onClick={() => openEdit(item)} style={{ background: '#F5F0E8', border: 'none', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><IconEdit size={13} stroke={1.8} color="#7A5C4F" /></button>
                      <button onClick={() => deletePatrimonioItem(item.id!)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28 }}><IconX size={15} stroke={2} color="#C4B4A8" /></button>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )}

          {dividas.length > 1 && (
            <div style={{ background: '#FAF0EE', borderRadius: 18, padding: '14px 16px' }}>
              <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 15, fontWeight: 700, color: '#2C1A0F', marginBottom: 8 }}>Estratégia Avalanche — quitar nesta ordem:</p>
              {dividas.map((d, i) => (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: i < dividas.length - 1 ? '0.5px solid #E8E0D5' : 'none' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#C4553B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: 'white' }}>{i + 1}</span>
                  </div>
                  <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#2C1A0F', flex: 1 }}>{d.nome}</span>
                  <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#C4553B', fontWeight: 600 }}>{(d.jurosAnual! * 100).toFixed(1)}% a.a.</span>
                  <span style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 13, fontWeight: 700, color: '#2C1A0F' }}>{fmt(d.valor)}</span>
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
              style={{ width: '100%', maxWidth: 520, background: '#FFFDF9', borderRadius: '24px 24px 0 0', padding: '20px 20px 48px' }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: '#E8E0D5', margin: '0 auto 16px' }} />
              <h3 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: '#2C1A0F', marginBottom: 14 }}>{editingId ? 'Editar item' : 'Novo item'}</h3>
              <div style={{ display: 'flex', background: '#F5F0E8', borderRadius: 12, padding: 4, marginBottom: 12 }}>
                {(['ativo', 'passivo'] as const).map(t => (
                  <button key={t} onClick={() => { setTipo(t); setForm(f => ({ ...f, subtipo: t === 'ativo' ? 'imovel' : 'financiamento' })) }}
                    style={{ flex: 1, padding: '9px 0', borderRadius: 9, border: 'none', cursor: 'pointer', background: tipo === t ? (t === 'ativo' ? '#3A8580' : '#C4553B') : 'transparent', color: tipo === t ? 'white' : '#9B7B6A', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 600, transition: 'all .15s' }}>
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
                style={{ width: '100%', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '10px 14px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, outline: 'none', marginBottom: 10 }} />
              <div style={{ display: 'flex', alignItems: 'center', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '10px 14px', gap: 6, marginBottom: 10 }}>
                <span style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 16, color: '#C4553B', fontWeight: 700 }}>R$</span>
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
                style={{ width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', cursor: 'pointer', background: form.nome && form.valor ? '#C4553B' : '#E8E0D5', color: form.nome && form.valor ? 'white' : '#9B7B6A', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, fontWeight: 700, transition: 'all .2s' }}>
                {editingId ? 'Salvar alterações' : 'Adicionar'}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

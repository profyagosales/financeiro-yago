import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCartoes, addCartao, editCartao, deleteCartao, useTotalFatura, useLancamentosCartao, addLancamentoCartao } from '@/db/hooks/useCartoes'
import { useCategorias } from '@/db/hooks/useCategorias'
import { fmt, mesAnoAtual } from '@/lib/format'
import { Dobrao } from '@/components/mascot/Dobrao'
import { db } from '@/db/schema'
import { IconPlus, IconX, IconTrash, IconEdit } from '@tabler/icons-react'

const BANDEIRAS = ['Visa','Mastercard','Elo','Hipercard','Amex']
const CORES = ['#2C1A0F','#820AD1','#FF8700','#1E7D5A','#3D7EB5','#C4553B','#D94F8A','#7C5CBF']

function LancRow({ lanc }: { lanc: any }) {
  const [catNome, setCatNome] = useState(''); const [catCor, setCatCor] = useState('#9B8A7A'); const [catIcon, setCatIcon] = useState('💸')
  useState(() => { db.categorias.get(lanc.categoriaId).then(c => { if (c) { setCatNome(c.nome); setCatCor(c.cor); setCatIcon(c.icone) } }) })
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'white', border: '0.5px solid #E8E0D5', borderRadius: 12 }}>
      <div style={{ width: 36, height: 36, borderRadius: 11, background: catCor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>{catIcon}</div>
      <div style={{ flex: 1 }}>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 600, color: '#2C1A0F' }}>{lanc.descricao}</p>
        <div style={{ display: 'flex', gap: 5, marginTop: 2 }}>
          <span style={{ fontSize: 10, background: catCor, color: 'white', padding: '1px 6px', borderRadius: 20, fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 600 }}>{catNome}</span>
          {lanc.totalParcelas > 1 && <span style={{ fontSize: 10, background: '#FAF0EE', color: '#C4553B', padding: '1px 6px', borderRadius: 20, fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 600 }}>{lanc.parcelaAtual}/{lanc.totalParcelas}x</span>}
        </div>
      </div>
      <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 15, fontWeight: 700, color: '#C4553B' }}>{fmt(lanc.valor)}</p>
    </div>
  )
}

function FaturaSheet({ cartao, onClose }: { cartao: any; onClose: () => void }) {
  const { mes, ano } = mesAnoAtual()
  const [viewMes, setViewMes] = useState(mes); const [viewAno, setViewAno] = useState(ano)
  const lancamentos = useLancamentosCartao(cartao.id, viewMes, viewAno)
  const total = lancamentos.reduce((s, l) => s + l.valor, 0)
  const [addingLanc, setAddingLanc] = useState(false)
  const prevMes = () => { if (viewMes === 1) { setViewMes(12); setViewAno(a => a-1) } else setViewMes(m => m-1) }
  const nextMes = () => { if (viewMes === 12) { setViewMes(1); setViewAno(a => a+1) } else setViewMes(m => m+1) }
  const mesNome = new Date(viewAno, viewMes-1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const isFutura = viewAno > ano || (viewAno === ano && viewMes > mes)
  const isAtual = viewMes === mes && viewAno === ano
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(44,26,15,0.55)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 560, background: '#FFFDF9', borderRadius: '24px 24px 0 0', padding: '20px 20px 48px', maxHeight: '85dvh', overflowY: 'auto' }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: '#E8E0D5', margin: '0 auto 16px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: '#2C1A0F' }}>{cartao.nome}</h3>
          <motion.button onClick={() => setAddingLanc(true)} whileTap={{ scale: 0.95 }}
            style={{ background: '#C4553B', color: 'white', border: 'none', borderRadius: 10, padding: '7px 14px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            + Lançar
          </motion.button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FAF6F0', borderRadius: 14, padding: '10px 16px', marginBottom: 16 }}>
          <button onClick={prevMes} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#C4553B', padding: '0 8px' }}>‹</button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', marginBottom: 2 }}>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#9B7B6A', textTransform: 'capitalize' }}>{mesNome}</p>
              {isFutura && <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 700, background: '#FDF4E3', color: '#D4A017', padding: '1px 6px', borderRadius: 10, border: '1px solid #F0D8A8' }}>PROJEÇÃO</span>}
              {isAtual && <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 700, background: '#EBF5F0', color: '#3A8580', padding: '1px 6px', borderRadius: 10 }}>ATUAL</span>}
            </div>
            <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 26, fontWeight: 700, color: '#2C1A0F' }}>{fmt(total)}</p>
          </div>
          <button onClick={nextMes} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#C4553B', padding: '0 8px' }}>›</button>
        </div>
        {lancamentos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#9B7B6A' }}>Fatura vazia neste mês</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {lancamentos.map(l => <LancRow key={l.id} lanc={l} />)}
          </div>
        )}
        {addingLanc && <AddLancForm cartaoId={cartao.id} mes={viewMes} ano={viewAno} onClose={() => setAddingLanc(false)} />}
      </motion.div>
    </motion.div>
  )
}

function AddLancForm({ cartaoId, mes, ano, onClose }: { cartaoId: number; mes: number; ano: number; onClose: () => void }) {
  const [desc, setDesc] = useState(''); const [valor, setValor] = useState(''); const [catId, setCatId] = useState<number | null>(null); const [parcelas, setParcelas] = useState(1)
  const categorias = useCategorias('despesa')
  const handleSave = async () => {
    if (!desc || !valor || !catId) return
    await addLancamentoCartao({ cartaoId, descricao: desc, valor: parseFloat(valor.replace(',','.')), data: new Date().toISOString().split('T')[0], categoriaId: catId, totalParcelas: parcelas, mes, ano })
    onClose()
  }
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(44,26,15,0.6)', zIndex: 400, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 560, background: '#FFFDF9', borderRadius: '24px 24px 0 0', padding: '20px 20px 48px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 18, fontWeight: 700, color: '#2C1A0F' }}>Lançamento no cartão</h3>
          <button onClick={onClose} style={{ background: '#F5F0E8', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconX size={16} color="#9B7B6A" /></button>
        </div>
        <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descrição"
          style={{ width: '100%', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '11px 14px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, outline: 'none', marginBottom: 10 }} />
        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '10px 14px', gap: 6 }}>
            <span style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 16, color: '#C4553B', fontWeight: 700 }}>R$</span>
            <input value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" type="tel"
              style={{ border: 'none', background: 'transparent', fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: '#2C1A0F', flex: 1, outline: 'none' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '8px 12px', gap: 8 }}>
            <button onClick={() => setParcelas(p => Math.max(1,p-1))} style={{ background: '#E8E0D5', border: 'none', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', fontSize: 18, fontWeight: 700, color: '#2C1A0F' }}>−</button>
            <span style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 16, fontWeight: 700, color: '#2C1A0F', minWidth: 32, textAlign: 'center' }}>{parcelas}x</span>
            <button onClick={() => setParcelas(p => Math.min(48,p+1))} style={{ background: '#C4553B', border: 'none', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', fontSize: 18, fontWeight: 700, color: 'white' }}>+</button>
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {categorias.map(c => (
            <button key={c.id} onClick={() => setCatId(c.id!)}
              style={{ padding: '5px 10px', borderRadius: 20, border: 'none', cursor: 'pointer', background: catId === c.id ? c.cor : '#F5F0E8', color: catId === c.id ? 'white' : '#7A5C4F', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, transition: 'all .15s' }}>
              {c.icone} {c.nome}
            </button>
          ))}
        </div>
        <motion.button onClick={handleSave} whileTap={{ scale: 0.97 }} disabled={!desc || !valor || !catId}
          style={{ width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', cursor: 'pointer', background: desc && valor && catId ? '#C4553B' : '#E8E0D5', color: desc && valor && catId ? 'white' : '#9B7B6A', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, fontWeight: 700, transition: 'all .2s' }}>
          {parcelas > 1 ? `Parcelar em ${parcelas}x de ${valor ? fmt(parseFloat(valor.replace(',','.'))/parcelas) : 'R$ 0'}` : 'Lançar na fatura'}
        </motion.button>
      </motion.div>
    </motion.div>
  )
}

export function Page() {
  const cartoes = useCartoes()
  const { mes, ano } = mesAnoAtual()
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [selectedCartao, setSelectedCartao] = useState<any>(null)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [form, setForm] = useState({ nome: '', bandeira: 'Visa', limite: '', cor: '#2C1A0F', diaFechamento: 1, diaVencimento: 10 })

  const openAdd = () => { setEditingId(null); setForm({ nome: '', bandeira: 'Visa', limite: '', cor: '#2C1A0F', diaFechamento: 1, diaVencimento: 10 }); setAdding(true) }
  const openEdit = (c: any) => {
    setEditingId(c.id)
    setForm({ nome: c.nome, bandeira: c.bandeira, limite: String(c.limite), cor: c.cor, diaFechamento: c.diaFechamento, diaVencimento: c.diaVencimento })
    setAdding(true)
  }

  const handleSave = async () => {
    if (!form.nome || !form.limite) return
    const data = { nome: form.nome, bandeira: form.bandeira, limite: parseFloat(form.limite.replace(',','.')), cor: form.cor, diaFechamento: form.diaFechamento, diaVencimento: form.diaVencimento }
    if (editingId !== null) {
      await editCartao(editingId, data)
    } else {
      await addCartao({ ...data, ativo: true })
    }
    setAdding(false)
    setForm({ nome: '', bandeira: 'Visa', limite: '', cor: '#2C1A0F', diaFechamento: 1, diaVencimento: 10 })
  }

  return (
    <div style={{ padding: '24px 28px', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 28, fontWeight: 700, color: '#2C1A0F' }}>Cartões</h1>
        <motion.button whileTap={{ scale: 0.95 }} onClick={openAdd}
          style={{ background: '#C4553B', color: 'white', border: 'none', borderRadius: 12, padding: '10px 18px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <IconPlus size={16} stroke={2.5} /> Adicionar
        </motion.button>
      </div>

      {cartoes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Dobrao mood="sleeping" size={90} />
          <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: '#2C1A0F', marginTop: 16 }}>Nenhum cartão</p>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, color: '#9B7B6A', marginTop: 6 }}>Adicione seu cartão de crédito</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {cartoes.map(c => <CartaoCard key={c.id} cartao={c} mes={mes} ano={ano} onClick={() => setSelectedCartao(c)} onEdit={() => openEdit(c)} onDelete={() => setConfirmDelete(c.id!)} />)}
        </div>
      )}

      <AnimatePresence>
        {confirmDelete !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setConfirmDelete(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(44,26,15,0.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ background: '#FFFDF9', borderRadius: 22, padding: '28px 24px', maxWidth: 340, width: '100%', textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: '#FAF0EE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <IconTrash size={24} color="#C4553B" stroke={1.8} />
              </div>
              <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: '#2C1A0F', marginBottom: 8 }}>Excluir cartão?</p>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, color: '#9B7B6A', marginBottom: 24 }}>Os lançamentos deste cartão serão removidos.</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: '1.5px solid #E8E0D5', background: 'white', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 600, color: '#7A5C4F', cursor: 'pointer' }}>Cancelar</button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={async () => { await deleteCartao(confirmDelete); setConfirmDelete(null) }}
                  style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: 'none', background: '#C4553B', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 700, color: 'white', cursor: 'pointer' }}>Excluir</motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
        {adding && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setAdding(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(44,26,15,0.55)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: 520, background: '#FFFDF9', borderRadius: '24px 24px 0 0', padding: '20px 20px 48px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: '#2C1A0F' }}>{editingId ? 'Editar cartão' : 'Novo cartão'}</h3>
                <button onClick={() => setAdding(false)} style={{ background: '#F5F0E8', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconX size={16} color="#9B7B6A" /></button>
              </div>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600, color: '#9B7B6A', marginBottom: 6 }}>BANDEIRA</p>
              <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                {BANDEIRAS.map(b => (
                  <button key={b} onClick={() => setForm(f => ({ ...f, bandeira: b }))}
                    style={{ padding: '6px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', background: form.bandeira === b ? '#C4553B' : '#F5F0E8', color: form.bandeira === b ? 'white' : '#7A5C4F', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, transition: 'all .15s' }}>
                    {b}
                  </button>
                ))}
              </div>
              <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome do cartão"
                style={{ width: '100%', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '11px 14px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, outline: 'none', marginBottom: 10 }} />
              <div style={{ display: 'flex', alignItems: 'center', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '10px 14px', gap: 6, marginBottom: 10 }}>
                <span style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 16, color: '#C4553B', fontWeight: 700 }}>R$</span>
                <input value={form.limite} onChange={e => setForm(f => ({ ...f, limite: e.target.value }))} placeholder="Limite" type="tel"
                  style={{ border: 'none', background: 'transparent', fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: '#2C1A0F', flex: 1, outline: 'none' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div>
                  <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600, color: '#9B7B6A', marginBottom: 4 }}>DIA FECHAMENTO</p>
                  <input value={form.diaFechamento} onChange={e => setForm(f => ({ ...f, diaFechamento: parseInt(e.target.value)||1 }))} type="number" min="1" max="31"
                    style={{ width: '100%', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '10px 0', fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: '#2C1A0F', outline: 'none', textAlign: 'center' }} />
                </div>
                <div>
                  <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600, color: '#9B7B6A', marginBottom: 4 }}>DIA VENCIMENTO</p>
                  <input value={form.diaVencimento} onChange={e => setForm(f => ({ ...f, diaVencimento: parseInt(e.target.value)||10 }))} type="number" min="1" max="31"
                    style={{ width: '100%', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '10px 0', fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: '#2C1A0F', outline: 'none', textAlign: 'center' }} />
                </div>
              </div>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600, color: '#9B7B6A', marginBottom: 6 }}>COR</p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
                {CORES.map(c => <button key={c} onClick={() => setForm(f => ({ ...f, cor: c }))} style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: form.cor === c ? '3px solid #C4553B' : '2px solid transparent', cursor: 'pointer' }} />)}
              </div>
              <motion.button onClick={handleSave} whileTap={{ scale: 0.97 }} disabled={!form.nome || !form.limite}
                style={{ width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', cursor: 'pointer', background: form.nome && form.limite ? '#C4553B' : '#E8E0D5', color: form.nome && form.limite ? 'white' : '#9B7B6A', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, fontWeight: 700, transition: 'all .2s' }}>
                {editingId ? 'Salvar alterações' : 'Adicionar cartão'}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
        {selectedCartao && <FaturaSheet cartao={selectedCartao} onClose={() => setSelectedCartao(null)} />}
      </AnimatePresence>
    </div>
  )
}

function CartaoCard({ cartao, mes, ano, onClick, onEdit, onDelete }: { cartao: any; mes: number; ano: number; onClick: () => void; onEdit: () => void; onDelete: () => void }) {
  const total = useTotalFatura(cartao.id, mes, ano)
  const disponivel = cartao.limite - total
  const pct = Math.min(100, (total / cartao.limite) * 100)
  return (
    <motion.div whileHover={{ y: -3 }} style={{ background: cartao.cor, borderRadius: 24, padding: '20px 22px', cursor: 'pointer', position: 'relative' }}>
      {/* Top row: bandeira + buttons */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{cartao.bandeira}</p>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={e => { e.stopPropagation(); onEdit() }}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconEdit size={13} color="white" stroke={2} />
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete() }}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconTrash size={13} color="rgba(255,255,255,0.8)" stroke={2} />
          </button>
        </div>
      </div>
      {/* Main content — clickable */}
      <div onClick={onClick}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: 'white' }}>{cartao.nome}</p>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: 'rgba(255,255,255,0.6)', marginBottom: 2 }}>FATURA</p>
            <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700, color: 'white' }}>{fmt(total)}</p>
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 4, height: 5, overflow: 'hidden', marginBottom: 8 }}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            style={{ height: '100%', background: pct > 80 ? '#FFB347' : 'white', borderRadius: 4 }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>Limite: {fmt(cartao.limite)}</p>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>Disponível: {fmt(disponivel)}</p>
        </div>
        <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
          <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, background: 'rgba(255,255,255,0.2)', color: 'white', padding: '3px 8px', borderRadius: 20 }}>Fecha dia {cartao.diaFechamento}</span>
          <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, background: 'rgba(255,255,255,0.2)', color: 'white', padding: '3px 8px', borderRadius: 20 }}>Vence dia {cartao.diaVencimento}</span>
        </div>
      </div>
    </motion.div>
  )
}

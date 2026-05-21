import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCartoes, addCartao, useTotalFatura, useLancamentosCartao, addLancamentoCartao } from '@/db/hooks/useCartoes'
import { useCategorias } from '@/db/hooks/useCategorias'
import { fmt, mesAnoAtual } from '@/lib/format'
import { Dobrao } from '@/components/mascot/Dobrao'
import { db } from '@/db/schema'

const BANDEIRAS = ['Visa','Mastercard','Elo','Hipercard','Amex']
const CORES = ['#2C1A0F','#820AD1','#FF8700','#1E7D5A','#3D7EB5','#C4553B','#D94F8A','#7C5CBF']

function CardVisual({ cartao, mes, ano, onClick }: { cartao: any; mes: number; ano: number; onClick: () => void }) {
  const total = useTotalFatura(cartao.id, mes, ano)
  const disponivel = cartao.limite - total
  const pct = Math.min(100, (total / cartao.limite) * 100)
  return (
    <motion.div onClick={onClick} whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }}
      style={{ background: cartao.cor, borderRadius: 22, padding: '20px 20px 16px', cursor: 'pointer', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>{cartao.bandeira}</p>
          <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: 'white' }}>{cartao.nome}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: 'rgba(255,255,255,0.6)', marginBottom: 2 }}>FATURA ATUAL</p>
          <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700, color: 'white' }}>{fmt(total)}</p>
        </div>
      </div>
      <div style={{ marginBottom: 8 }}>
        <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 4, height: 5, overflow: 'hidden' }}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            style={{ height: '100%', background: pct > 80 ? '#FFB347' : 'white', borderRadius: 4 }} />
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
          Limite: {fmt(cartao.limite)}
        </p>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
          Disponível: {fmt(disponivel)}
        </p>
      </div>
      <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
        <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, background: 'rgba(255,255,255,0.2)', color: 'white', padding: '3px 8px', borderRadius: 20 }}>
          Fecha dia {cartao.diaFechamento}
        </span>
        <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, background: 'rgba(255,255,255,0.2)', color: 'white', padding: '3px 8px', borderRadius: 20 }}>
          Vence dia {cartao.diaVencimento}
        </span>
      </div>
    </motion.div>
  )
}

function FaturaSheet({ cartao, onClose }: { cartao: any; onClose: () => void }) {
  const { mes, ano } = mesAnoAtual()
  const [viewMes, setViewMes] = useState(mes)
  const [viewAno, setViewAno] = useState(ano)
  const lancamentos = useLancamentosCartao(cartao.id, viewMes, viewAno)
  const total = lancamentos.reduce((s, l) => s + l.valor, 0)
  const [addingLanc, setAddingLanc] = useState(false)

  const prevMes = () => { if (viewMes === 1) { setViewMes(12); setViewAno(a => a-1) } else setViewMes(m => m-1) }
  const nextMes = () => { if (viewMes === 12) { setViewMes(1); setViewAno(a => a+1) } else setViewMes(m => m+1) }
  const mesNome = new Date(viewAno, viewMes-1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(44,26,15,0.55)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={onClose}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FAF6F0', borderRadius: 14, padding: '10px 14px', marginBottom: 16 }}>
          <button onClick={prevMes} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#C4553B' }}>‹</button>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#9B7B6A', textTransform: 'capitalize' }}>{mesNome}</p>
            <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 24, fontWeight: 700, color: '#2C1A0F' }}>{fmt(total)}</p>
          </div>
          <button onClick={nextMes} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#C4553B' }}>›</button>
        </div>
        {lancamentos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <Dobrao mood="sleeping" size={72} />
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#9B7B6A', marginTop: 8 }}>Fatura vazia</p>
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

function LancRow({ lanc }: { lanc: any }) {
  const [catNome, setCatNome] = useState('')
  const [catCor, setCatCor] = useState('#9B8A7A')
  const [catIcon, setCatIcon] = useState('💸')
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
      <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 15, fontWeight: 700, color: '#C4553B', flexShrink: 0 }}>{fmt(lanc.valor)}</p>
    </div>
  )
}

function AddLancForm({ cartaoId, mes, ano, onClose }: { cartaoId: number; mes: number; ano: number; onClose: () => void }) {
  const [desc, setDesc] = useState('')
  const [valor, setValor] = useState('')
  const [catId, setCatId] = useState<number | null>(null)
  const [parcelas, setParcelas] = useState(1)
  const categorias = useCategorias('despesa')

  const handleSave = async () => {
    if (!desc || !valor || !catId) return
    await addLancamentoCartao({ cartaoId, descricao: desc, valor: parseFloat(valor.replace(',','.')), data: new Date().toISOString().split('T')[0], categoriaId: catId, totalParcelas: parcelas, mes, ano })
    onClose()
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(44,26,15,0.6)', zIndex: 400, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={onClose}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 560, background: '#FFFDF9', borderRadius: '24px 24px 0 0', padding: '20px 20px 48px' }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: '#E8E0D5', margin: '0 auto 16px' }} />
        <h3 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 18, fontWeight: 700, color: '#2C1A0F', marginBottom: 14 }}>Novo lançamento no cartão</h3>
        <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descrição"
          style={{ width: '100%', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '10px 14px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, outline: 'none', marginBottom: 10 }} />
        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '10px 14px', gap: 6, flex: 1 }}>
            <span style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 16, color: '#C4553B', fontWeight: 700 }}>R$</span>
            <input value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" type="tel"
              style={{ border: 'none', background: 'transparent', fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: '#2C1A0F', flex: 1, outline: 'none' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '10px 14px', gap: 8 }}>
            <button onClick={() => setParcelas(p => Math.max(1,p-1))} style={{ background: '#E8E0D5', border: 'none', borderRadius: 6, width: 26, height: 26, cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#2C1A0F' }}>−</button>
            <span style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 16, fontWeight: 700, color: '#2C1A0F', minWidth: 32, textAlign: 'center' }}>{parcelas}x</span>
            <button onClick={() => setParcelas(p => Math.min(48,p+1))} style={{ background: '#C4553B', border: 'none', borderRadius: 6, width: 26, height: 26, cursor: 'pointer', fontSize: 16, fontWeight: 700, color: 'white' }}>+</button>
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {categorias.map(c => (
            <button key={c.id} onClick={() => setCatId(c.id!)}
              style={{ padding: '5px 10px', borderRadius: 20, border: 'none', cursor: 'pointer', background: catId === c.id ? c.cor : '#F5F0E8', color: catId === c.id ? 'white' : '#7A5C4F', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>{c.icone}</span>{c.nome}
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
  const [selectedCartao, setSelectedCartao] = useState<any>(null)
  const [form, setForm] = useState({ nome: '', bandeira: 'Visa', limite: '', cor: '#2C1A0F', diaFechamento: 1, diaVencimento: 10 })

  const handleAdd = async () => {
    if (!form.nome || !form.limite) return
    await addCartao({ nome: form.nome, bandeira: form.bandeira, limite: parseFloat(form.limite.replace(',','.')), cor: form.cor, diaFechamento: form.diaFechamento, diaVencimento: form.diaVencimento, ativo: true })
    setAdding(false)
    setForm({ nome: '', bandeira: 'Visa', limite: '', cor: '#2C1A0F', diaFechamento: 1, diaVencimento: 10 })
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '20px 16px', maxWidth: 680, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 26, fontWeight: 700, color: '#2C1A0F' }}>Cartões</h1>
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => setAdding(true)}
          style={{ background: '#C4553B', color: 'white', border: 'none', borderRadius: 12, padding: '10px 18px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          + Adicionar
        </motion.button>
      </div>

      {cartoes.length === 0 && !adding ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <Dobrao mood="sleeping" size={100} />
          <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 18, fontWeight: 700, color: '#2C1A0F', marginTop: 12 }}>Nenhum cartão</p>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, color: '#9B7B6A', marginTop: 6 }}>Adicione seu cartão de crédito</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {cartoes.map(c => <CardVisual key={c.id} cartao={c} mes={mes} ano={ano} onClick={() => setSelectedCartao(c)} />)}
        </div>
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
              <h3 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: '#2C1A0F', marginBottom: 14 }}>Novo cartão</h3>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600, color: '#9B7B6A', marginBottom: 6 }}>BANDEIRA</p>
              <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                {BANDEIRAS.map(b => (
                  <button key={b} onClick={() => setForm(f => ({ ...f, bandeira: b }))}
                    style={{ padding: '6px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', background: form.bandeira === b ? '#C4553B' : '#F5F0E8', color: form.bandeira === b ? 'white' : '#7A5C4F', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, transition: 'all .15s' }}>
                    {b}
                  </button>
                ))}
              </div>
              <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome do cartão (ex: Nubank Roxo)"
                style={{ width: '100%', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '10px 14px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, outline: 'none', marginBottom: 10 }} />
              <div style={{ display: 'flex', alignItems: 'center', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '10px 14px', gap: 6, marginBottom: 10 }}>
                <span style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 16, color: '#C4553B', fontWeight: 700 }}>R$</span>
                <input value={form.limite} onChange={e => setForm(f => ({ ...f, limite: e.target.value }))} placeholder="Limite" type="tel"
                  style={{ border: 'none', background: 'transparent', fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: '#2C1A0F', flex: 1, outline: 'none' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600, color: '#9B7B6A', marginBottom: 4 }}>DIA FECHAMENTO</p>
                  <input value={form.diaFechamento} onChange={e => setForm(f => ({ ...f, diaFechamento: parseInt(e.target.value)||1 }))} type="number" min="1" max="31"
                    style={{ width: '100%', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '10px 14px', fontFamily: "'Fraunces',Georgia,serif", fontSize: 18, fontWeight: 700, color: '#2C1A0F', outline: 'none', textAlign: 'center' }} />
                </div>
                <div>
                  <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600, color: '#9B7B6A', marginBottom: 4 }}>DIA VENCIMENTO</p>
                  <input value={form.diaVencimento} onChange={e => setForm(f => ({ ...f, diaVencimento: parseInt(e.target.value)||10 }))} type="number" min="1" max="31"
                    style={{ width: '100%', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '10px 14px', fontFamily: "'Fraunces',Georgia,serif", fontSize: 18, fontWeight: 700, color: '#2C1A0F', outline: 'none', textAlign: 'center' }} />
                </div>
              </div>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600, color: '#9B7B6A', marginBottom: 6 }}>COR DO CARTÃO</p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {CORES.map(c => (
                  <button key={c} onClick={() => setForm(f => ({ ...f, cor: c }))}
                    style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: form.cor === c ? '3px solid #C4553B' : '2px solid transparent', cursor: 'pointer', transition: 'all .15s' }} />
                ))}
              </div>
              <motion.button onClick={handleAdd} whileTap={{ scale: 0.97 }} disabled={!form.nome || !form.limite}
                style={{ width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', cursor: 'pointer', background: form.nome && form.limite ? '#C4553B' : '#E8E0D5', color: form.nome && form.limite ? 'white' : '#9B7B6A', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, fontWeight: 700, transition: 'all .2s' }}>
                Adicionar cartão
              </motion.button>
            </motion.div>
          </motion.div>
        )}
        {selectedCartao && <FaturaSheet cartao={selectedCartao} onClose={() => setSelectedCartao(null)} />}
      </AnimatePresence>
    </motion.div>
  )
}

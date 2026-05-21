import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useContasFixas, usePagamentosFixos, addContaFixa, marcarPago, marcarPendente, deleteContaFixa } from '@/db/hooks/useContasFixas'
import { useContas } from '@/db/hooks/useContas'
import { useCategorias } from '@/db/hooks/useCategorias'
import { fmt, mesAnoAtual } from '@/lib/format'
import { Dobrao } from '@/components/mascot/Dobrao'
import { db } from '@/db/schema'

function ContaFixaRow({ cf, mes, ano }: { cf: any; mes: number; ano: number }) {
  const pagamentos = usePagamentosFixos(mes, ano)
  const pgto = pagamentos.find(p => p.contaFixaId === cf.id)
  const pago = pgto?.status === 'pago'
  const [catIcon, setCatIcon] = useState('💸')
  const [catCor, setCatCor] = useState('#9B8A7A')
  const [catNome, setCatNome] = useState('')
  useState(() => { db.categorias.get(cf.categoriaId).then(c => { if (c) { setCatIcon(c.icone); setCatCor(c.cor); setCatNome(c.nome) } }) })

  const hoje = new Date().getDate()
  const diasRestantes = cf.diaVencimento - hoje
  const urgente = !pago && diasRestantes >= 0 && diasRestantes <= 3
  const vencida = !pago && diasRestantes < 0

  return (
    <motion.div layout whileHover={{ x: 2 }}
      style={{ background: '#FFFDF9', border: `0.5px solid ${pago ? '#D0E8D8' : vencida ? '#FAD0D0' : urgente ? '#FAEBD0' : '#E8E0D5'}`, borderRadius: 16, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 44, height: 44, borderRadius: 14, background: pago ? '#D0E8D8' : catCor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0, transition: 'all .3s' }}>
        {pago ? '✓' : catIcon}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 600, color: pago ? '#9B7B6A' : '#2C1A0F', textDecoration: pago ? 'line-through' : 'none' }}>{cf.nome}</p>
        <div style={{ display: 'flex', gap: 6, marginTop: 3, alignItems: 'center' }}>
          <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 600, background: pago ? '#D0E8D8' : vencida ? '#FAD0D0' : urgente ? '#FAEBD0' : '#FAF0EE', color: pago ? '#3A8580' : vencida ? '#C4553B' : urgente ? '#D4A017' : '#C4553B', padding: '2px 7px', borderRadius: 20 }}>
            {pago ? 'Pago' : vencida ? `Venceu dia ${cf.diaVencimento}` : `Vence dia ${cf.diaVencimento}`}
          </span>
          <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: '#C4B4A8' }}>{catNome}</span>
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 16, fontWeight: 700, color: pago ? '#9B7B6A' : '#2C1A0F' }}>{fmt(cf.valor)}</p>
        <motion.button whileTap={{ scale: 0.9 }}
          onClick={() => pago ? marcarPendente(cf.id, mes, ano) : marcarPago(cf.id, mes, ano, cf.valor)}
          style={{ marginTop: 4, background: pago ? '#F5F0E8' : '#C4553B', color: pago ? '#7A5C4F' : 'white', border: 'none', borderRadius: 8, padding: '4px 10px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all .2s' }}>
          {pago ? 'Desfazer' : 'Pagar ✓'}
        </motion.button>
      </div>
    </motion.div>
  )
}

export function Page() {
  const { mes, ano } = mesAnoAtual()
  const contasFixas = useContasFixas()
  const pagamentos = usePagamentosFixos(mes, ano)
  const [adding, setAdding] = useState(false)
  const categorias = useCategorias('despesa')
  const contas = useContas()
  const [form, setForm] = useState({ nome: '', valor: '', diaVencimento: 10, categoriaId: null as number | null, contaId: null as number | null })

  const pagas = contasFixas.filter(cf => pagamentos.find(p => p.contaFixaId === cf.id)?.status === 'pago')
  const pendentes = contasFixas.filter(cf => !pagamentos.find(p => p.contaFixaId === cf.id && p.status === 'pago'))
  const totalMes = contasFixas.reduce((s, cf) => s + cf.valor, 0)
  const totalPago = pagas.reduce((s, cf) => s + cf.valor, 0)

  const handleAdd = async () => {
    if (!form.nome || !form.valor || !form.categoriaId) return
    await addContaFixa({ nome: form.nome, valor: parseFloat(form.valor.replace(',','.')), diaVencimento: form.diaVencimento, categoriaId: form.categoriaId, contaId: form.contaId, cartaoId: undefined, recorrencia: 'mensal', alertaDiasAntes: 3, ativo: true })
    setAdding(false)
    setForm({ nome: '', valor: '', diaVencimento: 10, categoriaId: null, contaId: null })
  }

  const mesNome = new Date(ano, mes-1, 1).toLocaleDateString('pt-BR', { month: 'long' })

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: "24px 28px", width: "100%" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 26, fontWeight: 700, color: '#2C1A0F' }}>Contas Fixas</h1>
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => setAdding(true)}
          style={{ background: '#C4553B', color: 'white', border: 'none', borderRadius: 12, padding: '10px 18px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          + Adicionar
        </motion.button>
      </div>

      {contasFixas.length > 0 && (
        <div style={{ background: '#FFFDF9', border: '0.5px solid #E8E0D5', borderRadius: 18, padding: '16px', marginBottom: 20 }}>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600, color: '#9B7B6A', marginBottom: 8, textTransform: 'capitalize' }}>{mesNome} — {pagas.length}/{contasFixas.length} pagas</p>
          <div style={{ background: '#F0EAE2', borderRadius: 8, height: 10, overflow: 'hidden', marginBottom: 8 }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${totalMes > 0 ? (totalPago/totalMes)*100 : 0}%` }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
              style={{ height: '100%', background: '#3A8580', borderRadius: 8 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#3A8580', fontWeight: 600 }}>Pago: {fmt(totalPago)}</span>
            <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#C4553B', fontWeight: 600 }}>A pagar: {fmt(totalMes - totalPago)}</span>
          </div>
        </div>
      )}

      {contasFixas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <Dobrao mood="sleeping" size={100} />
          <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 18, fontWeight: 700, color: '#2C1A0F', marginTop: 12 }}>Nenhuma conta fixa</p>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, color: '#9B7B6A', marginTop: 6 }}>Adicione aluguel, internet, assinaturas...</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {pendentes.length > 0 && (
            <>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600, color: '#9B7B6A', margin: '4px 0' }}>A PAGAR</p>
              {pendentes.map(cf => <ContaFixaRow key={cf.id} cf={cf} mes={mes} ano={ano} />)}
            </>
          )}
          {pagas.length > 0 && (
            <>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600, color: '#9B7B6A', margin: '12px 0 4px' }}>PAGAS</p>
              {pagas.map(cf => <ContaFixaRow key={cf.id} cf={cf} mes={mes} ano={ano} />)}
            </>
          )}
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
              style={{ width: '100%', maxWidth: 520, background: '#FFFDF9', borderRadius: '24px 24px 0 0', padding: '20px 20px 48px', maxHeight: '90dvh', overflowY: 'auto' }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: '#E8E0D5', margin: '0 auto 16px' }} />
              <h3 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: '#2C1A0F', marginBottom: 14 }}>Nova conta fixa</h3>
              <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome (ex: Aluguel, Internet, Spotify)"
                style={{ width: '100%', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '10px 14px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, outline: 'none', marginBottom: 10 }} />
              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '10px 14px', gap: 6 }}>
                  <span style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 16, color: '#C4553B', fontWeight: 700 }}>R$</span>
                  <input value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} placeholder="0,00" type="tel"
                    style={{ border: 'none', background: 'transparent', fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: '#2C1A0F', flex: 1, outline: 'none' }} />
                </div>
                <div style={{ width: 100 }}>
                  <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 600, color: '#9B7B6A', marginBottom: 4, textAlign: 'center' }}>DIA VENCE</p>
                  <input value={form.diaVencimento} onChange={e => setForm(f => ({ ...f, diaVencimento: parseInt(e.target.value)||1 }))} type="number" min="1" max="31"
                    style={{ width: '100%', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '10px 0', fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: '#2C1A0F', outline: 'none', textAlign: 'center' }} />
                </div>
              </div>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600, color: '#9B7B6A', marginBottom: 6 }}>CATEGORIA</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                {categorias.map(c => (
                  <button key={c.id} onClick={() => setForm(f => ({ ...f, categoriaId: c.id! }))}
                    style={{ padding: '5px 10px', borderRadius: 20, border: 'none', cursor: 'pointer', background: form.categoriaId === c.id ? c.cor : '#F5F0E8', color: form.categoriaId === c.id ? 'white' : '#7A5C4F', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>{c.icone}</span>{c.nome}
                  </button>
                ))}
              </div>
              {contas.length > 0 && (
                <>
                  <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600, color: '#9B7B6A', marginBottom: 6 }}>DÉBITA DE</p>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                    {contas.map(c => (
                      <button key={c.id} onClick={() => setForm(f => ({ ...f, contaId: f.contaId === c.id ? null : c.id! }))}
                        style={{ padding: '5px 10px', borderRadius: 20, border: 'none', cursor: 'pointer', background: form.contaId === c.id ? c.cor : '#F5F0E8', color: form.contaId === c.id ? 'white' : '#7A5C4F', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, transition: 'all .15s' }}>
                        {c.icone} {c.nome}
                      </button>
                    ))}
                  </div>
                </>
              )}
              <motion.button onClick={handleAdd} whileTap={{ scale: 0.97 }} disabled={!form.nome || !form.valor || !form.categoriaId}
                style={{ width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', cursor: 'pointer', background: form.nome && form.valor && form.categoriaId ? '#C4553B' : '#E8E0D5', color: form.nome && form.valor && form.categoriaId ? 'white' : '#9B7B6A', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, fontWeight: 700, transition: 'all .2s' }}>
                Adicionar conta fixa
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

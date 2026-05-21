import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useContasFixas, usePagamentosFixos, addContaFixa, marcarPago, marcarPendente, deleteContaFixa } from '@/db/hooks/useContasFixas'
import { useContas } from '@/db/hooks/useContas'
import { useCategorias } from '@/db/hooks/useCategorias'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { fmt, mesAnoAtual } from '@/lib/format'
import { Dobrao } from '@/components/mascot/Dobrao'
import { db } from '@/db/schema'
import { IconPlus, IconX, IconTrash, IconCheck } from '@tabler/icons-react'

function ContaFixaRow({ cf, mes, ano }: { cf: any; mes: number; ano: number }) {
  const pagamentos = usePagamentosFixos(mes, ano)
  const pgto = pagamentos.find(p => p.contaFixaId === cf.id)
  const pago = pgto?.status === 'pago'
  const [cat, setCat] = useState<any>(null)
  useState(() => { db.categorias.get(cf.categoriaId).then(setCat) })

  const hoje = new Date().getDate()
  const diasRestantes = cf.diaVencimento - hoje
  const urgente = !pago && diasRestantes >= 0 && diasRestantes <= 3
  const vencida = !pago && diasRestantes < 0

  return (
    <motion.div layout whileHover={{ x: 2 }}
      style={{ background: '#FFFDF9', border: `0.5px solid ${pago ? '#D0E8D8' : vencida ? '#FAD0D0' : urgente ? '#FAEBD0' : '#E8E0D5'}`, borderRadius: 16, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        {cat && <CategoryIcon nome={cat.nome} cor={pago ? '#B0C8B0' : cat.cor} size={46} radius={14} />}
        {pago && (
          <div style={{ position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: '50%', background: '#3A8580', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white' }}>
            <IconCheck size={10} color="white" stroke={3} />
          </div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 600, color: pago ? '#9B7B6A' : '#2C1A0F', textDecoration: pago ? 'line-through' : 'none' }}>{cf.nome}</p>
        <div style={{ display: 'flex', gap: 6, marginTop: 3, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, background: pago ? '#D0E8D8' : vencida ? '#FAD0D0' : urgente ? '#FAEBD0' : '#F5F0E8', color: pago ? '#3A8580' : vencida ? '#C4553B' : urgente ? '#D4A017' : '#9B7B6A', padding: '2px 8px', borderRadius: 20 }}>
            {pago ? 'Pago ✓' : vencida ? `Venceu dia ${cf.diaVencimento}` : `Vence dia ${cf.diaVencimento}`}
          </span>
          {cat && <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: '#C4B4A8' }}>{cat.nome}</span>}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 17, fontWeight: 700, color: pago ? '#9B7B6A' : '#2C1A0F' }}>{fmt(cf.valor)}</p>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => pago ? marcarPendente(cf.id, mes, ano) : marcarPago(cf.id, mes, ano, cf.valor)}
          style={{ marginTop: 5, background: pago ? '#F5F0E8' : '#C4553B', color: pago ? '#7A5C4F' : 'white', border: 'none', borderRadius: 8, padding: '5px 11px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all .2s' }}>
          {pago ? 'Desfazer' : 'Pagar'}
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
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const categorias = useCategorias('despesa')
  const contas = useContas()
  const [form, setForm] = useState({ nome: '', valor: '', diaVencimento: 10, categoriaId: null as number | null, contaId: null as number | null })

  const pagas = contasFixas.filter(cf => pagamentos.find(p => p.contaFixaId === cf.id)?.status === 'pago')
  const pendentes = contasFixas.filter(cf => !pagamentos.find(p => p.contaFixaId === cf.id && p.status === 'pago'))
  const totalMes = contasFixas.reduce((s, cf) => s + cf.valor, 0)
  const totalPago = pagas.reduce((s, cf) => s + cf.valor, 0)
  const mesNome = new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', { month: 'long' })

  const handleAdd = async () => {
    if (!form.nome || !form.valor || !form.categoriaId) return
    await addContaFixa({ nome: form.nome, valor: parseFloat(form.valor.replace(',', '.')), diaVencimento: form.diaVencimento, categoriaId: form.categoriaId, contaId: form.contaId, cartaoId: undefined, recorrencia: 'mensal', alertaDiasAntes: 3, ativo: true })
    setAdding(false)
    setForm({ nome: '', valor: '', diaVencimento: 10, categoriaId: null, contaId: null })
  }

  return (
    <div style={{ padding: '24px 28px', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 28, fontWeight: 700, color: '#2C1A0F' }}>Contas Fixas</h1>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#9B7B6A', marginTop: 2, textTransform: 'capitalize' }}>{mesNome} · {contasFixas.length} conta{contasFixas.length !== 1 ? 's' : ''}</p>
        </div>
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => setAdding(true)}
          style={{ background: '#C4553B', color: 'white', border: 'none', borderRadius: 12, padding: '10px 18px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <IconPlus size={16} stroke={2.5} /> Adicionar
        </motion.button>
      </div>

      {contasFixas.length > 0 && (
        <div style={{ background: '#FFFDF9', border: '0.5px solid #E8E0D5', borderRadius: 18, padding: '16px 18px', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#9B7B6A' }}>{pagas.length}/{contasFixas.length} pagas</span>
            <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700, color: '#2C1A0F' }}>{fmt(totalMes)} total</span>
          </div>
          <div style={{ background: '#F0EAE2', borderRadius: 8, height: 10, overflow: 'hidden', marginBottom: 8 }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${totalMes > 0 ? (totalPago / totalMes) * 100 : 0}%` }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
              style={{ height: '100%', background: '#3A8580', borderRadius: 8 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#3A8580', fontWeight: 700 }}>Pago: {fmt(totalPago)}</span>
            <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#C4553B', fontWeight: 700 }}>Pendente: {fmt(totalMes - totalPago)}</span>
          </div>
        </div>
      )}

      {contasFixas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Dobrao mood="sleeping" size={90} />
          <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: '#2C1A0F', marginTop: 16 }}>Nenhuma conta fixa</p>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, color: '#9B7B6A', marginTop: 6 }}>Aluguel, internet, streaming, assinaturas...</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {pendentes.length > 0 && (
            <>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: '#9B7B6A', margin: '4px 0', letterSpacing: '.05em' }}>A PAGAR</p>
              {pendentes.map(cf => <ContaFixaRow key={cf.id} cf={cf} mes={mes} ano={ano} />)}
            </>
          )}
          {pagas.length > 0 && (
            <>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: '#9B7B6A', margin: '12px 0 4px', letterSpacing: '.05em' }}>PAGAS</p>
              {pagas.map(cf => <ContaFixaRow key={cf.id} cf={cf} mes={mes} ano={ano} />)}
            </>
          )}
        </div>
      )}

      <AnimatePresence>
        {confirmDelete !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setConfirmDelete(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(44,26,15,0.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={e => e.stopPropagation()}
              style={{ background: '#FFFDF9', borderRadius: 22, padding: '28px 24px', maxWidth: 320, width: '100%', textAlign: 'center' }}>
              <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: '#2C1A0F', marginBottom: 8 }}>Excluir conta fixa?</p>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, color: '#9B7B6A', marginBottom: 24 }}>Histórico de pagamentos será removido.</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: '1.5px solid #E8E0D5', background: 'white', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 600, color: '#7A5C4F', cursor: 'pointer' }}>Cancelar</button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={async () => { await deleteContaFixa(confirmDelete); setConfirmDelete(null) }}
                  style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: 'none', background: '#C4553B', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 700, color: 'white', cursor: 'pointer' }}>Excluir</motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {adding && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setAdding(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(44,26,15,0.55)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: 520, background: '#FFFDF9', borderRadius: '24px 24px 0 0', padding: '20px 20px 48px', maxHeight: '90dvh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <h3 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700, color: '#2C1A0F' }}>Nova conta fixa</h3>
                <button onClick={() => setAdding(false)} style={{ background: '#F5F0E8', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconX size={16} color="#9B7B6A" />
                </button>
              </div>

              <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome (ex: Aluguel, Internet, Spotify)"
                style={{ width: '100%', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '12px 14px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, outline: 'none', marginBottom: 10, boxSizing: 'border-box' }} />

              <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '12px 14px', gap: 6 }}>
                  <span style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 18, color: '#C4553B', fontWeight: 700 }}>R$</span>
                  <input value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} placeholder="Valor" type="tel"
                    style={{ border: 'none', background: 'transparent', fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700, color: '#2C1A0F', flex: 1, outline: 'none' }} />
                </div>
                <div style={{ width: 90, textAlign: 'center' }}>
                  <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: '#9B7B6A', marginBottom: 5 }}>DIA VENCE</p>
                  <input value={form.diaVencimento} onChange={e => setForm(f => ({ ...f, diaVencimento: parseInt(e.target.value) || 1 }))} type="number" min="1" max="31"
                    style={{ width: '100%', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '10px 0', fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700, color: '#2C1A0F', outline: 'none', textAlign: 'center' }} />
                </div>
              </div>

              {/* Categorias com CategoryIcon */}
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: '#9B7B6A', marginBottom: 8, letterSpacing: '.04em' }}>CATEGORIA</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: 8, marginBottom: 14 }}>
                {categorias.map(c => (
                  <motion.button key={c.id} onClick={() => setForm(f => ({ ...f, categoriaId: c.id! }))} whileTap={{ scale: 0.92 }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '10px 4px', borderRadius: 14, border: form.categoriaId === c.id ? `2px solid ${c.cor}` : '1.5px solid #E8E0D5', background: form.categoriaId === c.id ? `${c.cor}12` : 'white', cursor: 'pointer', transition: 'all .15s' }}>
                    <CategoryIcon nome={c.nome} cor={c.cor} size={38} radius={11} />
                    <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 600, color: form.categoriaId === c.id ? c.cor : '#7A5C4F', textAlign: 'center', lineHeight: 1.2 }}>{c.nome}</span>
                  </motion.button>
                ))}
              </div>

              {contas.length > 0 && (
                <>
                  <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: '#9B7B6A', marginBottom: 6 }}>DÉBITA DE (opcional)</p>
                  <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 16 }}>
                    {contas.map(c => (
                      <button key={c.id} onClick={() => setForm(f => ({ ...f, contaId: f.contaId === c.id ? null : c.id! }))}
                        style={{ padding: '6px 12px', borderRadius: 20, border: form.contaId === c.id ? `2px solid ${c.cor}` : '1.5px solid #E8E0D5', cursor: 'pointer', background: form.contaId === c.id ? `${c.cor}18` : 'white', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, color: form.contaId === c.id ? c.cor : '#7A5C4F', transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.cor }} />{c.nome}
                      </button>
                    ))}
                  </div>
                </>
              )}

              <motion.button onClick={handleAdd} whileTap={{ scale: 0.97 }} disabled={!form.nome || !form.valor || !form.categoriaId}
                style={{ width: '100%', padding: '15px 0', borderRadius: 14, border: 'none', cursor: form.nome && form.valor && form.categoriaId ? 'pointer' : 'default', background: form.nome && form.valor && form.categoriaId ? '#C4553B' : '#E8E0D5', color: form.nome && form.valor && form.categoriaId ? 'white' : '#9B7B6A', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, fontWeight: 700, transition: 'all .2s' }}>
                Adicionar conta fixa
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useContasFixas, usePagamentosFixos, addContaFixa, editContaFixa, marcarPago, marcarPendente, deleteContaFixa } from '@/db/hooks/useContasFixas'
import { useContas } from '@/db/hooks/useContas'
import { useCategorias } from '@/db/hooks/useCategorias'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { fmt, mesAnoAtual } from '@/lib/format'
import { Dobrao } from '@/components/mascot/Dobrao'
import { db } from '@/db/schema'
import { IconPlus, IconX, IconTrash, IconCheck, IconEdit, IconCalendarDue, IconAlertTriangle, IconCircleCheck } from '@tabler/icons-react'

function lightenHex(hex: string, pct: number) {
  if (!hex || hex.length < 7) return hex
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return `#${Math.min(255,Math.round(r+(255-r)*pct/100)).toString(16).padStart(2,'0')}${Math.min(255,Math.round(g+(255-g)*pct/100)).toString(16).padStart(2,'0')}${Math.min(255,Math.round(b+(255-b)*pct/100)).toString(16).padStart(2,'0')}`
}
function darkenHex(hex: string, pct: number) {
  if (!hex || hex.length < 7) return hex
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return `#${Math.max(0,Math.round(r*(1-pct/100))).toString(16).padStart(2,'0')}${Math.max(0,Math.round(g*(1-pct/100))).toString(16).padStart(2,'0')}${Math.max(0,Math.round(b*(1-pct/100))).toString(16).padStart(2,'0')}`
}

function ContaFixaRow({ cf, mes, ano, onEdit, onDelete }: { cf: any; mes: number; ano: number; onEdit: () => void; onDelete: () => void }) {
  const pagamentos = usePagamentosFixos(mes, ano)
  const pgto = pagamentos.find(p => p.contaFixaId === cf.id)
  const pago = pgto?.status === 'pago'
  const [cat, setCat] = useState<any>(null)
  const [justPaid, setJustPaid] = useState(false)
  useState(() => { db.categorias.get(cf.categoriaId).then(setCat) })

  const hoje = new Date().getDate()
  const diasRestantes = cf.diaVencimento - hoje
  const urgente = !pago && diasRestantes >= 0 && diasRestantes <= 3
  const vencida = !pago && diasRestantes < 0

  const statusColor = pago ? '#3A8580' : vencida ? '#C4553B' : urgente ? '#D4A017' : '#9B7B6A'
  const statusBg = pago ? 'rgba(58,133,128,0.08)' : vencida ? 'rgba(196,85,59,0.08)' : urgente ? 'rgba(212,160,23,0.08)' : 'transparent'
  const borderColor = pago ? 'rgba(58,133,128,0.2)' : vencida ? 'rgba(196,85,59,0.2)' : urgente ? 'rgba(212,160,23,0.2)' : '#EDE6DC'

  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      style={{ background: pago ? '#F8FDF8' : '#FFFDF9', border: `1px solid ${borderColor}`, borderRadius: 18, padding: '14px 16px', position: 'relative', overflow: 'hidden' }}>

      {(urgente || vencida) && !pago && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: vencida ? 'linear-gradient(90deg, #C4553B, #E07055)' : 'linear-gradient(90deg, #D4A017, #F0BB30)', borderRadius: '18px 18px 0 0' }} />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          {cat && <CategoryIcon nome={cat.nome} cor={pago ? '#B0C8B0' : cat.cor} size={46} radius={14} />}
          {pago && (
            <div style={{ position: 'absolute', bottom: -3, right: -3, width: 18, height: 18, borderRadius: '50%', background: '#3A8580', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }}>
              <IconCheck size={10} color="white" stroke={3} />
            </div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 700, color: pago ? '#9B7B6A' : '#2C1A0F', textDecoration: pago ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cf.nome}</p>
          <div style={{ display: 'flex', gap: 5, marginTop: 4, alignItems: 'center' }}>
            <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, background: statusBg, color: statusColor, padding: '2px 8px', borderRadius: 20, border: `1px solid ${borderColor}`, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              {pago && <IconCircleCheck size={9} stroke={2.5} color="#3A8580" />}
              {vencida && <IconAlertTriangle size={9} stroke={2.5} color="#C4553B" />}
              {!pago && !vencida && <IconCalendarDue size={9} stroke={2} color={urgente ? '#D4A017' : '#9B7B6A'} />}
              {pago ? 'Pago' : vencida ? `Venceu dia ${cf.diaVencimento}` : urgente ? `Vence em ${diasRestantes}d` : `Dia ${cf.diaVencimento}`}
            </span>
            {cat && <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: '#C4B4A8' }}>{cat.nome}</span>}
          </div>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 17, fontWeight: 700, color: pago ? '#9B7B6A' : '#2C1A0F', letterSpacing: '-0.3px' }}>{fmt(cf.valor)}</p>
          <div style={{ display: 'flex', gap: 4, marginTop: 6, justifyContent: 'flex-end' }}>
            <motion.button
              whileTap={{ scale: 0.9 }}
              animate={justPaid ? { scale: [1, 1.15, 1] } : {}}
              transition={{ duration: 0.35 }}
              onClick={() => {
                if (pago) {
                  marcarPendente(cf.id, mes, ano)
                } else {
                  marcarPago(cf.id, mes, ano, cf.valor)
                  setJustPaid(true)
                  setTimeout(() => setJustPaid(false), 1500)
                }
              }}
              style={{ background: pago ? '#F0F8F0' : justPaid ? '#3A8580' : '#C4553B', color: pago ? '#3A8580' : 'white', border: 'none', borderRadius: 8, padding: '5px 11px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all .2s', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              {justPaid && <IconCheck size={11} stroke={3} color="white" />}
              {justPaid ? 'Pago!' : pago ? 'Desfazer' : 'Pagar'}
            </motion.button>
            <button onClick={onEdit} style={{ background: '#F5F0E8', border: 'none', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconEdit size={12} color="#7A5C4F" stroke={2} />
            </button>
            <button onClick={onDelete} style={{ background: '#FAF0EE', border: 'none', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconTrash size={12} color="#C4553B" stroke={2} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export function Page() {
  const { mes, ano } = mesAnoAtual()
  const contasFixas = useContasFixas()
  const pagamentos = usePagamentosFixos(mes, ano)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const categorias = useCategorias('despesa')
  const contas = useContas()
  const [form, setForm] = useState({ nome: '', valor: '', diaVencimento: 10, categoriaId: null as number | null, contaId: null as number | null })

  const openEdit = (cf: any) => {
    setEditingId(cf.id)
    setForm({ nome: cf.nome, valor: String(cf.valor), diaVencimento: cf.diaVencimento, categoriaId: cf.categoriaId, contaId: cf.contaId ?? null })
    setAdding(true)
  }

  const pagas = contasFixas.filter(cf => pagamentos.find(p => p.contaFixaId === cf.id)?.status === 'pago')
  const pendentes = contasFixas.filter(cf => !pagamentos.find(p => p.contaFixaId === cf.id && p.status === 'pago'))
  const totalMes = contasFixas.reduce((s, cf) => s + cf.valor, 0)
  const totalPago = pagas.reduce((s, cf) => s + cf.valor, 0)
  const totalPendente = totalMes - totalPago
  const pct = totalMes > 0 ? (totalPago / totalMes) * 100 : 0
  const mesNome = new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', { month: 'long' })

  const handleSave = async () => {
    if (!form.nome || !form.valor || !form.categoriaId) return
    const data = { nome: form.nome, valor: parseFloat(form.valor.replace(',', '.')), diaVencimento: form.diaVencimento, categoriaId: form.categoriaId, contaId: form.contaId }
    if (editingId !== null) {
      await editContaFixa(editingId, data)
    } else {
      await addContaFixa({ ...data, cartaoId: undefined, recorrencia: 'mensal', alertaDiasAntes: 3, ativo: true })
    }
    setAdding(false)
    setEditingId(null)
    setForm({ nome: '', valor: '', diaVencimento: 10, categoriaId: null, contaId: null })
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '24px 28px', width: '100%' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 28, fontWeight: 700, color: '#2C1A0F' }}>Contas Fixas</h1>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#9B7B6A', marginTop: 2, textTransform: 'capitalize' }}>{mesNome} · {contasFixas.length} conta{contasFixas.length !== 1 ? 's' : ''}</p>
        </div>
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setEditingId(null); setForm({ nome: '', valor: '', diaVencimento: 10, categoriaId: null, contaId: null }); setAdding(true) }}
          style={{ background: 'linear-gradient(135deg, #D4643A, #C4553B)', color: 'white', border: 'none', borderRadius: 14, padding: '11px 18px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 16px rgba(196,85,59,0.35)' }}>
          <IconPlus size={16} stroke={2.5} /> Adicionar
        </motion.button>
      </div>

      {contasFixas.length > 0 && (
        <div style={{ background: 'linear-gradient(140deg, #1E0C04 0%, #3E1C0C 45%, #2C1208 100%)', borderRadius: 22, padding: '20px 22px', marginBottom: 24, position: 'relative', overflow: 'hidden', boxShadow: '0 8px 32px rgba(20,8,0,0.25)' }}>
          <div style={{ position: 'absolute', top: -60, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(58,133,128,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -40, left: -30, width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle, rgba(196,85,59,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, position: 'relative' }}>
            <div style={{ width: 28, height: 28, borderRadius: 9, background: 'rgba(58,133,128,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconCalendarDue size={15} color="#6FCFCA" stroke={2} />
            </div>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Resumo do mês</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16, position: 'relative' }}>
            <div style={{ background: 'rgba(58,133,128,0.2)', border: '1px solid rgba(58,133,128,0.25)', borderRadius: 14, padding: '12px 14px' }}>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 700, color: '#6FCFCA', letterSpacing: '.07em', marginBottom: 4 }}>PAGO</p>
              <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: 'white', letterSpacing: '-0.5px' }}>{fmt(totalPago)}</p>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>{pagas.length} de {contasFixas.length} contas</p>
            </div>
            <div style={{ background: totalPendente > 0 ? 'rgba(196,85,59,0.18)' : 'rgba(255,255,255,0.06)', border: `1px solid ${totalPendente > 0 ? 'rgba(196,85,59,0.25)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 14, padding: '12px 14px' }}>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 700, color: totalPendente > 0 ? '#F09070' : 'rgba(255,255,255,0.4)', letterSpacing: '.07em', marginBottom: 4 }}>PENDENTE</p>
              <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: totalPendente > 0 ? '#FFB09A' : 'rgba(255,255,255,0.5)', letterSpacing: '-0.5px' }}>{fmt(totalPendente)}</p>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>{pendentes.length} conta{pendentes.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{Math.round(pct)}% concluído</span>
              <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Total: {fmt(totalMes)}</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 8, height: 8, overflow: 'hidden' }}>
              <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                transition={{ type: 'spring', stiffness: 200, damping: 25, delay: 0.1 }}
                style={{ height: '100%', background: 'linear-gradient(90deg, #4AAEA8, #3A8580)', borderRadius: 8 }} />
            </div>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 8px' }}>
                <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: '#9B7B6A', letterSpacing: '.06em' }}>A PAGAR</span>
                <div style={{ flex: 1, height: 1, background: '#EDE6DC' }} />
                <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: '#C4553B' }}>{fmt(pendentes.reduce((s,cf) => s+cf.valor,0))}</span>
              </div>
              {pendentes.map(cf => <ContaFixaRow key={cf.id} cf={cf} mes={mes} ano={ano} onEdit={() => openEdit(cf)} onDelete={() => setConfirmDelete(cf.id!)} />)}
            </>
          )}
          {pagas.length > 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 0 8px' }}>
                <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: '#9B7B6A', letterSpacing: '.06em' }}>PAGAS</span>
                <div style={{ flex: 1, height: 1, background: '#EDE6DC' }} />
                <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: '#3A8580' }}>{fmt(pagas.reduce((s,cf) => s+cf.valor,0))}</span>
              </div>
              {pagas.map(cf => <ContaFixaRow key={cf.id} cf={cf} mes={mes} ano={ano} onEdit={() => openEdit(cf)} onDelete={() => setConfirmDelete(cf.id!)} />)}
            </>
          )}
        </div>
      )}

      <AnimatePresence>
        {confirmDelete !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setConfirmDelete(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(44,26,15,0.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }} onClick={e => e.stopPropagation()}
              style={{ background: '#FFFDF9', borderRadius: 24, padding: '28px 24px', maxWidth: 320, width: '100%', textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: '#FAF0EE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <IconTrash size={24} color="#C4553B" stroke={1.8} />
              </div>
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
              style={{ width: '100%', maxWidth: 520, background: '#FFFDF9', borderRadius: '28px 28px 0 0', padding: '8px 20px 48px', maxHeight: '90dvh', overflowY: 'auto' }}>

              <div style={{ width: 40, height: 4, borderRadius: 2, background: '#E8E0D5', margin: '12px auto 18px' }} />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h3 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700, color: '#2C1A0F' }}>{editingId ? 'Editar conta fixa' : 'Nova conta fixa'}</h3>
                <button onClick={() => setAdding(false)} style={{ background: '#F5F0E8', border: 'none', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconX size={16} color="#9B7B6A" />
                </button>
              </div>

              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: '#9B7B6A', marginBottom: 6, letterSpacing: '.04em' }}>NOME</p>
              <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Aluguel, Internet, Spotify..."
                style={{ width: '100%', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 14, padding: '13px 16px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, outline: 'none', marginBottom: 14, boxSizing: 'border-box', color: '#2C1A0F' }} />

              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: '#9B7B6A', marginBottom: 6, letterSpacing: '.04em' }}>VALOR</p>
                  <div style={{ display: 'flex', alignItems: 'center', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 14, padding: '12px 14px', gap: 6 }}>
                    <span style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 18, color: '#C4553B', fontWeight: 700 }}>R$</span>
                    <input value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} placeholder="0,00" type="tel"
                      style={{ border: 'none', background: 'transparent', fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700, color: '#2C1A0F', flex: 1, outline: 'none', width: '100%' }} />
                  </div>
                </div>
                <div style={{ width: 100 }}>
                  <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: '#9B7B6A', marginBottom: 6, letterSpacing: '.04em' }}>DIA VENCE</p>
                  <input value={form.diaVencimento} onChange={e => setForm(f => ({ ...f, diaVencimento: parseInt(e.target.value) || 1 }))} type="number" min="1" max="31"
                    style={{ width: '100%', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 14, padding: '12px 0', fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700, color: '#2C1A0F', outline: 'none', textAlign: 'center', boxSizing: 'border-box' }} />
                </div>
              </div>

              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: '#9B7B6A', marginBottom: 10, letterSpacing: '.04em' }}>CATEGORIA</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: 8, marginBottom: 16 }}>
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
                  <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: '#9B7B6A', marginBottom: 8, letterSpacing: '.04em' }}>DÉBITA DE <span style={{ fontWeight: 400, textTransform: 'none' }}>(opcional)</span></p>
                  <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 18 }}>
                    {contas.map(c => (
                      <button key={c.id} onClick={() => setForm(f => ({ ...f, contaId: f.contaId === c.id ? null : c.id! }))}
                        style={{ padding: '7px 14px', borderRadius: 20, border: form.contaId === c.id ? `2px solid ${c.cor}` : '1.5px solid #E8E0D5', cursor: 'pointer', background: form.contaId === c.id ? `${c.cor}18` : 'white', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, color: form.contaId === c.id ? c.cor : '#7A5C4F', transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.cor }} />{c.nome}
                      </button>
                    ))}
                  </div>
                </>
              )}

              <motion.button onClick={handleSave} whileTap={{ scale: 0.97 }} disabled={!form.nome || !form.valor || !form.categoriaId}
                style={{ width: '100%', padding: '16px 0', borderRadius: 14, border: 'none', cursor: form.nome && form.valor && form.categoriaId ? 'pointer' : 'default', background: form.nome && form.valor && form.categoriaId ? 'linear-gradient(135deg, #D4643A, #C4553B)' : '#E8E0D5', color: form.nome && form.valor && form.categoriaId ? 'white' : '#9B7B6A', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, fontWeight: 700, transition: 'all .2s', boxShadow: form.nome && form.valor && form.categoriaId ? '0 4px 20px rgba(196,85,59,0.35)' : 'none' }}>
                {editingId ? 'Salvar alterações' : 'Adicionar conta fixa'}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

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

const DISPLAY: React.CSSProperties = { fontFamily: "'Fraunces',Georgia,serif", fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1.1 }
const NUM: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, letterSpacing: '-0.3px', lineHeight: 1.1 }
const LABEL: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }
const SUB: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#9B7B6A' }
const CARD: React.CSSProperties = { background: '#FFFFFF', border: '1px solid #EDE6DC', borderRadius: 20, boxShadow: '0 1px 3px rgba(44,26,15,0.05), 0 4px 16px rgba(44,26,15,0.06)' }

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
  const statusBg = pago ? 'rgba(58,133,128,0.1)' : vencida ? 'rgba(196,85,59,0.1)' : urgente ? 'rgba(212,160,23,0.1)' : '#F5F0E8'
  const borderColor = pago ? 'rgba(58,133,128,0.2)' : vencida ? 'rgba(196,85,59,0.2)' : urgente ? 'rgba(212,160,23,0.2)' : '#EDE6DC'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: pago ? 0.72 : 1, y: 0 }}
      whileHover={{ y: -4, boxShadow: '0 4px 12px rgba(44,26,15,0.08), 0 8px 24px rgba(44,26,15,0.07)' }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      style={{ ...CARD, padding: '14px 16px', position: 'relative', overflow: 'hidden', cursor: 'default' }}>

      {(urgente || vencida) && !pago && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: vencida ? 'linear-gradient(90deg, #C4553B, #E07055)' : 'linear-gradient(90deg, #D4A017, #F0BB30)', borderRadius: '20px 20px 0 0' }} />
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
            <span style={{ ...LABEL as object, fontSize: 10, background: statusBg, color: statusColor, padding: '2px 8px', borderRadius: 20, border: `1px solid ${borderColor}`, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              {pago && <IconCircleCheck size={9} stroke={2.5} color="#3A8580" />}
              {vencida && <IconAlertTriangle size={9} stroke={2.5} color="#C4553B" />}
              {!pago && !vencida && <IconCalendarDue size={9} stroke={2} color={urgente ? '#D4A017' : '#9B7B6A'} />}
              {pago ? 'Pago' : vencida ? `Venceu dia ${cf.diaVencimento}` : urgente ? `Vence em ${diasRestantes}d` : `Dia ${cf.diaVencimento}`}
            </span>
            {cat && <span style={{ ...SUB as object, fontSize: 10, color: '#C4B4A8' }}>{cat.nome}</span>}
          </div>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ ...NUM as object, fontSize: 17, color: pago ? '#9B7B6A' : '#2C1A0F' }}>{fmt(cf.valor)}</p>
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

  const fixasPagas = contasFixas.filter(cf => pagamentos.find(p => p.contaFixaId === cf.id)?.status === 'pago')
  const pendentes = contasFixas.filter(cf => !pagamentos.find(p => p.contaFixaId === cf.id && p.status === 'pago'))
  const totalMes = contasFixas.reduce((s, cf) => s + cf.valor, 0)
  const totalPago = fixasPagas.reduce((s, cf) => s + cf.valor, 0)
  const totalPendente = totalMes - totalPago
  const pctConcluido = totalMes > 0 ? (totalPago / totalMes) * 100 : 0
  const mesNome = new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', { month: 'long' })
  const mesCapital = mesNome.charAt(0).toUpperCase() + mesNome.slice(1)

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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '32px', width: '100%' }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid #EDE6DC' }}>
        <div>
          <h1 style={{ ...DISPLAY as object, fontSize: 38, color: '#2C1A0F', letterSpacing: '-1.5px' }}>Contas Fixas</h1>
          <p style={{ ...SUB as object, fontSize: 13, marginTop: 4 }}>{mesCapital} · {contasFixas.length} conta{contasFixas.length !== 1 ? 's' : ''} cadastrada{contasFixas.length !== 1 ? 's' : ''}</p>
        </div>
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setEditingId(null); setForm({ nome: '', valor: '', diaVencimento: 10, categoriaId: null, contaId: null }); setAdding(true) }}
          style={{ background: 'linear-gradient(135deg, #D4643A, #C4553B)', color: 'white', border: 'none', borderRadius: 14, padding: '11px 18px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 16px rgba(196,85,59,0.35)', flexShrink: 0 }}>
          <IconPlus size={16} stroke={2.5} /> Adicionar
        </motion.button>
      </div>

      {/* KPI Cards — substituem o dark card */}
      {contasFixas.length > 0 && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
            <div style={{ background: '#EBF5F0', borderRadius: 16, padding: '14px 16px', border: '1px solid rgba(58,133,128,0.15)' }}>
              <p style={{ ...LABEL as object, color: '#3A8580', marginBottom: 4 }}>Pago</p>
              <p style={{ ...NUM as object, fontSize: 20, color: '#3A8580' }}>{fmt(totalPago)}</p>
              <p style={{ ...SUB as object, marginTop: 3 }}>{fixasPagas.length} de {contasFixas.length}</p>
            </div>
            <div style={{ background: '#FAF0EE', borderRadius: 16, padding: '14px 16px', border: '1px solid rgba(196,85,59,0.15)' }}>
              <p style={{ ...LABEL as object, color: '#C4553B', marginBottom: 4 }}>Pendente</p>
              <p style={{ ...NUM as object, fontSize: 20, color: '#C4553B' }}>{fmt(totalPendente)}</p>
              <p style={{ ...SUB as object, marginTop: 3 }}>{pendentes.length} conta{pendentes.length !== 1 ? 's' : ''}</p>
            </div>
            <div style={{ background: '#F5F0E8', borderRadius: 16, padding: '14px 16px', border: '1px solid rgba(44,26,15,0.1)' }}>
              <p style={{ ...LABEL as object, color: '#7A5C4F', marginBottom: 4 }}>Total</p>
              <p style={{ ...NUM as object, fontSize: 20, color: '#2C1A0F' }}>{fmt(totalMes)}</p>
              <p style={{ ...SUB as object, marginTop: 3 }}>{Math.round(pctConcluido)}% pago</p>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ background: '#EDE6DC', borderRadius: 6, height: 6, marginBottom: 24, overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pctConcluido}%` }}
              transition={{ type: 'spring', stiffness: 180, damping: 24 }}
              style={{ height: '100%', background: '#3A8580', borderRadius: 6 }}
            />
          </div>
        </>
      )}

      {contasFixas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Dobrao mood="sleeping" size={90} />
          <p style={{ ...DISPLAY as object, fontSize: 20, color: '#2C1A0F', marginTop: 16 }}>Nenhuma conta fixa</p>
          <p style={{ ...SUB as object, fontSize: 14, marginTop: 6 }}>Aluguel, internet, streaming, assinaturas...</p>
        </div>
      ) : (
        <div>
          {pendentes.length > 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 12px' }}>
                <span style={{ ...LABEL as object, color: '#9B7B6A' }}>A Pagar</span>
                <div style={{ flex: 1, height: 1, background: '#EDE6DC' }} />
                <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: '#C4553B' }}>{fmt(pendentes.reduce((s, cf) => s + cf.valor, 0))}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12, marginBottom: 20 }}>
                {pendentes.map((cf, i) => (
                  <motion.div key={cf.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 26, delay: i * 0.05 }}>
                    <ContaFixaRow cf={cf} mes={mes} ano={ano} onEdit={() => openEdit(cf)} onDelete={() => setConfirmDelete(cf.id!)} />
                  </motion.div>
                ))}
              </div>
            </>
          )}
          {fixasPagas.length > 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 12px' }}>
                <span style={{ ...LABEL as object, color: '#9B7B6A' }}>Pagas</span>
                <div style={{ flex: 1, height: 1, background: '#EDE6DC' }} />
                <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: '#3A8580' }}>{fmt(fixasPagas.reduce((s, cf) => s + cf.valor, 0))}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
                {fixasPagas.map((cf, i) => (
                  <motion.div key={cf.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 26, delay: i * 0.05 }}>
                    <ContaFixaRow cf={cf} mes={mes} ano={ano} onEdit={() => openEdit(cf)} onDelete={() => setConfirmDelete(cf.id!)} />
                  </motion.div>
                ))}
              </div>
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
              <p style={{ ...DISPLAY as object, fontSize: 20, color: '#2C1A0F', marginBottom: 8 }}>Excluir conta fixa?</p>
              <p style={{ ...SUB as object, fontSize: 14, marginBottom: 24 }}>Histórico de pagamentos será removido.</p>
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
                <h3 style={{ ...DISPLAY as object, fontSize: 22, color: '#2C1A0F' }}>{editingId ? 'Editar conta fixa' : 'Nova conta fixa'}</h3>
                <button onClick={() => setAdding(false)} style={{ background: '#F5F0E8', border: 'none', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconX size={16} color="#9B7B6A" />
                </button>
              </div>

              <p style={{ ...LABEL as object, color: '#9B7B6A', marginBottom: 6 }}>Nome</p>
              <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Aluguel, Internet, Spotify..."
                style={{ width: '100%', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 14, padding: '13px 16px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, outline: 'none', marginBottom: 14, boxSizing: 'border-box', color: '#2C1A0F' }} />

              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ ...LABEL as object, color: '#9B7B6A', marginBottom: 6 }}>Valor</p>
                  <div style={{ display: 'flex', alignItems: 'center', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 14, padding: '12px 14px', gap: 6 }}>
                    <span style={{ ...NUM as object, fontSize: 18, color: '#C4553B' }}>R$</span>
                    <input value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} placeholder="0,00" type="tel"
                      style={{ border: 'none', background: 'transparent', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 22, fontWeight: 700, color: '#2C1A0F', flex: 1, outline: 'none', width: '100%' }} />
                  </div>
                </div>
                <div style={{ width: 100 }}>
                  <p style={{ ...LABEL as object, color: '#9B7B6A', marginBottom: 6 }}>Dia Vence</p>
                  <input value={form.diaVencimento} onChange={e => setForm(f => ({ ...f, diaVencimento: parseInt(e.target.value) || 1 }))} type="number" min="1" max="31"
                    style={{ width: '100%', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 14, padding: '12px 0', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 22, fontWeight: 700, color: '#2C1A0F', outline: 'none', textAlign: 'center', boxSizing: 'border-box' }} />
                </div>
              </div>

              <p style={{ ...LABEL as object, color: '#9B7B6A', marginBottom: 10 }}>Categoria</p>
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
                  <p style={{ ...LABEL as object, color: '#9B7B6A', marginBottom: 8 }}>Debita de <span style={{ fontWeight: 400, textTransform: 'none' }}>(opcional)</span></p>
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

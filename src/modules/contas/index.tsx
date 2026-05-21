import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useContas, addConta, deleteConta, editConta, useSaldoTotal } from '@/db/hooks/useContas'
import { fmt } from '@/lib/format'
import { Dobrao } from '@/components/mascot/Dobrao'
import { IconPlus, IconX, IconTrash, IconEdit, IconBuildingBank } from '@tabler/icons-react'
import { useUIStore } from '@/store/ui'

const BANCOS = [
  { nome: 'Nubank', cor: '#820AD1', abrev: 'NU' },
  { nome: 'Itaú', cor: '#EC7000', abrev: 'IT' },
  { nome: 'BB', cor: '#F8C300', textCor: '#1A1A1A', abrev: 'BB' },
  { nome: 'Bradesco', cor: '#CC0000', abrev: 'BR' },
  { nome: 'Caixa', cor: '#006CB6', abrev: 'CX' },
  { nome: 'Santander', cor: '#EC0000', abrev: 'SAN' },
  { nome: 'Inter', cor: '#FF8700', abrev: 'IN' },
  { nome: 'C6 Bank', cor: '#1D1D1B', abrev: 'C6' },
  { nome: 'XP', cor: '#2C2C2C', abrev: 'XP' },
  { nome: 'Nomad', cor: '#0047FF', abrev: 'NO' },
  { nome: 'BRB', cor: '#006B3C', abrev: 'BRB' },
  { nome: 'Outro', cor: '#3A8580', abrev: '?' },
  { nome: 'Dinheiro', cor: '#5B8A3C', abrev: 'R$' },
]
const TIPOS = ['corrente','poupança','digital','dinheiro','investimento'] as const

function textColor(hex: string) {
  if (!hex || hex.length < 7) return 'white'
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return (0.299*r + 0.587*g + 0.114*b) > 186 ? '#2C1A0F' : 'white'
}
function textAlpha(hex: string, alpha: string) {
  const tc = textColor(hex)
  return tc === 'white' ? `rgba(255,255,255,${alpha})` : `rgba(44,26,15,${alpha})`
}

export function Page() {
  const contas = useContas()
  const saldoTotal = useSaldoTotal()
  const navigate = useNavigate()
  const { openFab } = useUIStore()
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [banco, setBanco] = useState(BANCOS[0])
  const [form, setForm] = useState({ nome: '', tipo: 'corrente' as typeof TIPOS[number], saldoAtual: '' })

  const openAdd = () => { setEditingId(null); setBanco(BANCOS[0]); setForm({ nome: '', tipo: 'corrente', saldoAtual: '' }); setFormOpen(true) }
  const openEdit = (c: any) => {
    setEditingId(c.id)
    const b = BANCOS.find(b => b.cor === c.cor || b.abrev === c.icone) ?? BANCOS[BANCOS.length - 2]
    setBanco(b)
    setForm({ nome: c.nome, tipo: c.tipo, saldoAtual: String(c.saldoAtual) })
    setFormOpen(true)
  }

  const handleSave = async () => {
    if (!form.nome) return
    const val = parseFloat(form.saldoAtual.replace(',', '.')) || 0
    if (editingId !== null) {
      await editConta(editingId, { nome: form.nome, tipo: form.tipo, saldoAtual: val, cor: banco.cor, icone: banco.abrev })
    } else {
      await addConta({ nome: form.nome, tipo: form.tipo, saldoInicial: val, saldoAtual: val, cor: banco.cor, icone: banco.abrev, ativo: true })
    }
    setFormOpen(false)
  }

  return (
    <div style={{ padding: '24px 28px', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 28, fontWeight: 700, color: '#2C1A0F' }}>Contas</h1>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#9B7B6A', marginTop: 2 }}>Total: {fmt(saldoTotal)}</p>
        </div>
        <motion.button whileTap={{ scale: 0.95 }} onClick={openAdd}
          style={{ background: '#C4553B', color: 'white', border: 'none', borderRadius: 12, padding: '10px 18px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <IconPlus size={16} stroke={2.5} /> Adicionar
        </motion.button>
      </div>

      {contas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Dobrao mood="sleeping" size={90} />
          <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: '#2C1A0F', marginTop: 16 }}>Nenhuma conta</p>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, color: '#9B7B6A', marginTop: 6 }}>Adicione sua conta bancária para começar</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {contas.map(c => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -3 }}
              style={{ background: c.cor, borderRadius: 22, padding: '22px 22px 16px', position: 'relative', overflow: 'hidden' }}>
              {/* Color accent bar */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: c.cor }} />
              {/* Bank badge */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: c.cor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontFamily: 'Georgia,serif', fontSize: 10, fontWeight: 700, color: 'white' }}>{c.icone}</span>
                  </div>
                  <div>
                    <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600, color: textAlpha(c.cor, '0.6'), textTransform: 'uppercase', letterSpacing: '.04em' }}>{c.nome}</p>
                    <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: textAlpha(c.cor, '0.5') }}>{c.tipo}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => openEdit(c)}
                    style={{ background: 'rgba(0,0,0,0.15)', border: 'none', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IconEdit size={13} color={textAlpha(c.cor, '0.7')} />
                  </button>
                  <button onClick={() => setConfirmDelete(c.id!)}
                    style={{ background: 'rgba(0,0,0,0.1)', border: 'none', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IconTrash size={13} color={textAlpha(c.cor, '0.5')} />
                  </button>
                </div>
              </div>
              {/* Balance */}
              <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 34, fontWeight: 700, color: textColor(c.cor), letterSpacing: '-1px', marginBottom: 4 }}>{fmt(c.saldoAtual)}</p>
              <div style={{ height: 3, background: c.cor, borderRadius: 2, marginBottom: 16, width: `${Math.min(100, Math.max(10, (c.saldoAtual / (c.saldoAtual + 1000)) * 100))}%`, opacity: 0.8 }} />
              {/* CTA buttons */}
              <div style={{ display: 'flex', gap: 8 }}>
                <motion.button whileTap={{ scale: 0.96 }} onClick={() => openFab(c.id!)}
                  style={{ flex: 1, background: '#C4553B', border: 'none', borderRadius: 10, padding: '9px 0', color: 'white', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  + Lançar
                </motion.button>
                <motion.button whileTap={{ scale: 0.96 }} onClick={() => navigate(`/transacoes?conta=${c.id}`)}
                  style={{ flex: 1, background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 10, padding: '9px 0', color: textAlpha(c.cor, '0.85'), fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  Histórico
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {confirmDelete !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setConfirmDelete(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(44,26,15,0.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={e => e.stopPropagation()}
              style={{ background: '#FFFDF9', borderRadius: 22, padding: '28px 24px', maxWidth: 320, width: '100%', textAlign: 'center' }}>
              <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: '#2C1A0F', marginBottom: 8 }}>Excluir conta?</p>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, color: '#9B7B6A', marginBottom: 24 }}>Transações associadas serão mantidas.</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: '1.5px solid #E8E0D5', background: 'white', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 600, color: '#7A5C4F', cursor: 'pointer' }}>Cancelar</button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={async () => { await deleteConta(confirmDelete); setConfirmDelete(null) }}
                  style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: 'none', background: '#C4553B', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 700, color: 'white', cursor: 'pointer' }}>Excluir</motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {formOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setFormOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(44,26,15,0.6)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: 520, background: '#FFFDF9', borderRadius: '24px 24px 0 0', padding: '20px 20px 48px', maxHeight: '90dvh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h3 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700, color: '#2C1A0F' }}>{editingId ? 'Editar conta' : 'Nova conta'}</h3>
                <button onClick={() => setFormOpen(false)} style={{ background: '#F5F0E8', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconX size={16} color="#9B7B6A" />
                </button>
              </div>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: '#9B7B6A', marginBottom: 8, letterSpacing: '.05em' }}>BANCO</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {BANCOS.map(b => (
                  <motion.button key={b.nome} whileTap={{ scale: 0.93 }} onClick={() => { setBanco(b); setForm(f => ({ ...f, nome: editingId ? f.nome : b.nome })) }}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 12px', borderRadius: 10, border: banco.nome === b.nome ? `2px solid ${b.cor}` : '1.5px solid #E8E0D5', background: banco.nome === b.nome ? `${b.cor}18` : 'white', cursor: 'pointer', transition: 'all .15s' }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, background: b.cor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontFamily: 'Georgia,serif', fontSize: 8, fontWeight: 700, color: b.textCor ?? 'white' }}>{b.abrev}</span>
                    </div>
                    <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, color: '#2C1A0F' }}>{b.nome}</span>
                  </motion.button>
                ))}
              </div>
              <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome da conta"
                style={{ width: '100%', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '12px 14px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, outline: 'none', marginBottom: 10, boxSizing: 'border-box' }} />
              <div style={{ display: 'flex', alignItems: 'center', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '12px 14px', gap: 6, marginBottom: 12 }}>
                <span style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 18, color: '#C4553B', fontWeight: 700 }}>R$</span>
                <input value={form.saldoAtual} onChange={e => setForm(f => ({ ...f, saldoAtual: e.target.value }))} placeholder="Saldo atual" type="tel"
                  style={{ border: 'none', background: 'transparent', fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700, color: '#2C1A0F', flex: 1, outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
                {TIPOS.map(t => (
                  <button key={t} onClick={() => setForm(f => ({ ...f, tipo: t }))}
                    style={{ padding: '7px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, background: form.tipo === t ? '#C4553B' : '#F5F0E8', color: form.tipo === t ? 'white' : '#7A5C4F', transition: 'all .15s' }}>
                    {t}
                  </button>
                ))}
              </div>
              <motion.button onClick={handleSave} whileTap={{ scale: 0.97 }} disabled={!form.nome}
                style={{ width: '100%', padding: '15px 0', borderRadius: 14, border: 'none', cursor: form.nome ? 'pointer' : 'default', background: form.nome ? '#C4553B' : '#E8E0D5', color: form.nome ? 'white' : '#9B7B6A', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, fontWeight: 700 }}>
                {editingId ? 'Salvar alterações' : 'Adicionar conta'}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

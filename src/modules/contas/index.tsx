import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useContas, addConta, deleteConta, editConta, useSaldoTotal } from '@/db/hooks/useContas'
import { fmt } from '@/lib/format'
import { Dobrao } from '@/components/mascot/Dobrao'
import { IconPlus, IconX, IconTrash, IconEdit, IconWallet } from '@tabler/icons-react'
import { useUIStore } from '@/store/ui'

const BANCOS = [
  { nome: 'Nubank',    cor: '#820AD1', abrev: 'NU'  },
  { nome: 'Itaú',     cor: '#EC7000', abrev: 'IT'  },
  { nome: 'BB',       cor: '#F8C300', abrev: 'BB'  },
  { nome: 'Bradesco', cor: '#CC0000', abrev: 'BR'  },
  { nome: 'Caixa',    cor: '#006CB6', abrev: 'CX'  },
  { nome: 'Santander',cor: '#EC0000', abrev: 'SAN' },
  { nome: 'Inter',    cor: '#FF8700', abrev: 'IN'  },
  { nome: 'C6 Bank',  cor: '#1D1D1B', abrev: 'C6'  },
  { nome: 'XP',       cor: '#2C2C2C', abrev: 'XP'  },
  { nome: 'Nomad',    cor: '#0047FF', abrev: 'NO'  },
  { nome: 'BRB',      cor: '#006B3C', abrev: 'BRB' },
  { nome: 'Outro',    cor: '#3A8580', abrev: '?'   },
  { nome: 'Dinheiro', cor: '#5B8A3C', abrev: 'R$'  },
]
const TIPOS = ['corrente','poupança','digital','dinheiro','investimento'] as const

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
function isLight(hex: string) {
  if (!hex || hex.length < 7) return false
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return (0.299*r + 0.587*g + 0.114*b) > 170
}
function cardGradient(cor: string) {
  return `linear-gradient(140deg, ${lightenHex(cor, 22)} 0%, ${cor} 45%, ${darkenHex(cor, 30)} 100%)`
}

function ContaCard({ c, onEdit, onDelete }: { c: any; onEdit: () => void; onDelete: () => void }) {
  const { openFab } = useUIStore()
  const navigate = useNavigate()
  const light = isLight(c.cor)
  const txt = light ? 'rgba(30,15,0,0.9)' : 'rgba(255,255,255,0.96)'
  const subTxt = light ? 'rgba(30,15,0,0.55)' : 'rgba(255,255,255,0.55)'
  const badgeBg = light ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.18)'
  const badgeBorder = light ? '1px solid rgba(0,0,0,0.12)' : '1px solid rgba(255,255,255,0.28)'
  const btnBg = light ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.16)'
  const primaryBg = light ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.22)'
  const primaryBorder = light ? '1px solid rgba(0,0,0,0.12)' : '1px solid rgba(255,255,255,0.3)'
  const secondaryBg = light ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.2)'
  const secondaryBorder = light ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.08)'
  const secondaryTxt = light ? 'rgba(30,15,0,0.65)' : 'rgba(255,255,255,0.7)'

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5, boxShadow: `0 18px 48px ${c.cor}50, 0 4px 12px rgba(0,0,0,0.12)` }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      style={{
        background: cardGradient(c.cor),
        borderRadius: 24,
        padding: '22px 22px 18px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: `0 8px 32px ${c.cor}38, 0 2px 8px rgba(0,0,0,0.1)`,
      }}>

      {/* Decorative circles */}
      <div style={{ position: 'absolute', top: -50, right: -50, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -35, left: 20, width: 110, height: 110, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: 30, right: 60, width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <div style={{ width: 42, height: 42, borderRadius: 13, background: badgeBg, border: badgeBorder, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 800, color: txt, letterSpacing: '-0.5px' }}>{c.icone}</span>
          </div>
          <div>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 800, color: txt, letterSpacing: '.06em', textTransform: 'uppercase', lineHeight: 1.2 }}>{c.nome}</p>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 500, color: subTxt, letterSpacing: '.03em', marginTop: 1 }}>{c.tipo}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={e => { e.stopPropagation(); onEdit() }}
            style={{ background: btnBg, border: 'none', borderRadius: 9, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <IconEdit size={14} color={light ? 'rgba(30,15,0,0.65)' : 'rgba(255,255,255,0.8)'} stroke={1.8} />
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete() }}
            style={{ background: btnBg, border: 'none', borderRadius: 9, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <IconTrash size={14} color={light ? 'rgba(30,15,0,0.45)' : 'rgba(255,255,255,0.45)'} stroke={1.8} />
          </button>
        </div>
      </div>

      {/* Balance */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 600, color: subTxt, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 4 }}>Saldo atual</p>
        <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 34, fontWeight: 700, color: txt, letterSpacing: '-1.5px', lineHeight: 1 }}>
          {fmt(c.saldoAtual)}
        </p>
      </div>

      {/* CTA */}
      <div style={{ display: 'flex', gap: 8 }}>
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => openFab(c.id!)}
          style={{ flex: 1, background: primaryBg, border: primaryBorder, borderRadius: 13, padding: '11px 0', color: txt, fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          + Lançar
        </motion.button>
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => navigate(`/transacoes?conta=${c.id}`)}
          style={{ flex: 1, background: secondaryBg, border: secondaryBorder, borderRadius: 13, padding: '11px 0', color: secondaryTxt, fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          Histórico
        </motion.button>
      </div>
    </motion.div>
  )
}

function CardPreview({ banco, nome, tipo, saldo }: { banco: typeof BANCOS[0]; nome: string; tipo: string; saldo: string }) {
  const light = isLight(banco.cor)
  const txt = light ? 'rgba(30,15,0,0.9)' : 'rgba(255,255,255,0.96)'
  const subTxt = light ? 'rgba(30,15,0,0.55)' : 'rgba(255,255,255,0.55)'
  const val = parseFloat(saldo.replace(',', '.')) || 0

  return (
    <div style={{
      background: cardGradient(banco.cor),
      borderRadius: 18,
      padding: '16px 18px 14px',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: `0 6px 24px ${banco.cor}40`,
      marginBottom: 22,
    }}>
      <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 800, color: txt, letterSpacing: '.06em', textTransform: 'uppercase' }}>{nome || banco.nome}</p>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, color: subTxt, letterSpacing: '.04em', textTransform: 'uppercase', marginTop: 2 }}>{tipo}</p>
        </div>
        <div style={{ background: isLight(banco.cor) ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.18)', border: isLight(banco.cor) ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.28)', borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 800, color: txt }}>{banco.abrev}</span>
        </div>
      </div>
      <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 24, fontWeight: 700, color: txt, letterSpacing: '-1px', lineHeight: 1 }}>{fmt(val)}</p>
    </div>
  )
}

export function Page() {
  const contas = useContas()
  const saldoTotal = useSaldoTotal()
  const navigate = useNavigate()
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [banco, setBanco] = useState(BANCOS[0])
  const [form, setForm] = useState({ nome: '', tipo: 'corrente' as typeof TIPOS[number], saldoAtual: '' })

  const openAdd = () => { setEditingId(null); setBanco(BANCOS[0]); setForm({ nome: '', tipo: 'corrente', saldoAtual: '' }); setFormOpen(true) }
  const openEdit = (c: any) => {
    setEditingId(c.id)
    const b = BANCOS.find(b => b.cor === c.cor) ?? BANCOS.find(b => b.abrev === c.icone) ?? BANCOS[BANCOS.length - 2]
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 18 }}>
          {contas.map(c => (
            <ContaCard key={c.id} c={c} onEdit={() => openEdit(c)} onDelete={() => setConfirmDelete(c.id!)} />
          ))}
        </div>
      )}

      <AnimatePresence>
        {confirmDelete !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setConfirmDelete(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(44,26,15,0.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <motion.div initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.88, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              onClick={e => e.stopPropagation()}
              style={{ background: '#FFFDF9', borderRadius: 22, padding: '28px 24px', maxWidth: 320, width: '100%', textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: '#FEE2DC', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <IconTrash size={24} color="#C4553B" stroke={1.8} />
              </div>
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
              style={{ width: '100%', maxWidth: 520, background: '#FFFDF9', borderRadius: '28px 28px 0 0', padding: '8px 20px 48px', maxHeight: '92dvh', overflowY: 'auto' }}>

              {/* Handle */}
              <div style={{ width: 40, height: 4, borderRadius: 2, background: '#E8E0D5', margin: '12px auto 20px' }} />

              {/* Title row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700, color: '#2C1A0F', lineHeight: 1.1 }}>{editingId ? 'Editar conta' : 'Nova conta'}</h3>
                  <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#9B7B6A', marginTop: 3 }}>Selecione o banco e preencha os dados</p>
                </div>
                <button onClick={() => setFormOpen(false)} style={{ background: '#F5F0E8', border: 'none', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <IconX size={16} color="#9B7B6A" />
                </button>
              </div>

              {/* Live card preview */}
              <CardPreview banco={banco} nome={form.nome} tipo={form.tipo} saldo={form.saldoAtual} />

              {/* Bank picker */}
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: '#9B7B6A', marginBottom: 10, letterSpacing: '.07em' }}>BANCO</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8, marginBottom: 20 }}>
                {BANCOS.map(b => {
                  const sel = banco.nome === b.nome
                  return (
                    <motion.button key={b.nome} whileTap={{ scale: 0.93 }} onClick={() => { setBanco(b); setForm(f => ({ ...f, nome: editingId ? f.nome : b.nome })) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '9px 11px',
                        borderRadius: 12,
                        border: sel ? `2px solid ${b.cor}` : '1.5px solid #E8E0D5',
                        background: sel ? `${b.cor}14` : 'white',
                        cursor: 'pointer', transition: 'all .15s',
                        boxShadow: sel ? `0 2px 10px ${b.cor}28` : 'none',
                      }}>
                      <div style={{ width: 26, height: 26, borderRadius: 8, background: b.cor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 800, color: isLight(b.cor) ? 'rgba(30,15,0,0.8)' : 'white', letterSpacing: '-0.3px' }}>{b.abrev}</span>
                      </div>
                      <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: sel ? 700 : 500, color: sel ? b.cor : '#5A4035', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.nome}</span>
                    </motion.button>
                  )
                })}
              </div>

              {/* Name input */}
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: '#9B7B6A', marginBottom: 7, letterSpacing: '.07em' }}>NOME DA CONTA</p>
              <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder={banco.nome}
                style={{ width: '100%', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 13, padding: '13px 15px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, fontWeight: 600, color: '#2C1A0F', outline: 'none', marginBottom: 14, boxSizing: 'border-box' }} />

              {/* Balance input */}
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: '#9B7B6A', marginBottom: 7, letterSpacing: '.07em' }}>SALDO ATUAL</p>
              <div style={{ display: 'flex', alignItems: 'center', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 13, padding: '12px 15px', gap: 8, marginBottom: 16 }}>
                <span style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 18, color: '#C4553B', fontWeight: 700 }}>R$</span>
                <input value={form.saldoAtual} onChange={e => setForm(f => ({ ...f, saldoAtual: e.target.value }))} placeholder="0,00" type="tel"
                  style={{ border: 'none', background: 'transparent', fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700, color: '#2C1A0F', flex: 1, outline: 'none' }} />
              </div>

              {/* Account type */}
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: '#9B7B6A', marginBottom: 9, letterSpacing: '.07em' }}>TIPO</p>
              <div style={{ display: 'flex', gap: 7, marginBottom: 24, flexWrap: 'wrap' }}>
                {TIPOS.map(t => (
                  <button key={t} onClick={() => setForm(f => ({ ...f, tipo: t }))}
                    style={{ padding: '8px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700, background: form.tipo === t ? banco.cor : '#F5F0E8', color: form.tipo === t ? (isLight(banco.cor) ? 'rgba(30,15,0,0.9)' : 'white') : '#7A5C4F', transition: 'all .15s', boxShadow: form.tipo === t ? `0 2px 8px ${banco.cor}40` : 'none' }}>
                    {t}
                  </button>
                ))}
              </div>

              <motion.button onClick={handleSave} whileTap={{ scale: 0.97 }} disabled={!form.nome}
                style={{ width: '100%', padding: '15px 0', borderRadius: 15, border: 'none', cursor: form.nome ? 'pointer' : 'default', background: form.nome ? '#C4553B' : '#E8E0D5', color: form.nome ? 'white' : '#9B7B6A', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, fontWeight: 700, boxShadow: form.nome ? '0 4px 16px rgba(196,85,59,0.35)' : 'none', transition: 'all .2s' }}>
                {editingId ? 'Salvar alterações' : 'Adicionar conta'}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

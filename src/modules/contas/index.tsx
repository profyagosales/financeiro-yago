import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useContas, addConta, useSaldoTotal } from '@/db/hooks/useContas'
import { fmt } from '@/lib/format'
import { Dobrao } from '@/components/mascot/Dobrao'
import { IconPlus, IconX, IconCoin } from '@tabler/icons-react'

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
  { nome: 'Outro', cor: '#3A8580', abrev: '?' },
  { nome: 'Dinheiro', cor: '#5B8A3C', abrev: 'R$' },
]
const TIPOS = ['corrente','poupança','digital','dinheiro','investimento'] as const

export function Page() {
  const contas = useContas()
  const saldoTotal = useSaldoTotal()
  const [adding, setAdding] = useState(false)
  const [banco, setBanco] = useState(BANCOS[0])
  const [form, setForm] = useState({ nome: '', tipo: 'corrente' as typeof TIPOS[number], saldoInicial: '' })

  const handleAdd = async () => {
    if (!form.nome) return
    await addConta({
      nome: form.nome, tipo: form.tipo,
      saldoInicial: parseFloat(form.saldoInicial.replace(',', '.')) || 0,
      saldoAtual: parseFloat(form.saldoInicial.replace(',', '.')) || 0,
      cor: banco.cor, icone: banco.abrev, ativo: true,
    })
    setAdding(false)
    setForm({ nome: '', tipo: 'corrente', saldoInicial: '' })
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '24px 20px', maxWidth: 680, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 28, fontWeight: 700, color: '#2C1A0F' }}>Contas</h1>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#9B7B6A', marginTop: 2 }}>Total: {fmt(saldoTotal)}</p>
        </div>
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => setAdding(true)}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {contas.map(c => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2 }}
              style={{ background: c.cor, borderRadius: 22, padding: '20px 22px', cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                    <span style={{ fontFamily: 'Georgia,serif', fontSize: 12, fontWeight: 700, color: 'white' }}>{c.icone}</span>
                  </div>
                  <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>{c.nome}</p>
                  <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 28, fontWeight: 700, color: 'white', letterSpacing: '-0.5px' }}>{fmt(c.saldoAtual)}</p>
                </div>
                <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, background: 'rgba(255,255,255,0.2)', color: 'white', padding: '4px 10px', borderRadius: 20 }}>{c.tipo}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {adding && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setAdding(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(44,26,15,0.6)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: 520, background: '#FFFDF9', borderRadius: '24px 24px 0 0', padding: '20px 20px 48px', maxHeight: '90dvh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h3 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700, color: '#2C1A0F' }}>Nova conta</h3>
                <button onClick={() => setAdding(false)} style={{ background: '#F5F0E8', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconX size={16} color="#9B7B6A" />
                </button>
              </div>

              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600, color: '#9B7B6A', marginBottom: 8, letterSpacing: '.05em' }}>BANCO</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {BANCOS.map(b => (
                  <motion.button key={b.nome} whileTap={{ scale: 0.93 }} onClick={() => { setBanco(b); setForm(f => ({ ...f, nome: b.nome })) }}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 12px', borderRadius: 10, border: banco.nome === b.nome ? `2px solid ${b.cor}` : '1.5px solid #E8E0D5', background: banco.nome === b.nome ? `${b.cor}18` : 'white', cursor: 'pointer', transition: 'all .15s' }}>
                    <div style={{ width: 24, height: 24, borderRadius: 7, background: b.cor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontFamily: 'Georgia,serif', fontSize: 9, fontWeight: 700, color: b.textCor ?? 'white' }}>{b.abrev}</span>
                    </div>
                    <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, color: '#2C1A0F' }}>{b.nome}</span>
                  </motion.button>
                ))}
              </div>

              <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome da conta"
                style={{ width: '100%', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '12px 14px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, color: '#2C1A0F', outline: 'none', marginBottom: 10, boxSizing: 'border-box' }} />

              <div style={{ display: 'flex', alignItems: 'center', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '12px 14px', gap: 6, marginBottom: 12 }}>
                <span style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 18, color: '#C4553B', fontWeight: 700 }}>R$</span>
                <input value={form.saldoInicial} onChange={e => setForm(f => ({ ...f, saldoInicial: e.target.value }))} placeholder="Saldo atual" type="tel"
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

              <motion.button onClick={handleAdd} whileTap={{ scale: 0.97 }} disabled={!form.nome}
                style={{ width: '100%', padding: '15px 0', borderRadius: 14, border: 'none', cursor: form.nome ? 'pointer' : 'default', background: form.nome ? '#C4553B' : '#E8E0D5', color: form.nome ? 'white' : '#9B7B6A', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, fontWeight: 700, transition: 'all .2s' }}>
                Adicionar conta
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

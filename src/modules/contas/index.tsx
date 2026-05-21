import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useContas, addConta, useSaldoTotal } from '@/db/hooks/useContas'
import { fmt } from '@/lib/format'
import { Dobrao } from '@/components/mascot/Dobrao'

const BANCOS = [
  { nome: 'Nubank', cor: '#820AD1', icone: '💜' },
  { nome: 'Itaú', cor: '#EC7000', icone: '🟠' },
  { nome: 'Banco do Brasil', cor: '#FFDE00', icone: '🟡' },
  { nome: 'Bradesco', cor: '#CC0000', icone: '🔴' },
  { nome: 'Caixa', cor: '#006CB6', icone: '🔵' },
  { nome: 'Santander', cor: '#EC0000', icone: '🔴' },
  { nome: 'Inter', cor: '#FF8700', icone: '🟠' },
  { nome: 'C6 Bank', cor: '#1D1D1B', icone: '⚫' },
  { nome: 'XP', cor: '#000000', icone: '⚫' },
  { nome: 'Outro', cor: '#3A8580', icone: '🏦' },
  { nome: 'Dinheiro', cor: '#5B8A3C', icone: '💵' },
]

const TIPOS = ['corrente','poupanca','digital','dinheiro','investimento'] as const

export function Page() {
  const contas = useContas()
  const saldoTotal = useSaldoTotal()
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ nome: '', tipo: 'corrente' as typeof TIPOS[number], saldoInicial: '', cor: '#3A8580', icone: '🏦' })

  const handleAdd = async () => {
    if (!form.nome) return
    await addConta({
      nome: form.nome, tipo: form.tipo,
      saldoInicial: parseFloat(form.saldoInicial.replace(',','.')) || 0,
      saldoAtual: parseFloat(form.saldoInicial.replace(',','.')) || 0,
      cor: form.cor, icone: form.icone, ativo: true,
    })
    setAdding(false)
    setForm({ nome: '', tipo: 'corrente', saldoInicial: '', cor: '#3A8580', icone: '🏦' })
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '20px 16px', maxWidth: 680, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 26, fontWeight: 700, color: '#2C1A0F' }}>Contas</h1>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#9B7B6A', marginTop: 2 }}>Total: {fmt(saldoTotal)}</p>
        </div>
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => setAdding(true)}
          style={{ background: '#C4553B', color: 'white', border: 'none', borderRadius: 12, padding: '10px 18px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          + Adicionar
        </motion.button>
      </div>

      {contas.length === 0 && !adding ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <Dobrao mood="sleeping" size={100} />
          <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 18, fontWeight: 700, color: '#2C1A0F', marginTop: 12 }}>Nenhuma conta</p>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, color: '#9B7B6A', marginTop: 6 }}>Adicione sua conta bancária para começar</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {contas.map(c => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2 }}
              style={{ background: c.cor, borderRadius: 20, padding: '18px 20px', cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, color: 'white', opacity: 0.7 }}>{c.icone} {c.nome}</p>
                  <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 28, fontWeight: 700, color: 'white', marginTop: 4, letterSpacing: '-0.5px' }}>{fmt(c.saldoAtual)}</p>
                </div>
                <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, background: 'rgba(255,255,255,0.2)', color: 'white', padding: '3px 10px', borderRadius: 20 }}>{c.tipo}</span>
              </div>
              {c.chequeEspecialLimite && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 4, height: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, Math.abs(Math.min(c.saldoAtual, 0)) / c.chequeEspecialLimite * 100)}%`, height: '100%', background: 'white', borderRadius: 4 }} />
                  </div>
                  <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: 'white', opacity: 0.6, marginTop: 3 }}>Cheque especial: {fmt(c.chequeEspecialLimite)}</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Add form */}
      <AnimatePresence>
        {adding && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setAdding(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(44,26,15,0.55)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: 520, background: '#FFFDF9', borderRadius: '24px 24px 0 0', padding: '20px 20px 48px' }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: '#E8E0D5', margin: '0 auto 20px' }} />
              <h3 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: '#2C1A0F', marginBottom: 16 }}>Nova conta</h3>

              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600, color: '#9B7B6A', marginBottom: 8 }}>BANCO / TIPO</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                {BANCOS.map(b => (
                  <button key={b.nome} onClick={() => setForm(f => ({ ...f, nome: b.nome, cor: b.cor, icone: b.icone }))}
                    style={{ padding: '5px 10px', borderRadius: 20, border: 'none', cursor: 'pointer',
                      background: form.nome === b.nome ? b.cor : '#F5F0E8',
                      color: form.nome === b.nome ? 'white' : '#7A5C4F',
                      fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, transition: 'all .15s' }}>
                    {b.icone} {b.nome}
                  </button>
                ))}
              </div>

              <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome da conta"
                style={{ width: '100%', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '10px 14px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, color: '#2C1A0F', outline: 'none', marginBottom: 10 }} />

              <div style={{ display: 'flex', alignItems: 'center', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '10px 14px', gap: 6, marginBottom: 10 }}>
                <span style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 18, color: '#C4553B', fontWeight: 700 }}>R$</span>
                <input value={form.saldoInicial} onChange={e => setForm(f => ({ ...f, saldoInicial: e.target.value }))} placeholder="Saldo atual" type="tel"
                  style={{ border: 'none', background: 'transparent', fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700, color: '#2C1A0F', flex: 1, outline: 'none' }} />
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {TIPOS.map(t => (
                  <button key={t} onClick={() => setForm(f => ({ ...f, tipo: t }))}
                    style={{ flex: 1, padding: '8px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: "'Plus Jakarta Sans',sans-serif",
                      background: form.tipo === t ? '#C4553B' : '#F5F0E8',
                      color: form.tipo === t ? 'white' : '#7A5C4F', transition: 'all .15s' }}>
                    {t}
                  </button>
                ))}
              </div>

              <motion.button onClick={handleAdd} whileTap={{ scale: 0.97 }} disabled={!form.nome}
                style={{ width: '100%', padding: '15px 0', borderRadius: 14, border: 'none', cursor: 'pointer',
                  background: form.nome ? '#C4553B' : '#E8E0D5', color: form.nome ? 'white' : '#9B7B6A',
                  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, fontWeight: 700, transition: 'all .2s' }}>
                Adicionar conta
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

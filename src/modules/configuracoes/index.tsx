import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/auth'
import { db, seedCategories } from '@/db/schema'
import { useCategorias } from '@/db/hooks/useCategorias'
import { Dobrao } from '@/components/mascot/Dobrao'

function PinSection() {
  const { setPin } = useAuthStore()
  const [pinAtual, setPinAtual] = useState('')
  const [pinNovo, setPinNovo] = useState('')
  const [pinConf, setPinConf] = useState('')
  const [msg, setMsg] = useState('')

  const handleChange = async () => {
    if (pinNovo !== pinConf) { setMsg('Os PINs novos não coincidem.'); return }
    if (pinNovo.length < 4) { setMsg('PIN deve ter pelo menos 4 dígitos.'); return }
    const ok = await setPin(pinAtual, pinNovo)
    if (ok) { setMsg('PIN alterado com sucesso!'); setPinAtual(''); setPinNovo(''); setPinConf('') }
    else setMsg('PIN atual incorreto.')
    setTimeout(() => setMsg(''), 3000)
  }

  return (
    <div style={{ background: '#FFFDF9', border: '0.5px solid #E8E0D5', borderRadius: 18, padding: '16px 18px', marginBottom: 16 }}>
      <h2 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 17, fontWeight: 700, color: '#2C1A0F', marginBottom: 14 }}>🔒 Alterar PIN</h2>
      {[{ v: pinAtual, s: setPinAtual, p: 'PIN atual' }, { v: pinNovo, s: setPinNovo, p: 'PIN novo' }, { v: pinConf, s: setPinConf, p: 'Confirmar PIN novo' }].map((f, i) => (
        <input key={i} value={f.v} onChange={e => f.s(e.target.value)} placeholder={f.p} type="password" inputMode="numeric"
          style={{ width: '100%', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '10px 14px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, color: '#2C1A0F', outline: 'none', marginBottom: 8, display: 'block' }} />
      ))}
      {msg && <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: msg.includes('sucesso') ? '#3A8580' : '#C4553B', marginBottom: 8, fontWeight: 600 }}>{msg}</p>}
      <motion.button onClick={handleChange} whileTap={{ scale: 0.97 }}
        style={{ width: '100%', padding: '12px 0', borderRadius: 12, border: 'none', cursor: 'pointer', background: '#C4553B', color: 'white', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 700 }}>
        Alterar PIN
      </motion.button>
    </div>
  )
}

function DataSection() {
  const [msg, setMsg] = useState('')
  const { lock } = useAuthStore()

  const handleExport = async () => {
    const [contas, cats, txs, cartoes, fixas] = await Promise.all([
      db.contas.toArray(), db.categorias.toArray(), db.transacoes.toArray(),
      db.cartoes.toArray(), db.contasFixas.toArray(),
    ])
    const data = { exportedAt: new Date().toISOString(), contas, categorias: cats, transacoes: txs, cartoes, contasFixas: fixas }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `financeiro-yago-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click(); URL.revokeObjectURL(url)
    setMsg('Backup exportado!'); setTimeout(() => setMsg(''), 3000)
  }

  const handleExportCSV = async () => {
    const txs = await db.transacoes.toArray()
    const cats = await db.categorias.toArray()
    const catMap = new Map(cats.map(c => [c.id, c.nome]))
    const header = 'Data,Descrição,Tipo,Categoria,Valor\n'
    const rows = txs.map(t => `${t.data},"${t.descricao}",${t.tipo},"${catMap.get(t.categoriaId) ?? ''}",${t.valor}`).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `transacoes-${new Date().toISOString().split('T')[0]}.csv`
    a.click(); URL.revokeObjectURL(url)
    setMsg('CSV exportado!'); setTimeout(() => setMsg(''), 3000)
  }

  return (
    <div style={{ background: '#FFFDF9', border: '0.5px solid #E8E0D5', borderRadius: 18, padding: '16px 18px', marginBottom: 16 }}>
      <h2 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 17, fontWeight: 700, color: '#2C1A0F', marginBottom: 14 }}>💾 Dados</h2>
      {msg && <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#3A8580', marginBottom: 8, fontWeight: 600 }}>{msg}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <motion.button onClick={handleExport} whileTap={{ scale: 0.97 }}
          style={{ padding: '12px 0', borderRadius: 12, border: '1.5px solid #C4553B', cursor: 'pointer', background: 'transparent', color: '#C4553B', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 600 }}>
          📦 Exportar backup JSON
        </motion.button>
        <motion.button onClick={handleExportCSV} whileTap={{ scale: 0.97 }}
          style={{ padding: '12px 0', borderRadius: 12, border: '1.5px solid #3A8580', cursor: 'pointer', background: 'transparent', color: '#3A8580', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 600 }}>
          📊 Exportar transações CSV
        </motion.button>
        <motion.button onClick={() => { lock() }} whileTap={{ scale: 0.97 }}
          style={{ padding: '12px 0', borderRadius: 12, border: '1.5px solid #E8E0D5', cursor: 'pointer', background: '#FAF6F0', color: '#7A5C4F', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 600 }}>
          🔒 Bloquear app
        </motion.button>
      </div>
    </div>
  )
}

export function Page() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '20px 16px', maxWidth: 680, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <Dobrao mood="waving" size={72} />
        <div>
          <h1 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 24, fontWeight: 700, color: '#2C1A0F' }}>Configurações</h1>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#9B7B6A', marginTop: 2 }}>Financeiro do Yago · v1.0</p>
        </div>
      </div>
      <PinSection />
      <DataSection />
      <div style={{ background: '#FFFDF9', border: '0.5px solid #E8E0D5', borderRadius: 18, padding: '16px 18px' }}>
        <h2 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 17, fontWeight: 700, color: '#2C1A0F', marginBottom: 6 }}>ℹ️ Sobre</h2>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#9B7B6A', lineHeight: 1.6 }}>
          Dados armazenados localmente no seu dispositivo via IndexedDB.<br />
          Stack: React + TypeScript + Vite + Dexie.js + Supabase + Vercel.<br />
          Repositório: github.com/Interlinha/financeiro-yago
        </p>
      </div>
    </motion.div>
  )
}

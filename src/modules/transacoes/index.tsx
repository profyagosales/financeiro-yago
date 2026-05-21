import { useState } from 'react'
import { motion } from 'framer-motion'
import { useTransacoes, deleteTransacao } from '@/db/hooks/useTransacoes'
import { useCategorias } from '@/db/hooks/useCategorias'
import { fmt, fmtDate } from '@/lib/format'
import { db } from '@/db/schema'
import { Dobrao } from '@/components/mascot/Dobrao'

export function Page() {
  const transacoes = useTransacoes(100)
  const [busca, setBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'receita' | 'despesa'>('todos')

  const filtradas = transacoes.filter(tx => {
    const okTipo = filtroTipo === 'todos' || tx.tipo === filtroTipo
    const okBusca = !busca || tx.descricao.toLowerCase().includes(busca.toLowerCase())
    return okTipo && okBusca
  })

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '20px 16px', maxWidth: 680, margin: '0 auto' }}>
      <h1 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 26, fontWeight: 700, color: '#2C1A0F', marginBottom: 16 }}>Transações</h1>

      {/* Search */}
      <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="🔍  Buscar transação..."
        style={{ width: '100%', background: '#FFFDF9', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '10px 14px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, color: '#2C1A0F', outline: 'none', marginBottom: 10 }} />

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['todos','receita','despesa'] as const).map(f => (
          <button key={f} onClick={() => setFiltroTipo(f)}
            style={{ padding: '7px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
              background: filtroTipo === f ? '#C4553B' : '#F5F0E8',
              color: filtroTipo === f ? 'white' : '#7A5C4F',
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, transition: 'all .15s' }}>
            {f === 'todos' ? 'Todos' : f === 'receita' ? '+ Receitas' : '− Despesas'}
          </button>
        ))}
      </div>

      {filtradas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <Dobrao mood="sleeping" size={100} />
          <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 18, fontWeight: 700, color: '#2C1A0F', marginTop: 12 }}>
            {busca ? 'Nenhum resultado' : 'Sem transações ainda'}
          </p>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, color: '#9B7B6A', marginTop: 6 }}>
            {busca ? 'Tente outro termo' : 'Toque no + para lançar'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtradas.map((tx, i) => (
            <TxRow key={tx.id} tx={tx} i={i} onDelete={() => tx.id && deleteTransacao(tx.id)} />
          ))}
        </div>
      )}
    </motion.div>
  )
}

function TxRow({ tx, i, onDelete }: { tx: any; i: number; onDelete: () => void }) {
  const [catColor, setCatColor] = useState('#9B8A7A')
  const [catIcon, setCatIcon] = useState('💸')
  const [catNome, setCatNome] = useState('')
  const [showDelete, setShowDelete] = useState(false)

  useState(() => {
    db.categorias.get(tx.categoriaId).then(c => {
      if (c) { setCatColor(c.cor); setCatIcon(c.icone); setCatNome(c.nome) }
    })
  })

  return (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
      transition={{ delay: i * 0.04 }}
      style={{ background: '#FFFDF9', border: '0.5px solid #E8E0D5', borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
      onClick={() => setShowDelete(s => !s)}>
      <div style={{ width: 42, height: 42, borderRadius: 13, background: catColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
        {catIcon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 600, color: '#2C1A0F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.descricao}</p>
        <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
          <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 600, color: 'white', background: catColor, padding: '1px 6px', borderRadius: 20 }}>{catNome}</span>
          <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: '#C4B4A8' }}>{fmtDate(tx.data)}</span>
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 15, fontWeight: 700, color: tx.tipo === 'receita' ? '#3A8580' : '#C4553B' }}>
          {tx.tipo === 'receita' ? '+' : '−'}{fmt(tx.valor)}
        </p>
        {showDelete && (
          <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
            onClick={e => { e.stopPropagation(); onDelete() }}
            style={{ marginTop: 4, background: '#FAF0EE', color: '#C4553B', border: 'none', borderRadius: 8, padding: '3px 8px', fontSize: 11, fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 600, cursor: 'pointer' }}>
            Excluir
          </motion.button>
        )}
      </div>
    </motion.div>
  )
}

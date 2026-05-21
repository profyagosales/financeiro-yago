import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTransacoes, deleteTransacao } from '@/db/hooks/useTransacoes'
import { useAnexos, addAnexo, deleteAnexo } from '@/db/hooks/useAnexos'
import { fmt, fmtDate } from '@/lib/format'
import { db } from '@/db/schema'
import { Dobrao } from '@/components/mascot/Dobrao'
import { useRef } from 'react'

function AnexoSheet({ txId, onClose }: { txId: number; onClose: () => void }) {
  const anexos = useAnexos(txId)
  const fileRef = useRef<HTMLInputElement>(null)
  const [adding, setAdding] = useState(false)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setAdding(true)
    await addAnexo(txId, f)
    setAdding(false)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(44,26,15,0.55)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 520, background: '#FFFDF9', borderRadius: '24px 24px 0 0', padding: '20px 20px 48px', maxHeight: '80dvh', overflowY: 'auto' }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: '#E8E0D5', margin: '0 auto 16px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: '#2C1A0F' }}>Anexos</h3>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => fileRef.current?.click()}
            style={{ background: '#C4553B', color: 'white', border: 'none', borderRadius: 10, padding: '8px 14px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            {adding ? 'Salvando...' : '+ Adicionar'}
          </motion.button>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={handleFile} />
        </div>
        {anexos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, color: '#9B7B6A' }}>Nenhum anexo · toque em + para adicionar</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {anexos.map(a => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#FAF6F0', borderRadius: 12, padding: '10px 12px' }}>
                {a.tipo.startsWith('image/') ? (
                  <img src={a.dados} alt={a.nomeArquivo} onClick={() => window.open(a.dados, '_blank')}
                    style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 10, cursor: 'pointer', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 52, height: 52, background: '#3D7EB5', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0, cursor: 'pointer' }}
                    onClick={() => { const link = document.createElement('a'); link.href = a.dados; link.download = a.nomeArquivo; link.click() }}>
                    📄
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, color: '#2C1A0F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.nomeArquivo}</p>
                  <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#9B7B6A' }}>{(a.tamanho / 1024).toFixed(0)} KB · {new Date(a.criadoEm).toLocaleDateString('pt-BR')}</p>
                </div>
                <button onClick={() => a.id && deleteAnexo(a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C4B4A8', fontSize: 18 }}>×</button>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

function TxRow({ tx, i }: { tx: any; i: number }) {
  const [catColor, setCatColor] = useState('#9B8A7A')
  const [catIcon, setCatIcon] = useState('💸')
  const [catNome, setCatNome] = useState('')
  const [showActions, setShowActions] = useState(false)
  const [showAnexos, setShowAnexos] = useState(false)
  const anexos = useAnexos(tx.id!)

  useState(() => { db.categorias.get(tx.categoriaId).then(c => { if (c) { setCatColor(c.cor); setCatIcon(c.icone); setCatNome(c.nome) } }) })

  return (
    <>
      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
        transition={{ delay: i * 0.04 }} whileHover={{ x: 2 }}
        onClick={() => setShowActions(s => !s)}
        style={{ background: '#FFFDF9', border: '0.5px solid #E8E0D5', borderRadius: 14, padding: '12px 14px', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 13, background: catColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
            {catIcon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 600, color: '#2C1A0F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.descricao}</p>
            <div style={{ display: 'flex', gap: 6, marginTop: 2, alignItems: 'center' }}>
              <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 600, color: 'white', background: catColor, padding: '1px 6px', borderRadius: 20 }}>{catNome}</span>
              <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: '#C4B4A8' }}>{fmtDate(tx.data)}</span>
              {anexos.length > 0 && <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: '#3A8580', fontWeight: 600 }}>📎 {anexos.length}</span>}
            </div>
          </div>
          <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 15, fontWeight: 700, color: tx.tipo === 'receita' ? '#3A8580' : '#C4553B', flexShrink: 0 }}>
            {tx.tipo === 'receita' ? '+' : '−'}{fmt(tx.valor)}
          </p>
        </div>
        <AnimatePresence>
          {showActions && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              style={{ overflow: 'hidden' }}>
              <div style={{ display: 'flex', gap: 8, paddingTop: 10, borderTop: '0.5px solid #F0EAE2', marginTop: 10 }}>
                <button onClick={e => { e.stopPropagation(); setShowAnexos(true) }}
                  style={{ flex: 1, background: '#EBF5F0', color: '#3A8580', border: 'none', borderRadius: 10, padding: '8px 0', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  📎 Anexos {anexos.length > 0 ? `(${anexos.length})` : ''}
                </button>
                <button onClick={e => { e.stopPropagation(); tx.id && deleteTransacao(tx.id) }}
                  style={{ flex: 1, background: '#FAF0EE', color: '#C4553B', border: 'none', borderRadius: 10, padding: '8px 0', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  🗑 Excluir
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      <AnimatePresence>
        {showAnexos && <AnexoSheet txId={tx.id!} onClose={() => setShowAnexos(false)} />}
      </AnimatePresence>
    </>
  )
}

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
      <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="🔍  Buscar transação..."
        style={{ width: '100%', background: '#FFFDF9', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '10px 14px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, color: '#2C1A0F', outline: 'none', marginBottom: 10 }} />
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['todos', 'receita', 'despesa'] as const).map(f => (
          <button key={f} onClick={() => setFiltroTipo(f)}
            style={{ padding: '7px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', background: filtroTipo === f ? '#C4553B' : '#F5F0E8', color: filtroTipo === f ? 'white' : '#7A5C4F', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, transition: 'all .15s' }}>
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
          {filtradas.map((tx, i) => <TxRow key={tx.id} tx={tx} i={i} />)}
        </div>
      )}
    </motion.div>
  )
}

import { useState, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTransacoes, deleteTransacao, editTransacao } from '@/db/hooks/useTransacoes'
import { useAnexos, addAnexo, deleteAnexo } from '@/db/hooks/useAnexos'
import { useCategorias } from '@/db/hooks/useCategorias'
import { useContas } from '@/db/hooks/useContas'
import { fmt, fmtDate } from '@/lib/format'
import { db } from '@/db/schema'
import { Dobrao } from '@/components/mascot/Dobrao'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { IconEdit, IconTrash, IconPaperclip, IconX, IconFilterOff } from '@tabler/icons-react'

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return `${r},${g},${b}`
}

function EditTxModal({ tx, onClose }: { tx: any; onClose: () => void }) {
  const [valor, setValor] = useState(String(tx.valor))
  const [desc, setDesc] = useState(tx.descricao)
  const [catId, setCatId] = useState(tx.categoriaId)
  const [contaId, setContaId] = useState(tx.contaId)
  const [data, setData] = useState(tx.data)
  const categorias = useCategorias(tx.tipo)
  const contas = useContas()
  const selectedCat = categorias.find(c => c.id === catId)

  const handleSave = async () => {
    await editTransacao(tx.id, { valor: parseFloat(valor.replace(',', '.')) || tx.valor, descricao: desc, categoriaId: catId, contaId, data })
    onClose()
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(44,26,15,0.6)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 520, background: '#FFFDF9', borderRadius: '24px 24px 0 0', padding: '20px 20px 48px', maxHeight: '90dvh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: '#2C1A0F' }}>Editar lançamento</h3>
          <button onClick={onClose} style={{ background: '#F5F0E8', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconX size={16} color="#9B7B6A" />
          </button>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, background: tx.tipo === 'receita' ? '#EBF5F0' : '#FAF0EE', marginBottom: 14 }}>
          <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700, color: tx.tipo === 'receita' ? '#3A8580' : '#C4553B' }}>
            {tx.tipo === 'receita' ? '+ Receita' : '− Despesa'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '12px 14px', gap: 6, marginBottom: 10 }}>
          <span style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 18, color: tx.tipo === 'receita' ? '#3A8580' : '#C4553B', fontWeight: 700 }}>R$</span>
          <input value={valor} onChange={e => setValor(e.target.value)} type="tel"
            style={{ border: 'none', background: 'transparent', fontFamily: "'Fraunces',Georgia,serif", fontSize: 26, fontWeight: 700, color: '#2C1A0F', flex: 1, outline: 'none' }} />
        </div>
        <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descrição"
          style={{ width: '100%', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '11px 14px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, color: '#2C1A0F', outline: 'none', marginBottom: 10, boxSizing: 'border-box' }} />
        <input value={data} onChange={e => setData(e.target.value)} type="date"
          style={{ width: '100%', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '11px 14px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, color: '#2C1A0F', outline: 'none', marginBottom: 12, boxSizing: 'border-box' }} />
        {contas.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: '#9B7B6A', marginBottom: 6 }}>CONTA</p>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {contas.map(c => (
                <button key={c.id} onClick={() => setContaId(c.id!)}
                  style={{ padding: '6px 12px', borderRadius: 20, border: contaId === c.id ? `2px solid ${c.cor}` : '1.5px solid #E8E0D5', cursor: 'pointer', background: contaId === c.id ? `${c.cor}18` : 'white', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, color: contaId === c.id ? c.cor : '#7A5C4F', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.cor }} />{c.nome}
                </button>
              ))}
            </div>
          </div>
        )}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: '#9B7B6A', marginBottom: 8 }}>CATEGORIA</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: 7 }}>
            {categorias.map(c => (
              <motion.button key={c.id} onClick={() => setCatId(c.id!)} whileTap={{ scale: 0.92 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '9px 4px', borderRadius: 13, border: catId === c.id ? `2px solid ${c.cor}` : '1.5px solid #E8E0D5', background: catId === c.id ? `${c.cor}12` : 'white', cursor: 'pointer' }}>
                <CategoryIcon nome={c.nome} cor={c.cor} size={36} radius={10} />
                <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 600, color: catId === c.id ? c.cor : '#7A5C4F', textAlign: 'center', lineHeight: 1.2 }}>{c.nome}</span>
              </motion.button>
            ))}
          </div>
        </div>
        <motion.button onClick={handleSave} whileTap={{ scale: 0.97 }}
          style={{ width: '100%', padding: '15px 0', borderRadius: 14, border: 'none', cursor: 'pointer', background: '#C4553B', color: 'white', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, fontWeight: 700 }}>
          Salvar alterações
        </motion.button>
      </motion.div>
    </motion.div>
  )
}

function TxRow({ tx, i }: { tx: any; i: number }) {
  const [cat, setCat] = useState<any>(null)
  const [conta, setConta] = useState<any>(null)
  const [showActions, setShowActions] = useState(false)
  const [showAnexos, setShowAnexos] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const anexos = useAnexos(tx.id!)
  const fileRef = useRef<HTMLInputElement>(null)

  useState(() => {
    db.categorias.get(tx.categoriaId).then(setCat)
    db.contas.get(tx.contaId).then(setConta)
  })

  const catCor = cat?.cor ?? '#9B8A7A'
  const isReceita = tx.tipo === 'receita'

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.04, type: 'spring', stiffness: 300, damping: 25 }}
        onClick={() => setShowActions(s => !s)}
        style={{
          borderRadius: 18, padding: '0', cursor: 'pointer', overflow: 'hidden',
          background: `rgba(${hexToRgb(catCor)}, 0.08)`,
          border: showActions ? `1.5px solid rgba(${hexToRgb(catCor)}, 0.4)` : `1.5px solid rgba(${hexToRgb(catCor)}, 0.15)`,
          transition: 'all .2s',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px' }}>
          <CategoryIcon nome={cat?.nome ?? ''} cor={catCor} size={46} radius={14} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 700, color: '#2C1A0F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.descricao}</p>
            <div style={{ display: 'flex', gap: 6, marginTop: 3, alignItems: 'center' }}>
              <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600, color: catCor }}>{cat?.nome}</span>
              <span style={{ color: '#C4B4A8', fontSize: 10 }}>·</span>
              <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#9B7B6A' }}>{fmtDate(tx.data)}</span>
              {conta && <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, background: `rgba(${hexToRgb(conta.cor)},0.15)`, color: conta.cor, padding: '1px 6px', borderRadius: 20, fontWeight: 600 }}>{conta.nome}</span>}
              {anexos.length > 0 && <span style={{ fontSize: 11, color: '#3A8580', fontWeight: 600 }}>📎</span>}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 17, fontWeight: 700, color: isReceita ? '#3A8580' : '#C4553B' }}>
              {isReceita ? '+' : '−'}{fmt(tx.valor)}
            </p>
          </div>
        </div>

        <AnimatePresence>
          {showActions && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              style={{ overflow: 'hidden' }}>
              <div style={{ display: 'flex', borderTop: `1px solid rgba(${hexToRgb(catCor)},0.15)` }}>
                {[
                  { label: 'Editar', icon: <IconEdit size={13} />, color: '#C4553B', bg: `rgba(${hexToRgb(catCor)},0.1)`, action: () => setShowEdit(true) },
                  { label: `Anexos${anexos.length > 0 ? ` (${anexos.length})` : ''}`, icon: <IconPaperclip size={13} />, color: '#3A8580', bg: 'rgba(58,133,128,0.08)', action: () => setShowAnexos(true) },
                  { label: 'Excluir', icon: <IconTrash size={13} />, color: '#9B7B6A', bg: 'rgba(155,123,106,0.08)', action: () => tx.id && deleteTransacao(tx.id) },
                ].map((btn, bi) => (
                  <button key={bi} onClick={e => { e.stopPropagation(); btn.action() }}
                    style={{ flex: 1, padding: '10px 0', border: 'none', background: btn.bg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, color: btn.color, borderRight: bi < 2 ? `1px solid rgba(${hexToRgb(catCor)},0.15)` : 'none' }}>
                    {btn.icon}{btn.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {showEdit && <EditTxModal tx={tx} onClose={() => setShowEdit(false)} />}
        {showAnexos && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowAnexos(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(44,26,15,0.55)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: 520, background: '#FFFDF9', borderRadius: '24px 24px 0 0', padding: '20px 20px 48px', maxHeight: '80dvh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: '#2C1A0F' }}>Anexos</h3>
                <div style={{ display: 'flex', gap: 8 }}>
                  <motion.button whileTap={{ scale: 0.95 }} onClick={() => fileRef.current?.click()}
                    style={{ background: '#C4553B', color: 'white', border: 'none', borderRadius: 10, padding: '8px 14px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>+ Adicionar</motion.button>
                  <button onClick={() => setShowAnexos(false)} style={{ background: '#F5F0E8', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IconX size={16} color="#9B7B6A" /></button>
                </div>
                <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={async e => { const f = e.target.files?.[0]; if (f && tx.id) await addAnexo(tx.id, f) }} />
              </div>
              {anexos.length === 0
                ? <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, color: '#9B7B6A', textAlign: 'center', padding: '24px 0' }}>Nenhum anexo</p>
                : anexos.map(a => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#FAF6F0', borderRadius: 12, padding: '10px 12px', marginBottom: 8 }}>
                    {a.tipo.startsWith('image/') ? <img src={a.dados} alt="" onClick={() => window.open(a.dados, '_blank')} style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 10, cursor: 'pointer', flexShrink: 0 }} /> : <div style={{ width: 52, height: 52, background: '#3D7EB5', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0, cursor: 'pointer' }} onClick={() => { const l = document.createElement('a'); l.href = a.dados; l.download = a.nomeArquivo; l.click() }}>📄</div>}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, color: '#2C1A0F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.nomeArquivo}</p>
                      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#9B7B6A' }}>{(a.tamanho/1024).toFixed(0)} KB</p>
                    </div>
                    <button onClick={() => a.id && deleteAnexo(a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C4B4A8', fontSize: 18 }}>×</button>
                  </div>
                ))
              }
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// Group transactions by date
function groupByDate(txs: any[]) {
  const groups: Record<string, any[]> = {}
  txs.forEach(tx => {
    const d = tx.data
    if (!groups[d]) groups[d] = []
    groups[d].push(tx)
  })
  return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a))
}

export function Page() {
  const transacoes = useTransacoes(200)
  const contas = useContas()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [busca, setBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'receita' | 'despesa'>('todos')

  const filtroContaId = searchParams.get('conta') ? Number(searchParams.get('conta')) : null
  const contaFiltrada = filtroContaId ? contas.find(c => c.id === filtroContaId) : null

  const filtradas = transacoes.filter(tx => {
    const okTipo = filtroTipo === 'todos' || tx.tipo === filtroTipo
    const okBusca = !busca || tx.descricao.toLowerCase().includes(busca.toLowerCase())
    const okConta = !filtroContaId || tx.contaId === filtroContaId
    return okTipo && okBusca && okConta
  })

  const grupos = groupByDate(filtradas)

  const hoje = new Date().toISOString().split('T')[0]
  const ontem = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const labelData = (d: string) => d === hoje ? 'Hoje' : d === ontem ? 'Ontem' : new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div style={{ padding: '24px 28px', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 28, fontWeight: 700, color: '#2C1A0F' }}>Transações</h1>
        <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#9B7B6A', background: '#F5F0E8', padding: '4px 10px', borderRadius: 20 }}>{filtradas.length} itens</span>
      </div>

      {contaFiltrada && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: `${contaFiltrada.cor}15`, border: `1.5px solid ${contaFiltrada.cor}30`, borderRadius: 12, padding: '8px 14px', marginBottom: 12 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: contaFiltrada.cor, flexShrink: 0 }} />
          <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 600, color: contaFiltrada.cor, flex: 1 }}>
            {contaFiltrada.nome}
          </span>
          <button onClick={() => navigate('/transacoes')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: '#9B7B6A', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12 }}>
            <IconFilterOff size={14} stroke={1.8} /> Limpar
          </button>
        </motion.div>
      )}

      <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="🔍  Buscar..."
        style={{ width: '100%', background: '#FFFDF9', border: '1.5px solid #E8E0D5', borderRadius: 14, padding: '12px 16px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, color: '#2C1A0F', outline: 'none', marginBottom: 10, boxSizing: 'border-box' }} />

      <div style={{ display: 'flex', gap: 7, marginBottom: 24 }}>
        {(['todos', 'receita', 'despesa'] as const).map(f => (
          <motion.button key={f} whileTap={{ scale: 0.95 }} onClick={() => setFiltroTipo(f)}
            style={{ padding: '8px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700, transition: 'all .15s',
              background: filtroTipo === f ? (f === 'receita' ? '#3A8580' : f === 'despesa' ? '#C4553B' : '#2C1A0F') : '#F5F0E8',
              color: filtroTipo === f ? 'white' : '#7A5C4F' }}>
            {f === 'todos' ? 'Todos' : f === 'receita' ? '+ Receitas' : '− Despesas'}
          </motion.button>
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
        <div>
          {grupos.map(([data, txs]) => (
            <div key={data} style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700, color: '#9B7B6A', textTransform: 'capitalize' }}>{labelData(data)}</p>
                <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 13, fontWeight: 700, color: txs.reduce((s,t) => s + (t.tipo==='receita'?t.valor:-t.valor), 0) >= 0 ? '#3A8580' : '#C4553B' }}>
                  {txs.reduce((s,t) => s + (t.tipo==='receita'?t.valor:-t.valor), 0) >= 0 ? '+' : ''}{fmt(txs.reduce((s,t) => s + (t.tipo==='receita'?t.valor:-t.valor), 0))}
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {txs.map((tx, i) => <TxRow key={tx.id} tx={tx} i={i} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

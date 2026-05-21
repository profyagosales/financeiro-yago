import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTransacoes, deleteTransacao, editTransacao } from '@/db/hooks/useTransacoes'
import { useAnexos, addAnexo, deleteAnexo } from '@/db/hooks/useAnexos'
import { useCategorias } from '@/db/hooks/useCategorias'
import { useContas } from '@/db/hooks/useContas'
import { fmt, fmtDate } from '@/lib/format'
import { db } from '@/db/schema'
import { Dobrao } from '@/components/mascot/Dobrao'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { IconEdit, IconTrash, IconPaperclip, IconX, IconCheck } from '@tabler/icons-react'

function EditTxModal({ tx, onClose }: { tx: any; onClose: () => void }) {
  const [valor, setValor] = useState(String(tx.valor))
  const [desc, setDesc] = useState(tx.descricao)
  const [catId, setCatId] = useState(tx.categoriaId)
  const [contaId, setContaId] = useState(tx.contaId)
  const [data, setData] = useState(tx.data)
  const categorias = useCategorias(tx.tipo)
  const contas = useContas()

  const handleSave = async () => {
    await editTransacao(tx.id, {
      valor: parseFloat(valor.replace(',', '.')) || tx.valor,
      descricao: desc, categoriaId: catId, contaId, data,
    })
    onClose()
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(44,26,15,0.6)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 520, background: '#FFFDF9', borderRadius: '24px 24px 0 0', padding: '20px 20px 48px', maxHeight: '90dvh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
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
          style={{ width: '100%', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '11px 14px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, color: '#2C1A0F', outline: 'none', marginBottom: 10 }} />

        <input value={data} onChange={e => setData(e.target.value)} type="date"
          style={{ width: '100%', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '11px 14px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, color: '#2C1A0F', outline: 'none', marginBottom: 12 }} />

        {contas.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: '#9B7B6A', marginBottom: 6 }}>CONTA</p>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {contas.map(c => (
                <button key={c.id} onClick={() => setContaId(c.id!)}
                  style={{ padding: '6px 12px', borderRadius: 20, border: contaId === c.id ? `2px solid ${c.cor}` : '1.5px solid #E8E0D5', cursor: 'pointer', background: contaId === c.id ? `${c.cor}18` : 'white', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, color: contaId === c.id ? c.cor : '#7A5C4F', transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.cor }} />{c.nome}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: '#9B7B6A', marginBottom: 8 }}>CATEGORIA</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', gap: 7 }}>
            {categorias.map(c => (
              <motion.button key={c.id} onClick={() => setCatId(c.id!)} whileTap={{ scale: 0.92 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '9px 4px', borderRadius: 13, border: catId === c.id ? `2px solid ${c.cor}` : '1.5px solid #E8E0D5', background: catId === c.id ? `${c.cor}12` : 'white', cursor: 'pointer', transition: 'all .15s' }}>
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
  const [showActions, setShowActions] = useState(false)
  const [showAnexos, setShowAnexos] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const anexos = useAnexos(tx.id!)
  const fileRef = useRef<HTMLInputElement>(null)

  useState(() => { db.categorias.get(tx.categoriaId).then(setCat) })

  return (
    <>
      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
        transition={{ delay: i * 0.04, type: 'spring', stiffness: 300, damping: 25 }}
        onClick={() => setShowActions(s => !s)}
        style={{ background: '#FFFDF9', border: '0.5px solid #E8E0D5', borderRadius: 14, padding: '12px 14px', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          {cat && <CategoryIcon nome={cat.nome} cor={cat.cor} size={42} radius={13} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 600, color: '#2C1A0F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.descricao}</p>
            <div style={{ display: 'flex', gap: 5, marginTop: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 600, color: 'white', background: cat?.cor ?? '#9B8A7A', padding: '1px 7px', borderRadius: 20 }}>{cat?.nome}</span>
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
              <div style={{ display: 'flex', gap: 8, paddingTop: 10, marginTop: 10, borderTop: '0.5px solid #F0EAE2' }}>
                <button onClick={e => { e.stopPropagation(); setShowEdit(true) }}
                  style={{ flex: 1, background: '#FAF0EE', color: '#C4553B', border: 'none', borderRadius: 10, padding: '8px 0', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  <IconEdit size={14} /> Editar
                </button>
                <button onClick={e => { e.stopPropagation(); setShowAnexos(true) }}
                  style={{ flex: 1, background: '#EBF5F0', color: '#3A8580', border: 'none', borderRadius: 10, padding: '8px 0', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  <IconPaperclip size={14} /> Anexos {anexos.length > 0 ? `(${anexos.length})` : ''}
                </button>
                <button onClick={e => { e.stopPropagation(); tx.id && deleteTransacao(tx.id) }}
                  style={{ flex: 1, background: '#F5F0E8', color: '#9B7B6A', border: 'none', borderRadius: 10, padding: '8px 0', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  <IconTrash size={14} /> Excluir
                </button>
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
                    style={{ background: '#C4553B', color: 'white', border: 'none', borderRadius: 10, padding: '8px 14px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    + Adicionar
                  </motion.button>
                  <button onClick={() => setShowAnexos(false)} style={{ background: '#F5F0E8', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IconX size={16} color="#9B7B6A" />
                  </button>
                </div>
                <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={async e => { const f = e.target.files?.[0]; if (f && tx.id) await addAnexo(tx.id, f) }} />
              </div>
              {anexos.length === 0 ? (
                <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, color: '#9B7B6A', textAlign: 'center', padding: '24px 0' }}>Nenhum anexo</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {anexos.map(a => (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#FAF6F0', borderRadius: 12, padding: '10px 12px' }}>
                      {a.tipo.startsWith('image/') ? (
                        <img src={a.dados} alt={a.nomeArquivo} onClick={() => window.open(a.dados, '_blank')}
                          style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 10, cursor: 'pointer', flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 52, height: 52, background: '#3D7EB5', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0, cursor: 'pointer' }}
                          onClick={() => { const l = document.createElement('a'); l.href = a.dados; l.download = a.nomeArquivo; l.click() }}>📄</div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, color: '#2C1A0F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.nomeArquivo}</p>
                        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#9B7B6A' }}>{(a.tamanho / 1024).toFixed(0)} KB</p>
                      </div>
                      <button onClick={() => a.id && deleteAnexo(a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C4B4A8', fontSize: 18 }}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export function Page() {
  const transacoes = useTransacoes(200)
  const [busca, setBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'receita' | 'despesa'>('todos')

  const filtradas = transacoes.filter(tx => {
    const okTipo = filtroTipo === 'todos' || tx.tipo === filtroTipo
    const okBusca = !busca || tx.descricao.toLowerCase().includes(busca.toLowerCase())
    return okTipo && okBusca
  })

  return (
    <div style={{ padding: '24px 28px', width: '100%' }}>
      <h1 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 28, fontWeight: 700, color: '#2C1A0F', marginBottom: 16 }}>Transações</h1>
      <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="🔍  Buscar transação..."
        style={{ width: '100%', background: '#FFFDF9', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '11px 14px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, color: '#2C1A0F', outline: 'none', marginBottom: 10, boxSizing: 'border-box' }} />
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['todos', 'receita', 'despesa'] as const).map(f => (
          <button key={f} onClick={() => setFiltroTipo(f)}
            style={{ padding: '7px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', background: filtroTipo === f ? '#C4553B' : '#F5F0E8', color: filtroTipo === f ? 'white' : '#7A5C4F', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, transition: 'all .15s' }}>
            {f === 'todos' ? 'Todos' : f === 'receita' ? '+ Receitas' : '− Despesas'}
          </button>
        ))}
        <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#9B7B6A', marginLeft: 'auto', alignSelf: 'center' }}>{filtradas.length} itens</span>
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
    </div>
  )
}

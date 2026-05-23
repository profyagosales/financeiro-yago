import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconPlus, IconEdit, IconX, IconAlertTriangle, IconCheck, IconTrash } from '@tabler/icons-react'
import { useOrcamentos, addOrcamento, editOrcamento, deleteOrcamento } from '@/db/hooks/useOrcamentos'
import { useCategorias } from '@/db/hooks/useCategorias'
import { useGastosPorCategoria } from '@/db/hooks/useTransacoes'
import { fmt, mesAnoAtual } from '@/lib/format'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { sounds } from '@/lib/sounds'
import { db } from '@/db/schema'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'

export function OrcamentoSection() {
  const { mes, ano } = mesAnoAtual()
  const orcamentos = useOrcamentos()
  const categorias = useCategorias('despesa')
  const gastos = useGastosPorCategoria(mes, ano)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [form, setForm] = useState({ categoriaId: null as number | null, valorLimite: '' })

  useBodyScrollLock(adding || confirmDeleteId !== null)

  // Mini-KPIs
  const totalLimite = orcamentos.reduce((s, o) => s + o.valorLimite, 0)
  const totalGasto = orcamentos.reduce((s, o) => s + (gastos.get(o.categoriaId) ?? 0), 0)
  const estourados = orcamentos.filter(o => (gastos.get(o.categoriaId) ?? 0) > o.valorLimite).length

  const parseValor = (v: string) => parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0

  const handleSave = async () => {
    if (!form.categoriaId || !form.valorLimite) return
    const valor = parseValor(form.valorLimite)
    if (editingId !== null) {
      await editOrcamento(editingId, { valorLimite: valor })
    } else {
      await addOrcamento({
        categoriaId: form.categoriaId,
        valorLimite: valor,
        periodo: 'mensal',
        rollover: false,
      })
    }
    setAdding(false)
    setEditingId(null)
    setForm({ categoriaId: null, valorLimite: '' })
  }

  const openEdit = (orc: { id?: number; categoriaId: number; valorLimite: number }) => {
    setEditingId(orc.id ?? null)
    setForm({ categoriaId: orc.categoriaId, valorLimite: String(orc.valorLimite) })
    setAdding(true)
  }

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700, color: '#2C1A0F', margin: 0, letterSpacing: '-0.6px' }}>Orçamentos</h2>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#9B7B6A', marginTop: 3 }}>
            Limites mensais por categoria — sai alerta quando estoura
          </p>
        </div>
        <button onClick={() => { setEditingId(null); setForm({ categoriaId: null, valorLimite: '' }); setAdding(true) }}
          style={{
            background: '#FFFFFF', color: '#7A5C4F', border: '1.5px solid #EDE6DC',
            borderRadius: 12, padding: '8px 14px', cursor: 'pointer',
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
          <IconPlus size={14} stroke={2.4} /> Novo orçamento
        </button>
      </div>

      {orcamentos.length === 0 ? (
        <div style={{
          background: '#FFFFFF', border: '1px dashed #D4C8BC', borderRadius: 16,
          padding: '28px 24px', textAlign: 'center',
        }}>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#7A5C4F', margin: 0 }}>
            Nenhum orçamento definido. Crie limites mensais por categoria pra controlar gastos.
          </p>
        </div>
      ) : (
        <>
          {/* Mini KPIs */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 12, padding: '10px 14px', background: '#FBF8F3', border: '1px solid #EDE6DC', borderRadius: 12 }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 700, color: '#9B7B6A', letterSpacing: '.08em', textTransform: 'uppercase', margin: 0 }}>Gasto / limite</p>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 700, color: totalGasto > totalLimite ? '#C4553B' : '#2C1A0F', letterSpacing: '-0.3px', margin: '2px 0 0' }}>
                {fmt(totalGasto)} <span style={{ color: '#9B7B6A', fontWeight: 600, fontSize: 12 }}>/ {fmt(totalLimite)}</span>
              </p>
            </div>
            <div style={{ width: 1, background: '#EDE6DC' }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 700, color: '#9B7B6A', letterSpacing: '.08em', textTransform: 'uppercase', margin: 0 }}>Uso geral</p>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 700, color: '#2C1A0F', letterSpacing: '-0.3px', margin: '2px 0 0' }}>
                {totalLimite > 0 ? ((totalGasto / totalLimite) * 100).toFixed(0) : 0}%
              </p>
            </div>
            <div style={{ width: 1, background: '#EDE6DC' }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 700, color: estourados > 0 ? '#C4553B' : '#9B7B6A', letterSpacing: '.08em', textTransform: 'uppercase', margin: 0 }}>Estourados</p>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 700, color: estourados > 0 ? '#C4553B' : '#2C1A0F', letterSpacing: '-0.3px', margin: '2px 0 0' }}>
                {estourados} <span style={{ color: '#9B7B6A', fontWeight: 600, fontSize: 12 }}>de {orcamentos.length}</span>
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10, alignItems: 'stretch' }}>
            {orcamentos.map(orc => (
              <OrcamentoRow key={orc.id} orc={orc} gastos={gastos} onEdit={() => openEdit(orc)} onDelete={() => orc.id !== undefined && setConfirmDeleteId(orc.id)} />
            ))}
          </div>
        </>
      )}

      <AnimatePresence>
        {adding && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => { setAdding(false); setEditingId(null) }}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(28,10,5,0.55)',
              backdropFilter: 'blur(8px)', zIndex: 100,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
            }}>
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 240, damping: 28 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: '#FFFFFF', borderRadius: 20,
                width: '100%', maxWidth: 520,
                boxShadow: '0 24px 64px rgba(28,10,5,0.4)',
              }}>
              <div style={{ padding: '22px 26px', borderBottom: '1px solid #EDE6DC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: '#2C1A0F', margin: 0, letterSpacing: '-0.5px' }}>
                  {editingId ? 'Editar orçamento' : 'Novo orçamento'}
                </h3>
                <button onClick={() => { setAdding(false); setEditingId(null) }}
                  style={{ background: '#F5F0E8', border: 'none', borderRadius: 10, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconX size={16} stroke={2} color="#7A5C4F" />
                </button>
              </div>

              <div style={{ padding: '20px 26px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: '#7A5C4F', letterSpacing: '.1em', textTransform: 'uppercase', margin: '0 0 8px' }}>Categoria</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {categorias.map(c => {
                      const active = form.categoriaId === c.id
                      return (
                        <button key={c.id}
                          onClick={() => !editingId && setForm(f => ({ ...f, categoriaId: c.id! }))}
                          disabled={!!editingId && !active}
                          style={{
                            background: active ? c.cor : '#F5F0E8',
                            color: active ? '#FFFFFF' : '#7A5C4F',
                            border: 'none', borderRadius: 22, padding: '6px 12px',
                            cursor: editingId ? 'default' : 'pointer',
                            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700,
                            display: 'flex', alignItems: 'center', gap: 6,
                            opacity: (editingId && !active) ? 0.4 : 1,
                          }}>
                          <CategoryIcon nome={c.nome} cor={active ? 'rgba(255,255,255,0.18)' : c.cor} size={20} radius={6} />
                          {c.nome}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: '#7A5C4F', letterSpacing: '.1em', textTransform: 'uppercase', margin: '0 0 8px' }}>Limite mensal (R$)</p>
                  <input
                    value={form.valorLimite}
                    onChange={e => setForm(f => ({ ...f, valorLimite: e.target.value }))}
                    placeholder="0,00" inputMode="decimal" autoFocus
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      background: '#FBF8F3', border: '1.5px solid #EDE6DC',
                      borderRadius: 12, padding: '12px 14px',
                      fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 22, fontWeight: 700,
                      color: '#2C1A0F', outline: 'none', letterSpacing: '-0.3px',
                    }}/>
                </div>
              </div>

              <div style={{ padding: '14px 26px', borderTop: '1px solid #EDE6DC', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button onClick={() => { setAdding(false); setEditingId(null) }}
                  style={{ background: 'transparent', color: '#7A5C4F', border: '1.5px solid #EDE6DC', borderRadius: 12, padding: '11px 18px', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700 }}>
                  Cancelar
                </button>
                <button onClick={handleSave}
                  style={{ background: 'linear-gradient(135deg, #D4643A, #C4553B)', color: '#FFFFFF', border: 'none', borderRadius: 12, padding: '11px 20px', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7, boxShadow: '0 4px 16px rgba(196,85,59,0.35)' }}>
                  <IconCheck size={16} stroke={2.5} /> {editingId ? 'Salvar' : 'Criar orçamento'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {confirmDeleteId !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setConfirmDeleteId(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(28,10,5,0.55)', backdropFilter: 'blur(8px)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <motion.div initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ background: '#FFFDF9', borderRadius: 22, padding: '28px 24px', maxWidth: 360, width: '100%', textAlign: 'center', boxShadow: '0 24px 64px rgba(13,6,4,0.4)' }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: '#FAF0EE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <IconTrash size={26} color="#C4553B" stroke={1.8} />
              </div>
              <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: '#2C1A0F', letterSpacing: '-0.5px', margin: '0 0 8px' }}>Excluir orçamento?</p>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#9B7B6A', marginBottom: 22, lineHeight: 1.5 }}>
                O limite mensal dessa categoria será removido. As transações continuam intactas.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setConfirmDeleteId(null)}
                  style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: '1.5px solid #E8E0D5', background: 'white', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, color: '#7A5C4F', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <motion.button whileTap={{ scale: 0.97 }}
                  onClick={async () => { await deleteOrcamento(confirmDeleteId); setConfirmDeleteId(null) }}
                  style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: 'none', background: '#C4553B', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, color: 'white', cursor: 'pointer', boxShadow: '0 4px 12px rgba(196,85,59,0.3)' }}>
                  Excluir
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

function OrcamentoRow({ orc, gastos, onEdit, onDelete }: { orc: { id?: number; categoriaId: number; valorLimite: number }; gastos: Map<number, number>; onEdit: () => void; onDelete: () => void }) {
  const [catNome, setCatNome] = useState('')
  const [catCor, setCatCor] = useState('#9B8A7A')
  const shook = useRef(false)

  useEffect(() => {
    db.categorias.get(orc.categoriaId).then(c => {
      if (c) { setCatNome(c.nome); setCatCor(c.cor) }
    })
  }, [orc.categoriaId])

  const gasto = gastos.get(orc.categoriaId) ?? 0
  const pct = Math.min(100, (gasto / orc.valorLimite) * 100)
  const estourado = gasto > orc.valorLimite

  useEffect(() => {
    if (estourado && !shook.current) {
      shook.current = true
      sounds.error()
    }
  }, [estourado])

  return (
    <motion.div
      layout
      animate={estourado ? { x: [0, -5, 5, -5, 5, -3, 3, 0] } : { x: 0 }}
      whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(44,26,15,0.08)' }}
      transition={{ duration: 0.45, type: 'spring', stiffness: 260, damping: 26 }}
      style={{
        background: '#FFFFFF',
        border: estourado ? '1px solid rgba(196,85,59,0.25)' : '1px solid #EDE6DC',
        borderRadius: 14, padding: '14px 16px',
        boxShadow: '0 1px 3px rgba(44,26,15,0.05), 0 2px 10px rgba(44,26,15,0.04)',
        height: '100%',
      }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <CategoryIcon nome={catNome} cor={catCor} size={30} radius={8} />
          <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, color: '#2C1A0F' }}>{catNome}</span>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 700, color: estourado ? '#C4553B' : '#2C1A0F', letterSpacing: '-0.3px' }}>{fmt(gasto)}</span>
            <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#9B7B6A' }}> / {fmt(orc.valorLimite)}</span>
          </div>
          <div style={{ display: 'flex', gap: 3 }}>
            <button onClick={onEdit} style={{ background: '#F5F0E8', border: 'none', borderRadius: 7, width: 26, height: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconEdit size={11} stroke={1.8} color="#7A5C4F" />
            </button>
            <button onClick={onDelete} title="Excluir" style={{ background: '#FAF0EE', border: 'none', borderRadius: 7, width: 26, height: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconTrash size={11} stroke={2} color="#C4553B" />
            </button>
          </div>
        </div>
      </div>
      <div style={{ background: '#F0EAE2', borderRadius: 4, height: 6, overflow: 'hidden' }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          style={{ height: '100%', background: estourado ? '#C4553B' : pct > 80 ? '#D4A017' : catCor, borderRadius: 4 }} />
      </div>
      {estourado && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 7 }}>
          <IconAlertTriangle size={13} color="#C4553B" stroke={2} />
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: '#C4553B', fontWeight: 700, margin: 0 }}>
            Estourou em {fmt(gasto - orc.valorLimite)}
          </p>
        </div>
      )}
    </motion.div>
  )
}

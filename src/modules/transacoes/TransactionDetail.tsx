import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  IconTrash, IconPaperclip, IconArrowUpRight, IconArrowDownRight,
  IconArrowsExchange, IconCheck, IconClock, IconTag, IconX, IconUpload,
  IconEye, IconDownload,
} from '@tabler/icons-react'
import type { Transacao, Categoria, Conta, Anexo } from '@/db/schema'
import { addAnexo, deleteAnexo, useAnexoSrc } from '@/db/hooks/useAnexos'
import { db } from '@/db/schema'
import { useCategorias } from '@/db/hooks/useCategorias'
import { useContas } from '@/db/hooks/useContas'
import { editTransacaoComSaldo, deleteTransacao } from '@/db/hooks/useTransacoes'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { fmt } from '@/lib/format'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { BankLogo } from '@/components/ui/BankLogo'
import { Modal } from '@/components/ui/Modal'

interface Props {
  tx: Transacao
  onClose: () => void
}

export function TransactionDetail({ tx, onClose }: Props) {
  const categorias = useCategorias()
  const contas = useContas()
  const cat = categorias.find(c => c.id === tx.categoriaId)
  const conta = contas.find(c => c.id === tx.contaId)

  const anexos = useLiveQuery(
    () => tx.id !== undefined ? db.anexos.where('transacaoId').equals(tx.id).toArray() : Promise.resolve([]),
    [tx.id],
  ) ?? []

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const isReceita = tx.tipo === 'receita'
  const isDespesa = tx.tipo === 'despesa'
  const isTransfer = !!tx.transferId
  const tipoLabel = isTransfer ? 'Transferência' : isReceita ? 'Receita' : 'Despesa'
  const tipoCor = isTransfer ? '#8B4BC8' : isReceita ? '#1E7D5A' : '#C4553B'
  const tipoBg = isTransfer ? 'rgba(139,75,200,0.12)' : isReceita ? 'rgba(58,133,128,0.12)' : 'rgba(196,85,59,0.12)'
  const TipoIcon = isTransfer ? IconArrowsExchange : isReceita ? IconArrowUpRight : IconArrowDownRight

  const handleUpdate = async (data: Partial<Transacao>) => {
    if (tx.id === undefined) return
    await editTransacaoComSaldo(tx.id, data)
  }

  const handleDelete = async () => {
    if (tx.id === undefined) return
    await deleteTransacao(tx.id)
    setConfirmDelete(false)
    onClose()
  }

  // Anexos
  const handleAddAnexo = async (file: File) => {
    if (!file || tx.id === undefined) return
    await addAnexo(tx.id, file)
  }

  const handleDeleteAnexo = async (id: number) => {
    await deleteAnexo(id)
  }

  // Tags
  const addTag = () => {
    const t = tagInput.trim()
    if (!t) return
    const current = tx.tags ?? []
    if (current.includes(t)) { setTagInput(''); return }
    handleUpdate({ tags: [...current, t] })
    setTagInput('')
  }
  const removeTag = (t: string) => {
    const current = tx.tags ?? []
    handleUpdate({ tags: current.filter(x => x !== t) })
  }

  return (
    <motion.div
      key={tx.id}
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        background: '#FFFFFF',
        border: '1px solid #EDE6DC',
        borderRadius: 22,
        boxShadow: '0 1px 3px rgba(44,26,15,0.05), 0 6px 20px rgba(44,26,15,0.06)',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        height: '100%',
      }}>

      {/* ─── LOCKED HEADER ─── */}
      <div style={{
        padding: '22px 28px',
        background: `linear-gradient(135deg, ${tipoCor}12 0%, ${tipoCor}04 100%)`,
        borderBottom: '1px solid #EDE6DC',
        flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        {isTransfer ? (
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: tipoCor,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <IconArrowsExchange size={26} stroke={2} color="#FFFFFF" />
          </div>
        ) : cat ? (
          <CategoryIcon nome={cat.nome} cor={cat.cor} size={56} radius={14} />
        ) : (
          <div style={{ width: 56, height: 56, borderRadius: 14, background: 'rgba(122,92,79,0.12)' }}/>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '3px 9px', borderRadius: 7,
              background: tipoBg,
              border: `1px solid ${tipoCor}38`,
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700,
              color: tipoCor, letterSpacing: '.06em', textTransform: 'uppercase',
            }}>
              <TipoIcon size={11} stroke={2.4} />{tipoLabel}
            </span>
          </div>
          <p style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 36, fontWeight: 700,
            color: isReceita ? '#1E7D5A' : '#2C1A0F',
            letterSpacing: '-0.3px', lineHeight: 1, margin: '6px 0 0',
          }}>{isReceita ? '+' : isDespesa ? '−' : ''}{fmt(tx.valor).replace(/^-/, '')}</p>
        </div>
        <button onClick={onClose} title="Fechar"
          style={{
            background: 'rgba(255,255,255,0.7)', border: '1px solid #EDE6DC',
            borderRadius: 9, width: 32, height: 32, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
          <IconX size={14} stroke={2} color="#7A5C4F" />
        </button>
      </div>

      {/* ─── SCROLLABLE BODY ─── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>

        {/* Inline editable fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          <EditableTextField
            label="Descrição"
            value={tx.descricao}
            onSave={v => handleUpdate({ descricao: v })}
            placeholder="Sem descrição"
          />

          <EditableValueField
            label="Valor"
            value={tx.valor}
            onSave={v => handleUpdate({ valor: v })}
          />

          <EditableDateField
            label="Data"
            value={tx.data}
            onSave={v => handleUpdate({ data: v })}
          />

          {!isTransfer && (
            <EditableContaField
              label="Conta"
              value={tx.contaId}
              contas={contas}
              onSave={v => handleUpdate({ contaId: v })}
            />
          )}

          {!isTransfer && (
            <EditableCategoriaField
              label="Categoria"
              value={tx.categoriaId}
              categorias={categorias.filter(c => c.tipo === tx.tipo)}
              onSave={v => handleUpdate({ categoriaId: v })}
            />
          )}

          <EditableStatusField
            label="Status"
            value={tx.status}
            onSave={v => handleUpdate({ status: v })}
          />

          {/* Tags */}
          <div>
            <Label>Tags</Label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              {(tx.tags ?? []).map(t => (
                <span key={t} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: '#FBF8F3', border: '1px solid #EDE6DC',
                  borderRadius: 20, padding: '4px 10px',
                  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600,
                  color: '#7A5C4F',
                }}>
                  <IconTag size={11} stroke={2} />{t}
                  <button onClick={() => removeTag(t)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#9B7B6A', display: 'flex' }}>
                    <IconX size={11} stroke={2.4} />
                  </button>
                </span>
              ))}
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                placeholder="+ tag"
                style={{
                  background: 'transparent', border: '1px dashed #D4C8BC',
                  borderRadius: 20, padding: '4px 10px',
                  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600,
                  color: '#7A5C4F', outline: 'none',
                  width: 90,
                }}
              />
            </div>
          </div>

          {/* Notas */}
          <EditableNotesField
            label="Notas"
            value={tx.notas ?? ''}
            onSave={v => handleUpdate({ notas: v || undefined })}
          />
        </div>

        {/* Anexos inline */}
        <div style={{ marginTop: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Label>Anexos {anexos.length > 0 && `(${anexos.length})`}</Label>
            <button onClick={() => fileInputRef.current?.click()}
              style={{
                background: '#FBF8F3', border: '1px solid #EDE6DC',
                borderRadius: 9, padding: '6px 12px', cursor: 'pointer',
                fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700,
                color: '#7A5C4F',
                display: 'inline-flex', alignItems: 'center', gap: 5,
              }}>
              <IconUpload size={12} stroke={2.2} /> Adicionar
            </button>
            <input ref={fileInputRef} type="file"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleAddAnexo(f); e.target.value = '' }}
              style={{ display: 'none' }}/>
          </div>
          {anexos.length === 0 ? (
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleAddAnexo(f) }}
              style={{
                padding: '20px 16px', textAlign: 'center',
                background: '#FBF8F3', border: '1px dashed #D4C8BC', borderRadius: 12,
              }}>
              <IconPaperclip size={20} stroke={1.6} color="#9B7B6A" />
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#9B7B6A', margin: '6px 0 0' }}>
                Arraste arquivos aqui ou clique em Adicionar
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {anexos.map(a => <AnexoRow key={a.id} anexo={a} onDelete={() => a.id !== undefined && handleDeleteAnexo(a.id)} />)}
            </div>
          )}
        </div>

        {/* Danger zone */}
        <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid #EDE6DC' }}>
          <button onClick={() => setConfirmDelete(true)}
            style={{
              background: 'transparent', color: '#C4553B', border: '1px solid rgba(196,85,59,0.3)',
              borderRadius: 10, padding: '9px 16px', cursor: 'pointer',
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
            <IconTrash size={13} stroke={2} /> Excluir transação
          </button>
        </div>
      </div>

      {/* Confirm delete */}
      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        size="sm"
        title="Excluir transação?"
        subtitle={tx.descricao || cat?.nome || 'Esta ação não pode ser desfeita'}
        icon={<IconTrash size={20} stroke={1.8} color="#C4553B" />}
      >
        <Modal.Body>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#7A5C4F', lineHeight: 1.5, margin: 0 }}>
            A transação será removida e o saldo da conta será ajustado automaticamente.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <button onClick={() => setConfirmDelete(false)}
            style={{ background: 'transparent', color: '#7A5C4F', border: '1.5px solid #EDE6DC', borderRadius: 12, padding: '11px 20px', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700 }}>
            Cancelar
          </button>
          <button onClick={handleDelete}
            style={{ background: 'linear-gradient(135deg, #D4643A, #C4553B)', color: '#FFFFFF', border: 'none', borderRadius: 12, padding: '11px 22px', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 7, boxShadow: '0 4px 16px rgba(196,85,59,0.35)' }}>
            <IconTrash size={15} stroke={2.4} /> Excluir
          </button>
        </Modal.Footer>
      </Modal>
    </motion.div>
  )
}

// ─── Inline editable fields ──────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700,
      color: '#7A5C4F', letterSpacing: '.12em', textTransform: 'uppercase',
      display: 'block', marginBottom: 6,
    }}>{children}</span>
  )
}

function EditableTextField({ label, value, onSave, placeholder }: { label: string; value: string; onSave: (v: string) => void; placeholder?: string }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)
  useEffect(() => setVal(value), [value])

  return (
    <div>
      <Label>{label}</Label>
      {editing ? (
        <input autoFocus
          value={val}
          onChange={e => setVal(e.target.value)}
          onBlur={() => { onSave(val); setEditing(false) }}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.currentTarget.blur() }
            if (e.key === 'Escape') { setVal(value); setEditing(false) }
          }}
          placeholder={placeholder}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: '#FBF8F3', border: '1.5px solid #C4553B',
            borderRadius: 10, padding: '10px 12px',
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 500,
            color: '#2C1A0F', outline: 'none',
          }}/>
      ) : (
        <button onClick={() => setEditing(true)}
          style={{
            width: '100%', textAlign: 'left',
            background: 'transparent', border: '1.5px solid transparent',
            borderRadius: 10, padding: '10px 12px', cursor: 'text',
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 500,
            color: value ? '#2C1A0F' : '#9B7B6A',
            transition: 'all .12s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#FBF8F3')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          {value || placeholder}
        </button>
      )}
    </div>
  )
}

function EditableValueField({ label, value, onSave }: { label: string; value: number; onSave: (v: number) => void }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(String(value))
  useEffect(() => setVal(String(value)), [value])

  const parse = (s: string) => parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0
  const save = () => {
    const n = parse(val)
    if (n > 0 && n !== value) onSave(n)
    setEditing(false)
  }

  return (
    <div>
      <Label>{label}</Label>
      {editing ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 18, fontWeight: 700, color: '#C4553B' }}>R$</span>
          <input autoFocus
            value={val}
            onChange={e => setVal(e.target.value)}
            onBlur={save}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.currentTarget.blur() }
              if (e.key === 'Escape') { setVal(String(value)); setEditing(false) }
            }}
            inputMode="decimal"
            style={{
              flex: 1, background: '#FBF8F3', border: '1.5px solid #C4553B',
              borderRadius: 10, padding: '10px 12px',
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: '-0.3px',
              color: '#2C1A0F', outline: 'none',
            }}/>
        </div>
      ) : (
        <button onClick={() => setEditing(true)}
          style={{
            width: '100%', textAlign: 'left',
            background: 'transparent', border: '1.5px solid transparent',
            borderRadius: 10, padding: '10px 12px', cursor: 'text',
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 20, fontWeight: 700, letterSpacing: '-0.3px',
            color: '#2C1A0F',
            transition: 'all .12s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#FBF8F3')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          {fmt(value)}
        </button>
      )}
    </div>
  )
}

function EditableDateField({ label, value, onSave }: { label: string; value: string; onSave: (v: string) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <input type="date" value={value} onChange={e => onSave(e.target.value)}
        style={{
          width: '100%', boxSizing: 'border-box',
          background: '#FBF8F3', border: '1.5px solid #EDE6DC',
          borderRadius: 10, padding: '10px 12px',
          fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 500,
          color: '#2C1A0F', outline: 'none',
        }}/>
    </div>
  )
}

function EditableContaField({ label, value, contas, onSave }: { label: string; value: number; contas: Conta[]; onSave: (v: number) => void }) {
  const [editing, setEditing] = useState(false)
  const conta = contas.find(c => c.id === value)

  return (
    <div>
      <Label>{label}</Label>
      {editing ? (
        <div style={{
          background: '#FBF8F3', border: '1.5px solid #EDE6DC',
          borderRadius: 10, padding: 8,
          display: 'flex', flexWrap: 'wrap', gap: 6,
        }}>
          {contas.map(c => {
            const active = c.id === value
            return (
              <button key={c.id}
                onClick={() => { onSave(c.id!); setEditing(false) }}
                style={{
                  background: active ? c.cor : '#FFFFFF',
                  color: active ? '#FFFFFF' : '#2C1A0F',
                  border: `1px solid ${active ? c.cor : '#EDE6DC'}`,
                  borderRadius: 18, padding: '4px 10px 4px 4px', cursor: 'pointer',
                  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700,
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                }}>
                <BankLogo logo={c.logo} nome={c.nome} cor={c.cor} size={20} radiusRatio={0.3}/>
                {c.nome}
              </button>
            )
          })}
        </div>
      ) : (
        <button onClick={() => setEditing(true)}
          style={{
            width: '100%', textAlign: 'left',
            background: 'transparent', border: '1.5px solid transparent',
            borderRadius: 10, padding: '8px 10px', cursor: 'pointer',
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 600,
            color: '#2C1A0F',
            display: 'inline-flex', alignItems: 'center', gap: 9,
            transition: 'all .12s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#FBF8F3')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          {conta && <BankLogo logo={conta.logo} nome={conta.nome} cor={conta.cor} size={28} radiusRatio={0.28} />}
          {conta?.nome ?? 'Sem conta'}
        </button>
      )}
    </div>
  )
}

function EditableCategoriaField({ label, value, categorias, onSave }: { label: string; value: number; categorias: Categoria[]; onSave: (v: number) => void }) {
  const [editing, setEditing] = useState(false)
  const cat = categorias.find(c => c.id === value)

  return (
    <div>
      <Label>{label}</Label>
      {editing ? (
        <div style={{
          background: '#FBF8F3', border: '1.5px solid #EDE6DC',
          borderRadius: 10, padding: 8,
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(86px, 1fr))', gap: 6,
        }}>
          {categorias.map(c => {
            const active = c.id === value
            return (
              <button key={c.id}
                onClick={() => { onSave(c.id!); setEditing(false) }}
                style={{
                  background: active ? `${c.cor}18` : '#FFFFFF',
                  border: `1.5px solid ${active ? c.cor : '#EDE6DC'}`,
                  borderRadius: 10, padding: '8px 6px', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                }}>
                <CategoryIcon nome={c.nome} cor={c.cor} size={26} radius={8} />
                <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 700, color: active ? c.cor : '#2C1A0F', textAlign: 'center' }}>{c.nome}</span>
              </button>
            )
          })}
        </div>
      ) : (
        <button onClick={() => setEditing(true)}
          style={{
            width: '100%', textAlign: 'left',
            background: 'transparent', border: '1.5px solid transparent',
            borderRadius: 10, padding: '8px 10px', cursor: 'pointer',
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 600,
            color: '#2C1A0F',
            display: 'inline-flex', alignItems: 'center', gap: 9,
            transition: 'all .12s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#FBF8F3')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          {cat && <CategoryIcon nome={cat.nome} cor={cat.cor} size={28} radius={9} />}
          {cat?.nome ?? 'Sem categoria'}
        </button>
      )}
    </div>
  )
}

function EditableStatusField({ label, value, onSave }: { label: string; value: string; onSave: (v: string) => void }) {
  const isPago = value === 'efetivada' || value === 'pago'
  return (
    <div>
      <Label>{label}</Label>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={() => onSave('efetivada')}
          style={{
            background: isPago ? 'rgba(58,133,128,0.14)' : 'transparent',
            color: isPago ? '#1E7D5A' : '#9B7B6A',
            border: `1.5px solid ${isPago ? '#3A8580' : '#EDE6DC'}`,
            borderRadius: 22, padding: '6px 12px', cursor: 'pointer',
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', gap: 5,
          }}>
          <IconCheck size={12} stroke={2.4} /> Confirmado
        </button>
        <button onClick={() => onSave('pendente')}
          style={{
            background: !isPago ? 'rgba(212,160,23,0.14)' : 'transparent',
            color: !isPago ? '#A8730F' : '#9B7B6A',
            border: `1.5px solid ${!isPago ? '#D4A017' : '#EDE6DC'}`,
            borderRadius: 22, padding: '6px 12px', cursor: 'pointer',
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', gap: 5,
          }}>
          <IconClock size={12} stroke={2.2} /> Pendente
        </button>
      </div>
    </div>
  )
}

function EditableNotesField({ label, value, onSave }: { label: string; value: string; onSave: (v: string) => void }) {
  const [val, setVal] = useState(value)
  useEffect(() => setVal(value), [value])
  return (
    <div>
      <Label>{label}</Label>
      <textarea
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={() => onSave(val)}
        placeholder="Notas opcionais sobre esta transação..."
        rows={3}
        style={{
          width: '100%', boxSizing: 'border-box',
          background: '#FBF8F3', border: '1.5px solid #EDE6DC',
          borderRadius: 10, padding: '10px 12px',
          fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 500,
          color: '#2C1A0F', outline: 'none',
          resize: 'vertical', minHeight: 60,
        }}/>
    </div>
  )
}

function AnexoRow({ anexo, onDelete }: { anexo: Anexo; onDelete: () => void }) {
  const isImg = anexo.tipo.startsWith('image/')
  const isPdf = anexo.tipo === 'application/pdf'
  const sizeKB = (anexo.tamanho / 1024).toFixed(0)
  const [preview, setPreview] = useState(false)
  useBodyScrollLock(preview)
  const src = useAnexoSrc(anexo)

  const handleVer = () => {
    if (!src) return
    if (isImg || isPdf) {
      setPreview(true)
    } else {
      handleBaixar()
    }
  }

  const handleBaixar = () => {
    if (!src) return
    const a = document.createElement('a')
    a.href = src
    a.download = anexo.nomeArquivo
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 10px', background: '#FBF8F3', border: '1px solid #EDE6DC',
        borderRadius: 10,
      }}>
        {isImg ? (
          <img src={src ?? ''} alt={anexo.nomeArquivo}
            onClick={handleVer}
            style={{ width: 36, height: 36, borderRadius: 7, objectFit: 'cover', flexShrink: 0, cursor: 'pointer' }}/>
        ) : (
          <div onClick={handleVer}
            style={{ width: 36, height: 36, borderRadius: 7, background: isPdf ? 'rgba(196,85,59,0.15)' : 'rgba(122,92,79,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}>
            <IconPaperclip size={16} stroke={2} color={isPdf ? '#C4553B' : '#7A5C4F'} />
          </div>
        )}
        <button onClick={handleVer}
          style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, color: '#2C1A0F', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {anexo.nomeArquivo}
          </p>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: '#9B7B6A', margin: '2px 0 0' }}>
            {sizeKB} KB · {anexo.tipo.split('/')[1]?.toUpperCase() ?? 'arquivo'}
          </p>
        </button>
        {(isImg || isPdf) && (
          <button onClick={handleVer} title="Visualizar"
            style={{ background: 'rgba(58,133,128,0.12)', border: 'none', borderRadius: 7, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconEye size={13} stroke={2} color="#1E7D5A" />
          </button>
        )}
        <button onClick={handleBaixar} title="Baixar"
          style={{ background: 'rgba(61,126,181,0.12)', border: 'none', borderRadius: 7, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <IconDownload size={13} stroke={2} color="#3D7EB5" />
        </button>
        <button onClick={onDelete} title="Remover"
          style={{ background: '#FAEAEA', border: 'none', borderRadius: 7, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <IconTrash size={13} stroke={2} color="#C4553B" />
        </button>
      </div>

      {/* Lightbox preview */}
      {preview && (
        <div onClick={() => setPreview(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(13,6,4,0.92)', zIndex: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          {/* Toolbar */}
          <div style={{
            position: 'absolute', top: 16, left: 16, right: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }} onClick={e => e.stopPropagation()}>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: 12 }}>
              {anexo.nomeArquivo} <span style={{ color: 'rgba(255,255,255,0.5)', marginLeft: 6 }}>· {sizeKB} KB</span>
            </p>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button onClick={handleBaixar} title="Baixar"
                style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 9, padding: '8px 12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700, color: '#FFFFFF' }}>
                <IconDownload size={14} stroke={2} /> Baixar
              </button>
              <button onClick={() => setPreview(false)} title="Fechar"
                style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 9, width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconX size={16} stroke={2} color="#FFFFFF" />
              </button>
            </div>
          </div>

          {/* Conteúdo */}
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 1000, maxHeight: '85vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isImg ? (
              <img src={src ?? ''} alt={anexo.nomeArquivo}
                style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: 10, boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}/>
            ) : (
              <iframe src={src ?? ''} title={anexo.nomeArquivo}
                style={{ width: '100%', height: '85vh', border: 'none', borderRadius: 10, background: '#FFFFFF', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}/>
            )}
          </div>
        </div>
      )}
    </>
  )
}

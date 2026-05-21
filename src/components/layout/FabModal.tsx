import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCategorias } from '@/db/hooks/useCategorias'
import { useContas } from '@/db/hooks/useContas'
import { addTransacao } from '@/db/hooks/useTransacoes'
import { addAnexo } from '@/db/hooks/useAnexos'
import { todayISO } from '@/lib/format'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { IconX, IconCamera, IconPaperclip, IconCheck } from '@tabler/icons-react'

export function FabModal({ onClose }: { onClose: () => void }) {
  const [tipo, setTipo] = useState<'despesa' | 'receita'>('despesa')
  const [valor, setValor] = useState('')
  const [desc, setDesc] = useState('')
  const [catId, setCatId] = useState<number | null>(null)
  const [contaId, setContaId] = useState<number | null>(null)
  const [data, setData] = useState(todayISO())
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState<{ url: string; file: File } | null>(null)
  const [showAttach, setShowAttach] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  const categorias = useCategorias(tipo)
  const contas = useContas()

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setPreview({ url: f.type.startsWith('image/') ? URL.createObjectURL(f) : '', file: f })
    setShowAttach(false)
  }

  const handleSave = async () => {
    const num = parseFloat(valor.replace(',', '.'))
    if (!num || !catId || !contaId) return
    setSaving(true)
    const txId = await addTransacao({
      data, valor: num, tipo, contaId, categoriaId: catId,
      descricao: desc || categorias.find(c => c.id === catId)?.nome || '',
      status: 'confirmado',
    })
    if (preview && txId) await addAnexo(txId as number, preview.file)
    setSaving(false)
    onClose()
  }

  const selectedCat = categorias.find(c => c.id === catId)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(44,26,15,0.6)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 520, background: '#FFFDF9', borderRadius: '24px 24px 0 0', padding: '20px 20px 48px', maxHeight: '92dvh', overflowY: 'auto' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h2 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700, color: '#2C1A0F' }}>Novo lançamento</h2>
          <button onClick={onClose} style={{ background: '#F5F0E8', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconX size={16} color="#9B7B6A" />
          </button>
        </div>

        {/* Type toggle */}
        <div style={{ display: 'flex', background: '#F5F0E8', borderRadius: 14, padding: 4, marginBottom: 18 }}>
          {(['despesa', 'receita'] as const).map(t => (
            <button key={t} onClick={() => { setTipo(t); setCatId(null) }}
              style={{ flex: 1, padding: '11px 0', borderRadius: 11, border: 'none', cursor: 'pointer', transition: 'all .2s', background: tipo === t ? (t === 'despesa' ? '#C4553B' : '#3A8580') : 'transparent', color: tipo === t ? 'white' : '#9B7B6A', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 700 }}>
              {t === 'despesa' ? '− Despesa' : '+ Receita'}
            </button>
          ))}
        </div>

        {/* Value */}
        <div style={{ display: 'flex', alignItems: 'center', background: '#FAF6F0', border: `2px solid ${valor ? (tipo === 'despesa' ? '#C4553B' : '#3A8580') : '#E8E0D5'}`, borderRadius: 16, padding: '12px 16px', gap: 8, marginBottom: 12, transition: 'border-color .2s' }}>
          <span style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, color: tipo === 'despesa' ? '#C4553B' : '#3A8580', fontWeight: 700 }}>R$</span>
          <input value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" type="tel" autoFocus
            style={{ border: 'none', background: 'transparent', fontFamily: "'Fraunces',Georgia,serif", fontSize: 30, fontWeight: 700, color: '#2C1A0F', flex: 1, outline: 'none', width: '100%' }} />
        </div>

        {/* Desc + camera */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descrição (opcional)"
            style={{ flex: 1, background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '11px 14px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, color: '#2C1A0F', outline: 'none' }} />
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowAttach(s => !s)}
            style={{ width: 46, height: 46, borderRadius: 12, border: preview ? '2px solid #3A8580' : '1.5px solid #E8E0D5', background: preview ? '#EBF5F0' : '#FAF6F0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {preview ? <IconCheck size={18} color="#3A8580" /> : <IconCamera size={18} color="#9B7B6A" />}
          </motion.button>
        </div>

        <AnimatePresence>
          {showAttach && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden', marginBottom: 10 }}>
              <div style={{ background: '#FAF6F0', border: '1.5px dashed #E8E0D5', borderRadius: 14, padding: 12, display: 'flex', gap: 8 }}>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => cameraRef.current?.click()}
                  style={{ flex: 1, padding: '11px 0', borderRadius: 11, border: 'none', background: '#2C1A0F', color: 'white', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  📷 Câmera
                </motion.button>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => fileRef.current?.click()}
                  style={{ flex: 1, padding: '11px 0', borderRadius: 11, border: '1.5px solid #E8E0D5', background: 'white', color: '#2C1A0F', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  📁 Galeria / PDF
                </motion.button>
                <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFile} />
                <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={handleFile} />
              </div>
            </motion.div>
          )}
          {preview && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              style={{ background: '#EBF5F0', border: '1.5px solid #D0E8D8', borderRadius: 14, padding: '10px 12px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
              {preview.url ? <img src={preview.url} alt="preview" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 10, flexShrink: 0 }} /> : <div style={{ width: 44, height: 44, background: '#3D7EB5', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 20 }}>📄</div>}
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, color: '#2C1A0F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{preview.file.name}</p>
                <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#3A8580' }}>{(preview.file.size/1024).toFixed(1)} KB · anexado ✓</p>
              </div>
              <button onClick={() => setPreview(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9B7B6A', fontSize: 18 }}>×</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Date */}
        <input value={data} onChange={e => setData(e.target.value)} type="date"
          style={{ width: '100%', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '11px 14px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, color: '#2C1A0F', outline: 'none', marginBottom: 14 }} />

        {/* Account */}
        {contas.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: '#9B7B6A', marginBottom: 8, letterSpacing: '.04em' }}>CONTA</p>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {contas.map(c => (
                <button key={c.id} onClick={() => setContaId(c.id!)}
                  style={{ padding: '7px 13px', borderRadius: 20, border: contaId === c.id ? `2px solid ${c.cor}` : '1.5px solid #E8E0D5', cursor: 'pointer', background: contaId === c.id ? `${c.cor}18` : 'white', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, color: contaId === c.id ? c.cor : '#7A5C4F', transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.cor }} />
                  {c.nome}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Category — with illustrated icons */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: '#9B7B6A', marginBottom: 8, letterSpacing: '.04em' }}>CATEGORIA</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', gap: 8 }}>
            {categorias.map(c => (
              <motion.button key={c.id} onClick={() => setCatId(c.id!)} whileTap={{ scale: 0.92 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '10px 6px', borderRadius: 14, border: catId === c.id ? `2px solid ${c.cor}` : '1.5px solid #E8E0D5', background: catId === c.id ? `${c.cor}12` : 'white', cursor: 'pointer', transition: 'all .15s' }}>
                <CategoryIcon nome={c.nome} cor={c.cor} size={38} radius={11} />
                <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 600, color: catId === c.id ? c.cor : '#7A5C4F', textAlign: 'center', lineHeight: 1.2 }}>{c.nome}</span>
              </motion.button>
            ))}
          </div>
        </div>

        <motion.button onClick={handleSave} whileTap={{ scale: 0.97 }}
          disabled={!valor || !catId || !contaId || saving}
          style={{ width: '100%', padding: '16px 0', borderRadius: 14, border: 'none', cursor: valor && catId && contaId ? 'pointer' : 'default', background: valor && catId && contaId ? (tipo === 'despesa' ? '#C4553B' : '#3A8580') : '#E8E0D5', color: valor && catId && contaId ? 'white' : '#9B7B6A', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 16, fontWeight: 700, transition: 'all .2s' }}>
          {saving ? 'Salvando...' : `Salvar ${tipo}${preview ? ' + anexo' : ''}`}
        </motion.button>
      </motion.div>
    </motion.div>
  )
}

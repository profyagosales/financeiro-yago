import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCategorias } from '@/db/hooks/useCategorias'
import { useContas } from '@/db/hooks/useContas'
import { useCartoes, addLancamentoCartao } from '@/db/hooks/useCartoes'
import { addTransacao } from '@/db/hooks/useTransacoes'
import { addAnexo } from '@/db/hooks/useAnexos'
import { todayISO, mesAnoAtual } from '@/lib/format'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { IconX, IconCamera, IconCheck, IconRepeat, IconCreditCard, IconBuildingBank } from '@tabler/icons-react'

type TipoLanc = 'despesa' | 'receita' | 'transferencia'
type FontePag = 'conta' | 'cartao'
const METODOS = ['PIX','Débito','Dinheiro','TED/DOC','Boleto'] as const

export function FabModal({ onClose, defaultContaId }: { onClose: () => void; defaultContaId?: number | null }) {
  const [tipo, setTipo] = useState<TipoLanc>('despesa')
  const [valor, setValor] = useState('')
  const [desc, setDesc] = useState('')
  const [data, setData] = useState(todayISO())
  const [catId, setCatId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  // Fonte de pagamento
  const [fontePag, setFontePag] = useState<FontePag>('conta')
  const [contaId, setContaId] = useState<number | null>(defaultContaId ?? null)
  const [cartaoId, setCartaoId] = useState<number | null>(null)
  const [metodoPag, setMetodoPag] = useState<string>('PIX')
  const [parcelas, setParcelas] = useState(1)

  // Transferência
  const [contaDestinoId, setContaDestinoId] = useState<number | null>(null)

  // Recorrência
  const [recorrente, setRecorrente] = useState(false)

  // Status + Tags
  const [status, setStatus] = useState<'confirmado' | 'pendente'>('confirmado')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const addTag = (val: string) => {
    const t = val.trim().toLowerCase().replace(/[^a-záàâãéèêíóôõúç0-9_-]/gi, '')
    if (t && !tags.includes(t)) setTags(prev => [...prev, t])
    setTagInput('')
  }

  // Anexo
  const [preview, setPreview] = useState<{ url: string; file: File } | null>(null)
  const [showAttach, setShowAttach] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  const categorias = useCategorias(tipo === 'transferencia' ? 'despesa' : tipo)
  const contas = useContas()
  const cartoes = useCartoes()
  const { mes, ano } = mesAnoAtual()

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return
    setPreview({ url: f.type.startsWith('image/') ? URL.createObjectURL(f) : '', file: f })
    setShowAttach(false)
  }

  const isValid = () => {
    const num = parseFloat(valor.replace(',', '.'))
    if (!num) return false
    if (tipo === 'transferencia') return !!contaId && !!contaDestinoId && contaId !== contaDestinoId
    if (fontePag === 'conta') return !!contaId && !!catId
    if (fontePag === 'cartao') return !!cartaoId && !!catId
    return false
  }

  const handleSave = async () => {
    if (!isValid()) return
    setSaving(true)
    const num = parseFloat(valor.replace(',', '.'))

    if (tipo === 'transferencia' && contaId && contaDestinoId) {
      const id = await addTransacao({ data, valor: num, tipo: 'despesa', contaId, categoriaId: catId ?? 1, descricao: `Transferência → ${contas.find(c=>c.id===contaDestinoId)?.nome}`, status: 'confirmado', recorrencia: recorrente ? 'mensal' : 'unica' })
      await addTransacao({ data, valor: num, tipo: 'receita', contaId: contaDestinoId, categoriaId: catId ?? 1, descricao: `Transferência ← ${contas.find(c=>c.id===contaId)?.nome}`, status: 'confirmado', recorrencia: 'unica' })
    } else if (fontePag === 'cartao' && cartaoId) {
      await addLancamentoCartao({ cartaoId, descricao: desc || categorias.find(c=>c.id===catId)?.nome || '', valor: num, data, categoriaId: catId!, totalParcelas: parcelas, mes, ano })
    } else if (contaId) {
      const id = await addTransacao({ data, valor: num, tipo, contaId, categoriaId: catId!, descricao: desc || categorias.find(c=>c.id===catId)?.nome || '', status, tags: tags.length > 0 ? tags : undefined, recorrencia: recorrente ? 'mensal' : 'unica' })
      if (preview && id) await addAnexo(id as number, preview.file)
    }

    setSaving(false)
    onClose()
  }

  const corBotao = tipo === 'receita' ? '#3A8580' : tipo === 'transferencia' ? '#7C5CBF' : '#C4553B'

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(44,26,15,0.6)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 560, background: '#FFFDF9', borderRadius: '24px 24px 0 0', padding: '20px 20px 48px', maxHeight: '94dvh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700, color: '#2C1A0F' }}>Novo lançamento</h2>
          <button onClick={onClose} style={{ background: '#F5F0E8', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconX size={16} color="#9B7B6A" />
          </button>
        </div>

        {/* Tipo */}
        <div style={{ display: 'flex', background: '#F5F0E8', borderRadius: 14, padding: 4, marginBottom: 16, gap: 4 }}>
          {(['despesa','receita','transferencia'] as TipoLanc[]).map(t => (
            <button key={t} onClick={() => { setTipo(t); setCatId(null); if (t === 'transferencia') setFontePag('conta') }}
              style={{ flex: 1, padding: '10px 4px', borderRadius: 11, border: 'none', cursor: 'pointer', transition: 'all .15s', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700,
                background: tipo === t ? (t==='receita'?'#3A8580':t==='transferencia'?'#7C5CBF':'#C4553B') : 'transparent',
                color: tipo === t ? 'white' : '#9B7B6A' }}>
              {t === 'despesa' ? '− Despesa' : t === 'receita' ? '+ Receita' : '⇄ Transfer.'}
            </button>
          ))}
        </div>

        {/* Valor */}
        <div style={{ display: 'flex', alignItems: 'center', background: '#FAF6F0', border: `2px solid ${valor ? corBotao : '#E8E0D5'}`, borderRadius: 16, padding: '12px 16px', gap: 8, marginBottom: 12, transition: 'border-color .2s' }}>
          <span style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, color: corBotao, fontWeight: 700 }}>R$</span>
          <input value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" type="tel" autoFocus
            style={{ border: 'none', background: 'transparent', fontFamily: "'Fraunces',Georgia,serif", fontSize: 32, fontWeight: 700, color: '#2C1A0F', flex: 1, outline: 'none', width: '100%' }} />
        </div>

        {/* Descrição + câmera */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
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
              <div style={{ display: 'flex', gap: 8, background: '#FAF6F0', border: '1.5px dashed #E8E0D5', borderRadius: 14, padding: 10 }}>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => cameraRef.current?.click()}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 11, border: 'none', background: '#2C1A0F', color: 'white', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>📷 Câmera</motion.button>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => fileRef.current?.click()}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 11, border: '1.5px solid #E8E0D5', background: 'white', color: '#2C1A0F', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>📁 Arquivo / PDF</motion.button>
              </div>
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFile} />
              <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={handleFile} />
            </motion.div>
          )}
          {preview && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              style={{ background: '#EBF5F0', border: '1.5px solid #D0E8D8', borderRadius: 12, padding: '9px 12px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
              {preview.url ? <img src={preview.url} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} /> : <div style={{ width: 40, height: 40, background: '#3D7EB5', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>📄</div>}
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#3A8580', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{preview.file.name}</p>
              <button onClick={() => setPreview(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9B7B6A', fontSize: 16 }}>×</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Data */}
        <input value={data} onChange={e => setData(e.target.value)} type="date"
          style={{ width: '100%', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '11px 14px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, color: '#2C1A0F', outline: 'none', marginBottom: 14 }} />

        {/* Fonte de pagamento — só para despesa/receita */}
        {tipo !== 'transferencia' && (
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: '#9B7B6A', marginBottom: 8, letterSpacing: '.04em' }}>FORMA DE PAGAMENTO</p>
            <div style={{ display: 'flex', background: '#F5F0E8', borderRadius: 12, padding: 4, gap: 4, marginBottom: 10 }}>
              <button onClick={() => setFontePag('conta')}
                style={{ flex: 1, padding: '9px 0', borderRadius: 9, border: 'none', cursor: 'pointer', background: fontePag === 'conta' ? '#FFFDF9' : 'transparent', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700, color: fontePag === 'conta' ? '#2C1A0F' : '#9B7B6A', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, boxShadow: fontePag === 'conta' ? '0 1px 4px rgba(44,26,15,0.08)' : 'none', transition: 'all .15s' }}>
                <IconBuildingBank size={14} stroke={2} /> Conta / PIX
              </button>
              <button onClick={() => setFontePag('cartao')}
                style={{ flex: 1, padding: '9px 0', borderRadius: 9, border: 'none', cursor: 'pointer', background: fontePag === 'cartao' ? '#FFFDF9' : 'transparent', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700, color: fontePag === 'cartao' ? '#2C1A0F' : '#9B7B6A', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, boxShadow: fontePag === 'cartao' ? '0 1px 4px rgba(44,26,15,0.08)' : 'none', transition: 'all .15s' }}>
                <IconCreditCard size={14} stroke={2} /> Cartão de crédito
              </button>
            </div>

            {/* Conta */}
            {fontePag === 'conta' && (
              <>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 8 }}>
                  {contas.map(c => (
                    <button key={c.id} onClick={() => setContaId(c.id!)}
                      style={{ padding: '6px 12px', borderRadius: 20, border: contaId === c.id ? `2px solid ${c.cor}` : '1.5px solid #E8E0D5', cursor: 'pointer', background: contaId === c.id ? `${c.cor}18` : 'white', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, color: contaId === c.id ? c.cor : '#7A5C4F', transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.cor }} />{c.nome}
                    </button>
                  ))}
                </div>
                <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: '#9B7B6A', marginBottom: 6 }}>MÉTODO</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {METODOS.map(m => (
                    <button key={m} onClick={() => setMetodoPag(m)}
                      style={{ padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', background: metodoPag === m ? '#C4553B' : '#F5F0E8', color: metodoPag === m ? 'white' : '#7A5C4F', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, transition: 'all .15s' }}>
                      {m}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Cartão */}
            {fontePag === 'cartao' && (
              <>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 10 }}>
                  {cartoes.length === 0
                    ? <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#9B7B6A' }}>Nenhum cartão cadastrado</p>
                    : cartoes.map(c => (
                      <button key={c.id} onClick={() => setCartaoId(c.id!)}
                        style={{ padding: '6px 14px', borderRadius: 20, border: cartaoId === c.id ? `2px solid ${c.cor}` : '1.5px solid #E8E0D5', cursor: 'pointer', background: cartaoId === c.id ? c.cor : 'white', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700, color: cartaoId === c.id ? 'white' : '#7A5C4F', transition: 'all .15s' }}>
                        {c.nome}
                      </button>
                    ))
                  }
                </div>
                {/* Parcelamento */}
                <div style={{ background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '12px 14px' }}>
                  <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: '#9B7B6A', marginBottom: 8 }}>PARCELAMENTO</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button onClick={() => setParcelas(p => Math.max(1,p-1))}
                      style={{ width: 36, height: 36, borderRadius: 10, background: '#E8E0D5', border: 'none', cursor: 'pointer', fontSize: 20, fontWeight: 700, color: '#2C1A0F' }}>−</button>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 24, fontWeight: 700, color: '#2C1A0F' }}>{parcelas}x</p>
                      {parcelas > 1 && valor && (
                        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#9B7B6A', marginTop: 2 }}>
                          de R$ {(parseFloat(valor.replace(',','.')) / parcelas).toFixed(2).replace('.',',')} por mês
                        </p>
                      )}
                      {parcelas === 1 && <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#9B7B6A', marginTop: 2 }}>À vista</p>}
                    </div>
                    <button onClick={() => setParcelas(p => Math.min(48,p+1))}
                      style={{ width: 36, height: 36, borderRadius: 10, background: '#C4553B', border: 'none', cursor: 'pointer', fontSize: 20, fontWeight: 700, color: 'white' }}>+</button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Transferência — conta destino */}
        {tipo === 'transferencia' && (
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: '#9B7B6A', marginBottom: 8 }}>DE</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 10 }}>
              {contas.map(c => (
                <button key={c.id} onClick={() => setContaId(c.id!)}
                  style={{ padding: '6px 12px', borderRadius: 20, border: contaId === c.id ? `2px solid ${c.cor}` : '1.5px solid #E8E0D5', cursor: 'pointer', background: contaId === c.id ? `${c.cor}18` : 'white', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, color: contaId === c.id ? c.cor : '#7A5C4F', transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.cor }} />{c.nome}
                </button>
              ))}
            </div>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: '#9B7B6A', marginBottom: 8 }}>PARA</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {contas.filter(c => c.id !== contaId).map(c => (
                <button key={c.id} onClick={() => setContaDestinoId(c.id!)}
                  style={{ padding: '6px 12px', borderRadius: 20, border: contaDestinoId === c.id ? `2px solid ${c.cor}` : '1.5px solid #E8E0D5', cursor: 'pointer', background: contaDestinoId === c.id ? `${c.cor}18` : 'white', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, color: contaDestinoId === c.id ? c.cor : '#7A5C4F', transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.cor }} />{c.nome}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Categoria */}
        {tipo !== 'transferencia' && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: '#9B7B6A', marginBottom: 8, letterSpacing: '.04em' }}>CATEGORIA</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: 8 }}>
              {categorias.map(c => (
                <motion.button key={c.id} onClick={() => setCatId(c.id!)} whileTap={{ scale: 0.92 }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '10px 4px', borderRadius: 14, border: catId === c.id ? `2px solid ${c.cor}` : '1.5px solid #E8E0D5', background: catId === c.id ? `${c.cor}12` : 'white', cursor: 'pointer', transition: 'all .15s' }}>
                  <CategoryIcon nome={c.nome} cor={c.cor} size={38} radius={11} />
                  <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 600, color: catId === c.id ? c.cor : '#7A5C4F', textAlign: 'center', lineHeight: 1.2 }}>{c.nome}</span>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* Status (confirmado/pendente) */}
        {tipo !== 'transferencia' && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {(['confirmado', 'pendente'] as const).map(s => (
              <button key={s} onClick={() => setStatus(s)}
                style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: `1.5px solid ${status === s ? (s === 'confirmado' ? '#3A8580' : '#D4A017') : '#E8E0D5'}`, background: status === s ? (s === 'confirmado' ? '#EBF5F0' : '#FDF4E3') : 'white', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700, color: status === s ? (s === 'confirmado' ? '#3A8580' : '#D4A017') : '#9B7B6A', transition: 'all .15s' }}>
                {s === 'confirmado' ? '✓ Confirmado' : '⏳ Pendente'}
              </button>
            ))}
          </div>
        )}

        {/* Tags */}
        {tipo !== 'transferencia' && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: tags.length > 0 ? 6 : 0 }}>
              {tags.map(t => (
                <span key={t} onClick={() => setTags(ts => ts.filter(x => x !== t))}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: `${corBotao}18`, border: `1px solid ${corBotao}40`, borderRadius: 20, padding: '3px 10px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600, color: corBotao, cursor: 'pointer' }}>
                  #{t} ×
                </span>
              ))}
            </div>
            <input value={tagInput} onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput) } }}
              onBlur={() => { if (tagInput.trim()) addTag(tagInput) }}
              placeholder="# Adicionar tag (Enter)"
              style={{ width: '100%', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 12, padding: '9px 14px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#2C1A0F', outline: 'none', boxSizing: 'border-box' }} />
          </div>
        )}

        {/* Recorrente — só conta/despesa */}
        {tipo !== 'transferencia' && fontePag === 'conta' && (
          <motion.button onClick={() => setRecorrente(r => !r)} whileTap={{ scale: 0.98 }}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 14, border: `1.5px solid ${recorrente ? '#C4553B' : '#E8E0D5'}`, background: recorrente ? '#FAF0EE' : '#FAF6F0', cursor: 'pointer', marginBottom: 16, transition: 'all .15s' }}>
            <IconRepeat size={18} color={recorrente ? '#C4553B' : '#9B7B6A'} stroke={2} />
            <div style={{ flex: 1, textAlign: 'left' }}>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, color: recorrente ? '#C4553B' : '#2C1A0F' }}>Repetir todo mês</p>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#9B7B6A' }}>Salva como conta fixa recorrente</p>
            </div>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: recorrente ? '#C4553B' : '#E8E0D5', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .2s' }}>
              {recorrente && <IconCheck size={13} color="white" stroke={3} />}
            </div>
          </motion.button>
        )}

        {/* Botão salvar */}
        <motion.button onClick={handleSave} whileTap={{ scale: 0.97 }}
          disabled={!isValid() || saving}
          style={{ width: '100%', padding: '16px 0', borderRadius: 14, border: 'none', cursor: isValid() ? 'pointer' : 'default', background: isValid() ? corBotao : '#E8E0D5', color: isValid() ? 'white' : '#9B7B6A', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 16, fontWeight: 700, transition: 'all .2s' }}>
          {saving ? 'Salvando...' : tipo === 'transferencia' ? 'Realizar transferência' : fontePag === 'cartao' ? `Lançar no cartão${parcelas > 1 ? ` em ${parcelas}x` : ' à vista'}` : `Salvar ${tipo}`}
        </motion.button>
      </motion.div>
    </motion.div>
  )
}

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  IconX, IconCamera, IconCheck, IconRepeat, IconCreditCard,
  IconBuildingBank, IconArrowsExchange, IconFile, IconPaperclip,
  IconClock, IconTag, IconMinus, IconPlus,
} from '@tabler/icons-react'
import { useCategorias } from '@/db/hooks/useCategorias'
import { useContas } from '@/db/hooks/useContas'
import { useCartoes, addLancamentoCartao } from '@/db/hooks/useCartoes'
import { addTransacao } from '@/db/hooks/useTransacoes'
import { addAnexo } from '@/db/hooks/useAnexos'
import { todayISO, mesAnoAtual, fmt } from '@/lib/format'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { BankLogo } from '@/components/ui/BankLogo'
import { Modal } from '@/components/ui/Modal'
import { sounds, haptic } from '@/lib/sounds'

type TipoLanc = 'despesa' | 'receita' | 'transferencia'
type FontePag = 'conta' | 'cartao'

const METODOS = ['PIX', 'Débito', 'Dinheiro', 'TED/DOC', 'Boleto'] as const

const TIPO_META: Record<TipoLanc, { label: string; shortLabel: string; cor: string; sign: string }> = {
  despesa:       { label: 'Despesa',        shortLabel: '− Despesa',  cor: '#C4553B', sign: '−' },
  receita:       { label: 'Receita',        shortLabel: '+ Receita',  cor: '#3A8580', sign: '+' },
  transferencia: { label: 'Transferência',  shortLabel: '⇄ Transf.',  cor: '#7C5CBF', sign: '' },
}

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

  // Recorrência, status, tags
  const [recorrente, setRecorrente] = useState(false)
  const [status, setStatus] = useState<'confirmado' | 'pendente'>('confirmado')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')

  // Anexo
  const [preview, setPreview] = useState<{ url: string; file: File } | null>(null)
  const [showAttach, setShowAttach] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  const categorias = useCategorias(tipo === 'transferencia' ? 'despesa' : tipo)
  const contas = useContas()
  const cartoes = useCartoes()
  const { mes, ano } = mesAnoAtual()

  const tipoMeta = TIPO_META[tipo]
  const valorNum = parseFloat(valor.replace(',', '.')) || 0
  const catSelecionada = categorias.find(c => c.id === catId)

  const addTagAction = (val: string) => {
    const t = val.trim().toLowerCase().replace(/[^a-záàâãéèêíóôõúç0-9_-]/gi, '')
    if (t && !tags.includes(t)) setTags(prev => [...prev, t])
    setTagInput('')
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return
    setPreview({ url: f.type.startsWith('image/') ? URL.createObjectURL(f) : '', file: f })
    setShowAttach(false)
  }

  const isValid = () => {
    if (!valorNum) return false
    if (tipo === 'transferencia') return !!contaId && !!contaDestinoId && contaId !== contaDestinoId
    if (fontePag === 'conta') return !!contaId && !!catId
    if (fontePag === 'cartao') return !!cartaoId && !!catId
    return false
  }

  const handleSave = async () => {
    if (!isValid()) return
    setSaving(true)
    const num = valorNum

    try {
      if (tipo === 'transferencia' && contaId && contaDestinoId) {
        await addTransacao({
          data, valor: num, tipo: 'despesa', contaId, categoriaId: catId ?? 1,
          descricao: `Transferência → ${contas.find(c => c.id === contaDestinoId)?.nome}`,
          status: 'confirmado',
          recorrencia: recorrente ? 'mensal' : 'unica',
        })
        await addTransacao({
          data, valor: num, tipo: 'receita', contaId: contaDestinoId, categoriaId: catId ?? 1,
          descricao: `Transferência ← ${contas.find(c => c.id === contaId)?.nome}`,
          status: 'confirmado',
          recorrencia: 'unica',
        })
      } else if (fontePag === 'cartao' && cartaoId) {
        await addLancamentoCartao({
          cartaoId,
          descricao: desc || catSelecionada?.nome || '',
          valor: num, data, categoriaId: catId!, totalParcelas: parcelas, mes, ano,
        })
      } else if (contaId) {
        const id = await addTransacao({
          data, valor: num, tipo, contaId, categoriaId: catId!,
          descricao: desc || catSelecionada?.nome || '',
          status,
          tags: tags.length > 0 ? tags : undefined,
          recorrencia: recorrente ? 'mensal' : 'unica',
        })
        if (preview && id) await addAnexo(id as number, preview.file)
      }
      sounds.success()
      haptic('medium')
    } finally {
      setSaving(false)
      onClose()
    }
  }

  return (
    <Modal
      open={true}
      onClose={onClose}
      size="lg"
      title="Novo lançamento"
      subtitle="Registre uma despesa, receita ou transferência"
    >
      {/* Body single column */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ padding: '20px 26px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Tipo tabs com cor semântica */}
          <div style={{
            display: 'flex', background: '#FBF8F3',
            borderRadius: 12, padding: 4, gap: 4,
          }}>
            {(['despesa', 'receita', 'transferencia'] as TipoLanc[]).map(t => {
              const meta = TIPO_META[t]
              const active = tipo === t
              return (
                <button key={t}
                  onClick={() => {
                    setTipo(t); setCatId(null)
                    if (t === 'transferencia') setFontePag('conta')
                  }}
                  style={{
                    flex: 1, padding: '10px 4px', borderRadius: 9, border: 'none', cursor: 'pointer',
                    background: active ? meta.cor : 'transparent',
                    color: active ? '#FFFFFF' : '#7A5C4F',
                    fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700,
                    boxShadow: active ? `0 3px 12px ${meta.cor}40` : 'none',
                    transition: 'all .15s',
                  }}>
                  {meta.shortLabel}
                </button>
              )
            })}
          </div>

          {/* Valor hero */}
          <div style={{
            display: 'flex', alignItems: 'center',
            background: '#FBF8F3',
            border: `2px solid ${valorNum ? tipoMeta.cor : '#EDE6DC'}`,
            borderRadius: 14, padding: '12px 16px', gap: 8,
            transition: 'all .15s',
            boxShadow: valorNum ? `0 0 0 4px ${tipoMeta.cor}10` : 'none',
          }}>
            <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 22, color: tipoMeta.cor, fontWeight: 700 }}>R$</span>
            <input value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" type="tel" autoFocus inputMode="decimal"
              style={{
                border: 'none', background: 'transparent',
                fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 32, fontWeight: 700,
                color: '#2C1A0F', flex: 1, outline: 'none', width: '100%',
              }}/>
          </div>

          {/* Descrição + photo */}
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descrição (opcional)"
              style={{
                flex: 1, background: '#FBF8F3', border: '1.5px solid #EDE6DC',
                borderRadius: 10, padding: '11px 14px',
                fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#2C1A0F', outline: 'none',
              }}/>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowAttach(s => !s)} title="Anexar arquivo"
              style={{
                width: 44, height: 44, borderRadius: 10,
                border: preview ? '2px solid #3A8580' : '1.5px solid #EDE6DC',
                background: preview ? '#EBF5F0' : '#FBF8F3', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
              {preview ? <IconCheck size={18} color="#3A8580" /> : <IconCamera size={18} color="#7A5C4F" />}
            </motion.button>
          </div>

          <AnimatePresence>
            {showAttach && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                <div style={{ display: 'flex', gap: 8, background: '#FBF8F3', border: '1.5px dashed #EDE6DC', borderRadius: 10, padding: 8 }}>
                  <motion.button whileTap={{ scale: 0.95 }} onClick={() => cameraRef.current?.click()}
                    style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', background: '#2C1A0F', color: '#FFFFFF', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                    <IconCamera size={13} stroke={2}/> Câmera
                  </motion.button>
                  <motion.button whileTap={{ scale: 0.95 }} onClick={() => fileRef.current?.click()}
                    style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: '1.5px solid #EDE6DC', background: '#FFFFFF', color: '#2C1A0F', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                    <IconFile size={13} stroke={2}/> Arquivo
                  </motion.button>
                </div>
                <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFile} />
                <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={handleFile} />
              </motion.div>
            )}
            {preview && (
              <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                style={{ background: '#EBF5F0', border: '1.5px solid #D0E8D8', borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                {preview.url ? (
                  <img src={preview.url} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}/>
                ) : (
                  <div style={{ width: 36, height: 36, background: '#3D7EB5', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <IconPaperclip size={18} color="#FFFFFF" stroke={2}/>
                  </div>
                )}
                <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#3A8580', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{preview.file.name}</p>
                <button onClick={() => setPreview(null)} style={{ background: '#F5F0E8', border: 'none', cursor: 'pointer', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconX size={11} color="#7A5C4F"/>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Data */}
          <div>
            <FieldLabel>Data</FieldLabel>
            <input value={data} onChange={e => setData(e.target.value)} type="date"
              style={{
                width: '100%', boxSizing: 'border-box',
                background: '#FBF8F3', border: '1.5px solid #EDE6DC',
                borderRadius: 10, padding: '10px 14px',
                fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#2C1A0F', outline: 'none',
              }}/>
          </div>

          {/* Transferência ─ DE / PARA */}
          {tipo === 'transferencia' ? (
            <>
              <ContaSelector label="De (origem)" contas={contas} value={contaId} onChange={setContaId} accentCor="#7C5CBF" />
              <ContaSelector label="Para (destino)" contas={contas.filter(c => c.id !== contaId)} value={contaDestinoId} onChange={setContaDestinoId} accentCor="#7C5CBF" />
            </>
          ) : (
            <>
              {/* Forma de pagamento tabs */}
              <div>
                <FieldLabel>Forma de pagamento</FieldLabel>
                <div style={{ display: 'flex', background: '#FBF8F3', borderRadius: 10, padding: 3, gap: 3 }}>
                  <button onClick={() => setFontePag('conta')}
                    style={{
                      flex: 1, padding: '8px 0', borderRadius: 7, border: 'none', cursor: 'pointer',
                      background: fontePag === 'conta' ? '#FFFFFF' : 'transparent',
                      fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700,
                      color: fontePag === 'conta' ? '#2C1A0F' : '#9B7B6A',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                      boxShadow: fontePag === 'conta' ? '0 1px 4px rgba(44,26,15,0.08)' : 'none',
                      transition: 'all .15s',
                    }}>
                    <IconBuildingBank size={13} stroke={2}/> Conta / PIX
                  </button>
                  <button onClick={() => setFontePag('cartao')}
                    style={{
                      flex: 1, padding: '8px 0', borderRadius: 7, border: 'none', cursor: 'pointer',
                      background: fontePag === 'cartao' ? '#FFFFFF' : 'transparent',
                      fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700,
                      color: fontePag === 'cartao' ? '#2C1A0F' : '#9B7B6A',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                      boxShadow: fontePag === 'cartao' ? '0 1px 4px rgba(44,26,15,0.08)' : 'none',
                      transition: 'all .15s',
                    }}>
                    <IconCreditCard size={13} stroke={2}/> Cartão de crédito
                  </button>
                </div>
              </div>

              {fontePag === 'conta' && (
                <>
                  <ContaSelector label="Conta" contas={contas} value={contaId} onChange={setContaId} accentCor={tipoMeta.cor} />
                  {/* Método */}
                  <div>
                    <FieldLabel>Método</FieldLabel>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {METODOS.map(m => {
                        const active = metodoPag === m
                        return (
                          <button key={m} onClick={() => setMetodoPag(m)}
                            style={{
                              padding: '6px 12px', borderRadius: 20,
                              border: `1px solid ${active ? tipoMeta.cor : '#EDE6DC'}`,
                              background: active ? tipoMeta.cor : '#FFFFFF',
                              color: active ? '#FFFFFF' : '#7A5C4F',
                              cursor: 'pointer',
                              fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700,
                              transition: 'all .15s',
                            }}>
                            {m}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}

              {fontePag === 'cartao' && (
                <>
                  <div>
                    <FieldLabel>Cartão</FieldLabel>
                    {cartoes.length === 0 ? (
                      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#9B7B6A', margin: '4px 0 0' }}>
                        Nenhum cartão cadastrado
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {cartoes.map(c => {
                          const active = cartaoId === c.id
                          return (
                            <button key={c.id} onClick={() => setCartaoId(c.id!)}
                              style={{
                                padding: '5px 12px 5px 5px', borderRadius: 22,
                                border: `1.5px solid ${active ? c.cor : '#EDE6DC'}`,
                                background: active ? c.cor : '#FFFFFF',
                                color: active ? '#FFFFFF' : '#2C1A0F',
                                cursor: 'pointer',
                                fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700,
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                transition: 'all .15s',
                              }}>
                              <BankLogo logo={c.logo} nome={c.nome} cor={c.cor} size={22} radiusRatio={0.28} />
                              {c.nome}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                  {/* Parcelamento */}
                  <div>
                    <FieldLabel>Parcelamento</FieldLabel>
                    <div style={{
                      background: '#FBF8F3', border: '1.5px solid #EDE6DC',
                      borderRadius: 12, padding: '10px 14px',
                      display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                      <button onClick={() => setParcelas(p => Math.max(1, p - 1))}
                        style={{ width: 32, height: 32, borderRadius: 8, background: '#FFFFFF', border: '1px solid #EDE6DC', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <IconMinus size={14} stroke={2.2} color="#7A5C4F"/>
                      </button>
                      <div style={{ flex: 1, textAlign: 'center' }}>
                        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 22, fontWeight: 700, color: '#2C1A0F', margin: 0, letterSpacing: '-0.3px' }}>{parcelas}×</p>
                        {parcelas > 1 && valorNum > 0 && (
                          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#9B7B6A', margin: '2px 0 0' }}>
                            {fmt(valorNum / parcelas)} por mês
                          </p>
                        )}
                        {parcelas === 1 && (
                          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#9B7B6A', margin: '2px 0 0' }}>À vista</p>
                        )}
                      </div>
                      <button onClick={() => setParcelas(p => Math.min(48, p + 1))}
                        style={{ width: 32, height: 32, borderRadius: 8, background: tipoMeta.cor, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 2px 8px ${tipoMeta.cor}40` }}>
                        <IconPlus size={14} stroke={2.4} color="#FFFFFF"/>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* Categoria — não pra transferência */}
          {tipo !== 'transferencia' && (
            <div>
              <FieldLabel>Categoria</FieldLabel>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(94px, 1fr))', gap: 8 }}>
                {categorias.map(c => {
                  const active = catId === c.id
                  return (
                    <button key={c.id} onClick={() => setCatId(c.id!)}
                      style={{
                        background: active ? `${c.cor}18` : '#FBF8F3',
                        border: `1.5px solid ${active ? c.cor : '#EDE6DC'}`,
                        borderRadius: 12, padding: '10px 6px', cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        transition: 'all .15s',
                      }}>
                      <CategoryIcon nome={c.nome} cor={c.cor} size={30} radius={9} />
                      <span style={{
                        fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700,
                        color: active ? c.cor : '#2C1A0F', textAlign: 'center',
                      }}>{c.nome}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Status + tags + recorrente — só pra conta */}
          {tipo !== 'transferencia' && fontePag === 'conta' && (
            <>
              {/* Status */}
              <div>
                <FieldLabel>Status</FieldLabel>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setStatus('confirmado')}
                    style={{
                      background: status === 'confirmado' ? 'rgba(58,133,128,0.14)' : 'transparent',
                      color: status === 'confirmado' ? '#1E7D5A' : '#9B7B6A',
                      border: `1.5px solid ${status === 'confirmado' ? '#3A8580' : '#EDE6DC'}`,
                      borderRadius: 22, padding: '6px 12px', cursor: 'pointer',
                      fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700,
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                    }}>
                    <IconCheck size={12} stroke={2.4}/> Confirmado
                  </button>
                  <button onClick={() => setStatus('pendente')}
                    style={{
                      background: status === 'pendente' ? 'rgba(212,160,23,0.14)' : 'transparent',
                      color: status === 'pendente' ? '#A8730F' : '#9B7B6A',
                      border: `1.5px solid ${status === 'pendente' ? '#D4A017' : '#EDE6DC'}`,
                      borderRadius: 22, padding: '6px 12px', cursor: 'pointer',
                      fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700,
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                    }}>
                    <IconClock size={12} stroke={2.2}/> Pendente
                  </button>
                </div>
              </div>

              {/* Tags */}
              <div>
                <FieldLabel>Tags</FieldLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {tags.map(t => (
                    <span key={t} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      background: '#FBF8F3', border: '1px solid #EDE6DC', borderRadius: 20,
                      padding: '4px 10px',
                      fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600,
                      color: '#7A5C4F',
                    }}>
                      <IconTag size={11} stroke={2}/>{t}
                      <button onClick={() => setTags(tags.filter(x => x !== t))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#9B7B6A', display: 'flex' }}>
                        <IconX size={11} stroke={2.4}/>
                      </button>
                    </span>
                  ))}
                  <input
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTagAction(tagInput) } }}
                    placeholder="+ tag (Enter)"
                    style={{
                      background: 'transparent', border: '1px dashed #D4C8BC',
                      borderRadius: 20, padding: '4px 10px',
                      fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600,
                      color: '#7A5C4F', outline: 'none', width: 110,
                    }}
                  />
                </div>
              </div>
            </>
          )}

          {/* Repetir mensal */}
          {tipo !== 'transferencia' && (
            <button onClick={() => setRecorrente(r => !r)}
              style={{
                background: recorrente ? `${tipoMeta.cor}14` : '#FBF8F3',
                border: `1.5px solid ${recorrente ? tipoMeta.cor : '#EDE6DC'}`,
                borderRadius: 12, padding: '10px 14px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
              }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: recorrente ? tipoMeta.cor : 'rgba(122,92,79,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <IconRepeat size={16} stroke={2} color={recorrente ? '#FFFFFF' : '#7A5C4F'} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, color: '#2C1A0F', margin: 0 }}>
                  Repetir todo mês
                </p>
                <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#9B7B6A', margin: '2px 0 0' }}>
                  {recorrente ? 'Salva como conta fixa recorrente' : 'Lançamento único'}
                </p>
              </div>
              <div style={{
                width: 38, height: 22, borderRadius: 11,
                background: recorrente ? tipoMeta.cor : '#EDE6DC',
                position: 'relative', transition: 'background .15s',
              }}>
                <motion.div
                  animate={{ x: recorrente ? 18 : 2 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  style={{ position: 'absolute', top: 2, width: 18, height: 18, borderRadius: '50%', background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
                />
              </div>
            </button>
          )}
          {/* Nota explicativa do que vai acontecer */}
          <div style={{
            background: '#FBF8F3', border: '1px solid #EDE6DC',
            borderRadius: 12, padding: '10px 14px', marginTop: 4,
          }}>
            <p style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#7A5C4F',
              margin: 0, lineHeight: 1.5,
            }}>
              {tipo === 'transferencia'
                ? 'Cria 2 transações: uma saída na conta origem e uma entrada na conta destino.'
                : fontePag === 'cartao'
                  ? `Será adicionado à fatura do cartão${parcelas > 1 ? ` em ${parcelas} parcelas` : ''}.`
                  : recorrente
                    ? 'Será criada uma conta fixa que se repete todo mês.'
                    : 'Lançamento único que afeta o saldo da conta selecionada.'}
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Modal.Footer>
        <button onClick={onClose}
          style={{ background: 'transparent', color: '#7A5C4F', border: '1.5px solid #EDE6DC', borderRadius: 12, padding: '11px 20px', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700 }}>
          Cancelar
        </button>
        <button onClick={handleSave}
          disabled={!isValid() || saving}
          style={{
            background: isValid() ? `linear-gradient(135deg, ${tipoMeta.cor}DD, ${tipoMeta.cor})` : '#E0D5C8',
            color: '#FFFFFF', border: 'none', borderRadius: 12,
            padding: '11px 22px',
            cursor: isValid() && !saving ? 'pointer' : 'not-allowed',
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', gap: 7,
            boxShadow: isValid() ? `0 4px 16px ${tipoMeta.cor}44` : 'none',
            opacity: isValid() && !saving ? 1 : 0.7,
          }}>
          <IconCheck size={16} stroke={2.5} />
          {tipo === 'transferencia' ? 'Realizar transferência' : tipo === 'receita' ? 'Salvar receita' : 'Salvar despesa'}
        </button>
      </Modal.Footer>
    </Modal>
  )
}

// ─── Subcomponents ─────────────────────────────────────────────────
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700,
      color: '#7A5C4F', letterSpacing: '.12em', textTransform: 'uppercase',
      display: 'block', marginBottom: 8,
    }}>{children}</span>
  )
}

function ContaSelector({ label, contas, value, onChange, accentCor }: {
  label: string
  contas: { id?: number; nome: string; cor: string; logo?: string }[]
  value: number | null
  onChange: (v: number) => void
  accentCor: string
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {contas.length === 0 ? (
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#9B7B6A', margin: 0 }}>
            Nenhuma conta cadastrada
          </p>
        ) : (
          contas.map(c => {
            const active = c.id === value
            return (
              <button key={c.id} onClick={() => onChange(c.id!)}
                style={{
                  padding: '5px 12px 5px 5px', borderRadius: 22,
                  border: `1.5px solid ${active ? c.cor : '#EDE6DC'}`,
                  background: active ? c.cor : '#FFFFFF',
                  color: active ? '#FFFFFF' : '#2C1A0F',
                  cursor: 'pointer',
                  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700,
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  transition: 'all .15s',
                }}>
                <BankLogo logo={c.logo} nome={c.nome} cor={c.cor} size={22} radiusRatio={0.28} />
                {c.nome}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}


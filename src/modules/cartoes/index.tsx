import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCartoes, addCartao, editCartao, deleteCartao, useTotalFatura, useLancamentosCartao, addLancamentoCartao } from '@/db/hooks/useCartoes'
import { useCategorias } from '@/db/hooks/useCategorias'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { fmt, mesAnoAtual } from '@/lib/format'
import { Dobrao } from '@/components/mascot/Dobrao'
import { db } from '@/db/schema'
import { IconPlus, IconX, IconTrash, IconEdit, IconChevronLeft, IconChevronRight, IconCreditCard } from '@tabler/icons-react'

const BANDEIRAS = ['Visa', 'Mastercard', 'Elo', 'Hipercard', 'Amex']
const CORES = ['#820AD1', '#EC7000', '#1E7D5A', '#3D7EB5', '#C4553B', '#D94F8A', '#2C1A0F', '#0047FF', '#006B3C', '#7C5CBF']

function lightenHex(hex: string, pct: number) {
  if (!hex || hex.length < 7) return hex
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16)
  return `#${Math.min(255, Math.round(r + (255 - r) * pct / 100)).toString(16).padStart(2, '0')}${Math.min(255, Math.round(g + (255 - g) * pct / 100)).toString(16).padStart(2, '0')}${Math.min(255, Math.round(b + (255 - b) * pct / 100)).toString(16).padStart(2, '0')}`
}
function darkenHex(hex: string, pct: number) {
  if (!hex || hex.length < 7) return hex
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16)
  return `#${Math.max(0, Math.round(r * (1 - pct / 100))).toString(16).padStart(2, '0')}${Math.max(0, Math.round(g * (1 - pct / 100))).toString(16).padStart(2, '0')}${Math.max(0, Math.round(b * (1 - pct / 100))).toString(16).padStart(2, '0')}`
}
function isLightColor(hex: string) {
  if (!hex || hex.length < 7) return false
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) > 170
}

const DISPLAY: React.CSSProperties = { fontFamily: "'Fraunces',Georgia,serif", fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1.1 }
const LABEL: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '.09em', textTransform: 'uppercase', color: '#9B7B6A' }
const BODY: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans',sans-serif" }
const BTN_PRIMARY = { background: '#C4553B', color: 'white', border: 'none', borderRadius: 12, padding: '10px 20px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(196,85,59,0.3)', display: 'flex', alignItems: 'center', gap: 6 } as const

function LancRow({ lanc, isLast }: { lanc: any; isLast: boolean }) {
  const [cat, setCat] = useState<any>(null)
  useEffect(() => { db.categorias.get(lanc.categoriaId).then(setCat) }, [lanc.categoriaId])
  return (
    <div style={{ borderBottom: isLast ? 'none' : '1px solid #F5F0E8', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
      {cat ? <CategoryIcon nome={cat.nome} cor={cat.cor} size={40} radius={12} /> : <div style={{ width: 40, height: 40, borderRadius: 12, background: '#F5F0E8' }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 600, color: '#2C1A0F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lanc.descricao}</p>
        <div style={{ display: 'flex', gap: 5, marginTop: 3, alignItems: 'center' }}>
          {cat && <span style={{ fontSize: 10, background: `${cat.cor}18`, color: cat.cor, padding: '2px 8px', borderRadius: 20, fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 600 }}>{cat.nome}</span>}
          {lanc.totalParcelas > 1 && <span style={{ fontSize: 10, background: '#FAF0EE', color: '#C4553B', padding: '2px 7px', borderRadius: 20, fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 600 }}>{lanc.parcelaAtual}/{lanc.totalParcelas}x</span>}
        </div>
      </div>
      <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 14, fontWeight: 700, color: '#C4553B', flexShrink: 0 }}>{fmt(lanc.valor)}</p>
    </div>
  )
}

type CatStat = { id: number; nome: string; cor: string; valor: number; icone: string }

function useCatsFatura(lancamentos: any[]): CatStat[] {
  const [cats, setCats] = useState<CatStat[]>([])
  useEffect(() => {
    if (lancamentos.length === 0) { setCats([]); return }
    Promise.all(lancamentos.map(l => db.categorias.get(l.categoriaId))).then(categories => {
      const map = new Map<number, CatStat>()
      lancamentos.forEach((l, i) => {
        const cat = categories[i]
        if (!cat || cat.id == null) return
        const existing = map.get(cat.id) ?? { id: cat.id, nome: cat.nome, cor: cat.cor, valor: 0, icone: cat.icone ?? '' }
        map.set(cat.id, { ...existing, valor: existing.valor + l.valor })
      })
      setCats(Array.from(map.values()).sort((a, b) => b.valor - a.valor))
    })
  }, [lancamentos])
  return cats
}

function FaturaSheet({ cartao, onClose }: { cartao: any; onClose: () => void }) {
  const { mes, ano } = mesAnoAtual()
  const [viewMes, setViewMes] = useState(mes)
  const [viewAno, setViewAno] = useState(ano)
  const lancamentos = useLancamentosCartao(cartao.id, viewMes, viewAno)
  const total = lancamentos.reduce((s, l) => s + l.valor, 0)
  const [addingLanc, setAddingLanc] = useState(false)
  const [faturaTab, setFaturaTab] = useState<'lancamentos' | 'categorias' | 'resumo'>('lancamentos')
  const prevMes = () => { if (viewMes === 1) { setViewMes(12); setViewAno(a => a - 1) } else setViewMes(m => m - 1) }
  const nextMes = () => { if (viewMes === 12) { setViewMes(1); setViewAno(a => a + 1) } else setViewMes(m => m + 1) }
  const mesNome = new Date(viewAno, viewMes - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const isFutura = viewAno > ano || (viewAno === ano && viewMes > mes)
  const isAtual = viewMes === mes && viewAno === ano
  const light = isLightColor(cartao.cor)
  const txt = light ? 'rgba(30,15,0,0.9)' : 'white'
  const subTxt = light ? 'rgba(30,15,0,0.5)' : 'rgba(255,255,255,0.55)'
  const disponivel = cartao.limite - total
  const pct = Math.min(100, (total / Math.max(cartao.limite, 1)) * 100)

  // Categories tab data
  const cats = useCatsFatura(lancamentos)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(20,8,0,0.55)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={onClose}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 560, background: '#FFFFFF', borderRadius: '28px 28px 0 0', maxHeight: '90dvh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* Handle */}
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.35)', margin: '12px auto 0', position: 'relative', zIndex: 1, flexShrink: 0 }} />

        {/* Card header — clean gradient, no blobs */}
        <div style={{ background: `linear-gradient(135deg, ${lightenHex(cartao.cor, 12)} 0%, ${cartao.cor} 60%, ${darkenHex(cartao.cor, 20)} 100%)`, padding: '14px 22px 20px', flexShrink: 0 }}>
          {/* Row 1: bandeira + actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p style={{ ...LABEL, color: subTxt }}>{cartao.bandeira}</p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <motion.button onClick={() => setAddingLanc(true)} whileTap={{ scale: 0.95 }}
                style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.28)', color: txt, borderRadius: 11, padding: '8px 14px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                + Lançar
              </motion.button>
              <button onClick={onClose}
                style={{ background: light ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 9, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconX size={15} color={txt} />
              </button>
            </div>
          </div>

          {/* Row 2: card name */}
          <h3 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 24, fontWeight: 700, color: txt, lineHeight: 1, marginBottom: 14 }}>{cartao.nome}</h3>

          {/* Row 3: fatura atual + disponível */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', marginBottom: 12 }}>
            <div>
              <p style={{ ...LABEL, color: subTxt, marginBottom: 3 }}>FATURA ATUAL</p>
              <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 26, fontWeight: 700, color: txt, letterSpacing: '-1px', lineHeight: 1 }}>{fmt(total)}</p>
            </div>
            <div>
              <p style={{ ...LABEL, color: subTxt, marginBottom: 3 }}>DISPONÍVEL</p>
              <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 26, fontWeight: 700, color: disponivel < 0 ? '#FFB347' : txt, letterSpacing: '-0.5px', lineHeight: 1 }}>{fmt(Math.max(0, disponivel))}</p>
            </div>
          </div>

          {/* Row 4: progress bar */}
          <div style={{ background: light ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)', borderRadius: 4, height: 4, overflow: 'hidden' }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ type: 'spring', stiffness: 200, damping: 25 }}
              style={{ height: '100%', background: pct > 80 ? '#FFB347' : (light ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.85)'), borderRadius: 4 }} />
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', background: '#F5F0E8', borderRadius: 12, padding: 3, margin: '14px 22px 0', gap: 3, flexShrink: 0 }}>
          {([['lancamentos', 'Lançamentos'], ['categorias', 'Categorias'], ['resumo', 'Resumo']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setFaturaTab(id)}
              style={{ flex: 1, padding: '8px 0', borderRadius: 9, border: 'none', cursor: 'pointer',
                background: faturaTab === id ? '#FFFFFF' : 'transparent',
                color: faturaTab === id ? '#2C1A0F' : '#9B7B6A',
                fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: faturaTab === id ? 700 : 500,
                boxShadow: faturaTab === id ? '0 1px 4px rgba(44,26,15,0.1)' : 'none', transition: 'all .15s' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ overflowY: 'auto', flex: 1, paddingBottom: 48 }}>

          {/* ── LANÇAMENTOS ── */}
          {faturaTab === 'lancamentos' && (
            <>
              {/* Month navigator */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 22px', borderBottom: '1px solid #EDE6DC' }}>
                <button onClick={prevMes}
                  style={{ background: '#F5F0E8', border: 'none', borderRadius: 9, width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconChevronLeft size={16} color="#7A5C4F" stroke={2} />
                </button>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', marginBottom: 4 }}>
                    <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#9B7B6A', textTransform: 'capitalize' }}>{mesNome}</p>
                    {isFutura && <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 700, background: '#FDF4E3', color: '#D4A017', padding: '2px 7px', borderRadius: 10, border: '1px solid #F0D8A8' }}>PROJEÇÃO</span>}
                    {isAtual && <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 700, background: '#EBF5F0', color: '#3A8580', padding: '2px 7px', borderRadius: 10, border: '1px solid #C0DED9' }}>ATUAL</span>}
                  </div>
                  <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700, color: '#2C1A0F', letterSpacing: '-0.5px' }}>{fmt(total)}</p>
                </div>
                <button onClick={nextMes}
                  style={{ background: '#F5F0E8', border: 'none', borderRadius: 9, width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconChevronRight size={16} color="#7A5C4F" stroke={2} />
                </button>
              </div>

              <div style={{ padding: '12px 22px 0' }}>
                {lancamentos.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 0' }}>
                    <IconCreditCard size={40} color="#E8E0D5" stroke={1.2} />
                    <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 16, fontWeight: 600, color: '#C4B4A8', marginTop: 10 }}>Fatura vazia neste mês</p>
                    <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#C4B4A8', marginTop: 4 }}>Toque em + Lançar para adicionar</p>
                  </div>
                ) : (
                  <div style={{ background: '#FFFFFF', border: '1px solid #EDE6DC', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(44,26,15,0.05)' }}>
                    {lancamentos.map((l, i) => <LancRow key={l.id} lanc={l} isLast={i === lancamentos.length - 1} />)}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── CATEGORIAS ── */}
          {faturaTab === 'categorias' && (
            <div style={{ padding: '16px 22px 0' }}>
              {cats.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 16, fontWeight: 600, color: '#C4B4A8', marginTop: 10 }}>Nenhum lançamento neste mês</p>
                </div>
              ) : (
                <div style={{ background: '#FFFFFF', border: '1px solid #EDE6DC', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(44,26,15,0.05)', padding: '16px' }}>
                  <p style={{ ...LABEL, marginBottom: 14 }}>Por categoria</p>
                  {cats.map(cat => {
                    const pctCat = total > 0 ? (cat.valor / total) * 100 : 0
                    return (
                      <div key={cat.id} style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <CategoryIcon nome={cat.nome} cor={cat.cor} size={32} radius={9} />
                            <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 600, color: '#2C1A0F' }}>{cat.nome}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                            <span style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 14, fontWeight: 700, color: '#2C1A0F' }}>{fmt(cat.valor)}</span>
                            <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: '#9B7B6A' }}>{pctCat.toFixed(0)}%</span>
                          </div>
                        </div>
                        <div style={{ background: '#F5F0E8', borderRadius: 4, height: 5, overflow: 'hidden' }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pctCat}%` }}
                            transition={{ type: 'spring', stiffness: 180, damping: 24 }}
                            style={{ height: '100%', background: cat.cor, borderRadius: 4 }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── RESUMO ── */}
          {faturaTab === 'resumo' && (
            <div style={{ padding: '16px 22px 0' }}>
              {/* Ring + stats */}
              <div style={{ background: '#FFFFFF', border: '1px solid #EDE6DC', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(44,26,15,0.05)', padding: '20px 16px' }}>
                <p style={{ ...LABEL, marginBottom: 16 }}>Uso do limite</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 28 }}>
                  <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
                    <svg width="120" height="120" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="50" fill="none" stroke="#F5F0E8" strokeWidth="10" />
                      <motion.circle cx="60" cy="60" r="50" fill="none"
                        stroke={pct > 80 ? '#C4553B' : pct > 60 ? '#D4A017' : cartao.cor}
                        strokeWidth="10" strokeLinecap="round"
                        initial={{ strokeDasharray: `0 ${2 * Math.PI * 50}` }}
                        animate={{ strokeDasharray: `${pct / 100 * 2 * Math.PI * 50} ${2 * Math.PI * 50}` }}
                        transition={{ type: 'spring', stiffness: 120, damping: 22 }}
                        transform="rotate(-90 60 60)" />
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: '#2C1A0F' }}>{pct.toFixed(0)}%</p>
                      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, color: '#9B7B6A', fontWeight: 600 }}>USADO</p>
                    </div>
                  </div>
                  <div>
                    <div style={{ marginBottom: 14 }}>
                      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: '#9B7B6A', letterSpacing: '.06em', marginBottom: 2 }}>FATURA</p>
                      <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: '#2C1A0F' }}>{fmt(total)}</p>
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: '#9B7B6A', letterSpacing: '.06em', marginBottom: 2 }}>DISPONÍVEL</p>
                      <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: '#3A8580' }}>{fmt(Math.max(0, disponivel))}</p>
                    </div>
                    <div>
                      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: '#9B7B6A', letterSpacing: '.06em', marginBottom: 2 }}>LIMITE TOTAL</p>
                      <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: '#2C1A0F' }}>{fmt(cartao.limite)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Datas */}
              <div style={{ background: '#FFFFFF', border: '1px solid #EDE6DC', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(44,26,15,0.05)', padding: '16px', marginTop: 12 }}>
                <p style={{ ...LABEL, marginBottom: 14 }}>Datas do cartão</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ background: '#F9F5F0', borderRadius: 12, padding: '12px 14px' }}>
                    <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: '#9B7B6A', letterSpacing: '.06em', marginBottom: 4 }}>FECHAMENTO</p>
                    <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700, color: '#2C1A0F' }}>dia {cartao.diaFechamento}</p>
                  </div>
                  <div style={{ background: '#F9F5F0', borderRadius: 12, padding: '12px 14px' }}>
                    <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: '#9B7B6A', letterSpacing: '.06em', marginBottom: 4 }}>VENCIMENTO</p>
                    <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700, color: '#2C1A0F' }}>dia {cartao.diaVencimento}</p>
                  </div>
                </div>
                {total > 0 && (
                  <div style={{ marginTop: 12, background: '#F0F7F6', border: '1px solid #C0DED9', borderRadius: 10, padding: '10px 14px' }}>
                    <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#3A8580', fontWeight: 600, lineHeight: 1.4 }}>
                      Pague no vencimento (dia {cartao.diaVencimento}) para evitar juros rotativos.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {addingLanc && <AddLancForm cartaoId={cartao.id} mes={viewMes} ano={viewAno} onClose={() => setAddingLanc(false)} />}
      </motion.div>
    </motion.div>
  )
}

function AddLancForm({ cartaoId, mes, ano, onClose }: { cartaoId: number; mes: number; ano: number; onClose: () => void }) {
  const [desc, setDesc] = useState('')
  const [valor, setValor] = useState('')
  const [catId, setCatId] = useState<number | null>(null)
  const [parcelas, setParcelas] = useState(1)
  const categorias = useCategorias('despesa')

  const handleSave = async () => {
    if (!desc || !valor || !catId) return
    await addLancamentoCartao({ cartaoId, descricao: desc, valor: parseFloat(valor.replace(',', '.')), data: new Date().toISOString().split('T')[0], categoriaId: catId, totalParcelas: parcelas, mes, ano })
    onClose()
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(20,8,0,0.6)', zIndex: 400, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={onClose}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 560, background: '#FFFFFF', borderRadius: '28px 28px 0 0', padding: '8px 22px 48px', maxHeight: '90dvh', overflowY: 'auto' }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: '#E8E0D5', margin: '12px auto 20px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h3 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700, color: '#2C1A0F' }}>Lançamento no cartão</h3>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#9B7B6A', marginTop: 3 }}>Nova despesa na fatura</p>
          </div>
          <button onClick={onClose} style={{ background: '#F5F0E8', border: 'none', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconX size={16} color="#9B7B6A" />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', background: '#FAF6F0', border: `2px solid ${valor ? '#C4553B' : '#E8E0D5'}`, borderRadius: 15, padding: '12px 16px', gap: 8, marginBottom: 12, transition: 'border-color .2s' }}>
          <span style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, color: '#C4553B', fontWeight: 700 }}>R$</span>
          <input value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" type="tel" autoFocus
            style={{ border: 'none', background: 'transparent', fontFamily: "'Fraunces',Georgia,serif", fontSize: 30, fontWeight: 700, color: '#2C1A0F', flex: 1, outline: 'none' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#F5F0E8', borderRadius: 10, padding: '4px 6px' }}>
            <button onClick={() => setParcelas(p => Math.max(1, p - 1))} style={{ background: 'white', border: 'none', borderRadius: 7, width: 26, height: 26, cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#2C1A0F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
            <span style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 14, fontWeight: 700, color: '#2C1A0F', minWidth: 28, textAlign: 'center' }}>{parcelas}x</span>
            <button onClick={() => setParcelas(p => Math.min(48, p + 1))} style={{ background: '#C4553B', border: 'none', borderRadius: 7, width: 26, height: 26, cursor: 'pointer', fontSize: 16, fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
          </div>
        </div>

        <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descrição"
          style={{ width: '100%', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 13, padding: '12px 15px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, color: '#2C1A0F', outline: 'none', marginBottom: 18, boxSizing: 'border-box' }} />

        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: '#9B7B6A', marginBottom: 10, letterSpacing: '.07em' }}>CATEGORIA</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', gap: 8, marginBottom: 22 }}>
          {categorias.map(c => (
            <motion.button key={c.id} onClick={() => setCatId(c.id!)} whileTap={{ scale: 0.92 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '10px 4px', borderRadius: 14, border: catId === c.id ? `2px solid ${c.cor}` : '1.5px solid #EDE6DC', background: catId === c.id ? `${c.cor}12` : 'white', cursor: 'pointer', transition: 'all .15s', boxShadow: catId === c.id ? `0 2px 8px ${c.cor}30` : 'none' }}>
              <CategoryIcon nome={c.nome} cor={c.cor} size={38} radius={11} />
              <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 600, color: catId === c.id ? c.cor : '#7A5C4F', textAlign: 'center', lineHeight: 1.2 }}>{c.nome}</span>
            </motion.button>
          ))}
        </div>

        <motion.button onClick={handleSave} whileTap={{ scale: 0.97 }} disabled={!desc || !valor || !catId}
          style={{ width: '100%', padding: '15px 0', borderRadius: 15, border: 'none', cursor: desc && valor && catId ? 'pointer' : 'default', background: desc && valor && catId ? '#C4553B' : '#E8E0D5', color: desc && valor && catId ? 'white' : '#9B7B6A', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, fontWeight: 700, transition: 'all .2s', boxShadow: desc && valor && catId ? '0 4px 16px rgba(196,85,59,0.35)' : 'none' }}>
          {parcelas > 1 ? `Parcelar em ${parcelas}x de ${valor ? fmt(parseFloat(valor.replace(',', '.')) / parcelas) : 'R$ 0'}` : 'Lançar na fatura'}
        </motion.button>
      </motion.div>
    </motion.div>
  )
}

function CartaoCard({ cartao, mes, ano, onClick, onEdit, onDelete }: { cartao: any; mes: number; ano: number; onClick: () => void; onEdit: () => void; onDelete: () => void }) {
  const total = useTotalFatura(cartao.id, mes, ano)
  const disponivel = cartao.limite - total
  const pct = Math.min(100, (total / Math.max(cartao.limite, 1)) * 100)
  const light = isLightColor(cartao.cor)
  const txt = light ? 'rgba(30,15,0,0.9)' : 'white'
  const subTxt = light ? 'rgba(30,15,0,0.48)' : 'rgba(255,255,255,0.52)'
  const btnBg = light ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.16)'

  return (
    <motion.div
      whileHover={{ y: -5, boxShadow: `0 16px 44px ${cartao.cor}40, 0 4px 12px rgba(0,0,0,0.08)` }}
      transition={{ type: 'spring', stiffness: 280, damping: 26 }}
      style={{
        background: `linear-gradient(135deg, ${lightenHex(cartao.cor, 12)} 0%, ${cartao.cor} 55%, ${darkenHex(cartao.cor, 22)} 100%)`,
        borderRadius: 22,
        padding: '20px 22px 18px',
        cursor: 'default',
        minHeight: 200,
        boxShadow: `0 6px 24px ${cartao.cor}30, 0 2px 8px rgba(0,0,0,0.05)`,
      }}>

      {/* Bandeira + actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <p style={{ ...LABEL, color: subTxt }}>{cartao.bandeira}</p>
        <div style={{ display: 'flex', gap: 5 }}>
          <button onClick={e => { e.stopPropagation(); onEdit() }}
            style={{ background: btnBg, border: 'none', borderRadius: 9, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconEdit size={13} color={light ? 'rgba(30,15,0,0.6)' : 'rgba(255,255,255,0.8)'} stroke={1.8} />
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete() }}
            style={{ background: light ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 9, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconTrash size={13} color={light ? 'rgba(30,15,0,0.38)' : 'rgba(255,255,255,0.45)'} stroke={1.8} />
          </button>
        </div>
      </div>

      {/* Main clickable area */}
      <div onClick={onClick} style={{ cursor: 'pointer' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700, color: txt, lineHeight: 1.1, letterSpacing: '-0.3px' }}>{cartao.nome}</p>
          <div style={{ textAlign: 'right' }}>
            <p style={{ ...LABEL, color: subTxt, marginBottom: 3 }}>Fatura</p>
            <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: txt, letterSpacing: '-0.3px' }}>{fmt(total)}</p>
          </div>
        </div>

        {/* Progress */}
        <div style={{ background: light ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.18)', borderRadius: 4, height: 4, overflow: 'hidden', marginBottom: 10 }}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            style={{ height: '100%', background: pct > 80 ? '#FFB347' : (light ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.85)'), borderRadius: 4 }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: subTxt }}>Limite {fmt(cartao.limite)}</p>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: disponivel < 0 ? '#FFB347' : txt, fontWeight: 600 }}>
            Disponível {fmt(Math.max(0, disponivel))}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, background: light ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.16)', color: txt, padding: '4px 10px', borderRadius: 20, fontWeight: 600 }}>
            Fecha dia {cartao.diaFechamento}
          </span>
          <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, background: light ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.16)', color: txt, padding: '4px 10px', borderRadius: 20, fontWeight: 600 }}>
            Vence dia {cartao.diaVencimento}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

export function Page() {
  const cartoes = useCartoes()
  const { mes, ano } = mesAnoAtual()
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [selectedCartao, setSelectedCartao] = useState<any>(null)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [form, setForm] = useState({ nome: '', bandeira: 'Visa', limite: '', cor: '#820AD1', diaFechamento: 1, diaVencimento: 10 })

  const openAdd = () => { setEditingId(null); setForm({ nome: '', bandeira: 'Visa', limite: '', cor: '#820AD1', diaFechamento: 1, diaVencimento: 10 }); setAdding(true) }
  const openEdit = (c: any) => {
    setEditingId(c.id)
    setForm({ nome: c.nome, bandeira: c.bandeira, limite: String(c.limite), cor: c.cor, diaFechamento: c.diaFechamento, diaVencimento: c.diaVencimento })
    setAdding(true)
  }
  const handleSave = async () => {
    if (!form.nome || !form.limite) return
    const data = { nome: form.nome, bandeira: form.bandeira, limite: parseFloat(form.limite.replace(',', '.')), cor: form.cor, diaFechamento: form.diaFechamento, diaVencimento: form.diaVencimento }
    if (editingId !== null) await editCartao(editingId, data)
    else await addCartao({ ...data, ativo: true })
    setAdding(false)
  }

  return (
    <div style={{ padding: '32px', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ ...DISPLAY, fontSize: 38, color: '#2C1A0F', letterSpacing: '-1.5px' }}>Cartões</h1>
          <p style={{ ...BODY, fontSize: 13, color: '#9B7B6A', marginTop: 4 }}>
            {cartoes.length > 0 ? `${cartoes.length} cartão${cartoes.length !== 1 ? 's' : ''}` : 'Gerencie seus cartões de crédito'}
          </p>
        </div>
        <motion.button whileTap={{ scale: 0.95 }} onClick={openAdd} style={BTN_PRIMARY}>
          <IconPlus size={16} stroke={2.5} /> Adicionar
        </motion.button>
      </div>

      {cartoes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Dobrao mood="sleeping" size={90} />
          <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: '#2C1A0F', marginTop: 16 }}>Nenhum cartão</p>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, color: '#9B7B6A', marginTop: 6 }}>Adicione seu cartão de crédito</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
          {cartoes.map(c => (
            <CartaoCard key={c.id} cartao={c} mes={mes} ano={ano}
              onClick={() => setSelectedCartao(c)} onEdit={() => openEdit(c)} onDelete={() => setConfirmDelete(c.id!)} />
          ))}
        </div>
      )}

      <AnimatePresence>
        {confirmDelete !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setConfirmDelete(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(20,8,0,0.55)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <motion.div initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.88, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              onClick={e => e.stopPropagation()}
              style={{ background: '#FFFFFF', borderRadius: 22, padding: '28px 24px', maxWidth: 340, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(44,26,15,0.2)' }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: '#FEE2DC', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <IconTrash size={24} color="#C4553B" stroke={1.8} />
              </div>
              <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: '#2C1A0F', marginBottom: 8 }}>Excluir cartão?</p>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, color: '#9B7B6A', marginBottom: 24 }}>Os lançamentos deste cartão serão removidos.</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setConfirmDelete(null)}
                  style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: '1.5px solid #E8E0D5', background: 'white', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 600, color: '#7A5C4F', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={async () => { await deleteCartao(confirmDelete); setConfirmDelete(null) }}
                  style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: 'none', background: '#C4553B', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 700, color: 'white', cursor: 'pointer' }}>
                  Excluir
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {adding && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setAdding(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(20,8,0,0.55)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: 520, background: '#FFFFFF', borderRadius: '28px 28px 0 0', padding: '8px 22px 48px', maxHeight: '90dvh', overflowY: 'auto' }}>

              <div style={{ width: 40, height: 4, borderRadius: 2, background: '#E8E0D5', margin: '12px auto 20px' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
                <div>
                  <h3 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700, color: '#2C1A0F' }}>{editingId ? 'Editar cartão' : 'Novo cartão'}</h3>
                  <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#9B7B6A', marginTop: 3 }}>{editingId ? 'Atualize as informações' : 'Adicione seu cartão de crédito'}</p>
                </div>
                <button onClick={() => setAdding(false)} style={{ background: '#F5F0E8', border: 'none', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconX size={16} color="#9B7B6A" />
                </button>
              </div>

              {/* Preview */}
              <div style={{ background: `linear-gradient(135deg, ${lightenHex(form.cor, 12)} 0%, ${form.cor} 55%, ${darkenHex(form.cor, 22)} 100%)`, borderRadius: 18, padding: '16px 18px 14px', marginBottom: 22, boxShadow: `0 6px 24px ${form.cor}40` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: isLightColor(form.cor) ? 'rgba(30,15,0,0.5)' : 'rgba(255,255,255,0.55)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 4 }}>{form.bandeira}</p>
                    <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: isLightColor(form.cor) ? 'rgba(30,15,0,0.9)' : 'white', lineHeight: 1 }}>{form.nome || 'Nome do cartão'}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, color: isLightColor(form.cor) ? 'rgba(30,15,0,0.5)' : 'rgba(255,255,255,0.55)', letterSpacing: '.06em', marginBottom: 2 }}>LIMITE</p>
                    <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 16, fontWeight: 700, color: isLightColor(form.cor) ? 'rgba(30,15,0,0.9)' : 'white' }}>{form.limite ? fmt(parseFloat(form.limite.replace(',', '.')) || 0) : 'R$ 0,00'}</p>
                  </div>
                </div>
              </div>

              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: '#9B7B6A', marginBottom: 8, letterSpacing: '.07em' }}>BANDEIRA</p>
              <div style={{ display: 'flex', gap: 7, marginBottom: 18, flexWrap: 'wrap' }}>
                {BANDEIRAS.map(b => (
                  <button key={b} onClick={() => setForm(f => ({ ...f, bandeira: b }))}
                    style={{ padding: '8px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', background: form.bandeira === b ? '#C4553B' : '#F5F0E8', color: form.bandeira === b ? 'white' : '#7A5C4F', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700, transition: 'all .15s', boxShadow: form.bandeira === b ? '0 2px 8px rgba(196,85,59,0.3)' : 'none' }}>
                    {b}
                  </button>
                ))}
              </div>

              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: '#9B7B6A', marginBottom: 7, letterSpacing: '.07em' }}>NOME DO CARTÃO</p>
              <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Nubank, Inter Visa..."
                style={{ width: '100%', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 13, padding: '12px 15px', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 600, color: '#2C1A0F', outline: 'none', marginBottom: 14, boxSizing: 'border-box' }} />

              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: '#9B7B6A', marginBottom: 7, letterSpacing: '.07em' }}>LIMITE</p>
              <div style={{ display: 'flex', alignItems: 'center', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 13, padding: '12px 15px', gap: 8, marginBottom: 16 }}>
                <span style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 18, color: '#C4553B', fontWeight: 700 }}>R$</span>
                <input value={form.limite} onChange={e => setForm(f => ({ ...f, limite: e.target.value }))} placeholder="0,00" type="tel"
                  style={{ border: 'none', background: 'transparent', fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700, color: '#2C1A0F', flex: 1, outline: 'none' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
                <div>
                  <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: '#9B7B6A', marginBottom: 7, letterSpacing: '.07em' }}>DIA FECHAMENTO</p>
                  <input value={form.diaFechamento} onChange={e => setForm(f => ({ ...f, diaFechamento: parseInt(e.target.value) || 1 }))} type="number" min="1" max="31"
                    style={{ width: '100%', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 13, padding: '12px 0', fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700, color: '#2C1A0F', outline: 'none', textAlign: 'center' }} />
                </div>
                <div>
                  <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: '#9B7B6A', marginBottom: 7, letterSpacing: '.07em' }}>DIA VENCIMENTO</p>
                  <input value={form.diaVencimento} onChange={e => setForm(f => ({ ...f, diaVencimento: parseInt(e.target.value) || 10 }))} type="number" min="1" max="31"
                    style={{ width: '100%', background: '#FAF6F0', border: '1.5px solid #E8E0D5', borderRadius: 13, padding: '12px 0', fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700, color: '#2C1A0F', outline: 'none', textAlign: 'center' }} />
                </div>
              </div>

              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: '#9B7B6A', marginBottom: 10, letterSpacing: '.07em' }}>COR DO CARTÃO</p>
              <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
                {CORES.map(c => (
                  <button key={c} onClick={() => setForm(f => ({ ...f, cor: c }))}
                    style={{ width: 36, height: 36, borderRadius: '50%', background: c, border: form.cor === c ? '3px solid #2C1A0F' : '3px solid transparent', cursor: 'pointer', transition: 'transform .15s', transform: form.cor === c ? 'scale(1.15)' : 'scale(1)', boxShadow: form.cor === c ? `0 3px 10px ${c}60` : 'none' }} />
                ))}
              </div>

              <motion.button onClick={handleSave} whileTap={{ scale: 0.97 }} disabled={!form.nome || !form.limite}
                style={{ width: '100%', padding: '15px 0', borderRadius: 15, border: 'none', cursor: form.nome && form.limite ? 'pointer' : 'default', background: form.nome && form.limite ? '#C4553B' : '#E8E0D5', color: form.nome && form.limite ? 'white' : '#9B7B6A', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, fontWeight: 700, boxShadow: form.nome && form.limite ? '0 4px 16px rgba(196,85,59,0.35)' : 'none', transition: 'all .2s' }}>
                {editingId ? 'Salvar alterações' : 'Adicionar cartão'}
              </motion.button>
            </motion.div>
          </motion.div>
        )}

        {selectedCartao && <FaturaSheet cartao={selectedCartao} onClose={() => setSelectedCartao(null)} />}
      </AnimatePresence>
    </div>
  )
}

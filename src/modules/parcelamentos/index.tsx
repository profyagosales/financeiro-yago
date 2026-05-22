import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAllLancamentosAtivos, useCartoes } from '@/db/hooks/useCartoes'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { fmt } from '@/lib/format'
import { Dobrao } from '@/components/mascot/Dobrao'
import { db } from '@/db/schema'
import { IconCreditCard, IconChevronDown, IconChevronUp } from '@tabler/icons-react'

const DISPLAY: React.CSSProperties = { fontFamily: "'Fraunces',Georgia,serif", fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1.1 }
const LABEL: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#9B7B6A' }
const BODY: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans',sans-serif" }
const CARD: React.CSSProperties = { background: '#FFFFFF', border: '1px solid #EDE6DC', borderRadius: 20, boxShadow: '0 1px 3px rgba(44,26,15,0.05), 0 4px 16px rgba(44,26,15,0.06)' }

function lightenHex(hex: string, pct: number) {
  if (!hex || hex.length < 7) return hex
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return `#${Math.min(255,Math.round(r+(255-r)*pct/100)).toString(16).padStart(2,'0')}${Math.min(255,Math.round(g+(255-g)*pct/100)).toString(16).padStart(2,'0')}${Math.min(255,Math.round(b+(255-b)*pct/100)).toString(16).padStart(2,'0')}`
}
function darkenHex(hex: string, pct: number) {
  if (!hex || hex.length < 7) return hex
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return `#${Math.max(0,Math.round(r*(1-pct/100))).toString(16).padStart(2,'0')}${Math.max(0,Math.round(g*(1-pct/100))).toString(16).padStart(2,'0')}${Math.max(0,Math.round(b*(1-pct/100))).toString(16).padStart(2,'0')}`
}
function isLightColor(hex: string) {
  if (!hex || hex.length < 7) return false
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return (0.299*r + 0.587*g + 0.114*b) > 170
}

function ParcelaRow({ lanc, cor }: { lanc: any; cor: string }) {
  const [cat, setCat] = useState<any>(null)
  const pct = Math.round((lanc.parcelaAtual / lanc.totalParcelas) * 100)
  const restantes = lanc.totalParcelas - lanc.parcelaAtual
  const totalRestante = lanc.valor * restantes

  useEffect(() => { db.categorias.get(lanc.categoriaId).then(setCat) }, [lanc.categoriaId])

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ ...CARD, padding: '14px 16px', borderRadius: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        {cat && <CategoryIcon nome={cat.nome} cor={cat.cor} size={44} radius={13} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ ...BODY, fontSize: 14, fontWeight: 600, color: '#2C1A0F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lanc.descricao}</p>
          <p style={{ ...BODY, fontSize: 11, color: '#9B7B6A', marginTop: 2 }}>
            {lanc.parcelaAtual}/{lanc.totalParcelas} parcelas &middot; {restantes === 0 ? 'Última parcela' : `${restantes} restante${restantes !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ ...DISPLAY, fontSize: 15, color: '#C4553B' }}>
            {fmt(lanc.valor)}<span style={{ ...BODY, fontSize: 10, fontWeight: 600, color: '#9B7B6A' }}>/mês</span>
          </p>
          <p style={{ ...BODY, fontSize: 10, color: '#C4B4A8', marginTop: 2 }}>
            {totalRestante > 0 ? `${fmt(totalRestante)} restante` : 'Quitado'}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ background: '#F5F0E8', borderRadius: 6, height: 5, overflow: 'hidden', marginBottom: 5 }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 200, damping: 25, delay: 0.1 }}
          style={{ height: '100%', background: `linear-gradient(90deg, ${lightenHex(cor, 20)}, ${cor})`, borderRadius: 6 }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ ...BODY, fontSize: 10, color: '#9B7B6A' }}>{pct}% concluído</span>
        <span style={{ ...BODY, fontSize: 10, color: '#9B7B6A' }}>{fmt(lanc.valor * lanc.parcelaAtual)} pago</span>
      </div>
    </motion.div>
  )
}

function CartaoGroup({ cartao, lancamentos }: { cartao: any; lancamentos: any[] }) {
  const [expanded, setExpanded] = useState(true)
  const totalMensal = lancamentos.reduce((s, l) => s + l.valor, 0)
  const light = isLightColor(cartao.cor)
  const txt = light ? 'rgba(30,15,0,0.9)' : 'rgba(255,255,255,0.96)'
  const subTxt = light ? 'rgba(30,15,0,0.5)' : 'rgba(255,255,255,0.55)'

  return (
    <div style={{ marginBottom: 20 }}>
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%', border: 'none', cursor: 'pointer', borderRadius: 20,
          padding: '16px 18px', marginBottom: expanded ? 10 : 0,
          background: `linear-gradient(140deg, ${lightenHex(cartao.cor, 22)} 0%, ${cartao.cor} 50%, ${darkenHex(cartao.cor, 30)} 100%)`,
          boxShadow: `0 6px 24px ${cartao.cor}38`,
          position: 'relative', overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: light ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.18)', border: light ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconCreditCard size={18} color={txt} stroke={1.8} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <p style={{ ...BODY, fontSize: 12, fontWeight: 800, color: txt, letterSpacing: '.04em', textTransform: 'uppercase' }}>{cartao.nome}</p>
            <p style={{ ...BODY, fontSize: 10, color: subTxt, marginTop: 1 }}>{lancamentos.length} parcelamento{lancamentos.length !== 1 ? 's' : ''} em aberto</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ ...BODY, fontSize: 9, color: subTxt, letterSpacing: '.06em' }}>POR MÊS</p>
            <p style={{ ...DISPLAY, fontSize: 18, color: txt }}>{fmt(totalMensal)}</p>
          </div>
          {expanded ? <IconChevronUp size={16} color={txt} stroke={2} /> : <IconChevronDown size={16} color={txt} stroke={2} />}
        </div>
      </motion.button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {lancamentos.map(l => <ParcelaRow key={l.id} lanc={l} cor={cartao.cor} />)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function Page() {
  const lancamentos = useAllLancamentosAtivos()
  const cartoes = useCartoes()
  const parcelamentos = lancamentos.filter(l => l.totalParcelas > 1)
  const totalMensal = parcelamentos.reduce((s, l) => s + l.valor, 0)
  const totalGeral = parcelamentos.reduce((s, l) => s + l.valor * (l.totalParcelas - l.parcelaAtual + 1), 0)

  const byCartao = cartoes.map(c => ({
    cartao: c,
    lancamentos: parcelamentos.filter(l => l.cartaoId === c.id),
  })).filter(g => g.lancamentos.length > 0)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ width: '100%', paddingBottom: 32 }}>

      {/* Header */}
      <div style={{ padding: '24px 28px 0', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ ...DISPLAY, fontSize: 28, color: '#2C1A0F' }}>Parcelamentos</h1>
            {parcelamentos.length > 0 && (
              <p style={{ ...BODY, fontSize: 13, color: '#9B7B6A', marginTop: 3 }}>
                {parcelamentos.length} parcela{parcelamentos.length !== 1 ? 's' : ''} ativa{parcelamentos.length !== 1 ? 's' : ''} &middot; {fmt(totalMensal)}/mês total
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Summary card */}
      {parcelamentos.length > 0 && (
        <div style={{ ...CARD, margin: '0 28px 24px', padding: '18px 20px' }}>
          <p style={{ ...LABEL, marginBottom: 14 }}>Resumo</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <div>
              <p style={{ ...LABEL, fontSize: 9, marginBottom: 5 }}>POR MÊS</p>
              <p style={{ ...DISPLAY, fontSize: 20, color: '#C4553B' }}>{fmt(totalMensal)}</p>
            </div>
            <div>
              <p style={{ ...LABEL, fontSize: 9, marginBottom: 5 }}>TOTAL RESTANTE</p>
              <p style={{ ...DISPLAY, fontSize: 20, color: '#2C1A0F' }}>{fmt(totalGeral)}</p>
            </div>
            <div>
              <p style={{ ...LABEL, fontSize: 9, marginBottom: 5 }}>EM ABERTO</p>
              <p style={{ ...DISPLAY, fontSize: 20, color: '#2C1A0F' }}>{parcelamentos.length}</p>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {parcelamentos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '56px 28px' }}>
          <Dobrao mood="happy" size={100} />
          <p style={{ ...DISPLAY, fontSize: 20, color: '#2C1A0F', marginTop: 14 }}>Nenhum parcelamento ativo</p>
          <p style={{ ...BODY, fontSize: 14, color: '#9B7B6A', marginTop: 6 }}>Seus parcelamentos de cartão aparecem aqui</p>
        </div>
      ) : (
        <div style={{ padding: '0 28px' }}>
          {byCartao.map(({ cartao, lancamentos: lcs }) => (
            <CartaoGroup key={cartao.id} cartao={cartao} lancamentos={lcs} />
          ))}
        </div>
      )}
    </motion.div>
  )
}

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAllLancamentosAtivos, useCartoes } from '@/db/hooks/useCartoes'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { fmt } from '@/lib/format'
import { Dobrao } from '@/components/mascot/Dobrao'
import { db } from '@/db/schema'
import { IconCreditCard, IconCalendarStats, IconChevronDown, IconChevronUp } from '@tabler/icons-react'

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
  const total = lanc.valor * lanc.totalParcelas

  useEffect(() => { db.categorias.get(lanc.categoriaId).then(setCat) }, [lanc.categoriaId])

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      style={{ background: '#FFFDF9', border: '1px solid #EDE6DC', borderRadius: 16, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        {cat && <CategoryIcon nome={cat.nome} cor={cat.cor} size={44} radius={13} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 600, color: '#2C1A0F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lanc.descricao}</p>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#9B7B6A', marginTop: 2 }}>
            {restantes === 0 ? 'Última parcela' : `Ainda ${restantes} parcela${restantes !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 15, fontWeight: 700, color: '#C4553B' }}>{fmt(lanc.valor)}<span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 600, color: '#9B7B6A' }}>/mês</span></p>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: '#C4B4A8', marginTop: 2 }}>{lanc.parcelaAtual}/{lanc.totalParcelas}x · total {fmt(total)}</p>
        </div>
      </div>

      <div style={{ background: '#EDE6DC', borderRadius: 6, height: 6, overflow: 'hidden', marginBottom: 5 }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 200, damping: 25, delay: 0.1 }}
          style={{ height: '100%', background: `linear-gradient(90deg, ${lightenHex(cor, 20)}, ${cor})`, borderRadius: 6 }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: '#9B7B6A' }}>{pct}% concluído</span>
        <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: '#9B7B6A' }}>{fmt(lanc.valor * lanc.parcelaAtual)} pago</span>
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
      <motion.button whileTap={{ scale: 0.98 }} onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%', border: 'none', cursor: 'pointer', borderRadius: 20, padding: '16px 18px', marginBottom: expanded ? 10 : 0,
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
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 800, color: txt, letterSpacing: '.04em', textTransform: 'uppercase' }}>{cartao.nome}</p>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: subTxt, marginTop: 1 }}>{lancamentos.length} parcelamento{lancamentos.length !== 1 ? 's' : ''} em aberto</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, color: subTxt, letterSpacing: '.06em' }}>POR MÊS</p>
            <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 18, fontWeight: 700, color: txt, letterSpacing: '-0.5px' }}>{fmt(totalMensal)}</p>
          </div>
          {expanded ? <IconChevronUp size={16} color={txt} stroke={2} /> : <IconChevronDown size={16} color={txt} stroke={2} />}
        </div>
      </motion.button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '24px 28px', width: '100%' }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 28, fontWeight: 700, color: '#2C1A0F' }}>Parcelamentos</h1>
        {parcelamentos.length > 0 && (
          <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#9B7B6A', background: '#F5F0E8', padding: '5px 12px', borderRadius: 20, fontWeight: 600 }}>
            {parcelamentos.length} em aberto
          </span>
        )}
      </div>

      {parcelamentos.length > 0 && (
        <div style={{ background: 'linear-gradient(140deg, #1E0C04 0%, #3E1C0C 45%, #2C1208 100%)', borderRadius: 22, padding: '20px 22px', marginBottom: 24, position: 'relative', overflow: 'hidden', boxShadow: '0 8px 32px rgba(20,8,0,0.25)' }}>
          <div style={{ position: 'absolute', top: -50, right: -50, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(196,85,59,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{ width: 28, height: 28, borderRadius: 9, background: 'rgba(217,79,138,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconCalendarStats size={15} color="#E890C0" stroke={2} />
            </div>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: '.08em' }}>COMPROMETIDO</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ background: 'rgba(217,79,138,0.18)', border: '1px solid rgba(217,79,138,0.22)', borderRadius: 14, padding: '12px 14px' }}>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 700, color: '#E890C0', letterSpacing: '.07em', marginBottom: 4 }}>POR MÊS</p>
              <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700, color: 'white', letterSpacing: '-0.5px' }}>{fmt(totalMensal)}</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '12px 14px' }}>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '.07em', marginBottom: 4 }}>TOTAL RESTANTE</p>
              <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.85)', letterSpacing: '-0.5px' }}>{fmt(totalGeral)}</p>
            </div>
          </div>
        </div>
      )}

      {parcelamentos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '56px 0' }}>
          <Dobrao mood="happy" size={100} />
          <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: '#2C1A0F', marginTop: 14 }}>Nenhum parcelamento</p>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, color: '#9B7B6A', marginTop: 6 }}>Lance compras parceladas nos Cartões</p>
        </div>
      ) : (
        <div>
          {byCartao.map(({ cartao, lancamentos: lcs }) => (
            <CartaoGroup key={cartao.id} cartao={cartao} lancamentos={lcs} />
          ))}
        </div>
      )}
    </motion.div>
  )
}

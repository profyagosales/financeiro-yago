import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAllLancamentosAtivos, useCartoes } from '@/db/hooks/useCartoes'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { fmt } from '@/lib/format'
import { Dobrao } from '@/components/mascot/Dobrao'
import { db } from '@/db/schema'
import { IconCreditCard, IconChevronDown, IconChevronUp } from '@tabler/icons-react'

const DISPLAY: React.CSSProperties = { fontFamily: "'Fraunces',Georgia,serif", fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1.1 }
const NUM: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, letterSpacing: '-0.3px', lineHeight: 1.1 }
const LABEL: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#9B7B6A' }
const BODY: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans',sans-serif" }
const CARD: React.CSSProperties = { background: '#FFFFFF', border: '1px solid #EDE6DC', borderRadius: 20, boxShadow: '0 1px 3px rgba(44,26,15,0.05), 0 4px 16px rgba(44,26,15,0.06)' }

function lightenHex(hex: string, pct: number) {
  if (!hex || hex.length < 7) return hex
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return `#${Math.min(255,Math.round(r+(255-r)*pct/100)).toString(16).padStart(2,'0')}${Math.min(255,Math.round(g+(255-g)*pct/100)).toString(16).padStart(2,'0')}${Math.min(255,Math.round(b+(255-b)*pct/100)).toString(16).padStart(2,'0')}`
}

function ParcelaRow({ lanc, cor }: { lanc: any; cor: string }) {
  const [cat, setCat] = useState<any>(null)
  const pct = Math.round((lanc.parcelaAtual / lanc.totalParcelas) * 100)
  const restantes = lanc.totalParcelas - lanc.parcelaAtual
  const totalRestante = lanc.valor * restantes
  const isUltima = lanc.parcelaAtual === lanc.totalParcelas - 1

  useEffect(() => { db.categorias.get(lanc.categoriaId).then(setCat) }, [lanc.categoriaId])

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ ...CARD, padding: '14px 16px', borderRadius: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        {cat && <CategoryIcon nome={cat.nome} cor={cat.cor} size={44} radius={13} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <p style={{ ...BODY, fontSize: 14, fontWeight: 600, color: '#2C1A0F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lanc.descricao}</p>
            {isUltima && (
              <span style={{ ...BODY, fontSize: 9, fontWeight: 700, color: '#3A8580', background: '#EBF5F0', border: '1px solid #C0DED9', padding: '2px 7px', borderRadius: 20, flexShrink: 0 }}>Última!</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ ...BODY, fontSize: 11, fontWeight: 700, color: 'white', background: cor, padding: '2px 9px', borderRadius: 20 }}>
              {lanc.parcelaAtual}/{lanc.totalParcelas}x
            </span>
            <span style={{ ...BODY, fontSize: 11, color: '#9B7B6A' }}>
              {restantes === 0 ? 'Concluída' : `${restantes} restante${restantes !== 1 ? 's' : ''}`}
            </span>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ ...NUM, fontSize: 15, color: '#C4553B' }}>
            {fmt(lanc.valor)}<span style={{ ...BODY, fontSize: 10, fontWeight: 600, color: '#9B7B6A' }}>/mês</span>
          </p>
          <p style={{ ...BODY, fontSize: 10, color: '#C4B4A8', marginTop: 2 }}>
            {totalRestante > 0 ? `${fmt(totalRestante)} restante` : 'Quitado'}
          </p>
        </div>
      </div>

      {/* Progress bar — 7px, gradient */}
      <div style={{ background: '#F5F0E8', borderRadius: 6, height: 7, overflow: 'hidden', marginBottom: 5 }}>
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

  return (
    <div style={{ marginBottom: 20 }}>
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%', cursor: 'pointer', marginBottom: expanded ? 10 : 0,
          background: '#FFFFFF',
          border: `1px solid ${cartao.cor}30`,
          borderLeft: `4px solid ${cartao.cor}`,
          borderRadius: 20,
          padding: '16px 20px',
          boxShadow: `0 2px 12px ${cartao.cor}15, 0 1px 3px rgba(44,26,15,0.05)`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 13, background: cartao.cor, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 3px 10px ${cartao.cor}40` }}>
            <IconCreditCard size={18} color="white" stroke={1.8} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <p style={{ ...BODY, fontSize: 14, fontWeight: 700, color: '#2C1A0F' }}>{cartao.nome}</p>
            <p style={{ ...BODY, fontSize: 11, color: '#9B7B6A', marginTop: 1 }}>
              {lancamentos.length} parcelamento{lancamentos.length !== 1 ? 's' : ''} em aberto
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ ...BODY, fontSize: 9, fontWeight: 700, color: '#9B7B6A', letterSpacing: '.06em' }}>POR MÊS</p>
            <p style={{ ...NUM, fontSize: 18, color: cartao.cor }}>{fmt(totalMensal)}</p>
          </div>
          <div style={{ background: `${cartao.cor}15`, borderRadius: 9, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {expanded ? <IconChevronUp size={15} color={cartao.cor} stroke={2.5} /> : <IconChevronDown size={15} color={cartao.cor} stroke={2.5} />}
          </div>
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
      <div style={{ padding: '32px 32px 20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, borderBottom: '1px solid #EDE6DC' }}>
        <div>
          <h1 style={{ ...DISPLAY, fontSize: 38, color: '#2C1A0F', letterSpacing: '-1.5px' }}>Parcelamentos</h1>
          <p style={{ ...BODY, fontSize: 13, color: '#9B7B6A', marginTop: 4 }}>
            {parcelamentos.length > 0
              ? `${parcelamentos.length} parcela${parcelamentos.length !== 1 ? 's' : ''} ativa${parcelamentos.length !== 1 ? 's' : ''} · ${fmt(totalMensal)}/mês total`
              : 'Acompanhe seus parcelamentos de cartão'}
          </p>
        </div>
      </div>

      {/* Summary card */}
      {parcelamentos.length > 0 && (
        <div style={{ ...CARD, margin: '0 32px 24px', padding: '18px 20px' }}>
          <p style={{ ...LABEL, marginBottom: 14 }}>Resumo</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
            <div>
              <p style={{ ...LABEL, fontSize: 9, marginBottom: 5 }}>POR MÊS</p>
              <p style={{ ...NUM, fontSize: 20, color: '#C4553B' }}>{fmt(totalMensal)}</p>
            </div>
            <div>
              <p style={{ ...LABEL, fontSize: 9, marginBottom: 5 }}>TOTAL RESTANTE</p>
              <p style={{ ...NUM, fontSize: 20, color: '#2C1A0F' }}>{fmt(totalGeral)}</p>
            </div>
            <div>
              <p style={{ ...LABEL, fontSize: 9, marginBottom: 5 }}>EM ABERTO</p>
              <p style={{ ...NUM, fontSize: 20, color: '#2C1A0F' }}>{parcelamentos.length}</p>
            </div>
          </div>
          {/* Mini bar chart */}
          <div style={{ borderTop: '1px solid #EDE6DC', paddingTop: 14 }}>
            <p style={{ ...LABEL, fontSize: 9, marginBottom: 12 }}>Maior impacto mensal</p>
            {parcelamentos.slice(0, 5).map(l => {
              const pctBar = totalMensal > 0 ? (l.valor / totalMensal) * 100 : 0
              return (
                <div key={l.id} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ ...BODY, fontSize: 11, color: '#7A5C4F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: 8 }}>{l.descricao}</span>
                    <span style={{ ...NUM, fontSize: 12, color: '#2C1A0F', flexShrink: 0 }}>{fmt(l.valor)}</span>
                  </div>
                  <div style={{ background: '#F5F0E8', borderRadius: 4, height: 4, overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pctBar}%` }}
                      transition={{ type: 'spring', stiffness: 180, damping: 24 }}
                      style={{ height: '100%', background: '#C4553B', borderRadius: 4 }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {parcelamentos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '56px 32px' }}>
          <Dobrao mood="happy" size={100} />
          <p style={{ ...DISPLAY, fontSize: 20, color: '#2C1A0F', marginTop: 14 }}>Nenhum parcelamento ativo</p>
          <p style={{ ...BODY, fontSize: 14, color: '#9B7B6A', marginTop: 6 }}>Seus parcelamentos de cartão aparecem aqui</p>
        </div>
      ) : (
        <div style={{ padding: '0 32px' }}>
          {byCartao.map(({ cartao, lancamentos: lcs }) => (
            <CartaoGroup key={cartao.id} cartao={cartao} lancamentos={lcs} />
          ))}
        </div>
      )}
    </motion.div>
  )
}

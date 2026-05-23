import { motion } from 'framer-motion'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Cartao } from '@/db/schema'
import { fmt, mesAnoAtual } from '@/lib/format'
import { BankLogo } from '@/components/ui/BankLogo'
import { BandeiraLogo } from '@/components/ui/BandeiraLogo'

interface Props {
  cartao: Cartao
  active: boolean
  onClick: () => void
}

export function CartaoListRow({ cartao, active, onClick }: Props) {
  const { mes, ano } = mesAnoAtual()
  // Fatura do mês atual
  const lancs = useLiveQuery(
    () => cartao.id !== undefined
      ? db.lancamentosCartao.where('[cartaoId+mes+ano]').equals([cartao.id, mes, ano]).toArray()
      : Promise.resolve([]),
    [cartao.id, mes, ano],
  ) ?? []
  const fatura = lancs.reduce((s, l) => s + l.valor, 0)
  const pct = cartao.limite > 0 ? Math.min(100, (fatura / cartao.limite) * 100) : 0

  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.985 }}
      style={{
        width: '100%',
        background: active ? `${cartao.cor}10` : 'transparent',
        border: 'none',
        borderLeft: active ? `3px solid ${cartao.cor}` : '3px solid transparent',
        borderRadius: 12,
        padding: '12px 14px 12px 11px',
        cursor: 'pointer',
        display: 'flex', flexDirection: 'column', gap: 6,
        textAlign: 'left',
        transition: 'background .12s',
      }}
      onMouseEnter={e => {
        if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(122,92,79,0.05)'
      }}
      onMouseLeave={e => {
        if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Logo do banco (uploaded) ou mini badge com bandeira como fallback */}
        {cartao.logo && (cartao.logo.startsWith('data:') || cartao.logo.startsWith('http')) ? (
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <BankLogo logo={cartao.logo} nome={cartao.nome} cor={cartao.cor} size={36} radiusRatio={0.22} />
            {/* Mini bandeira no canto inferior direito como acento */}
            <div style={{
              position: 'absolute', bottom: -4, right: -4,
              background: '#FFFFFF', borderRadius: 5, padding: '2px 3px',
              border: '1px solid #EDE6DC',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              lineHeight: 0,
            }}>
              <BandeiraLogo bandeira={cartao.bandeira} size={14} variant="dark" />
            </div>
          </div>
        ) : (
          <div style={{
            width: 38, height: 28, borderRadius: 7,
            background: `linear-gradient(135deg, ${cartao.cor}, ${cartao.cor}cc)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            boxShadow: `0 2px 6px ${cartao.cor}38`,
          }}>
            <BandeiraLogo bandeira={cartao.bandeira} size={24} variant="light" />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 13, fontWeight: active ? 700 : 600,
            color: '#2C1A0F', margin: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{cartao.nome}</p>
          <p style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 10, fontWeight: 600,
            color: active ? cartao.cor : '#9B7B6A',
            margin: '2px 0 0',
            letterSpacing: '.06em', textTransform: 'uppercase',
          }}>{cartao.bandeira}</p>
        </div>
        <span style={{
          fontFamily: "'Fraunces',Georgia,serif", fontSize: 13, fontWeight: 700,
          color: fatura > 0 ? '#2C1A0F' : '#9B7B6A',
          letterSpacing: '-0.4px',
        }}>{fmt(fatura)}</span>
      </div>

      {/* Barra de uso */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{
          flex: 1, height: 4, borderRadius: 2,
          background: 'rgba(122,92,79,0.1)', overflow: 'hidden',
        }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ type: 'spring', stiffness: 100, damping: 22 }}
            style={{
              height: '100%', borderRadius: 2,
              background: pct >= 90 ? '#C4553B' : pct >= 70 ? '#D4A017' : cartao.cor,
            }}
          />
        </div>
        <span style={{
          fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 700,
          color: pct >= 90 ? '#C4553B' : '#9B7B6A',
          letterSpacing: '.02em', minWidth: 28, textAlign: 'right',
        }}>{pct.toFixed(0)}%</span>
      </div>
    </motion.button>
  )
}

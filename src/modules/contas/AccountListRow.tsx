import { motion } from 'framer-motion'
import type { Conta } from '@/db/schema'
import { fmt } from '@/lib/format'
import { BankLogo } from '@/components/ui/BankLogo'

interface Props {
  conta: Conta
  active: boolean
  spark?: number[]
  onClick: () => void
}

export function AccountListRow({ conta, active, spark = [], onClick }: Props) {
  const negativo = conta.saldoAtual < 0

  // Mini sparkline (last 14 datapoints)
  const renderSpark = () => {
    if (spark.length < 2) {
      return (
        <svg width="56" height="20" viewBox="0 0 56 20" style={{ flexShrink: 0 }}>
          <line x1="2" y1="14" x2="54" y2="14"
            stroke="rgba(122,92,79,0.25)" strokeWidth="1.4"
            strokeDasharray="3 3" strokeLinecap="round"/>
        </svg>
      )
    }
    const min = Math.min(...spark)
    const max = Math.max(...spark)
    const range = max - min || 1
    const pts = spark.map((v, i) => {
      const x = (i / (spark.length - 1)) * 52 + 2
      const y = 18 - ((v - min) / range) * 14
      return [x, y] as [number, number]
    })
    const polyStr = pts.map(p => p.join(',')).join(' ')
    const last = pts[pts.length - 1]
    return (
      <svg width="56" height="20" viewBox="0 0 56 20" style={{ flexShrink: 0 }}>
        <polyline points={polyStr} fill="none"
          stroke={active ? conta.cor : 'rgba(122,92,79,0.55)'}
          strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx={last[0]} cy={last[1]} r={2}
          fill={active ? conta.cor : '#7A5C4F'}/>
      </svg>
    )
  }

  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.985 }}
      style={{
        width: '100%',
        background: active ? `${conta.cor}10` : 'transparent',
        border: 'none',
        borderLeft: active ? `3px solid ${conta.cor}` : '3px solid transparent',
        borderRadius: 12,
        padding: '12px 14px 12px 11px',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 12,
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
      <BankLogo logo={conta.logo} nome={conta.nome} cor={conta.cor} size={38} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          fontSize: 13, fontWeight: active ? 700 : 600,
          color: '#2C1A0F', margin: 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{conta.nome}</p>
        <p style={{
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          fontSize: 10, fontWeight: 600,
          color: active ? conta.cor : '#9B7B6A',
          margin: '2px 0 0',
          letterSpacing: '.06em', textTransform: 'uppercase',
        }}>{conta.tipo}</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
        <span style={{
          fontFamily: "'Fraunces',Georgia,serif",
          fontSize: 14, fontWeight: 700,
          color: negativo ? '#C4553B' : '#2C1A0F',
          letterSpacing: '-0.4px', lineHeight: 1,
        }}>{fmt(conta.saldoAtual)}</span>
        {renderSpark()}
      </div>
    </motion.button>
  )
}

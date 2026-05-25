// ─── InvestimentosResumo: card compacto de investimentos ────────────
import { useNavigate } from 'react-router-dom'
import {
  IconTrendingUp, IconTrendingDown, IconCoin, IconChevronRight, IconShieldCheck,
} from '@tabler/icons-react'
import { fmt, fmtPct } from '@/lib/format'
import { ProgressBar } from '@/components/ui/ProgressBar'

interface InvestimentosResumoProps {
  totalInvestido: number
  rendimento: number
  rentMesPct: number
  top: { nome: string; pctMes: number; tipo: string; cor: string } | null
  pior: { nome: string; pctMes: number; tipo: string; cor: string } | null
  reservaAtual: number
  reservaAlvo: number
  reservaMeses: number
}

export function InvestimentosResumo({
  totalInvestido, rendimento, rentMesPct, top, pior,
  reservaAtual, reservaAlvo, reservaMeses,
}: InvestimentosResumoProps) {
  const navigate = useNavigate()
  const temReserva = reservaAlvo > 0
  const reservaPct = temReserva ? Math.min(100, (reservaAtual / reservaAlvo) * 100) : 0

  return (
    <section style={{
      background: '#FFFFFF',
      border: '1px solid #EDE6DC',
      borderRadius: 22,
      padding: '20px 22px',
      boxShadow: '0 1px 3px rgba(44,26,15,0.05), 0 4px 16px rgba(44,26,15,0.06)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <p style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 10, fontWeight: 700,
            color: '#7A5C4F', letterSpacing: '.14em', textTransform: 'uppercase', margin: 0,
          }}>Investimentos</p>
          <h2 style={{
            fontFamily: "'Fraunces',Georgia,serif",
            fontSize: 22, fontWeight: 700, color: '#2C1A0F',
            letterSpacing: '-0.5px', margin: '2px 0 0',
          }}>Sua carteira</h2>
        </div>
        <button
          onClick={() => navigate('/investimentos')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '6px 10px',
            background: 'transparent', border: 'none', cursor: 'pointer',
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 11, fontWeight: 600, color: '#7A5C4F',
          }}>
          Ver tudo <IconChevronRight size={12} stroke={2.2} />
        </button>
      </div>

      {/* Total + rendimento */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <span style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 'clamp(28px, 4vw, 36px)', fontWeight: 700,
            color: '#2C1A0F', letterSpacing: '-0.6px', lineHeight: 1, display: 'block',
          }}>{fmt(totalInvestido)}</span>
          <span style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 12, color: '#7A5C4F', marginTop: 4, display: 'inline-block',
          }}>
            <strong style={{
              color: rendimento >= 0 ? '#1E7D5A' : '#A8442B',
              fontWeight: 700,
            }}>{rendimento >= 0 ? '+' : ''}{fmt(rendimento)}</strong>
            {' '}rendimento acumulado
          </span>
        </div>
        {/* Pílula de rentabilidade */}
        {totalInvestido > 0 && (
          <div style={{
            padding: '8px 12px', borderRadius: 12,
            background: rentMesPct >= 0 ? 'rgba(58,133,128,0.12)' : 'rgba(196,85,59,0.12)',
            border: `1px solid ${rentMesPct >= 0 ? 'rgba(58,133,128,0.32)' : 'rgba(196,85,59,0.32)'}`,
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            {rentMesPct >= 0
              ? <IconTrendingUp size={14} stroke={2.4} color="#1E7D5A" />
              : <IconTrendingDown size={14} stroke={2.4} color="#A8442B" />}
            <span style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 13, fontWeight: 700,
              color: rentMesPct >= 0 ? '#1E7D5A' : '#A8442B',
            }}>{fmtPct(rentMesPct, 2, true)}</span>
          </div>
        )}
      </div>

      {/* Top / Pior */}
      {(top || pior) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          {top && (
            <PerfMini label="Melhor" item={top} positive />
          )}
          {pior && pior.nome !== top?.nome && (
            <PerfMini label="Pior" item={pior} />
          )}
        </div>
      )}

      {/* Reserva de emergência */}
      {temReserva && (
        <div style={{
          padding: '12px 14px', background: '#FBF8F3', borderRadius: 12,
          border: '1px solid #EDE6DC',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <IconShieldCheck size={15} stroke={2} color={reservaPct >= 100 ? '#1E7D5A' : '#A8730F'} />
            <span style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 12, fontWeight: 700, color: '#2C1A0F',
            }}>Reserva de emergência</span>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: '#7A5C4F', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
              {fmt(reservaAtual)} / {fmt(reservaAlvo)}
            </span>
          </div>
          <ProgressBar
            value={reservaPct}
            color="#3A8580"
            colorTo={reservaPct >= 100 ? '#1E7D5A' : '#3A8580'}
            background="#EDE6DC"
            height={8}
            marker={100}
          />
          <p style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 11, color: '#7A5C4F', margin: '8px 0 0', fontWeight: 500,
          }}>
            Cobre <strong style={{ color: '#2C1A0F' }}>{reservaMeses.toFixed(1)} {reservaMeses === 1 ? 'mês' : 'meses'}</strong> de despesas
          </p>
        </div>
      )}

      {totalInvestido === 0 && (
        <div style={{
          padding: '20px 16px', textAlign: 'center',
          background: 'rgba(80,78,118,0.04)', borderRadius: 14, border: '1px dashed rgba(80,78,118,0.25)',
        }}>
          <IconCoin size={28} stroke={1.6} color="#9B7B6A" />
          <p style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 600,
            color: '#7A5C4F', margin: '8px 0 4px',
          }}>Nenhum investimento ainda</p>
          <button onClick={() => navigate('/investimentos')}
            style={{
              padding: '8px 16px', background: '#504E76', border: 'none', borderRadius: 10,
              color: '#FFFFFF', cursor: 'pointer',
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700,
            }}>Começar a investir</button>
        </div>
      )}
    </section>
  )
}

function PerfMini({ label, item }: { label: string; item: { nome: string; pctMes: number; tipo: string; cor: string }; positive?: boolean }) {
  return (
    <div style={{
      padding: '10px 12px', background: '#FBF8F3', borderRadius: 12, border: '1px solid #EDE6DC',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <div style={{
        width: 8, height: 32, borderRadius: 4, flexShrink: 0,
        background: item.cor,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          fontSize: 9.5, fontWeight: 700,
          color: '#7A5C4F', letterSpacing: '.1em', textTransform: 'uppercase',
        }}>{label}</span>
        <p style={{
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          fontSize: 12.5, fontWeight: 600, color: '#2C1A0F',
          margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{item.nome}</p>
        <span style={{
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          fontSize: 11, fontWeight: 700,
          color: item.pctMes >= 0 ? '#1E7D5A' : '#A8442B',
        }}>{fmtPct(item.pctMes, 2, true)}</span>
      </div>
    </div>
  )
}

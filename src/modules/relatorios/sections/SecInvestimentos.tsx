// ─── Investimentos: donut por classe + performers + vencimentos ─────
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PieChart, Pie, Cell, Tooltip } from 'recharts'
import { ChartContainer } from '@/components/ui/ChartContainer'
import {
  IconChartLine, IconTrendingUp, IconTrendingDown, IconCalendarTime,
} from '@tabler/icons-react'
import { SectionShell } from '../components/SectionShell'
import { ChartTooltip } from '../components/ChartTooltip'
import { fmt } from '@/lib/format'
import type { RelatoriosData } from '../lib/useRelatoriosData'
import { EmptyChart } from './SecFluxoCaixa'

interface Props { d: RelatoriosData }

export function SecInvestimentos({ d }: Props) {
  const navigate = useNavigate()
  const [hover, setHover] = useState<number | null>(null)
  const distrib = d.distribInv
  const top5 = d.performers.slice(0, 5)
  const bottom3 = d.performers.slice(-3).reverse()

  if (d.totalInvestido === 0) {
    return (
      <SectionShell
        id="investimentos"
        eyebrow="Investimentos"
        title="Sua carteira"
        icon={<IconChartLine size={18} stroke={2} color="#504E76" />}
        accent="#504E76"
      >
        <EmptyChart text="Sem investimentos cadastrados ainda." />
      </SectionShell>
    )
  }

  return (
    <SectionShell
      id="investimentos"
      eyebrow="Investimentos"
      title="Carteira & performance"
      description="Distribuição por classe, top performers, próximos vencimentos."
      icon={<IconChartLine size={18} stroke={2} color="#504E76" />}
      accent="#504E76"
      action={(
        <button onClick={() => navigate('/investimentos')}
          style={{
            padding: '6px 12px', background: '#FBF8F3', border: '1px solid #EDE6DC',
            borderRadius: 999, cursor: 'pointer',
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: '#7A5C4F',
          }}>Detalhar</button>
      )}
    >
      <div style={{
        display: 'grid', gridTemplateColumns: 'minmax(280px, 360px) 1fr', gap: 24, alignItems: 'flex-start',
      }} className="invest-grid">
        {/* Donut */}
        <div style={{ position: 'relative', minWidth: 0 }}>
          <ChartContainer height={280}>
            <PieChart>
              <Pie data={distrib} dataKey="total" nameKey="tipo"
                innerRadius={75} outerRadius={115} paddingAngle={2} stroke="none"
                onMouseEnter={(_, i) => setHover(i)}
                onMouseLeave={() => setHover(null)}>
                {distrib.map((c, i) => (
                  <Cell key={i} fill={c.cor}
                    opacity={hover === null || hover === i ? 1 : 0.4} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ChartContainer>
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            textAlign: 'center', pointerEvents: 'none',
          }}>
            {hover !== null ? (
              <>
                <p style={{
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontSize: 10, fontWeight: 700, color: '#9B7B6A',
                  letterSpacing: '.14em', textTransform: 'uppercase', margin: 0,
                }}>{distrib[hover].tipo}</p>
                <p style={{
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontSize: 20, fontWeight: 700, color: '#2C1A0F',
                  letterSpacing: '-0.3px', margin: '4px 0 0', lineHeight: 1,
                }}>{fmt(distrib[hover].total)}</p>
                <p style={{
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontSize: 12, fontWeight: 700, color: distrib[hover].cor,
                  margin: '2px 0 0',
                }}>{distrib[hover].pct.toFixed(1)}% · {distrib[hover].count} {distrib[hover].count === 1 ? 'ativo' : 'ativos'}</p>
              </>
            ) : (
              <>
                <p style={{
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontSize: 10, fontWeight: 700, color: '#9B7B6A',
                  letterSpacing: '.14em', textTransform: 'uppercase', margin: 0,
                }}>Total investido</p>
                <p style={{
                  fontFamily: "'Fraunces',Georgia,serif",
                  fontSize: 28, fontWeight: 700, color: '#2C1A0F',
                  letterSpacing: '-0.6px', margin: '4px 0 0', lineHeight: 1,
                }}>{fmt(d.totalInvestido)}</p>
                <p style={{
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontSize: 12, fontWeight: 600,
                  color: d.rendimentoTotal >= 0 ? '#1E7D5A' : '#A8442B',
                  margin: '4px 0 0',
                }}>{d.rendimentoTotal >= 0 ? '+' : ''}{fmt(d.rendimentoTotal)} ({d.rentMesPct.toFixed(1)}%)</p>
              </>
            )}
          </div>
        </div>

        {/* Top performers + bottom + vencimentos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <p style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 10, fontWeight: 700,
              color: '#1E7D5A', letterSpacing: '.12em', textTransform: 'uppercase',
              margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <IconTrendingUp size={12} stroke={2.4} /> Top performers
            </p>
            {top5.map(p => (
              <PerfRow key={p.id} item={p} positive />
            ))}
          </div>

          {bottom3.some(p => p.pctRendimento < 0) && (
            <div>
              <p style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontSize: 10, fontWeight: 700,
                color: '#A8442B', letterSpacing: '.12em', textTransform: 'uppercase',
                margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <IconTrendingDown size={12} stroke={2.4} /> Atenção
              </p>
              {bottom3.filter(p => p.pctRendimento < 0).map(p => (
                <PerfRow key={p.id} item={p} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Vencimentos */}
      {d.vencimentos.length > 0 && (
        <div style={{
          marginTop: 20, paddingTop: 16, borderTop: '1px dashed #EDE6DC',
        }}>
          <p style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 10, fontWeight: 700, color: '#9B7B6A',
            letterSpacing: '.12em', textTransform: 'uppercase',
            margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <IconCalendarTime size={12} stroke={2.2} /> Vencimentos próximos (90 dias)
          </p>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8,
          }}>
            {d.vencimentos.map(v => {
              const inv = d.investimentos.find(i => i.id === v.id)
              const dataVenc = inv?.dataVencimento ? new Date(inv.dataVencimento) : null
              return (
                <div key={v.id} style={{
                  padding: '10px 12px', background: '#FBF8F3', borderRadius: 12, border: '1px solid #EDE6DC',
                }}>
                  <p style={{
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                    fontSize: 12.5, fontWeight: 600, color: '#2C1A0F', margin: 0,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{v.nome}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 }}>
                    <span style={{
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                      fontSize: 11, color: '#7A5C4F', fontWeight: 500,
                    }}>{dataVenc?.toLocaleDateString('pt-BR') ?? '—'}</span>
                    <span style={{
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                      fontSize: 13, fontWeight: 700, color: '#504E76',
                      letterSpacing: '-0.2px',
                    }}>{fmt(v.valorAtual)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 720px) {
          .invest-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </SectionShell>
  )
}

function PerfRow({ item }: { item: { id: number; nome: string; tipo: string; pctRendimento: number; ganho: number; cor: string }; positive?: boolean }) {
  const cor = item.pctRendimento >= 0 ? '#1E7D5A' : '#A8442B'
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 0', borderBottom: '1px dashed #F5EEE3',
    }}>
      <div style={{ width: 4, height: 28, background: item.cor, borderRadius: 3, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          fontSize: 12.5, fontWeight: 600, color: '#2C1A0F',
          margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{item.nome}</p>
        <p style={{
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          fontSize: 10.5, color: '#9B7B6A', margin: 0, fontWeight: 500,
        }}>{item.tipo}</p>
      </div>
      <div style={{ textAlign: 'right' }}>
        <p style={{
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          fontSize: 13, fontWeight: 700, color: cor,
          letterSpacing: '-0.2px', margin: 0,
        }}>{item.pctRendimento >= 0 ? '+' : ''}{item.pctRendimento.toFixed(2)}%</p>
        <p style={{
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          fontSize: 10.5, fontWeight: 600, color: cor, margin: 0, opacity: 0.8,
        }}>{item.ganho >= 0 ? '+' : ''}{fmt(item.ganho)}</p>
      </div>
    </div>
  )
}

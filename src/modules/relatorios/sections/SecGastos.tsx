// ─── Gastos por Categoria: donut + horizontal bars + heatmap ───────
import { useState } from 'react'
import { motion } from 'framer-motion'
import { IconChartPie, IconArrowDownRight, IconArrowUpRight } from '@tabler/icons-react'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'
import { SectionShell } from '../components/SectionShell'
import { ChartTooltip } from '../components/ChartTooltip'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { fmt } from '@/lib/format'
import type { RelatoriosData } from '../lib/useRelatoriosData'
import { EmptyChart } from './SecFluxoCaixa'

interface Props { d: RelatoriosData }

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export function SecGastos({ d }: Props) {
  const [hover, setHover] = useState<number | null>(null)
  const cats = d.categoriasAgr
  const top10 = cats.slice(0, 10)
  const maxHeat = Math.max(...d.heatmap, 1)

  return (
    <SectionShell
      id="gastos"
      eyebrow="Gastos por categoria"
      title="Distribuição e padrões"
      description="Onde o dinheiro foi parar — com comparativo com o período anterior."
      icon={<IconChartPie size={18} stroke={2} color="#C4553B" />}
      accent="#C4553B"
    >
      {cats.length === 0 ? (
        <EmptyChart text="Sem despesas categorizadas nesse período." />
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 380px) 1fr',
          gap: 24, alignItems: 'flex-start',
        }} className="gastos-grid">
          {/* Donut + total no centro */}
          <div style={{ minWidth: 0 }}>
            <div style={{ position: 'relative', width: '100%', height: 280, minWidth: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={cats} dataKey="valor" innerRadius={75} outerRadius={115}
                    paddingAngle={2} stroke="none"
                    onMouseEnter={(_, idx) => setHover(idx)}
                    onMouseLeave={() => setHover(null)}>
                    {cats.map((c, i) => (
                      <Cell key={i} fill={c.cor}
                        opacity={hover === null || hover === i ? 1 : 0.4} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              {/* Total centralizado */}
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
                    }}>{cats[hover].nome}</p>
                    <p style={{
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                      fontSize: 20, fontWeight: 700, color: '#2C1A0F',
                      letterSpacing: '-0.3px', margin: '4px 0 0', lineHeight: 1,
                    }}>{fmt(cats[hover].valor)}</p>
                    <p style={{
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                      fontSize: 12, fontWeight: 700, color: cats[hover].cor,
                      margin: '2px 0 0',
                    }}>{cats[hover].pct.toFixed(1)}%</p>
                  </>
                ) : (
                  <>
                    <p style={{
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                      fontSize: 10, fontWeight: 700, color: '#9B7B6A',
                      letterSpacing: '.14em', textTransform: 'uppercase', margin: 0,
                    }}>Total despesas</p>
                    <p style={{
                      fontFamily: "'Fraunces',Georgia,serif",
                      fontSize: 28, fontWeight: 700, color: '#2C1A0F',
                      letterSpacing: '-0.6px', margin: '4px 0 0', lineHeight: 1,
                    }}>{fmt(d.totais.despesas)}</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Top 10 horizontal bars com delta */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {top10.map((c, i) => (
              <motion.div key={c.id}
                initial={{ opacity: 0, x: -4 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
                style={{
                  cursor: 'default',
                  padding: '6px 0',
                  opacity: hover === null || hover === i ? 1 : 0.55,
                  transition: 'opacity .15s',
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: c.cor, flexShrink: 0 }} />
                  <span style={{
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                    fontSize: 12.5, fontWeight: 600, color: '#2C1A0F',
                    flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{c.nome}</span>
                  {c.deltaPct !== undefined && Math.abs(c.deltaPct) >= 1 && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 2,
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                      fontSize: 10.5, fontWeight: 700,
                      color: c.deltaPct > 0 ? '#A8442B' : '#1E7D5A',
                      padding: '2px 6px', borderRadius: 6,
                      background: c.deltaPct > 0 ? 'rgba(196,85,59,0.08)' : 'rgba(58,133,128,0.08)',
                    }}>
                      {c.deltaPct > 0 ? <IconArrowUpRight size={10} stroke={2.4} /> : <IconArrowDownRight size={10} stroke={2.4} />}
                      {c.deltaPct > 0 ? '+' : ''}{c.deltaPct.toFixed(0)}%
                    </span>
                  )}
                  <span style={{
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                    fontSize: 12.5, fontWeight: 700, color: '#2C1A0F',
                    letterSpacing: '-0.2px', minWidth: 88, textAlign: 'right',
                  }}>{fmt(c.valor)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ProgressBar value={c.pct} max={Math.max(...top10.map(x => x.pct))}
                    color={c.cor} height={6} background="#F5EEE3" />
                  <span style={{
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                    fontSize: 10.5, color: '#9B7B6A', minWidth: 38, textAlign: 'right', fontWeight: 600,
                  }}>{c.pct.toFixed(1)}%</span>
                </div>
              </motion.div>
            ))}
            {cats.length > 10 && (
              <p style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontSize: 11, color: '#9B7B6A', fontWeight: 500,
                margin: '4px 0 0', textAlign: 'right',
              }}>+ {cats.length - 10} {cats.length - 10 === 1 ? 'outra categoria' : 'outras categorias'}</p>
            )}
          </div>
        </div>
      )}

      {/* Heatmap dias da semana */}
      {cats.length > 0 && (
        <div style={{
          marginTop: 20, paddingTop: 18, borderTop: '1px dashed #EDE6DC',
        }}>
          <p style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 10, fontWeight: 700,
            color: '#9B7B6A', letterSpacing: '.12em', textTransform: 'uppercase',
            margin: '0 0 10px',
          }}>Padrão por dia da semana</p>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8,
          }}>
            {WEEKDAYS.map((wd, idx) => {
              const val = d.heatmap[idx]
              const intensity = val / maxHeat
              const bg = `rgba(196,85,59,${0.08 + intensity * 0.62})`
              return (
                <div key={wd} style={{
                  padding: '12px 8px', borderRadius: 12, textAlign: 'center',
                  background: bg, border: `1px solid rgba(196,85,59,${0.15 + intensity * 0.25})`,
                }}>
                  <p style={{
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                    fontSize: 10, fontWeight: 700,
                    color: intensity > 0.5 ? '#FFFFFF' : '#7A5C4F',
                    letterSpacing: '.1em', textTransform: 'uppercase', margin: 0,
                  }}>{wd}</p>
                  <p style={{
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                    fontSize: 12, fontWeight: 700,
                    color: intensity > 0.5 ? '#FFFFFF' : '#2C1A0F',
                    letterSpacing: '-0.2px', margin: '4px 0 0',
                  }}>{val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toFixed(0)}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 720px) {
          .gastos-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </SectionShell>
  )
}

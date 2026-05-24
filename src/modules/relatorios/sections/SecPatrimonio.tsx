// ─── Patrimônio: area 12m + breakdown ──────────────────────────────
import { IconCoin, IconBuildingBank, IconChartLine, IconCreditCardOff } from '@tabler/icons-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { ChartContainer } from '@/components/ui/ChartContainer'
import { SectionShell } from '../components/SectionShell'
import { ChartTooltip } from '../components/ChartTooltip'
import { fmt } from '@/lib/format'
import type { RelatoriosData } from '../lib/useRelatoriosData'

interface Props { d: RelatoriosData }

export function SecPatrimonio({ d }: Props) {
  // Evolução do saldo acumulado nos últimos 12m
  const chartData = d.serie12m.map(p => ({
    label: p.label,
    Patrimonio: d.saldoContas - d.serie12m[d.serie12m.length - 1].saldoAcumulado + p.saldoAcumulado,
  }))

  const breakdown = [
    { label: 'Contas',       valor: d.saldoContas,     color: '#3A8580', icon: IconBuildingBank },
    { label: 'Investido',    valor: d.totalInvestido,  color: '#504E76', icon: IconChartLine },
    { label: 'Dívidas',      valor: -d.totalDividas,   color: '#A8442B', icon: IconCreditCardOff },
  ]
  const total = d.patrimonioLiquido

  return (
    <SectionShell
      id="patrimonio"
      eyebrow="Patrimônio"
      title="Evolução & composição"
      description="Patrimônio líquido = Contas + Investimentos − Dívidas. Mostra de onde vem cada parte."
      icon={<IconCoin size={18} stroke={2} color="#504E76" />}
      accent="#504E76"
    >
      <div style={{
        display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24,
      }} className="patrim-grid">
        {/* Chart */}
        <div style={{ minWidth: 0 }}>
          <ChartContainer height={260}>
            <AreaChart data={chartData} margin={{ top: 10, right: 12, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="patrim-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#504E76" stopOpacity={0.42} />
                    <stop offset="100%" stopColor="#504E76" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#F0E9DD" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false}
                  tick={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fill: '#7A5C4F', fontWeight: 600 }} />
                <YAxis axisLine={false} tickLine={false}
                  tick={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fill: '#9B7B6A' }}
                  tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`} width={48} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#9B7B6A', strokeDasharray: '3 3', strokeWidth: 1 }} />
                <Area type="monotone" dataKey="Patrimonio" name="Patrimônio"
                  stroke="#504E76" strokeWidth={2.8} fill="url(#patrim-grad)" />
            </AreaChart>
          </ChartContainer>
        </div>

        {/* Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <p style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 10, fontWeight: 700,
              color: '#7A5C4F', letterSpacing: '.14em', textTransform: 'uppercase',
              margin: '0 0 6px',
            }}>Patrimônio líquido</p>
            <p style={{
              fontFamily: "'Fraunces',Georgia,serif",
              fontSize: 36, fontWeight: 700, color: '#2C1A0F',
              letterSpacing: '-1px', margin: 0, lineHeight: 1,
            }}>{fmt(total)}</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
            {breakdown.map(b => {
              const Icon = b.icon
              return (
                <div key={b.label} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', borderRadius: 12,
                  background: `${b.color}0d`, border: `1px solid ${b.color}26`,
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 9,
                    background: `${b.color}1f`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={15} stroke={2.2} color={b.color} />
                  </div>
                  <span style={{
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                    fontSize: 13, fontWeight: 600, color: '#2C1A0F', flex: 1,
                  }}>{b.label}</span>
                  <span style={{
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                    fontSize: 15, fontWeight: 700, color: b.color,
                    letterSpacing: '-0.3px',
                  }}>{b.valor < 0 ? '−' : ''}{fmt(Math.abs(b.valor))}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 720px) {
          .patrim-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </SectionShell>
  )
}

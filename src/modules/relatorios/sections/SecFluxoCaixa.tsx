// ─── Fluxo de Caixa: area chart + cards de extremos ────────────────
import {
  IconArrowsExchange, IconArrowUp, IconArrowDown, IconTrendingUp, IconTrendingDown,
} from '@tabler/icons-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { ChartContainer } from '@/components/ui/ChartContainer'
import { SectionShell } from '../components/SectionShell'
import { ChartTooltip } from '../components/ChartTooltip'
import { fmt } from '@/lib/format'
import type { RelatoriosData } from '../lib/useRelatoriosData'

interface Props { d: RelatoriosData }

export function SecFluxoCaixa({ d }: Props) {
  const serie = d.serie
  const chartData = serie.map(p => ({
    label: p.label,
    Receitas: p.receitas,
    Despesas: p.despesas,
    Saldo: p.saldo,
  }))

  return (
    <SectionShell
      id="fluxo-caixa"
      eyebrow="Fluxo de caixa"
      title="Receitas vs Despesas no tempo"
      description={`Evolução mensal do período. Identifica picos, vales e saldo líquido.`}
      icon={<IconArrowsExchange size={18} stroke={2} color="#3D7EB5" />}
      accent="#3D7EB5"
    >
      {serie.length === 0 ? (
        <EmptyChart text="Sem transações nesse período." />
      ) : (
        <>
          {/* Chart */}
          <ChartContainer height={280}>
            <AreaChart data={chartData} margin={{ top: 10, right: 12, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="rec-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3A8580" stopOpacity={0.32} />
                    <stop offset="100%" stopColor="#3A8580" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="des-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#C4553B" stopOpacity={0.32} />
                    <stop offset="100%" stopColor="#C4553B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#F0E9DD" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false}
                  tick={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fill: '#7A5C4F', fontWeight: 600 }} />
                <YAxis axisLine={false} tickLine={false}
                  tick={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fill: '#9B7B6A' }}
                  tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`} width={48} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#9B7B6A', strokeDasharray: '3 3', strokeWidth: 1 }} />
                <Area type="monotone" dataKey="Receitas" stroke="#3A8580" strokeWidth={2.4} fill="url(#rec-grad)" />
                <Area type="monotone" dataKey="Despesas" stroke="#C4553B" strokeWidth={2.4} fill="url(#des-grad)" />
                <Legend
                  wrapperStyle={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600, paddingTop: 6 }}
                  iconType="circle" iconSize={8} />
            </AreaChart>
          </ChartContainer>

          {/* Cards de extremos */}
          <div style={{
            marginTop: 18, paddingTop: 16, borderTop: '1px dashed #EDE6DC',
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12,
          }}>
            {d.extremos.maisCaro && (
              <ExtremoCard
                label="Mês mais caro" icon={IconTrendingUp}
                color="#A8442B"
                value={fmt(d.extremos.maisCaro.despesas)}
                subtitle={d.extremos.maisCaro.labelLong}
              />
            )}
            {d.extremos.maisEconomico && (
              <ExtremoCard
                label="Mês mais econômico" icon={IconTrendingDown}
                color="#1E7D5A"
                value={fmt(d.extremos.maisEconomico.despesas)}
                subtitle={d.extremos.maisEconomico.labelLong}
              />
            )}
            {d.extremos.melhorSaldo && (
              <ExtremoCard
                label="Melhor saldo" icon={IconArrowUp}
                color="#1E7D5A"
                value={fmt(d.extremos.melhorSaldo.saldo)}
                subtitle={d.extremos.melhorSaldo.labelLong}
              />
            )}
            {d.extremos.piorSaldo && (
              <ExtremoCard
                label="Pior saldo" icon={IconArrowDown}
                color="#A8442B"
                value={fmt(d.extremos.piorSaldo.saldo)}
                subtitle={d.extremos.piorSaldo.labelLong}
              />
            )}
          </div>
        </>
      )}
    </SectionShell>
  )
}

function ExtremoCard({ label, icon: Icon, color, value, subtitle }: {
  label: string; icon: typeof IconTrendingUp; color: string; value: string; subtitle: string
}) {
  return (
    <div style={{
      padding: '12px 14px', borderRadius: 12,
      background: `${color}0d`, border: `1px solid ${color}33`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <Icon size={13} stroke={2.2} color={color} />
        <span style={{
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          fontSize: 10, fontWeight: 700,
          color, letterSpacing: '.1em', textTransform: 'uppercase',
        }}>{label}</span>
      </div>
      <p style={{
        fontFamily: "'Plus Jakarta Sans',sans-serif",
        fontSize: 18, fontWeight: 700, color: '#2C1A0F',
        letterSpacing: '-0.3px', margin: 0, lineHeight: 1.1,
      }}>{value}</p>
      <p style={{
        fontFamily: "'Plus Jakarta Sans',sans-serif",
        fontSize: 11, color: '#7A5C4F', margin: '4px 0 0',
        fontWeight: 500, textTransform: 'capitalize',
      }}>{subtitle}</p>
    </div>
  )
}

export function EmptyChart({ text }: { text: string }) {
  return (
    <div style={{
      padding: '40px 20px', textAlign: 'center',
      background: '#FBF8F3', borderRadius: 14, border: '1px dashed #EDE6DC',
    }}>
      <p style={{
        fontFamily: "'Plus Jakarta Sans',sans-serif",
        fontSize: 13, color: '#7A5C4F', margin: 0, fontWeight: 500,
      }}>{text}</p>
    </div>
  )
}

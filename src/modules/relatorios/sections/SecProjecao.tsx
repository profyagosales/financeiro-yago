// ─── Projeção de Saldo: line chart com forecast + bandas ───────────
import { IconChartArrows, IconArrowUpRight, IconArrowDownRight, IconWaveSawTool } from '@tabler/icons-react'
import {
  ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, Legend,
} from 'recharts'
import { SectionShell } from '../components/SectionShell'
import { ChartTooltip } from '../components/ChartTooltip'
import { fmt } from '@/lib/format'
import type { RelatoriosData } from '../lib/useRelatoriosData'

interface Props { d: RelatoriosData }

export function SecProjecao({ d }: Props) {
  const data = d.projecao.map(p => ({
    label: p.label,
    Esperado: p.esperado,
    Otimista: p.isProjetado ? p.otimista : null,
    Pessimista: p.isProjetado ? p.pessimista : null,
    isProj: p.isProjetado,
  }))

  // Encontra o índice onde começa a projeção pra desenhar linha de referência
  const idxProj = d.projecao.findIndex(p => p.isProjetado)
  const labelInicioProj = idxProj > 0 ? d.projecao[idxProj].label : null

  const lastReal = d.projecao.filter(p => !p.isProjetado).slice(-1)[0]
  const lastProj = d.projecao[d.projecao.length - 1]
  const projDelta = lastReal && lastProj ? lastProj.esperado - lastReal.esperado : 0

  return (
    <SectionShell
      id="projecao"
      eyebrow="Projeção"
      title="Pra onde o saldo está indo"
      description="Forecast de 6 meses baseado em regressão sobre últimos 12m. Bandas otimista/pessimista mostram intervalo de confiança."
      icon={<IconChartArrows size={18} stroke={2} color="#A8730F" />}
      accent="#D4A017"
    >
      <div style={{ width: '100%', height: 280, minWidth: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 12, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="banda-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#D4A017" stopOpacity={0.22} />
                <stop offset="100%" stopColor="#D4A017" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#F0E9DD" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" axisLine={false} tickLine={false}
              tick={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fill: '#7A5C4F', fontWeight: 600 }} />
            <YAxis axisLine={false} tickLine={false}
              tick={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fill: '#9B7B6A' }}
              tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`} width={48} />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#9B7B6A', strokeDasharray: '3 3' }} />
            {/* Banda otimista */}
            <Area type="monotone" dataKey="Otimista" stroke="none" fill="url(#banda-grad)" connectNulls />
            {/* Linha esperada (sólida real + tracejada projetada via stroke patterns? — apenas sólida pra simplicidade) */}
            <Line type="monotone" dataKey="Esperado" stroke="#504E76" strokeWidth={2.8} dot={false} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="Otimista" stroke="#1E7D5A" strokeWidth={1.6} strokeDasharray="4 4" dot={false} />
            <Line type="monotone" dataKey="Pessimista" stroke="#A8442B" strokeWidth={1.6} strokeDasharray="4 4" dot={false} />
            {labelInicioProj && (
              <ReferenceLine x={labelInicioProj} stroke="#D4A017" strokeWidth={1.5} strokeDasharray="5 3"
                label={{ value: 'Hoje', position: 'top', fontSize: 10, fill: '#A8730F', fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700 }} />
            )}
            <Legend
              wrapperStyle={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600, paddingTop: 6 }}
              iconType="circle" iconSize={8} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Footer com leituras */}
      <div style={{
        marginTop: 18, paddingTop: 16, borderTop: '1px dashed #EDE6DC',
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14,
      }}>
        <Leitura label="Hoje"
          value={fmt(lastReal?.esperado ?? d.saldoContas)}
          icon={IconWaveSawTool} color="#504E76" />
        {lastProj && (
          <Leitura label="Esperado +6m"
            value={fmt(lastProj.esperado)}
            icon={projDelta >= 0 ? IconArrowUpRight : IconArrowDownRight}
            color={projDelta >= 0 ? '#1E7D5A' : '#A8442B'}
            subtitle={`${projDelta >= 0 ? '+' : ''}${fmt(projDelta)}`} />
        )}
        {lastProj && (
          <Leitura label="Otimista +6m"
            value={fmt(lastProj.otimista)}
            icon={IconArrowUpRight} color="#1E7D5A" />
        )}
        {lastProj && (
          <Leitura label="Pessimista +6m"
            value={fmt(lastProj.pessimista)}
            icon={IconArrowDownRight} color="#A8442B" />
        )}
      </div>
    </SectionShell>
  )
}

function Leitura({ label, value, icon: Icon, color, subtitle }: {
  label: string; value: string; icon: typeof IconChartArrows; color: string; subtitle?: string
}) {
  return (
    <div style={{
      padding: '12px 14px', borderRadius: 12,
      background: `${color}0d`, border: `1px solid ${color}26`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <Icon size={13} stroke={2.2} color={color} />
        <span style={{
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          fontSize: 10, fontWeight: 700, color,
          letterSpacing: '.1em', textTransform: 'uppercase',
        }}>{label}</span>
      </div>
      <p style={{
        fontFamily: "'Plus Jakarta Sans',sans-serif",
        fontSize: 17, fontWeight: 700, color: '#2C1A0F',
        letterSpacing: '-0.3px', margin: 0, lineHeight: 1.1,
      }}>{value}</p>
      {subtitle && (
        <p style={{
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          fontSize: 11, fontWeight: 600, color, margin: '4px 0 0',
        }}>{subtitle}</p>
      )}
    </div>
  )
}

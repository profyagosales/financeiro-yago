import { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { IconArrowUpRight, IconArrowDownRight, IconTrophy, IconAlertTriangle } from '@tabler/icons-react'
import { useInvestimentos, useTotalInvestimentos } from '@/db/hooks/useInvestimentos'
import { fmt } from '@/lib/format'
import { TIPOS as INV_TIPOS, TIPO_META, CLASSE_COR, CLASSE_LABEL } from '../investimentos/constants'

const DISPLAY: React.CSSProperties = { fontFamily: "'Fraunces',Georgia,serif", fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1.1 }
const LABEL: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '.09em', textTransform: 'uppercase', color: '#9B7B6A' }
const CARD: React.CSSProperties = { background: '#FFFFFF', border: '1px solid #EDE6DC', borderRadius: 20, boxShadow: '0 1px 3px rgba(44,26,15,0.05), 0 4px 16px rgba(44,26,15,0.06)' }

export function TabInvestimentos() {
  const investimentos = useInvestimentos()
  const { total, aplicado, rendimento } = useTotalInvestimentos()
  const rendPct = aplicado > 0 ? (rendimento / aplicado) * 100 : 0
  const positivo = rendimento >= 0

  // Distribuição por classe
  const distClasse = useMemo(() => {
    const acc: Record<'fixa'|'variavel'|'cripto'|'caixa', number> = { fixa: 0, variavel: 0, cripto: 0, caixa: 0 }
    investimentos.forEach(i => {
      const tm = TIPO_META.get(i.tipo)
      if (tm) acc[tm.classe] += i.valorAtual
    })
    return Object.entries(acc)
      .map(([k, v]) => ({ name: CLASSE_LABEL[k as keyof typeof CLASSE_LABEL], value: v, cor: CLASSE_COR[k as keyof typeof CLASSE_COR] }))
      .filter(d => d.value > 0)
  }, [investimentos])

  // Distribuição por tipo
  const distTipo = useMemo(() => {
    return INV_TIPOS.map(t => ({
      tipo: t.label,
      valor: investimentos.filter(i => i.tipo === t.value).reduce((s, i) => s + i.valorAtual, 0),
      cor: t.cor,
    })).filter(d => d.valor > 0).sort((a, b) => b.valor - a.valor)
  }, [investimentos])

  // Top performers
  const topPerformers = useMemo(() => {
    return investimentos
      .map(i => ({
        ...i,
        rendimento: i.valorAtual - i.valorAplicado,
        rendPct: i.valorAplicado > 0 ? ((i.valorAtual - i.valorAplicado) / i.valorAplicado) * 100 : 0,
      }))
      .sort((a, b) => b.rendPct - a.rendPct)
      .slice(0, 5)
  }, [investimentos])

  // Vencendo nos próximos 90 dias
  const vencendoBrevemente = useMemo(() => {
    const limite = Date.now() + 90 * 24 * 60 * 60 * 1000
    return investimentos
      .filter(i => i.dataVencimento && new Date(i.dataVencimento + 'T00:00:00').getTime() <= limite)
      .sort((a, b) => (a.dataVencimento ?? '').localeCompare(b.dataVencimento ?? ''))
  }, [investimentos])

  if (investimentos.length === 0) {
    return (
      <div style={{ ...CARD, padding: 48, textAlign: 'center' }}>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, color: '#9B7B6A' }}>
          Sem investimentos cadastrados ainda. Vá em Patrimônio › Investimentos para começar.
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <StatCard label="Patrimônio investido" value={fmt(total)} cor="#3A8580" />
        <StatCard label="Total aplicado" value={fmt(aplicado)} cor="#7A5C4F" />
        <StatCard
          label="Rendimento"
          value={fmt(rendimento)}
          sub={`${positivo ? '+' : ''}${rendPct.toFixed(2)}%`}
          cor={positivo ? '#3A8580' : '#C4553B'}
          icon={positivo ? <IconArrowUpRight size={14} stroke={2.4} color="#3A8580" /> : <IconArrowDownRight size={14} stroke={2.4} color="#C4553B" />}
        />
        <StatCard
          label="Ativos cadastrados"
          value={String(investimentos.length)}
          sub={`em ${distTipo.length} ${distTipo.length === 1 ? 'tipo' : 'tipos'}`}
          cor="#D4A017"
        />
      </div>

      {/* Distribuição (donut + bar) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'stretch' }}>

        {/* Donut por classe */}
        <div style={{ ...CARD, padding: 22, height: '100%' }}>
          <h3 style={{ ...DISPLAY, fontSize: 16, color: '#2C1A0F', marginBottom: 4 }}>Distribuição da carteira</h3>
          <p style={{ ...LABEL, marginBottom: 16 }}>Por classe de ativo</p>
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={distClasse} cx="50%" cy="50%" innerRadius={56} outerRadius={84} paddingAngle={3} dataKey="value">
                  {distClasse.map((d, i) => <Cell key={i} fill={d.cor} />)}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => active && payload?.[0] ? (
                    <div style={{ background: '#1A0A05', borderRadius: 10, padding: '8px 12px' }}>
                      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: 'rgba(255,255,255,0.45)', letterSpacing: '.06em', textTransform: 'uppercase', margin: 0 }}>{payload[0].payload.name}</p>
                      <p style={{ ...DISPLAY, fontSize: 14, color: '#fff', margin: '4px 0 0' }}>{fmt(payload[0].value as number)}</p>
                    </div>
                  ) : null}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
            {distClasse.map(d => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: d.cor }}/>
                <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#2C1A0F', flex: 1 }}>{d.name}</span>
                <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#7A5C4F', fontWeight: 600 }}>{((d.value / total) * 100).toFixed(0)}%</span>
                <span style={{ ...DISPLAY, fontSize: 12, color: '#2C1A0F', minWidth: 70, textAlign: 'right' }}>{fmt(d.value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bar chart por tipo */}
        <div style={{ ...CARD, padding: 22, height: '100%' }}>
          <h3 style={{ ...DISPLAY, fontSize: 16, color: '#2C1A0F', marginBottom: 4 }}>Patrimônio por tipo</h3>
          <p style={{ ...LABEL, marginBottom: 16 }}>Ranking de alocação</p>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={distTipo} layout="vertical" margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
                <CartesianGrid stroke="rgba(44,26,15,0.06)" horizontal={false} />
                <XAxis type="number" tick={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, fill: '#9B7B6A' }} axisLine={false} tickLine={false}
                  tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)}
                />
                <YAxis type="category" dataKey="tipo" tick={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11, fill: '#2C1A0F' }} axisLine={false} tickLine={false} width={110} />
                <Tooltip
                  content={({ active, payload }) => active && payload?.[0] ? (
                    <div style={{ background: '#1A0A05', borderRadius: 10, padding: '8px 12px' }}>
                      <p style={{ ...DISPLAY, fontSize: 13, color: '#fff' }}>{fmt(payload[0].value as number)}</p>
                    </div>
                  ) : null}
                />
                <Bar dataKey="valor" radius={[0, 6, 6, 0]}>
                  {distTipo.map((d, i) => <Cell key={i} fill={d.cor} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top performers + vencimentos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, alignItems: 'stretch' }}>

        {/* Top performers */}
        <div style={{ ...CARD, padding: 22, height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3 style={{ ...DISPLAY, fontSize: 16, color: '#2C1A0F' }}>Top performers</h3>
            <span style={{ ...LABEL, color: '#7A5C4F' }}>por rendimento %</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {topPerformers.map((p, idx) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ ...DISPLAY, fontSize: 18, color: idx === 0 ? '#D4A017' : 'rgba(122,92,79,0.5)', minWidth: 22, textAlign: 'center' }}>{idx + 1}</span>
                {idx === 0 && <IconTrophy size={14} stroke={2} color="#D4A017" />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700, color: '#2C1A0F', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nome}</p>
                  <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: '#7A5C4F', margin: '2px 0 0' }}>
                    {TIPO_META.get(p.tipo)?.label} {p.instituicao && `· ${p.instituicao}`}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: p.rendPct >= 0 ? '#3A8580' : '#C4553B', margin: 0 }}>
                    {p.rendPct >= 0 ? '+' : ''}{p.rendPct.toFixed(2)}%
                  </p>
                  <p style={{ ...DISPLAY, fontSize: 13, color: '#2C1A0F', margin: '2px 0 0' }}>{fmt(p.valorAtual)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Vencendo */}
        <div style={{ ...CARD, padding: 22, height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <IconAlertTriangle size={16} stroke={2} color="#D4A017" />
            <h3 style={{ ...DISPLAY, fontSize: 16, color: '#2C1A0F' }}>Vencendo em 90 dias</h3>
          </div>
          {vencendoBrevemente.length === 0 ? (
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#9B7B6A', margin: 0 }}>
              Nenhum investimento vencendo no curto prazo.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {vencendoBrevemente.map(i => {
                const dias = Math.ceil((new Date(i.dataVencimento! + 'T00:00:00').getTime() - Date.now()) / 86400000)
                return (
                  <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#FBF3DD', borderRadius: 8 }}>
                    <span style={{ width: 6, height: 6, borderRadius: 3, background: '#D4A017', flexShrink: 0 }}/>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: '#2C1A0F', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.nome}</p>
                      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, color: '#7A5C4F', margin: '1px 0 0' }}>
                        {dias > 0 ? `em ${dias} dias` : 'vencido'}
                      </p>
                    </div>
                    <span style={{ ...DISPLAY, fontSize: 12, color: '#2C1A0F' }}>{fmt(i.valorAtual)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, cor, icon }: { label: string; value: string; sub?: string; cor: string; icon?: React.ReactNode }) {
  return (
    <div style={{ ...CARD, padding: '16px 18px', borderLeft: `3px solid ${cor}` }}>
      <p style={{ ...LABEL, color: '#7A5C4F' }}>{label}</p>
      <p style={{ ...DISPLAY, fontSize: 22, color: '#2C1A0F', margin: '6px 0 0', letterSpacing: '-0.7px' }}>{value}</p>
      {sub && (
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: cor, margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
          {icon}{sub}
        </p>
      )}
    </div>
  )
}

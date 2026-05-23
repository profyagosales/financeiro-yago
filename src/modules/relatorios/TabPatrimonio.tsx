import { useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { IconArrowUpRight, IconArrowDownRight, IconTrophy } from '@tabler/icons-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useSaldoTotal } from '@/db/hooks/useContas'
import { useTotalInvestimentos } from '@/db/hooks/useInvestimentos'
import { useTotalDividas } from '@/db/hooks/useDividas'
import { db } from '@/db/schema'
import { fmt } from '@/lib/format'

const DISPLAY: React.CSSProperties = { fontFamily: "'Fraunces',Georgia,serif", fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1.1 }
const LABEL: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '.09em', textTransform: 'uppercase', color: '#9B7B6A' }
const CARD: React.CSSProperties = { background: '#FFFFFF', border: '1px solid #EDE6DC', borderRadius: 20, boxShadow: '0 1px 3px rgba(44,26,15,0.05), 0 4px 16px rgba(44,26,15,0.06)' }

const MARCOS = [10000, 25000, 50000, 100000, 250000, 500000, 1000000]

export function TabPatrimonio() {
  const saldoContas = useSaldoTotal()
  const { total: totalInvest, rendimento: rendInvest } = useTotalInvestimentos()
  const { totalDevido } = useTotalDividas()

  const ativos = saldoContas + totalInvest
  const liquido = ativos - totalDevido

  // Evolução 12 meses (mesma lógica do patrimônio)
  const txs = useLiveQuery(() => db.transacoes.toArray(), []) ?? []
  const evolucao = useMemo(() => {
    const now = new Date()
    const meses: { mes: string; valor: number; ativos: number; passivos: number; data: Date }[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      meses.push({
        mes: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
        valor: 0, ativos: 0, passivos: 0,
        data: d,
      })
    }
    for (let i = meses.length - 1; i >= 0; i--) {
      const m = meses[i]
      if (i === meses.length - 1) {
        m.valor = liquido
        m.ativos = ativos
        m.passivos = totalDevido
      } else {
        const prox = meses[i + 1]
        const inicio = prox.data.toISOString().split('T')[0]
        const fim = new Date(prox.data.getFullYear(), prox.data.getMonth() + 1, 0).toISOString().split('T')[0]
        const txsMes = txs.filter(t => t.data >= inicio && t.data <= fim)
        const rec = txsMes.filter(t => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0)
        const des = txsMes.filter(t => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0)
        const fluxo = rec - des
        m.valor = prox.valor - fluxo
        m.ativos = prox.ativos - fluxo // simplificação
        m.passivos = prox.passivos
      }
    }
    return meses.map(m => ({
      mes: m.mes.charAt(0).toUpperCase() + m.mes.slice(1),
      patrimonio: Math.round(m.valor * 100) / 100,
      ativos: Math.round(m.ativos * 100) / 100,
      passivos: Math.round(m.passivos * 100) / 100,
    }))
  }, [txs, liquido, ativos, totalDevido])

  // Delta 12 meses
  const primeiro = evolucao[0]?.patrimonio ?? 0
  const ultimo = evolucao[evolucao.length - 1]?.patrimonio ?? 0
  const delta12m = ultimo - primeiro
  const deltaPct = primeiro !== 0 ? (delta12m / Math.abs(primeiro)) * 100 : 0
  const positivo = delta12m >= 0

  // Marcos batidos
  const marcosBatidos = MARCOS.filter(m => liquido >= m)
  const proximoMarco = MARCOS.find(m => liquido < m)
  const progressoMarco = proximoMarco ? (liquido / proximoMarco) * 100 : 100

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <StatCard label="Patrimônio Líquido" value={fmt(liquido)} cor={liquido >= 0 ? '#3A8580' : '#C4553B'} />
        <StatCard label="Ativos totais" value={fmt(ativos)} cor="#1E7D5A" />
        <StatCard label="Passivos" value={fmt(totalDevido)} cor="#A8442B" />
        <StatCard
          label="Variação 12m"
          value={fmt(delta12m)}
          sub={`${positivo ? '+' : ''}${deltaPct.toFixed(1)}%`}
          cor={positivo ? '#3A8580' : '#C4553B'}
          icon={positivo ? <IconArrowUpRight size={14} stroke={2.4} color="#3A8580" /> : <IconArrowDownRight size={14} stroke={2.4} color="#C4553B" />}
        />
      </div>

      {/* Evolução chart */}
      <div style={{ ...CARD, padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h3 style={{ ...DISPLAY, fontSize: 18, color: '#2C1A0F' }}>Evolução do patrimônio</h3>
            <p style={{ ...LABEL, color: '#7A5C4F', marginTop: 4 }}>Últimos 12 meses</p>
          </div>
        </div>
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <AreaChart data={evolucao} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="grad-pat" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3A8580" stopOpacity={0.4}/>
                  <stop offset="100%" stopColor="#3A8580" stopOpacity={0.02}/>
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(44,26,15,0.06)" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 11, fill: '#7A5C4F' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, fill: '#9B7B6A' }}
                axisLine={false} tickLine={false}
                tickFormatter={v => Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
              />
              <Tooltip
                content={({ active, payload }) => active && payload?.[0] ? (
                  <div style={{ background: '#1A0A05', borderRadius: 10, padding: '8px 12px' }}>
                    <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: 'rgba(255,255,255,0.45)', letterSpacing: '.06em', textTransform: 'uppercase', margin: 0 }}>{payload[0].payload.mes}</p>
                    <p style={{ ...DISPLAY, fontSize: 14, color: '#A7E0DC', margin: '4px 0 0' }}>{fmt(payload[0].value as number)}</p>
                  </div>
                ) : null}
              />
              <Area type="monotone" dataKey="patrimonio" stroke="#3A8580" strokeWidth={2.5} fill="url(#grad-pat)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Marcos + Composição */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16, alignItems: 'stretch' }}>

        {/* Marcos */}
        <div style={{ ...CARD, padding: 22, height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <IconTrophy size={16} stroke={2} color="#D4A017" />
            <h3 style={{ ...DISPLAY, fontSize: 16, color: '#2C1A0F' }}>Marcos do patrimônio</h3>
          </div>
          <p style={{ ...LABEL, marginBottom: 16 }}>Conquistas baseadas em R$</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {MARCOS.map(m => {
              const batido = liquido >= m
              const isProximo = !batido && m === proximoMarco
              return (
                <div key={m} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px',
                  background: batido ? '#E8F4F2' : isProximo ? '#FBF3DD' : '#FBF8F3',
                  border: `1px solid ${batido ? 'rgba(58,133,128,0.25)' : isProximo ? 'rgba(212,160,23,0.3)' : '#EDE6DC'}`,
                  borderRadius: 10,
                  opacity: batido || isProximo ? 1 : 0.6,
                }}>
                  {batido ? (
                    <IconTrophy size={14} stroke={2} color="#1E7D5A" />
                  ) : isProximo ? (
                    <span style={{ width: 14, height: 14, borderRadius: 7, border: '2px solid #D4A017' }}/>
                  ) : (
                    <span style={{ width: 14, height: 14, borderRadius: 7, border: '2px solid #D4C8BC' }}/>
                  )}
                  <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700, color: batido ? '#1E7D5A' : isProximo ? '#A8730F' : '#7A5C4F', flex: 1 }}>
                    {fmt(m)}
                  </span>
                  {isProximo && (
                    <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: '#A8730F' }}>
                      {progressoMarco.toFixed(0)}%
                    </span>
                  )}
                  {batido && (
                    <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: '#1E7D5A' }}>conquistado</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Composição */}
        <div style={{ ...CARD, padding: 22, height: '100%' }}>
          <h3 style={{ ...DISPLAY, fontSize: 16, color: '#2C1A0F', marginBottom: 4 }}>Composição atual</h3>
          <p style={{ ...LABEL, marginBottom: 16 }}>Como seu patrimônio está dividido</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <CompRow label="Contas" valor={saldoContas} total={ativos + totalDevido} cor="#3A8580" />
            <CompRow label="Investimentos" valor={totalInvest} total={ativos + totalDevido} cor="#1E7D5A" sub={rendInvest !== 0 ? `${rendInvest >= 0 ? '+' : ''}${fmt(rendInvest)} de rendimento` : undefined} />
            <CompRow label="Dívidas (passivo)" valor={totalDevido} total={ativos + totalDevido} cor="#A8442B" />
          </div>
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

function CompRow({ label, valor, total, cor, sub }: { label: string; valor: number; total: number; cor: string; sub?: string }) {
  const pct = total > 0 ? (valor / total) * 100 : 0
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ width: 8, height: 8, borderRadius: 2, background: cor }}/>
        <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, color: '#2C1A0F', flex: 1 }}>{label}</span>
        <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#7A5C4F', fontWeight: 600 }}>{pct.toFixed(0)}%</span>
        <span style={{ ...DISPLAY, fontSize: 13, color: '#2C1A0F', minWidth: 80, textAlign: 'right' }}>{fmt(valor)}</span>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: 'rgba(44,26,15,0.06)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: cor, borderRadius: 2 }}/>
      </div>
      {sub && (
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: '#7A5C4F', margin: '4px 0 0' }}>{sub}</p>
      )}
    </div>
  )
}

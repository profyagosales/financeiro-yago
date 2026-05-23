import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { IconFlame, IconClockHour4, IconCash, IconCheck } from '@tabler/icons-react'
import { useDividasComputed, useTotalDividas } from '@/db/hooks/useDividas'
import { fmt } from '@/lib/format'
import { TIPO_META } from '../dividas/constants'

const DISPLAY: React.CSSProperties = { fontFamily: "'Fraunces',Georgia,serif", fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1.1 }
const LABEL: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '.09em', textTransform: 'uppercase', color: '#9B7B6A' }
const CARD: React.CSSProperties = { background: '#FFFFFF', border: '1px solid #EDE6DC', borderRadius: 20, boxShadow: '0 1px 3px rgba(44,26,15,0.05), 0 4px 16px rgba(44,26,15,0.06)' }

export function TabDividas() {
  const dividas = useDividasComputed()
  const ativas = dividas.filter(d => !d.quitada)
  const quitadas = dividas.filter(d => d.quitada)
  const { totalDevido, totalParcelaMensal } = useTotalDividas()

  // Total já pago
  const totalPago = dividas.reduce((s, d) => s + d.valorPago, 0)
  // Total original (todas as dívidas)
  const totalOriginal = dividas.reduce((s, d) => s + d.valorTotal, 0)

  // Prazo máximo (data mais distante de quitação)
  const prazoMaximoMeses = ativas.length > 0 ? Math.max(...ativas.map(d => d.parcelasRestantes)) : 0

  // Debt avalanche (maior juros primeiro)
  const avalanche = useMemo(() => {
    return [...ativas].sort((a, b) => (b.jurosAnual ?? 0) - (a.jurosAnual ?? 0))
  }, [ativas])

  // Dívidas com juros mais altos (visualização)
  const taxasChart = useMemo(() => {
    return ativas
      .filter(d => d.jurosAnual)
      .map(d => ({
        nome: d.nome,
        taxa: (d.jurosAnual ?? 0) * 100,
        cor: TIPO_META.get(d.tipo)?.cor ?? '#C4553B',
      }))
      .sort((a, b) => b.taxa - a.taxa)
      .slice(0, 8)
  }, [ativas])

  // Distribuição por tipo
  const distTipo = useMemo(() => {
    const map = new Map<string, number>()
    ativas.forEach(d => map.set(d.tipo, (map.get(d.tipo) ?? 0) + d.saldoDevedor))
    return Array.from(map.entries())
      .map(([tipo, valor]) => ({ tipo, valor, tm: TIPO_META.get(tipo as any) }))
      .sort((a, b) => b.valor - a.valor)
  }, [ativas])

  if (dividas.length === 0) {
    return (
      <div style={{ ...CARD, padding: 48, textAlign: 'center' }}>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, color: '#9B7B6A' }}>
          Sem dívidas cadastradas. Vá em Patrimônio › Dívidas se precisar registrar empréstimos ou financiamentos.
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <StatCard label="Saldo devedor" value={fmt(totalDevido)} cor="#A8442B" />
        <StatCard label="Parcela mensal total" value={fmt(totalParcelaMensal)} cor="#C4553B" />
        <StatCard
          label="Já pago"
          value={fmt(totalPago)}
          sub={totalOriginal > 0 ? `${((totalPago / totalOriginal) * 100).toFixed(0)}% do total` : undefined}
          cor="#3A8580"
        />
        <StatCard
          label="Prazo restante"
          value={`${prazoMaximoMeses} ${prazoMaximoMeses === 1 ? 'mês' : 'meses'}`}
          sub={ativas.length > 0 ? `${ativas.length} dívida${ativas.length > 1 ? 's' : ''} ativa${ativas.length > 1 ? 's' : ''}` : 'tudo pago'}
          cor="#D4A017"
        />
      </div>

      {/* Debt avalanche + Taxas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16, alignItems: 'stretch' }}>

        {/* Avalanche */}
        <div style={{ ...CARD, padding: 22, height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <IconFlame size={16} stroke={2} color="#C4553B" />
            <h3 style={{ ...DISPLAY, fontSize: 16, color: '#2C1A0F' }}>Ordem de ataque (avalanche)</h3>
          </div>
          <p style={{ ...LABEL, marginBottom: 16 }}>Quitar primeiro as de maior juros</p>
          {avalanche.length === 0 ? (
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#9B7B6A' }}>Nenhuma dívida ativa.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {avalanche.slice(0, 6).map((d, idx) => (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ ...DISPLAY, fontSize: 18, color: idx === 0 ? '#C4553B' : 'rgba(122,92,79,0.5)', minWidth: 22, textAlign: 'center' }}>{idx + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700, color: '#2C1A0F', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.nome}</p>
                    <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: '#7A5C4F', margin: '2px 0 0' }}>
                      {TIPO_META.get(d.tipo)?.label}{d.instituicao && ` · ${d.instituicao}`}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {d.jurosAnual ? (
                      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: '#C4553B', margin: 0 }}>
                        {(d.jurosAnual * 100).toFixed(1)}% a.a.
                      </p>
                    ) : (
                      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 500, color: '#9B7B6A', margin: 0 }}>—</p>
                    )}
                    <p style={{ ...DISPLAY, fontSize: 13, color: '#2C1A0F', margin: '2px 0 0' }}>{fmt(d.saldoDevedor)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chart de taxas */}
        <div style={{ ...CARD, padding: 22, height: '100%' }}>
          <h3 style={{ ...DISPLAY, fontSize: 16, color: '#2C1A0F', marginBottom: 4 }}>Comparativo de taxas</h3>
          <p style={{ ...LABEL, marginBottom: 16 }}>Juros anuais (%)</p>
          {taxasChart.length === 0 ? (
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#9B7B6A' }}>Nenhuma dívida com juros cadastrados.</p>
          ) : (
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer>
                <BarChart data={taxasChart} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(44,26,15,0.06)" horizontal={false} />
                  <XAxis type="number" tick={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, fill: '#9B7B6A' }} axisLine={false} tickLine={false}
                    tickFormatter={v => `${v}%`}/>
                  <YAxis type="category" dataKey="nome" tick={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, fill: '#2C1A0F' }} axisLine={false} tickLine={false} width={90} />
                  <Tooltip
                    content={({ active, payload }) => active && payload?.[0] ? (
                      <div style={{ background: '#1A0A05', borderRadius: 10, padding: '8px 12px' }}>
                        <p style={{ ...DISPLAY, fontSize: 13, color: '#fff' }}>{(payload[0].value as number).toFixed(2)}% a.a.</p>
                      </div>
                    ) : null}
                  />
                  <Bar dataKey="taxa" radius={[0, 6, 6, 0]}>
                    {taxasChart.map((d, i) => <Cell key={i} fill={d.cor} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Distribuição por tipo + Quitadas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'stretch' }}>
        <div style={{ ...CARD, padding: 22, height: '100%' }}>
          <h3 style={{ ...DISPLAY, fontSize: 16, color: '#2C1A0F', marginBottom: 4 }}>Saldo devedor por tipo</h3>
          <p style={{ ...LABEL, marginBottom: 16 }}>Distribuição atual das dívidas ativas</p>
          {distTipo.length === 0 ? (
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#9B7B6A' }}>Nenhuma dívida ativa.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {distTipo.map(d => {
                const pct = totalDevido > 0 ? (d.valor / totalDevido) * 100 : 0
                return (
                  <div key={d.tipo}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      {d.tm && <span style={{ width: 8, height: 8, borderRadius: 2, background: d.tm.cor }}/>}
                      <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, color: '#2C1A0F', flex: 1 }}>{d.tm?.label ?? d.tipo}</span>
                      <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#7A5C4F', fontWeight: 600 }}>{pct.toFixed(0)}%</span>
                      <span style={{ ...DISPLAY, fontSize: 12, color: '#2C1A0F', minWidth: 80, textAlign: 'right' }}>{fmt(d.valor)}</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: 'rgba(196,85,59,0.1)', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: d.tm?.cor ?? '#C4553B', borderRadius: 2 }}/>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div style={{ ...CARD, padding: 22, height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <IconCheck size={16} stroke={2} color="#3A8580" />
            <h3 style={{ ...DISPLAY, fontSize: 16, color: '#2C1A0F' }}>Dívidas quitadas</h3>
          </div>
          <p style={{ ...LABEL, marginBottom: 16 }}>Histórico de conquistas</p>
          {quitadas.length === 0 ? (
            <div style={{ paddingTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
              <IconClockHour4 size={28} stroke={1.6} color="#9B7B6A" />
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#9B7B6A', margin: 0, textAlign: 'center' }}>
                Nenhuma dívida quitada ainda
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {quitadas.map(d => (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#E8F4F2', borderRadius: 8 }}>
                  <IconCheck size={14} stroke={2.4} color="#1E7D5A" />
                  <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700, color: '#2C1A0F', margin: 0, flex: 1 }}>{d.nome}</p>
                  <span style={{ ...DISPLAY, fontSize: 12, color: '#1E7D5A' }}>{fmt(d.valorTotal)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, cor }: { label: string; value: string; sub?: string; cor: string }) {
  return (
    <div style={{ ...CARD, padding: '16px 18px', borderLeft: `3px solid ${cor}` }}>
      <p style={{ ...LABEL, color: '#7A5C4F' }}>{label}</p>
      <p style={{ ...DISPLAY, fontSize: 22, color: '#2C1A0F', margin: '6px 0 0', letterSpacing: '-0.7px' }}>{value}</p>
      {sub && (
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#7A5C4F', margin: '4px 0 0' }}>{sub}</p>
      )}
    </div>
  )
}

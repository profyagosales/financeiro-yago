import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { IconHeart, IconShoppingCart, IconClockHour4, IconTrendingDown } from '@tabler/icons-react'
import { useDesejos } from '@/db/hooks/useDesejos'
import { useCategorias } from '@/db/hooks/useCategorias'
import { fmt } from '@/lib/format'
import { PRIORIDADES, PRIORIDADE_BY } from '../desejos/constants'

const DISPLAY: React.CSSProperties = { fontFamily: "'Fraunces',Georgia,serif", fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1.1 }
const NUM: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, letterSpacing: '-0.3px', lineHeight: 1.1 }
const LABEL: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '.09em', textTransform: 'uppercase', color: '#9B7B6A' }
const CARD: React.CSSProperties = { background: '#FFFFFF', border: '1px solid #EDE6DC', borderRadius: 20, boxShadow: '0 1px 3px rgba(44,26,15,0.05), 0 4px 16px rgba(44,26,15,0.06)' }

export function TabDesejos() {
  const todos = useDesejos()
  const categorias = useCategorias('despesa')

  const abertos = todos.filter(d => d.status === 'aberto')
  const comprados = todos.filter(d => d.status === 'comprado')
  const desistidos = todos.filter(d => d.status === 'desistido')

  // Stats
  const totalEstimadoAberto = abertos.reduce((s, d) => s + (d.valorEstimado ?? 0), 0)
  const totalGastoComprados = comprados.reduce((s, d) => s + (d.valorMenorEncontrado ?? d.valorEstimado ?? 0), 0)
  const economiaTotal = comprados.reduce((s, d) => {
    if (d.valorEstimado && d.valorMenorEncontrado && d.valorMenorEncontrado < d.valorEstimado) {
      return s + (d.valorEstimado - d.valorMenorEncontrado)
    }
    return s
  }, 0)

  // Tempo médio (desejado → comprado em dias)
  const tempoMedio = useMemo(() => {
    const tempos = comprados
      .filter(d => d.dataCompra && d.dataDesejo)
      .map(d => {
        const desejo = new Date(d.dataDesejo + 'T00:00:00').getTime()
        const compra = new Date(d.dataCompra! + 'T00:00:00').getTime()
        return Math.max(0, Math.round((compra - desejo) / 86400000))
      })
    if (tempos.length === 0) return null
    return Math.round(tempos.reduce((s, t) => s + t, 0) / tempos.length)
  }, [comprados])

  // Por prioridade (em aberto)
  const porPrioridade = useMemo(() => {
    return PRIORIDADES.map(p => ({
      prioridade: p.short,
      qtd: abertos.filter(d => d.prioridade === p.value).length,
      valor: abertos.filter(d => d.prioridade === p.value).reduce((s, d) => s + (d.valorEstimado ?? 0), 0),
      cor: p.cor,
    })).filter(d => d.qtd > 0)
  }, [abertos])

  // Por categoria (comprados)
  const porCategoria = useMemo(() => {
    const map = new Map<number, number>()
    comprados.forEach(d => {
      if (d.categoriaId) {
        map.set(d.categoriaId, (map.get(d.categoriaId) ?? 0) + (d.valorMenorEncontrado ?? 0))
      }
    })
    return Array.from(map.entries())
      .map(([catId, valor]) => {
        const cat = categorias.find(c => c.id === catId)
        return { nome: cat?.nome ?? 'Sem categoria', valor, cor: cat?.cor ?? '#7A5C4F' }
      })
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5)
  }, [comprados, categorias])

  // Top wishes em aberto (por valor)
  const topAbertos = useMemo(() => {
    return [...abertos]
      .filter(d => d.valorEstimado)
      .sort((a, b) => (b.valorEstimado ?? 0) - (a.valorEstimado ?? 0))
      .slice(0, 5)
  }, [abertos])

  if (todos.length === 0) {
    return (
      <div style={{ ...CARD, padding: 48, textAlign: 'center' }}>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, color: '#9B7B6A' }}>
          Sua lista de desejos está vazia. Vá em Planejamento › Lista de Desejos para começar.
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <StatCard label="Em aberto" value={String(abertos.length)} sub={totalEstimadoAberto > 0 ? `${fmt(totalEstimadoAberto)} estimado` : 'nenhum estimado'} cor="#C4553B" icon={<IconHeart size={14} stroke={1.8} color="#C4553B" />} />
        <StatCard label="Comprados" value={String(comprados.length)} sub={totalGastoComprados > 0 ? `${fmt(totalGastoComprados)} gasto total` : undefined} cor="#3A8580" icon={<IconShoppingCart size={14} stroke={1.8} color="#3A8580" />} />
        <StatCard label="Economia" value={fmt(economiaTotal)} sub={comprados.length > 0 ? 'vs valores estimados' : 'sem comparativos'} cor="#D4A017" icon={<IconTrendingDown size={14} stroke={1.8} color="#D4A017" />} />
        <StatCard
          label="Tempo médio"
          value={tempoMedio !== null ? `${tempoMedio} ${tempoMedio === 1 ? 'dia' : 'dias'}` : '—'}
          sub="entre desejar e comprar"
          cor="#7A5C4F"
          icon={<IconClockHour4 size={14} stroke={1.8} color="#7A5C4F" />}
        />
      </div>

      {/* Distribuição por prioridade + Por categoria */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'stretch' }}>

        {/* Por prioridade */}
        <div style={{ ...CARD, padding: 22, height: '100%' }}>
          <h3 style={{ ...DISPLAY, fontSize: 16, color: '#2C1A0F', marginBottom: 4 }}>Distribuição por prioridade</h3>
          <p style={{ ...LABEL, marginBottom: 16 }}>Itens em aberto · valor estimado</p>
          {porPrioridade.length === 0 ? (
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#9B7B6A' }}>Nenhum item em aberto.</p>
          ) : (
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer>
                <BarChart data={porPrioridade} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(44,26,15,0.06)" vertical={false} />
                  <XAxis dataKey="prioridade" tick={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, fill: '#7A5C4F' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, fill: '#9B7B6A' }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
                  <Tooltip
                    content={({ active, payload }) => active && payload?.[0] ? (
                      <div style={{ background: '#1A0A05', borderRadius: 10, padding: '8px 12px' }}>
                        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: 'rgba(255,255,255,0.45)', letterSpacing: '.06em', textTransform: 'uppercase', margin: 0 }}>{payload[0].payload.prioridade} · {payload[0].payload.qtd} itens</p>
                        <p style={{ ...NUM, fontSize: 14, color: '#fff', margin: '4px 0 0' }}>{fmt(payload[0].value as number)}</p>
                      </div>
                    ) : null}
                  />
                  <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                    {porPrioridade.map((d, i) => <Cell key={i} fill={d.cor} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Por categoria */}
        <div style={{ ...CARD, padding: 22, height: '100%' }}>
          <h3 style={{ ...DISPLAY, fontSize: 16, color: '#2C1A0F', marginBottom: 4 }}>Gasto por categoria</h3>
          <p style={{ ...LABEL, marginBottom: 16 }}>Compras já realizadas</p>
          {porCategoria.length === 0 ? (
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#9B7B6A' }}>Nenhuma compra com categoria ainda.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {porCategoria.map(c => {
                const totalC = porCategoria.reduce((s, x) => s + x.valor, 0)
                const pct = totalC > 0 ? (c.valor / totalC) * 100 : 0
                return (
                  <div key={c.nome}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: c.cor }}/>
                      <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, color: '#2C1A0F', flex: 1 }}>{c.nome}</span>
                      <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#7A5C4F', fontWeight: 600 }}>{pct.toFixed(0)}%</span>
                      <span style={{ ...NUM, fontSize: 12, color: '#2C1A0F', minWidth: 80, textAlign: 'right' }}>{fmt(c.valor)}</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: 'rgba(44,26,15,0.06)', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: c.cor, borderRadius: 2 }}/>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Top abertos */}
      <div style={{ ...CARD, padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ ...DISPLAY, fontSize: 16, color: '#2C1A0F' }}>Top desejos em aberto</h3>
          <span style={{ ...LABEL, color: '#7A5C4F' }}>por valor estimado</span>
        </div>
        {topAbertos.length === 0 ? (
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#9B7B6A' }}>Nenhum desejo em aberto com valor estimado.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {topAbertos.map(d => {
              const pm = PRIORIDADE_BY.get(d.prioridade)
              return (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#FBF8F3', borderRadius: 10 }}>
                  {pm && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 8, background: pm.cor, color: '#FFFFFF', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '.04em' }}>
                      <pm.Icon size={10} stroke={2} />
                      {pm.short.toUpperCase()}
                    </span>
                  )}
                  <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700, color: '#2C1A0F', margin: 0, flex: 1 }}>{d.nome}</p>
                  {d.valorMenorEncontrado && d.valorEstimado && d.valorMenorEncontrado < d.valorEstimado && (
                    <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: '#1E7D5A' }}>
                      menor {fmt(d.valorMenorEncontrado)}
                    </span>
                  )}
                  <span style={{ ...NUM, fontSize: 13, color: '#2C1A0F' }}>{fmt(d.valorEstimado!)}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, cor, icon }: { label: string; value: string; sub?: string; cor: string; icon?: React.ReactNode }) {
  return (
    <div style={{ ...CARD, padding: '16px 18px', borderLeft: `3px solid ${cor}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {icon}
        <p style={{ ...LABEL, color: '#7A5C4F', margin: 0 }}>{label}</p>
      </div>
      <p style={{ ...NUM, fontSize: 22, color: '#2C1A0F', margin: '6px 0 0', letterSpacing: '-0.3px' }}>{value}</p>
      {sub && (
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#7A5C4F', margin: '4px 0 0' }}>{sub}</p>
      )}
    </div>
  )
}

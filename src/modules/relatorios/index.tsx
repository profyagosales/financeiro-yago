import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid, LineChart, Line, ReferenceLine
} from 'recharts'
import { useTransacoesByMes } from '@/db/hooks/useTransacoes'
import { useCategorias } from '@/db/hooks/useCategorias'
import { fmt } from '@/lib/format'
import { db } from '@/db/schema'
import { useLiveQuery } from 'dexie-react-hooks'
import { IconChevronLeft, IconChevronRight, IconFileTypePdf } from '@tabler/icons-react'
import { TabInvestimentos } from './TabInvestimentos'
import { TabDividas } from './TabDividas'
import { TabPatrimonio } from './TabPatrimonio'
import { PDFExportModal } from './PDFExportModal'
import { TabDesejos } from './TabDesejos'

// ─── Design tokens ───────────────────────────────────────────────────────────
const DISPLAY: React.CSSProperties = { fontFamily: "'Fraunces',Georgia,serif", fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1.1 }
const NUM: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, letterSpacing: '-0.3px', lineHeight: 1.1 }
const LABEL: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '.09em', textTransform: 'uppercase', color: '#9B7B6A' }
const BODY: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans',sans-serif" }
const CARD: React.CSSProperties = { background: '#FFFFFF', border: '1px solid #EDE6DC', borderRadius: 20, boxShadow: '0 1px 3px rgba(44,26,15,0.05), 0 4px 16px rgba(44,26,15,0.06)' }

// ─── Hooks ───────────────────────────────────────────────────────────────────
function useUltimos6Meses() {
  return useLiveQuery(async () => {
    const meses = []
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      let m = now.getMonth() + 1 - i
      let a = now.getFullYear()
      while (m <= 0) { m += 12; a -= 1 }
      const inicio = `${a}-${String(m).padStart(2,'0')}-01`
      const fim = `${a}-${String(m).padStart(2,'0')}-31`
      const txs = await db.transacoes.where('data').between(inicio, fim, true, true).toArray()
      const rec = txs.filter(t => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0)
      const desp = txs.filter(t => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0)
      meses.push({ mes: new Date(a, m-1, 1).toLocaleDateString('pt-BR', { month: 'short' }), receitas: rec, despesas: desp, saldo: rec - desp })
    }
    return meses
  }, []) ?? []
}

function useMesAnterior(mes: number, ano: number) {
  const pm = mes === 1 ? 12 : mes - 1
  const pa = mes === 1 ? ano - 1 : ano
  return useTransacoesByMes(pm, pa)
}

function useTopDespesas(mes: number, ano: number) {
  return useLiveQuery(async () => {
    const inicio = `${ano}-${String(mes).padStart(2,'0')}-01`
    const fim = `${ano}-${String(mes).padStart(2,'0')}-31`
    const txs = await db.transacoes.where('data').between(inicio, fim, true, true).toArray()
    return txs
      .filter(t => t.tipo === 'despesa')
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10)
  }, [mes, ano]) ?? []
}

function useGastosPorDia(mes: number, ano: number) {
  return useLiveQuery(async () => {
    const inicio = `${ano}-${String(mes).padStart(2,'0')}-01`
    const fim = `${ano}-${String(mes).padStart(2,'0')}-31`
    const txs = await db.transacoes.where('data').between(inicio, fim, true, true).toArray()
    const map: Record<number, number> = {}
    txs.filter(t => t.tipo === 'despesa').forEach(t => {
      const dia = parseInt(t.data.split('-')[2])
      map[dia] = (map[dia] ?? 0) + t.valor
    })
    return Array.from({ length: 31 }, (_, i) => ({ dia: i + 1, valor: map[i + 1] ?? 0 }))
  }, [mes, ano]) ?? []
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const DarkTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#1A0A05', borderRadius: 12, padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}>
      {label && <p style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 10, color: 'rgba(255,255,255,0.5)', marginBottom: 6, letterSpacing: '.06em', textTransform: 'uppercase' }}>{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: i < payload.length - 1 ? 4 : 0 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color ?? p.fill, flexShrink: 0 }} />
          <span style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 11, color: 'rgba(255,255,255,0.65)', flex: 1 }}>{p.name}</span>
          <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, color: 'white' }}>{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

const DayTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const dia = payload[0]?.payload?.dia
  return (
    <div style={{ background: '#1A0A05', borderRadius: 10, padding: '8px 12px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <p style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 10, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Dia {dia}</p>
      <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, color: 'white' }}>{fmt(payload[0].value)}</span>
    </div>
  )
}

// ─── Comparativo row ──────────────────────────────────────────────────────────
function Comparativo({ atual, anterior, label, cor }: { atual: number; anterior: number; label: string; cor: string }) {
  const diff = anterior > 0 ? ((atual - anterior) / anterior) * 100 : null
  const subiu = diff !== null && diff > 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', borderBottom: '1px solid #F5F0E8' }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: cor, flexShrink: 0 }} />
      <span style={{ ...BODY, fontSize: 13, color: '#9B7B6A', flex: 1 }}>{label}</span>
      <span style={{ ...NUM, fontSize: 14, color: '#2C1A0F' }}>{fmt(atual)}</span>
      {diff !== null && (
        <span style={{
          ...BODY, fontSize: 10, fontWeight: 700,
          background: Math.abs(diff) < 5 ? '#F5F0E8' : subiu ? '#FAF0EE' : '#EBF5F0',
          color: Math.abs(diff) < 5 ? '#9B7B6A' : subiu ? '#C4553B' : '#3A8580',
          padding: '3px 9px', borderRadius: 20
        }}>
          {subiu ? '↑' : '↓'} {Math.abs(diff).toFixed(0)}%
        </span>
      )}
    </div>
  )
}

// ─── Tab 1: Visão Geral ───────────────────────────────────────────────────────
function TabVisaoGeral({
  mes, ano, transacoes, txAnterior, historico, receitas, despesas, saldo, recAnt, despAnt
}: {
  mes: number; ano: number
  transacoes: any[]; txAnterior: any[]; historico: any[]
  receitas: number; despesas: number; saldo: number; recAnt: number; despAnt: number
}) {
  const savingsRate = receitas > 0 ? ((receitas - despesas) / receitas) * 100 : 0
  const savingsColor = savingsRate > 20 ? '#3A8580' : savingsRate > 0 ? '#D4A017' : '#C4553B'
  const avgRec = historico.length > 0 ? historico.reduce((s, m) => s + m.receitas, 0) / historico.length : 0
  const avgDesp = historico.length > 0 ? historico.reduce((s, m) => s + m.despesas, 0) / historico.length : 0

  const kpis = [
    { label: 'RECEITAS', value: receitas, color: '#3A8580', borderColor: '#3A8580', delta: recAnt > 0 ? ((receitas - recAnt) / recAnt) * 100 : null },
    { label: 'DESPESAS', value: despesas, color: '#C4553B', borderColor: '#C4553B', delta: despAnt > 0 ? ((despesas - despAnt) / despAnt) * 100 : null },
    { label: 'SALDO', value: saldo, color: saldo >= 0 ? '#3A8580' : '#C4553B', borderColor: saldo >= 0 ? '#3A8580' : '#C4553B', delta: null },
  ]

  return (
    <div>
      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
        {kpis.map(kpi => (
          <div key={kpi.label} style={{ ...CARD, padding: '14px 14px 12px', borderRadius: 16, borderLeft: `4px solid ${kpi.borderColor}` }}>
            <p style={{ ...LABEL, marginBottom: 4 }}>{kpi.label}</p>
            <p style={{ ...NUM, fontSize: 17, color: kpi.color }}>{fmt(kpi.value)}</p>
            {kpi.delta !== null && (
              <div style={{ marginTop: 6 }}>
                <span style={{
                  ...BODY, fontSize: 9, fontWeight: 700,
                  background: Math.abs(kpi.delta) < 5 ? '#F5F0E8' : kpi.delta > 0 ? (kpi.label === 'DESPESAS' ? '#FAF0EE' : '#EBF5F0') : (kpi.label === 'DESPESAS' ? '#EBF5F0' : '#FAF0EE'),
                  color: Math.abs(kpi.delta) < 5 ? '#9B7B6A' : kpi.delta > 0 ? (kpi.label === 'DESPESAS' ? '#C4553B' : '#3A8580') : (kpi.label === 'DESPESAS' ? '#3A8580' : '#C4553B'),
                  padding: '2px 7px', borderRadius: 20
                }}>
                  {kpi.delta > 0 ? '↑' : '↓'} {Math.abs(kpi.delta).toFixed(0)}%
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Receitas vs Despesas 6 meses */}
      {historico.length > 0 && (
        <div style={{ ...CARD, padding: '18px 20px', marginBottom: 16 }}>
          <h2 style={{ ...DISPLAY, fontSize: 16, color: '#2C1A0F', marginBottom: 2 }}>Últimos 6 meses</h2>
          <p style={{ ...BODY, fontSize: 11, color: '#9B7B6A', marginBottom: 14 }}>Receitas e despesas mensais</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={historico} barGap={6} barCategoryGap="30%">
              <defs>
                <linearGradient id="recGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3A8580" />
                  <stop offset="100%" stopColor="#2A6560" />
                </linearGradient>
                <linearGradient id="despGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C4553B" />
                  <stop offset="100%" stopColor="#A8442B" />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#F5F0E8" strokeDasharray="0" />
              <XAxis dataKey="mes" tick={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fill: '#9B7B6A' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(44,26,15,0.03)' }} />
              {avgRec > 0 && <ReferenceLine y={avgRec} stroke="#3A8580" strokeDasharray="4 3" strokeOpacity={0.4} />}
              {avgDesp > 0 && <ReferenceLine y={avgDesp} stroke="#C4553B" strokeDasharray="4 3" strokeOpacity={0.4} />}
              <Bar dataKey="receitas" name="Receitas" fill="url(#recGrad)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="despesas" name="Despesas" fill="url(#despGrad)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3A8580' }} />
              <span style={{ ...BODY, fontSize: 11, color: '#9B7B6A' }}>Receitas</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#C4553B' }} />
              <span style={{ ...BODY, fontSize: 11, color: '#9B7B6A' }}>Despesas</span>
            </div>
          </div>
        </div>
      )}

      {/* Comparativo vs mês anterior + Taxa de poupança — grid 2-col */}
      {(recAnt > 0 || despAnt > 0 || receitas > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          {(recAnt > 0 || despAnt > 0) && (
            <div style={{ ...CARD, padding: '18px 20px' }}>
              <h2 style={{ ...DISPLAY, fontSize: 16, color: '#2C1A0F', marginBottom: 2 }}>Comparativo</h2>
              <p style={{ ...BODY, fontSize: 11, color: '#9B7B6A', marginBottom: 8 }}>vs mês anterior</p>
              <Comparativo atual={receitas} anterior={recAnt} label="Receitas" cor="#3A8580" />
              <Comparativo atual={despesas} anterior={despAnt} label="Despesas" cor="#C4553B" />
              <Comparativo atual={saldo} anterior={recAnt - despAnt} label="Saldo" cor="#D4A017" />
            </div>
          )}

          {receitas > 0 && (
            <div style={{ ...CARD, padding: '18px 20px' }}>
              <p style={{ ...LABEL, marginBottom: 3 }}>TAXA DE POUPANÇA</p>
              <p style={{ ...NUM, fontSize: 28, color: savingsColor, marginBottom: 8 }}>{savingsRate.toFixed(1)}%</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <p style={{ ...BODY, fontSize: 12, color: '#9B7B6A' }}>Economizado</p>
                <p style={{ ...NUM, fontSize: 16, color: '#2C1A0F' }}>{fmt(receitas - despesas)}</p>
              </div>
              <div style={{ background: '#F5F0E8', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(0, Math.min(100, savingsRate))}%` }}
                  transition={{ type: 'spring', stiffness: 180, damping: 24 }}
                  style={{ height: '100%', background: savingsColor, borderRadius: 6 }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <p style={{ ...BODY, fontSize: 11, color: '#9B7B6A' }}>Receitas: {fmt(receitas)}</p>
                <p style={{ ...BODY, fontSize: 11, color: '#9B7B6A' }}>Despesas: {fmt(despesas)}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {transacoes.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <p style={{ ...BODY, fontSize: 14, color: '#9B7B6A' }}>Sem transações neste mês</p>
        </div>
      )}
    </div>
  )
}

// ─── Tab 2: Categorias ────────────────────────────────────────────────────────
function TabCategorias({ mes, ano, despesas, pieData }: {
  mes: number; ano: number; despesas: number; pieData: { name: string; value: number; color: string }[]
}) {
  const topDespesas = useTopDespesas(mes, ano)
  const categorias = useCategorias()
  const catMap = new Map(categorias.map(c => [c.id!, c]))

  return (
    <div>
      {pieData.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Donut + barras */}
          <div style={{ ...CARD, padding: '18px 20px' }}>
            <h2 style={{ ...DISPLAY, fontSize: 16, color: '#2C1A0F', marginBottom: 2 }}>Gastos por categoria</h2>
            <p style={{ ...BODY, fontSize: 11, color: '#9B7B6A', marginBottom: 16 }}>Distribuição das despesas</p>

            {/* Donut com total no centro */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
              <div style={{ position: 'relative', width: 180, height: 180, flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={58} outerRadius={84}
                      paddingAngle={2} dataKey="value" strokeWidth={0}>
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip content={<DarkTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <p style={{ ...LABEL, fontSize: 9, marginBottom: 2 }}>TOTAL</p>
                  <p style={{ ...NUM, fontSize: 18, color: '#2C1A0F' }}>{fmt(despesas)}</p>
                </div>
              </div>
            </div>

            {/* Barras horizontais */}
            <div>
              {pieData.map((d, i) => {
                const pct = despesas > 0 ? (d.value / despesas) * 100 : 0
                return (
                  <div key={d.name} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                      <span style={{ ...BODY, fontSize: 13, color: '#2C1A0F', flex: 1 }}>{d.name}</span>
                      <span style={{ ...BODY, fontSize: 11, fontWeight: 700, color: d.color, width: 36, textAlign: 'right' }}>{pct.toFixed(0)}%</span>
                      <span style={{ ...NUM, fontSize: 13, color: '#2C1A0F', width: 80, textAlign: 'right' }}>{fmt(d.value)}</span>
                    </div>
                    <div style={{ background: '#F5F0E8', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ type: 'spring', stiffness: 180, damping: 24, delay: i * 0.06 }}
                        style={{ height: '100%', background: d.color, borderRadius: 4 }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Top despesas */}
          {topDespesas.length > 0 && (
            <div style={{ ...CARD, padding: '18px 20px' }}>
              <h2 style={{ ...DISPLAY, fontSize: 16, color: '#2C1A0F', marginBottom: 2 }}>Top despesas do mês</h2>
              <p style={{ ...BODY, fontSize: 11, color: '#9B7B6A', marginBottom: 14 }}>Maiores gastos individuais</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {topDespesas.map((tx, i) => {
                  const cat = catMap.get(tx.categoriaId)
                  return (
                    <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < topDespesas.length - 1 ? '1px solid #F5F0E8' : 'none' }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: cat ? `${cat.cor}18` : '#F5F0E8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                        {cat?.icone ?? '💸'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ ...BODY, fontSize: 13, color: '#2C1A0F', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.descricao}</p>
                        <p style={{ ...BODY, fontSize: 10, color: '#9B7B6A', marginTop: 1 }}>{cat?.nome ?? '—'} · {new Date(tx.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</p>
                      </div>
                      <p style={{ ...NUM, fontSize: 14, color: '#C4553B', flexShrink: 0 }}>{fmt(tx.valor)}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <p style={{ ...BODY, fontSize: 14, color: '#9B7B6A' }}>Sem despesas neste mês</p>
        </div>
      )}
    </div>
  )
}

// ─── Tab 3: Tendências ────────────────────────────────────────────────────────
function TabTendencias({ mes, ano, historico }: { mes: number; ano: number; historico: any[] }) {
  const gastosDia = useGastosPorDia(mes, ano)

  const saldoAcum = historico.map((m, i) => ({
    ...m,
    saldoAcum: historico.slice(0, i + 1).reduce((s, x) => s + x.saldo, 0)
  }))

  return (
    <div>
      {/* Fluxo de caixa + Gastos por dia — grid 2-col */}
      {(historico.length > 0 || gastosDia.some(d => d.valor > 0)) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          {/* Fluxo de caixa — AreaChart */}
          {historico.length > 0 && (
            <div style={{ ...CARD, padding: '18px 20px' }}>
              <h2 style={{ ...DISPLAY, fontSize: 16, color: '#2C1A0F', marginBottom: 2 }}>Fluxo de caixa</h2>
              <p style={{ ...BODY, fontSize: 11, color: '#9B7B6A', marginBottom: 14 }}>Receitas e despesas nos últimos 6 meses</p>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={historico}>
                  <defs>
                    <linearGradient id="recAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3A8580" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3A8580" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="despAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C4553B" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#C4553B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#F5F0E8" strokeDasharray="0" />
                  <XAxis dataKey="mes" tick={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fill: '#9B7B6A' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<DarkTooltip />} />
                  <Area type="monotone" dataKey="receitas" name="Receitas" stroke="#3A8580" strokeWidth={2.5} fill="url(#recAreaGrad)" dot={{ fill: '#3A8580', r: 4, strokeWidth: 0 }} />
                  <Area type="monotone" dataKey="despesas" name="Despesas" stroke="#C4553B" strokeWidth={2.5} fill="url(#despAreaGrad)" dot={{ fill: '#C4553B', r: 4, strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3A8580' }} />
                  <span style={{ ...BODY, fontSize: 11, color: '#9B7B6A' }}>Receitas</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#C4553B' }} />
                  <span style={{ ...BODY, fontSize: 11, color: '#9B7B6A' }}>Despesas</span>
                </div>
              </div>
            </div>
          )}

          {/* Gastos por dia */}
          {gastosDia.some(d => d.valor > 0) && (
            <div style={{ ...CARD, padding: '18px 20px' }}>
              <h2 style={{ ...DISPLAY, fontSize: 16, color: '#2C1A0F', marginBottom: 2 }}>Gastos por dia</h2>
              <p style={{ ...BODY, fontSize: 11, color: '#9B7B6A', marginBottom: 14 }}>Distribuição das despesas no mês</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={gastosDia} barCategoryGap="20%">
                  <XAxis dataKey="dia" tick={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fill: '#9B7B6A' }} axisLine={false} tickLine={false} interval={4} />
                  <YAxis hide />
                  <Tooltip content={<DayTooltip />} cursor={{ fill: 'rgba(44,26,15,0.03)' }} />
                  <Bar dataKey="valor" name="Gastos" radius={[3, 3, 0, 0]}>
                    {gastosDia.map((entry, i) => (
                      <Cell key={i} fill={entry.valor > 0 ? '#C4553B' : '#EDE6DC'} fillOpacity={entry.valor > 0 ? 0.85 : 1} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Evolução do saldo acumulado */}
      {saldoAcum.length > 0 && (
        <div style={{ ...CARD, padding: '18px 20px', marginBottom: 16 }}>
          <h2 style={{ ...DISPLAY, fontSize: 16, color: '#2C1A0F', marginBottom: 2 }}>Saldo acumulado</h2>
          <p style={{ ...BODY, fontSize: 11, color: '#9B7B6A', marginBottom: 14 }}>Evolução patrimonial nos últimos 6 meses</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={saldoAcum}>
              <defs>
                <linearGradient id="saldoAcumGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3A8580" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3A8580" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#F5F0E8" strokeDasharray="0" />
              <XAxis dataKey="mes" tick={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fill: '#9B7B6A' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<DarkTooltip />} />
              <Line type="monotone" dataKey="saldoAcum" name="Saldo acumulado" stroke="#3A8580" strokeWidth={2.5} dot={{ fill: '#3A8580', r: 4, strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {saldoAcum.every(m => m.receitas === 0) && (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <p style={{ ...BODY, fontSize: 14, color: '#9B7B6A' }}>Sem dados para exibir</p>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'visao-geral',    label: 'Visão Geral' },
  { id: 'categorias',     label: 'Categorias' },
  { id: 'tendencias',     label: 'Tendências' },
  { id: 'investimentos',  label: 'Investimentos' },
  { id: 'dividas',        label: 'Dívidas' },
  { id: 'patrimonio',     label: 'Patrimônio' },
  { id: 'desejos',        label: 'Desejos' },
] as const

type TabId = typeof TABS[number]['id']

export function Page() {
  const now = new Date()
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [ano, setAno] = useState(now.getFullYear())
  const [activeTab, setActiveTab] = useState<TabId>('visao-geral')
  const [pdfOpen, setPdfOpen] = useState(false)

  const transacoes = useTransacoesByMes(mes, ano)
  const txAnterior = useMesAnterior(mes, ano)
  const categorias = useCategorias('despesa')
  const historico = useUltimos6Meses()

  const receitas = transacoes.filter(t => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0)
  const despesas = transacoes.filter(t => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0)
  const saldo = receitas - despesas
  const recAnt = txAnterior.filter(t => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0)
  const despAnt = txAnterior.filter(t => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0)

  const gastosMap = new Map<number, number>()
  transacoes.filter(t => t.tipo === 'despesa').forEach(t => gastosMap.set(t.categoriaId, (gastosMap.get(t.categoriaId) ?? 0) + t.valor))
  const pieData = categorias.filter(c => gastosMap.has(c.id!)).map(c => ({ name: c.nome, value: gastosMap.get(c.id!) ?? 0, color: c.cor })).sort((a, b) => b.value - a.value)

  const mesNome = new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const prevMes = () => { if (mes === 1) { setMes(12); setAno(a => a - 1) } else setMes(m => m - 1) }
  const nextMes = () => { if (mes === 12) { setMes(1); setAno(a => a + 1) } else setMes(m => m + 1) }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ width: '100%', paddingBottom: 32 }}>

      {/* Header */}
      <div style={{ padding: '32px 32px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, borderBottom: '1px solid #EDE6DC' }}>
        <h1 style={{ ...DISPLAY, fontSize: 38, color: '#2C1A0F', letterSpacing: '-1.5px' }}>Relatórios</h1>
        <button onClick={() => setPdfOpen(true)}
          style={{
            background: 'linear-gradient(135deg, #D4643A, #C4553B)', color: '#FFFFFF', border: 'none',
            borderRadius: 12, padding: '11px 18px', cursor: 'pointer',
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', gap: 6,
            boxShadow: '0 4px 16px rgba(196,85,59,0.35)',
          }}>
          <IconFileTypePdf size={16} stroke={2.5} /> Exportar PDF
        </button>
      </div>

      {/* Month navigator */}
      <div style={{ display: 'flex', alignItems: 'center', background: '#FFFFFF', border: '1px solid #EDE6DC', borderRadius: 16, padding: '10px 16px', margin: '0 32px 20px', boxShadow: '0 1px 3px rgba(44,26,15,0.05)', justifyContent: 'space-between' }}>
        <button onClick={prevMes} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 10, color: '#C4553B', transition: 'background .15s' }}>
          <IconChevronLeft size={18} stroke={2.5} />
        </button>
        <p style={{ ...DISPLAY, fontSize: 16, color: '#2C1A0F', textTransform: 'capitalize' }}>{mesNome}</p>
        <button onClick={nextMes} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 10, color: '#C4553B', transition: 'background .15s' }}>
          <IconChevronRight size={18} stroke={2.5} />
        </button>
      </div>

      {/* Tab switcher */}
      <div style={{ margin: '0 32px 20px' }}>
        <div style={{ display: 'flex', background: '#F5F0E8', borderRadius: 14, padding: 4, gap: 3 }}>
          {TABS.map(tab => (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1, padding: '9px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: activeTab === tab.id ? '#FFFFFF' : 'transparent',
                color: activeTab === tab.id ? '#2C1A0F' : '#9B7B6A',
                fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13,
                fontWeight: activeTab === tab.id ? 700 : 500,
                boxShadow: activeTab === tab.id ? '0 1px 4px rgba(44,26,15,0.1)' : 'none',
                transition: 'all .15s'
              }}
            >
              {tab.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ padding: '0 32px' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            {activeTab === 'visao-geral' && (
              <TabVisaoGeral
                mes={mes} ano={ano}
                transacoes={transacoes} txAnterior={txAnterior} historico={historico}
                receitas={receitas} despesas={despesas} saldo={saldo}
                recAnt={recAnt} despAnt={despAnt}
              />
            )}
            {activeTab === 'categorias' && (
              <TabCategorias mes={mes} ano={ano} despesas={despesas} pieData={pieData} />
            )}
            {activeTab === 'tendencias' && (
              <TabTendencias mes={mes} ano={ano} historico={historico} />
            )}
            {activeTab === 'investimentos' && <TabInvestimentos />}
            {activeTab === 'dividas' && <TabDividas />}
            {activeTab === 'patrimonio' && <TabPatrimonio />}
            {activeTab === 'desejos' && <TabDesejos />}
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {pdfOpen && <PDFExportModal onClose={() => setPdfOpen(false)} />}
      </AnimatePresence>
    </motion.div>
  )
}

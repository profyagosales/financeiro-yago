import { useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, CartesianGrid } from 'recharts'
import { useTransacoesByMes } from '@/db/hooks/useTransacoes'
import { useCategorias } from '@/db/hooks/useCategorias'
import { fmt } from '@/lib/format'
import { db } from '@/db/schema'
import { useLiveQuery } from 'dexie-react-hooks'
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'

const DISPLAY: React.CSSProperties = { fontFamily: "'Fraunces',Georgia,serif", fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1.1 }
const LABEL: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#9B7B6A' }
const BODY: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans',sans-serif" }
const CARD: React.CSSProperties = { background: '#FFFFFF', border: '1px solid #EDE6DC', borderRadius: 20, boxShadow: '0 1px 3px rgba(44,26,15,0.05), 0 4px 16px rgba(44,26,15,0.06)' }

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

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#2C1A0F', borderRadius: 10, padding: '8px 12px', boxShadow: '0 4px 16px rgba(44,26,15,0.25)' }}>
      <p style={{ ...BODY, fontSize: 11, color: '#C4B4A8', marginBottom: 4 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ ...DISPLAY, fontSize: 13, color: p.color }}>{fmt(p.value)}</p>
      ))}
    </div>
  )
}

function useMesAnterior(mes: number, ano: number) {
  const pm = mes === 1 ? 12 : mes - 1
  const pa = mes === 1 ? ano - 1 : ano
  return useTransacoesByMes(pm, pa)
}

function Comparativo({ atual, anterior, label, cor }: { atual: number; anterior: number; label: string; cor: string }) {
  const diff = anterior > 0 ? ((atual - anterior) / anterior) * 100 : null
  const subiu = diff !== null && diff > 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid #F5F0E8' }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: cor, flexShrink: 0 }} />
      <span style={{ ...BODY, fontSize: 13, color: '#9B7B6A', flex: 1 }}>{label}</span>
      <span style={{ ...DISPLAY, fontSize: 14, color: '#2C1A0F' }}>{fmt(atual)}</span>
      {diff !== null && (
        <span style={{ ...BODY, fontSize: 10, fontWeight: 700, background: Math.abs(diff) < 5 ? '#F5F0E8' : subiu ? '#FAF0EE' : '#EBF5F0', color: Math.abs(diff) < 5 ? '#9B7B6A' : subiu ? '#C4553B' : '#3A8580', padding: '2px 8px', borderRadius: 20 }}>
          {subiu ? '↑' : '↓'} {Math.abs(diff).toFixed(0)}%
        </span>
      )}
    </div>
  )
}

export function Page() {
  const now = new Date()
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [ano, setAno] = useState(now.getFullYear())
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

  const mesNome = new Date(ano, mes-1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const prevMes = () => { if (mes === 1) { setMes(12); setAno(a => a-1) } else setMes(m => m-1) }
  const nextMes = () => { if (mes === 12) { setMes(1); setAno(a => a+1) } else setMes(m => m+1) }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ width: '100%', paddingBottom: 32 }}>

      {/* Inline header */}
      <div style={{ padding: '24px 28px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h1 style={{ ...DISPLAY, fontSize: 28, color: '#2C1A0F' }}>Relatórios</h1>
          <p style={{ ...BODY, fontSize: 13, color: '#9B7B6A', marginTop: 2 }}>Análise financeira detalhada</p>
        </div>
      </div>

      {/* Month navigator */}
      <div style={{ display: 'flex', alignItems: 'center', background: '#FFFFFF', border: '1px solid #EDE6DC', borderRadius: 16, padding: '10px 16px', margin: '0 28px 20px', boxShadow: '0 1px 3px rgba(44,26,15,0.05)', justifyContent: 'space-between' }}>
        <button onClick={prevMes} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 10, color: '#C4553B', transition: 'background .15s' }}>
          <IconChevronLeft size={18} stroke={2.5} />
        </button>
        <p style={{ ...DISPLAY, fontSize: 16, color: '#2C1A0F', textTransform: 'capitalize' }}>{mesNome}</p>
        <button onClick={nextMes} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 10, color: '#C4553B', transition: 'background .15s' }}>
          <IconChevronRight size={18} stroke={2.5} />
        </button>
      </div>

      {/* KPI 3-col — white cards, no tints */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, padding: '0 28px', marginBottom: 20 }}>
        {[
          { label: 'RECEITAS', value: receitas, color: '#3A8580' },
          { label: 'DESPESAS', value: despesas, color: '#C4553B' },
          { label: 'SALDO', value: saldo, color: saldo >= 0 ? '#2C1A0F' : '#C4553B' },
        ].map(kpi => (
          <div key={kpi.label} style={{ ...CARD, padding: '14px 16px', borderRadius: 16 }}>
            <p style={{ ...LABEL, marginBottom: 5 }}>{kpi.label}</p>
            <p style={{ ...DISPLAY, fontSize: 18, color: kpi.color }}>{fmt(kpi.value)}</p>
          </div>
        ))}
      </div>

      {/* Comparativo mês anterior */}
      {(recAnt > 0 || despAnt > 0) && (
        <div style={{ ...CARD, margin: '0 28px 20px', padding: '18px 20px' }}>
          <h2 style={{ ...DISPLAY, fontSize: 17, color: '#2C1A0F', marginBottom: 2 }}>Comparativo</h2>
          <p style={{ ...BODY, fontSize: 11, color: '#9B7B6A', marginBottom: 12 }}>vs mês anterior</p>
          <Comparativo atual={receitas} anterior={recAnt} label="Receitas" cor="#3A8580" />
          <Comparativo atual={despesas} anterior={despAnt} label="Despesas" cor="#C4553B" />
          <Comparativo atual={saldo} anterior={recAnt - despAnt} label="Saldo" cor="#D4A017" />
        </div>
      )}

      {/* Gastos por categoria */}
      {pieData.length > 0 && (
        <div style={{ ...CARD, margin: '0 28px 20px', padding: '18px 20px' }}>
          <h2 style={{ ...DISPLAY, fontSize: 17, color: '#2C1A0F', marginBottom: 16 }}>Gastos por categoria</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
              {pieData.slice(0, 5).map(d => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                  <span style={{ ...BODY, fontSize: 12, color: '#2C1A0F', flex: 1 }}>{d.name}</span>
                  <span style={{ ...DISPLAY, fontSize: 13, color: '#2C1A0F' }}>{fmt(d.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Últimos 6 meses */}
      {historico.length > 0 && (
        <div style={{ ...CARD, margin: '0 28px 20px', padding: '18px 20px' }}>
          <h2 style={{ ...DISPLAY, fontSize: 17, color: '#2C1A0F', marginBottom: 16 }}>Últimos 6 meses</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={historico} barGap={4}>
              <CartesianGrid vertical={false} stroke="#F5F0E8" strokeDasharray="0" />
              <XAxis dataKey="mes" tick={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fill: '#9B7B6A' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(44,26,15,0.03)' }} />
              <Bar dataKey="receitas" name="Receitas" fill="#3A8580" radius={[6, 6, 0, 0]} />
              <Bar dataKey="despesas" name="Despesas" fill="#C4553B" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: '#3A8580' }} />
              <span style={{ ...BODY, fontSize: 11, color: '#9B7B6A' }}>Receitas</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: '#C4553B' }} />
              <span style={{ ...BODY, fontSize: 11, color: '#9B7B6A' }}>Despesas</span>
            </div>
          </div>
        </div>
      )}

      {/* Fluxo de caixa */}
      {historico.length > 0 && (
        <div style={{ ...CARD, margin: '0 28px', padding: '18px 20px' }}>
          <h2 style={{ ...DISPLAY, fontSize: 17, color: '#2C1A0F', marginBottom: 16 }}>Fluxo de caixa</h2>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={historico}>
              <defs>
                <linearGradient id="saldoGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3A8580" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3A8580" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#F5F0E8" strokeDasharray="0" />
              <XAxis dataKey="mes" tick={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fill: '#9B7B6A' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="saldo" name="Saldo" stroke="#3A8580" strokeWidth={2} fill="url(#saldoGrad)" dot={{ fill: '#3A8580', strokeWidth: 0, r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {transacoes.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <p style={{ ...BODY, fontSize: 14, color: '#9B7B6A' }}>Sem transações neste mês</p>
        </div>
      )}
    </motion.div>
  )
}

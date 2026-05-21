import { useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'
import { useTransacoesByMes } from '@/db/hooks/useTransacoes'
import { useCategorias } from '@/db/hooks/useCategorias'
import { fmt } from '@/lib/format'
import { db } from '@/db/schema'
import { useLiveQuery } from 'dexie-react-hooks'

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
    <div style={{ background: '#2C1A0F', borderRadius: 10, padding: '8px 12px' }}>
      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#C4B4A8', marginBottom: 4 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 13, fontWeight: 700, color: p.color }}>{fmt(p.value)}</p>
      ))}
    </div>
  )
}

export function Page() {
  const now = new Date()
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [ano, setAno] = useState(now.getFullYear())
  const transacoes = useTransacoesByMes(mes, ano)
  const categorias = useCategorias('despesa')
  const historico = useUltimos6Meses()

  const receitas = transacoes.filter(t => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0)
  const despesas = transacoes.filter(t => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0)
  const saldo = receitas - despesas

  const gastosMap = new Map<number, number>()
  transacoes.filter(t => t.tipo === 'despesa').forEach(t => gastosMap.set(t.categoriaId, (gastosMap.get(t.categoriaId) ?? 0) + t.valor))
  const pieData = categorias.filter(c => gastosMap.has(c.id!)).map(c => ({ name: c.nome, value: gastosMap.get(c.id!) ?? 0, color: c.cor, icon: c.icone })).sort((a, b) => b.value - a.value)

  const mesNome = new Date(ano, mes-1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const prevMes = () => { if (mes === 1) { setMes(12); setAno(a => a-1) } else setMes(m => m-1) }
  const nextMes = () => { if (mes === 12) { setMes(1); setAno(a => a+1) } else setMes(m => m+1) }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '20px 16px', maxWidth: 680, margin: '0 auto' }}>
      <h1 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 26, fontWeight: 700, color: '#2C1A0F', marginBottom: 16 }}>Relatórios</h1>

      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FFFDF9', border: '0.5px solid #E8E0D5', borderRadius: 14, padding: '10px 16px', marginBottom: 20 }}>
        <button onClick={prevMes} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#C4553B' }}>‹</button>
        <span style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 16, fontWeight: 700, color: '#2C1A0F', textTransform: 'capitalize' }}>{mesNome}</span>
        <button onClick={nextMes} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#C4553B' }}>›</button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
        {[{ l: 'RECEITAS', v: receitas, c: '#EBF5F0', tc: '#3A8580' }, { l: 'DESPESAS', v: despesas, c: '#FAF0EE', tc: '#C4553B' }, { l: 'SALDO', v: saldo, c: saldo >= 0 ? '#EBF5F0' : '#FAF0EE', tc: saldo >= 0 ? '#3A8580' : '#C4553B' }].map(s => (
          <div key={s.l} style={{ background: s.c, borderRadius: 14, padding: '12px 14px' }}>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 600, color: s.tc, marginBottom: 4, letterSpacing: '.05em' }}>{s.l}</p>
            <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 16, fontWeight: 700, color: '#2C1A0F' }}>{fmt(s.v)}</p>
          </div>
        ))}
      </div>

      {/* Spending by category */}
      {pieData.length > 0 && (
        <div style={{ background: '#FFFDF9', border: '0.5px solid #E8E0D5', borderRadius: 20, padding: '18px', marginBottom: 20 }}>
          <h2 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 17, fontWeight: 700, color: '#2C1A0F', marginBottom: 14 }}>Gastos por categoria</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {pieData.slice(0, 5).map(d => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                  <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#2C1A0F', flex: 1 }}>{d.icon} {d.name}</span>
                  <span style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 13, fontWeight: 700, color: '#2C1A0F' }}>{fmt(d.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 6-month bar chart */}
      {historico.length > 0 && (
        <div style={{ background: '#FFFDF9', border: '0.5px solid #E8E0D5', borderRadius: 20, padding: '18px', marginBottom: 20 }}>
          <h2 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 17, fontWeight: 700, color: '#2C1A0F', marginBottom: 14 }}>Últimos 6 meses</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={historico} barGap={4}>
              <XAxis dataKey="mes" tick={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fill: '#9B7B6A' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(44,26,15,0.04)' }} />
              <Bar dataKey="receitas" fill="#3A8580" radius={[6, 6, 0, 0]} />
              <Bar dataKey="despesas" fill="#C4553B" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: '#3A8580' }} />
              <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#9B7B6A' }}>Receitas</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: '#C4553B' }} />
              <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#9B7B6A' }}>Despesas</span>
            </div>
          </div>
        </div>
      )}

      {/* Cash flow area chart */}
      {historico.length > 0 && (
        <div style={{ background: '#FFFDF9', border: '0.5px solid #E8E0D5', borderRadius: 20, padding: '18px' }}>
          <h2 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 17, fontWeight: 700, color: '#2C1A0F', marginBottom: 14 }}>Fluxo de caixa</h2>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={historico}>
              <defs>
                <linearGradient id="saldoGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3A8580" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3A8580" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="mes" tick={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fill: '#9B7B6A' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="saldo" stroke="#3A8580" strokeWidth={2} fill="url(#saldoGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {transacoes.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, color: '#9B7B6A' }}>Sem transações neste mês</p>
        </div>
      )}
    </motion.div>
  )
}

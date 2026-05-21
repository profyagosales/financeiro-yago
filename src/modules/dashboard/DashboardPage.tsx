import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Dobrao } from '@/components/mascot/Dobrao'
import { useContas, useSaldoTotal } from '@/db/hooks/useContas'
import { useTransacoes, useTotaisMes, useGastosPorCategoria } from '@/db/hooks/useTransacoes'
import { useCategorias } from '@/db/hooks/useCategorias'
import { useContasFixas, usePagamentosFixos } from '@/db/hooks/useContasFixas'
import { useOrcamentos } from '@/db/hooks/useOrcamentos'
import { db, seedCategories } from '@/db/schema'
import { fmt, fmtDate, mesAnoAtual } from '@/lib/format'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { OdometroSaldo } from '@/components/ui/OdometroSaldo'
import { IconTrendingUp, IconTrendingDown, IconAlertCircle, IconChevronRight, IconCalendarEvent } from '@tabler/icons-react'

const C = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } }
const I = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 26 } } }

function useProximosVencimentos() {
  const fixas = useContasFixas()
  const { mes, ano } = mesAnoAtual()
  const pagamentos = usePagamentosFixos(mes, ano)
  const hoje = new Date().getDate()
  return fixas
    .filter(cf => {
      const pago = pagamentos.find(p => p.contaFixaId === cf.id && p.status === 'pago')
      return !pago && cf.diaVencimento >= hoje && cf.diaVencimento <= hoje + 7
    })
    .sort((a, b) => a.diaVencimento - b.diaVencimento)
}

function useQuantoPossoGastar() {
  const { mes, ano } = mesAnoAtual()
  const { receitas, despesas } = useTotaisMes(mes, ano)
  const fixas = useContasFixas()
  const pagamentos = usePagamentosFixos(mes, ano)
  const pendentes = fixas.filter(cf => !pagamentos.find(p => p.contaFixaId === cf.id && p.status === 'pago'))
  const comprometido = pendentes.reduce((s, cf) => s + cf.valor, 0)
  const diasNoMes = new Date(ano, mes, 0).getDate()
  const diaAtual = new Date().getDate()
  const diasRestantes = Math.max(1, diasNoMes - diaAtual + 1)
  const disponivel = receitas - despesas - comprometido
  return { disponivel, porDia: disponivel / diasRestantes, diasRestantes }
}

export function DashboardPage() {
  const { mes, ano } = mesAnoAtual()
  const navigate = useNavigate()
  const contas = useContas()
  const saldoTotal = useSaldoTotal()
  const transacoes = useTransacoes(5)
  const { receitas, despesas } = useTotaisMes(mes, ano)
  const gastosPorCat = useGastosPorCategoria(mes, ano)
  const categorias = useCategorias('despesa')
  const proximosVenc = useProximosVencimentos()
  const { disponivel, porDia } = useQuantoPossoGastar()
  const orcamentos = useOrcamentos()

  useEffect(() => { seedCategories() }, [])

  const pieData = categorias
    .map(c => ({ name: c.nome, value: gastosPorCat.get(c.id!) ?? 0, color: c.cor, cat: c }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)

  const h = new Date().getHours()
  const saudacao = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
  const mesNome = new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', { month: 'long' })

  return (
    <motion.div variants={C} initial="hidden" animate="show" style={{ padding: '24px 20px', maxWidth: 680, margin: '0 auto' }}>

      {/* Header */}
      <motion.div variants={I} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, color: '#9B7B6A', marginBottom: 4 }}>{saudacao}, Yago!</p>
          <OdometroSaldo value={saldoTotal} style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 40, fontWeight: 700, color: '#2C1A0F', letterSpacing: '-1.5px', display: 'block' }} />
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#9B7B6A', marginTop: 4 }}>
            Saldo total · {contas.length} conta{contas.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Dobrao mood={saldoTotal < 0 ? 'sad' : proximosVenc.length > 0 ? 'happy' : 'happy'} size={72} />
      </motion.div>

      {/* Receitas / Despesas */}
      <motion.div variants={I} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div style={{ background: '#EBF5F0', borderRadius: 18, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
            <IconTrendingUp size={13} color="#3A8580" stroke={2.5} />
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: '#3A8580', letterSpacing: '.05em' }}>RECEITAS</p>
          </div>
          <OdometroSaldo value={receitas} style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: '#2C1A0F', display: 'block' }} />
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#3A8580', marginTop: 2, textTransform: 'capitalize' }}>{mesNome}</p>
        </div>
        <div style={{ background: '#FAF0EE', borderRadius: 18, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
            <IconTrendingDown size={13} color="#C4553B" stroke={2.5} />
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: '#C4553B', letterSpacing: '.05em' }}>DESPESAS</p>
          </div>
          <OdometroSaldo value={despesas} style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: '#2C1A0F', display: 'block' }} />
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#C4553B', marginTop: 2, textTransform: 'capitalize' }}>{mesNome}</p>
        </div>
      </motion.div>

      {/* Quanto posso gastar */}
      {receitas > 0 && (
        <motion.div variants={I} style={{ background: disponivel > 0 ? '#EBF5F0' : '#FAF0EE', borderRadius: 18, padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: disponivel > 0 ? '#3A8580' : '#C4553B', letterSpacing: '.05em', marginBottom: 4 }}>QUANTO POSSO GASTAR HOJE</p>
            <OdometroSaldo value={Math.max(0, porDia)} style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 24, fontWeight: 700, color: '#2C1A0F', display: 'block' }} />
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#9B7B6A', marginTop: 2 }}>
              {fmt(Math.max(0, disponivel))} disponível no mês
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: '#9B7B6A' }}>por dia</p>
          </div>
        </motion.div>
      )}

      {/* Próximos vencimentos */}
      {proximosVenc.length > 0 && (
        <motion.div variants={I} style={{ background: '#FFFDF9', borderRadius: 20, border: '0.5px solid #F0D8A8', padding: '16px 18px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <IconAlertCircle size={16} color="#D4A017" stroke={2} />
            <h3 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700, color: '#D4A017', letterSpacing: '.05em' }}>VENCIMENTOS PRÓXIMOS</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {proximosVenc.slice(0, 3).map(cf => {
              const hoje = new Date().getDate()
              const dias = cf.diaVencimento - hoje
              return (
                <div key={cf.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => navigate('/contas-fixas')}>
                  <div style={{ width: 36, height: 36, borderRadius: 11, background: dias === 0 ? '#FAD0D0' : '#FDF4E3', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <IconCalendarEvent size={18} color={dias === 0 ? '#C4553B' : '#D4A017'} stroke={1.8} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 600, color: '#2C1A0F' }}>{cf.nome}</p>
                    <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: dias === 0 ? '#C4553B' : '#D4A017', fontWeight: 600 }}>
                      {dias === 0 ? 'Vence hoje!' : `Vence em ${dias} dia${dias !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                  <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 15, fontWeight: 700, color: '#2C1A0F', flexShrink: 0 }}>{fmt(cf.valor)}</p>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Contas */}
      {contas.length > 0 && (
        <motion.div variants={I} style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 18, fontWeight: 700, color: '#2C1A0F' }}>Contas</h2>
            <button onClick={() => navigate('/contas')} style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, color: '#C4553B', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}>
              Ver todas <IconChevronRight size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
            {contas.map(c => (
              <motion.div key={c.id} whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }}
                style={{ minWidth: 165, background: c.cor, borderRadius: 20, padding: '16px 18px', cursor: 'pointer', flexShrink: 0 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                  <span style={{ fontFamily: 'Georgia,serif', fontSize: 10, fontWeight: 700, color: 'white' }}>{c.icone}</span>
                </div>
                <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>{c.nome}</p>
                <OdometroSaldo value={c.saldoAtual} style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: 'white', display: 'block' }} />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Donut chart + orçamentos */}
      {pieData.length > 0 && (
        <motion.div variants={I} style={{ background: '#FFFDF9', borderRadius: 20, border: '0.5px solid #E8E0D5', padding: '18px', marginBottom: 20 }}>
          <h2 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 18, fontWeight: 700, color: '#2C1A0F', marginBottom: 16 }}>Gastos de {mesNome}</h2>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ width: 130, height: 130, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={38} outerRadius={58} paddingAngle={3} dataKey="value" strokeWidth={0}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, borderRadius: 10, border: 'none', background: '#2C1A0F', color: 'white' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7, minWidth: 140 }}>
              {pieData.map(d => {
                const orc = orcamentos.find(o => o.categoriaId === d.cat.id)
                const pct = orc ? Math.min(100, (d.value / orc.valorLimite) * 100) : null
                return (
                  <div key={d.name}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: pct !== null ? 4 : 0 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                      <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#2C1A0F', flex: 1 }}>{d.name}</span>
                      <span style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 13, fontWeight: 700, color: '#2C1A0F' }}>{fmt(d.value)}</span>
                    </div>
                    {pct !== null && (
                      <div style={{ background: '#F0EAE2', borderRadius: 4, height: 5, overflow: 'hidden', marginLeft: 17 }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                          style={{ height: '100%', background: pct > 90 ? '#C4553B' : pct > 75 ? '#D4A017' : d.color, borderRadius: 4 }} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* Últimas transações */}
      <motion.div variants={I}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 18, fontWeight: 700, color: '#2C1A0F' }}>Últimas transações</h2>
          <button onClick={() => navigate('/transacoes')} style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, color: '#C4553B', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}>
            Ver todas <IconChevronRight size={14} />
          </button>
        </div>
        {transacoes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <Dobrao mood="sleeping" size={72} />
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#9B7B6A', marginTop: 8 }}>Sem transações · toque no + para lançar</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {transacoes.map((tx, i) => <TxRowDash key={tx.id} tx={tx} i={i} />)}
          </div>
        )}
      </motion.div>

      <div style={{ height: 24 }} />
    </motion.div>
  )
}

function TxRowDash({ tx, i }: { tx: any; i: number }) {
  const [cat, setCat] = useState<any>(null)
  useEffect(() => { db.categorias.get(tx.categoriaId).then(setCat) }, [tx.categoriaId])
  return (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 + i * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
      style={{ background: '#FFFDF9', border: '0.5px solid #E8E0D5', borderRadius: 14, padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 11 }}>
      {cat && <CategoryIcon nome={cat.nome} cor={cat.cor} size={42} radius={13} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 600, color: '#2C1A0F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.descricao}</p>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#C4B4A8', marginTop: 1 }}>{cat?.nome} · {fmtDate(tx.data)}</p>
      </div>
      <OdometroSaldo value={tx.valor} style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 14, fontWeight: 700, color: tx.tipo === 'receita' ? '#3A8580' : '#C4553B', flexShrink: 0, display: 'block' }} />
    </motion.div>
  )
}

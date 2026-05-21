import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Dobrao } from '@/components/mascot/Dobrao'
import { useContas, useSaldoTotal } from '@/db/hooks/useContas'
import { useTransacoes, useTotaisMes, useGastosPorCategoria } from '@/db/hooks/useTransacoes'
import { useCategorias } from '@/db/hooks/useCategorias'
import { useContasFixas, usePagamentosFixos } from '@/db/hooks/useContasFixas'
import { useAllLancamentosAtivos } from '@/db/hooks/useCartoes'
import { useOrcamentos } from '@/db/hooks/useOrcamentos'
import { db, seedCategories } from '@/db/schema'
import { fmt, fmtDate, mesAnoAtual } from '@/lib/format'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { OdometroSaldo } from '@/components/ui/OdometroSaldo'
import { DoodleCircles, DoodleDots } from '@/components/ui/Doodle'
import { IconTrendingUp, IconTrendingDown, IconAlertCircle, IconChevronRight, IconCalendarEvent, IconCreditCard, IconRepeat, IconCalendarStats } from '@tabler/icons-react'

const C = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const I = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 26 } } }

export function DashboardPage() {
  const { mes, ano } = mesAnoAtual()
  const navigate = useNavigate()
  const contas = useContas()
  const saldoTotal = useSaldoTotal()
  const transacoes = useTransacoes(5)
  const { receitas, despesas } = useTotaisMes(mes, ano)
  const gastosPorCat = useGastosPorCategoria(mes, ano)
  const categorias = useCategorias('despesa')
  const contasFixas = useContasFixas()
  const pagamentos = usePagamentosFixos(mes, ano)
  const parcelamentos = useAllLancamentosAtivos().filter(l => l.totalParcelas > 1)
  const orcamentos = useOrcamentos()

  useEffect(() => { seedCategories() }, [])

  // Cálculos integrados do mês
  const fixasPendentes = contasFixas.filter(cf => !pagamentos.find(p => p.contaFixaId === cf.id && p.status === 'pago'))
  const fixasPagas = contasFixas.filter(cf => pagamentos.find(p => p.contaFixaId === cf.id && p.status === 'pago'))
  const totalFixasMes = contasFixas.reduce((s, cf) => s + cf.valor, 0)
  const totalFixasPagas = fixasPagas.reduce((s, cf) => s + cf.valor, 0)
  const totalParcelamentos = parcelamentos.reduce((s, l) => s + l.valor, 0)
  const totalComprometido = despesas + fixasPendentes.reduce((s, cf) => s + cf.valor, 0) + totalParcelamentos
  const saldoLivre = receitas - totalComprometido
  const hoje = new Date().getDate()
  const diasNoMes = new Date(ano, mes, 0).getDate()
  const diasRestantes = Math.max(1, diasNoMes - hoje + 1)
  const porDia = saldoLivre / diasRestantes
  const proximosVenc = contasFixas.filter(cf => {
    const pago = pagamentos.find(p => p.contaFixaId === cf.id && p.status === 'pago')
    return !pago && cf.diaVencimento >= hoje && cf.diaVencimento <= hoje + 7
  }).sort((a, b) => a.diaVencimento - b.diaVencimento)

  const pieData = categorias.map(c => ({ name: c.nome, value: gastosPorCat.get(c.id!) ?? 0, color: c.cor, cat: c }))
    .filter(d => d.value > 0).sort((a, b) => b.value - a.value).slice(0, 6)

  const h = new Date().getHours()
  const saudacao = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
  const mesNome = new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', { month: 'long' })

  return (
    <motion.div variants={C} initial="hidden" animate="show" style={{ padding: '24px 28px', width: '100%' }}>

      {/* Header */}
      <motion.div variants={I} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#9B7B6A', marginBottom: 4 }}>{saudacao}, Yago!</p>
          <OdometroSaldo value={saldoTotal} style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 40, fontWeight: 700, color: '#2C1A0F', letterSpacing: '-1.5px', display: 'block' }} />
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#9B7B6A', marginTop: 4 }}>Saldo em {contas.length} conta{contas.length !== 1 ? 's' : ''}</p>
        </div>
        <Dobrao mood={saldoLivre < 0 ? 'sad' : 'happy'} size={72} />
      </motion.div>

      {/* Panorama financeiro do mês — BLOCO CENTRAL */}
      <motion.div variants={I} style={{ background: '#2C1A0F', borderRadius: 22, padding: '20px 22px', marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, opacity: 0.15 }}>
          <DoodleCircles color="white" opacity={0.4} />
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, opacity: 0.1 }}>
          <DoodleDots color="white" opacity={0.5} />
        </div>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '.06em', marginBottom: 14, textTransform: 'capitalize' }}>PANORAMA DE {mesNome.toUpperCase()}</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div style={{ background: 'rgba(58,133,128,0.2)', borderRadius: 14, padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
              <IconTrendingUp size={12} color="#6EC9C4" stroke={2.5} />
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: '#6EC9C4' }}>ENTRADAS</p>
            </div>
            <OdometroSaldo value={receitas} style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: 'white', display: 'block' }} />
          </div>
          <div style={{ background: 'rgba(196,85,59,0.2)', borderRadius: 14, padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
              <IconTrendingDown size={12} color="#F0957A" stroke={2.5} />
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: '#F0957A' }}>SAÍDAS TOTAIS</p>
            </div>
            <OdometroSaldo value={totalComprometido} style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: 'white', display: 'block' }} />
          </div>
        </div>

        {/* Breakdown das saídas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
          {[
            { icon: IconTrendingDown, label: 'Gastos variáveis', valor: despesas, cor: '#F0957A' },
            { icon: IconRepeat, label: `Contas fixas (${contasFixas.length})`, valor: totalFixasMes, cor: '#FBDB65', sub: `${fixasPagas.length} pagas · ${fixasPendentes.length} pendentes` },
            { icon: IconCalendarStats, label: `Parcelamentos (${parcelamentos.length})`, valor: totalParcelamentos, cor: '#C4B0FF' },
          ].map((item, i) => item.valor > 0 && (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <item.icon size={13} color={item.cor} stroke={2} />
              <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.65)', flex: 1 }}>
                {item.label}{item.sub ? <span style={{ opacity: 0.6 }}> · {item.sub}</span> : ''}
              </span>
              <span style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 13, fontWeight: 700, color: 'white' }}>{fmt(item.valor)}</span>
            </div>
          ))}
        </div>

        {/* Saldo livre */}
        <div style={{ background: saldoLivre >= 0 ? 'rgba(58,133,128,0.25)' : 'rgba(196,85,59,0.25)', borderRadius: 14, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: saldoLivre >= 0 ? '#6EC9C4' : '#F0957A', marginBottom: 3 }}>SALDO LIVRE DO MÊS</p>
            <OdometroSaldo value={saldoLivre} style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700, color: 'white', display: 'block' }} />
          </div>
          {receitas > 0 && (
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: 'rgba(255,255,255,0.5)', marginBottom: 3 }}>por dia</p>
              <OdometroSaldo value={Math.max(0, porDia)} style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.85)', display: 'block' }} />
            </div>
          )}
        </div>
      </motion.div>

      {/* Alertas de vencimento */}
      {proximosVenc.length > 0 && (
        <motion.div variants={I} style={{ background: '#FDF4E3', borderRadius: 18, padding: '14px 16px', marginBottom: 16, border: '0.5px solid #F0D8A8' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <IconAlertCircle size={15} color="#D4A017" stroke={2.2} />
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: '#D4A017', letterSpacing: '.05em' }}>VENCIMENTOS PRÓXIMOS</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {proximosVenc.slice(0, 3).map(cf => {
              const dias = cf.diaVencimento - hoje
              return (
                <div key={cf.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => navigate('/contas-fixas')}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: dias === 0 ? '#FAD0D0' : '#FDF4E3', border: `1px solid ${dias === 0 ? '#F0A8A8' : '#F0D8A8'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <IconCalendarEvent size={17} color={dias === 0 ? '#C4553B' : '#D4A017'} stroke={1.8} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 600, color: '#2C1A0F' }}>{cf.nome}</p>
                    <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: dias === 0 ? '#C4553B' : '#D4A017', fontWeight: 600 }}>
                      {dias === 0 ? 'Vence hoje!' : `${dias} dia${dias !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                  <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 15, fontWeight: 700, color: '#2C1A0F' }}>{fmt(cf.valor)}</p>
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

      {/* Donut + categorias */}
      {pieData.length > 0 && (
        <motion.div variants={I} style={{ background: '#FFFDF9', borderRadius: 20, border: '0.5px solid #E8E0D5', padding: 18, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 18, fontWeight: 700, color: '#2C1A0F' }}>Gastos por categoria</h2>
            <button onClick={() => navigate('/relatorios')} style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, color: '#C4553B', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}>
              Relatórios <IconChevronRight size={14} />
            </button>
          </div>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: pct !== null ? 3 : 0 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                      <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#2C1A0F', flex: 1 }}>{d.name}</span>
                      <span style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 13, fontWeight: 700, color: '#2C1A0F' }}>{fmt(d.value)}</span>
                    </div>
                    {pct !== null && (
                      <div style={{ background: '#F0EAE2', borderRadius: 4, height: 4, overflow: 'hidden', marginLeft: 17 }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ type: 'spring', stiffness: 200, damping: 25 }}
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

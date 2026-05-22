import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Dobrao } from '@/components/mascot/Dobrao'
import { useContas, useSaldoTotal } from '@/db/hooks/useContas'
import { useTransacoes, useTotaisMes, useGastosPorCategoria } from '@/db/hooks/useTransacoes'
import { useCategorias } from '@/db/hooks/useCategorias'
import { useContasFixas, usePagamentosFixos } from '@/db/hooks/useContasFixas'
import { useCartoes, useAllLancamentosAtivos } from '@/db/hooks/useCartoes'
import { useOrcamentos } from '@/db/hooks/useOrcamentos'
import { db, seedCategories } from '@/db/schema'
import { fmt, fmtDate, mesAnoAtual } from '@/lib/format'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { OdometroSaldo } from '@/components/ui/OdometroSaldo'
import { IconTrendingUp, IconTrendingDown, IconAlertCircle, IconChevronRight, IconCalendarEvent, IconCreditCard, IconRepeat, IconCalendarStats, IconArrowUpRight, IconArrowDownRight } from '@tabler/icons-react'

const C = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } }
const I = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 26 } } }

function lightenHex(hex: string, pct: number) {
  if (!hex || hex.length < 7) return hex
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return `#${Math.min(255,Math.round(r+(255-r)*pct/100)).toString(16).padStart(2,'0')}${Math.min(255,Math.round(g+(255-g)*pct/100)).toString(16).padStart(2,'0')}${Math.min(255,Math.round(b+(255-b)*pct/100)).toString(16).padStart(2,'0')}`
}
function darkenHex(hex: string, pct: number) {
  if (!hex || hex.length < 7) return hex
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return `#${Math.max(0,Math.round(r*(1-pct/100))).toString(16).padStart(2,'0')}${Math.max(0,Math.round(g*(1-pct/100))).toString(16).padStart(2,'0')}${Math.max(0,Math.round(b*(1-pct/100))).toString(16).padStart(2,'0')}`
}
function isLightColor(hex: string) {
  if (!hex || hex.length < 7) return false
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return (0.299*r + 0.587*g + 0.114*b) > 170
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
  const contasFixas = useContasFixas()
  const pagamentos = usePagamentosFixos(mes, ano)
  const parcelamentos = useAllLancamentosAtivos().filter(l => l.totalParcelas > 1)
  const orcamentos = useOrcamentos()

  useEffect(() => { seedCategories() }, [])

  const fixasPendentes = contasFixas.filter(cf => !pagamentos.find(p => p.contaFixaId === cf.id && p.status === 'pago'))
  const fixasPagas = contasFixas.filter(cf => pagamentos.find(p => p.contaFixaId === cf.id && p.status === 'pago'))
  const totalFixasMes = contasFixas.reduce((s, cf) => s + cf.valor, 0)
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

  const cartoes = useCartoes()
  const cartoesAlerta = cartoes.filter(c => {
    const diasParaFechar = c.diaFechamento >= hoje ? c.diaFechamento - hoje : 31 - hoje + c.diaFechamento
    return diasParaFechar <= 5
  })

  const pieData = categorias.map(c => ({ name: c.nome, value: gastosPorCat.get(c.id!) ?? 0, color: c.cor, cat: c }))
    .filter(d => d.value > 0).sort((a, b) => b.value - a.value).slice(0, 6)

  const h = new Date().getHours()
  const saudacao = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
  const mesNome = new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', { month: 'long' })

  return (
    <motion.div variants={C} initial="hidden" animate="show" style={{ padding: '24px 28px', width: '100%', maxWidth: 900 }}>

      {/* ─── Hero card: saldo + panorama do mês ─── */}
      <motion.div variants={I} style={{
        background: 'linear-gradient(145deg, #1E0C04 0%, #3E1C0C 40%, #2E1208 75%, #1A0A02 100%)',
        borderRadius: 26,
        padding: '24px 24px 20px',
        marginBottom: 20,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 14px 48px rgba(20,8,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.05)',
      }}>
        {/* Decorative */}
        <div style={{ position: 'absolute', top: -70, right: -70, width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, rgba(196,85,59,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -50, left: -30, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Greeting + balance + mascot */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22 }}>
          <div>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 7, letterSpacing: '.02em' }}>{saudacao}, Yago!</p>
            <OdometroSaldo value={saldoTotal} style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 40, fontWeight: 700, color: 'white', letterSpacing: '-2px', display: 'block', lineHeight: 1 }} />
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 6 }}>
              Saldo em {contas.length} conta{contas.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Dobrao mood={saldoLivre < 0 ? 'sad' : 'happy'} size={68} />
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', marginBottom: 16 }} />

        {/* Panorama label */}
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '.1em', marginBottom: 12, textTransform: 'uppercase' }}>
          Panorama de {mesNome}
        </p>

        {/* Entradas / Saídas */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div style={{ background: 'rgba(58,133,128,0.18)', border: '1px solid rgba(58,133,128,0.22)', borderRadius: 16, padding: '13px 15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
              <div style={{ width: 22, height: 22, borderRadius: 7, background: 'rgba(58,133,128,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconArrowUpRight size={13} color="#6EC9C4" stroke={2.5} />
              </div>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: '#6EC9C4', letterSpacing: '.06em' }}>ENTRADAS</p>
            </div>
            <OdometroSaldo value={receitas} style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700, color: 'white', display: 'block' }} />
          </div>
          <div style={{ background: 'rgba(196,85,59,0.18)', border: '1px solid rgba(196,85,59,0.22)', borderRadius: 16, padding: '13px 15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
              <div style={{ width: 22, height: 22, borderRadius: 7, background: 'rgba(196,85,59,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconArrowDownRight size={13} color="#F0957A" stroke={2.5} />
              </div>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: '#F0957A', letterSpacing: '.06em' }}>SAÍDAS</p>
            </div>
            <OdometroSaldo value={totalComprometido} style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700, color: 'white', display: 'block' }} />
          </div>
        </div>

        {/* Breakdown */}
        {[
          { icon: IconTrendingDown, label: 'Gastos variáveis', valor: despesas, cor: '#F0957A' },
          { icon: IconRepeat, label: `Contas fixas (${contasFixas.length})`, valor: totalFixasMes, cor: '#FBDB65', sub: `${fixasPagas.length} pagas · ${fixasPendentes.length} pendentes` },
          { icon: IconCalendarStats, label: `Parcelamentos (${parcelamentos.length})`, valor: totalParcelamentos, cor: '#C4B0FF' },
        ].filter(item => item.valor > 0).map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
            <item.icon size={13} color={item.cor} stroke={2} />
            <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.55)', flex: 1 }}>
              {item.label}{item.sub ? <span style={{ opacity: 0.7 }}> · {item.sub}</span> : ''}
            </span>
            <span style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>{fmt(item.valor)}</span>
          </div>
        ))}

        {/* Saldo livre */}
        {receitas > 0 && (
          <div style={{
            background: saldoLivre >= 0 ? 'rgba(58,133,128,0.2)' : 'rgba(196,85,59,0.2)',
            border: `1px solid ${saldoLivre >= 0 ? 'rgba(58,133,128,0.25)' : 'rgba(196,85,59,0.25)'}`,
            borderRadius: 16, padding: '13px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12,
          }}>
            <div>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 700, color: saldoLivre >= 0 ? '#6EC9C4' : '#F0957A', marginBottom: 4, letterSpacing: '.08em' }}>SALDO LIVRE DO MÊS</p>
              <OdometroSaldo value={saldoLivre} style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700, color: 'white', display: 'block' }} />
            </div>
            <div style={{ textAlign: 'right', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: 16 }}>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, color: 'rgba(255,255,255,0.4)', marginBottom: 4, letterSpacing: '.05em' }}>POR DIA</p>
              <OdometroSaldo value={Math.max(0, porDia)} style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.75)', display: 'block' }} />
            </div>
          </div>
        )}
      </motion.div>

      {/* ─── Alertas de vencimento ─── */}
      {proximosVenc.length > 0 && (
        <motion.div variants={I} style={{ background: '#FFFBF0', borderRadius: 20, padding: '16px 18px', marginBottom: 14, border: '1px solid #F5DFA0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: 9, background: '#FEF3CC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconAlertCircle size={15} color="#D4A017" stroke={2.2} />
            </div>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: '#B8860B', letterSpacing: '.05em' }}>VENCIMENTOS PRÓXIMOS</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {proximosVenc.slice(0, 3).map(cf => {
              const dias = cf.diaVencimento - hoje
              return (
                <div key={cf.id} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => navigate('/contas-fixas')}>
                  <div style={{ width: 36, height: 36, borderRadius: 11, background: dias === 0 ? '#FEE2DC' : '#FEF3CC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <IconCalendarEvent size={18} color={dias === 0 ? '#C4553B' : '#D4A017'} stroke={1.8} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 600, color: '#2C1A0F' }}>{cf.nome}</p>
                    <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: dias === 0 ? '#C4553B' : '#C4953B', fontWeight: 600 }}>
                      {dias === 0 ? 'Vence hoje!' : `Em ${dias} dia${dias !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                  <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 15, fontWeight: 700, color: '#2C1A0F' }}>{fmt(cf.valor)}</p>
                  <IconChevronRight size={14} color="#C4B4A8" />
                </div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* ─── Alertas de fatura cartão ─── */}
      {cartoesAlerta.length > 0 && (
        <motion.div variants={I} style={{ background: '#FFF6F4', borderRadius: 20, padding: '16px 18px', marginBottom: 14, border: '1px solid #F5C8B8' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: 9, background: '#FEE2DC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconCreditCard size={15} color="#C4553B" stroke={2.2} />
            </div>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: '#A83828', letterSpacing: '.05em' }}>FATURA FECHANDO EM BREVE</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {cartoesAlerta.map(c => {
              const dias = c.diaFechamento >= hoje ? c.diaFechamento - hoje : 0
              return (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => navigate('/cartoes')}>
                  <div style={{ width: 36, height: 36, borderRadius: 11, background: c.cor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <IconCreditCard size={18} color="white" stroke={1.8} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 600, color: '#2C1A0F' }}>{c.nome}</p>
                    <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: dias === 0 ? '#C4553B' : '#C4953B', fontWeight: 600 }}>
                      {dias === 0 ? 'Fecha hoje!' : `Fecha em ${dias} dia${dias !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                  <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#9B7B6A' }}>dia {c.diaFechamento}</p>
                  <IconChevronRight size={14} color="#C4B4A8" />
                </div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* ─── Contas ─── */}
      {contas.length > 0 && (
        <motion.div variants={I} style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 13 }}>
            <h2 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 19, fontWeight: 700, color: '#2C1A0F' }}>Contas</h2>
            <button onClick={() => navigate('/contas')} style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, color: '#C4553B', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
              Ver todas <IconChevronRight size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: 11, overflowX: 'auto', paddingBottom: 6 }}>
            {contas.map(c => {
              const light = isLightColor(c.cor)
              const txt = light ? 'rgba(30,15,0,0.88)' : 'rgba(255,255,255,0.95)'
              const sub = light ? 'rgba(30,15,0,0.5)' : 'rgba(255,255,255,0.55)'
              return (
                <motion.div key={c.id} whileHover={{ y: -4, boxShadow: `0 12px 32px ${c.cor}50` }} whileTap={{ scale: 0.97 }}
                  onClick={() => navigate(`/transacoes?conta=${c.id}`)}
                  style={{
                    minWidth: 160, cursor: 'pointer', flexShrink: 0,
                    background: `linear-gradient(140deg, ${lightenHex(c.cor, 20)} 0%, ${c.cor} 50%, ${darkenHex(c.cor, 28)} 100%)`,
                    borderRadius: 20, padding: '16px 17px',
                    boxShadow: `0 5px 20px ${c.cor}35`,
                    position: 'relative', overflow: 'hidden',
                    transition: 'box-shadow .2s',
                  }}>
                  <div style={{ position: 'absolute', top: -25, right: -25, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: light ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.18)', border: light ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 11 }}>
                    <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 800, color: txt }}>{c.icone}</span>
                  </div>
                  <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600, color: sub, marginBottom: 3 }}>{c.nome}</p>
                  <OdometroSaldo value={c.saldoAtual} style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: txt, display: 'block', letterSpacing: '-0.5px' }} />
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* ─── Gastos por categoria ─── */}
      {pieData.length > 0 && (
        <motion.div variants={I} style={{ background: '#FFFDF9', borderRadius: 22, border: '1px solid #EDE6DC', padding: '18px 20px', marginBottom: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 19, fontWeight: 700, color: '#2C1A0F' }}>Gastos por categoria</h2>
            <button onClick={() => navigate('/relatorios')} style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, color: '#C4553B', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
              Relatórios <IconChevronRight size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ width: 130, height: 130, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value" strokeWidth={0}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, borderRadius: 10, border: 'none', background: '#2C1A0F', color: 'white', padding: '6px 12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 9, minWidth: 140 }}>
              {pieData.map(d => {
                const orc = orcamentos.find(o => o.categoriaId === d.cat.id)
                const pct = orc ? Math.min(100, (d.value / orc.valorLimite) * 100) : null
                return (
                  <div key={d.name}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: pct !== null ? 4 : 0 }}>
                      <div style={{ width: 9, height: 9, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                      <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#2C1A0F', flex: 1 }}>{d.name}</span>
                      <span style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 13, fontWeight: 700, color: '#2C1A0F' }}>{fmt(d.value)}</span>
                    </div>
                    {pct !== null && (
                      <div style={{ background: '#EDE6DC', borderRadius: 4, height: 4, overflow: 'hidden', marginLeft: 17 }}>
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

      {/* ─── Últimas transações ─── */}
      <motion.div variants={I}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 13 }}>
          <h2 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 19, fontWeight: 700, color: '#2C1A0F' }}>Últimas transações</h2>
          <button onClick={() => navigate('/transacoes')} style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, color: '#C4553B', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
            Ver todas <IconChevronRight size={14} />
          </button>
        </div>
        {transacoes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '28px 0', background: '#FFFDF9', borderRadius: 20, border: '1px solid #EDE6DC' }}>
            <Dobrao mood="sleeping" size={72} />
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#9B7B6A', marginTop: 8 }}>Sem transações · toque no + para lançar</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {transacoes.map((tx, i) => <TxRowDash key={tx.id} tx={tx} i={i} />)}
          </div>
        )}
      </motion.div>

      <div style={{ height: 32 }} />
    </motion.div>
  )
}

function TxRowDash({ tx, i }: { tx: any; i: number }) {
  const [cat, setCat] = useState<any>(null)
  useEffect(() => { db.categorias.get(tx.categoriaId).then(setCat) }, [tx.categoriaId])
  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.18 + i * 0.05, type: 'spring', stiffness: 300, damping: 26 }}
      style={{ background: '#FFFDF9', border: '1px solid #EDE6DC', borderRadius: 16, padding: '12px 15px', display: 'flex', alignItems: 'center', gap: 12 }}>
      {cat && <CategoryIcon nome={cat.nome} cor={cat.cor} size={44} radius={14} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 600, color: '#2C1A0F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.descricao}</p>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#C4B4A8', marginTop: 2 }}>{cat?.nome} · {fmtDate(tx.data)}</p>
      </div>
      <OdometroSaldo value={tx.valor} style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 15, fontWeight: 700, color: tx.tipo === 'receita' ? '#3A8580' : '#C4553B', flexShrink: 0, display: 'block' }} />
    </motion.div>
  )
}

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Dobrao } from '@/components/mascot/Dobrao'
import { useContas, useSaldoTotal } from '@/db/hooks/useContas'
import { useTransacoes, useTotaisMes, useGastosPorCategoria } from '@/db/hooks/useTransacoes'
import { useCategorias } from '@/db/hooks/useCategorias'
import { useContasFixas, usePagamentosFixos } from '@/db/hooks/useContasFixas'
import { useCartoes, useAllLancamentosAtivos } from '@/db/hooks/useCartoes'
import { useOrcamentos } from '@/db/hooks/useOrcamentos'
import { db } from '@/db/schema'
import { fmt, fmtDate, mesAnoAtual } from '@/lib/format'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { OdometroSaldo } from '@/components/ui/OdometroSaldo'
import {
  IconAlertCircle, IconChevronRight, IconCalendarEvent,
  IconCreditCard, IconRepeat, IconCalendarStats,
  IconArrowUpRight, IconArrowDownRight, IconTrendingDown,
  IconWallet, IconPercentage,
} from '@tabler/icons-react'

// ─── Animation system ────────────────────────────────────────────
const STAGGER = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } }
const ITEM = { hidden: { opacity: 0, y: 18, scale: 0.97 }, show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 260, damping: 26 } } }

// ─── Design tokens ───────────────────────────────────────────────
const CARD: React.CSSProperties = { background: '#FFFFFF', border: '1px solid #EDE6DC', borderRadius: 20, boxShadow: '0 1px 3px rgba(44,26,15,0.05), 0 4px 16px rgba(44,26,15,0.06)' }
const LABEL: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '.09em', textTransform: 'uppercase', color: '#9B7B6A' }
const DISPLAY: React.CSSProperties = { fontFamily: "'Fraunces',Georgia,serif", fontWeight: 700, letterSpacing: '-1px', lineHeight: 1.1 }

// ─── Dark tooltip para Recharts ──────────────────────────────────
function DarkTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ color?: string; value: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#1A0A05', borderRadius: 10, padding: '8px 12px', border: '1px solid rgba(255,255,255,0.08)' }}>
      {label && <p style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 10, color: 'rgba(255,255,255,0.45)', marginBottom: 5, letterSpacing: '.06em', textTransform: 'uppercase' }}>{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ ...DISPLAY, fontSize: 13, color: p.color ?? 'white' }}>{fmt(p.value)}</p>
      ))}
    </div>
  )
}

export function DashboardPage() {
  const { mes, ano } = mesAnoAtual()
  const navigate = useNavigate()
  const contas = useContas()
  const saldoTotal = useSaldoTotal()
  const transacoes = useTransacoes(8)
  const { receitas, despesas } = useTotaisMes(mes, ano)
  const gastosPorCat = useGastosPorCategoria(mes, ano)
  const categorias = useCategorias('despesa')
  const contasFixas = useContasFixas()
  const pagamentos = usePagamentosFixos(mes, ano)
  const parcelamentos = useAllLancamentosAtivos().filter(l => l.totalParcelas > 1)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _orcamentos = useOrcamentos()
  const cartoes = useCartoes()

  const fixasPendentes = contasFixas.filter(cf => !pagamentos.find(p => p.contaFixaId === cf.id && p.status === 'pago'))
  const fixasPagas = contasFixas.filter(cf => pagamentos.find(p => p.contaFixaId === cf.id && p.status === 'pago'))
  const totalFixasMes = contasFixas.reduce((s, cf) => s + cf.valor, 0)
  const totalParcelamentos = parcelamentos.reduce((s, l) => s + l.valor, 0)
  const totalComprometido = despesas + fixasPendentes.reduce((s, cf) => s + cf.valor, 0) + totalParcelamentos
  const saldoLivre = receitas - totalComprometido
  const taxaPoupanca = receitas > 0 ? Math.max(0, (receitas - despesas) / receitas * 100) : 0

  const hoje = new Date().getDate()
  const diasNoMes = new Date(ano, mes, 0).getDate()
  const diasRestantes = Math.max(1, diasNoMes - hoje + 1)
  const porDia = saldoLivre / diasRestantes

  const proximosVenc = contasFixas.filter(cf => {
    const pago = pagamentos.find(p => p.contaFixaId === cf.id && p.status === 'pago')
    return !pago && cf.diaVencimento >= hoje && cf.diaVencimento <= hoje + 7
  }).sort((a, b) => a.diaVencimento - b.diaVencimento)

  const cartoesAlerta = cartoes.filter(c => {
    const dias = c.diaFechamento >= hoje ? c.diaFechamento - hoje : 31 - hoje + c.diaFechamento
    return dias <= 5
  })

  const pieData = categorias
    .map(c => ({ name: c.nome, value: gastosPorCat.get(c.id!) ?? 0, color: c.cor, cat: c }))
    .filter(d => d.value > 0).sort((a, b) => b.value - a.value).slice(0, 6)

  const h = new Date().getHours()
  const saudacao = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
  const mesNome = new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', { month: 'long' })
  const dataHoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  const hasAlerts = proximosVenc.length > 0 || cartoesAlerta.length > 0

  const kpis = [
    { label: 'Saldo total', value: saldoTotal as number | null, color: '#2C1A0F', icon: <IconWallet size={16} color="#9B7B6A" stroke={1.8} />, acent: '#2C1A0F', pct: null as number | null },
    { label: 'Entradas', value: receitas as number | null, color: '#3A8580', icon: <IconArrowUpRight size={16} color="#3A8580" stroke={2} />, acent: '#3A8580', pct: null as number | null },
    { label: 'Saídas', value: totalComprometido as number | null, color: '#C4553B', icon: <IconArrowDownRight size={16} color="#C4553B" stroke={2} />, acent: '#C4553B', pct: null as number | null },
    { label: 'Taxa de poupança', value: null as number | null, color: taxaPoupanca > 20 ? '#3A8580' : taxaPoupanca > 0 ? '#D4A017' : '#C4553B', icon: <IconPercentage size={16} color="#9B7B6A" stroke={1.8} />, acent: '#9B7B6A', pct: taxaPoupanca },
  ]

  return (
    <motion.div
      variants={STAGGER} initial="hidden" animate="show"
      style={{ width: '100%', padding: '32px', paddingBottom: 48 }}>

      {/* ─── ROW 1: Greeting ─── */}
      <motion.div variants={ITEM} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Dobrao mood={saldoLivre < 0 ? 'sad' : 'happy'} size={56} />
          <div>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#9B7B6A', marginBottom: 2 }}>
              {saudacao}, Yago
            </p>
            <h1 style={{ ...DISPLAY, fontSize: 32, color: '#2C1A0F', letterSpacing: '-1.5px' }}>
              {dataHoje.charAt(0).toUpperCase() + dataHoje.slice(1)}
            </h1>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ background: '#FFFFFF', border: '1px solid #EDE6DC', borderRadius: 12, padding: '8px 16px', boxShadow: '0 1px 4px rgba(44,26,15,0.06)' }}>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, color: '#7A5C4F', textTransform: 'capitalize' }}>{mesNome} {ano}</p>
          </div>
          {hasAlerts && (
            <div style={{ background: '#FEE2DC', border: '1px solid rgba(196,85,59,0.2)', borderRadius: 12, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <IconAlertCircle size={14} color="#C4553B" stroke={2} />
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700, color: '#C4553B' }}>
                {proximosVenc.length + cartoesAlerta.length} alerta{(proximosVenc.length + cartoesAlerta.length) !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      </motion.div>

      {/* ─── ROW 2: 4 KPI blocks ─── */}
      <motion.div variants={ITEM} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {kpis.map((kpi, i) => (
          <motion.div key={i} whileHover={{ y: -3, boxShadow: '0 8px 28px rgba(44,26,15,0.1)' }}
            style={{ ...CARD, padding: '18px 20px', transition: 'box-shadow .18s', borderTop: `3px solid ${kpi.acent}22` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              {kpi.icon}
              <span style={{ ...LABEL }}>{kpi.label}</span>
            </div>
            {kpi.value !== null ? (
              <OdometroSaldo value={kpi.value} style={{ ...DISPLAY, fontSize: 26, color: kpi.color, display: 'block' }} />
            ) : (
              <div>
                <p style={{ ...DISPLAY, fontSize: 26, color: kpi.color }}>{kpi.pct!.toFixed(1)}%</p>
                <div style={{ background: '#F5F0E8', borderRadius: 4, height: 4, overflow: 'hidden', marginTop: 8 }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, kpi.pct!)}%` }}
                    transition={{ type: 'spring', stiffness: 180, damping: 24, delay: 0.3 }}
                    style={{ height: '100%', background: kpi.color, borderRadius: 4 }} />
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </motion.div>

      {/* ─── ROW 3: Hero dark card (2/3) + Gastos por categoria (1/3) ─── */}
      <motion.div variants={ITEM} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 20, alignItems: 'start' }}>

        {/* Hero dark card — PANORAMA */}
        <div style={{
          background: 'linear-gradient(148deg, #0D0604 0%, #1C0A06 100%)',
          borderRadius: 22,
          padding: '26px 28px',
          boxShadow: '0 16px 48px rgba(13,6,4,0.5), 0 4px 16px rgba(13,6,4,0.25)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <p style={{ ...LABEL, color: 'rgba(255,255,255,0.35)', marginBottom: 6 }}>Panorama · {mesNome}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                    <IconArrowUpRight size={11} color="#6EC9C4" stroke={2.5} />
                    <span style={{ ...LABEL, color: '#6EC9C4', fontSize: 9 }}>Entradas</span>
                  </div>
                  <OdometroSaldo value={receitas} style={{ ...DISPLAY, fontSize: 24, color: 'white', display: 'block' }} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                    <IconArrowDownRight size={11} color="#F0957A" stroke={2.5} />
                    <span style={{ ...LABEL, color: '#F0957A', fontSize: 9 }}>Saídas</span>
                  </div>
                  <OdometroSaldo value={totalComprometido} style={{ ...DISPLAY, fontSize: 24, color: 'white', display: 'block' }} />
                </div>
              </div>
            </div>
          </div>

          <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: 16 }} />

          {[
            { icon: IconTrendingDown, label: 'Gastos variáveis', valor: despesas, sub: undefined as string | undefined },
            { icon: IconRepeat, label: `Contas fixas (${contasFixas.length})`, valor: totalFixasMes, sub: `${fixasPagas.length} pagas · ${fixasPendentes.length} pendentes` },
            { icon: IconCalendarStats, label: `Parcelamentos (${parcelamentos.length})`, valor: totalParcelamentos, sub: undefined as string | undefined },
          ].filter(item => item.valor > 0).map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <item.icon size={12} color="rgba(255,255,255,0.28)" stroke={1.8} />
              <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.45)', flex: 1 }}>
                {item.label}{item.sub ? <span style={{ opacity: .65 }}> · {item.sub}</span> : ''}
              </span>
              <span style={{ ...DISPLAY, fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{fmt(item.valor)}</span>
            </div>
          ))}

          {receitas > 0 && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ ...LABEL, color: saldoLivre >= 0 ? '#6EC9C4' : '#F0957A', marginBottom: 5 }}>Saldo livre</p>
                <OdometroSaldo value={saldoLivre} style={{ ...DISPLAY, fontSize: 22, color: 'white', display: 'block' }} />
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ ...LABEL, color: 'rgba(255,255,255,0.28)', marginBottom: 5 }}>Por dia</p>
                <OdometroSaldo value={Math.max(0, porDia)} style={{ ...DISPLAY, fontSize: 18, color: 'rgba(255,255,255,0.6)', display: 'block' }} />
              </div>
            </div>
          )}
        </div>

        {/* Gastos por categoria */}
        <div style={{ ...CARD, padding: '22px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h2 style={{ ...DISPLAY, fontSize: 17, color: '#2C1A0F' }}>Por categoria</h2>
            <button onClick={() => navigate('/relatorios')}
              style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600, color: '#C4553B', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
              Ver <IconChevronRight size={13} />
            </button>
          </div>

          {pieData.length > 0 ? (
            <>
              <div style={{ position: 'relative', width: '100%', height: 150, marginBottom: 16 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={44} outerRadius={68} paddingAngle={2} dataKey="value" strokeWidth={0}>
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip content={<DarkTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ ...LABEL, fontSize: 8, marginBottom: 2 }}>Total</p>
                    <p style={{ ...DISPLAY, fontSize: 15, color: '#2C1A0F' }}>{fmt(despesas)}</p>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flex: 1 }}>
                {pieData.slice(0, 4).map(d => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                    <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#2C1A0F', flex: 1 }}>{d.name}</span>
                    <span style={{ ...DISPLAY, fontSize: 12, color: '#2C1A0F' }}>{fmt(d.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#9B7B6A', textAlign: 'center' }}>Sem gastos em {mesNome}</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* ─── ROW 4: Contas scroll ─── */}
      {contas.length > 0 && (
        <motion.div variants={ITEM} style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ ...DISPLAY, fontSize: 20, color: '#2C1A0F' }}>Contas</h2>
            <button onClick={() => navigate('/contas')}
              style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, color: '#C4553B', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
              Ver todas <IconChevronRight size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
            {contas.map(c => (
              <motion.div key={c.id} whileHover={{ y: -4, boxShadow: '0 10px 30px rgba(44,26,15,0.12)' }} whileTap={{ scale: 0.97 }}
                onClick={() => navigate(`/transacoes?conta=${c.id}`)}
                style={{ minWidth: 160, flexShrink: 0, cursor: 'pointer', background: '#FFFFFF', borderRadius: 18, padding: '16px 18px', border: '1px solid #EDE6DC', borderTop: `3px solid ${c.cor}`, boxShadow: '0 1px 3px rgba(44,26,15,0.05), 0 4px 14px rgba(44,26,15,0.05)', transition: 'box-shadow .18s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 9, background: c.cor, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 2px 8px ${c.cor}45` }}>
                    <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 800, color: 'white' }}>{c.icone}</span>
                  </div>
                  <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, color: '#7A5C4F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nome}</p>
                </div>
                <OdometroSaldo value={c.saldoAtual} style={{ ...DISPLAY, fontSize: 20, color: c.saldoAtual < 0 ? '#C4553B' : '#2C1A0F', display: 'block', letterSpacing: '-0.5px' }} />
                <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: '#C4B4A8', marginTop: 3, textTransform: 'capitalize' }}>{c.tipo}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ─── ROW 5: Transações (3/5) + Alertas (2/5) ─── */}
      <motion.div variants={ITEM} style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 14 }}>

        {/* Últimas transações — título dentro do card */}
        <div style={{ ...CARD, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 18px 0' }}>
            <h2 style={{ ...DISPLAY, fontSize: 18, color: '#2C1A0F' }}>Últimas transações</h2>
            <button onClick={() => navigate('/transacoes')}
              style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, color: '#C4553B', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
              Ver todas <IconChevronRight size={14} />
            </button>
          </div>
          {transacoes.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 0' }}>
              <Dobrao mood="sleeping" size={64} />
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#9B7B6A', marginTop: 8 }}>Sem transações · toque no + para lançar</p>
            </div>
          ) : (
            <div style={{ marginTop: 8 }}>
              {transacoes.map((tx, i) => <TxRow key={tx.id} tx={tx} i={i} last={i === transacoes.length - 1} />)}
            </div>
          )}
        </div>

        {/* Alertas e resumo — card único que estica para igualar altura */}
        <div style={{ ...CARD, padding: '18px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Vencimentos */}
          <AnimatePresence>
            {proximosVenc.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 9, background: '#FEF3CC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IconAlertCircle size={14} color="#D4A017" stroke={2} />
                  </div>
                  <p style={{ ...LABEL, color: '#B8860B' }}>Vencimentos</p>
                </div>
                {proximosVenc.slice(0, 3).map((cf, idx) => {
                  const dias = cf.diaVencimento - hoje
                  return (
                    <div key={cf.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', paddingTop: idx > 0 ? 10 : 0, borderTop: idx > 0 ? '1px solid #F5F0E8' : 'none', marginTop: idx > 0 ? 10 : 0 }}
                      onClick={() => navigate('/contas-fixas')}>
                      <div style={{ width: 36, height: 36, borderRadius: 11, background: dias === 0 ? '#FEE2DC' : '#FEF8E6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <IconCalendarEvent size={16} color={dias === 0 ? '#C4553B' : '#D4A017'} stroke={1.8} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 600, color: '#2C1A0F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cf.nome}</p>
                        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: dias === 0 ? '#C4553B' : '#C49A3C', fontWeight: 600, marginTop: 1 }}>
                          {dias === 0 ? 'Vence hoje!' : `Em ${dias} dia${dias !== 1 ? 's' : ''}`}
                        </p>
                      </div>
                      <p style={{ ...DISPLAY, fontSize: 13, color: '#2C1A0F', flexShrink: 0 }}>{fmt(cf.valor)}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </AnimatePresence>

          {/* Alertas cartão */}
          <AnimatePresence>
            {cartoesAlerta.length > 0 && (
              <div style={{ borderTop: proximosVenc.length > 0 ? '1px solid #F5F0E8' : 'none', paddingTop: proximosVenc.length > 0 ? 12 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 9, background: '#FEE2DC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IconCreditCard size={14} color="#C4553B" stroke={2} />
                  </div>
                  <p style={{ ...LABEL, color: '#A83828' }}>Faturas fechando</p>
                </div>
                {cartoesAlerta.map((c, idx) => {
                  const dias = c.diaFechamento >= hoje ? c.diaFechamento - hoje : 0
                  return (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', paddingTop: idx > 0 ? 10 : 0, borderTop: idx > 0 ? '1px solid #F5F0E8' : 'none', marginTop: idx > 0 ? 10 : 0 }}
                      onClick={() => navigate('/cartoes')}>
                      <div style={{ width: 36, height: 36, borderRadius: 11, background: c.cor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <IconCreditCard size={16} color="white" stroke={1.8} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 600, color: '#2C1A0F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nome}</p>
                        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: dias === 0 ? '#C4553B' : '#C49A3C', fontWeight: 600, marginTop: 1 }}>
                          {dias === 0 ? 'Fecha hoje!' : `Fecha em ${dias} dia${dias !== 1 ? 's' : ''}`}
                        </p>
                      </div>
                      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#9B7B6A', flexShrink: 0 }}>dia {c.diaFechamento}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </AnimatePresence>

          {/* Se não há alertas — resumo rápido */}
          {!hasAlerts && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <h3 style={{ ...DISPLAY, fontSize: 16, color: '#2C1A0F' }}>Resumo do mês</h3>
              {[
                { label: 'Contas fixas', val: totalFixasMes, sub: `${fixasPagas.length}/${contasFixas.length} pagas`, cor: '#D4A017' },
                { label: 'Parcelamentos', val: totalParcelamentos, sub: `${parcelamentos.length} ativos`, cor: '#7C5CBF' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: i > 0 ? 14 : 0, borderTop: i > 0 ? '1px solid #F5F0E8' : 'none' }}>
                  <div>
                    <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 600, color: '#2C1A0F' }}>{item.label}</p>
                    <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#9B7B6A', marginTop: 2 }}>{item.sub}</p>
                  </div>
                  <p style={{ ...DISPLAY, fontSize: 16, color: item.cor }}>{fmt(item.val)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

function TxRow({ tx, i, last }: { tx: any; i: number; last: boolean }) {
  const [cat, setCat] = useState<any>(null)
  useEffect(() => { db.categorias.get(tx.categoriaId).then(setCat) }, [tx.categoriaId])
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 + i * 0.035, type: 'spring', stiffness: 280, damping: 26 }}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: last ? 'none' : '1px solid #F5F0EA' }}>
      {cat && <CategoryIcon nome={cat.nome} cor={cat.cor} size={40} radius={12} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 600, color: '#2C1A0F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.descricao}</p>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#9B7B6A', marginTop: 1 }}>{cat?.nome} · {fmtDate(tx.data)}</p>
      </div>
      <p style={{ ...DISPLAY, fontSize: 14, color: tx.tipo === 'receita' ? '#3A8580' : '#C4553B', flexShrink: 0 }}>
        {tx.tipo === 'receita' ? '+' : '-'}{fmt(tx.valor)}
      </p>
    </motion.div>
  )
}

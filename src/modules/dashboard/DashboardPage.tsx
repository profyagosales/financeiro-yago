import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts'
import { useContas, useSaldoTotal } from '@/db/hooks/useContas'
import { useTransacoes, useTransacoesByMes, useTotaisMes, useGastosPorCategoria } from '@/db/hooks/useTransacoes'
import { useCategorias } from '@/db/hooks/useCategorias'
import { useContasFixas, usePagamentosFixos } from '@/db/hooks/useContasFixas'
import { useCartoes, useAllLancamentosAtivos } from '@/db/hooks/useCartoes'
import { useOrcamentos } from '@/db/hooks/useOrcamentos'
import { useMetasComputed, useReservaEmergencia } from '@/db/hooks/useMetas'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/schema'
import { fmt, fmtDate, mesAnoAtual } from '@/lib/format'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { OdometroSaldo } from '@/components/ui/OdometroSaldo'
import {
  IconAlertCircle, IconChevronRight, IconCalendarEvent,
  IconCreditCard, IconRepeat, IconCalendarStats,
  IconArrowUpRight, IconArrowDownRight, IconTrendingDown,
  IconWallet, IconPercentage, IconShieldCheck, IconPlus,
} from '@tabler/icons-react'

// ─── Animation system ────────────────────────────────────────────
const STAGGER = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } }
const ITEM = { hidden: { opacity: 0, y: 18, scale: 0.97 }, show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 260, damping: 26 } } }

// ─── Design tokens ───────────────────────────────────────────────
const CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,0.72)',
  backdropFilter: 'blur(18px)',
  WebkitBackdropFilter: 'blur(18px)',
  borderRadius: 22,
  border: '1px solid rgba(255,255,255,0.6)',
  boxShadow: '0 8px 32px rgba(44,26,15,0.07), 0 1px 4px rgba(44,26,15,0.04)',
}
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
  const [hoveredDay, setHoveredDay] = useState<number | null>(null)
  const contas = useContas()
  const saldoTotal = useSaldoTotal()
  const transacoes = useTransacoes(8)
  const { receitas, despesas } = useTotaisMes(mes, ano)
  const gastosPorCat = useGastosPorCategoria(mes, ano)
  const categorias = useCategorias('despesa')
  const contasFixas = useContasFixas()
  const pagamentos = usePagamentosFixos(mes, ano)
  const parcelamentos = useAllLancamentosAtivos().filter(l => l.totalParcelas > 1)
  const _orcamentos = useOrcamentos()
  const cartoes = useCartoes()

  const fixasPendentes = contasFixas.filter(cf => !pagamentos.find(p => p.contaFixaId === cf.id && p.status === 'pago'))
  const totalParcelamentos = parcelamentos.reduce((s, l) => s + l.valor, 0)
  const totalComprometido = despesas + fixasPendentes.reduce((s, cf) => s + cf.valor, 0) + totalParcelamentos
  const saldoLivre = receitas - totalComprometido

  const hoje = new Date().getDate()
  const diasNoMes = new Date(ano, mes, 0).getDate()

  const pieData = categorias
    .map(c => ({ name: c.nome, value: gastosPorCat.get(c.id!) ?? 0, color: c.cor, cat: c }))
    .filter(d => d.value > 0).sort((a, b) => b.value - a.value).slice(0, 6)

  const mesNome = new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', { month: 'long' })

  const metas = useMetasComputed()
  const reserva = useReservaEmergencia()
  const outrasMetas = metas.filter(m => m.tipo !== 'reserva_emergencia')
  const txsMes = useTransacoesByMes(mes, ano)
  const top5 = [...txsMes].filter(t => t.tipo === 'despesa').sort((a, b) => b.valor - a.valor).slice(0, 5)

  const txsAno = useLiveQuery(() => {
    const inicio = `${ano}-01-01`
    const fim    = `${ano}-12-31`
    return db.transacoes.where('data').between(inicio, fim, true, true).toArray()
  }, [ano]) ?? []

  const mesesData = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1
    const label = new Date(ano, i, 1).toLocaleDateString('pt-BR', { month: 'short' })
    const txs = txsAno.filter(t => parseInt(t.data.split('-')[1]) === m)
    return {
      mes: label.charAt(0).toUpperCase() + label.slice(1),
      Receitas: txs.filter(t => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0),
      Despesas: txs.filter(t => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0),
    }
  })

  const hasYearData = mesesData.some(m => m.Receitas > 0 || m.Despesas > 0)

  // Calendar event map: day -> color[]
  const calendarEvents = new Map<number, string[]>()
  contasFixas.forEach(cf => {
    const day = cf.diaVencimento
    const isPaid = !!pagamentos.find(p => p.contaFixaId === cf.id && p.status === 'pago')
    const color = isPaid ? '#3A8580' : '#D4A017'
    calendarEvents.set(day, [...(calendarEvents.get(day) ?? []), color])
  })
  cartoes.forEach(c => {
    const fechDay = c.diaFechamento
    calendarEvents.set(fechDay, [...(calendarEvents.get(fechDay) ?? []), '#504E76'])
    const vencDay = c.diaVencimento
    calendarEvents.set(vencDay, [...(calendarEvents.get(vencDay) ?? []), '#C4553B'])
  })

  const calFirstDow = new Date(ano, mes - 1, 1).getDay() // 0=Sun
  const calDaysInMonth = new Date(ano, mes, 0).getDate()
  const calCells = calFirstDow + calDaysInMonth // total cells needed

  // Month events list for the Rich Calendar
  type MonthEvent = { day: number; name: string; tipo: string; cor: string; valor?: number }
  const monthEventsList: MonthEvent[] = []
  contasFixas.forEach(cf => {
    const isPaid = !!pagamentos.find(p => p.contaFixaId === cf.id && p.status === 'pago')
    monthEventsList.push({ day: cf.diaVencimento, name: cf.nome, tipo: isPaid ? 'Conta fixa · paga' : 'Conta fixa · pendente', cor: isPaid ? '#3A8580' : '#D4A017', valor: cf.valor })
  })
  cartoes.forEach(c => {
    monthEventsList.push({ day: c.diaFechamento, name: c.nome, tipo: 'Fecha fatura', cor: '#504E76' })
    monthEventsList.push({ day: c.diaVencimento, name: c.nome, tipo: 'Vence fatura', cor: '#C4553B' })
  })
  monthEventsList.sort((a, b) => a.day - b.day)

  // Map day -> events for hover tooltip
  const eventsByDay = new Map<number, MonthEvent[]>()
  monthEventsList.forEach(ev => {
    eventsByDay.set(ev.day, [...(eventsByDay.get(ev.day) ?? []), ev])
  })


  return (
    <motion.div
      variants={STAGGER} initial="hidden" animate="show"
      style={{ width: '100%', padding: '32px', paddingBottom: 48 }}>

      {/* ─── ROW 1: KPIs (vertical) + Rich Calendar ─── */}
      {(() => {
        const saldoMes = receitas - totalComprometido
        const saldoColor  = saldoMes >= 0 ? '#3A8580' : '#C4553B'
        const saldoShadow = saldoMes >= 0 ? 'rgba(58,133,128,0.4)' : 'rgba(196,85,59,0.4)'

        // ── Trends: comparação com mês anterior + sparkline últimos 6 meses ──
        const prev = mesesData[mes - 2] // mes é 1-indexed
        const receitasAnt = prev?.Receitas ?? 0
        const despesasAnt = prev?.Despesas ?? 0
        const saldoAnt = receitasAnt - despesasAnt
        const calcTrend = (cur: number, ant: number) => {
          if (ant === 0) return cur === 0 ? 0 : 100
          return ((cur - ant) / Math.abs(ant)) * 100
        }
        const trendReceitas  = calcTrend(receitas, receitasAnt)
        const trendDespesas  = calcTrend(totalComprometido, despesasAnt)
        const trendSaldo     = calcTrend(saldoMes, saldoAnt)
        // Últimos 6 meses (ou disponíveis) — fallback pra placeholder se sem dados
        const startIdx = Math.max(0, mes - 6)
        const last6 = mesesData.slice(startIdx, mes)
        const sparkReceitas = last6.map(m => m.Receitas)
        const sparkDespesas = last6.map(m => m.Despesas)
        const sparkSaldo    = last6.map(m => m.Receitas - m.Despesas)
        const sparkAcumulado = (() => {
          // Acumulado cresce mês a mês: soma dos saldos passados
          let acc = 0
          return last6.map(m => { acc += (m.Receitas - m.Despesas); return acc })
        })()

        // Sparkline helper inline
        const renderSpark = (data: number[], color: string) => {
          const valid = data.length >= 2 && data.some(v => v !== 0)
          if (!valid) {
            // linha plana sutil para placeholder
            return (
              <svg viewBox="0 0 100 24" preserveAspectRatio="none" style={{ width:'100%', height:22, opacity:0.3 }}>
                <line x1="0" y1="18" x2="100" y2="18" stroke={color} strokeWidth="1.2" strokeDasharray="3 3" strokeLinecap="round"/>
              </svg>
            )
          }
          const max = Math.max(...data)
          const min = Math.min(...data)
          const range = max - min || 1
          const pts = data.map((v, i) => {
            const x = (i / (data.length - 1)) * 100
            const y = 22 - ((v - min) / range) * 20 - 1
            return [x, y] as [number, number]
          })
          const polyStr = pts.map(p => p.join(',')).join(' ')
          const lastPt = pts[pts.length - 1]
          // Área sob a curva
          const areaStr = `${polyStr} 100,22 0,22`
          return (
            <svg viewBox="0 0 100 24" preserveAspectRatio="none" style={{ width:'100%', height:22, overflow:'visible' }}>
              <polygon points={areaStr} fill={color} opacity="0.04"/>
              <polyline points={polyStr} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.85"/>
              {/* halo dourado + dot dourado pra acento unificador */}
              <circle cx={lastPt[0]} cy={lastPt[1]} r="4.5" fill="#D4A017" opacity="0.25"/>
              <circle cx={lastPt[0]} cy={lastPt[1]} r="2.6" fill="#F2C745"/>
            </svg>
          )
        }

        // Trend badge helper — acento dourado unificador
        const renderTrend = (value: number, _invertColor = false) => {
          if (!isFinite(value)) return null
          const isUp = value >= 0
          const arrow = isUp ? '↑' : '↓'
          const sign = isUp ? '+' : ''
          return (
            <span style={{
              fontFamily:"'Plus Jakarta Sans',sans-serif",
              fontSize:10, fontWeight:700,
              color:'#FFFFFF',
              background:'rgba(212,160,23,0.22)',
              border:'1px solid rgba(212,160,23,0.5)',
              padding:'2px 8px', borderRadius:10,
              letterSpacing:'.02em',
              display:'inline-flex', alignItems:'center', gap:4,
              whiteSpace:'nowrap',
            }}>
              <span style={{ fontSize:11, lineHeight:1, color:'#F2C745', fontWeight:800 }}>{arrow}</span>
              {sign}{Math.abs(value).toFixed(0)}%
            </span>
          )
        }
        const KPI_TITLE: React.CSSProperties = {
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          fontSize: 10,
          fontWeight: 700,
          color: 'rgba(255,255,255,0.55)',
          marginBottom: 0,
          letterSpacing: '.14em',
          textTransform: 'uppercase',
        }
        const KPI_VALUE: React.CSSProperties = {
          fontFamily: "'Fraunces',Georgia,serif",
          fontWeight: 700,
          fontSize: 26,
          color: 'white',
          letterSpacing: '-1.2px',
          lineHeight: 1,
          display: 'block',
          width: '100%',
          textAlign: 'center',
          marginTop: 0,
        }
        const KPI_CARD: React.CSSProperties = {
          flex: 1,
          borderRadius: 18,
          padding: '14px 18px',
          position: 'relative',
          overflow: 'hidden',
          transition: 'box-shadow .18s',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
        }
        return (
          <motion.div variants={ITEM} style={{ display:'grid', gridTemplateColumns:'220px 1fr', gap:14, marginBottom:20, alignItems:'stretch' }}>

            {/* LEFT: 4 KPIs stacked vertically */}
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>

              {/* ── RECEITAS ── */}
              <motion.div whileHover={{ y:-2, boxShadow:'0 14px 36px rgba(163,181,101,0.42)' }}
                style={{ ...KPI_CARD, background:'#A3B565' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%' }}>
                  <p style={KPI_TITLE}>Receitas</p>
                  {renderTrend(trendReceitas)}
                </div>
                <div style={{ width:'100%', marginTop:6, marginBottom:6 }}>{renderSpark(sparkReceitas, '#ffffff')}</div>
                <OdometroSaldo value={receitas} style={KPI_VALUE}/>
              </motion.div>

              {/* ── DESPESAS ── */}
              <motion.div whileHover={{ y:-2, boxShadow:'0 14px 36px rgba(241,100,46,0.42)' }}
                style={{ ...KPI_CARD, background:'#F1642E' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%' }}>
                  <p style={KPI_TITLE}>Despesas</p>
                  {renderTrend(trendDespesas, true)}
                </div>
                <div style={{ width:'100%', marginTop:6, marginBottom:6 }}>{renderSpark(sparkDespesas, '#ffffff')}</div>
                <OdometroSaldo value={totalComprometido} style={KPI_VALUE}/>
              </motion.div>

              {/* ── SALDO (receitas − despesas, cor dinâmica) ── */}
              <motion.div whileHover={{ y:-2, boxShadow:`0 14px 36px ${saldoShadow}` }}
                style={{ ...KPI_CARD, background:saldoColor }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%' }}>
                  <p style={KPI_TITLE}>Saldo</p>
                  {renderTrend(trendSaldo)}
                </div>
                <div style={{ width:'100%', marginTop:6, marginBottom:6 }}>{renderSpark(sparkSaldo, '#ffffff')}</div>
                <OdometroSaldo value={saldoMes} style={KPI_VALUE}/>
              </motion.div>

              {/* ── ACUMULADO (total em contas) ── */}
              <motion.div whileHover={{ y:-2, boxShadow:'0 14px 36px rgba(80,78,118,0.45)' }}
                style={{ ...KPI_CARD, background:'#504E76' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%' }}>
                  <p style={KPI_TITLE}>Acumulado</p>
                  <span style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.55)', letterSpacing:'.1em', textTransform:'uppercase' }}>Total</span>
                </div>
                <div style={{ width:'100%', marginTop:6, marginBottom:6 }}>{renderSpark(sparkAcumulado, '#D4A017')}</div>
                <OdometroSaldo value={saldoTotal} style={KPI_VALUE}/>
              </motion.div>

            </div>

            {/* RIGHT: Rich Calendar — dark purple anchor */}
            <div style={{
              position: 'relative',
              background: 'linear-gradient(155deg, #504E76 0%, #2A2150 100%)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 22,
              boxShadow: '0 8px 32px rgba(42,33,80,0.28), 0 2px 8px rgba(42,33,80,0.18)',
              padding: '26px 28px 24px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'visible',
            }}>
              {/* Header — Editorial limpo, sem decoração */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:22, position:'relative', zIndex:1 }}>
                <div>
                  <h2 style={{
                    fontFamily:"'Fraunces',Georgia,serif",
                    fontSize:46, fontWeight:700, color:'#FFFFFF',
                    margin:0, textTransform:'capitalize',
                    letterSpacing:'-1.8px', lineHeight:0.9,
                  }}>{mesNome}</h2>
                  {/* Underline dourado — assinatura editorial */}
                  <div style={{
                    width:48, height:3, background:'#D4A017',
                    borderRadius:2, marginTop:10, marginBottom:6,
                  }}/>
                  <span style={{
                    fontFamily:"'Plus Jakarta Sans',sans-serif",
                    fontSize:11, fontWeight:600, color:'rgba(196,195,227,0.65)',
                    letterSpacing:'.2em', textTransform:'uppercase',
                  }}>{ano}</span>
                </div>
                {monthEventsList.length > 0 && (
                  <span style={{
                    fontFamily:"'Plus Jakarta Sans',sans-serif",
                    fontSize:11, fontWeight:700,
                    color:'#D4A017',
                    background:'rgba(212,160,23,0.1)',
                    border:'1px solid rgba(212,160,23,0.32)',
                    borderRadius:20,
                    padding:'5px 13px',
                    letterSpacing:'.04em',
                    marginTop:6,
                  }}>
                    {monthEventsList.length} evento{monthEventsList.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Linha divisória sutil */}
              <div style={{ height:1, background:'rgba(255,255,255,0.08)', marginBottom:14, position:'relative', zIndex:1 }}/>

              {/* Day headers — branco muted, weekends amber */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, marginBottom:8, position:'relative', zIndex:1 }}>
                {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map((d, idx) => (
                  <div key={d} style={{
                    fontFamily:"'Plus Jakarta Sans',sans-serif",
                    fontSize:10, fontWeight:700, textAlign:'center',
                    letterSpacing:'.1em', textTransform:'uppercase',
                    color: idx === 0 || idx === 6 ? 'rgba(212,160,23,0.7)' : 'rgba(255,255,255,0.4)',
                  }}>{d}</div>
                ))}
              </div>

              {/* Calendar grid */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3, position:'relative', zIndex:1 }}>
                {Array.from({ length: Math.ceil(calCells / 7) * 7 }, (_, idx) => {
                  const day = idx - calFirstDow + 1
                  const colIdx = idx % 7
                  const rowIdx = Math.floor(idx / 7)
                  const isWeekend = colIdx === 0 || colIdx === 6
                  if (day < 1 || day > calDaysInMonth) return <div key={idx}/>
                  const isToday = day === hoje
                  const isPast = day < hoje
                  const events = calendarEvents.get(day) ?? []
                  const dayEvents = eventsByDay.get(day) ?? []
                  const hasEvents = dayEvents.length > 0
                  const isHovered = hoveredDay === day
                  // Tooltip posicionamento: linhas iniciais → embaixo, demais → em cima
                  const tooltipAbove = rowIdx >= 2
                  return (
                    <div
                      key={idx}
                      onMouseEnter={() => hasEvents && setHoveredDay(day)}
                      onMouseLeave={() => setHoveredDay(prev => prev === day ? null : prev)}
                      style={{
                        position:'relative',
                        display:'flex', flexDirection:'column', alignItems:'center',
                        gap:3, padding:'4px 0',
                        cursor: hasEvents ? 'pointer' : 'default',
                      }}
                    >
                      <div style={{
                        width:34, height:34, borderRadius:'50%',
                        background: isToday
                          ? 'radial-gradient(circle at 35% 30%, #F2C745 0%, #D4A017 70%)'
                          : hasEvents
                            ? (isHovered ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.06)')
                            : 'transparent',
                        border: hasEvents && !isToday
                          ? `1.5px solid ${isHovered ? 'rgba(212,160,23,0.7)' : 'rgba(212,160,23,0.32)'}`
                          : 'none',
                        boxShadow: isToday
                          ? '0 4px 18px rgba(212,160,23,0.55), 0 0 0 4px rgba(212,160,23,0.15)'
                          : isHovered ? '0 2px 12px rgba(212,160,23,0.25)' : 'none',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        transition:'all .15s ease',
                      }}>
                        <span style={{
                          fontFamily:"'Plus Jakarta Sans',sans-serif",
                          fontSize:13,
                          fontWeight: isToday ? 700 : hasEvents ? 600 : 500,
                          color: isToday
                            ? '#2C1A0F'
                            : isPast
                              ? 'rgba(255,255,255,0.32)'
                              : isWeekend
                                ? 'rgba(212,160,23,0.8)'
                                : 'rgba(255,255,255,0.92)',
                        }}>{day}</span>
                      </div>
                      {events.length > 0 && (
                        <div style={{ display:'flex', gap:2 }}>
                          {events.slice(0, 3).map((color, ci) => (
                            <div key={ci} style={{ width:5, height:5, borderRadius:'50%', background:color }}/>
                          ))}
                        </div>
                      )}

                      {/* ── Tooltip de eventos ── */}
                      <AnimatePresence>
                        {isHovered && hasEvents && (
                          <motion.div
                            initial={{ opacity:0, y: tooltipAbove ? 4 : -4, scale:0.96 }}
                            animate={{ opacity:1, y:0, scale:1 }}
                            exit={{ opacity:0, y: tooltipAbove ? 4 : -4, scale:0.96 }}
                            transition={{ duration:0.15, ease:[0.34,1.56,0.64,1] }}
                            style={{
                              position:'absolute',
                              [tooltipAbove ? 'bottom' : 'top']: 'calc(100% + 8px)',
                              left:'50%', transform:'translateX(-50%)',
                              minWidth:220, maxWidth:280,
                              background:'rgba(255,255,255,0.98)',
                              backdropFilter:'blur(20px)',
                              WebkitBackdropFilter:'blur(20px)',
                              border:'1px solid rgba(44,26,15,0.08)',
                              borderRadius:14,
                              boxShadow:'0 12px 32px rgba(44,26,15,0.16), 0 4px 12px rgba(44,26,15,0.08)',
                              padding:'12px 14px',
                              zIndex:50,
                              pointerEvents:'none',
                            }}
                          >
                            {/* Cabeçalho do dia */}
                            <div style={{ display:'flex', alignItems:'baseline', gap:6, marginBottom:10, paddingBottom:8, borderBottom:'1px solid rgba(44,26,15,0.06)' }}>
                              <span style={{ fontFamily:"'Fraunces',Georgia,serif", fontWeight:700, fontSize:18, color:'#2C1A0F', letterSpacing:'-0.5px', lineHeight:1 }}>{day}</span>
                              <span style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:10, fontWeight:600, color:'#9B7B6A', textTransform:'uppercase', letterSpacing:'.06em' }}>de {mesNome}</span>
                            </div>
                            {/* Lista de eventos do dia */}
                            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                              {dayEvents.map((ev, ei) => (
                                <div key={ei} style={{ display:'flex', alignItems:'center', gap:9 }}>
                                  <div style={{ width:8, height:8, borderRadius:'50%', background:ev.cor, flexShrink:0, boxShadow:`0 0 0 3px ${ev.cor}22` }}/>
                                  <div style={{ flex:1, minWidth:0 }}>
                                    <p style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:12, fontWeight:600, color:'#2C1A0F', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ev.name}</p>
                                    <p style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:10, color:'#9B7B6A', margin:0 }}>{ev.tipo}</p>
                                  </div>
                                  {ev.valor !== undefined && (
                                    <span style={{ fontFamily:"'Fraunces',Georgia,serif", fontSize:12, fontWeight:700, color:'#2C1A0F', flexShrink:0 }}>{fmt(ev.valor)}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                            {/* Setinha do tooltip */}
                            <div style={{
                              position:'absolute',
                              [tooltipAbove ? 'top' : 'bottom']: '100%',
                              left:'50%', transform:'translateX(-50%)',
                              width:0, height:0,
                              borderLeft:'6px solid transparent',
                              borderRight:'6px solid transparent',
                              [tooltipAbove ? 'borderTop' : 'borderBottom']: '6px solid rgba(255,255,255,0.98)',
                              filter:'drop-shadow(0 2px 4px rgba(44,26,15,0.06))',
                            }}/>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                })}
              </div>

              {monthEventsList.length === 0 && (
                <div style={{ textAlign:'center', opacity:0.5, marginTop:16 }}>
                  <p style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:13, color:'#9B7B6A' }}>Sem eventos este mês</p>
                </div>
              )}
            </div>

          </motion.div>
        )
      })()}

      {/* ─── Análise de gastos + Top 5 ─── */}
      {(() => {
        // Lookup categoria por id
        const catById = new Map(categorias.map(c => [c.id!, c]))
        // Gastos por categoria do mês anterior (para trends)
        const lastMonthByCat = new Map<number, number>()
        const lastMonthNum = mes - 1
        if (lastMonthNum > 0) {
          txsAno
            .filter(t => parseInt(t.data.split('-')[1]) === lastMonthNum && t.tipo === 'despesa')
            .forEach(t => {
              const prev = lastMonthByCat.get(t.categoriaId) ?? 0
              lastMonthByCat.set(t.categoriaId, prev + t.valor)
            })
        }
        const catTrend = (catId: number, current: number) => {
          const prev = lastMonthByCat.get(catId) ?? 0
          if (prev === 0) return null
          return ((current - prev) / prev) * 100
        }

        // Gold trend pill (mesma vibe dos KPIs)
        const renderCatTrend = (val: number | null) => {
          if (val === null || !isFinite(val)) return null
          const isUp = val >= 0
          const arrow = isUp ? '↑' : '↓'
          const sign = isUp ? '+' : ''
          return (
            <span style={{
              fontFamily:"'Plus Jakarta Sans',sans-serif",
              fontSize:9, fontWeight:700,
              color:'#A8442B',
              background:'rgba(212,160,23,0.18)',
              border:'1px solid rgba(212,160,23,0.4)',
              padding:'2px 6px', borderRadius:8,
              display:'inline-flex', alignItems:'center', gap:2,
              whiteSpace:'nowrap',
            }}>
              <span style={{ fontSize:10, color:'#D4A017', lineHeight:1, fontWeight:800 }}>{arrow}</span>
              {sign}{Math.abs(val).toFixed(0)}%
            </span>
          )
        }

        return (
        <motion.div variants={ITEM} style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:20, alignItems:'stretch' }}>

        {/* ════════════════════════════════════════════════
            GASTOS POR CATEGORIA — lavanda refinado
            Donut + ranking lado a lado com trends
            ════════════════════════════════════════════════ */}
        <div style={{
          position:'relative',
          background:'#F4F0FF',
          border:'1px solid rgba(196,195,227,0.4)',
          borderRadius:22,
          boxShadow:'0 4px 20px rgba(196,195,227,0.22), 0 1px 4px rgba(80,78,118,0.06)',
          padding:22,
          display:'flex', flexDirection:'column',
          overflow:'hidden',
          height:'100%',
        }}>
          {/* Decoração SVG canto inferior direito */}
          <svg style={{ position:'absolute', right:0, bottom:0, width:160, height:80, opacity:0.55, pointerEvents:'none' }}
            viewBox="0 0 160 80" fill="none">
            <path d="M0,52 Q40,10 80,40 Q120,68 160,28" stroke="rgba(80,78,118,0.18)" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
            <path d="M0,72 Q50,38 100,62 Q140,80 160,60" stroke="rgba(196,195,227,0.45)" strokeWidth="1" fill="none" strokeLinecap="round"/>
            <circle cx="156" cy="28" r="3" fill="#504E76" opacity="0.3"/>
          </svg>

          {/* Header — Fraunces + accent line */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16, position:'relative', zIndex:1 }}>
            <div>
              <h2 style={{ fontFamily:"'Fraunces',Georgia,serif", fontSize:18, fontWeight:700, color:'#2C1A0F', margin:0, letterSpacing:'-0.4px' }}>Gastos por categoria</h2>
              <div style={{ width:32, height:2, background:'#504E76', borderRadius:1, marginTop:6, opacity:0.6 }}/>
            </div>
            <button onClick={() => navigate('/relatorios')}
              style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:11, fontWeight:700, color:'#C4553B', background:'none', border:'none', cursor:'pointer', letterSpacing:'.04em' }}>
              Ver →
            </button>
          </div>

          {pieData.length > 0 ? (
            <div style={{ display:'grid', gridTemplateColumns:'180px 1fr', gap:18, flex:1, position:'relative', zIndex:1, alignItems:'center' }}>
              {/* Donut esquerda */}
              <div style={{ position:'relative', width:180, height:180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={62} outerRadius={84} paddingAngle={3} dataKey="value" strokeWidth={0}>
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip content={<DarkTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
                  <div style={{ textAlign:'center' }}>
                    <p style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:8, fontWeight:700, color:'#9B7B6A', letterSpacing:'.18em', textTransform:'uppercase', margin:0 }}>Total</p>
                    <p style={{ fontFamily:"'Fraunces',Georgia,serif", fontSize:20, fontWeight:700, color:'#2C1A0F', letterSpacing:'-0.7px', margin:'4px 0 0', lineHeight:1 }}>{fmt(despesas)}</p>
                    <p style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:10, color:'#9B7B6A', margin:'4px 0 0', letterSpacing:'.02em' }}>{pieData.length} categoria{pieData.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              </div>

              {/* Ranking direita */}
              <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
                {pieData.slice(0, 5).map(d => {
                  const pct = despesas > 0 ? (d.value / despesas * 100) : 0
                  const trend = catTrend(d.cat.id!, d.value)
                  return (
                    <div key={d.name}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(80,78,118,0.07)' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                      style={{ display:'flex', flexDirection:'column', gap:4, padding:'6px 8px', borderRadius:8, transition:'background .15s', cursor:'default' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <CategoryIcon nome={d.cat.nome} cor={d.cat.cor} size={22} radius={7}/>
                        <span style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:12, fontWeight:600, color:'#2C1A0F', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.name}</span>
                        {renderCatTrend(trend)}
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ flex:1, height:5, borderRadius:3, background:'rgba(80,78,118,0.1)', overflow:'hidden' }}>
                          <motion.div initial={{ width:0 }} animate={{ width:`${pct}%` }} transition={{ type:'spring', stiffness:80, damping:18, delay:0.1 }}
                            style={{ height:'100%', borderRadius:3, background:d.color }}/>
                        </div>
                        <span style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:11, fontWeight:600, color:'#2C1A0F', minWidth:60, textAlign:'right' }}>{fmt(d.value)}</span>
                        <span style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:10, color:'#7A5C4F', minWidth:30, textAlign:'right', fontWeight:600 }}>{pct.toFixed(0)}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', minHeight:180, position:'relative', zIndex:1 }}>
              <p style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:13, color:'#9B7B6A', textAlign:'center' }}>Sem gastos em {mesNome}</p>
            </div>
          )}
        </div>

        {/* ════════════════════════════════════════════════
            MAIORES DESPESAS — terra-light coral
            Ranking editorial com ícones + barras
            ════════════════════════════════════════════════ */}
        <div style={{
          position:'relative',
          background:'#F5E8E4',
          border:'1px solid rgba(196,85,59,0.2)',
          borderRadius:22,
          boxShadow:'0 4px 20px rgba(196,85,59,0.13), 0 1px 4px rgba(168,68,43,0.06)',
          padding:22,
          overflow:'hidden',
          display:'flex', flexDirection:'column',
          height:'100%',
        }}>
          {/* Decoração SVG canto superior direito */}
          <svg style={{ position:'absolute', right:0, top:0, width:140, height:80, opacity:0.5, pointerEvents:'none' }}
            viewBox="0 0 140 80" fill="none">
            <path d="M0,30 Q40,8 80,28 Q110,40 140,18" stroke="rgba(196,85,59,0.28)" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
            <path d="M20,52 Q60,28 100,48 Q130,62 140,42" stroke="rgba(212,160,23,0.32)" strokeWidth="1" fill="none" strokeLinecap="round"/>
            <circle cx="138" cy="18" r="3" fill="#C4553B" opacity="0.35"/>
          </svg>

          {/* Header */}
          <div style={{ marginBottom:16, position:'relative', zIndex:1 }}>
            <h2 style={{ fontFamily:"'Fraunces',Georgia,serif", fontSize:18, fontWeight:700, color:'#2C1A0F', margin:0, letterSpacing:'-0.4px' }}>Maiores Despesas</h2>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:6 }}>
              <div style={{ width:24, height:2, background:'#C4553B', borderRadius:1, opacity:0.65 }}/>
              <p style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:10, fontWeight:700, color:'#A8442B', margin:0, letterSpacing:'.15em', textTransform:'uppercase' }}>
                {mesNome} {ano}
              </p>
            </div>
          </div>

          {top5.length === 0 ? (
            <div style={{ paddingTop:24, textAlign:'center', position:'relative', zIndex:1 }}>
              <p style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:13, color:'#A8442B' }}>Nenhum gasto no mês</p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8, position:'relative', zIndex:1 }}>
              {(() => {
                const maxVal = top5[0]?.valor ?? 1
                return top5.map((tx, idx) => {
                  const pct = (tx.valor / maxVal) * 100
                  const isTop = idx === 0
                  const cat = catById.get(tx.categoriaId)
                  const txDate = new Date(tx.data + 'T00:00:00')
                  const dayMonth = `${txDate.getDate().toString().padStart(2,'0')}/${(txDate.getMonth()+1).toString().padStart(2,'0')}`
                  return (
                    <div key={tx.id}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = isTop ? 'rgba(168,68,43,0.1)' : 'rgba(196,85,59,0.06)' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = isTop ? 'rgba(168,68,43,0.07)' : 'transparent' }}
                      style={{
                        background: isTop ? 'rgba(168,68,43,0.07)' : 'transparent',
                        border: isTop ? '1px solid rgba(168,68,43,0.18)' : '1px solid transparent',
                        borderRadius:12, padding: isTop ? '10px 12px' : '6px 12px',
                        transition:'background .15s',
                        display:'flex', alignItems:'center', gap:12,
                      }}>
                      {/* Número do ranking */}
                      <span style={{
                        fontFamily:"'Fraunces',Georgia,serif",
                        fontSize: isTop ? 32 : 22,
                        fontWeight:700,
                        color: isTop ? '#A8442B' : 'rgba(168,68,43,0.55)',
                        lineHeight:1, minWidth: isTop ? 30 : 22, textAlign:'center',
                        letterSpacing:'-1px',
                      }}>{idx+1}</span>

                      {/* Ícone categoria */}
                      {cat && <CategoryIcon nome={cat.nome} cor={cat.cor} size={isTop ? 32 : 26} radius={isTop ? 9 : 7}/>}

                      {/* Nome + sub */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize: isTop ? 13 : 12, fontWeight:700, color:'#2C1A0F', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{tx.descricao}</p>
                        <p style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:10, fontWeight:500, color:'#A8442B', margin:'2px 0 0', opacity:0.75, letterSpacing:'.02em' }}>
                          {cat?.nome ?? '—'} · {dayMonth}
                        </p>
                      </div>

                      {/* Valor + barra */}
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:5, minWidth:90 }}>
                        <span style={{ fontFamily:"'Fraunces',Georgia,serif", fontSize: isTop ? 16 : 13, fontWeight:700, color:'#2C1A0F', letterSpacing:'-0.4px' }}>{fmt(tx.valor)}</span>
                        <div style={{ width: isTop ? 90 : 70, height:4, borderRadius:2, background:'rgba(196,85,59,0.15)', overflow:'hidden' }}>
                          <motion.div
                            style={{ height:'100%', borderRadius:2, background: isTop ? '#A8442B' : '#C4553B' }}
                            initial={{ width:0 }}
                            animate={{ width:`${Math.min(100, pct)}%` }}
                            transition={{ type:'spring', stiffness:80, damping:18, delay:0.1+idx*0.06 }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          )}
        </div>
      </motion.div>
        )
      })()}

      {/* ─── Reserva de Emergência + Outras Metas ─── */}
      <motion.div variants={ITEM} style={{ display:'grid', gridTemplateColumns: reserva ? '1.3fr 1fr' : '1fr', gap:14, marginBottom:20, alignItems:'stretch' }}>

        {/* RESERVA DE EMERGÊNCIA — card especial ou CTA */}
        {reserva ? (() => {
          const resStatusCor = reserva.progressoPct >= 100 ? '#3A8580' : reserva.progressoPct >= 50 ? '#D4A017' : '#C4553B'
          const resStatusLabel = reserva.progressoPct >= 100 ? 'Completa' : reserva.progressoPct >= 50 ? 'Construindo' : 'Atenção'
          const meses = reserva.mesesCobertura ?? 6
          const mesesCobertos = reserva.valorAlvo > 0 ? (reserva.valorAtualTotal / reserva.valorAlvo) * meses : 0
          return (
            <div style={{
              position:'relative',
              background:'linear-gradient(155deg, #1E5E5A 0%, #143E3B 100%)',
              borderRadius:22, padding:'22px 24px',
              boxShadow:'0 8px 32px rgba(20,62,59,0.32), 0 2px 8px rgba(20,62,59,0.16)',
              overflow:'hidden', height:'100%',
              display:'flex', flexDirection:'column',
            }}>
              <svg style={{ position:'absolute', right:-20, top:-30, width:180, height:180, opacity:0.06, pointerEvents:'none' }} viewBox="0 0 200 200" fill="none">
                <circle cx="100" cy="100" r="90" stroke="white" strokeWidth="1"/>
                <circle cx="100" cy="100" r="62" stroke="white" strokeWidth="1"/>
                <circle cx="100" cy="100" r="35" stroke="white" strokeWidth="1"/>
              </svg>

              {/* Header */}
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14, position:'relative', zIndex:1 }}>
                <div style={{
                  width:34, height:34, borderRadius:10,
                  background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.18)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                  <IconShieldCheck size={18} stroke={1.8} color="#A7E0DC" />
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:9, fontWeight:700, color:'rgba(167,224,220,0.65)', letterSpacing:'.18em', textTransform:'uppercase', margin:0 }}>
                    Reserva de Emergência
                  </p>
                  <h2 style={{ fontFamily:"'Fraunces',Georgia,serif", fontSize:18, fontWeight:700, color:'#FFFFFF', margin:'2px 0 0', letterSpacing:'-0.5px', lineHeight:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {reserva.nome}
                  </h2>
                </div>
                <button onClick={() => navigate('/metas')}
                  style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:8, padding:'4px 10px', cursor:'pointer', fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:10, fontWeight:700, color:'#A7E0DC', letterSpacing:'.04em' }}>
                  Ver →
                </button>
              </div>

              {/* Valor */}
              <div style={{ position:'relative', zIndex:1 }}>
                <div style={{ display:'flex', alignItems:'baseline', gap:10, flexWrap:'wrap' }}>
                  <p style={{ fontFamily:"'Fraunces',Georgia,serif", fontSize:34, fontWeight:700, color:'#FFFFFF', margin:0, letterSpacing:'-1.4px', lineHeight:1 }}>
                    {fmt(reserva.valorAtualTotal)}
                  </p>
                  <p style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:12, color:'rgba(167,224,220,0.6)', margin:0 }}>
                    de {fmt(reserva.valorAlvo)}
                  </p>
                </div>

                {/* Progress */}
                <div style={{ marginTop:12 }}>
                  <div style={{ height:7, borderRadius:4, background:'rgba(255,255,255,0.08)', overflow:'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, reserva.progressoPct)}%` }}
                      transition={{ type:'spring', stiffness:100, damping:22 }}
                      style={{ height:'100%', background: resStatusCor, borderRadius:4 }}
                    />
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:8 }}>
                    <span style={{
                      fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:10, fontWeight:700,
                      color: resStatusCor, letterSpacing:'.04em',
                    }}>{resStatusLabel} · {reserva.progressoPct.toFixed(0)}%</span>
                    <span style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:10, color:'rgba(167,224,220,0.6)' }}>
                      {mesesCobertos.toFixed(1)} de {meses} meses cobertos
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )
        })() : (
          <button onClick={() => navigate('/metas')}
            style={{
              position:'relative',
              background:'linear-gradient(155deg, #FFF8F0 0%, #FFF1E6 100%)',
              border:'1.5px dashed rgba(58,133,128,0.45)',
              borderRadius:22, padding:'22px 24px',
              display:'flex', gap:16, alignItems:'center',
              cursor:'pointer', textAlign:'left', height:'100%',
            }}>
            <div style={{
              width:50, height:50, borderRadius:14,
              background:'linear-gradient(135deg, #3A8580, #2C7470)',
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:'0 6px 18px rgba(58,133,128,0.3)', flexShrink:0,
            }}>
              <IconShieldCheck size={24} stroke={1.8} color="#FFFFFF" />
            </div>
            <div style={{ flex:1 }}>
              <p style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:9, fontWeight:700, color:'#3A8580', letterSpacing:'.16em', textTransform:'uppercase', margin:0 }}>
                Comece pelo essencial
              </p>
              <h3 style={{ fontFamily:"'Fraunces',Georgia,serif", fontSize:18, fontWeight:700, color:'#2C1A0F', margin:'3px 0 4px', letterSpacing:'-0.5px' }}>
                Crie sua Reserva de Emergência
              </h3>
              <p style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:11, color:'#7A5C4F', margin:0, lineHeight:1.4 }}>
                Primeiro passo da segurança financeira — alvo calculado automaticamente.
              </p>
            </div>
            <IconChevronRight size={20} stroke={2} color="#3A8580" />
          </button>
        )}

        {/* OUTRAS METAS — só renderiza se houver reserva (ocupa coluna direita) ou se não houver metas */}
        {reserva && (
          <div style={{
            background:'#FFF0F5', border:'1px solid rgba(255,107,157,0.2)',
            borderRadius:22, boxShadow:'0 2px 16px rgba(255,107,157,0.1)',
            padding:'18px 20px', height:'100%',
            display:'flex', flexDirection:'column',
          }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <h2 style={{ fontFamily:"'Fraunces',Georgia,serif", fontSize:16, fontWeight:700, color:'#2C1A0F', margin:0 }}>Outras Metas</h2>
              <button onClick={() => navigate('/metas')}
                style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:11, fontWeight:600, color:'#C4553B', background:'none', border:'none', cursor:'pointer' }}>
                Ver →
              </button>
            </div>

            {outrasMetas.length === 0 ? (
              <button onClick={() => navigate('/metas')}
                style={{
                  flex:1, background:'transparent', border:'1px dashed rgba(196,85,59,0.3)',
                  borderRadius:14, cursor:'pointer', padding:14,
                  display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                  fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:12, fontWeight:700,
                  color:'#C4553B',
                }}>
                <IconPlus size={14} stroke={2.4} /> Criar uma meta
              </button>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:10, flex:1, justifyContent:'flex-start' }}>
                {outrasMetas.slice(0, 3).map((meta, mi) => {
                  const pct = Math.min(100, meta.progressoPct)
                  const r = 18, circ = 2 * Math.PI * r
                  return (
                    <div key={meta.id} style={{ display:'flex', alignItems:'center', gap:11 }}>
                      <div style={{ flexShrink:0, position:'relative' }}>
                        <svg width="46" height="46" viewBox="0 0 46 46">
                          <circle cx="23" cy="23" r={r} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth="4"/>
                          <motion.circle cx="23" cy="23" r={r} fill="none"
                            stroke={meta.cor} strokeWidth="4" strokeLinecap="round"
                            strokeDasharray={circ}
                            initial={{ strokeDashoffset: circ }}
                            animate={{ strokeDashoffset: circ * (1 - pct / 100) }}
                            transition={{ type:'spring', stiffness:60, damping:16, delay:0.15 + mi*0.06 }}
                            style={{ transform:'rotate(-90deg)', transformOrigin:'23px 23px' }}
                          />
                          <text x="23" y="27" textAnchor="middle" fontSize="9" fontFamily="Fraunces,serif" fontWeight="700" fill={meta.cor}>{pct.toFixed(0)}%</text>
                        </svg>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:12, fontWeight:700, color:'#2C1A0F', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{meta.nome}</p>
                        <p style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:10, color:'#9B7B6A', margin:'2px 0 0' }}>
                          <span style={{ color:meta.cor, fontWeight:700 }}>{fmt(meta.valorAtualTotal)}</span>
                          {' '}/ {fmt(meta.valorAlvo)}
                        </p>
                      </div>
                    </div>
                  )
                })}
                {outrasMetas.length > 3 && (
                  <p style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:10, fontWeight:600, color:'#9B7B6A', margin:'2px 0 0', textAlign:'center' }}>
                    + {outrasMetas.length - 3} {outrasMetas.length - 3 === 1 ? 'outra meta' : 'outras metas'}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Quando NÃO há reserva mas há outras metas — grid 4 cols full width abaixo */}
      </motion.div>

      {/* Se NÃO há reserva mas há outras metas, mostra elas em grid full width */}
      {!reserva && outrasMetas.length > 0 && (
        <motion.div variants={ITEM} style={{ marginBottom:20 }}>
          <div style={{ background:'#FFF0F5', border:'1px solid rgba(255,107,157,0.2)', borderRadius:22, boxShadow:'0 2px 16px rgba(255,107,157,0.1)', padding:20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <h2 style={{ fontFamily:"'Fraunces',Georgia,serif", fontSize:16, fontWeight:700, color:'#2C1A0F', margin:0 }}>Metas</h2>
              <button onClick={() => navigate('/metas')}
                style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:11, fontWeight:600, color:'#C4553B', background:'none', border:'none', cursor:'pointer' }}>
                Ver →
              </button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, alignItems:'stretch' }}>
              {outrasMetas.slice(0, 4).map((meta, mi) => {
                const pct = Math.min(100, meta.progressoPct)
                const r = 20, circ = 2 * Math.PI * r
                return (
                  <div key={meta.id} style={{ display:'flex', alignItems:'center', gap:14 }}>
                    <div style={{ flexShrink:0, position:'relative' }}>
                      <svg width="52" height="52" viewBox="0 0 52 52">
                        <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth="5"/>
                        <motion.circle cx="26" cy="26" r={r} fill="none"
                          stroke={meta.cor} strokeWidth="5" strokeLinecap="round"
                          strokeDasharray={circ}
                          initial={{ strokeDashoffset: circ }}
                          animate={{ strokeDashoffset: circ * (1 - pct / 100) }}
                          transition={{ type:'spring', stiffness:60, damping:16, delay:0.15 + mi*0.08 }}
                          style={{ transform:'rotate(-90deg)', transformOrigin:'26px 26px' }}
                        />
                        <text x="26" y="30" textAnchor="middle" fontSize="10" fontFamily="Fraunces,serif" fontWeight="700" fill={meta.cor}>{pct.toFixed(0)}%</text>
                      </svg>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:13, fontWeight:700, color:'#2C1A0F', marginBottom:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{meta.nome}</p>
                      <p style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:11, color:'#9B7B6A', margin:0 }}>
                        <span style={{ color:meta.cor, fontWeight:600 }}>{fmt(meta.valorAtualTotal)}</span>
                        {' '}/ {fmt(meta.valorAlvo)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* ─── SECTION 5: Evolução do Ano — #0D0B1F escuro, texto branco ─── */}
      <motion.div variants={ITEM} style={{ marginBottom: 20 }}>
        <div style={{ background:'#0D0B1F', borderRadius:22, padding:24, boxShadow:'0 8px 40px rgba(13,11,31,0.4)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
            <h2 style={{ fontFamily:"'Fraunces',Georgia,serif", fontSize:18, fontWeight:700, color:'#FFFFFF', margin:0 }}>Evolução do Ano</h2>
            <span style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:11, color:'rgba(196,195,227,0.8)', background:'rgba(196,195,227,0.12)', borderRadius:20, padding:'3px 10px' }}>{ano}</span>
          </div>

          {!hasYearData ? (
            <div style={{ height:260, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <p style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:13, color:'rgba(255,255,255,0.4)' }}>Sem dados no ano</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={mesesData} margin={{ top:8, right:8, left:8, bottom:0 }}>
                <defs>
                  <linearGradient id="gradReceitas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#A3B565" stopOpacity={0.55}/>
                    <stop offset="100%" stopColor="#A3B565" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gradDespesas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#F1642E" stopOpacity={0.5}/>
                    <stop offset="100%" stopColor="#F1642E" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)"/>
                <XAxis dataKey="mes"
                  tick={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:11, fill:'rgba(255,255,255,0.45)' }}
                  axisLine={false} tickLine={false}/>
                <YAxis
                  tickFormatter={v => v >= 1000 ? `R$${(v/1000).toFixed(0)}k` : `R$${v}`}
                  tick={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:11, fill:'rgba(255,255,255,0.45)' }}
                  axisLine={false} tickLine={false} width={40}/>
                <Tooltip content={<DarkTooltip />}/>
                <Area type="monotone" dataKey="Receitas" stroke="#A3B565" strokeWidth={2.5}
                  fill="url(#gradReceitas)" animationDuration={1400}/>
                <Area type="monotone" dataKey="Despesas" stroke="#F1642E" strokeWidth={2.5}
                  fill="url(#gradDespesas)" animationDuration={1400}/>
              </AreaChart>
            </ResponsiveContainer>
          )}

          {/* Legend */}
          <div style={{ display:'flex', gap:24, marginTop:16, justifyContent:'center' }}>
            {[{ color:'#A3B565', label:'Receitas' }, { color:'#F1642E', label:'Despesas' }].map(item => (
              <div key={item.label} style={{ display:'flex', alignItems:'center', gap:7 }}>
                <div style={{ width:9, height:9, borderRadius:'50%', background:item.color }}/>
                <span style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:12, color:'rgba(255,255,255,0.55)' }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ─── SECTION 6: Últimas Transações ─── */}
      <motion.div variants={ITEM}>
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
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="22" fill="#F5F0E8" stroke="#EDE6DC" strokeWidth="1.5"/>
                <path d="M16 28 Q24 34 32 28" stroke="#C4B4A8" strokeWidth="2" strokeLinecap="round" fill="none"/>
                <circle cx="18" cy="22" r="2.5" fill="#C4B4A8"/>
                <circle cx="30" cy="22" r="2.5" fill="#C4B4A8"/>
              </svg>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#9B7B6A', marginTop: 8 }}>Sem transações · toque no + para lançar</p>
            </div>
          ) : (
            <div style={{ marginTop: 8 }}>
              {transacoes.map((tx, i) => <TxRow key={tx.id} tx={tx} i={i} last={i === transacoes.length - 1} />)}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

function Top5Row({ tx, rank, last }: { tx: { id?: number; descricao: string; valor: number; categoriaId: number; tipo: string }; rank: number; last: boolean }) {
  const [cat, setCat] = useState<{ nome: string; cor: string } | null>(null)
  useEffect(() => { db.categorias.get(tx.categoriaId).then(c => setCat(c ?? null)) }, [tx.categoriaId])
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: last ? 'none' : '1px solid rgba(44,26,15,0.06)' }}>
      <span style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 14, fontWeight: 700, color: '#C4553B', minWidth: 20, textAlign: 'center' }}>{rank}</span>
      {cat && <CategoryIcon nome={cat.nome} cor={cat.cor} size={34} radius={10} />}
      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 600, color: '#2C1A0F', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.descricao}</p>
      <p style={{ ...DISPLAY, fontSize: 14, color: '#C4553B', flexShrink: 0 }}>{fmt(tx.valor)}</p>
    </div>
  )
}

function TxRow({ tx, i, last }: { tx: any; i: number; last: boolean }) {
  const [cat, setCat] = useState<any>(null)
  useEffect(() => { db.categorias.get(tx.categoriaId).then(setCat) }, [tx.categoriaId])
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 + i * 0.035, type: 'spring', stiffness: 280, damping: 26 }}
      whileHover={{ backgroundColor: 'rgba(196,85,59,0.04)' }}
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

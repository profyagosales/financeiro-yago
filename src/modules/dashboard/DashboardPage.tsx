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
import { useMetas } from '@/db/hooks/useMetas'
import { useLiveQuery } from 'dexie-react-hooks'
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

  const metas = useMetas()
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
            <svg viewBox="0 0 100 24" preserveAspectRatio="none" style={{ width:'100%', height:22 }}>
              <polygon points={areaStr} fill={color} opacity="0.04"/>
              <polyline points={polyStr} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.95"/>
              <circle cx={lastPt[0]} cy={lastPt[1]} r="2.4" fill={color}/>
            </svg>
          )
        }

        // Trend badge helper
        const renderTrend = (value: number, invertColor = false) => {
          if (!isFinite(value)) return null
          const isUp = value >= 0
          // Para Despesas: aumento = ruim (vermelho), redução = bom (verde claro)
          const positive = invertColor ? !isUp : isUp
          const color = positive ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.95)'
          const bg = positive ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)'
          const arrow = isUp ? '↑' : '↓'
          const sign = isUp ? '+' : ''
          return (
            <span style={{
              fontFamily:"'Plus Jakarta Sans',sans-serif",
              fontSize:10, fontWeight:700,
              color, background:bg,
              padding:'2px 7px', borderRadius:10,
              letterSpacing:'.02em',
              display:'inline-flex', alignItems:'center', gap:3,
              whiteSpace:'nowrap',
            }}>
              <span style={{ fontSize:11, lineHeight:1 }}>{arrow}</span>
              {sign}{Math.abs(value).toFixed(0)}%
            </span>
          )
        }
        const KPI_TITLE: React.CSSProperties = {
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          fontSize: 10,
          fontWeight: 700,
          color: 'rgba(255,255,255,0.7)',
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
      <motion.div variants={ITEM} style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:20 }}>

        {/* Top Categorias — #F4F0FF lilás clarinho */}
        <div style={{ background:'#F4F0FF', border:'1px solid rgba(196,195,227,0.35)', borderRadius:22, boxShadow:'0 2px 16px rgba(196,195,227,0.18)', padding:20, display:'flex', flexDirection:'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 16, fontWeight: 700, color: '#2C1A0F', margin: 0 }}>Gastos por categoria</h2>
            <button onClick={() => navigate('/relatorios')}
              style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600, color: '#C4553B', background: 'none', border: 'none', cursor: 'pointer' }}>
              Ver →
            </button>
          </div>

          {pieData.length > 0 ? (
            <>
              <div style={{ position: 'relative', width: '100%', height: 130, marginBottom: 14 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value" strokeWidth={0}>
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip content={<DarkTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ ...LABEL, fontSize: 8, marginBottom: 3 }}>Total</p>
                    <p style={{ ...DISPLAY, fontSize: 16, color: '#2C1A0F' }}>{fmt(despesas)}</p>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                {pieData.slice(0, 5).map(d => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                    <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#2C1A0F', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                    <span style={{ ...DISPLAY, fontSize: 12, color: '#2C1A0F' }}>{fmt(d.value)}</span>
                    <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: '#9B7B6A', minWidth: 32, textAlign: 'right' }}>
                      {despesas > 0 ? (d.value / despesas * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#9B7B6A', textAlign: 'center' }}>Sem gastos em {mesNome}</p>
            </div>
          )}
        </div>

        {/* Top 5 Despesas — branco, barras horizontais animadas */}
        <div style={{ background:'#FFFFFF', border:'1px solid rgba(44,26,15,0.08)', borderRadius:22, boxShadow:'0 2px 16px rgba(44,26,15,0.05)', padding:20 }}>
          <div style={{ marginBottom:4 }}>
            <h2 style={{ fontFamily:"'Fraunces',Georgia,serif", fontSize:16, fontWeight:700, color:'#2C1A0F', margin:0 }}>Maiores Despesas</h2>
            <p style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:11, color:'#9B7B6A', marginTop:3 }}>
              {mesNome.charAt(0).toUpperCase() + mesNome.slice(1)} {ano}
            </p>
          </div>

          {top5.length === 0 ? (
            <div style={{ paddingTop:24, textAlign:'center' }}>
              <p style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:13, color:'#9B7B6A' }}>Nenhum gasto no mês</p>
            </div>
          ) : (
            <div style={{ marginTop:16, display:'flex', flexDirection:'column', gap:14 }}>
              {(() => {
                const maxVal = top5[0]?.valor ?? 1
                return top5.map((tx, idx) => {
                  const pct = (tx.valor / maxVal) * 100
                  const barColors = ['#C4553B','#D4A017','#3A8580','#504E76','#A3B565']
                  const color = barColors[idx]
                  return (
                    <div key={tx.id}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                        <span style={{ fontFamily:"'Fraunces',Georgia,serif", fontSize:13, fontWeight:700, color, minWidth:18 }}>{idx+1}</span>
                        <p style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:12, fontWeight:600, color:'#2C1A0F', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', margin:0 }}>{tx.descricao}</p>
                        <p style={{ ...DISPLAY, fontSize:13, color:'#2C1A0F', flexShrink:0 }}>{fmt(tx.valor)}</p>
                      </div>
                      <div style={{ height:5, borderRadius:3, background:'rgba(44,26,15,0.07)', overflow:'hidden' }}>
                        <motion.div
                          style={{ height:'100%', borderRadius:3, background:color }}
                          initial={{ width:0 }}
                          animate={{ width:`${Math.min(95, pct)}%` }}
                          transition={{ type:'spring', stiffness:80, damping:18, delay:0.1+idx*0.06 }}
                        />
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          )}
        </div>
      </motion.div>

      {/* ─── Metas ─── */}
      <motion.div variants={ITEM} style={{ marginBottom:20 }}>
        <div style={{ background:'#FFF0F5', border:'1px solid rgba(255,107,157,0.2)', borderRadius:22, boxShadow:'0 2px 16px rgba(255,107,157,0.1)', padding:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <h2 style={{ fontFamily:"'Fraunces',Georgia,serif", fontSize:16, fontWeight:700, color:'#2C1A0F', margin:0 }}>Metas</h2>
            <button onClick={() => navigate('/metas')}
              style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:11, fontWeight:600, color:'#C4553B', background:'none', border:'none', cursor:'pointer' }}>
              Ver →
            </button>
          </div>

          {metas.length === 0 ? (
            <div style={{ paddingTop:8, textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
              <p style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:13, color:'#9B7B6A' }}>Nenhuma meta cadastrada</p>
              <button onClick={() => navigate('/metas')}
                style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:12, fontWeight:700,
                  color:'white', background:'#C4553B', border:'none', borderRadius:20,
                  padding:'7px 18px', cursor:'pointer' }}>
                Criar primeira meta
              </button>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
              {metas.slice(0, 4).map((meta, mi) => {
                const pct = Math.min(100, meta.valorAlvo > 0 ? (meta.valorAtual / meta.valorAlvo) * 100 : 0)
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
                        <span style={{ color:meta.cor, fontWeight:600 }}>{fmt(meta.valorAtual)}</span>
                        {' '}/ {fmt(meta.valorAlvo)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </motion.div>

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

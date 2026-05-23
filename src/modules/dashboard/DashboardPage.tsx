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

  const poupancaColor = taxaPoupanca > 20 ? '#3A8580' : taxaPoupanca > 0 ? '#D4A017' : '#C4553B'

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


  return (
    <motion.div
      variants={STAGGER} initial="hidden" animate="show"
      style={{ width: '100%', padding: '32px', paddingBottom: 48 }}>

      {/* ─── ROW 1: Greeting ─── */}
      <motion.div variants={ITEM} style={{ display: 'grid', gridTemplateColumns: '4fr 1fr', gap: 14, marginBottom: 20 }}>

        {/* ══════════════════════════════════════════════════════════
            GREETING CARD — Gradient mesh rico + decoração orbital
            abstrata. Zero personagem, zero watermark, zero insight.
            Fundo vivo, tipografia hero, animação ambiente suave.
            ══════════════════════════════════════════════════════════ */}
        <div style={{
          position: 'relative',
          minHeight: 168,
          borderRadius: 24,
          overflow: 'hidden',
          background: [
            'radial-gradient(ellipse at 8% 55%,  rgba(196,85,59,0.14)  0%, transparent 52%)',
            'radial-gradient(ellipse at 85% 12%, rgba(80,78,118,0.2)   0%, transparent 48%)',
            'radial-gradient(ellipse at 68% 92%, rgba(58,133,128,0.11) 0%, transparent 42%)',
            'radial-gradient(ellipse at 42% 50%, rgba(212,160,23,0.07) 0%, transparent 55%)',
            'linear-gradient(145deg, #FFF9F5 0%, #F4F0FF 100%)',
          ].join(','),
          boxShadow: '0 4px 28px rgba(80,78,118,0.13), 0 1px 6px rgba(44,26,15,0.05)',
          border: '1px solid rgba(255,255,255,0.92)',
        }}>

          {/* ── Barra vertical esquerda ── */}
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, zIndex: 2,
            background: 'linear-gradient(180deg, #504E76 0%, #C4553B 100%)',
          }} />

          {/* ── Decoração orbital — abstrata, sem personagem ── */}
          <motion.svg
            style={{
              position: 'absolute', right: -24, top: '50%', translateY: '-50%',
              width: 230, height: 230, zIndex: 0, opacity: 0.9,
            }}
            viewBox="0 0 220 220" fill="none"
            animate={{ rotate: 360 }}
            transition={{ duration: 90, repeat: Infinity, ease: 'linear' }}
          >
            {/* Anéis concêntricos */}
            <circle cx="110" cy="110" r="102" stroke="rgba(80,78,118,0.09)"  strokeWidth="1"/>
            <circle cx="110" cy="110" r="72"  stroke="rgba(196,85,59,0.11)"  strokeWidth="1.2"/>
            <circle cx="110" cy="110" r="44"  stroke="rgba(58,133,128,0.1)"  strokeWidth="0.8" strokeDasharray="7 5"/>
            {/* Núcleo */}
            <circle cx="110" cy="110" r="14"  fill="rgba(80,78,118,0.09)"/>
            <circle cx="110" cy="110" r="5"   fill="rgba(80,78,118,0.2)"/>
            {/* Pontos em órbita */}
            <circle cx="110" cy="8"   r="5.5" fill="rgba(212,160,23,0.5)"/>
            <circle cx="204" cy="156" r="4.5" fill="rgba(196,85,59,0.38)"/>
            <circle cx="22"  cy="148" r="4"   fill="rgba(58,133,128,0.32)"/>
            <circle cx="182" cy="34"  r="3.5" fill="rgba(80,78,118,0.28)"/>
            {/* Arco acento — terra */}
            <path d="M 110 8 A 102 102 0 0 1 204 156"
              stroke="rgba(196,85,59,0.22)" strokeWidth="2" strokeLinecap="round"/>
            {/* Cruz de referência */}
            <line x1="0"   y1="110" x2="220" y2="110" stroke="rgba(80,78,118,0.05)" strokeWidth="0.8"/>
            <line x1="110" y1="0"   x2="110" y2="220" stroke="rgba(80,78,118,0.05)" strokeWidth="0.8"/>
          </motion.svg>

          {/* ── Conteúdo ── */}
          <div style={{
            position: 'relative', zIndex: 1,
            padding: '24px 32px 24px 38px',
            height: '100%', minHeight: 168,
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
          }}>

            {/* Label saudação */}
            <span style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 10, fontWeight: 700,
              color: '#9B7B6A', letterSpacing: '.1em', textTransform: 'uppercase',
              marginBottom: 10, display: 'block',
            }}>{saudacao}</span>

            {/* Nome — tipografia herói */}
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
              style={{
                fontFamily: "'Fraunces',Georgia,serif",
                fontWeight: 700, fontSize: 64,
                lineHeight: 1, letterSpacing: '-2.5px',
                color: '#2C1A0F', margin: 0,
              }}
            >Yago</motion.h1>

            {/* Data */}
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25, duration: 0.45 }}
              style={{ display: 'flex', alignItems: 'center', gap: 11, marginTop: 14 }}
            >
              <div style={{ width: 24, height: 2.5, background: '#C4553B', borderRadius: 2, flexShrink: 0 }} />
              <span style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontSize: 13, fontWeight: 500, color: '#7A5C4F',
              }}>{dataHoje.charAt(0).toUpperCase() + dataHoje.slice(1)}</span>
            </motion.div>

          </div>
        </div>

        {/* ── Card mês ── */}
        <div style={{
          background: '#504E76',
          borderRadius: 24,
          padding: '20px 14px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position:'absolute', top:-24, right:-24, width:80, height:80,
            borderRadius:'50%', background:'rgba(255,255,255,0.05)', pointerEvents:'none' }}/>
          <div style={{ position:'absolute', bottom:-14, left:-14, width:56, height:56,
            borderRadius:'50%', background:'rgba(241,100,46,0.1)', pointerEvents:'none' }}/>

          {/* Anel — hero visual, maior */}
          <svg width="76" height="76" viewBox="0 0 76 76" style={{ flexShrink:0 }}>
            <circle cx="38" cy="38" r="30" fill="none"
              stroke="rgba(255,255,255,0.12)" strokeWidth="6"/>
            <motion.circle cx="38" cy="38" r="30" fill="none"
              stroke="rgba(196,195,227,0.85)" strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 30}
              initial={{ strokeDashoffset: 2 * Math.PI * 30 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 30 * (1 - hoje / diasNoMes) }}
              transition={{ duration:1.4, ease:[0.34,1.56,0.64,1], delay:0.4 }}
              style={{ transform:'rotate(-90deg)', transformOrigin:'38px 38px' }}
            />
            <text x="38" y="34" textAnchor="middle" fill="white"
              fontSize="15" fontFamily="Fraunces, Georgia, serif" fontWeight="700">{hoje}</text>
            <text x="38" y="47" textAnchor="middle" fill="rgba(255,255,255,0.4)"
              fontSize="7" fontFamily="Plus Jakarta Sans, sans-serif">DE {diasNoMes}</text>
          </svg>

          {/* Mês + Ano abaixo do anel */}
          <div style={{ textAlign:'center' }}>
            <p style={{ fontFamily:"'Fraunces',Georgia,serif", fontSize:18, fontWeight:700,
              color:'#ffffff', textTransform:'capitalize', lineHeight:1.1, margin:0 }}>
              {mesNome}
            </p>
            <p style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:10,
              color:'rgba(255,255,255,0.38)', marginTop:2 }}>{ano}</p>
          </div>
        </div>
      </motion.div>

      {/* ─── ROW 2: KPIs (vertical) + Rich Calendar ─── */}
      {(() => {
        const saldoMes = receitas - totalComprometido
        const saldoColor  = saldoMes >= 0 ? '#3A8580' : '#C4553B'
        const saldoShadow = saldoMes >= 0 ? 'rgba(58,133,128,0.4)' : 'rgba(196,85,59,0.4)'
        const KPI_TITLE: React.CSSProperties = {
          fontFamily: "'Fraunces',Georgia,serif",
          fontSize: 11,
          fontWeight: 700,
          color: 'rgba(255,255,255,0.72)',
          marginBottom: 0,
          letterSpacing: '.08em',
          textTransform: 'uppercase',
        }
        const KPI_VALUE: React.CSSProperties = {
          fontFamily: "'Fraunces',Georgia,serif",
          fontWeight: 700,
          fontSize: 22,
          color: 'white',
          letterSpacing: '-1px',
          lineHeight: 1,
          display: 'block',
          width: '100%',
          textAlign: 'center',
          marginTop: 6,
        }
        const KPI_CARD: React.CSSProperties = {
          flex: 1,
          borderRadius: 18,
          padding: '12px 16px',
          position: 'relative',
          overflow: 'hidden',
          transition: 'box-shadow .18s',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
        }
        return (
          <motion.div variants={ITEM} style={{ display:'grid', gridTemplateColumns:'220px 1fr', gap:14, marginBottom:20, alignItems:'stretch' }}>

            {/* LEFT: 4 KPIs stacked vertically */}
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>

              {/* ── RECEITAS ── */}
              <motion.div whileHover={{ y:-2, boxShadow:'0 14px 36px rgba(163,181,101,0.42)' }}
                style={{ ...KPI_CARD, background:'#A3B565' }}>
                <svg style={{position:'absolute',right:0,bottom:0,opacity:0.14}} width="90" height="56" viewBox="0 0 90 56" fill="none">
                  <path d="M0,52 Q22,16 44,30 Q66,44 90,6" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                  <path d="M0,52 Q22,16 44,30 Q66,44 90,6 L90,56 L0,56Z" fill="white" opacity="0.07"/>
                  <circle cx="90" cy="6" r="4" fill="white" opacity="0.6"/>
                </svg>
                <div style={{position:'absolute',top:-14,right:-14,width:44,height:44,borderRadius:'50%',background:'rgba(255,255,255,0.09)'}}/>
                <p style={KPI_TITLE}>Receitas</p>
                <OdometroSaldo value={receitas} style={KPI_VALUE}/>
              </motion.div>

              {/* ── DESPESAS ── */}
              <motion.div whileHover={{ y:-2, boxShadow:'0 14px 36px rgba(241,100,46,0.42)' }}
                style={{ ...KPI_CARD, background:'#F1642E' }}>
                <svg style={{position:'absolute',right:0,bottom:0,opacity:0.14}} width="90" height="56" viewBox="0 0 90 56" fill="none">
                  <path d="M0,6 Q22,42 44,26 Q66,11 90,50" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                  <path d="M0,6 Q22,42 44,26 Q66,11 90,50 L90,56 L0,56Z" fill="white" opacity="0.07"/>
                  <circle cx="90" cy="50" r="4" fill="white" opacity="0.6"/>
                </svg>
                <div style={{position:'absolute',top:-14,right:-14,width:44,height:44,borderRadius:'50%',background:'rgba(255,255,255,0.09)'}}/>
                <p style={KPI_TITLE}>Despesas</p>
                <OdometroSaldo value={totalComprometido} style={KPI_VALUE}/>
              </motion.div>

              {/* ── SALDO (receitas − despesas, cor dinâmica) ── */}
              <motion.div whileHover={{ y:-2, boxShadow:`0 14px 36px ${saldoShadow}` }}
                style={{ ...KPI_CARD, background:saldoColor }}>
                <svg style={{position:'absolute',right:0,bottom:0,opacity:0.18}} width="90" height="56" viewBox="0 0 90 56" fill="none">
                  <line x1="4"  y1="28" x2="86" y2="28" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                  <line x1="4"  y1="36" x2="86" y2="36" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
                  <circle cx="86" cy="28" r="4" fill="white" opacity="0.7"/>
                </svg>
                <div style={{position:'absolute',top:-14,right:-14,width:44,height:44,borderRadius:'50%',background:'rgba(255,255,255,0.09)'}}/>
                <p style={KPI_TITLE}>Saldo</p>
                <OdometroSaldo value={saldoMes} style={KPI_VALUE}/>
              </motion.div>

              {/* ── ACUMULADO (total em contas) ── */}
              <motion.div whileHover={{ y:-2, boxShadow:'0 14px 36px rgba(80,78,118,0.45)' }}
                style={{ ...KPI_CARD, background:'#504E76' }}>
                <svg style={{position:'absolute',right:0,bottom:0,opacity:0.18}} width="90" height="56" viewBox="0 0 90 56" fill="none">
                  <rect x="10" y="38" width="10" height="18" rx="3" fill="white"/>
                  <rect x="26" y="27" width="10" height="29" rx="3" fill="white"/>
                  <rect x="42" y="16" width="10" height="40" rx="3" fill="white"/>
                  <rect x="58" y="6"  width="10" height="50" rx="3" fill="white"/>
                  <rect x="74" y="14" width="10" height="42" rx="3" fill="white" opacity="0.55"/>
                </svg>
                <div style={{position:'absolute',top:-14,right:-14,width:44,height:44,borderRadius:'50%',background:'rgba(255,255,255,0.09)'}}/>
                <p style={KPI_TITLE}>Acumulado</p>
                <OdometroSaldo value={saldoTotal} style={KPI_VALUE}/>
              </motion.div>

            </div>

            {/* RIGHT: Rich Calendar */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid rgba(44,26,15,0.08)',
              borderRadius: 22,
              boxShadow: '0 2px 16px rgba(44,26,15,0.05)',
              padding: '22px 24px',
              display: 'flex',
              flexDirection: 'column',
            }}>
              {/* Header */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
                <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
                  <h2 style={{ fontFamily:"'Fraunces',Georgia,serif", fontSize:20, fontWeight:700, color:'#2C1A0F', margin:0, textTransform:'capitalize' }}>{mesNome}</h2>
                  <span style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:12, color:'#9B7B6A' }}>{ano}</span>
                </div>
                {monthEventsList.length > 0 && (
                  <span style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:11, fontWeight:600, color:'#7A5C4F', background:'rgba(212,160,23,0.12)', borderRadius:20, padding:'4px 12px' }}>
                    {monthEventsList.length} evento{monthEventsList.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Day headers */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, marginBottom:6 }}>
                {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map((d, idx) => (
                  <div key={d} style={{
                    fontFamily:"'Plus Jakarta Sans',sans-serif",
                    fontSize:10, fontWeight:700, textAlign:'center',
                    color: idx === 0 || idx === 6 ? 'rgba(196,85,59,0.55)' : '#9B7B6A',
                  }}>{d}</div>
                ))}
              </div>

              {/* Calendar grid */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3, marginBottom:16 }}>
                {Array.from({ length: Math.ceil(calCells / 7) * 7 }, (_, idx) => {
                  const day = idx - calFirstDow + 1
                  const colIdx = idx % 7
                  const isWeekend = colIdx === 0 || colIdx === 6
                  if (day < 1 || day > calDaysInMonth) return <div key={idx}/>
                  const isToday = day === hoje
                  const isPast = day < hoje
                  const events = calendarEvents.get(day) ?? []
                  return (
                    <div key={idx} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'4px 0' }}>
                      <div style={{
                        width:34, height:34, borderRadius:'50%',
                        background: isToday ? '#504E76' : events.length > 0 ? 'rgba(212,160,23,0.08)' : 'transparent',
                        border: events.length > 0 && !isToday ? '1.5px solid rgba(212,160,23,0.25)' : 'none',
                        boxShadow: isToday ? '0 4px 12px rgba(80,78,118,0.35)' : 'none',
                        display:'flex', alignItems:'center', justifyContent:'center',
                      }}>
                        <span style={{
                          fontFamily:"'Plus Jakarta Sans',sans-serif",
                          fontSize:13,
                          fontWeight: isToday ? 700 : events.length > 0 ? 600 : 400,
                          color: isToday ? 'white' : isPast ? 'rgba(44,26,15,0.3)' : isWeekend ? 'rgba(196,85,59,0.7)' : '#2C1A0F',
                        }}>{day}</span>
                      </div>
                      {events.length > 0 && (
                        <div style={{ display:'flex', gap:2 }}>
                          {events.slice(0, 3).map((color, ci) => (
                            <div key={ci} style={{ width:5, height:5, borderRadius:'50%', background:color }}/>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Events list */}
              {monthEventsList.length > 0 && (
                <>
                  <div style={{ height:1, background:'rgba(44,26,15,0.07)', marginBottom:14 }}/>
                  <p style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:9, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'#9B7B6A', marginBottom:10, margin:'0 0 10px 0' }}>Eventos do mês</p>
                  <div style={{ display:'flex', flexDirection:'column', gap:8, overflowY:'auto' }}>
                    {monthEventsList.slice(0, 6).map((ev, i) => (
                      <div key={i} style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{
                          minWidth:40, height:24, borderRadius:12,
                          background: ev.cor, opacity: 0.9,
                          display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                        }}>
                          <span style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:10, fontWeight:700, color:'white' }}>dia {ev.day}</span>
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:12, fontWeight:600, color:'#2C1A0F', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ev.name}</p>
                          <p style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:10, color:'#9B7B6A', margin:0 }}>{ev.tipo}</p>
                        </div>
                        {ev.valor !== undefined && (
                          <span style={{ fontFamily:"'Fraunces',Georgia,serif", fontSize:13, fontWeight:700, color:'#2C1A0F', flexShrink:0 }}>{fmt(ev.valor)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
              {monthEventsList.length === 0 && (
                <div style={{ textAlign:'center', opacity:0.5, marginTop:8 }}>
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

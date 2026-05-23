import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts'
import { DragFairy, FairyBubble, useFairyPhrase } from '@/components/mascot/DragFairy'
import type { Phrase } from '@/components/mascot/DragFairy'
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

  const contextPhrase: Phrase | undefined =
    saldoLivre < 0          ? { text: 'Tá achando que é herdeira?!',          emoji: 'flame'   }
    : taxaPoupanca > 30     ? { text: 'AAAA você arrasou! Meta batida!',        emoji: 'sparkle' }
    : receitas === 0 && despesas === 0 ? { text: 'Zero gastos hoje? Diva em modo econômico!', emoji: 'crown' }
    : undefined

  const activePhrase = useFairyPhrase(contextPhrase)
  const ringR = 30
  const ringCirc = 2 * Math.PI * ringR

  return (
    <motion.div
      variants={STAGGER} initial="hidden" animate="show"
      style={{ width: '100%', padding: '32px', paddingBottom: 48 }}>

      {/* ─── ROW 1: Greeting ─── */}
      <motion.div variants={ITEM} style={{ display: 'grid', gridTemplateColumns: '4fr 1fr', gap: 14, marginBottom: 20 }}>

        {/* ══════════════════════════════════════════════════════════
            GREETING CARD — aurora pastel + cena mágica + fada livre
            Estrutura: outer sem overflow (fairy pode escapar)
                        inner com overflow:hidden (bg clipped)
            ══════════════════════════════════════════════════════════ */}
        <div style={{ position:'relative', minHeight:172, borderRadius:24,
          boxShadow:'0 4px 28px rgba(80,78,118,0.14), 0 1px 6px rgba(44,26,15,0.06)' }}>

          {/* ── Background layer — clipped, rico, aurora pastel ── */}
          <div style={{
            position:'absolute', inset:0, borderRadius:24, overflow:'hidden',
            background:'linear-gradient(145deg, #FFF8F4 0%, #F2ECFF 38%, #FFF6EC 72%, #EDFAF6 100%)',
            pointerEvents:'none',
          }}>

            {/* Linhas de vento SVG — sutis, cheias de movimento */}
            <svg style={{position:'absolute',inset:0,width:'100%',height:'100%'}}
              viewBox="0 0 820 222" fill="none" preserveAspectRatio="xMidYMid meet">
              <path d="M-10,55 Q220,5 480,75 Q650,120 840,45"
                stroke="rgba(196,85,59,0.1)" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M-10,100 Q200,45 420,95 Q600,135 840,85"
                stroke="rgba(196,195,227,0.28)" strokeWidth="1.2" strokeLinecap="round"/>
              <path d="M-10,155 Q260,110 470,148 Q640,172 840,135"
                stroke="rgba(58,133,128,0.13)" strokeWidth="1" strokeLinecap="round"/>
              <path d="M250,222 Q480,190 840,205"
                stroke="rgba(212,160,23,0.1)" strokeWidth="1" strokeLinecap="round"/>
              <path d="M-10,185 Q180,160 340,178 Q520,198 700,175"
                stroke="rgba(196,195,227,0.16)" strokeWidth="0.8" strokeLinecap="round"/>
            </svg>

            {/* Constelação — canto direito */}
            <svg style={{position:'absolute',right:0,top:0,width:'48%',height:'100%'}}
              viewBox="0 0 390 222" fill="none">
              {/* Pontos */}
              <circle cx="100" cy="52"  r="2.8" fill="rgba(196,195,227,0.55)"/>
              <circle cx="175" cy="30"  r="2.2" fill="rgba(196,195,227,0.48)"/>
              <circle cx="238" cy="62"  r="3.2" fill="rgba(196,195,227,0.6)"/>
              <circle cx="218" cy="118" r="2"   fill="rgba(196,195,227,0.42)"/>
              <circle cx="128" cy="105" r="2.5" fill="rgba(196,195,227,0.5)"/>
              <circle cx="278" cy="46"  r="2"   fill="rgba(212,160,23,0.4)"/>
              <circle cx="308" cy="138" r="2.2" fill="rgba(58,133,128,0.32)"/>
              <circle cx="155" cy="75"  r="1.5" fill="rgba(196,85,59,0.3)"/>
              <circle cx="262" cy="90"  r="1.8" fill="rgba(196,195,227,0.38)"/>
              {/* Linhas */}
              <line x1="100" y1="52"  x2="175" y2="30"  stroke="rgba(196,195,227,0.2)"  strokeWidth="0.9"/>
              <line x1="175" y1="30"  x2="238" y2="62"  stroke="rgba(196,195,227,0.2)"  strokeWidth="0.9"/>
              <line x1="238" y1="62"  x2="278" y2="46"  stroke="rgba(196,195,227,0.16)" strokeWidth="0.8"/>
              <line x1="100" y1="52"  x2="128" y2="105" stroke="rgba(196,195,227,0.16)" strokeWidth="0.8"/>
              <line x1="128" y1="105" x2="218" y2="118" stroke="rgba(196,195,227,0.16)" strokeWidth="0.8"/>
              <line x1="238" y1="62"  x2="218" y2="118" stroke="rgba(196,195,227,0.14)" strokeWidth="0.8"/>
              <line x1="218" y1="118" x2="308" y2="138" stroke="rgba(58,133,128,0.14)"  strokeWidth="0.8"/>
              <line x1="155" y1="75"  x2="262" y2="90"  stroke="rgba(196,195,227,0.12)" strokeWidth="0.7"/>
            </svg>

            {/* Moedas douradas flutuando */}
            {([
              { l:'68%', t:'14%', s:36, d:0,   o:0.7 },
              { l:'81%', t:'55%', s:28, d:2.6,  o:0.6 },
              { l:'57%', t:'64%', s:22, d:4.8,  o:0.55 },
            ] as {l:string;t:string;s:number;d:number;o:number}[]).map((c,i) => (
              <motion.div key={i} style={{
                position:'absolute', left:c.l, top:c.t,
                width:c.s, height:c.s, borderRadius:'50%',
                background:'radial-gradient(circle at 35% 30%, rgba(255,224,100,0.55), rgba(212,160,23,0.24))',
                border:'1.5px solid rgba(212,160,23,0.32)',
                boxShadow:'0 3px 14px rgba(212,160,23,0.2)',
              }}
                animate={{ y:[0,-9,0], opacity:[c.o,c.o+0.2,c.o] }}
                transition={{ duration:6+i*0.9, repeat:Infinity, ease:'easeInOut', delay:c.d }}
              />
            ))}

            {/* Sparkles mágicos */}
            {([
              {l:'44%',t:'16%',d:0  },{l:'60%',t:'70%',d:2.4},
              {l:'75%',t:'10%',d:1.6},{l:'85%',t:'48%',d:3.8},
              {l:'52%',t:'82%',d:0.9},{l:'90%',t:'72%',d:5.1},
            ] as {l:string;t:string;d:number}[]).map((s,i)=>(
              <motion.div key={i} style={{position:'absolute',left:s.l,top:s.t}}
                animate={{opacity:[0.08,0.45,0.08],scale:[0.7,1.2,0.7]}}
                transition={{duration:4+i*0.45,repeat:Infinity,ease:'easeInOut',delay:s.d}}>
                <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
                  <path d="M10 2 L11.3 8 L17 9 L11.3 10 L10 16 L8.7 10 L3 9 L8.7 8 Z"
                    fill="rgba(212,160,23,0.65)"/>
                </svg>
              </motion.div>
            ))}
          </div>

          {/* ── Texto de saudação — 3 linhas limpas ── */}
          <div style={{ position:'relative', zIndex:1, padding:'26px 32px', minHeight:172 }}>
            {/* linha 1 */}
            <p style={{
              fontFamily:"'Fraunces',Georgia,serif",
              fontStyle:'italic', fontSize:15, fontWeight:400,
              color:'#9B7B6A', marginBottom:2, letterSpacing:'-0.2px',
            }}>{saudacao},</p>
            {/* linha 2 */}
            <h1 style={{
              fontFamily:"'Fraunces',Georgia,serif",
              fontWeight:700, fontSize:46,
              lineHeight:0.92, letterSpacing:'-2px',
              color:'#2C1A0F', margin:0,
            }}>Yago</h1>
            {/* linha 3 */}
            <p style={{
              fontFamily:"'Plus Jakarta Sans',sans-serif",
              fontSize:12.5, fontWeight:500,
              color:'#7A5C4F', marginTop:8,
              letterSpacing:'.01em',
            }}>{dataHoje.charAt(0).toUpperCase() + dataHoje.slice(1)}</p>
          </div>

          {/* Fada — classe global de voo definida em index.css */}
          <div className="fairy-flight-path">
            <div style={{
              position:'absolute', bottom:'84px', left:'50%',
              transform:'translateX(-50%)', zIndex:1, width:210,
            }}>
              <FairyBubble phrase={activePhrase} />
            </div>
            <DragFairy />
          </div>
        </div>

        {/* ── Card mês — centralizado, limpo ── */}
        <div style={{
          background: '#504E76',
          borderRadius: 24,
          padding: '14px 12px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 7,
          position: 'relative',
          overflow: 'hidden',
          minHeight: 0,
        }}>
          {/* Orbs decorativos */}
          <div style={{ position:'absolute', top:-28, right:-28, width:90, height:90,
            borderRadius:'50%', background:'rgba(255,255,255,0.05)', pointerEvents:'none' }}/>
          <div style={{ position:'absolute', bottom:-16, left:-16, width:64, height:64,
            borderRadius:'50%', background:'rgba(241,100,46,0.1)', pointerEvents:'none' }}/>

          {/* Mês + ano */}
          <div style={{ textAlign:'center' }}>
            <p style={{ fontFamily:"'Fraunces',Georgia,serif", fontSize:20, fontWeight:700,
              color:'#ffffff', textTransform:'capitalize', lineHeight:1.1, margin:0 }}>
              {mesNome}
            </p>
            <p style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:10,
              color:'rgba(255,255,255,0.38)', marginTop:2 }}>{ano}</p>
          </div>

          {/* Anel de dias */}
          <svg width="58" height="58" viewBox="0 0 58 58">
            <circle cx="29" cy="29" r="24" fill="none"
              stroke="rgba(255,255,255,0.12)" strokeWidth="5"/>
            <motion.circle cx="29" cy="29" r="24" fill="none"
              stroke="rgba(196,195,227,0.82)" strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 24}
              initial={{ strokeDashoffset: 2 * Math.PI * 24 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 24 * (1 - hoje / diasNoMes) }}
              transition={{ duration:1.4, ease:[0.34,1.56,0.64,1], delay:0.4 }}
              style={{ transform:'rotate(-90deg)', transformOrigin:'29px 29px' }}
            />
            <text x="29" y="26" textAnchor="middle" fill="white"
              fontSize="12" fontFamily="Fraunces, Georgia, serif" fontWeight="700">{hoje}</text>
            <text x="29" y="36" textAnchor="middle" fill="rgba(255,255,255,0.38)"
              fontSize="6" fontFamily="Plus Jakarta Sans, sans-serif">DE {diasNoMes}</text>
          </svg>

        </div>
      </motion.div>

      {/* ─── ROW 2: KPIs ─── */}
      {(() => {
        const saldoMes = receitas - totalComprometido
        const saldoColor   = saldoMes >= 0 ? '#3A8580' : '#C4553B'
        const saldoShadow  = saldoMes >= 0 ? 'rgba(58,133,128,0.4)' : 'rgba(196,85,59,0.4)'
        const KPI_TITLE: React.CSSProperties = {
          fontFamily: "'Fraunces',Georgia,serif",
          fontSize: 11,
          fontWeight: 700,
          color: 'rgba(255,255,255,0.72)',
          marginBottom: 10,
          letterSpacing: '.08em',
          textTransform: 'uppercase',
        }
        const KPI_VALUE: React.CSSProperties = {
          fontFamily: "'Fraunces',Georgia,serif",
          fontWeight: 700,
          fontSize: 26,
          color: 'white',
          letterSpacing: '-1px',
          lineHeight: 1,
          display: 'block',
          width: '100%',
          textAlign: 'center',
        }
        const KPI_CARD: React.CSSProperties = {
          borderRadius: 22,
          padding: '20px 20px',
          position: 'relative',
          overflow: 'hidden',
          transition: 'box-shadow .18s',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
        }
        return (
          <motion.div variants={ITEM} style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>

            {/* ── RECEITAS ── */}
            <motion.div whileHover={{ y:-3, boxShadow:'0 14px 36px rgba(163,181,101,0.42)' }}
              style={{ ...KPI_CARD, background:'#A3B565' }}>
              {/* Onda ascendente */}
              <svg style={{position:'absolute',right:0,bottom:0,opacity:0.16}} width="110" height="70" viewBox="0 0 110 70" fill="none">
                <path d="M0,65 Q28,20 55,38 Q82,55 110,8" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                <path d="M0,65 Q28,20 55,38 Q82,55 110,8 L110,70 L0,70Z" fill="white" opacity="0.07"/>
                <circle cx="110" cy="8" r="4.5" fill="white" opacity="0.6"/>
              </svg>
              <div style={{position:'absolute',top:-18,right:-18,width:54,height:54,borderRadius:'50%',background:'rgba(255,255,255,0.09)'}}/>
              <p style={KPI_TITLE}>Receitas</p>
              <OdometroSaldo value={receitas} style={KPI_VALUE}/>
            </motion.div>

            {/* ── DESPESAS ── */}
            <motion.div whileHover={{ y:-3, boxShadow:'0 14px 36px rgba(241,100,46,0.42)' }}
              style={{ ...KPI_CARD, background:'#F1642E' }}>
              {/* Onda descendente */}
              <svg style={{position:'absolute',right:0,bottom:0,opacity:0.16}} width="110" height="70" viewBox="0 0 110 70" fill="none">
                <path d="M0,8 Q28,52 55,32 Q82,14 110,62" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                <path d="M0,8 Q28,52 55,32 Q82,14 110,62 L110,70 L0,70Z" fill="white" opacity="0.07"/>
                <circle cx="110" cy="62" r="4.5" fill="white" opacity="0.6"/>
              </svg>
              <div style={{position:'absolute',top:-18,right:-18,width:54,height:54,borderRadius:'50%',background:'rgba(255,255,255,0.09)'}}/>
              <p style={KPI_TITLE}>Despesas</p>
              <OdometroSaldo value={totalComprometido} style={KPI_VALUE}/>
            </motion.div>

            {/* ── SALDO (receitas − despesas, cor dinâmica) ── */}
            <motion.div whileHover={{ y:-3, boxShadow:`0 14px 36px ${saldoShadow}` }}
              style={{ ...KPI_CARD, background:saldoColor }}>
              {/* Linha de equilíbrio */}
              <svg style={{position:'absolute',right:0,bottom:0,opacity:0.18}} width="110" height="70" viewBox="0 0 110 70" fill="none">
                <line x1="4"  y1="35" x2="106" y2="35" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                <line x1="4"  y1="44" x2="106" y2="44" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
                <circle cx="106" cy="35" r="4" fill="white" opacity="0.7"/>
              </svg>
              <div style={{position:'absolute',top:-18,right:-18,width:54,height:54,borderRadius:'50%',background:'rgba(255,255,255,0.09)'}}/>
              <p style={KPI_TITLE}>Saldo</p>
              <OdometroSaldo value={saldoMes} style={KPI_VALUE}/>
            </motion.div>

            {/* ── ACUMULADO (total em contas) ── */}
            <motion.div whileHover={{ y:-3, boxShadow:'0 14px 36px rgba(80,78,118,0.45)' }}
              style={{ ...KPI_CARD, background:'#504E76' }}>
              {/* Barras crescentes */}
              <svg style={{position:'absolute',right:0,bottom:0,opacity:0.18}} width="110" height="70" viewBox="0 0 110 70" fill="none">
                <rect x="16" y="48" width="12" height="22" rx="3" fill="white"/>
                <rect x="34" y="34" width="12" height="36" rx="3" fill="white"/>
                <rect x="52" y="20" width="12" height="50" rx="3" fill="white"/>
                <rect x="70" y="8"  width="12" height="62" rx="3" fill="white"/>
                <rect x="88" y="18" width="12" height="52" rx="3" fill="white" opacity="0.55"/>
              </svg>
              <div style={{position:'absolute',top:-18,right:-18,width:54,height:54,borderRadius:'50%',background:'rgba(255,255,255,0.09)'}}/>
              <p style={KPI_TITLE}>Acumulado</p>
              <OdometroSaldo value={saldoTotal} style={KPI_VALUE}/>
            </motion.div>

          </motion.div>
        )
      })()}

      {/* ─── SECTION 3: Mini Calendário + Análise de Gastos ─── */}
      <motion.div variants={ITEM} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>

        {/* Mini Calendário — branco, border suave */}
        <div style={{ background:'#FFFFFF', border:'1px solid rgba(44,26,15,0.08)', borderRadius:22, boxShadow:'0 2px 16px rgba(44,26,15,0.05)', padding:20 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 16 }}>
            <h2 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 16, fontWeight: 700, color: '#2C1A0F', margin: 0, textTransform: 'capitalize' }}>{mesNome}</h2>
            <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#9B7B6A' }}>{ano}</span>
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 6 }}>
            {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => (
              <div key={d} style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 700, color: '#9B7B6A', textAlign: 'center' }}>{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
            {Array.from({ length: Math.ceil(calCells / 7) * 7 }, (_, idx) => {
              const day = idx - calFirstDow + 1
              if (day < 1 || day > calDaysInMonth) {
                return <div key={idx} />
              }
              const isToday = day === hoje
              const isPast = day < hoje
              const events = calendarEvents.get(day) ?? []
              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <div style={{
                    width: 28, height: 28,
                    borderRadius: '50%',
                    background: isToday ? '#504E76' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                      fontSize: 11,
                      fontWeight: isToday ? 700 : 400,
                      color: isToday ? 'white' : isPast ? 'rgba(44,26,15,0.35)' : '#2C1A0F',
                    }}>{day}</span>
                  </div>
                  {events.length > 0 && (
                    <div style={{ display: 'flex', gap: 2 }}>
                      {events.slice(0, 3).map((color, ci) => (
                        <div key={ci} style={{ width: 3, height: 3, borderRadius: '50%', background: color }} />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 14, marginTop: 14, flexWrap: 'wrap' }}>
            {[
              { color: '#D4A017', label: 'Conta fixa' },
              { color: '#504E76', label: 'Fecha cartão' },
              { color: '#C4553B', label: 'Vence cartão' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: '#9B7B6A' }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

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
              <div style={{ position: 'relative', width: '100%', height: 170, marginBottom: 14 }}>
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
      </motion.div>

      {/* ─── SECTION 4: Top 5 Despesas + Metas ─── */}
      <motion.div variants={ITEM} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>

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
                          animate={{ width:`${pct}%` }}
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

        {/* Metas — #FFF0F5 rosa clarinho, progress rings SVG */}
        <div style={{ background:'#FFF0F5', border:'1px solid rgba(255,107,157,0.2)', borderRadius:22, boxShadow:'0 2px 16px rgba(255,107,157,0.1)', padding:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <h2 style={{ fontFamily:"'Fraunces',Georgia,serif", fontSize:16, fontWeight:700, color:'#2C1A0F', margin:0 }}>Metas</h2>
            <button onClick={() => navigate('/metas')}
              style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:11, fontWeight:600, color:'#C4553B', background:'none', border:'none', cursor:'pointer' }}>
              Ver →
            </button>
          </div>

          {metas.length === 0 ? (
            <div style={{ paddingTop:16, textAlign:'center' }}>
              <p style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:13, color:'#9B7B6A' }}>Nenhuma meta cadastrada</p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {metas.slice(0, 4).map((meta, mi) => {
                const pct = Math.min(100, meta.valorAlvo > 0 ? (meta.valorAtual / meta.valorAlvo) * 100 : 0)
                const r = 20, circ = 2 * Math.PI * r
                return (
                  <div key={meta.id} style={{ display:'flex', alignItems:'center', gap:14 }}>
                    {/* SVG ring */}
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
                    {/* Info */}
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
                  tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)}
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

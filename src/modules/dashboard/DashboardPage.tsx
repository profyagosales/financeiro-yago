import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { DragFairy, FairyBubble, useFairyPhrase } from '@/components/mascot/DragFairy'
import type { Phrase } from '@/components/mascot/DragFairy'
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
          padding: '20px 16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          position: 'relative',
          overflow: 'hidden',
          minHeight: 172,
        }}>
          {/* Orbs decorativos */}
          <div style={{ position:'absolute', top:-28, right:-28, width:90, height:90,
            borderRadius:'50%', background:'rgba(255,255,255,0.05)', pointerEvents:'none' }}/>
          <div style={{ position:'absolute', bottom:-16, left:-16, width:64, height:64,
            borderRadius:'50%', background:'rgba(241,100,46,0.1)', pointerEvents:'none' }}/>

          {/* Mês + ano */}
          <div style={{ textAlign:'center' }}>
            <p style={{ fontFamily:"'Fraunces',Georgia,serif", fontSize:26, fontWeight:700,
              color:'#ffffff', textTransform:'capitalize', lineHeight:1.1, margin:0 }}>
              {mesNome}
            </p>
            <p style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:12,
              color:'rgba(255,255,255,0.38)', marginTop:2 }}>{ano}</p>
          </div>

          {/* Anel de dias */}
          <svg width="80" height="80" viewBox="0 0 76 76">
            <circle cx="38" cy="38" r={ringR} fill="none"
              stroke="rgba(255,255,255,0.12)" strokeWidth="6"/>
            <motion.circle cx="38" cy="38" r={ringR} fill="none"
              stroke="rgba(196,195,227,0.82)" strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={ringCirc}
              initial={{ strokeDashoffset: ringCirc }}
              animate={{ strokeDashoffset: ringCirc * (1 - hoje / diasNoMes) }}
              transition={{ duration:1.4, ease:[0.34,1.56,0.64,1], delay:0.4 }}
              style={{ transform:'rotate(-90deg)', transformOrigin:'38px 38px' }}
            />
            <text x="38" y="35" textAnchor="middle" fill="white"
              fontSize="15" fontFamily="Fraunces, Georgia, serif" fontWeight="700">{hoje}</text>
            <text x="38" y="47" textAnchor="middle" fill="rgba(255,255,255,0.38)"
              fontSize="7" fontFamily="Plus Jakarta Sans, sans-serif">DE {diasNoMes}</text>
          </svg>

        </div>
      </motion.div>

      {/* ─── ROW 2: KPIs — cores sólidas, identidade visual forte ─── */}
      <motion.div variants={ITEM} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>

        {/* RENDAS — sage green sólido */}
        <motion.div whileHover={{ y: -3, boxShadow: '0 14px 36px rgba(163,181,101,0.4)' }}
          style={{ background: '#A3B565', borderRadius: 22, padding: '20px 22px',
            position: 'relative', overflow: 'hidden', transition: 'box-shadow .18s' }}>
          <div style={{ position: 'absolute', right: -12, top: -12, opacity: 0.15 }}>
            <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
              <path d="M60 12 L12 60" stroke="white" strokeWidth="18" strokeLinecap="round"/>
              <path d="M32 12 L60 12 L60 40" stroke="white" strokeWidth="18" strokeLinejoin="round" fill="none"/>
            </svg>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <div style={{ width: 22, height: 22, borderRadius: 7, background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconArrowUpRight size={12} color="white" stroke={2.5}/>
            </div>
            <span style={{ ...LABEL, color: 'rgba(255,255,255,0.8)' }}>Rendas</span>
          </div>
          <OdometroSaldo value={receitas} style={{ ...DISPLAY, fontSize: 26, color: 'white', display: 'block' }}/>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11,
            color: 'rgba(255,255,255,0.65)', marginTop: 6 }}>em {mesNome}</p>
        </motion.div>

        {/* DESPESAS — laranja sólido */}
        <motion.div whileHover={{ y: -3, boxShadow: '0 14px 36px rgba(241,100,46,0.4)' }}
          style={{ background: '#F1642E', borderRadius: 22, padding: '20px 22px',
            position: 'relative', overflow: 'hidden', transition: 'box-shadow .18s' }}>
          <div style={{ position: 'absolute', right: -12, bottom: -12, opacity: 0.15 }}>
            <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
              <path d="M12 12 L60 60" stroke="white" strokeWidth="18" strokeLinecap="round"/>
              <path d="M40 60 L12 60 L12 32" stroke="white" strokeWidth="18" strokeLinejoin="round" fill="none"/>
            </svg>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <div style={{ width: 22, height: 22, borderRadius: 7, background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconArrowDownRight size={12} color="white" stroke={2.5}/>
            </div>
            <span style={{ ...LABEL, color: 'rgba(255,255,255,0.8)' }}>Despesas</span>
          </div>
          <OdometroSaldo value={totalComprometido} style={{ ...DISPLAY, fontSize: 26, color: 'white', display: 'block' }}/>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11,
            color: 'rgba(255,255,255,0.65)', marginTop: 6 }}>comprometido</p>
        </motion.div>

        {/* SALDO — roxo sólido */}
        <motion.div whileHover={{ y: -3, boxShadow: '0 14px 36px rgba(80,78,118,0.45)' }}
          style={{ background: '#504E76', borderRadius: 22, padding: '20px 22px',
            position: 'relative', overflow: 'hidden', transition: 'box-shadow .18s' }}>
          <div style={{ position: 'absolute', left: -16, bottom: -16, width: 80, height: 80,
            borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <div style={{ width: 22, height: 22, borderRadius: 7, background: 'rgba(255,255,255,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconWallet size={12} color="white" stroke={2}/>
            </div>
            <span style={{ ...LABEL, color: 'rgba(255,255,255,0.7)' }}>Saldo</span>
          </div>
          <OdometroSaldo value={saldoTotal} style={{ ...DISPLAY, fontSize: 26, color: 'white', display: 'block' }}/>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11,
            color: 'rgba(255,255,255,0.5)', marginTop: 6 }}>
            {contas.length} conta{contas.length !== 1 ? 's' : ''}
          </p>
        </motion.div>

        {/* POUPANÇA — âmbar sólido (cor dinâmica) */}
        <motion.div whileHover={{ y: -3, boxShadow: `0 14px 36px ${poupancaColor}55` }}
          style={{ background: taxaPoupanca > 20 ? '#3A8580' : taxaPoupanca > 0 ? '#D4A017' : '#C4553B',
            borderRadius: 22, padding: '20px 22px', position: 'relative', overflow: 'hidden',
            transition: 'box-shadow .18s' }}>
          <div style={{ position: 'absolute', right: 16, bottom: 16, opacity: 0.12 }}>
            <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
              <circle cx="30" cy="30" r="26" stroke="white" strokeWidth="8" fill="none"/>
              <path d="M30 10 L30 30 L46 30" stroke="white" strokeWidth="8" strokeLinecap="round" fill="none"/>
            </svg>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <div style={{ width: 22, height: 22, borderRadius: 7, background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconPercentage size={12} color="white" stroke={2}/>
            </div>
            <span style={{ ...LABEL, color: 'rgba(255,255,255,0.75)' }}>Poupança</span>
          </div>
          <p style={{ ...DISPLAY, fontSize: 26, color: 'white' }}>{taxaPoupanca.toFixed(1)}%</p>
          <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 4, height: 4,
            overflow: 'hidden', marginTop: 10 }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, taxaPoupanca)}%` }}
              transition={{ type: 'spring', stiffness: 180, damping: 24, delay: 0.3 }}
              style={{ height: '100%', background: 'rgba(255,255,255,0.7)', borderRadius: 4 }}/>
          </div>
        </motion.div>
      </motion.div>

      {/* ─── ROW 3: Hero dark card (2/3) + Gastos por categoria (1/3) ─── */}
      <motion.div variants={ITEM} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 20 }}>

        {/* PANORAMA — glassmorphism limpo, cores vibrantes */}
        <div style={{
          background: 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: 22,
          padding: '26px 28px',
          border: '1px solid rgba(255,255,255,0.65)',
          boxShadow: '0 8px 40px rgba(44,26,15,0.07), 0 2px 8px rgba(44,26,15,0.04)',
        }}>
          <p style={{ ...LABEL, color: '#9B7B6A', marginBottom: 18 }}>Panorama · {mesNome}</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div style={{ background: 'rgba(58,133,128,0.08)', borderRadius: 16, padding: '14px 16px', border: '1px solid rgba(58,133,128,0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                <IconArrowUpRight size={11} color="#3A8580" stroke={2.5} />
                <span style={{ ...LABEL, color: '#3A8580', fontSize: 9 }}>Entradas</span>
              </div>
              <OdometroSaldo value={receitas} style={{ ...DISPLAY, fontSize: 24, color: '#3A8580', display: 'block' }} />
            </div>
            <div style={{ background: 'rgba(196,85,59,0.08)', borderRadius: 16, padding: '14px 16px', border: '1px solid rgba(196,85,59,0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                <IconArrowDownRight size={11} color="#C4553B" stroke={2.5} />
                <span style={{ ...LABEL, color: '#C4553B', fontSize: 9 }}>Saídas</span>
              </div>
              <OdometroSaldo value={totalComprometido} style={{ ...DISPLAY, fontSize: 24, color: '#C4553B', display: 'block' }} />
            </div>
          </div>

          <div style={{ height: 1, background: 'rgba(44,26,15,0.07)', marginBottom: 16 }} />

          {[
            { icon: IconTrendingDown, label: 'Gastos variáveis', valor: despesas, sub: undefined as string | undefined },
            { icon: IconRepeat, label: `Contas fixas (${contasFixas.length})`, valor: totalFixasMes, sub: `${fixasPagas.length} pagas · ${fixasPendentes.length} pendentes` },
            { icon: IconCalendarStats, label: `Parcelamentos (${parcelamentos.length})`, valor: totalParcelamentos, sub: undefined as string | undefined },
          ].filter(item => item.valor > 0).map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <item.icon size={12} color="#C4B4A8" stroke={1.8} />
              <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#7A5C4F', flex: 1 }}>
                {item.label}{item.sub ? <span style={{ opacity: .7 }}> · {item.sub}</span> : ''}
              </span>
              <span style={{ ...DISPLAY, fontSize: 13, color: '#2C1A0F' }}>{fmt(item.valor)}</span>
            </div>
          ))}

          {receitas > 0 && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(44,26,15,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ ...LABEL, color: saldoLivre >= 0 ? '#3A8580' : '#C4553B', marginBottom: 5 }}>Saldo livre</p>
                <OdometroSaldo value={saldoLivre} style={{ ...DISPLAY, fontSize: 22, color: saldoLivre >= 0 ? '#3A8580' : '#C4553B', display: 'block' }} />
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ ...LABEL, marginBottom: 5 }}>Por dia</p>
                <OdometroSaldo value={Math.max(0, porDia)} style={{ ...DISPLAY, fontSize: 18, color: '#2C1A0F', display: 'block' }} />
              </div>
            </div>
          )}
        </div>

        {/* Gastos por categoria — glassmorphism com accent teal */}
        <div style={{
          background: 'linear-gradient(160deg, rgba(58,133,128,0.14) 0%, rgba(255,255,255,0.75) 55%)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          border: '1px solid rgba(58,133,128,0.22)',
          borderRadius: 22,
          padding: '22px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 8px 32px rgba(58,133,128,0.12), 0 2px 8px rgba(44,26,15,0.04)',
        }}>
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
              <div style={{ fontSize: 32 }}>
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <circle cx="24" cy="24" r="22" fill="#F5F0E8" stroke="#EDE6DC" strokeWidth="1.5"/>
                  <path d="M16 28 Q24 34 32 28" stroke="#C4B4A8" strokeWidth="2" strokeLinecap="round" fill="none"/>
                  <circle cx="18" cy="22" r="2.5" fill="#C4B4A8"/>
                  <circle cx="30" cy="22" r="2.5" fill="#C4B4A8"/>
                  <path d="M12 16 Q14 12 18 14" stroke="#C4B4A8" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                  <path d="M36 16 Q34 12 30 14" stroke="#C4B4A8" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                </svg>
              </div>
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

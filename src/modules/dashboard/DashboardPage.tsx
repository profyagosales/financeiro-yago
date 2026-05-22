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

// ─── Cena financeira do card de saudação ─────────────────────────
function FinancialScene() {
  const sparkles = [
    { x:'36%', y:'15%', d:0   }, { x:'50%', y:'68%', d:1.5 },
    { x:'62%', y:'10%', d:2.8 }, { x:'74%', y:'55%', d:0.7 },
    { x:'86%', y:'22%', d:3.5 }, { x:'92%', y:'72%', d:1.9 },
  ]
  return (
    <div style={{ position:'absolute', inset:0, zIndex:0, overflow:'hidden', pointerEvents:'none' }}>

      {/* ── Área chart — peça principal, cobre toda a metade direita ── */}
      <svg style={{ position:'absolute', right:0, bottom:0, width:'70%', height:'115%' }}
        viewBox="0 0 320 130" fill="none" preserveAspectRatio="xMaxYMax meet">
        <defs>
          <linearGradient id="fsArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="rgba(163,181,101,0.2)"/>
            <stop offset="100%" stopColor="rgba(163,181,101,0.01)"/>
          </linearGradient>
          <linearGradient id="fsGlow" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="rgba(163,181,101,0)"/>
            <stop offset="100%" stopColor="rgba(163,181,101,0.18)"/>
          </linearGradient>
        </defs>
        {/* Linhas de grid — muito sutis */}
        {[20,48,76,104].map(y => (
          <line key={y} x1="0" y1={y} x2="320" y2={y}
            stroke="rgba(255,255,255,0.03)" strokeWidth="1"/>
        ))}
        {/* Área sob a curva */}
        <path
          d="M0,120 C50,112 80,108 110,90 C140,72 165,82 195,58 C225,34 255,46 285,22 C296,15 308,12 320,6 V130 H0Z"
          fill="url(#fsArea)"/>
        {/* Glow lateral */}
        <rect x="220" y="0" width="100" height="130" fill="url(#fsGlow)"/>
        {/* Linha principal */}
        <path
          d="M0,120 C50,112 80,108 110,90 C140,72 165,82 195,58 C225,34 255,46 285,22 C296,15 308,12 320,6"
          stroke="rgba(163,181,101,0.45)" strokeWidth="2" fill="none"
          strokeLinecap="round" strokeLinejoin="round"/>
        {/* Pontos em destaque */}
        {[{x:110,y:90},{x:195,y:58},{x:285,y:22}].map((p,i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="6"   fill="rgba(163,181,101,0.12)"/>
            <circle cx={p.x} cy={p.y} r="3.5" fill="rgba(163,181,101,0.6)"
              stroke="rgba(163,181,101,0.3)" strokeWidth="1"/>
          </g>
        ))}
      </svg>

      {/* ── Sparkles mágicos — coincidem com a paleta da fada ── */}
      {sparkles.map((s,i) => (
        <motion.div key={i}
          style={{ position:'absolute', left:s.x, top:s.y }}
          animate={{ opacity:[0.06,0.4,0.06], scale:[0.6,1.2,0.6] }}
          transition={{ duration:3.2+i*0.35, repeat:Infinity, ease:'easeInOut', delay:s.d }}
        >
          <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
            <path d="M10 2 L11.3 8 L17 9 L11.3 10 L10 16 L8.7 10 L3 9 L8.7 8 Z"
              fill="rgba(255,220,80,0.55)"/>
          </svg>
        </motion.div>
      ))}
    </div>
  )
}

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

        {/* ── Greeting card — dark, atmosférico, fada voa livremente ── */}
        <div style={{
          background: 'linear-gradient(140deg, #1C1838 0%, #110E2A 55%, #1A0E2C 100%)',
          borderRadius: 24,
          boxShadow: '0 8px 40px rgba(17,14,42,0.5)',
          position: 'relative',
          overflow: 'hidden',
          minHeight: 210,
          padding: '34px 40px',
        }}>
          {/* Orb laranja — fundo direito */}
          <div style={{
            position: 'absolute', right: '-8%', top: '-30%',
            width: 340, height: 340, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(241,100,46,0.22) 0%, transparent 65%)',
            pointerEvents: 'none',
          }} />
          {/* Orb roxo — centro-baixo */}
          <div style={{
            position: 'absolute', left: '30%', bottom: '-40%',
            width: 280, height: 280, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 65%)',
            pointerEvents: 'none',
          }} />
          {/* Orb rosa — esquerda */}
          <div style={{
            position: 'absolute', left: '-5%', top: '20%',
            width: 200, height: 200, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,107,157,0.1) 0%, transparent 65%)',
            pointerEvents: 'none',
          }} />

          {/* Cena financeira no background */}
          <FinancialScene />

          {/* Texto de saudação */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* "Boa tarde," — Fraunces italic, quente */}
            <p style={{
              fontFamily: "'Fraunces',Georgia,serif",
              fontStyle: 'italic',
              fontSize: 18,
              fontWeight: 400,
              color: 'rgba(255,255,255,0.45)',
              marginBottom: 4,
              letterSpacing: '-0.3px',
            }}>{saudacao},</p>

            {/* "Yago." — gradient text, imponente */}
            <h1 style={{
              fontFamily: "'Fraunces',Georgia,serif",
              fontWeight: 700,
              fontSize: 54,
              lineHeight: 0.9,
              letterSpacing: '-2.5px',
              background: 'linear-gradient(130deg, #FFFFFF 30%, rgba(196,195,227,0.75) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              margin: 0,
            }}>
              Yago<span style={{ WebkitTextFillColor: '#F1642E', color: '#F1642E' }}>.</span>
            </h1>

            {/* Data — badge pill elegante */}
            <div style={{
              marginTop: 16,
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 30,
              padding: '5px 12px 5px 8px',
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: '#F1642E',
              }} />
              <p style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontSize: 12.5, fontWeight: 500,
                color: 'rgba(255,255,255,0.55)',
                letterSpacing: '.015em',
                margin: 0,
              }}>
                {dataHoje.charAt(0).toUpperCase() + dataHoje.slice(1)}
              </p>
            </div>
          </div>

          {/* Fada voando — percurso amplo por todo o card */}
          <motion.div
            style={{ position: 'absolute', zIndex: 2, pointerEvents: 'none', left: '36%', top: '8%' }}
            animate={{
              left: ['36%', '60%', '42%', '66%', '32%', '56%', '36%'],
              top:  ['8%',  '38%', '4%',  '28%', '44%', '3%',  '8%'],
            }}
            transition={{
              duration: 22, repeat: Infinity, ease: 'easeInOut',
              times: [0, 0.17, 0.33, 0.5, 0.67, 0.83, 1],
            }}
          >
            {/* Speech bubble acima da fada */}
            <div style={{ marginBottom: 8 }}>
              <FairyBubble phrase={activePhrase} />
            </div>
            <DragFairy />
          </motion.div>
        </div>

        {/* ── Card mês — roxo sólido com anel de progresso ── */}
        <div style={{
          background: '#504E76',
          borderRadius: 24,
          padding: '22px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Decoração fundo */}
          <div style={{ position: 'absolute', top: -32, right: -32, width: 110, height: 110,
            borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -18, left: -18, width: 72, height: 72,
            borderRadius: '50%', background: 'rgba(241,100,46,0.08)', pointerEvents: 'none' }} />

          {/* Header */}
          <div>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700,
              letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>
              Período atual
            </p>
            <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 24, fontWeight: 700,
              color: '#ffffff', marginTop: 3, textTransform: 'capitalize', lineHeight: 1.1 }}>
              {mesNome}
            </p>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12,
              color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>{ano}</p>
          </div>

          {/* Anel progresso + stats */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* SVG ring */}
            <svg width="76" height="76" viewBox="0 0 76 76" style={{ flexShrink: 0 }}>
              {/* Track */}
              <circle cx="38" cy="38" r={ringR} fill="none"
                stroke="rgba(255,255,255,0.12)" strokeWidth="6"/>
              {/* Progress arc */}
              <motion.circle cx="38" cy="38" r={ringR} fill="none"
                stroke="rgba(196,195,227,0.78)" strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={ringCirc}
                initial={{ strokeDashoffset: ringCirc }}
                animate={{ strokeDashoffset: ringCirc * (1 - hoje / diasNoMes) }}
                transition={{ duration: 1.3, ease: [0.34,1.56,0.64,1], delay: 0.4 }}
                style={{ transform:'rotate(-90deg)', transformOrigin:'38px 38px' }}
              />
              {/* Day number */}
              <text x="38" y="34" textAnchor="middle" fill="white"
                fontSize="15" fontFamily="Fraunces, Georgia, serif" fontWeight="700">{hoje}</text>
              <text x="38" y="47" textAnchor="middle" fill="rgba(255,255,255,0.38)"
                fontSize="7.5" fontFamily="Plus Jakarta Sans, sans-serif">DE {diasNoMes}</text>
            </svg>

            {/* Stats */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12,
                color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
                <span style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>{diasRestantes}</span>
                {' '}dias restantes
              </p>
              {contasFixas.length > 0 && (
                <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11,
                  color: 'rgba(255,255,255,0.4)' }}>
                  <span style={{ color: 'rgba(163,181,101,0.95)', fontWeight: 700 }}>{fixasPagas.length}</span>
                  /{contasFixas.length} fixas pagas
                </p>
              )}
              {transacoes.length > 0 && (
                <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11,
                  color: 'rgba(255,255,255,0.4)' }}>
                  <span style={{ color: 'rgba(196,195,227,0.95)', fontWeight: 700 }}>{transacoes.length}</span>
                  {' '}transações
                </p>
              )}
            </div>
          </div>

          {/* Alert badge */}
          {hasAlerts && (
            <div style={{ background: 'rgba(241,100,46,0.22)', border: '1px solid rgba(241,100,46,0.35)',
              borderRadius: 10, padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#F1642E', flexShrink: 0 }} />
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: '#F1642E' }}>
                {proximosVenc.length + cartoesAlerta.length} alerta{(proximosVenc.length + cartoesAlerta.length) !== 1 ? 's' : ''}
              </p>
            </div>
          )}
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

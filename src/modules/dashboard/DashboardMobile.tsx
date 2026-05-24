// ─── Dashboard mobile — versão premium enxuta ──────────────────────
// Dois modos:
//   1. EMPTY  → onboarding bonito (sem dados ainda)
//   2. FULL   → 5 cards reais, refinados, Apple Wallet vibe

import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  IconCircleCheck, IconChevronRight, IconCalendarEvent,
  IconArrowUpRight, IconArrowDownRight, IconAlertTriangle, IconWallet,
  IconCreditCard, IconShieldCheck, IconChartArrows, IconPlus,
  IconArrowsExchange, IconBuildingBank, IconTarget, IconSparkles,
  IconTrendingUp, IconTrendingDown,
} from '@tabler/icons-react'
import { fmt, fmtDate } from '@/lib/format'
import { useDashboardData, saudacao } from './lib/useDashboardData'
import { useDisplayName } from '@/db/hooks/useAppConfig'
import { useCategorias } from '@/db/hooks/useCategorias'
import { useUIStore } from '@/store/ui'
import { corStatus, labelStatus } from './lib/calculos'

const PAGE = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
}
const ITEM = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 220, damping: 26 } },
}

const ALERT_ICON: Record<string, typeof IconCalendarEvent> = {
  'conta-fixa': IconCalendarEvent,
  'cartao': IconCreditCard,
  'reserva': IconShieldCheck,
  'saldo': IconWallet,
  'orcamento': IconChartArrows,
}

export function DashboardMobile() {
  const d = useDashboardData()
  const navigate = useNavigate()
  const displayName = useDisplayName()

  // Detecta "primeiro uso" — sem contas, transações ou patrimônio relevante
  const isEmpty = d.saldoContas === 0
    && d.receitas === 0
    && d.despesas === 0
    && d.totalInvestido === 0
    && d.totalDividas === 0
    && d.ultimasTxs.length === 0

  return (
    <motion.div
      variants={PAGE} initial="hidden" animate="show"
      style={{
        width: '100%',
        padding: '14px 14px',
        paddingBottom: 'calc(96px + env(safe-area-inset-bottom))',
        display: 'flex', flexDirection: 'column',
        gap: 14,
      }}
    >
      <Hero d={d} displayName={displayName} isEmpty={isEmpty} />

      {isEmpty
        ? <OnboardingCards />
        : <RegularCards d={d} navigate={navigate} />
      }
    </motion.div>
  )
}

// ─── HERO premium ───────────────────────────────────────────────────

interface HeroProps {
  d: ReturnType<typeof useDashboardData>
  displayName: string
  isEmpty: boolean
}

function Hero({ d, displayName, isEmpty }: HeroProps) {
  const greet = saudacao()
  const status = corStatus(d.status)
  const trend = d.trendSaldo
  const showTrend = isFinite(trend) && Math.abs(trend) > 0.5 && !isEmpty

  return (
    <motion.section variants={ITEM}
      style={{
        position: 'relative',
        padding: '22px 20px 24px',
        borderRadius: 24,
        background: 'linear-gradient(150deg, #2A1E3F 0%, #3E3460 55%, #504E76 100%)',
        overflow: 'hidden',
        boxShadow: '0 18px 42px rgba(42,30,63,0.36), 0 2px 6px rgba(42,30,63,0.18)',
      }}>
      {/* Orbs decorativos sutis (não atrapalham conteúdo) */}
      <div aria-hidden style={{
        position: 'absolute', right: -60, top: -70, width: 220, height: 220,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(242,199,69,0.28), transparent 70%)',
        filter: 'blur(12px)', pointerEvents: 'none',
      }} />
      <div aria-hidden style={{
        position: 'absolute', left: -50, bottom: -80, width: 220, height: 220,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(196,85,59,0.18), transparent 70%)',
        filter: 'blur(20px)', pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative' }}>
        {/* Linha topo: saudação */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 18 }}>
          <span style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 12, fontWeight: 600,
            color: 'rgba(255,255,255,0.78)',
            letterSpacing: '.01em',
          }}>
            {greet.texto}{displayName ? `, ${displayName}` : ''}
          </span>
          <span style={{ fontSize: 14 }}>{greet.emoji}</span>
        </div>

        {/* Patrimônio — Fraunces grande, premium */}
        <p style={{
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          fontSize: 10, fontWeight: 700,
          color: 'rgba(255,255,255,0.5)',
          letterSpacing: '.18em', textTransform: 'uppercase',
          margin: '0 0 6px',
        }}>{isEmpty ? 'Saldo total' : 'Patrimônio líquido'}</p>

        <h1 style={{
          fontFamily: "'Fraunces',Georgia,serif",
          fontSize: 'clamp(36px, 11vw, 48px)',
          fontWeight: 700,
          color: '#FFFFFF',
          letterSpacing: '-1.4px', lineHeight: 1,
          margin: 0,
        }}>
          {fmt(isEmpty ? 0 : d.patrimonioLiquido)}
        </h1>

        {/* Subline */}
        {!isEmpty && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            marginTop: 14, flexWrap: 'wrap',
          }}>
            <span style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 12.5, color: 'rgba(255,255,255,0.72)',
            }}>
              <strong style={{ color: '#FFFFFF', fontWeight: 700 }}>{fmt(d.saldoContas)}</strong>
              <span style={{ opacity: 0.7 }}> em contas</span>
            </span>
            {showTrend && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                padding: '2px 8px', borderRadius: 999,
                background: 'rgba(242,199,69,0.18)',
                border: '1px solid rgba(242,199,69,0.32)',
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontSize: 10.5, fontWeight: 700,
                color: '#FFE9A0',
              }}>
                {trend > 0 ? <IconTrendingUp size={10} stroke={2.4} /> : <IconTrendingDown size={10} stroke={2.4} />}
                {trend > 0 ? '+' : ''}{trend.toFixed(0)}%
              </span>
            )}
          </div>
        )}

        {isEmpty && (
          <p style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 13, color: 'rgba(255,255,255,0.78)',
            margin: '14px 0 0', lineHeight: 1.5,
          }}>
            Vamos começar configurando suas contas e lançando as primeiras
            movimentações.
          </p>
        )}

        {/* Status pill — só se TEM dados */}
        {!isEmpty && (
          <div style={{ marginTop: 18, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <PillStatus
              bg={status.bg}
              text={status.text}
              label={`${labelStatus(d.status)} · ${d.score.total}/100`}
            />
          </div>
        )}
      </div>
    </motion.section>
  )
}

function PillStatus({ bg, text, label }: { bg: string; text: string; label: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 7,
      padding: '6px 12px', borderRadius: 999,
      background: bg, color: text,
      fontFamily: "'Plus Jakarta Sans',sans-serif",
      fontSize: 11.5, fontWeight: 700,
      letterSpacing: '.01em',
      boxShadow: `0 4px 14px ${bg}99`,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: text, boxShadow: `0 0 5px ${text}`,
      }} />
      {label}
    </span>
  )
}

// ─── ONBOARDING CARDS (estado vazio) ────────────────────────────────

function OnboardingCards() {
  const navigate = useNavigate()
  const { openFab } = useUIStore()

  const steps = [
    {
      icon: IconBuildingBank,
      title: 'Cadastrar suas contas',
      sub: 'Carteira, conta corrente, poupança…',
      onClick: () => navigate('/contas'),
      cor: '#3D7EB5',
      bg: 'rgba(61,126,181,0.1)',
    },
    {
      icon: IconArrowsExchange,
      title: 'Lançar primeira transação',
      sub: 'Receita ou despesa pra ver o saldo se movimentar',
      onClick: () => openFab(),
      cor: '#1E7D5A',
      bg: 'rgba(30,125,90,0.1)',
    },
    {
      icon: IconCalendarEvent,
      title: 'Adicionar contas fixas',
      sub: 'Aluguel, internet, assinaturas — automático todo mês',
      onClick: () => navigate('/contas-fixas'),
      cor: '#D4A017',
      bg: 'rgba(212,160,23,0.13)',
    },
    {
      icon: IconTarget,
      title: 'Definir uma meta',
      sub: 'Reserva de emergência, viagem, equipamento…',
      onClick: () => navigate('/metas'),
      cor: '#7C5CBF',
      bg: 'rgba(124,92,191,0.12)',
    },
  ]

  return (
    <>
      <motion.section variants={ITEM}
        style={{
          background: '#FFFFFF',
          border: '1px solid #EDE6DC',
          borderRadius: 20,
          padding: '18px 18px 6px',
          boxShadow: '0 1px 3px rgba(44,26,15,0.04), 0 6px 18px rgba(44,26,15,0.05)',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <IconSparkles size={14} stroke={2.2} color="#D4A017" />
          <p style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 10.5, fontWeight: 700, color: '#A8730F',
            letterSpacing: '.14em', textTransform: 'uppercase',
            margin: 0,
          }}>Próximos passos</p>
        </div>
        <h2 style={{
          fontFamily: "'Fraunces',Georgia,serif",
          fontSize: 22, fontWeight: 700, color: '#2C1A0F',
          letterSpacing: '-0.6px', margin: '2px 0 14px', lineHeight: 1.15,
        }}>Vamos configurar tudo?</h2>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {steps.map((s, i) => {
            const Icon = s.icon
            return (
              <motion.button key={i}
                onClick={s.onClick}
                whileTap={{ scale: 0.99 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '13px 0',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  textAlign: 'left',
                  borderTop: i > 0 ? '1px dashed #F5EEE3' : 'none',
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 11,
                  background: s.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Icon size={18} stroke={2.1} color={s.cor} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: 13.5, fontWeight: 700, color: '#2C1A0F',
                    margin: 0, lineHeight: 1.25,
                  }}>{s.title}</p>
                  <p style={{
                    fontSize: 11.5, color: '#7A5C4F', margin: '2px 0 0', fontWeight: 500,
                  }}>{s.sub}</p>
                </div>
                <IconChevronRight size={16} stroke={2.2} color="#9B7B6A" style={{ flexShrink: 0 }} />
              </motion.button>
            )
          })}
        </div>
      </motion.section>

      {/* CTA principal */}
      <motion.button variants={ITEM}
        onClick={() => openFab()}
        whileTap={{ scale: 0.98 }}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '15px 22px',
          background: 'linear-gradient(135deg, #2A1E3F, #504E76)',
          border: 'none', borderRadius: 14,
          color: '#FFFFFF', cursor: 'pointer',
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          fontSize: 14, fontWeight: 700, letterSpacing: '.01em',
          boxShadow: '0 12px 28px rgba(42,30,63,0.45)',
        }}>
        <IconPlus size={16} stroke={2.5} /> Lançar primeira transação
      </motion.button>
    </>
  )
}

// ─── REGULAR CARDS (com dados) ──────────────────────────────────────

function RegularCards({ d, navigate }: {
  d: ReturnType<typeof useDashboardData>
  navigate: ReturnType<typeof useNavigate>
}) {
  const cats = useCategorias()
  const catMap = new Map(cats.map(c => [c.id, c]))

  // Só mostra card de orçamento se houver receita ou despesa no mês
  const hasOrcamento = d.receitas > 0 || d.despesas > 0
  const orcamentoPct = d.receitas > 0
    ? Math.min(100, (d.totalComprometido / d.receitas) * 100)
    : 0

  return (
    <>
      {/* ─── ORÇAMENTO DO MÊS ─── */}
      {hasOrcamento && (
        <motion.section variants={ITEM}
          onClick={() => navigate('/relatorios')}
          style={CARD}>
          <SectionHeader label="Orçamento do mês" />
          <div style={{
            display: 'flex', alignItems: 'baseline', gap: 8,
            marginTop: 4, flexWrap: 'wrap',
          }}>
            <span style={{
              fontFamily: "'Fraunces',Georgia,serif",
              fontSize: 28, fontWeight: 700,
              color: d.saldoLivre >= 0 ? '#1E7D5A' : '#A8442B',
              letterSpacing: '-0.5px', lineHeight: 1,
            }}>{fmt(Math.abs(d.saldoLivre))}</span>
            <span style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 11.5, color: '#7A5C4F', fontWeight: 600,
            }}>
              {d.saldoLivre >= 0 ? 'livre até dia ' + d.diasNoMes : 'acima do compromisso'}
            </span>
          </div>
          {/* Barra empilhada simples mas elegante */}
          <div style={{
            position: 'relative', height: 10, marginTop: 12,
            background: '#F5EEE3', borderRadius: 999, overflow: 'hidden',
          }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${orcamentoPct}%` }}
              transition={{ duration: 0.9, ease: [0.22, 0.6, 0.36, 1] }}
              style={{
                height: '100%',
                background: d.saldoLivre < 0
                  ? 'linear-gradient(90deg, #E55E3C, #C4553B)'
                  : orcamentoPct > 80
                  ? 'linear-gradient(90deg, #D4A017, #C4553B)'
                  : 'linear-gradient(90deg, #3A8580, #D4A017)',
                borderRadius: 999,
                boxShadow: d.saldoLivre < 0 ? '0 0 10px rgba(196,85,59,0.5)' : 'none',
              }}
            />
          </div>
          <p style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 11, color: '#9B7B6A', margin: '8px 0 0', fontWeight: 500,
          }}>
            {fmt(d.totalComprometido)} de {fmt(d.receitas)} comprometidos
          </p>
        </motion.section>
      )}

      {/* ─── ATENÇÃO IMEDIATA ─── */}
      {d.alertas.length > 0 && (
        <motion.section variants={ITEM} style={CARD_TINT_RED}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <IconAlertTriangle size={14} stroke={2.4} color="#A8442B" />
              <p style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontSize: 11, fontWeight: 700, color: '#A8442B',
                letterSpacing: '.14em', textTransform: 'uppercase',
                margin: 0,
              }}>Atenção</p>
            </div>
            <span style={{
              fontSize: 11, fontWeight: 700,
              padding: '2px 8px', borderRadius: 999,
              background: 'rgba(196,85,59,0.12)', color: '#A8442B',
              fontFamily: "'Plus Jakarta Sans',sans-serif",
            }}>{d.alertas.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {d.alertas.slice(0, 3).map((a, i) => {
              const Icon = ALERT_ICON[a.iconKey] ?? IconCalendarEvent
              const corBg = a.severity === 'critical'
                ? 'rgba(229,94,60,0.14)' : a.severity === 'warning'
                ? 'rgba(212,160,23,0.18)' : 'rgba(80,78,118,0.12)'
              const corFg = a.severity === 'critical'
                ? '#A8442B' : a.severity === 'warning'
                ? '#A8730F' : '#3D3B5F'
              return (
                <button key={a.id}
                  onClick={() => a.href && navigate(a.href)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 0',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    textAlign: 'left',
                    borderTop: i > 0 ? '1px dashed rgba(196,85,59,0.18)' : 'none',
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                  }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 10, background: corBg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Icon size={15} stroke={2.2} color={corFg} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: 13, fontWeight: 700, color: '#2C1A0F',
                      margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{a.title}</p>
                    {a.subtitle && (
                      <p style={{
                        fontSize: 11, color: '#7A5C4F', margin: '1px 0 0', fontWeight: 500,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{a.subtitle}</p>
                    )}
                  </div>
                  {a.meta && (
                    <span style={{
                      fontSize: 11, fontWeight: 700, color: corFg, flexShrink: 0,
                      padding: '3px 8px', borderRadius: 999,
                      background: corBg,
                    }}>{a.meta}</span>
                  )}
                </button>
              )
            })}
          </div>
        </motion.section>
      )}

      {/* ─── PRÓXIMOS COMPROMISSOS (só se houver) ─── */}
      {d.proximos7Dias.length > 0 && (
        <motion.section variants={ITEM}
          onClick={() => navigate('/contas-fixas')}
          style={CARD}>
          <SectionHeader label="Próximos 7 dias" chevron />
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 10 }}>
            {d.proximos7Dias.slice(0, 3).map((ev, i) => {
              const label = ev.diasFalta === 0 ? 'HOJE' : ev.diasFalta === 1 ? 'AMANHÃ' : `${ev.diasFalta}D`
              const isToday = ev.diasFalta === 0
              const isTomorrow = ev.diasFalta === 1
              return (
                <div key={ev.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 0',
                  borderTop: i > 0 ? '1px dashed #F5EEE3' : 'none',
                }}>
                  <div style={{
                    minWidth: 50, padding: '6px 4px',
                    background: isToday ? 'rgba(196,85,59,0.1)' : isTomorrow ? 'rgba(212,160,23,0.1)' : '#FBF8F3',
                    color: isToday ? '#A8442B' : isTomorrow ? '#A8730F' : '#7A5C4F',
                    borderRadius: 8, textAlign: 'center',
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                    fontSize: 9.5, fontWeight: 800, letterSpacing: '.08em',
                  }}>{label}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                      fontSize: 13, fontWeight: 600, color: '#2C1A0F',
                      margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{ev.titulo}</p>
                    {ev.subtitulo && (
                      <p style={{
                        fontFamily: "'Plus Jakarta Sans',sans-serif",
                        fontSize: 10.5, color: '#9B7B6A', margin: 0, fontWeight: 500,
                      }}>{ev.subtitulo}</p>
                    )}
                  </div>
                  {ev.valor > 0 && (
                    <span style={{
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                      fontSize: 13, fontWeight: 700, color: ev.cor,
                      letterSpacing: '-0.2px', whiteSpace: 'nowrap',
                    }}>{fmt(ev.valor)}</span>
                  )}
                </div>
              )
            })}
          </div>
        </motion.section>
      )}

      {/* ─── ÚLTIMAS TRANSAÇÕES (só se houver) ─── */}
      {d.ultimasTxs.length > 0 && (
        <motion.section variants={ITEM}
          onClick={() => navigate('/transacoes')}
          style={CARD}>
          <SectionHeader label="Últimas transações" chevron />
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 8 }}>
            {d.ultimasTxs.slice(0, 4).map((tx, i) => {
              const cat = catMap.get(tx.categoriaId)
              const isRec = tx.tipo === 'receita'
              return (
                <div key={tx.id ?? i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 0',
                  borderTop: i > 0 ? '1px dashed #F5EEE3' : 'none',
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 10,
                    background: cat ? `${cat.cor}22` : '#FBF8F3',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {isRec
                      ? <IconArrowUpRight size={14} stroke={2.4} color={cat?.cor ?? '#1E7D5A'} />
                      : <IconArrowDownRight size={14} stroke={2.4} color={cat?.cor ?? '#A8442B'} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: 13, fontWeight: 600, color: '#2C1A0F',
                      margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{tx.descricao || cat?.nome || 'Transação'}</p>
                    <p style={{ fontSize: 11, color: '#9B7B6A', margin: 0, fontWeight: 500 }}>
                      {fmtDate(tx.data)}{cat && ` · ${cat.nome}`}
                    </p>
                  </div>
                  <span style={{
                    fontSize: 13.5, fontWeight: 700,
                    color: isRec ? '#1E7D5A' : '#A8442B',
                    letterSpacing: '-0.2px', whiteSpace: 'nowrap',
                  }}>
                    {isRec ? '+' : '−'}{fmt(tx.valor).replace('-', '').replace('+', '')}
                  </span>
                </div>
              )
            })}
          </div>
        </motion.section>
      )}

      {/* ─── Estado intermediário: tem dados básicos mas só alguns ─── */}
      {!hasOrcamento && d.alertas.length === 0
        && d.proximos7Dias.length === 0 && d.ultimasTxs.length === 0 && (
        <motion.section variants={ITEM}
          style={{ ...CARD, padding: '24px 18px', textAlign: 'center' }}>
          <IconCircleCheck size={32} stroke={1.8} color="#1E7D5A" style={{ marginBottom: 10 }} />
          <p style={{
            fontFamily: "'Fraunces',Georgia,serif",
            fontSize: 18, fontWeight: 700, color: '#2C1A0F',
            margin: '0 0 4px', letterSpacing: '-0.4px',
          }}>Tudo tranquilo</p>
          <p style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 12.5, color: '#7A5C4F', margin: 0, fontWeight: 500,
          }}>Nenhuma pendência. Que tal lançar a primeira movimentação?</p>
        </motion.section>
      )}

      {/* CTA leve "ver análise completa" */}
      {(d.totalInvestido > 0 || d.totalDividas > 0 || d.ultimasTxs.length > 3) && (
        <motion.button variants={ITEM}
          onClick={() => navigate('/relatorios')}
          whileTap={{ scale: 0.99 }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '12px 16px',
            background: 'rgba(80,78,118,0.07)',
            border: '1px solid rgba(80,78,118,0.18)',
            borderRadius: 13,
            cursor: 'pointer',
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 12, fontWeight: 700, color: '#3D3B5F',
            letterSpacing: '.01em',
          }}>
          Análise detalhada no desktop →
        </motion.button>
      )}
    </>
  )
}

// ─── Sub-componentes & tokens ───────────────────────────────────────

function SectionHeader({ label, chevron }: { label: string; chevron?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <p style={{
        fontFamily: "'Plus Jakarta Sans',sans-serif",
        fontSize: 10.5, fontWeight: 700, color: '#9B7B6A',
        letterSpacing: '.14em', textTransform: 'uppercase',
        margin: 0,
      }}>{label}</p>
      {chevron && <IconChevronRight size={14} stroke={2.2} color="#C5B8A8" />}
    </div>
  )
}

const CARD: React.CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid #EDE6DC',
  borderRadius: 20,
  padding: '16px 18px',
  boxShadow:
    '0 1px 2px rgba(44,26,15,0.04), 0 6px 18px rgba(44,26,15,0.05)',
  cursor: 'pointer',
}

const CARD_TINT_RED: React.CSSProperties = {
  ...CARD,
  background: 'linear-gradient(135deg, #FFFFFF 0%, rgba(255,243,239,0.6) 100%)',
  border: '1px solid rgba(196,85,59,0.18)',
  cursor: 'default',
}

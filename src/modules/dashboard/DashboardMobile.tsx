// ─── Dashboard mobile — redesign premium (peach gradient + glass) ───
// Inspiração: Apple Wallet / Robinhood / Monzo. Identidade FY (roxo+laranja)
// sobre gradient peach/creme. Lista de transações em rows soltos (sem
// cards individuais que viram ruído). Hero gigante. Card destaque de
// próximo vencimento com ações inline.

import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useMemo } from 'react'
import {
  IconBell, IconCalendarEvent,
  IconArrowUpRight, IconArrowDownRight, IconChevronRight,
  IconBuildingBank, IconArrowsExchange, IconTarget, IconSparkles,
  IconCircleCheck, IconTrendingUp, IconTrendingDown,
  IconCreditCard,
} from '@tabler/icons-react'
import { fmt, fmtDate } from '@/lib/format'
import { useDashboardData, saudacao } from './lib/useDashboardData'
import { useDisplayName } from '@/db/hooks/useAppConfig'
import { useCategorias } from '@/db/hooks/useCategorias'
import { useContas } from '@/db/hooks/useContas'
import { useUIStore } from '@/store/ui'

// ─── Animation system ──────────────────────────────────────────────
const PAGE = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
}
const ITEM = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 200, damping: 24 } },
}

// ─── Design tokens MOBILE ──────────────────────────────────────────
const C = {
  // Gradient background (peach → creme)
  bgTop:    '#FFE2C7',
  bgMid:    '#FFF1DE',
  bgBottom: '#FBF8F3',

  // Texto
  ink:      '#2C1A0F',
  inkSoft:  '#5C4339',
  muted:    '#9B7B6A',

  // Acentos
  purple:    '#2A1E3F',
  purpleMid: '#504E76',
  orange:    '#C4553B',
  orangeBri: '#F1642E',
  orangeSoft:'#FFE7D6',
  gold:      '#D4A017',
  goldLight: '#F2C745',
  green:     '#1E7D5A',
  greenBri:  '#3A8580',

  // Glass / cards
  glass:        'rgba(255,255,255,0.65)',
  glassBorder:  'rgba(255,255,255,0.7)',
  glassShadow:  '0 1px 2px rgba(196,85,59,0.06), 0 8px 28px rgba(196,85,59,0.08)',
}

// ─── Component ─────────────────────────────────────────────────────

export function DashboardMobile() {
  const d = useDashboardData()
  const navigate = useNavigate()
  const displayName = useDisplayName()
  const greet = saudacao()
  const { openFab } = useUIStore()

  // "Tem dados?" → decide entre Onboarding e Layout normal
  const isEmpty = d.saldoContas === 0
    && d.receitas === 0 && d.despesas === 0
    && d.totalInvestido === 0 && d.totalDividas === 0
    && d.ultimasTxs.length === 0

  return (
    <div style={{
      position: 'relative',
      minHeight: '100dvh',
      width: '100%',
      // Gradient cobrindo viewport inteira (do peach pro creme)
      background: `linear-gradient(180deg, ${C.bgTop} 0%, ${C.bgMid} 30%, ${C.bgBottom} 68%, ${C.bgBottom} 100%)`,
    }}>
      {/* Halo decorativo no canto superior direito */}
      <div aria-hidden style={{
        position: 'absolute', right: -80, top: -120,
        width: 340, height: 340, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(241,100,46,0.18), transparent 65%)',
        filter: 'blur(20px)', pointerEvents: 'none',
      }} />

      <motion.div
        variants={PAGE} initial="hidden" animate="show"
        style={{
          position: 'relative',
          padding: '16px 18px',
          paddingTop: 'calc(20px + env(safe-area-inset-top))',
          paddingBottom: 'calc(100px + env(safe-area-inset-bottom))',
          display: 'flex', flexDirection: 'column',
          gap: 18,
        }}
      >
        {/* HEADER — saudação + bell */}
        <motion.header variants={ITEM}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 12,
          }}>
          <div style={{ minWidth: 0 }}>
            <p style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 13, fontWeight: 600,
              color: C.inkSoft,
              margin: 0,
              letterSpacing: '.01em',
            }}>
              {greet.texto}{displayName ? `, ` : ''}
              <span style={{ color: C.ink, fontWeight: 700 }}>{displayName}</span>
              <span style={{ marginLeft: 6 }}>{greet.emoji}</span>
            </p>
            <p style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 11, color: C.muted, margin: '2px 0 0', fontWeight: 500,
            }}>
              {isEmpty ? 'Vamos configurar tudo?' : new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
            </p>
          </div>

          <button
            onClick={() => navigate('/configuracoes')}
            aria-label="Notificações"
            style={{
              position: 'relative',
              width: 44, height: 44, borderRadius: 14,
              background: 'rgba(255,255,255,0.7)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.8)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 14px rgba(196,85,59,0.1)',
            }}>
            <IconBell size={19} stroke={1.8} color={C.ink} />
            {d.alertas.length > 0 && (
              <span style={{
                position: 'absolute', top: 6, right: 6,
                minWidth: 16, height: 16, padding: '0 4px',
                borderRadius: 999,
                background: C.orange, color: '#FFFFFF',
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontSize: 9.5, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1.5px solid #FFE2C7',
              }}>{d.alertas.length}</span>
            )}
          </button>
        </motion.header>

        {/* HERO patrimônio gigante */}
        <motion.section variants={ITEM} style={{ paddingTop: 8 }}>
          <p style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 11, fontWeight: 700, color: C.inkSoft,
            letterSpacing: '.18em', textTransform: 'uppercase',
            margin: '0 0 6px',
          }}>{isEmpty ? 'Saldo total' : 'Patrimônio líquido'}</p>

          <h1 style={{
            fontFamily: "'Fraunces',Georgia,serif",
            fontSize: 'clamp(48px, 14vw, 64px)',
            fontWeight: 700,
            color: C.ink,
            letterSpacing: '-2px', lineHeight: 0.95,
            margin: 0,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {fmt(isEmpty ? 0 : d.patrimonioLiquido)}
          </h1>

          {!isEmpty && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              marginTop: 12,
            }}>
              <span style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontSize: 13, color: C.inkSoft, fontWeight: 600,
              }}>{fmt(d.saldoContas)} em contas</span>
              {isFinite(d.trendSaldo) && Math.abs(d.trendSaldo) >= 0.5 && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                  padding: '3px 9px', borderRadius: 999,
                  background: d.trendSaldo > 0 ? 'rgba(30,125,90,0.12)' : 'rgba(196,85,59,0.12)',
                  color: d.trendSaldo > 0 ? C.green : C.orange,
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontSize: 11, fontWeight: 700,
                }}>
                  {d.trendSaldo > 0 ? <IconTrendingUp size={11} stroke={2.4} /> : <IconTrendingDown size={11} stroke={2.4} />}
                  {d.trendSaldo > 0 ? '+' : ''}{d.trendSaldo.toFixed(0)}%
                </span>
              )}
            </div>
          )}
        </motion.section>

        {/* CONTEÚDO: empty OU regular */}
        {isEmpty
          ? <OnboardingGrid />
          : <RegularContent d={d} navigate={navigate} />
        }
      </motion.div>
    </div>
  )
}

// ─── ONBOARDING (estado vazio) ──────────────────────────────────────

function OnboardingGrid() {
  const navigate = useNavigate()
  const { openFab } = useUIStore()

  const steps = [
    { Icon: IconBuildingBank,   title: 'Adicionar conta',   sub: 'Carteira, banco',           cor: '#3D7EB5', bg: 'rgba(61,126,181,0.13)',  onClick: () => navigate('/contas') },
    { Icon: IconArrowsExchange, title: 'Lançar transação',  sub: 'Primeiro registro',         cor: C.orange,   bg: 'rgba(196,85,59,0.13)',   onClick: () => openFab() },
    { Icon: IconCalendarEvent,  title: 'Contas fixas',      sub: 'Aluguel, assinaturas',      cor: C.gold,     bg: 'rgba(212,160,23,0.16)',  onClick: () => navigate('/contas-fixas') },
    { Icon: IconTarget,         title: 'Definir meta',      sub: 'Reserva, viagem',           cor: '#7C5CBF',  bg: 'rgba(124,92,191,0.13)',  onClick: () => navigate('/metas') },
  ]

  return (
    <>
      <motion.section variants={ITEM}>
        <SectionHeader>
          <IconSparkles size={13} stroke={2.4} color={C.gold} style={{ marginRight: 5, verticalAlign: '-2px' }} />
          Próximos passos
        </SectionHeader>

        <div style={{
          marginTop: 10,
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
        }}>
          {steps.map((s, i) => (
            <motion.button key={i}
              onClick={s.onClick}
              whileTap={{ scale: 0.97 }}
              style={{
                background: C.glass,
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: `1px solid ${C.glassBorder}`,
                borderRadius: 18,
                padding: '16px 14px',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex', flexDirection: 'column', gap: 10,
                minHeight: 110,
                boxShadow: C.glassShadow,
              }}>
              <div style={{
                width: 38, height: 38, borderRadius: 12,
                background: s.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <s.Icon size={19} stroke={2.1} color={s.cor} />
              </div>
              <div>
                <p style={{
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontSize: 13.5, fontWeight: 700, color: C.ink, margin: 0, lineHeight: 1.2,
                }}>{s.title}</p>
                <p style={{
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontSize: 11, color: C.muted, margin: '2px 0 0', fontWeight: 500,
                }}>{s.sub}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.section>
    </>
  )
}

// ─── REGULAR CONTENT (com dados) ────────────────────────────────────

function RegularContent({ d, navigate }: {
  d: ReturnType<typeof useDashboardData>
  navigate: ReturnType<typeof useNavigate>
}) {
  const cats = useCategorias()
  const contas = useContas()
  const catMap = useMemo(() => new Map(cats.map(c => [c.id, c])), [cats])

  // Próximo vencimento (top 1)
  const proximoVenc = d.proximos7Dias[0]

  return (
    <>
      {/* ─── CARD DESTAQUE: próximo vencimento ─── */}
      {proximoVenc && (
        <motion.section variants={ITEM}
          style={{
            background: `linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(255,231,214,0.65) 100%)`,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(196,85,59,0.22)',
            borderRadius: 20,
            padding: '16px 18px',
            boxShadow: '0 1px 2px rgba(196,85,59,0.08), 0 12px 32px rgba(196,85,59,0.12)',
          }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 14 }}>⏰</span>
            <p style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 10.5, fontWeight: 700,
              color: C.orange, letterSpacing: '.14em', textTransform: 'uppercase',
              margin: 0,
            }}>Próximo vencimento</p>
          </div>
          <h3 style={{
            fontFamily: "'Fraunces',Georgia,serif",
            fontSize: 20, fontWeight: 700, color: C.ink,
            letterSpacing: '-0.5px', margin: '2px 0 4px',
          }}>{proximoVenc.titulo}</h3>
          <p style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 12, color: C.inkSoft, margin: '0 0 14px', fontWeight: 500,
          }}>
            {proximoVenc.diasFalta === 0 ? 'Vence hoje' : proximoVenc.diasFalta === 1 ? 'Vence amanhã' : `Vence em ${proximoVenc.diasFalta} dias`}
            {proximoVenc.valor > 0 && (
              <> · <strong style={{ color: C.ink, fontWeight: 800, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{fmt(proximoVenc.valor)}</strong></>
            )}
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => navigate('/contas-fixas')}
              style={{
                flex: 1, padding: '10px 14px',
                background: C.orange, color: '#FFFFFF', border: 'none',
                borderRadius: 11, cursor: 'pointer',
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontSize: 12.5, fontWeight: 700,
                boxShadow: '0 6px 16px rgba(196,85,59,0.36)',
              }}>
              Pagar agora
            </button>
            <button
              onClick={() => navigate('/contas-fixas')}
              style={{
                padding: '10px 16px',
                background: 'rgba(255,255,255,0.7)', color: C.inkSoft,
                border: '1px solid rgba(196,85,59,0.2)', borderRadius: 11, cursor: 'pointer',
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontSize: 12.5, fontWeight: 700,
              }}>
              Adiar
            </button>
          </div>
        </motion.section>
      )}

      {/* ─── SUAS CONTAS (rows soltos) ─── */}
      {contas.length > 0 && (
        <motion.section variants={ITEM}>
          <SectionHeader withChevron onChevron={() => navigate('/contas')}>
            Suas contas
          </SectionHeader>
          <div style={{
            marginTop: 8,
            background: C.glass,
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: `1px solid ${C.glassBorder}`,
            borderRadius: 18,
            padding: '4px 14px',
            boxShadow: C.glassShadow,
          }}>
            {contas.slice(0, 3).map((c, i) => (
              <button key={c.id}
                onClick={() => navigate('/contas')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 0',
                  width: '100%',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  textAlign: 'left',
                  borderTop: i > 0 ? '1px dashed rgba(44,26,15,0.08)' : 'none',
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 11,
                  background: `${c.cor}1f`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <IconBuildingBank size={17} stroke={2} color={c.cor} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: 13, fontWeight: 600, color: C.ink, margin: 0,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{c.nome}</p>
                  <p style={{
                    fontSize: 10.5, color: C.muted, margin: 0, fontWeight: 500,
                    textTransform: 'capitalize',
                  }}>{c.tipo}</p>
                </div>
                <span style={{
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontSize: 14, fontWeight: 700, color: C.ink,
                  letterSpacing: '-0.2px', whiteSpace: 'nowrap',
                }}>{fmt(c.saldoAtual)}</span>
              </button>
            ))}
          </div>
        </motion.section>
      )}

      {/* ─── MOVIMENTAÇÕES (rows soltos) ─── */}
      {d.ultimasTxs.length > 0 && (
        <motion.section variants={ITEM}>
          <SectionHeader withChevron onChevron={() => navigate('/transacoes')}>
            Movimentações
          </SectionHeader>
          <div style={{
            marginTop: 8,
            background: C.glass,
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: `1px solid ${C.glassBorder}`,
            borderRadius: 18,
            padding: '4px 14px',
            boxShadow: C.glassShadow,
          }}>
            {d.ultimasTxs.slice(0, 5).map((tx, i) => {
              const cat = catMap.get(tx.categoriaId)
              const isRec = tx.tipo === 'receita'
              return (
                <div key={tx.id ?? i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 0',
                  borderTop: i > 0 ? '1px dashed rgba(44,26,15,0.08)' : 'none',
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 11,
                    background: cat ? `${cat.cor}1f` : 'rgba(155,123,106,0.13)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {isRec
                      ? <IconArrowUpRight size={17} stroke={2.4} color={cat?.cor ?? C.green} />
                      : <IconArrowDownRight size={17} stroke={2.4} color={cat?.cor ?? C.orange} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: 13, fontWeight: 600, color: C.ink, margin: 0,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{tx.descricao || cat?.nome || 'Transação'}</p>
                    <p style={{
                      fontSize: 10.5, color: C.muted, margin: 0, fontWeight: 500,
                    }}>{fmtDate(tx.data)}{cat && ` · ${cat.nome}`}</p>
                  </div>
                  <span style={{
                    fontSize: 14, fontWeight: 700,
                    color: isRec ? C.green : C.orange,
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

      {/* ─── CARTÕES (se houver — mini grid) ─── */}
      {d.totalDividas > 0 && (
        <motion.button variants={ITEM}
          onClick={() => navigate('/dividas')}
          whileTap={{ scale: 0.99 }}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 16px',
            background: C.glass,
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: `1px solid ${C.glassBorder}`,
            borderRadius: 18,
            cursor: 'pointer',
            textAlign: 'left',
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            boxShadow: C.glassShadow,
          }}>
          <div style={{
            width: 36, height: 36, borderRadius: 11,
            background: 'rgba(168,68,43,0.13)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <IconCreditCard size={17} stroke={2} color={C.orange} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: C.ink, margin: 0 }}>Dívidas em aberto</p>
            <p style={{ fontSize: 14, fontWeight: 800, color: C.orange, margin: '2px 0 0', letterSpacing: '-0.2px' }}>{fmt(d.totalDividas)}</p>
          </div>
          <IconChevronRight size={16} stroke={2.2} color={C.muted} />
        </motion.button>
      )}

      {/* ─── INTERMEDIATE: tem patrimônio mas zero pendências ─── */}
      {!proximoVenc && contas.length === 0 && d.ultimasTxs.length === 0 && d.totalDividas === 0 && (
        <motion.section variants={ITEM}
          style={{
            background: C.glass,
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: `1px solid ${C.glassBorder}`,
            borderRadius: 18,
            padding: '20px 18px',
            textAlign: 'center',
            boxShadow: C.glassShadow,
          }}>
          <IconCircleCheck size={28} stroke={1.8} color={C.green} style={{ marginBottom: 8 }} />
          <p style={{
            fontFamily: "'Fraunces',Georgia,serif",
            fontSize: 17, fontWeight: 700, color: C.ink, margin: 0,
            letterSpacing: '-0.4px',
          }}>Tudo tranquilo por aqui</p>
        </motion.section>
      )}

    </>
  )
}

// ─── SECTION HEADER ────────────────────────────────────────────────

function SectionHeader({ children, withChevron, onChevron }: {
  children: React.ReactNode; withChevron?: boolean; onChevron?: () => void
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 4px',
    }}>
      <h2 style={{
        fontFamily: "'Plus Jakarta Sans',sans-serif",
        fontSize: 11, fontWeight: 700, color: C.inkSoft,
        letterSpacing: '.16em', textTransform: 'uppercase',
        margin: 0,
      }}>{children}</h2>
      {withChevron && (
        <button
          onClick={onChevron}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            background: 'transparent', border: 'none', cursor: 'pointer',
            padding: '4px 6px',
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 11.5, fontWeight: 700, color: C.purple,
          }}>
          Ver tudo <IconChevronRight size={12} stroke={2.4} />
        </button>
      )}
    </div>
  )
}

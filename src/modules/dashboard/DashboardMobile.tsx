// ─── Dashboard mobile — versão enxuta ───────────────────────────────
// 5 cards verticais. Sem charts complexos, sem KPIs decorativos, sem
// orbs. Cada card só com o essencial. Pra explorar a fundo → desktop.

import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  IconBellRinging, IconCircleCheck, IconChevronRight, IconCalendarEvent,
  IconArrowUpRight, IconArrowDownRight, IconAlertTriangle, IconWallet,
  IconCreditCard, IconShieldCheck, IconChartArrows,
} from '@tabler/icons-react'
import { fmt, fmtDate } from '@/lib/format'
import { useDashboardData, saudacao } from './lib/useDashboardData'
import { useDisplayName } from '@/db/hooks/useAppConfig'
import { useCategorias } from '@/db/hooks/useCategorias'
import { corStatus, labelStatus } from './lib/calculos'

const STAGGER = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
}
const ITEM = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 240, damping: 26 } },
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
  const greet = saudacao()
  const status = corStatus(d.status)
  const cats = useCategorias()
  const catMap = new Map(cats.map(c => [c.id, c]))

  return (
    <motion.div
      variants={STAGGER} initial="hidden" animate="show"
      style={{
        width: '100%',
        padding: '12px 14px',
        paddingBottom: 100,                 // clearance pra bottomnav + FAB
        display: 'flex', flexDirection: 'column',
        gap: 12,
      }}
    >
      {/* ─── 1. HERO COMPACTO ─── */}
      <motion.section variants={ITEM}
        style={{
          position: 'relative',
          padding: '20px 18px',
          borderRadius: 22,
          background: 'linear-gradient(135deg, #2A1E3F 0%, #504E76 100%)',
          overflow: 'hidden',
          boxShadow: '0 14px 36px rgba(42,30,63,0.32)',
        }}>
        <div aria-hidden style={{
          position: 'absolute', right: -40, top: -50, width: 200, height: 200,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(242,199,69,0.3), transparent 70%)',
          filter: 'blur(8px)', pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8,
          }}>
            <span style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 11.5, fontWeight: 600,
              color: 'rgba(255,255,255,0.78)',
            }}>
              {greet.texto}{displayName ? `, ${displayName}` : ''}
            </span>
            <span style={{ fontSize: 13 }}>{greet.emoji}</span>
          </div>
          <p style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 10, fontWeight: 700,
            color: 'rgba(255,255,255,0.55)',
            letterSpacing: '.16em', textTransform: 'uppercase',
            margin: '0 0 4px',
          }}>Patrimônio líquido</p>
          <p style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 32, fontWeight: 700,
            color: '#FFFFFF', letterSpacing: '-0.8px', lineHeight: 1,
            margin: 0,
          }}>{fmt(d.patrimonioLiquido)}</p>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            marginTop: 10, flexWrap: 'wrap',
          }}>
            <span style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 12, color: 'rgba(255,255,255,0.7)',
            }}>
              <strong style={{ color: '#FFFFFF', fontWeight: 700 }}>{fmt(d.saldoContas)}</strong> em contas
            </span>
            <span
              onClick={() => navigate('/relatorios')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '4px 10px',
                background: status.bg, color: status.text, borderRadius: 999,
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontSize: 11, fontWeight: 700,
                cursor: 'pointer',
              }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: status.text, boxShadow: `0 0 5px ${status.text}`,
              }} />
              {labelStatus(d.status)} · {d.score.total}
            </span>
          </div>
        </div>
      </motion.section>

      {/* ─── 2. ORÇAMENTO DO MÊS (só o número + barra) ─── */}
      <motion.section variants={ITEM}
        onClick={() => navigate('/relatorios')}
        style={{
          background: '#FFFFFF', border: '1px solid #EDE6DC', borderRadius: 18,
          padding: '16px 16px',
          boxShadow: '0 1px 3px rgba(44,26,15,0.04), 0 4px 14px rgba(44,26,15,0.05)',
          cursor: 'pointer',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <p style={LABEL}>Orçamento do mês</p>
          <IconChevronRight size={14} stroke={2.2} color="#9B7B6A" />
        </div>
        <p style={{
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          fontSize: 26, fontWeight: 700,
          color: d.saldoLivre >= 0 ? '#1E7D5A' : '#A8442B',
          letterSpacing: '-0.5px', lineHeight: 1, margin: 0,
        }}>{fmt(Math.abs(d.saldoLivre))}</p>
        <p style={{
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          fontSize: 11.5, color: '#7A5C4F', margin: '4px 0 12px', fontWeight: 500,
        }}>
          {d.saldoLivre >= 0
            ? <>livre pra gastar até dia {d.diasNoMes}</>
            : <>acima do compromisso do mês</>}
        </p>
        {/* Barra simples — 1 cor só */}
        <div style={{ position: 'relative', height: 8, background: '#F5EEE3', borderRadius: 999, overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, d.receitas > 0 ? (d.totalComprometido / d.receitas) * 100 : 0)}%` }}
            transition={{ duration: 0.8, ease: [0.22, 0.6, 0.36, 1] }}
            style={{
              height: '100%',
              background: d.saldoLivre < 0
                ? 'linear-gradient(90deg, #E55E3C, #C4553B)'
                : 'linear-gradient(90deg, #C4553B, #D4A017)',
              borderRadius: 999,
            }}
          />
        </div>
      </motion.section>

      {/* ─── 3. ALERTAS (só se houver) ─── */}
      {d.alertas.length > 0 && (
        <motion.section variants={ITEM}
          style={{
            background: '#FFFFFF', border: '1px solid #EDE6DC', borderRadius: 18,
            padding: '14px 16px 12px',
            boxShadow: '0 1px 3px rgba(44,26,15,0.04), 0 4px 14px rgba(44,26,15,0.05)',
          }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <p style={LABEL}>
              <IconAlertTriangle size={11} stroke={2.4} color="#A8442B" style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />
              Atenção
            </p>
            <span style={{
              fontSize: 10.5, fontWeight: 700,
              padding: '2px 7px', borderRadius: 999,
              background: 'rgba(229,94,60,0.1)', color: '#A8442B',
              fontFamily: "'Plus Jakarta Sans',sans-serif",
            }}>{d.alertas.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {d.alertas.slice(0, 3).map((a, i) => {
              const Icon = ALERT_ICON[a.iconKey] ?? IconCalendarEvent
              const corBg = a.severity === 'critical'
                ? 'rgba(229,94,60,0.13)' : a.severity === 'warning'
                ? 'rgba(212,160,23,0.18)' : 'rgba(80,78,118,0.12)'
              const corFg = a.severity === 'critical'
                ? '#A8442B' : a.severity === 'warning'
                ? '#A8730F' : '#3D3B5F'
              return (
                <button key={a.id}
                  onClick={() => a.href && navigate(a.href)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 0',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    textAlign: 'left',
                    borderTop: i > 0 ? '1px dashed #F5EEE3' : 'none',
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                  }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 9, background: corBg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Icon size={15} stroke={2.2} color={corFg} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: 12.5, fontWeight: 700, color: '#2C1A0F',
                      margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{a.title}</p>
                    {(a.subtitle || a.meta) && (
                      <p style={{
                        fontSize: 10.5, color: '#7A5C4F', margin: '1px 0 0', fontWeight: 500,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{a.subtitle ?? a.meta}</p>
                    )}
                  </div>
                  {a.meta && a.subtitle && (
                    <span style={{
                      fontSize: 10.5, fontWeight: 700, color: corFg, flexShrink: 0,
                    }}>{a.meta}</span>
                  )}
                </button>
              )
            })}
          </div>
        </motion.section>
      )}

      {/* ─── 4. PRÓXIMOS (3 itens) ─── */}
      <motion.section variants={ITEM}
        onClick={() => navigate('/contas-fixas')}
        style={{
          background: '#FFFFFF', border: '1px solid #EDE6DC', borderRadius: 18,
          padding: '14px 16px 12px',
          boxShadow: '0 1px 3px rgba(44,26,15,0.04), 0 4px 14px rgba(44,26,15,0.05)',
          cursor: 'pointer',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <p style={LABEL}>Próximos compromissos</p>
          <IconChevronRight size={14} stroke={2.2} color="#9B7B6A" />
        </div>
        {d.proximos7Dias.length === 0 ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 0',
            color: '#1E5944',
          }}>
            <IconCircleCheck size={16} stroke={2.2} color="#1E7D5A" />
            <span style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12.5, fontWeight: 600,
            }}>Nada nos próximos 7 dias</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {d.proximos7Dias.slice(0, 3).map((ev, i) => {
              const label = ev.diasFalta === 0 ? 'Hoje' : ev.diasFalta === 1 ? 'Amanhã' : `${ev.diasFalta}d`
              return (
                <div key={ev.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 0',
                  borderTop: i > 0 ? '1px dashed #F5EEE3' : 'none',
                }}>
                  <div style={{
                    minWidth: 36, padding: '3px 6px', borderRadius: 7,
                    background: ev.diasFalta === 0 ? 'rgba(196,85,59,0.1)' : ev.diasFalta === 1 ? 'rgba(212,160,23,0.1)' : '#FBF8F3',
                    color: ev.diasFalta === 0 ? '#A8442B' : ev.diasFalta === 1 ? '#A8730F' : '#7A5C4F',
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                    fontSize: 10, fontWeight: 700, letterSpacing: '.05em',
                    textAlign: 'center',
                  }}>{label}</div>
                  <p style={{
                    flex: 1, minWidth: 0,
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                    fontSize: 12.5, fontWeight: 600, color: '#2C1A0F',
                    margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{ev.titulo}</p>
                  {ev.valor > 0 && (
                    <span style={{
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                      fontSize: 12.5, fontWeight: 700, color: ev.cor,
                      whiteSpace: 'nowrap',
                    }}>{fmt(ev.valor)}</span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </motion.section>

      {/* ─── 5. ÚLTIMAS (3-4 transações) ─── */}
      <motion.section variants={ITEM}
        onClick={() => navigate('/transacoes')}
        style={{
          background: '#FFFFFF', border: '1px solid #EDE6DC', borderRadius: 18,
          padding: '14px 16px 12px',
          boxShadow: '0 1px 3px rgba(44,26,15,0.04), 0 4px 14px rgba(44,26,15,0.05)',
          cursor: 'pointer',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <p style={LABEL}>Últimas transações</p>
          <IconChevronRight size={14} stroke={2.2} color="#9B7B6A" />
        </div>
        {d.ultimasTxs.length === 0 ? (
          <p style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 12, color: '#9B7B6A', margin: '8px 0 4px', fontWeight: 500, textAlign: 'center',
          }}>Nenhuma transação ainda</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {d.ultimasTxs.slice(0, 4).map((tx, i) => {
              const cat = catMap.get(tx.categoriaId)
              const isRec = tx.tipo === 'receita'
              return (
                <div key={tx.id ?? i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 0',
                  borderTop: i > 0 ? '1px dashed #F5EEE3' : 'none',
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: cat ? `${cat.cor}22` : '#FBF8F3',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {isRec
                      ? <IconArrowUpRight size={13} stroke={2.4} color={cat?.cor ?? '#1E7D5A'} />
                      : <IconArrowDownRight size={13} stroke={2.4} color={cat?.cor ?? '#A8442B'} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: 12.5, fontWeight: 600, color: '#2C1A0F',
                      margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{tx.descricao || cat?.nome || 'Transação'}</p>
                    <p style={{ fontSize: 10.5, color: '#9B7B6A', margin: 0, fontWeight: 500 }}>
                      {fmtDate(tx.data)}
                    </p>
                  </div>
                  <span style={{
                    fontSize: 13, fontWeight: 700,
                    color: isRec ? '#1E7D5A' : '#A8442B',
                    letterSpacing: '-0.2px', whiteSpace: 'nowrap',
                  }}>
                    {isRec ? '+' : '−'}{fmt(tx.valor).replace('-', '').replace('+', '')}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </motion.section>

      {/* ─── 6. CTA leve pro desktop (último, opcional) ─── */}
      {(d.totalInvestido > 0 || d.totalDividas > 0) && (
        <motion.button variants={ITEM}
          onClick={() => navigate('/relatorios')}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '12px 16px',
            background: 'rgba(80,78,118,0.06)',
            border: '1px dashed rgba(80,78,118,0.3)',
            borderRadius: 14,
            cursor: 'pointer',
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 12, fontWeight: 600, color: '#3D3B5F',
          }}>
          <IconBellRinging size={13} stroke={2} />
          Ver análise completa →
        </motion.button>
      )}
    </motion.div>
  )
}

// ─── Tokens locais ──────────────────────────────────────────────────

const LABEL: React.CSSProperties = {
  fontFamily: "'Plus Jakarta Sans',sans-serif",
  fontSize: 10, fontWeight: 700,
  color: '#9B7B6A',
  letterSpacing: '.14em', textTransform: 'uppercase',
  margin: 0,
}

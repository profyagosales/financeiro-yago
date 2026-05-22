import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  IconLayoutDashboard, IconBuildingBank, IconCreditCard, IconArrowsExchange,
  IconRepeat, IconCalendarStats, IconTarget, IconTrendingUp, IconChartBar,
  IconSettings, IconChevronLeft, IconChevronRight, IconLogout,
} from '@tabler/icons-react'
import { useContasFixas, usePagamentosFixos } from '@/db/hooks/useContasFixas'
import { useCartoes } from '@/db/hooks/useCartoes'
import { mesAnoAtual } from '@/lib/format'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/schema'
import { useAuthStore } from '@/store/auth'

// ─── Paleta ──────────────────────────────────────────────────────
const BG           = '#504E76'
const ACTIVE_BG    = 'rgba(255,255,255,0.13)'
const ACTIVE_BORD  = '#F1642E'
const TEXT_MUTED   = 'rgba(255,255,255,0.52)'
const TEXT_ACTIVE  = '#ffffff'
const GROUP_LABEL  = 'rgba(255,255,255,0.3)'
const DIVIDER      = 'rgba(255,255,255,0.09)'
const HOVER_BG     = 'rgba(255,255,255,0.07)'

// ─── Card Logo ───────────────────────────────────────────────────
function CardLogo({ collapsed }: { collapsed: boolean }) {
  const w = collapsed ? 40 : 108
  const h = collapsed ? 26 : 70
  return (
    <svg width={w} height={h} viewBox="0 0 96 62" fill="none"
      style={{ borderRadius: collapsed ? 4 : 10, display: 'block', overflow: 'hidden', flexShrink: 0 }}>
      <defs>
        <linearGradient id="cg-bg" x1="0" y1="0" x2="96" y2="62" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#2A2150"/>
          <stop offset="100%" stopColor="#110E2B"/>
        </linearGradient>
        <radialGradient id="cg-gl" cx="18%" cy="18%" r="52%">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.1)"/>
          <stop offset="100%" stopColor="rgba(255,255,255,0)"/>
        </radialGradient>
        <linearGradient id="cg-og" x1="52" y1="0" x2="88" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#F1642E"/>
          <stop offset="100%" stopColor="#FCDD9D"/>
        </linearGradient>
        <filter id="cg-gw" x="-30%" y="-60%" width="160%" height="220%">
          <feGaussianBlur stdDeviation="2.5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <linearGradient id="cg-ch" x1="9" y1="24" x2="27" y2="37" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#F8EE8A"/>
          <stop offset="35%"  stopColor="#D4A820"/>
          <stop offset="75%"  stopColor="#A8780C"/>
          <stop offset="100%" stopColor="#8B6210"/>
        </linearGradient>
      </defs>
      <rect width="96" height="62" rx="9" fill="url(#cg-bg)"/>
      <rect width="96" height="62" rx="9" fill="url(#cg-gl)"/>
      <circle cx="88" cy="56" r="24" fill="rgba(241,100,46,0.055)"/>
      <rect x=".7" y=".7" width="94.6" height="60.6" rx="8.5" fill="none" stroke="rgba(196,195,227,0.18)" strokeWidth="1.2"/>
      <text x="88" y="14" textAnchor="end" fontFamily="'Plus Jakarta Sans',sans-serif" fontSize="6.5" fontWeight="800" letterSpacing="1.1" fill="#C4C3E3" opacity=".92">ECONOMIZA,</text>
      <text x="88" y="28" textAnchor="end" fontFamily="'Bebas Neue',sans-serif" fontSize="16" letterSpacing="2" fill="#F1642E" opacity=".35" filter="url(#cg-gw)">GAY</text>
      <text x="88" y="28" textAnchor="end" fontFamily="'Bebas Neue',sans-serif" fontSize="16" letterSpacing="2" fill="url(#cg-og)">GAY</text>
      {/* Chip EMV 18×13 */}
      <rect x="9" y="24" width="18" height="13" rx="2" fill="url(#cg-ch)"/>
      <rect x="9" y="24" width="18" height="13" rx="2" fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth=".5"/>
      <line x1="9.5" y1="24.5" x2="26.5" y2="24.5" stroke="rgba(255,245,180,0.5)" strokeWidth=".5"/>
      <rect x="10.2" y="25.2" width="7.2" height="2.2" rx=".8" fill="rgba(0,0,0,0.26)"/>
      <rect x="10.2" y="25.2" width="7.2" height=".5"  rx=".8" fill="rgba(255,245,180,0.24)"/>
      <rect x="10.2" y="28.0" width="7.2" height="2.2" rx=".8" fill="rgba(0,0,0,0.26)"/>
      <rect x="10.2" y="28.0" width="7.2" height=".5"  rx=".8" fill="rgba(255,245,180,0.24)"/>
      <rect x="10.2" y="30.8" width="7.2" height="2.2" rx=".8" fill="rgba(0,0,0,0.26)"/>
      <rect x="10.2" y="30.8" width="7.2" height=".5"  rx=".8" fill="rgba(255,245,180,0.24)"/>
      <rect x="10.2" y="33.6" width="7.2" height="2.2" rx=".8" fill="rgba(0,0,0,0.26)"/>
      <rect x="10.2" y="33.6" width="7.2" height=".5"  rx=".8" fill="rgba(255,245,180,0.24)"/>
      <rect x="18.6" y="25.2" width="7.2" height="2.2" rx=".8" fill="rgba(0,0,0,0.26)"/>
      <rect x="18.6" y="25.2" width="7.2" height=".5"  rx=".8" fill="rgba(255,245,180,0.24)"/>
      <rect x="18.6" y="28.0" width="7.2" height="2.2" rx=".8" fill="rgba(0,0,0,0.26)"/>
      <rect x="18.6" y="28.0" width="7.2" height=".5"  rx=".8" fill="rgba(255,245,180,0.24)"/>
      <rect x="18.6" y="30.8" width="7.2" height="2.2" rx=".8" fill="rgba(0,0,0,0.26)"/>
      <rect x="18.6" y="30.8" width="7.2" height=".5"  rx=".8" fill="rgba(255,245,180,0.24)"/>
      <rect x="18.6" y="33.6" width="7.2" height="2.2" rx=".8" fill="rgba(0,0,0,0.26)"/>
      <rect x="18.6" y="33.6" width="7.2" height=".5"  rx=".8" fill="rgba(255,245,180,0.24)"/>
      <text x="9" y="51" fontFamily="'Courier New',monospace" fontSize="4.5" letterSpacing=".2" fill="rgba(196,195,227,0.38)">4821 3956 7234 6490</text>
      <circle cx="73" cy="47" r="6" fill="#EB001B" opacity=".92"/>
      <circle cx="80" cy="47" r="6" fill="#F79E1B" opacity=".92"/>
      <path d="M76.5,41.2 A6,6,0,0,1,76.5,52.8 A6,6,0,0,0,76.5,41.2Z" fill="#FF5000" opacity=".78"/>
      <text x="76.5" y="55.2" textAnchor="middle" fontFamily="Arial,sans-serif" fontSize="2.2" fontWeight="700" letterSpacing=".3" fill="rgba(255,255,255,0.3)">MASTERCARD</text>
    </svg>
  )
}

// ─── Badges ──────────────────────────────────────────────────────
function useSidebarBadges() {
  const { mes, ano } = mesAnoAtual()
  const fixas   = useContasFixas()
  const pags    = usePagamentosFixos(mes, ano)
  const hoje    = new Date().getDate()
  const pendentes = fixas.filter(
    cf => !pags.find(p => p.contaFixaId === cf.id && p.status === 'pago')
  )
  const hoje_   = pendentes.filter(cf => cf.diaVencimento === hoje)
  const cartoes = useCartoes()
  const faturas = useLiveQuery(async () => {
    let n = 0
    for (const c of cartoes) {
      const k = await db.lancamentosCartao
        .where('[cartaoId+mes+ano]').equals([c.id!, mes, ano]).count()
      if (k > 0) n++
    }
    return n
  }, [cartoes, mes, ano]) ?? 0

  return {
    fixas:   hoje_.length    > 0 ? { label: `${hoje_.length}`,   urgent: true  }
           : pendentes.length > 0 ? { label: `${pendentes.length}`, urgent: false }
           : null,
    cartoes: faturas > 0 ? { label: `${faturas}`, urgent: false } : null,
  }
}

// ─── Menu ─────────────────────────────────────────────────────────
const MENU = [
  {
    group: 'Geral',
    items: [{ path: '/', icon: IconLayoutDashboard, label: 'Dashboard', badgeKey: null }],
  },
  {
    group: 'Finanças',
    items: [
      { path: '/contas',        icon: IconBuildingBank,   label: 'Contas',        badgeKey: null },
      { path: '/cartoes',       icon: IconCreditCard,     label: 'Cartões',       badgeKey: 'cartoes' },
      { path: '/transacoes',    icon: IconArrowsExchange, label: 'Transações',    badgeKey: null },
      { path: '/contas-fixas',  icon: IconRepeat,         label: 'Contas Fixas',  badgeKey: 'fixas' },
      { path: '/parcelamentos', icon: IconCalendarStats,  label: 'Parcelamentos', badgeKey: null },
    ],
  },
  {
    group: 'Planejamento',
    items: [
      { path: '/metas',      icon: IconTarget,     label: 'Metas & Orçamento', badgeKey: null },
      { path: '/patrimonio', icon: IconTrendingUp, label: 'Patrimônio',        badgeKey: null },
      { path: '/relatorios', icon: IconChartBar,   label: 'Relatórios',        badgeKey: null },
    ],
  },
]

function getCollapsed() {
  try { return localStorage.getItem('sb-collapsed') === '1' } catch { return false }
}
function setCollapsedPref(v: boolean) {
  try { localStorage.setItem('sb-collapsed', v ? '1' : '0') } catch {}
}

export function Sidebar() {
  const { pathname } = useLocation()
  const navigate     = useNavigate()
  const badges       = useSidebarBadges()
  const { lock }     = useAuthStore()
  const [collapsed, setCollapsed] = useState(getCollapsed)

  const toggle   = () => setCollapsed(v => { setCollapsedPref(!v); return !v })
  const getBadge = (key: string | null) => key ? badges[key as keyof typeof badges] : null

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 232 }}
      transition={{ type: 'spring', stiffness: 340, damping: 34 }}
      style={{
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        height: '100dvh',
        overflow: 'visible',
        zIndex: 10,
      }}
    >
      {/* ── Corpo: arredondado no lado direito ── */}
      <div style={{
        width: '100%',
        height: '100%',
        background: BG,
        borderRadius: '0 24px 24px 0',
        display: 'flex',
        flexDirection: 'column',
        padding: collapsed ? '20px 10px' : '20px 14px',
        overflow: 'hidden',
        boxShadow: '4px 0 28px rgba(80,78,118,0.28)',
        position: 'relative',
      }}>

        {/* ── Logo ── */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          paddingBottom: 20,
          marginBottom: 14,
          borderBottom: `1px solid ${DIVIDER}`,
          flexShrink: 0,
        }}>
          <CardLogo collapsed={collapsed} />

          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.16 }}
                style={{ textAlign: 'center' }}
              >
                <p style={{
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.38)',
                  letterSpacing: '.12em',
                  textTransform: 'uppercase',
                }}>
                  Financeiro do Yago
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Nav ── */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {MENU.map((group, gi) => (
            <div key={gi} style={{ marginBottom: 6 }}>
              {!collapsed && (
                <p style={{
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontSize: 9,
                  fontWeight: 700,
                  color: GROUP_LABEL,
                  letterSpacing: '.12em',
                  textTransform: 'uppercase',
                  padding: '10px 10px 5px',
                }}>
                  {group.group}
                </p>
              )}
              {collapsed && gi > 0 && <div style={{ height: 10 }} />}

              {group.items.map(item => {
                const active = pathname === item.path
                const Icon   = item.icon
                const badge  = getBadge(item.badgeKey)
                return (
                  <motion.button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    title={collapsed ? item.label : undefined}
                    whileHover={{ background: active ? ACTIVE_BG : HOVER_BG }}
                    style={{
                      width: '100%',
                      padding: collapsed ? '10px 0' : '9px 10px',
                      borderRadius: 11,
                      border: 'none',
                      cursor: 'pointer',
                      background: active ? ACTIVE_BG : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      gap: collapsed ? 0 : 10,
                      marginBottom: 2,
                      transition: 'background .12s',
                      position: 'relative',
                      // Borda esquerda laranja — acento discreto mas presente
                      boxShadow: active && !collapsed
                        ? `inset 3px 0 0 ${ACTIVE_BORD}`
                        : 'none',
                    }}
                  >
                    <Icon
                      size={17}
                      stroke={active ? 2.2 : 1.6}
                      color={active ? TEXT_ACTIVE : TEXT_MUTED}
                      style={{ flexShrink: 0 }}
                    />
                    {!collapsed && (
                      <>
                        <span style={{
                          fontFamily: "'Plus Jakarta Sans',sans-serif",
                          fontSize: 13,
                          fontWeight: active ? 600 : 400,
                          color: active ? TEXT_ACTIVE : TEXT_MUTED,
                          flex: 1,
                          whiteSpace: 'nowrap',
                          textAlign: 'left',
                        }}>
                          {item.label}
                        </span>
                        {badge && (
                          <span style={{
                            fontFamily: "'Plus Jakarta Sans',sans-serif",
                            fontSize: 10,
                            fontWeight: 700,
                            background: badge.urgent
                              ? 'rgba(239,68,68,0.85)'
                              : 'rgba(255,255,255,0.14)',
                            color: 'white',
                            padding: '1px 7px',
                            borderRadius: 20,
                            flexShrink: 0,
                          }}>
                            {badge.label}
                          </span>
                        )}
                      </>
                    )}
                    {collapsed && active && (
                      <div style={{
                        position: 'absolute', left: 0, top: '20%', bottom: '20%',
                        width: 3, borderRadius: '0 2px 2px 0', background: ACTIVE_BORD,
                      }} />
                    )}
                    {collapsed && badge?.urgent && (
                      <div style={{
                        position: 'absolute', top: 4, right: 7,
                        width: 6, height: 6, borderRadius: '50%',
                        background: '#ef4444',
                      }} />
                    )}
                  </motion.button>
                )
              })}
            </div>
          ))}
        </div>

        {/* ── Footer ── */}
        <div style={{
          borderTop: `1px solid ${DIVIDER}`,
          paddingTop: 8,
          flexShrink: 0,
        }}>
          {[{ path: '/configuracoes', icon: IconSettings, label: 'Configurações' }].map(item => {
            const active = pathname === item.path
            return (
              <motion.button
                key={item.path}
                onClick={() => navigate(item.path)}
                title={collapsed ? item.label : undefined}
                whileHover={{ background: active ? ACTIVE_BG : HOVER_BG }}
                style={{
                  width: '100%',
                  padding: collapsed ? '10px 0' : '9px 10px',
                  borderRadius: 11,
                  border: 'none',
                  cursor: 'pointer',
                  background: active ? ACTIVE_BG : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  gap: collapsed ? 0 : 10,
                  marginBottom: 2,
                  transition: 'background .12s',
                  boxShadow: active && !collapsed ? `inset 3px 0 0 ${ACTIVE_BORD}` : 'none',
                }}
              >
                <IconSettings size={17} stroke={active ? 2.2 : 1.6} color={active ? TEXT_ACTIVE : TEXT_MUTED} />
                {!collapsed && (
                  <span style={{
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                    fontSize: 13,
                    fontWeight: active ? 600 : 400,
                    color: active ? TEXT_ACTIVE : TEXT_MUTED,
                  }}>
                    {item.label}
                  </span>
                )}
              </motion.button>
            )
          })}

          <motion.button
            onClick={lock}
            title={collapsed ? 'Bloquear' : undefined}
            whileHover={{ background: HOVER_BG }}
            style={{
              width: '100%',
              padding: collapsed ? '10px 0' : '9px 10px',
              borderRadius: 11,
              border: 'none',
              cursor: 'pointer',
              background: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: collapsed ? 0 : 10,
              transition: 'background .12s',
            }}
          >
            <IconLogout size={17} stroke={1.6} color="rgba(255,255,255,0.25)" />
            {!collapsed && (
              <span style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontSize: 13,
                color: 'rgba(255,255,255,0.25)',
              }}>
                Bloquear
              </span>
            )}
          </motion.button>
        </div>
      </div>

      {/* ── Botão colapso — topo, na altura da logo, extrapolando a borda ── */}
      <motion.button
        onClick={toggle}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.93 }}
        title={collapsed ? 'Expandir' : 'Recolher'}
        style={{
          position: 'absolute',
          right: -13,
          top: 28,               // Na altura da logo
          width: 26,
          height: 26,
          borderRadius: '0 8px 8px 0',
          background: BG,
          border: `1px solid rgba(255,255,255,0.15)`,
          borderLeft: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '3px 0 10px rgba(80,78,118,0.4)',
          zIndex: 20,
        }}
      >
        <motion.div
          animate={{ rotate: collapsed ? 0 : 180 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        >
          <IconChevronRight size={12} stroke={2.5} color="rgba(255,255,255,0.65)" />
        </motion.div>
      </motion.button>
    </motion.aside>
  )
}

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
const BG            = '#504E76'
const ACTIVE        = '#F1642E'
const TEXT_MUTED    = 'rgba(255,255,255,0.55)'
const TEXT_ACTIVE   = '#ffffff'
const GROUP_LABEL   = 'rgba(255,255,255,0.32)'
const DIVIDER       = 'rgba(255,255,255,0.1)'
const HOVER_BG      = 'rgba(255,255,255,0.08)'

// ─── Logo animada — moeda estilizada ─────────────────────────────
function LogoMark({ size = 48 }: { size?: number }) {
  return (
    <motion.div
      animate={{ rotate: [0, -4, 4, -2, 0] }}
      transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', repeatDelay: 3 }}
      style={{ width: size, height: size, flexShrink: 0 }}
    >
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        {/* Sombra/depth */}
        <ellipse cx="25" cy="44" rx="14" ry="3" fill="rgba(0,0,0,0.25)" />
        {/* Corpo da moeda */}
        <circle cx="24" cy="23" r="18" fill={ACTIVE} />
        {/* Anel interno */}
        <circle cx="24" cy="23" r="18" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
        {/* Brilho topo-esquerdo */}
        <ellipse cx="18" cy="15" rx="6" ry="4" fill="rgba(255,255,255,0.18)" transform="rotate(-30 18 15)" />
        {/* Letra F estilizada */}
        <text x="24" y="28" textAnchor="middle" fontFamily="'Fraunces', Georgia, serif"
          fontSize="15" fontWeight="700" fill="white" letterSpacing="-0.5">
          FY
        </text>
        {/* Cartola */}
        <rect x="15" y="5" width="18" height="2.5" rx="1.2" fill="#2D2B3E" />
        <rect x="17.5" y="0" width="13" height="7" rx="2.5" fill="#2D2B3E" />
        {/* Faixa da cartola */}
        <rect x="17.5" y="5.5" width="13" height="1.5" rx="0.7" fill={ACTIVE} opacity="0.8" />
      </svg>
    </motion.div>
  )
}

// ─── Badges ──────────────────────────────────────────────────────
function useSidebarBadges() {
  const { mes, ano } = mesAnoAtual()
  const fixas  = useContasFixas()
  const pags   = usePagamentosFixos(mes, ano)
  const hoje   = new Date().getDate()
  const fixasPendentes = fixas.filter(
    cf => !pags.find(p => p.contaFixaId === cf.id && p.status === 'pago')
  )
  const fixasHoje = fixasPendentes.filter(cf => cf.diaVencimento === hoje)
  const cartoes   = useCartoes()
  const faturasAtivas = useLiveQuery(async () => {
    let count = 0
    for (const c of cartoes) {
      const n = await db.lancamentosCartao
        .where('[cartaoId+mes+ano]').equals([c.id!, mes, ano]).count()
      if (n > 0) count++
    }
    return count
  }, [cartoes, mes, ano]) ?? 0

  return {
    fixas:   fixasHoje.length   > 0 ? { label: `${fixasHoje.length}`, urgent: true }
           : fixasPendentes.length > 0 ? { label: `${fixasPendentes.length}`, urgent: false }
           : null,
    cartoes: faturasAtivas > 0 ? { label: `${faturasAtivas}`, urgent: false } : null,
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
    // Wrapper com overflow visible para o botão colapso "extrapolar"
    <motion.aside
      animate={{ width: collapsed ? 64 : 232 }}
      transition={{ type: 'spring', stiffness: 340, damping: 34 }}
      style={{
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        height: '100dvh',
        // overflow visible = botão pode extrapolar a borda
        overflow: 'visible',
        zIndex: 10,
      }}
    >
      {/* ── Corpo da sidebar com cantos arredondados no lado direito ── */}
      <div style={{
        width: '100%',
        height: '100%',
        background: BG,
        borderRadius: '0 24px 24px 0',
        display: 'flex',
        flexDirection: 'column',
        padding: collapsed ? '24px 10px' : '24px 14px',
        overflow: 'hidden',   // clip do conteúdo interno
        boxShadow: '4px 0 32px rgba(80,78,118,0.3)',
      }}>

        {/* ── Logo ── */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          paddingBottom: 22,
          marginBottom: 16,
          borderBottom: `1px solid ${DIVIDER}`,
          flexShrink: 0,
        }}>
          <LogoMark size={collapsed ? 36 : 48} />

          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1,  y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                style={{ marginTop: 10 }}
              >
                <p style={{
                  fontFamily: "'Fraunces',Georgia,serif",
                  fontSize: 14,
                  fontWeight: 700,
                  color: TEXT_ACTIVE,
                  letterSpacing: '-0.2px',
                  lineHeight: 1.2,
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
                  padding: '10px 12px 5px',
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
                    whileHover={{ background: active ? undefined : HOVER_BG }}
                    style={{
                      width: '100%',
                      padding: collapsed ? '10px 0' : '9px 12px',
                      borderRadius: 12,
                      border: 'none',
                      cursor: 'pointer',
                      background: active ? ACTIVE : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      gap: collapsed ? 0 : 10,
                      marginBottom: 3,
                      transition: 'background .12s',
                      position: 'relative',
                      boxShadow: active ? `0 4px 16px rgba(241,100,46,0.4)` : 'none',
                    }}
                  >
                    <Icon
                      size={18}
                      stroke={active ? 2.2 : 1.8}
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
                            background: badge.urgent ? '#ef4444' : 'rgba(255,255,255,0.15)',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: 20,
                            flexShrink: 0,
                          }}>
                            {badge.label}
                          </span>
                        )}
                      </>
                    )}
                    {collapsed && badge?.urgent && (
                      <div style={{
                        position: 'absolute', top: 5, right: 8,
                        width: 6, height: 6, borderRadius: '50%', background: '#ef4444',
                      }} />
                    )}
                  </motion.button>
                )
              })}
            </div>
          ))}
        </div>

        {/* ── Footer ── */}
        <div style={{ borderTop: `1px solid ${DIVIDER}`, paddingTop: 10, flexShrink: 0 }}>
          {[
            { path: '/configuracoes', icon: IconSettings, label: 'Configurações' },
          ].map(item => {
            const active = pathname === item.path
            const Icon   = item.icon
            return (
              <motion.button
                key={item.path}
                onClick={() => navigate(item.path)}
                title={collapsed ? item.label : undefined}
                whileHover={{ background: active ? undefined : HOVER_BG }}
                style={{
                  width: '100%',
                  padding: collapsed ? '10px 0' : '9px 12px',
                  borderRadius: 12,
                  border: 'none',
                  cursor: 'pointer',
                  background: active ? ACTIVE : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  gap: collapsed ? 0 : 10,
                  marginBottom: 3,
                  transition: 'background .12s',
                  boxShadow: active ? `0 4px 16px rgba(241,100,46,0.4)` : 'none',
                }}
              >
                <Icon size={18} stroke={active ? 2.2 : 1.8} color={active ? TEXT_ACTIVE : TEXT_MUTED} />
                {!collapsed && (
                  <span style={{
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                    fontSize: 13,
                    fontWeight: active ? 600 : 400,
                    color: active ? TEXT_ACTIVE : TEXT_MUTED,
                    textAlign: 'left',
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
              padding: collapsed ? '10px 0' : '9px 12px',
              borderRadius: 12,
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
            <IconLogout size={18} stroke={1.8} color="rgba(255,255,255,0.28)" />
            {!collapsed && (
              <span style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontSize: 13,
                color: 'rgba(255,255,255,0.28)',
                textAlign: 'left',
              }}>
                Bloquear
              </span>
            )}
          </motion.button>
        </div>
      </div>

      {/* ── Botão colapso — extrapola a borda da sidebar ── */}
      <motion.button
        onClick={toggle}
        whileHover={{ scale: 1.05, x: 2 }}
        whileTap={{ scale: 0.95 }}
        animate={{ rotate: collapsed ? 0 : 180 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        title={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
        style={{
          position: 'absolute',
          // Fica exatamente na borda direita, metade dentro metade fora
          right: -14,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 28,
          height: 28,
          borderRadius: '0 8px 8px 0',
          background: BG,
          border: `1px solid ${DIVIDER}`,
          borderLeft: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '4px 0 12px rgba(80,78,118,0.35)',
          zIndex: 20,
        }}
      >
        <IconChevronLeft size={13} stroke={2.5} color="rgba(255,255,255,0.7)" />
      </motion.button>
    </motion.aside>
  )
}

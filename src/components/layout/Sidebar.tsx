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

function useSidebarBadges() {
  const { mes, ano } = mesAnoAtual()
  const fixas = useContasFixas()
  const pags = usePagamentosFixos(mes, ano)
  const hoje = new Date().getDate()
  const fixasPendentes = fixas.filter(cf => !pags.find(p => p.contaFixaId === cf.id && p.status === 'pago'))
  const fixasHoje = fixasPendentes.filter(cf => cf.diaVencimento === hoje)
  const cartoes = useCartoes()
  const faturasAtivas = useLiveQuery(async () => {
    let count = 0
    for (const c of cartoes) {
      const items = await db.lancamentosCartao.where('[cartaoId+mes+ano]').equals([c.id!, mes, ano]).count()
      if (items > 0) count++
    }
    return count
  }, [cartoes, mes, ano]) ?? 0

  const badgeFixas = fixasHoje.length > 0
    ? { label: `${fixasHoje.length}`, urgent: true }
    : fixasPendentes.length > 0
    ? { label: `${fixasPendentes.length}`, urgent: false }
    : null
  const badgeCartoes = faturasAtivas > 0 ? { label: `${faturasAtivas}`, urgent: false } : null
  return { fixas: badgeFixas, cartoes: badgeCartoes }
}

const MENU = [
  {
    group: 'Geral',
    items: [
      { path: '/',             icon: IconLayoutDashboard, label: 'Dashboard',      badgeKey: null },
    ],
  },
  {
    group: 'Finanças',
    items: [
      { path: '/contas',        icon: IconBuildingBank,   label: 'Contas',         badgeKey: null },
      { path: '/cartoes',       icon: IconCreditCard,     label: 'Cartões',        badgeKey: 'cartoes' },
      { path: '/transacoes',    icon: IconArrowsExchange, label: 'Transações',     badgeKey: null },
      { path: '/contas-fixas',  icon: IconRepeat,         label: 'Contas Fixas',   badgeKey: 'fixas' },
      { path: '/parcelamentos', icon: IconCalendarStats,  label: 'Parcelamentos',  badgeKey: null },
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
  const navigate = useNavigate()
  const badges = useSidebarBadges()
  const { lock } = useAuthStore()
  const [collapsed, setCollapsed] = useState(getCollapsed)

  const toggle = () => setCollapsed(v => { setCollapsedPref(!v); return !v })
  const getBadge = (key: string | null) => key ? badges[key as keyof typeof badges] : null

  return (
    <motion.aside
      animate={{ width: collapsed ? 60 : 220 }}
      transition={{ type: 'spring', stiffness: 360, damping: 36 }}
      style={{
        flexShrink: 0,
        background: '#111111',
        height: '100dvh',
        position: 'sticky',
        top: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        padding: collapsed ? '18px 8px' : '18px 10px',
        borderRight: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {/* ── Logo ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 28,
        paddingBottom: 18,
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        overflow: 'hidden',
        flexShrink: 0,
        justifyContent: collapsed ? 'center' : 'space-between',
      }}>
        {/* FY mark */}
        <div style={{
          width: 32, height: 32, borderRadius: 9,
          background: '#C4553B',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(196,85,59,0.4)',
        }}>
          <span style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 12, fontWeight: 700, color: 'white', letterSpacing: '-0.5px' }}>FY</span>
        </div>

        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              style={{ flex: 1, minWidth: 0 }}
            >
              <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 13, fontWeight: 700, color: 'white', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Financeiro
              </p>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
                do Yago
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {!collapsed && (
          <button onClick={toggle} style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 7, width: 26, height: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <IconChevronLeft size={13} stroke={2} color="rgba(255,255,255,0.4)" />
          </button>
        )}
      </div>

      {/* ── Nav ── */}
      <div style={{ flex: 1 }}>
        {MENU.map((group, gi) => (
          <div key={gi} style={{ marginBottom: 6 }}>
            {/* Group label */}
            {!collapsed && (
              <p style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontSize: 9,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.28)',
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                padding: '10px 10px 5px',
              }}>
                {group.group}
              </p>
            )}
            {collapsed && gi > 0 && <div style={{ height: 16 }} />}

            {group.items.map(item => {
              const active = pathname === item.path
              const Icon = item.icon
              const badge = getBadge(item.badgeKey)

              return (
                <motion.button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  title={collapsed ? item.label : undefined}
                  whileHover={{ background: active ? undefined : 'rgba(255,255,255,0.06)' }}
                  style={{
                    width: '100%',
                    padding: collapsed ? '9px 0' : '8px 10px',
                    borderRadius: 9,
                    border: 'none',
                    cursor: 'pointer',
                    background: active ? '#C4553B' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    gap: collapsed ? 0 : 9,
                    marginBottom: 2,
                    transition: 'background .12s',
                    position: 'relative',
                    boxShadow: active ? '0 4px 14px rgba(196,85,59,0.35)' : 'none',
                  }}
                >
                  <Icon
                    size={17}
                    stroke={active ? 2.2 : 1.8}
                    color={active ? 'white' : 'rgba(255,255,255,0.45)'}
                    style={{ flexShrink: 0 }}
                  />
                  {!collapsed && (
                    <>
                      <span style={{
                        fontFamily: "'Plus Jakarta Sans',sans-serif",
                        fontSize: 13,
                        fontWeight: active ? 600 : 400,
                        color: active ? 'white' : 'rgba(255,255,255,0.55)',
                        flex: 1,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        textAlign: 'left',
                      }}>
                        {item.label}
                      </span>
                      {badge && (
                        <span style={{
                          fontFamily: "'Plus Jakarta Sans',sans-serif",
                          fontSize: 10,
                          fontWeight: 700,
                          background: badge.urgent ? '#ef4444' : 'rgba(255,255,255,0.12)',
                          color: 'white',
                          padding: '1px 7px',
                          borderRadius: 20,
                          flexShrink: 0,
                          minWidth: 20,
                          textAlign: 'center',
                        }}>
                          {badge.label}
                        </span>
                      )}
                    </>
                  )}
                  {/* Dot badge when collapsed */}
                  {collapsed && badge?.urgent && (
                    <div style={{ position: 'absolute', top: 5, right: 8, width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} />
                  )}
                </motion.button>
              )
            })}
          </div>
        ))}
      </div>

      {/* ── Footer: Configurações + Lock ── */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 10, flexShrink: 0 }}>
        {[
          { path: '/configuracoes', icon: IconSettings, label: 'Configurações' },
        ].map(item => {
          const active = pathname === item.path
          const Icon = item.icon
          return (
            <motion.button
              key={item.path}
              onClick={() => navigate(item.path)}
              title={collapsed ? item.label : undefined}
              whileHover={{ background: active ? undefined : 'rgba(255,255,255,0.06)' }}
              style={{
                width: '100%',
                padding: collapsed ? '9px 0' : '8px 10px',
                borderRadius: 9,
                border: 'none',
                cursor: 'pointer',
                background: active ? '#C4553B' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'flex-start',
                gap: collapsed ? 0 : 9,
                marginBottom: 2,
                transition: 'background .12s',
                boxShadow: active ? '0 4px 14px rgba(196,85,59,0.35)' : 'none',
              }}
            >
              <Icon size={17} stroke={active ? 2.2 : 1.8} color={active ? 'white' : 'rgba(255,255,255,0.45)'} />
              {!collapsed && (
                <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: active ? 600 : 400, color: active ? 'white' : 'rgba(255,255,255,0.55)', flex: 1, textAlign: 'left' }}>
                  {item.label}
                </span>
              )}
            </motion.button>
          )
        })}

        <motion.button
          onClick={lock}
          title={collapsed ? 'Bloquear' : undefined}
          whileHover={{ background: 'rgba(255,255,255,0.06)' }}
          style={{
            width: '100%',
            padding: collapsed ? '9px 0' : '8px 10px',
            borderRadius: 9,
            border: 'none',
            cursor: 'pointer',
            background: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: collapsed ? 0 : 9,
            transition: 'background .12s',
          }}
        >
          <IconLogout size={17} stroke={1.8} color="rgba(255,255,255,0.35)" />
          {!collapsed && (
            <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 400, color: 'rgba(255,255,255,0.35)', textAlign: 'left' }}>
              Bloquear
            </span>
          )}
        </motion.button>

        {/* Expand when collapsed */}
        {collapsed && (
          <button
            onClick={toggle}
            style={{ width: '100%', background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 8, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 8 }}
          >
            <IconChevronRight size={13} color="rgba(255,255,255,0.4)" stroke={2} />
          </button>
        )}
      </div>
    </motion.aside>
  )
}

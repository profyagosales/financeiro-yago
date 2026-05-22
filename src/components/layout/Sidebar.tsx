import { useState } from 'react'
import { motion } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  IconLayoutDashboard, IconBuildingBank, IconCreditCard, IconArrowsExchange,
  IconRepeat, IconCalendarStats, IconTarget, IconTrendingUp, IconChartBar,
  IconSettings, IconChevronLeft, IconChevronRight,
} from '@tabler/icons-react'
import { useContasFixas, usePagamentosFixos } from '@/db/hooks/useContasFixas'
import { useCartoes } from '@/db/hooks/useCartoes'
import { mesAnoAtual } from '@/lib/format'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/schema'

function useSidebarBadges() {
  const { mes, ano } = mesAnoAtual()
  const fixas = useContasFixas()
  const pags = usePagamentosFixos(mes, ano)
  const hoje = new Date().getDate()
  const fixasPendentes = fixas.filter(cf => !pags.find(p => p.contaFixaId === cf.id && p.status === 'pago'))
  const fixasUrgentes = fixasPendentes.filter(cf => cf.diaVencimento >= hoje && cf.diaVencimento <= hoje + 3)
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
    ? { label: `${fixasHoje.length} hoje`, urgent: true }
    : fixasUrgentes.length > 0
    ? { label: `${fixasUrgentes.length}`, urgent: true }
    : fixasPendentes.length > 0
    ? { label: `${fixasPendentes.length}`, urgent: false }
    : null
  const badgeCartoes = faturasAtivas > 0
    ? { label: `${faturasAtivas}`, urgent: false }
    : null

  return { fixas: badgeFixas, cartoes: badgeCartoes }
}

const MENU = [
  {
    group: '',
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
      { path: '/patrimonio', icon: IconTrendingUp, label: 'Patrimônio',         badgeKey: null },
      { path: '/relatorios', icon: IconChartBar,   label: 'Relatórios',         badgeKey: null },
    ],
  },
  {
    group: '',
    items: [{ path: '/configuracoes', icon: IconSettings, label: 'Configurações', badgeKey: null }],
    divider: true,
  },
]

function getCollapsed() {
  try { return localStorage.getItem('sidebar-collapsed') === '1' } catch { return false }
}
function setCollapsedPref(v: boolean) {
  try { localStorage.setItem('sidebar-collapsed', v ? '1' : '0') } catch {}
}

export function Sidebar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const badges = useSidebarBadges()
  const [collapsed, setCollapsed] = useState(getCollapsed)

  const toggle = () => setCollapsed(v => { setCollapsedPref(!v); return !v })
  const getBadge = (key: string | null) => key ? badges[key as keyof typeof badges] : null

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 248 }}
      transition={{ type: 'spring', stiffness: 340, damping: 34 }}
      style={{
        flexShrink: 0,
        background: 'linear-gradient(180deg, #1C0A05 0%, #100502 100%)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        height: '100dvh',
        position: 'sticky',
        top: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        padding: collapsed ? '20px 10px' : '20px 12px',
        boxShadow: '4px 0 24px rgba(10,4,2,0.3)',
      }}>

      {/* Logo */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        paddingBottom: 20,
        marginBottom: 8,
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        <div style={{
          width: 36, height: 36,
          borderRadius: 10,
          background: 'linear-gradient(145deg, #D4604A 0%, #B04030 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 2px 10px rgba(196,85,59,0.45)',
        }}>
          <span style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 13, fontWeight: 700, color: 'white', letterSpacing: '-0.5px' }}>FY</span>
        </div>

        {!collapsed && (
          <>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.85)', lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Financeiro do Yago
              </p>
            </div>
            <button onClick={toggle}
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <IconChevronLeft size={14} stroke={2} color="rgba(255,255,255,0.5)" />
            </button>
          </>
        )}
      </div>

      {/* Nav */}
      <div style={{ flex: 1 }}>
        {MENU.map((group, gi) => (
          <div key={gi}>
            {'divider' in group && group.divider && (
              <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '10px 0' }} />
            )}
            {group.group && !collapsed && (
              <p style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontSize: 10,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.28)',
                letterSpacing: '.09em',
                textTransform: 'uppercase',
                padding: '16px 10px 6px',
                whiteSpace: 'nowrap',
              }}>
                {group.group}
              </p>
            )}
            {group.group && collapsed && <div style={{ height: 14 }} />}

            {group.items.map(item => {
              const active = pathname === item.path
              const Icon = item.icon
              const badge = getBadge(item.badgeKey)
              return (
                <motion.button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  title={collapsed ? item.label : undefined}
                  whileHover={{ x: collapsed ? 0 : 2, background: active ? 'rgba(196,85,59,0.22)' : 'rgba(255,255,255,0.07)' }}
                  style={{
                    width: '100%',
                    padding: collapsed ? '10px 0' : '9px 10px',
                    borderRadius: 10,
                    border: 'none',
                    cursor: 'pointer',
                    background: active ? 'rgba(196,85,59,0.18)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    gap: collapsed ? 0 : 9,
                    marginBottom: 2,
                    boxShadow: active && !collapsed ? 'inset 3px 0 0 #C4553B' : 'none',
                    transition: 'background .12s, box-shadow .12s',
                    position: 'relative',
                  }}>
                  <Icon
                    size={18}
                    stroke={active ? 2.2 : 1.8}
                    color={active ? '#F0957A' : 'rgba(255,255,255,0.5)'}
                    style={{ flexShrink: 0 }}
                  />
                  {!collapsed && (
                    <>
                      <span style={{
                        fontFamily: "'Plus Jakarta Sans',sans-serif",
                        fontSize: 13,
                        fontWeight: active ? 600 : 400,
                        color: active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.55)',
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
                          background: badge.urgent ? '#C4553B' : 'rgba(255,255,255,0.12)',
                          color: badge.urgent ? 'white' : 'rgba(255,255,255,0.7)',
                          padding: '2px 8px',
                          borderRadius: 20,
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                          border: badge.urgent ? 'none' : '1px solid rgba(255,255,255,0.12)',
                        }}>
                          {badge.label}
                        </span>
                      )}
                    </>
                  )}
                  {collapsed && badge?.urgent && (
                    <div style={{ position: 'absolute', top: 5, right: 10, width: 7, height: 7, borderRadius: '50%', background: '#C4553B' }} />
                  )}
                </motion.button>
              )
            })}
          </div>
        ))}
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <div style={{ paddingTop: 12, flexShrink: 0 }}>
          <button onClick={toggle}
            style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconChevronRight size={14} color="rgba(255,255,255,0.5)" stroke={2} />
          </button>
        </div>
      )}
    </motion.aside>
  )
}

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

// ─── Cores da nova paleta ────────────────────────────────────────
const SIDEBAR_BG   = '#504E76'
const ACTIVE_COLOR = '#F1642E'
const TEXT_NORMAL  = 'rgba(255,255,255,0.6)'
const TEXT_ACTIVE  = '#ffffff'
const LABEL_COLOR  = 'rgba(255,255,255,0.35)'
const DIVIDER      = 'rgba(255,255,255,0.1)'

function useSidebarBadges() {
  const { mes, ano } = mesAnoAtual()
  const fixas = useContasFixas()
  const pags  = usePagamentosFixos(mes, ano)
  const hoje  = new Date().getDate()
  const fixasPendentes = fixas.filter(
    cf => !pags.find(p => p.contaFixaId === cf.id && p.status === 'pago')
  )
  const fixasHoje = fixasPendentes.filter(cf => cf.diaVencimento === hoje)
  const cartoes   = useCartoes()
  const faturasAtivas = useLiveQuery(async () => {
    let count = 0
    for (const c of cartoes) {
      const items = await db.lancamentosCartao
        .where('[cartaoId+mes+ano]').equals([c.id!, mes, ano]).count()
      if (items > 0) count++
    }
    return count
  }, [cartoes, mes, ano]) ?? 0

  return {
    fixas:   fixasHoje.length > 0 ? { label: `${fixasHoje.length}`, urgent: true }
           : fixasPendentes.length > 0 ? { label: `${fixasPendentes.length}`, urgent: false }
           : null,
    cartoes: faturasAtivas > 0 ? { label: `${faturasAtivas}`, urgent: false } : null,
  }
}

const MENU = [
  {
    group: 'Geral',
    items: [
      { path: '/', icon: IconLayoutDashboard, label: 'Dashboard', badgeKey: null },
    ],
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
        background: SIDEBAR_BG,
        height: '100dvh',
        position: 'sticky',
        top: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        padding: collapsed ? '24px 10px' : '24px 14px',
      }}
    >
      {/* ── Logo — centralizada, grande, imponente ── */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        marginBottom: 28,
        paddingBottom: 24,
        borderBottom: `1px solid ${DIVIDER}`,
        flexShrink: 0,
        position: 'relative',
      }}>
        {/* FY mark — grande */}
        <div style={{
          width: collapsed ? 40 : 52,
          height: collapsed ? 40 : 52,
          borderRadius: 16,
          background: ACTIVE_COLOR,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 4px 20px rgba(241,100,46,0.5)`,
          marginBottom: collapsed ? 0 : 10,
          transition: 'width .2s, height .2s',
        }}>
          <span style={{
            fontFamily: "'Fraunces',Georgia,serif",
            fontSize: collapsed ? 14 : 18,
            fontWeight: 700,
            color: 'white',
            letterSpacing: '-0.5px',
          }}>
            FY
          </span>
        </div>

        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1,  y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              <p style={{
                fontFamily: "'Fraunces',Georgia,serif",
                fontSize: 15,
                fontWeight: 700,
                color: '#ffffff',
                lineHeight: 1.2,
                letterSpacing: '-0.3px',
              }}>
                Financeiro do Yago
              </p>
              <p style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontSize: 10,
                color: LABEL_COLOR,
                marginTop: 3,
                letterSpacing: '.04em',
              }}>
                Gestão financeira pessoal
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Botão recolher — canto superior direito */}
        {!collapsed && (
          <button
            onClick={toggle}
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: 8,
              width: 26,
              height: 26,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconChevronLeft size={13} stroke={2} color={LABEL_COLOR} />
          </button>
        )}
      </div>

      {/* ── Nav ── */}
      <div style={{ flex: 1 }}>
        {MENU.map((group, gi) => (
          <div key={gi} style={{ marginBottom: 8 }}>
            {/* Label do grupo */}
            {!collapsed && (
              <p style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontSize: 9,
                fontWeight: 700,
                color: LABEL_COLOR,
                letterSpacing: '.12em',
                textTransform: 'uppercase',
                padding: '10px 12px 5px',
              }}>
                {group.group}
              </p>
            )}
            {collapsed && gi > 0 && <div style={{ height: 12 }} />}

            {group.items.map(item => {
              const active = pathname === item.path
              const Icon   = item.icon
              const badge  = getBadge(item.badgeKey)

              return (
                <motion.button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  title={collapsed ? item.label : undefined}
                  whileHover={{
                    background: active
                      ? undefined
                      : 'rgba(255,255,255,0.08)',
                  }}
                  style={{
                    width: '100%',
                    padding: collapsed ? '10px 0' : '9px 12px',
                    borderRadius: 12,
                    border: 'none',
                    cursor: 'pointer',
                    background: active ? ACTIVE_COLOR : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    gap: collapsed ? 0 : 10,
                    marginBottom: 3,
                    transition: 'background .12s',
                    position: 'relative',
                    boxShadow: active
                      ? `0 4px 16px rgba(241,100,46,0.4)`
                      : 'none',
                  }}
                >
                  <Icon
                    size={18}
                    stroke={active ? 2.2 : 1.8}
                    color={active ? TEXT_ACTIVE : TEXT_NORMAL}
                    style={{ flexShrink: 0 }}
                  />

                  {!collapsed && (
                    <>
                      <span style={{
                        fontFamily: "'Plus Jakarta Sans',sans-serif",
                        fontSize: 13,
                        fontWeight: active ? 600 : 400,
                        color: active ? TEXT_ACTIVE : TEXT_NORMAL,
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
                            ? '#ef4444'
                            : 'rgba(255,255,255,0.15)',
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
                      position: 'absolute',
                      top: 5, right: 8,
                      width: 6, height: 6,
                      borderRadius: '50%',
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
        paddingTop: 10,
        flexShrink: 0,
      }}>
        {/* Configurações */}
        <motion.button
          onClick={() => navigate('/configuracoes')}
          title={collapsed ? 'Configurações' : undefined}
          whileHover={{ background: pathname === '/configuracoes' ? undefined : 'rgba(255,255,255,0.08)' }}
          style={{
            width: '100%',
            padding: collapsed ? '10px 0' : '9px 12px',
            borderRadius: 12,
            border: 'none',
            cursor: 'pointer',
            background: pathname === '/configuracoes' ? ACTIVE_COLOR : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: collapsed ? 0 : 10,
            marginBottom: 3,
            transition: 'background .12s',
            boxShadow: pathname === '/configuracoes' ? `0 4px 16px rgba(241,100,46,0.4)` : 'none',
          }}
        >
          <IconSettings
            size={18}
            stroke={pathname === '/configuracoes' ? 2.2 : 1.8}
            color={pathname === '/configuracoes' ? TEXT_ACTIVE : TEXT_NORMAL}
          />
          {!collapsed && (
            <span style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 13,
              fontWeight: pathname === '/configuracoes' ? 600 : 400,
              color: pathname === '/configuracoes' ? TEXT_ACTIVE : TEXT_NORMAL,
              textAlign: 'left',
            }}>
              Configurações
            </span>
          )}
        </motion.button>

        {/* Bloquear */}
        <motion.button
          onClick={lock}
          title={collapsed ? 'Bloquear' : undefined}
          whileHover={{ background: 'rgba(255,255,255,0.08)' }}
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
          <IconLogout size={18} stroke={1.8} color="rgba(255,255,255,0.3)" />
          {!collapsed && (
            <span style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 13,
              fontWeight: 400,
              color: 'rgba(255,255,255,0.3)',
              textAlign: 'left',
            }}>
              Bloquear
            </span>
          )}
        </motion.button>

        {/* Botão expandir (só quando recolhido) */}
        {collapsed && (
          <button
            onClick={toggle}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.08)',
              border: 'none',
              borderRadius: 10,
              height: 34,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 8,
            }}
          >
            <IconChevronRight size={14} color={LABEL_COLOR} stroke={2} />
          </button>
        )}
      </div>
    </motion.aside>
  )
}

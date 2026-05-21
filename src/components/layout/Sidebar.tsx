import { motion } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  IconLayoutDashboard, IconBuildingBank, IconCreditCard, IconArrowsExchange,
  IconRepeat, IconCalendarStats, IconTarget, IconTrendingUp, IconChartBar, IconSettings
} from '@tabler/icons-react'
import { useContasFixas, usePagamentosFixos } from '@/db/hooks/useContasFixas'
import { useCartoes, useTotalFatura } from '@/db/hooks/useCartoes'
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

  // Count cartoes with fatura > 0 this month
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
    ? { label: `${fixasUrgentes.length} urgent`, urgent: true }
    : fixasPendentes.length > 0
    ? { label: `${fixasPendentes.length}`, urgent: false }
    : null

  const badgeCartoes = faturasAtivas > 0 ? { label: `${faturasAtivas} fatura${faturasAtivas !== 1 ? 's' : ''}`, urgent: false } : null

  return { fixas: badgeFixas, cartoes: badgeCartoes }
}

const MENU = [
  { group: '', items: [{ path: '/', icon: IconLayoutDashboard, label: 'Dashboard', badgeKey: null }] },
  { group: 'Finanças', items: [
    { path: '/contas', icon: IconBuildingBank, label: 'Contas', badgeKey: null },
    { path: '/cartoes', icon: IconCreditCard, label: 'Cartões', badgeKey: 'cartoes' },
    { path: '/transacoes', icon: IconArrowsExchange, label: 'Transações', badgeKey: null },
    { path: '/contas-fixas', icon: IconRepeat, label: 'Contas Fixas', badgeKey: 'fixas' },
    { path: '/parcelamentos', icon: IconCalendarStats, label: 'Parcelamentos', badgeKey: null },
  ]},
  { group: 'Planejamento', items: [
    { path: '/metas', icon: IconTarget, label: 'Metas & Orçamento', badgeKey: null },
    { path: '/patrimonio', icon: IconTrendingUp, label: 'Patrimônio', badgeKey: null },
    { path: '/relatorios', icon: IconChartBar, label: 'Relatórios', badgeKey: null },
  ]},
  { group: '', items: [{ path: '/configuracoes', icon: IconSettings, label: 'Configurações', badgeKey: null }] },
]

export function Sidebar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const badges = useSidebarBadges()

  const getBadge = (key: string | null) => {
    if (!key) return null
    return badges[key as keyof typeof badges]
  }

  return (
    <aside style={{ width: 230, flexShrink: 0, background: '#FFFDF9', borderRight: '0.5px solid #E8E0D5', height: '100dvh', position: 'sticky', top: 0, overflowY: 'auto', padding: '16px 10px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px 20px' }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#C4553B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: 'Georgia,serif', fontSize: 13, fontWeight: 700, color: '#FAF6F0' }}>FY</span>
        </div>
        <div>
          <div style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 14, fontWeight: 700, color: '#2C1A0F', lineHeight: 1.2 }}>Financeiro</div>
          <div style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 14, fontWeight: 700, color: '#2C1A0F', lineHeight: 1.2 }}>do Yago</div>
        </div>
      </div>

      {MENU.map((group, gi) => (
        <div key={gi} style={{ marginBottom: 4 }}>
          {group.group && (
            <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 600, color: '#C4B4A8', letterSpacing: '.07em', padding: '8px 10px 4px', textTransform: 'uppercase' }}>
              {group.group}
            </div>
          )}
          {group.items.map(item => {
            const active = pathname === item.path
            const Icon = item.icon
            const badge = getBadge(item.badgeKey)
            return (
              <motion.button key={item.path} onClick={() => navigate(item.path)} whileHover={{ x: 2 }}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 10, border: 'none', cursor: 'pointer', background: active ? '#FAF0EE' : 'transparent', display: 'flex', alignItems: 'center', gap: 9, textAlign: 'left', marginBottom: 1 }}>
                <Icon size={18} stroke={1.8} color={active ? '#C4553B' : '#9B7B6A'} />
                <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: active ? 600 : 500, color: active ? '#C4553B' : '#7A5C4F', flex: 1 }}>{item.label}</span>
                {badge && (
                  <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, background: badge.urgent ? '#FAD0D0' : '#F5F0E8', color: badge.urgent ? '#C4553B' : '#9B7B6A', padding: '2px 7px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                    {badge.label}
                  </span>
                )}
                {active && !badge && <div style={{ width: 3, height: 16, borderRadius: 2, background: '#C4553B' }} />}
              </motion.button>
            )
          })}
        </div>
      ))}
    </aside>
  )
}

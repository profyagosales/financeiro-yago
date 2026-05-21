import { motion } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  IconLayoutDashboard, IconBuildingBank, IconCreditCard, IconArrowsExchange,
  IconRepeat, IconCalendarStats, IconTarget, IconTrendingUp, IconChartBar,
  IconSettings, IconChevronRight
} from '@tabler/icons-react'

const MENU = [
  { group: '', items: [
    { path: '/', icon: IconLayoutDashboard, label: 'Dashboard' },
  ]},
  { group: 'Finanças', items: [
    { path: '/contas', icon: IconBuildingBank, label: 'Contas' },
    { path: '/cartoes', icon: IconCreditCard, label: 'Cartões' },
    { path: '/transacoes', icon: IconArrowsExchange, label: 'Transações' },
    { path: '/contas-fixas', icon: IconRepeat, label: 'Contas Fixas' },
    { path: '/parcelamentos', icon: IconCalendarStats, label: 'Parcelamentos' },
  ]},
  { group: 'Planejamento', items: [
    { path: '/metas', icon: IconTarget, label: 'Metas & Orçamento' },
    { path: '/patrimonio', icon: IconTrendingUp, label: 'Patrimônio' },
    { path: '/relatorios', icon: IconChartBar, label: 'Relatórios' },
  ]},
  { group: '', items: [
    { path: '/configuracoes', icon: IconSettings, label: 'Configurações' },
  ]},
]

export function Sidebar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  return (
    <aside style={{
      width: 230, flexShrink: 0, background: '#FFFDF9',
      borderRight: '0.5px solid #E8E0D5', height: '100dvh',
      position: 'sticky', top: 0, overflowY: 'auto',
      padding: '16px 10px', display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px 20px' }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#C4553B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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
            return (
              <motion.button key={item.path} onClick={() => navigate(item.path)} whileHover={{ x: 2 }}
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: active ? '#FAF0EE' : 'transparent',
                  display: 'flex', alignItems: 'center', gap: 9, textAlign: 'left', marginBottom: 1,
                }}>
                <Icon size={18} stroke={1.8} color={active ? '#C4553B' : '#9B7B6A'} />
                <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: active ? 600 : 500, color: active ? '#C4553B' : '#7A5C4F', flex: 1 }}>
                  {item.label}
                </span>
                {active && <div style={{ width: 3, height: 16, borderRadius: 2, background: '#C4553B' }} />}
              </motion.button>
            )
          })}
        </div>
      ))}
    </aside>
  )
}

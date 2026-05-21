import { motion } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'

const MENU = [
  { group: '', items: [{ path: '/', icon: '⌂', label: 'Dashboard' }] },
  { group: 'Finanças', items: [
    { path: '/contas', icon: '🏦', label: 'Contas' },
    { path: '/cartoes', icon: '💳', label: 'Cartões' },
    { path: '/transacoes', icon: '⇄', label: 'Transações' },
    { path: '/contas-fixas', icon: '↺', label: 'Contas Fixas' },
    { path: '/parcelamentos', icon: '📅', label: 'Parcelamentos' },
  ]},
  { group: 'Planejamento', items: [
    { path: '/metas', icon: '🎯', label: 'Metas & Orçamento' },
    { path: '/patrimonio', icon: '📈', label: 'Patrimônio' },
    { path: '/relatorios', icon: '📊', label: 'Relatórios' },
  ]},
  { group: '', items: [{ path: '/configuracoes', icon: '⚙', label: 'Configurações' }] },
]

export function Sidebar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  return (
    <aside style={{
      width: 240, flexShrink: 0, background: '#FFFDF9',
      borderRight: '0.5px solid #E8E0D5', height: '100dvh',
      position: 'sticky', top: 0, overflowY: 'auto', padding: '20px 12px',
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      {/* Logo */}
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
          {group.items.map(item => (
            <SideItem key={item.path} item={item} active={pathname === item.path} onClick={() => navigate(item.path)} />
          ))}
        </div>
      ))}
    </aside>
  )
}

function SideItem({ item, active, onClick }: { item: { path: string; icon: string; label: string }; active: boolean; onClick: () => void }) {
  return (
    <motion.button onClick={onClick} whileHover={{ x: 2 }}
      style={{
        width: '100%', padding: '9px 10px', borderRadius: 10, border: 'none', cursor: 'pointer',
        background: active ? '#F5E8E4' : 'transparent',
        display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
      }}>
      <span style={{ fontSize: 16 }}>{item.icon}</span>
      <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 600, color: active ? '#C4553B' : '#7A5C4F' }}>{item.label}</span>
      {active && <motion.div layoutId="side-indicator" style={{ width: 3, height: 16, borderRadius: 2, background: '#C4553B', marginLeft: 'auto' }} />}
    </motion.button>
  )
}

import { motion } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'

const NAV = [
  { path: '/', icon: '⌂', label: 'Início' },
  { path: '/transacoes', icon: '⇄', label: 'Transações' },
  { path: '/cartoes', icon: '▣', label: 'Cartões' },
  { path: '/mais', icon: '⋯', label: 'Mais' },
]

interface BottomNavProps { onFab: () => void }

export function BottomNav({ onFab }: BottomNavProps) {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, height: 80,
      background: '#FFFDF9', borderTop: '0.5px solid #E8E0D5',
      display: 'flex', alignItems: 'center',
      paddingBottom: 'env(safe-area-inset-bottom)',
      zIndex: 100,
    }}>
      {NAV.slice(0, 2).map(item => (
        <NavItem key={item.path} item={item} active={pathname === item.path} onClick={() => navigate(item.path)} />
      ))}

      {/* FAB */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <motion.button onClick={onFab}
          whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.08 }}
          style={{
            width: 58, height: 58, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: '#C4553B', color: 'white', fontSize: 28, fontWeight: 300,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginTop: -28, boxShadow: '0 4px 16px rgba(196,85,59,0.4)',
          }}>
          <motion.span animate={{ rotate: [0, 0] }} style={{ lineHeight: 1, marginTop: -2 }}>+</motion.span>
        </motion.button>
      </div>

      {NAV.slice(2).map(item => (
        <NavItem key={item.path} item={item} active={pathname === item.path} onClick={() => navigate(item.path)} />
      ))}
    </nav>
  )
}

function NavItem({ item, active, onClick }: { item: typeof NAV[0]; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, height: '100%', border: 'none', background: 'none', cursor: 'pointer',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
      color: active ? '#C4553B' : '#9B7B6A',
    }}>
      <span style={{ fontSize: 22 }}>{item.icon}</span>
      <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 10, fontWeight: 600 }}>{item.label}</span>
      {active && <motion.div layoutId="nav-indicator" style={{ width: 4, height: 4, borderRadius: '50%', background: '#C4553B' }} />}
    </button>
  )
}

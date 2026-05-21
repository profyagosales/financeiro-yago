import { motion } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'
import { IconLayoutDashboard, IconArrowsExchange, IconPlus, IconCreditCard, IconDotsCircleHorizontal } from '@tabler/icons-react'

const NAV = [
  { path: '/', icon: IconLayoutDashboard, label: 'Início' },
  { path: '/transacoes', icon: IconArrowsExchange, label: 'Transações' },
  { path: '/cartoes', icon: IconCreditCard, label: 'Cartões' },
  { path: '/mais', icon: IconDotsCircleHorizontal, label: 'Mais' },
]

export function BottomNav({ onFab }: { onFab: () => void }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: '#FFFDF9', borderTop: '0.5px solid #E8E0D5',
      display: 'flex', alignItems: 'center', height: 64,
      paddingBottom: 'env(safe-area-inset-bottom)', zIndex: 100,
    }}>
      {NAV.slice(0, 2).map(item => {
        const active = pathname === item.path
        const Icon = item.icon
        return (
          <button key={item.path} onClick={() => navigate(item.path)}
            style={{ flex: 1, height: '100%', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
            <Icon size={22} stroke={active ? 2.2 : 1.6} color={active ? '#C4553B' : '#9B7B6A'} />
            <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: active ? 700 : 500, color: active ? '#C4553B' : '#9B7B6A' }}>{item.label}</span>
          </button>
        )
      })}

      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <motion.button onClick={onFab} whileTap={{ scale: 0.88 }} whileHover={{ scale: 1.06 }}
          style={{ width: 52, height: 52, borderRadius: '50%', border: 'none', cursor: 'pointer', background: '#C4553B', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: -20, boxShadow: '0 4px 16px rgba(196,85,59,0.45)' }}>
          <IconPlus size={26} color="white" stroke={2.5} />
        </motion.button>
      </div>

      {NAV.slice(2).map(item => {
        const active = pathname === item.path
        const Icon = item.icon
        return (
          <button key={item.path} onClick={() => navigate(item.path)}
            style={{ flex: 1, height: '100%', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
            <Icon size={22} stroke={active ? 2.2 : 1.6} color={active ? '#C4553B' : '#9B7B6A'} />
            <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: active ? 700 : 500, color: active ? '#C4553B' : '#9B7B6A' }}>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

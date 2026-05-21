import { motion } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'
import { IconLayoutDashboard, IconArrowsExchange, IconPlus, IconCreditCard, IconDotsCircleHorizontal } from '@tabler/icons-react'
import { useContasFixas, usePagamentosFixos } from '@/db/hooks/useContasFixas'
import { mesAnoAtual } from '@/lib/format'

const NAV = [
  { path: '/', icon: IconLayoutDashboard, label: 'Início' },
  { path: '/transacoes', icon: IconArrowsExchange, label: 'Transações' },
  { path: '/cartoes', icon: IconCreditCard, label: 'Cartões' },
  { path: '/mais', icon: IconDotsCircleHorizontal, label: 'Mais' },
]

function usePendentesCount() {
  const { mes, ano } = mesAnoAtual()
  const fixas = useContasFixas()
  const pags = usePagamentosFixos(mes, ano)
  return fixas.filter(cf => !pags.find(p => p.contaFixaId === cf.id && p.status === 'pago')).length
}

export function BottomNav({ onFab }: { onFab: () => void }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const pendentes = usePendentesCount()

  return (
    <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#FFFDF9', borderTop: '0.5px solid #E8E0D5', display: 'flex', alignItems: 'center', height: 64, paddingBottom: 'env(safe-area-inset-bottom)', zIndex: 100 }}>
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

      {/* FAB */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ position: 'relative', marginTop: -20 }}>
          {pendentes > 0 && (
            <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              style={{ position: 'absolute', inset: -6, borderRadius: '50%', border: '2.5px solid #C4553B', pointerEvents: 'none' }} />
          )}
          <motion.button onClick={onFab} whileTap={{ scale: 0.88 }} whileHover={{ scale: 1.06 }}
            style={{ width: 52, height: 52, borderRadius: '50%', border: 'none', cursor: 'pointer', background: '#C4553B', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 18px rgba(196,85,59,0.45)' }}>
            <IconPlus size={26} color="white" stroke={2.5} />
          </motion.button>
          {pendentes > 0 && (
            <div style={{ position: 'absolute', top: -2, right: -2, width: 16, height: 16, borderRadius: '50%', background: '#D4A017', border: '2px solid #FFFDF9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 700, color: 'white' }}>{pendentes}</span>
            </div>
          )}
        </div>
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

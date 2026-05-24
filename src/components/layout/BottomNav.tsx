import { motion } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'
import { IconLayoutDashboard, IconArrowsExchange, IconPlus, IconCreditCard, IconDotsCircleHorizontal } from '@tabler/icons-react'
import { useContasFixas, usePagamentosFixos } from '@/db/hooks/useContasFixas'
import { mesAnoAtual } from '@/lib/format'
import { sounds, haptic } from '@/lib/sounds'

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
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      // Mesma cor do sidebar desktop (#504E76) — consistência cross-platform.
      // Gradient sutil pra dar profundidade.
      background: 'linear-gradient(180deg, #504E76 0%, #3D3B5F 100%)',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', alignItems: 'center', height: 64,
      paddingBottom: 'env(safe-area-inset-bottom)',
      zIndex: 100,
      boxShadow: '0 -10px 32px rgba(42,30,63,0.4), 0 -1px 0 rgba(255,255,255,0.04)',
    }}>
      {NAV.slice(0, 2).map(item => {
        const active = pathname === item.path
        const Icon = item.icon
        return (
          <button key={item.path}
            aria-label={item.label}
            aria-current={active ? 'page' : undefined}
            onClick={() => { haptic('light'); sounds.navigate(); navigate(item.path) }}
            style={{ flex: 1, height: '100%', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
            <Icon size={22} stroke={active ? 2.4 : 1.6} color={active ? '#F2C745' : 'rgba(255,255,255,0.5)'} />
            <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: active ? 700 : 500, color: active ? '#F2C745' : 'rgba(255,255,255,0.6)' }}>{item.label}</span>
          </button>
        )
      })}

      {/* FAB */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ position: 'relative', marginTop: -20 }}>
          {pendentes > 0 && (
            <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              style={{ position: 'absolute', inset: -6, borderRadius: '50%', border: '2.5px solid #F1642E', pointerEvents: 'none' }} />
          )}
          <motion.button
            aria-label={pendentes > 0 ? `Novo lançamento (${pendentes} pendentes)` : 'Novo lançamento'}
            onClick={() => { haptic('light'); sounds.modal_open(); onFab() }} whileTap={{ scale: 0.88 }} whileHover={{ scale: 1.06 }}
            style={{
              width: 52, height: 52, borderRadius: '50%', border: '3px solid #504E76',
              cursor: 'pointer',
              background: 'linear-gradient(135deg, #F1642E, #C4553B)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 22px rgba(241,100,46,0.55), 0 2px 6px rgba(42,30,63,0.4)',
            }}>
            <IconPlus size={26} color="white" stroke={2.5} />
          </motion.button>
          {pendentes > 0 && (
            <div style={{ position: 'absolute', top: -2, right: -2, width: 16, height: 16, borderRadius: '50%', background: '#F2C745', border: '2px solid #504E76', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 700, color: '#2C1A0F' }}>{pendentes}</span>
            </div>
          )}
        </div>
      </div>

      {NAV.slice(2).map(item => {
        const active = pathname === item.path
        const Icon = item.icon
        return (
          <button key={item.path}
            aria-label={item.label}
            aria-current={active ? 'page' : undefined}
            onClick={() => { haptic('light'); sounds.navigate(); navigate(item.path) }}
            style={{ flex: 1, height: '100%', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
            <Icon size={22} stroke={active ? 2.4 : 1.6} color={active ? '#F2C745' : 'rgba(255,255,255,0.5)'} />
            <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: active ? 700 : 500, color: active ? '#F2C745' : 'rgba(255,255,255,0.6)' }}>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

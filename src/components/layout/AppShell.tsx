import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { FabModal } from './FabModal'
import { PWABanner } from './PWABanner'
import { useUIStore } from '@/store/ui'
import { IconPlus } from '@tabler/icons-react'

// Rotas que controlam a própria altura (master-detail / fixed layout)
// → main não adiciona paddingBottom: 80 (que é pra clearance do FAB/nav mobile)
const FIXED_LAYOUT_ROUTES = new Set([
  '/contas',
  '/cartoes',
  '/transacoes',
  '/contas-fixas',
])
function isFixedLayoutRoute(pathname: string): boolean {
  return FIXED_LAYOUT_ROUTES.has(pathname)
}

function BackgroundMesh() {
  const orbs = [
    { left: '72%', top: '0%',  color: 'rgba(196,85,59,0.32)',  size: 700, dur: 14, delay: 0 },
    { left: '90%', top: '50%', color: 'rgba(58,133,128,0.26)', size: 580, dur: 17, delay: 3 },
    { left: '50%', top: '85%', color: 'rgba(212,160,23,0.22)', size: 500, dur: 20, delay: 6 },
    { left: '12%', top: '28%', color: 'rgba(196,85,59,0.14)',  size: 440, dur: 24, delay: 9 },
  ]
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
      {orbs.map((orb, i) => (
        <motion.div key={i}
          animate={{
            x: [0, 50, -32, 0],
            y: [0, -40, 26, 0],
            scale: [1, 1.08, 0.94, 1],
          }}
          transition={{ duration: orb.dur, repeat: Infinity, ease: 'easeInOut', delay: orb.delay }}
          style={{
            position: 'absolute',
            left: orb.left,
            top: orb.top,
            width: orb.size,
            height: orb.size,
            borderRadius: '50%',
            background: orb.color,
            filter: `blur(${orb.size / 2.4}px)`,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
    </div>
  )
}

export function AppShell() {
  const { fabOpen, fabDefaultContaId, openFab, closeFab } = useUIStore()
  const location = useLocation()

  return (
    <div className="grain" style={{ display: 'flex', height: '100dvh', background: '#FFFFFF', overflow: 'hidden' }}>
      <BackgroundMesh />
      {/* Sidebar — desktop only */}
      <div className="sidebar-desktop">
        <Sidebar />
      </div>

      {/* Main content
          Páginas de layout fixo (master-detail próprio) zeram o
          paddingBottom: 80 (que existe pra clearance de FAB / nav mobile)
          porque elas próprias controlam a altura via 100dvh.            */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.main key={location.pathname}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26, mass: 0.8 }}
          style={{
            flex: 1, overflowY: 'auto', overflowX: 'hidden',
            paddingBottom: isFixedLayoutRoute(location.pathname) ? 0 : 80,
            position: 'relative', zIndex: 1,
          }}
          className="main-content">
          <Outlet />
        </motion.main>
      </AnimatePresence>

      {/* Bottom nav — mobile only */}
      <div className="bottomnav-mobile">
        <BottomNav onFab={() => openFab()} />
      </div>

      {/* Desktop FAB */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 22, delay: 0.3 }}
        whileHover={{ scale: 1.08, boxShadow: '0 12px 32px rgba(196,85,59,0.5)' }}
        whileTap={{ scale: 0.92 }}
        className="fab-desktop"
        onClick={() => openFab()}>
        <motion.div
          animate={fabOpen ? { rotate: 45 } : { rotate: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 22 }}>
          <IconPlus size={26} color="white" stroke={2.5} />
        </motion.div>
      </motion.button>

      {/* FAB backdrop blur */}
      <AnimatePresence>
        {fabOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(44,26,15,0.4)', backdropFilter: 'blur(4px)', zIndex: 190 }}
            onClick={closeFab}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {fabOpen && <FabModal defaultContaId={fabDefaultContaId} onClose={closeFab} />}
      </AnimatePresence>

      <PWABanner />

      <style>{`
        .sidebar-desktop { display: none; }
        .bottomnav-mobile { display: block; }
        .fab-desktop { display: none; }
        @media (min-width: 768px) {
          .sidebar-desktop { display: block; }
          .bottomnav-mobile { display: none !important; }
          .main-content { padding-bottom: 0 !important; }
          .fab-desktop {
            display: flex; align-items: center; justify-content: center;
            position: fixed; bottom: 28px; right: 28px;
            width: 56px; height: 56px; border-radius: 50%;
            background: #C4553B; border: none; cursor: pointer;
            box-shadow: 0 6px 20px rgba(196,85,59,0.45);
            z-index: 100;
          }
        }
      `}</style>
    </div>
  )
}

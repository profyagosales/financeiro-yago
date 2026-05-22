import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { FabModal } from './FabModal'
import { PWABanner } from './PWABanner'
import { useUIStore } from '@/store/ui'
import { IconPlus } from '@tabler/icons-react'

export function AppShell() {
  const { fabOpen, fabDefaultContaId, openFab, closeFab } = useUIStore()
  const location = useLocation()

  return (
    <div style={{ display: 'flex', height: '100dvh', background: '#FAF6F0', overflow: 'hidden' }}>
      {/* Sidebar — desktop only */}
      <div className="sidebar-desktop">
        <Sidebar />
      </div>

      {/* Main content */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.main key={location.pathname}
          initial={{ opacity: 0, y: 20, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, filter: 'blur(2px)' }}
          transition={{ type: 'spring', stiffness: 260, damping: 26, mass: 0.8 }}
          style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingBottom: 80, position: 'relative', zIndex: 1 }}
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

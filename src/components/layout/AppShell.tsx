import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { FabModal } from './FabModal'
import { PWABanner } from './PWABanner'
import { useUIStore } from '@/store/ui'

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
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingBottom: 80 }}
          className="main-content">
          <Outlet />
        </motion.main>
      </AnimatePresence>

      {/* Bottom nav — mobile only */}
      <div className="bottomnav-mobile">
        <BottomNav onFab={() => openFab()} />
      </div>

      {/* Desktop FAB */}
      <button className="fab-desktop" onClick={() => openFab()}>
        <span style={{ fontSize: 28, color: 'white', lineHeight: 1 }}>+</span>
      </button>

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
            z-index: 100; transition: transform .15s;
          }
          .fab-desktop:hover { transform: scale(1.06); }
          .fab-desktop:active { transform: scale(0.92); }
        }
      `}</style>
    </div>
  )
}

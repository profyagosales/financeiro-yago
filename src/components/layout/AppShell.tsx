import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { FabModal } from './FabModal'
import { PWABanner } from './PWABanner'

export function AppShell() {
  const [fabOpen, setFabOpen] = useState(false)

  return (
    <div style={{ display: 'flex', height: '100dvh', background: '#FAF6F0', overflow: 'hidden' }}>
      {/* Sidebar — desktop only */}
      <div className="sidebar-desktop">
        <Sidebar />
      </div>

      {/* Main content */}
      <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingBottom: 80 }} className="main-content">
        <Outlet />
      </main>

      {/* Bottom nav — mobile only */}
      <div className="bottomnav-mobile">
        <BottomNav onFab={() => setFabOpen(true)} />
      </div>

      {/* Desktop FAB */}
      <button className="fab-desktop" onClick={() => setFabOpen(true)}>
        <span style={{ fontSize: 28, color: 'white', lineHeight: 1 }}>+</span>
      </button>

      <AnimatePresence>
        {fabOpen && <FabModal onClose={() => setFabOpen(false)} />}
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

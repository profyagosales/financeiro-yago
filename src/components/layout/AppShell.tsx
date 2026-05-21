import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { FabModal } from './FabModal'
import { PWABanner } from './PWABanner'

export function AppShell() {
  const [fabOpen, setFabOpen] = useState(false)

  return (
    <div style={{ display: 'flex', height: '100dvh', background: '#FAF6F0' }}>
      {/* Desktop sidebar */}
      <div style={{ display: 'none' }} className="desktop-sidebar">
        <Sidebar />
      </div>

      {/* Main content */}
      <main style={{ flex: 1, overflowY: 'auto', paddingBottom: 96 }}>
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <div className="mobile-nav">
        <BottomNav onFab={() => setFabOpen(true)} />
      </div>

      {/* FAB Modal */}
      <AnimatePresence>
        {fabOpen && <FabModal onClose={() => setFabOpen(false)} />}
      </AnimatePresence>
      <PWABanner />

      <style>{`
        @media (min-width: 768px) {
          .desktop-sidebar { display: block !important; }
          .mobile-nav { display: none; }
          main { padding-bottom: 0 !important; }
        }
      `}</style>
    </div>
  )
}

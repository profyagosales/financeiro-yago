import { Outlet, useLocation, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { FabModal } from './FabModal'
import { PWABanner } from './PWABanner'
import { useUIStore } from '@/store/ui'
import { useAutoLock } from '@/hooks/useAutoLock'
import { useNotificationCheck } from '@/hooks/useNotificationCheck'
import { IconPlus, IconAlertTriangle, IconX } from '@tabler/icons-react'
import { initSyncEngine } from '@/lib/sync'
import { setupSyncHooks } from '@/db/hooks/setupSyncHooks'
import { migrateStatusToCanonical } from '@/db/hooks/useTransacoes'
import { garantirPagamentosFuturosTodas } from '@/db/hooks/useContasFixas'
import { onErrorToast } from '@/lib/sounds'

// ─── ErrorToast: escuta CustomEvent disparado por showErrorToast() ───
// Renderiza o último erro por ~4s, com fade-out. Posiciona acima do
// BottomNav em mobile e canto inferior direito em desktop.
// Em rajada de erros, cancela o timer anterior antes de agendar o
// próximo — sem isso, T1 ainda ativo zerava msg de erro novo antes
// do seu próprio prazo.
function ErrorToast() {
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout> | null = null
    const unsub = onErrorToast(detail => {
      if (timerId) clearTimeout(timerId)
      setMsg(detail.message)
      timerId = setTimeout(() => setMsg(null), 4000)
    })
    return () => {
      unsub()
      if (timerId) clearTimeout(timerId)
    }
  }, [])
  return (
    <AnimatePresence>
      {msg && (
        <motion.div
          role="alert"
          aria-live="assertive"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          style={{
            position: 'fixed',
            bottom: 'calc(80px + env(safe-area-inset-bottom))',
            left: '50%', transform: 'translateX(-50%)',
            zIndex: 350,
            background: 'linear-gradient(135deg, #C4553B, #A8442B)',
            color: '#FFFFFF', borderRadius: 14,
            padding: '12px 14px 12px 14px',
            display: 'flex', alignItems: 'center', gap: 10,
            boxShadow: '0 12px 32px rgba(168,68,43,0.45)',
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            maxWidth: 'calc(100vw - 32px)',
            minWidth: 260,
          }}>
          <IconAlertTriangle size={18} stroke={2.2} color="#FFD3A8" style={{ flexShrink: 0 }} />
          <p style={{ flex: 1, fontSize: 13, fontWeight: 600, margin: 0, lineHeight: 1.4 }}>{msg}</p>
          <button
            onClick={() => setMsg(null)}
            aria-label="Fechar aviso"
            style={{
              background: 'rgba(255,255,255,0.18)', border: 'none', borderRadius: 8,
              width: 26, height: 26, cursor: 'pointer', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#FFFFFF',
            }}>
            <IconX size={13} stroke={2.2} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

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
  useAutoLock()
  useNotificationCheck()

  // ── Sync engine: instala hooks + boot única vez por sessão ──
  // ── Migrations idempotentes (status legados → canônico) ──
  // ── Renovação de pagamentos fixos (idempotente): garante 12 meses
  //    futuros pra cada conta fixa ativa. Sem isso, conta cadastrada
  //    há > 12 meses pararia de aparecer na lista mensal.
  useEffect(() => {
    setupSyncHooks()
    void initSyncEngine()
    void migrateStatusToCanonical()
    void garantirPagamentosFuturosTodas()
  }, [])

  // ── PWA shortcut: ?action=new abre o FAB ──
  // Vem dos shortcuts do manifest.webmanifest (right-click no ícone do Dock
  // Safari macOS, long-press no iOS) — sem isso, "Novo lançamento" só abria
  // o dashboard sem ação.
  const [searchParams, setSearchParams] = useSearchParams()
  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      openFab()
      const next = new URLSearchParams(searchParams)
      next.delete('action')
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, openFab, setSearchParams])

  // ── Service Worker update prompt ──
  // Detecta nova versão do SW deployada (registration.waiting) e mostra
  // toast persistente. Sem isso, PWA instalado fica preso em versão velha
  // até user limpar cache manualmente.
  const [swUpdate, setSwUpdate] = useState<ServiceWorker | null>(null)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    let mounted = true
    let updateFoundListener: (() => void) | null = null
    let stateChangeListener: (() => void) | null = null
    let installingSw: ServiceWorker | null = null
    let registration: ServiceWorkerRegistration | null = null

    navigator.serviceWorker.getRegistration().then(reg => {
      if (!reg || !mounted) return
      registration = reg
      if (reg.waiting && navigator.serviceWorker.controller) {
        setSwUpdate(reg.waiting)
      }
      updateFoundListener = () => {
        const nw = reg.installing
        if (!nw) return
        installingSw = nw
        stateChangeListener = () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            setSwUpdate(nw)
          }
        }
        nw.addEventListener('statechange', stateChangeListener)
      }
      reg.addEventListener('updatefound', updateFoundListener)
    })

    let reloading = false
    const onControllerChange = () => {
      if (reloading) return
      reloading = true
      window.location.reload()
    }
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

    return () => {
      mounted = false
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
      if (registration && updateFoundListener) {
        registration.removeEventListener('updatefound', updateFoundListener)
      }
      if (installingSw && stateChangeListener) {
        installingSw.removeEventListener('statechange', stateChangeListener)
      }
    }
  }, [])

  const applyUpdate = () => {
    if (swUpdate) {
      swUpdate.postMessage({ type: 'SKIP_WAITING' })
    }
  }

  return (
    <div className="grain" style={{ display: 'flex', height: '100dvh', background: '#FFFFFF', overflow: 'hidden' }}>
      <div className="bg-mesh-desktop">
        <BackgroundMesh />
      </div>
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

      {/* Error toast — single host renderizado em AppShell.
          Disparado por qualquer handleSave/handleAdd async via showErrorToast() */}
      <ErrorToast />

      {/* SW update prompt: toast persistente quando uma nova versão do
          PWA está pronta. Click "Atualizar" ativa o SW novo e dá reload. */}
      <AnimatePresence>
        {swUpdate && (
          <motion.div
            initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            style={{
              position: 'fixed',
              bottom: 'calc(80px + env(safe-area-inset-bottom))',
              left: '50%', transform: 'translateX(-50%)',
              zIndex: 300,
              background: 'linear-gradient(135deg, #2A1E3F, #504E76)',
              color: '#FFFFFF', borderRadius: 14,
              padding: '14px 18px 14px 16px',
              display: 'flex', alignItems: 'center', gap: 12,
              boxShadow: '0 12px 32px rgba(13,5,25,0.4)',
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              maxWidth: 'calc(100vw - 32px)',
            }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>Nova versão disponível</p>
              <p style={{ fontSize: 11, fontWeight: 500, margin: '2px 0 0', color: 'rgba(255,255,255,0.7)' }}>Atualize pra pegar os fixes mais recentes.</p>
            </div>
            <button onClick={applyUpdate}
              style={{
                background: '#F2C745', color: '#2C1A0F', border: 'none',
                borderRadius: 10, padding: '8px 14px', cursor: 'pointer',
                fontSize: 12, fontWeight: 800, flexShrink: 0,
              }}>Atualizar</button>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .sidebar-desktop { display: none; }
        .bottomnav-mobile { display: block; }
        .fab-desktop { display: none; }
        .bg-mesh-desktop { display: none; }
        /* Em mobile, a main controla seu próprio background.
           Desligamos o BackgroundMesh global (orbs do desktop) e o
           paddingBottom redundante porque o DashboardMobile já reserva
           safe-area no fim do scroll. */
        @media (max-width: 767px) {
          .main-content {
            padding-bottom: 0 !important;
          }
        }
        @media (min-width: 768px) {
          .sidebar-desktop { display: block; }
          .bottomnav-mobile { display: none !important; }
          .main-content { padding-bottom: 0 !important; }
          .bg-mesh-desktop { display: block; }
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

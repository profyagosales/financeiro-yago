import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// ─── STALE CHUNK AUTO-RECOVERY ──────────────────────────────────────
// PWA standalone cacheia HTML antigo apontando pra hashes de chunks que
// não existem mais (Vercel deleta chunks antigos a cada deploy). Quando
// React lazy() tenta importar → 404 → "Importing a module script failed".
//
// Estratégia: detectar esse erro específico, unregistrar SW + clear
// todos caches + reload UMA vez. Flag em sessionStorage evita loop
// infinito (se reload não resolver, mostra ErrorBoundary normal).
const STALE_RELOAD_KEY = 'fy:stale-chunk-reload-attempted'

async function recoverFromStaleChunk(reason: string) {
  console.warn('[stale-chunk] recovery triggered:', reason)
  try {
    if (sessionStorage.getItem(STALE_RELOAD_KEY)) {
      console.warn('[stale-chunk] reload já tentado nesta sessão — aborto pra evitar loop')
      return  // ErrorBoundary vai pegar
    }
    sessionStorage.setItem(STALE_RELOAD_KEY, String(Date.now()))
    // Unregistra SW + limpa todos caches
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map(r => r.unregister()))
    }
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map(k => caches.delete(k)))
    }
    // Force reload sem cache
    window.location.reload()
  } catch (e) {
    console.error('[stale-chunk] recovery failed:', e)
  }
}

// Detecta erros globais de import de chunk
window.addEventListener('error', e => {
  const msg = e.message || ''
  if (msg.includes('Importing a module script failed')
      || msg.includes('Failed to fetch dynamically imported module')
      || msg.includes('error loading dynamically imported module')) {
    void recoverFromStaleChunk(msg)
  }
})
window.addEventListener('unhandledrejection', e => {
  const msg = e.reason?.message || String(e.reason || '')
  if (msg.includes('Importing a module script failed')
      || msg.includes('Failed to fetch dynamically imported module')
      || msg.includes('error loading dynamically imported module')) {
    void recoverFromStaleChunk(msg)
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>
)

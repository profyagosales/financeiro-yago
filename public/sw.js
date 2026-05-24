// ─── Service Worker — Financeiro do Yago ───────────────────────────
// Cache-first pra assets estáticos (HTML/CSS/JS/imagens),
// Network-first pra qualquer outra requisição (APIs).
//
// O service worker mantém o app rodando offline depois da primeira
// visita: ícones, fontes, JS bundle, etc ficam cacheados.

const CACHE_NAME = 'financeiro-yago-v1'
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icon-192.svg',
  '/icon-512.svg',
  '/apple-touch-icon.svg',
]

// Install: pré-cache dos assets core
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS).catch(() => { /* alguns assets podem falhar em dev */ }))
      .then(() => self.skipWaiting())
  )
})

// Activate: limpa caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  )
})

// Notificação clicada: abre a URL no app (se já aberto, foca; senão, abre)
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      // Se já tem janela do app aberta, foca nela e navega
      for (const w of wins) {
        if ('focus' in w) {
          w.focus()
          if ('navigate' in w) {
            try { w.navigate(url) } catch { /* fallback abaixo */ }
          }
          return
        }
      }
      // Senão, abre nova janela
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})

// Push real (futuro — quando houver servidor com VAPID)
self.addEventListener('push', (event) => {
  if (!event.data) return
  try {
    const payload = event.data.json()
    event.waitUntil(
      self.registration.showNotification(payload.title || 'Financeiro do Yago', {
        body: payload.body || '',
        icon: '/icon-192.svg',
        badge: '/favicon.svg',
        data: { url: payload.url || '/' },
      })
    )
  } catch {
    /* ignore */
  }
})

// Fetch: estratégia híbrida
self.addEventListener('fetch', (event) => {
  const req = event.request

  // Só GET
  if (req.method !== 'GET') return

  const url = new URL(req.url)

  // Bypassar APIs externas (CoinGecko, Brapi, AwesomeAPI) — sempre network
  if (url.hostname.includes('coingecko.com') ||
      url.hostname.includes('brapi.dev') ||
      url.hostname.includes('awesomeapi.com.br')) {
    return // navegador segue padrão
  }

  // Assets estáticos (mesmo origin): cache-first
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached
        return fetch(req).then((res) => {
          // Cacheia sucesso 200 (não cripto/POST)
          if (res.ok && res.type === 'basic') {
            const clone = res.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone))
          }
          return res
        }).catch(() => {
          // Offline + sem cache: tenta index.html (SPA fallback)
          if (req.mode === 'navigate') return caches.match('/index.html')
          return new Response('', { status: 504, statusText: 'Offline' })
        })
      })
    )
  }
})

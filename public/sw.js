// ─── Service Worker — Financeiro do Yago ───────────────────────────
// Cache-first pra assets estáticos (HTML/CSS/JS/imagens),
// Network-first pra qualquer outra requisição (APIs).
//
// O service worker mantém o app rodando offline depois da primeira
// visita: ícones, fontes, JS bundle, etc ficam cacheados.

const CACHE_NAME = 'financeiro-yago-v5-update-prompt'
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/favicon-32.png',
  '/favicon-16.png',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/notification-icon.png',
  '/brand/notification-badge.svg',
]

// Install: pré-cache dos assets core. NÃO faz skipWaiting automático —
// o client (AppShell) detecta `registration.waiting` e mostra toast pro
// user; só quando ele clica "Atualizar" mandamos SKIP_WAITING aqui.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS).catch(() => { /* alguns assets podem falhar em dev */ }))
  )
})

// Mensagens do client: 'SKIP_WAITING' ativa a versão nova imediatamente.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// Activate: limpa caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  )
})

// ─── Notification click ────────────────────────────────────────────
// Suporta ações (botões dentro da notificação). action vazio = corpo clicado.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const data = event.notification.data || {}
  const action = event.action

  // Se a ação tem URL própria (ex: "Marcar como pago" leva pra /contas-fixas),
  // usa ela. Senão, fallback pro data.url.
  let url = data.url || '/'
  if (action && data.actions && data.actions[action]) {
    url = data.actions[action]
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ('focus' in w) {
          w.focus()
          if ('navigate' in w) {
            try { w.navigate(url) } catch { /* noop */ }
          }
          return
        }
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})

// ─── Push real (web push via VAPID) ───────────────────────────────
// Payload esperado do servidor:
// {
//   title:    string        (obrigatório)
//   body:     string        (obrigatório)
//   url:      string?       (URL ao clicar, default '/')
//   tag:      string?       (notifs com mesmo tag se substituem)
//   image:    string?       (preview grande dentro da notif)
//   badge:    string?       (silhueta override)
//   icon:     string?       (ícone override)
//   actions:  Array<{action, title, icon?}>  (botões)
//   actionsUrls: { [action]: url }   (mapa ação→URL)
//   requireInteraction: boolean   (não some sozinho)
//   silent: boolean
//   renotify: boolean
//   vibrate: number[]
// }
self.addEventListener('push', (event) => {
  if (!event.data) return
  try {
    const p = event.data.json()
    const options = {
      body: p.body || '',
      // PNG: Safari macOS renderiza mal SVG em notificações
      icon: p.icon || '/notification-icon.png',
      badge: p.badge || '/brand/notification-badge.svg',
      image: p.image,
      tag: p.tag || undefined,
      renotify: p.renotify === true,
      requireInteraction: p.requireInteraction === true,
      // Safari quebra com silent: true — só passa se for explicitamente true
      silent: p.silent === true ? true : undefined,
      vibrate: p.vibrate || [80, 40, 80],
      timestamp: Date.now(),
      actions: Array.isArray(p.actions) ? p.actions.slice(0, 2) : undefined,
      data: {
        url: p.url || '/',
        actions: p.actionsUrls || {},
      },
    }
    event.waitUntil(
      self.registration.showNotification(p.title || 'Financeiro do Yago', options),
    )
  } catch (e) {
    // Fallback texto bruto
    const text = event.data.text() || 'Você tem uma novidade financeira'
    event.waitUntil(
      self.registration.showNotification('Financeiro do Yago', {
        body: text,
        icon: '/notification-icon.png',
        badge: '/brand/notification-badge.svg',
      }),
    )
  }
})

// ─── Notification close (telemetria opcional) ─────────────────────
self.addEventListener('notificationclose', () => {
  // Hook pra futuro: contabilizar dismissals e ajustar agressividade
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

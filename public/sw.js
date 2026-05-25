// ─── Service Worker — Financeiro do Yago ───────────────────────────
// Cache-first pra assets estáticos (HTML/CSS/JS/imagens),
// Network-first pra qualquer outra requisição (APIs).
//
// O service worker mantém o app rodando offline depois da primeira
// visita: ícones, fontes, JS bundle, etc ficam cacheados.

const CACHE_NAME = 'financeiro-yago-v19-r12i-bundle-split'
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
// R12f: skipWaiting() AUTOMÁTICO. Era opt-in (só via SKIP_WAITING msg do
// client), mas user reportou que PWA Mac/iPhone ficava preso em versões
// antigas mesmo após múltiplos deploys. Cada deploy gera novos hashes de
// chunk, e SW velho servia HTML cached apontando pra hashes deletados →
// 404 em loop → ErrorBoundary. Aceitar troca imediata é o trade-off certo
// pra app financeiro com user único: zero risco de race entre dois clientes.
self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS).catch(() => { /* alguns assets podem falhar em dev */ }))
  )
})

// Mensagens do client: 'SKIP_WAITING' redundante mas mantido pra compat.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// Activate: limpa TODOS caches antigos + claim imediato pros clients
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

  // Estratégia compatível Safari/iOS: w.navigate() é non-standard e joga em
  // Safari. Em vez disso, postMessage pro client e ele navega via React Router.
  // Fallback: openWindow se não houver janela aberta.
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ('focus' in w) {
          w.focus()
          try {
            w.postMessage({ type: 'NAVIGATE', url })
          } catch { /* noop */ }
          // Tenta navigate() (Chromium) como reforço — wrap no try
          if ('navigate' in w) {
            try { w.navigate(url) } catch { /* Safari joga: noop */ }
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
    // iOS Safari PWA suporta 0 actions → passar `actions` quebra a notif.
    // Safari macOS suporta 2, Chromium até 4. Respeitar limite do browser.
    const maxActions = (typeof Notification !== 'undefined' && 'maxActions' in Notification)
      ? Notification.maxActions
      : 0
    const safeActions = Array.isArray(p.actions) && maxActions > 0
      ? p.actions.slice(0, maxActions)
      : undefined
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
      actions: safeActions,
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

// Fetch: estratégia diferenciada por tipo de recurso.
//
// Hashed assets em /assets/ (Vite gera nome único por build): cache-first
// permanente — o conteúdo NUNCA muda pra mesma URL.
//
// Documentos HTML e navegações (incluindo index.html, /transacoes, etc):
// network-first com fallback pra cache — assim novo deploy sempre traz a
// HTML mais recente que referencia os chunks novos. Sem isso, SW velho
// servia HTML cacheada que apontava pra chunks antigos já deletados do
// Vercel — Vercel respondia /index.html pra qualquer asset missing, o
// browser tentava parsear como JS module e falhava com MIME type error.
//
// Resposta com Content-Type text/html nunca é cacheada como JS/CSS
// (defesa em profundidade contra recidiva).
self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)

  // APIs externas (CoinGecko, Brapi, AwesomeAPI): sempre network direto.
  if (url.hostname.includes('coingecko.com') ||
      url.hostname.includes('brapi.dev') ||
      url.hostname.includes('awesomeapi.com.br')) {
    return
  }
  if (url.origin !== self.location.origin) return

  // /api/* (Vercel Functions, futuro): sempre pass-through, nunca cache.
  if (url.pathname.startsWith('/api/')) return

  const isHashedAsset = url.pathname.startsWith('/assets/')
  const isNavigation = req.mode === 'navigate' ||
                       (req.headers.get('accept') || '').includes('text/html')

  // 1. Hashed assets: cache-first permanente
  if (isHashedAsset) {
    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(res => {
        if (res.ok && res.type === 'basic') {
          const ct = res.headers.get('content-type') || ''
          // Recusa cachear se Vercel devolveu HTML pra um chunk (servidor
          // mal configurado / chunk não existe) — evita poisoning do cache.
          if (!ct.includes('text/html')) {
            const clone = res.clone()
            caches.open(CACHE_NAME).then(cache => cache.put(req, clone))
          }
        }
        return res
      }).catch(() => new Response('', { status: 504, statusText: 'Offline' })))
    )
    return
  }

  // 2. HTML / navegações: network-first, fallback pra cache (offline).
  if (isNavigation) {
    event.respondWith(
      fetch(req).then(res => {
        if (res.ok) {
          const clone = res.clone()
          caches.open(CACHE_NAME).then(cache => cache.put('/index.html', clone))
        }
        return res
      }).catch(() => caches.match('/index.html').then(c => c || caches.match(req)).then(c =>
        c || new Response('Offline', { status: 504, headers: { 'content-type': 'text/plain' } })
      ))
    )
    return
  }

  // 3. Outros same-origin (favicons, manifest, fonts, etc): cache-first
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      if (res.ok && res.type === 'basic') {
        const clone = res.clone()
        caches.open(CACHE_NAME).then(cache => cache.put(req, clone))
      }
      return res
    }).catch(() => new Response('', { status: 504, statusText: 'Offline' })))
  )
})

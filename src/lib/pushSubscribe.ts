// ─── Web Push: subscribe + send pra Supabase ────────────────────────
// Registra esta instância do app no servidor pra receber push notifications.
// Compatível com:
//   - macOS Safari 16.1+ / Chrome / Firefox / Edge
//   - iOS 16.4+ (apenas se instalado como PWA via "Add to Home Screen")
//
// Salvamos endpoint + chaves (p256dh, auth) na tabela push_subscriptions
// do Supabase. A Edge Function 'notify-pending' lê essa tabela diariamente
// e envia push notifications com web-push (VAPID).

import { supabase, getUserId } from '@/lib/supabase'

// VAPID public key — vem do env (ou fallback hardcoded gerado no setup)
const VAPID_PUBLIC_KEY = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined)
  ?? 'BI2B8yH2vLzEPPbj1ura5cfk5VvdbmBUGQMIQYp50QGzB0gZL7UDpI9D2Aujstr6qDej4iiL7h2DQtJVTxYXgTA'

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i)
  return out
}

function arrayBufferToBase64Url(buffer: ArrayBuffer | null): string {
  if (!buffer) return ''
  const bytes = new Uint8Array(buffer)
  let str = ''
  for (let i = 0; i < bytes.byteLength; i += 1) str += String.fromCharCode(bytes[i])
  return btoa(str).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function deviceName(): string {
  const ua = navigator.userAgent
  if (/iPhone/i.test(ua)) return 'iPhone'
  if (/iPad/i.test(ua)) return 'iPad'
  if (/Macintosh/i.test(ua)) return 'Mac'
  if (/Android/i.test(ua)) return 'Android'
  if (/Windows/i.test(ua)) return 'Windows'
  return 'Browser'
}

// Verifica se push está disponível neste device.
export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false
  return 'serviceWorker' in navigator && 'PushManager' in window
}

// Pede permissão (se ainda não pediu) + subscribe + envia pro Supabase.
// Idempotente: chamar várias vezes só substitui o registro (mesmo endpoint).
export async function subscribePush(): Promise<{ ok: boolean; reason?: string }> {
  if (!isPushSupported()) return { ok: false, reason: 'Push não suportado neste device' }

  const userId = await getUserId()
  if (!userId) return { ok: false, reason: 'Faça login primeiro' }

  // Permissão
  if (Notification.permission === 'denied') {
    return { ok: false, reason: 'Permissão de notificação negada' }
  }
  if (Notification.permission !== 'granted') {
    const perm = await Notification.requestPermission()
    if (perm !== 'granted') return { ok: false, reason: 'Permissão não concedida' }
  }

  try {
    const reg = await navigator.serviceWorker.ready

    // Já tem subscription? Reutiliza
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
      })
    }

    const endpoint = sub.endpoint
    const p256dh = arrayBufferToBase64Url(sub.getKey('p256dh'))
    const auth = arrayBufferToBase64Url(sub.getKey('auth'))

    // Upsert no Supabase
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        endpoint,
        p256dh,
        auth,
        device_name: deviceName(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,endpoint' })

    if (error) return { ok: false, reason: error.message }
    return { ok: true }
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e) }
  }
}

// Cancela subscription local + remove do servidor
export async function unsubscribePush(): Promise<boolean> {
  if (!isPushSupported()) return false
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) {
      await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
      await sub.unsubscribe()
    }
    return true
  } catch {
    return false
  }
}

// Verifica se este device já tem subscription ativa.
export async function isSubscribed(): Promise<boolean> {
  if (!isPushSupported()) return false
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    return !!sub
  } catch {
    return false
  }
}

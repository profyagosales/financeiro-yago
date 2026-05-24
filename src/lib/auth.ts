// ─── Helpers de auth (Supabase + PIN local) ─────────────────────────
// Estratégia híbrida:
//   - Supabase: identidade da conta (email), sync entre dispositivos,
//     RLS no banco. Sessão dura ~1 ano (auto-refresh).
//   - PIN local: protege o app no dispositivo (4-6 dígitos, hash sha256
//     salvo em IndexedDB). Cada device tem seu próprio PIN.
//
// Fluxo:
//   1. Sem sessão → Welcome (email + magic link)
//   2. Sessão sem PIN local → CreatePin (define PIN)
//   3. Sessão + PIN → PinGate (digita PIN)

import { supabase } from './supabase'

export type AuthStep = 'loading' | 'welcome' | 'check-email' | 'create-pin' | 'pin-gate' | 'ready'

// ─── Magic link (legado — não usado mais, mantido pra compat) ────────
export async function sendMagicLink(email: string): Promise<{ ok: boolean; error?: string }> {
  const cleanEmail = email.trim().toLowerCase()
  if (!cleanEmail || !cleanEmail.includes('@')) return { ok: false, error: 'Email inválido' }
  const { error } = await supabase.auth.signInWithOtp({
    email: cleanEmail,
    options: { emailRedirectTo: window.location.origin },
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

// ─── Email + senha ───────────────────────────────────────────────────
export async function signInWithPassword(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  const cleanEmail = email.trim().toLowerCase()
  if (!cleanEmail || !cleanEmail.includes('@')) return { ok: false, error: 'Email inválido' }
  if (!password || password.length < 6) return { ok: false, error: 'Senha precisa ter pelo menos 6 caracteres' }
  const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password })
  if (error) {
    // Mensagens mais humanas
    if (/invalid login/i.test(error.message)) return { ok: false, error: 'Email ou senha incorretos' }
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

export async function signUpWithPassword(email: string, password: string): Promise<{ ok: boolean; error?: string; needsConfirmation?: boolean }> {
  const cleanEmail = email.trim().toLowerCase()
  if (!cleanEmail || !cleanEmail.includes('@')) return { ok: false, error: 'Email inválido' }
  if (!password || password.length < 8) return { ok: false, error: 'Senha precisa ter pelo menos 8 caracteres' }
  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
    options: { emailRedirectTo: window.location.origin },
  })
  if (error) {
    if (/already registered/i.test(error.message)) return { ok: false, error: 'Email já cadastrado — use Entrar' }
    return { ok: false, error: error.message }
  }
  // Se confirmação de email está ativa, session vem null
  const needsConfirmation = !data.session
  return { ok: true, needsConfirmation }
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
}

// ─── PIN local (hash em IndexedDB) ───────────────────────────────────
const STORAGE_PIN_HASH = 'fy-pin-hash'
const STORAGE_PIN_SALT = 'fy-pin-salt'

async function sha256(str: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function randomSalt(): string {
  const arr = new Uint8Array(16)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

export function hasPinSet(): boolean {
  try { return !!localStorage.getItem(STORAGE_PIN_HASH) } catch { return false }
}

export async function setPin(pin: string): Promise<void> {
  const salt = randomSalt()
  const hash = await sha256(salt + pin)
  try {
    localStorage.setItem(STORAGE_PIN_SALT, salt)
    localStorage.setItem(STORAGE_PIN_HASH, hash)
  } catch { /* noop */ }
}

export async function verifyPin(pin: string): Promise<boolean> {
  try {
    const salt = localStorage.getItem(STORAGE_PIN_SALT)
    const stored = localStorage.getItem(STORAGE_PIN_HASH)
    if (!salt || !stored) return false
    const hash = await sha256(salt + pin)
    return hash === stored
  } catch { return false }
}

export function clearPin(): void {
  try {
    localStorage.removeItem(STORAGE_PIN_HASH)
    localStorage.removeItem(STORAGE_PIN_SALT)
  } catch { /* noop */ }
}

export async function changePin(oldPin: string, newPin: string): Promise<boolean> {
  if (!hasPinSet()) {
    // Sem PIN ainda: aceita o novo direto
    await setPin(newPin)
    return true
  }
  const ok = await verifyPin(oldPin)
  if (!ok) return false
  await setPin(newPin)
  return true
}

// ─── Session ─────────────────────────────────────────────────────────
export async function getCurrentEmail(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.email ?? null
}

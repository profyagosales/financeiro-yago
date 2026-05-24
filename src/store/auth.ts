import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { hasPinSet, verifyPin, setPin as setPinLocal, changePin as changePinLocal, clearPin } from '@/lib/auth'

const SESSION_KEY = 'fy-session-active'

// ─── Estado ──────────────────────────────────────────────────────────
// Combinação de:
//   - hasSession: usuário tem sessão Supabase válida (identidade)
//   - hasPin: este device tem PIN local definido
//   - isUnlocked: PIN local foi inserido nesta abertura
//   - email: email do user logado (se hasSession)
//   - loading: ainda verificando estado inicial
//
// Pra usar o app: precisa hasSession && hasPin && isUnlocked

interface AuthState {
  loading: boolean
  hasSession: boolean
  hasPin: boolean
  isUnlocked: boolean
  email: string | null

  // Inicializa: verifica Supabase session + estado local
  init: () => Promise<void>

  // Após magic link confirmar, refresha o estado
  refresh: () => Promise<void>

  // PIN local
  unlock: (pin: string) => Promise<boolean>
  lock: () => void
  setPin: (pin: string) => Promise<void>
  changePin: (oldPin: string, newPin: string) => Promise<boolean>
  resetPin: () => void  // wipe PIN e força criar novo

  // Logout completo (Supabase + PIN local)
  signOut: () => Promise<void>

  // Compat com código antigo
  checkSession: () => void
  pinHash?: string  // legado — não usar
}

function isSessionActive(): boolean {
  try { return sessionStorage.getItem(SESSION_KEY) === '1' } catch { return false }
}
function setSessionActive(v: boolean) {
  try { if (v) sessionStorage.setItem(SESSION_KEY, '1'); else sessionStorage.removeItem(SESSION_KEY) } catch { /* noop */ }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  loading: true,
  hasSession: false,
  hasPin: false,
  isUnlocked: false,
  email: null,

  init: async () => {
    const { data } = await supabase.auth.getSession()
    const hasSession = !!data.session
    const email = data.session?.user?.email ?? null
    const hasPin = hasPinSet()
    const isUnlocked = hasSession && hasPin && isSessionActive()
    set({ loading: false, hasSession, hasPin, isUnlocked, email })

    // Listener: muda quando user clica magic link, session expira, etc
    supabase.auth.onAuthStateChange((_event, session) => {
      const newHasSession = !!session
      const newEmail = session?.user?.email ?? null
      set({
        hasSession: newHasSession,
        email: newEmail,
        // Se perdeu sessão, trava tudo
        isUnlocked: newHasSession ? get().isUnlocked : false,
      })
      if (!newHasSession) setSessionActive(false)
    })
  },

  refresh: async () => {
    const { data } = await supabase.auth.getSession()
    const hasSession = !!data.session
    const email = data.session?.user?.email ?? null
    const hasPin = hasPinSet()
    set({ hasSession, email, hasPin })
  },

  unlock: async (pin: string) => {
    const ok = await verifyPin(pin)
    if (ok) {
      set({ isUnlocked: true })
      setSessionActive(true)
    }
    return ok
  },

  lock: () => {
    set({ isUnlocked: false })
    setSessionActive(false)
  },

  setPin: async (pin: string) => {
    await setPinLocal(pin)
    set({ hasPin: true, isUnlocked: true })
    setSessionActive(true)
  },

  changePin: async (oldPin: string, newPin: string) => {
    const ok = await changePinLocal(oldPin, newPin)
    if (ok) set({ hasPin: true })
    return ok
  },

  resetPin: () => {
    clearPin()
    set({ hasPin: false, isUnlocked: false })
    setSessionActive(false)
  },

  signOut: async () => {
    await supabase.auth.signOut()
    clearPin()
    setSessionActive(false)
    set({ hasSession: false, hasPin: false, isUnlocked: false, email: null })
  },

  // Compat: alguns lugares ainda chamam isso
  checkSession: () => { /* substituído por init() */ },
}))

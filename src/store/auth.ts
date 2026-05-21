import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const SESSION_KEY = 'fy-session-active'
const DEFAULT_PIN_HASH = '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92'

async function sha256(str: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function isSessionActive(): boolean {
  try { return sessionStorage.getItem(SESSION_KEY) === '1' } catch { return false }
}
function setSessionActive(v: boolean) {
  try { if (v) sessionStorage.setItem(SESSION_KEY, '1'); else sessionStorage.removeItem(SESSION_KEY) } catch {}
}

interface AuthState {
  isUnlocked: boolean
  pinHash: string
  unlock: (pin: string) => Promise<boolean>
  lock: () => void
  setPin: (old: string, neo: string) => Promise<boolean>
  checkSession: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isUnlocked: isSessionActive(),
      pinHash: DEFAULT_PIN_HASH,
      checkSession: () => { if (isSessionActive()) set({ isUnlocked: true }) },
      unlock: async (pin) => {
        const h = await sha256(pin)
        if (h === get().pinHash) {
          set({ isUnlocked: true })
          setSessionActive(true)
          return true
        }
        return false
      },
      lock: () => { set({ isUnlocked: false }); setSessionActive(false) },
      setPin: async (old, neo) => {
        if (await sha256(old) !== get().pinHash) return false
        set({ pinHash: await sha256(neo) }); return true
      },
    }),
    { name: 'fy-auth', partialize: (s) => ({ pinHash: s.pinHash }) }
  )
)

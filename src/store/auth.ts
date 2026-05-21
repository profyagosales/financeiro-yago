import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const DEFAULT_PIN_HASH = '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92' // 123456

async function sha256(str: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

interface AuthState {
  isUnlocked: boolean; pinHash: string; lastActivity: number
  unlock: (pin: string) => Promise<boolean>
  lock: () => void
  setPin: (old: string, neo: string) => Promise<boolean>
  touch: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isUnlocked: false, pinHash: DEFAULT_PIN_HASH, lastActivity: Date.now(),
      unlock: async (pin) => {
        const h = await sha256(pin)
        if (h === get().pinHash) { set({ isUnlocked: true, lastActivity: Date.now() }); return true }
        return false
      },
      lock: () => set({ isUnlocked: false }),
      setPin: async (old, neo) => {
        if (await sha256(old) !== get().pinHash) return false
        set({ pinHash: await sha256(neo) }); return true
      },
      touch: () => {
        if (get().isUnlocked && Date.now() - get().lastActivity > 300000) set({ isUnlocked: false })
        else set({ lastActivity: Date.now() })
      },
    }),
    { name: 'fy-auth', partialize: (s) => ({ pinHash: s.pinHash }) }
  )
)

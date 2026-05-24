import { useEffect } from 'react'
import { useAuthStore } from '@/store/auth'
import { useAppPreferences } from '@/db/hooks/useAppConfig'

// ─── Auto-lock por inatividade ───────────────────────────────────────
// Lê a preferência autoLockMin (0 = nunca) e, quando > 0, dispara
// lock() do auth se o user ficar X minutos sem mover mouse, tocar
// teclado ou tela. Reseta o timer a cada interação.
export function useAutoLock() {
  const prefs = useAppPreferences()
  const { lock, isUnlocked } = useAuthStore()
  const minutes = prefs.autoLockMin ?? 0

  useEffect(() => {
    if (!isUnlocked) return
    if (!minutes || minutes <= 0) return

    let timer: ReturnType<typeof setTimeout> | null = null
    const ms = minutes * 60 * 1000

    const reset = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => lock(), ms)
    }

    const events = ['mousemove', 'keydown', 'touchstart', 'pointerdown', 'wheel', 'scroll']
    events.forEach(e => window.addEventListener(e, reset, { passive: true }))
    reset() // inicia o timer

    return () => {
      if (timer) clearTimeout(timer)
      events.forEach(e => window.removeEventListener(e, reset))
    }
  }, [minutes, isUnlocked, lock])
}

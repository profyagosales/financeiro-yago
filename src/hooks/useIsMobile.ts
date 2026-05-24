// ─── useIsMobile: detecta viewport mobile ──────────────────────────
// SSR-safe, usa matchMedia + listener pra atualizar em rotation/resize.

import { useEffect, useState } from 'react'

const MOBILE_BREAKPOINT = 768  // px — mesmo do sidebar-desktop

export function useIsMobile(breakpoint: number = MOBILE_BREAKPOINT): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(`(max-width: ${breakpoint - 1}px)`).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    // addEventListener é mais novo; alguns navegadores antigos usam addListener
    if (mq.addEventListener) mq.addEventListener('change', handler)
    else mq.addListener(handler)
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', handler)
      else mq.removeListener(handler)
    }
  }, [breakpoint])

  return isMobile
}

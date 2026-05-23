import { useEffect } from 'react'

// ─── Body scroll lock ───────────────────────────────────────────────
// Trava o scroll do <body> enquanto algo está aberto (modal, drawer, sheet).
// Suporta múltiplas chamadas simultâneas via contador global — só destrava
// quando todos os locks foram liberados.
//
// Uso:
//   useBodyScrollLock(modalOpen)
//
// O scrollbar gutter é preservado para evitar layout shift.

let lockCount = 0
let savedScrollY = 0
let savedBodyStyles: { overflow: string; position: string; top: string; width: string; paddingRight: string } | null = null

function applyLock() {
  if (lockCount === 0) {
    savedScrollY = window.scrollY
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    savedBodyStyles = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
      paddingRight: document.body.style.paddingRight,
    }
    // Usa position:fixed para travar 100% (Safari iOS-friendly)
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${savedScrollY}px`
    document.body.style.width = '100%'
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`
  }
  lockCount += 1
}

function releaseLock() {
  if (lockCount > 0) lockCount -= 1
  if (lockCount === 0 && savedBodyStyles) {
    document.body.style.overflow = savedBodyStyles.overflow
    document.body.style.position = savedBodyStyles.position
    document.body.style.top = savedBodyStyles.top
    document.body.style.width = savedBodyStyles.width
    document.body.style.paddingRight = savedBodyStyles.paddingRight
    window.scrollTo(0, savedScrollY)
    savedBodyStyles = null
  }
}

export function useBodyScrollLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    applyLock()
    return () => releaseLock()
  }, [enabled])
}

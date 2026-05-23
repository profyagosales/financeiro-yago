import { useEffect } from 'react'

// ─── Scroll lock ────────────────────────────────────────────────────
// Trava o scroll da página enquanto algo está aberto (modal, drawer, sheet).
//
// Detalhe importante deste app:
//   O <body> NÃO é o elemento que rola — quem rola é <main class="main-content">
//   dentro do AppShell (display:flex, height:100dvh). Por isso travar apenas o
//   body não faz nada. O hook trava o elemento que realmente scrolla.
//
// Suporta múltiplos locks simultâneos via contador (só destrava quando o
// último consumidor desmonta).

let lockCount = 0
let savedScrollTop = 0
let savedOverflow = ''
let lockedEl: HTMLElement | null = null

function getScrollContainer(): HTMLElement | null {
  // Preferência: o <main> do AppShell, que é o container scrollável real.
  const main = document.querySelector<HTMLElement>('main.main-content')
  if (main) return main
  // Fallback: documentElement (caso o layout mude no futuro).
  return document.documentElement
}

function applyLock() {
  if (lockCount === 0) {
    const el = getScrollContainer()
    if (el) {
      lockedEl = el
      savedScrollTop = el.scrollTop
      savedOverflow = el.style.overflow
      // overflow:hidden trava o scroll; height fixa pra Safari iOS não dar bounce.
      el.style.overflow = 'hidden'
      // Para o body também (defesa em profundidade caso o app rode em layout
      // alternativo onde o body é o scrollable).
      document.body.style.overflow = 'hidden'
    }
  }
  lockCount += 1
}

function releaseLock() {
  if (lockCount > 0) lockCount -= 1
  if (lockCount === 0 && lockedEl) {
    lockedEl.style.overflow = savedOverflow
    document.body.style.overflow = ''
    // Restaura scrollTop no próximo frame pra evitar flicker.
    requestAnimationFrame(() => {
      if (lockedEl) lockedEl.scrollTop = savedScrollTop
      lockedEl = null
    })
  }
}

export function useBodyScrollLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    applyLock()
    return () => releaseLock()
  }, [enabled])
}

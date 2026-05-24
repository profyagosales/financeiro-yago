// ─── useFocusTrap ──────────────────────────────────────────────────
// Mantém o foco preso dentro de um container (Modal, dialog, sheet)
// quando ativo. Implementa:
//   1. AUTO-FOCUS: ao abrir, foca o primeiro elemento interativo (ou
//      o próprio container se nenhum focável existir).
//   2. TRAP: Tab/Shift+Tab cicla apenas entre elementos focáveis DENTRO
//      do container. Sem isso, teclado vaza pro background (BottomNav,
//      Sidebar, etc).
//   3. RESTORE: ao fechar, devolve foco pro elemento que estava ativo
//      antes do open (cumprimento de WCAG 2.4.3).
//
// Uso:
//   const ref = useRef<HTMLDivElement>(null)
//   useFocusTrap(ref, open)
//   <div ref={ref} role="dialog">...</div>

import { useEffect, type RefObject } from 'react'

// Seletor de elementos tabbable (não inclui [tabindex="-1"] que é skip).
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',')

function getFocusables(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter(el => {
      // Filtra elementos invisíveis (display:none ou hidden)
      const style = window.getComputedStyle(el)
      return style.display !== 'none' && style.visibility !== 'hidden'
    })
}

export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
) {
  useEffect(() => {
    if (!active) return
    const container = containerRef.current
    if (!container) return

    // 1. Salva o elemento focado anteriormente pra restaurar depois
    const previouslyFocused = document.activeElement as HTMLElement | null

    // 2. AUTO-FOCUS: primeiro focusable ou o próprio container
    // Pequeno delay pra aguardar animação de mount terminar (foco em
    // elemento ainda em transform: scale(0.9) é visualmente estranho).
    const autoFocusTimer = window.setTimeout(() => {
      const focusables = getFocusables(container)
      const first = focusables[0]
      if (first) {
        first.focus({ preventScroll: true })
      } else {
        // Sem focáveis: foca o container (com tabIndex pra ser focável)
        if (!container.hasAttribute('tabindex')) {
          container.setAttribute('tabindex', '-1')
        }
        container.focus({ preventScroll: true })
      }
    }, 50)

    // 3. TRAP Tab/Shift+Tab dentro do container
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const focusables = getFocusables(container)
      if (focusables.length === 0) {
        e.preventDefault()
        return
      }
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const current = document.activeElement as HTMLElement
      // Shift+Tab no primeiro → volta pro último
      if (e.shiftKey && current === first) {
        e.preventDefault()
        last.focus({ preventScroll: true })
      }
      // Tab no último → volta pro primeiro
      else if (!e.shiftKey && current === last) {
        e.preventDefault()
        first.focus({ preventScroll: true })
      }
      // Se o foco está fora do container (saiu via clique fora), traz de volta
      else if (!container.contains(current)) {
        e.preventDefault()
        first.focus({ preventScroll: true })
      }
    }
    document.addEventListener('keydown', onKeyDown)

    return () => {
      window.clearTimeout(autoFocusTimer)
      document.removeEventListener('keydown', onKeyDown)
      // 4. RESTORE foco
      if (previouslyFocused && document.body.contains(previouslyFocused)) {
        try {
          previouslyFocused.focus({ preventScroll: true })
        } catch { /* element foi removido: noop */ }
      }
    }
  }, [active, containerRef])
}

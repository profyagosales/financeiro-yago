// ─── ResponsiveSwitch: renderiza desktop ou mobile baseado em viewport ─
// Usado pra páginas com mudança fundamental de layout (Dashboard, etc).

import type { ReactNode } from 'react'
import { useIsMobile } from '@/hooks/useIsMobile'

interface Props {
  desktop: ReactNode
  mobile: ReactNode
  /** Breakpoint custom (default 768) */
  breakpoint?: number
}

export function ResponsiveSwitch({ desktop, mobile, breakpoint }: Props) {
  const isMobile = useIsMobile(breakpoint)
  return <>{isMobile ? mobile : desktop}</>
}

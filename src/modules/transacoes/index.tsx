// ─── Entry do módulo Transações ────────────────────────────────────
// Switcher responsivo entre desktop (master-detail) e mobile
// (lista vertical + StackScreen pra detalhe).

import { ResponsiveSwitch } from '@/components/layout/ResponsiveSwitch'
import { TransacoesDesktop } from './TransacoesDesktop'
import { TransacoesMobile } from './TransacoesMobile'

export function Page() {
  return (
    <ResponsiveSwitch
      desktop={<TransacoesDesktop />}
      mobile={<TransacoesMobile />}
    />
  )
}

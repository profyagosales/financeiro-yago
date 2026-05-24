// ─── Entry do módulo Cartões ────────────────────────────────────────
// Switch responsivo entre desktop (master-detail) e mobile
// (lista vertical + StackScreen pra detalhe).

import { ResponsiveSwitch } from '@/components/layout/ResponsiveSwitch'
import { CartoesDesktop } from './CartoesDesktop'
import { CartoesMobile } from './CartoesMobile'

export function Page() {
  return (
    <ResponsiveSwitch
      desktop={<CartoesDesktop />}
      mobile={<CartoesMobile />}
    />
  )
}

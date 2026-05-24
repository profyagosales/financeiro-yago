// ─── Entry do módulo Dashboard ──────────────────────────────────────
// Switcher responsivo entre desktop e mobile sem tocar em nenhum dos
// dois — cada um vive em seu próprio arquivo, otimizado pro contexto.

import { ResponsiveSwitch } from '@/components/layout/ResponsiveSwitch'
import { DashboardPage } from './DashboardPage'
import { DashboardMobile } from './DashboardMobile'

export function Page() {
  return (
    <ResponsiveSwitch
      desktop={<DashboardPage />}
      mobile={<DashboardMobile />}
    />
  )
}

// Mantém o named export pra compatibilidade com qualquer import antigo
export { DashboardPage }

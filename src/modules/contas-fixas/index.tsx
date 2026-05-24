// ─── Entry do módulo Contas Fixas ───────────────────────────────────
import { ResponsiveSwitch } from '@/components/layout/ResponsiveSwitch'
import { ContasFixasDesktop } from './ContasFixasDesktop'
import { ContasFixasMobile } from './ContasFixasMobile'

export function Page() {
  return (
    <ResponsiveSwitch
      desktop={<ContasFixasDesktop />}
      mobile={<ContasFixasMobile />}
    />
  )
}

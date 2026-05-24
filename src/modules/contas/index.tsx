import { ResponsiveSwitch } from '@/components/layout/ResponsiveSwitch'
import { ContasDesktop } from './ContasDesktop'
import { ContasMobile } from './ContasMobile'

export function Page() {
  return <ResponsiveSwitch desktop={<ContasDesktop />} mobile={<ContasMobile />} />
}

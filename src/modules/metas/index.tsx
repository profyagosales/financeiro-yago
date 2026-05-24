import { ResponsiveSwitch } from '@/components/layout/ResponsiveSwitch'
import { MetasDesktop } from './MetasDesktop'
import { MetasMobile } from './MetasMobile'

export function Page() {
  return <ResponsiveSwitch desktop={<MetasDesktop />} mobile={<MetasMobile />} />
}

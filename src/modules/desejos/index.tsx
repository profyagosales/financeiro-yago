import { ResponsiveSwitch } from '@/components/layout/ResponsiveSwitch'
import { DesejosDesktop } from './DesejosDesktop'
import { DesejosMobile } from './DesejosMobile'

export function Page() {
  return <ResponsiveSwitch desktop={<DesejosDesktop />} mobile={<DesejosMobile />} />
}

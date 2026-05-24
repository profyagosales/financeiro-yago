import { ResponsiveSwitch } from '@/components/layout/ResponsiveSwitch'
import { DividasDesktop } from './DividasDesktop'
import { DividasMobile } from './DividasMobile'

export function Page() {
  return <ResponsiveSwitch desktop={<DividasDesktop />} mobile={<DividasMobile />} />
}

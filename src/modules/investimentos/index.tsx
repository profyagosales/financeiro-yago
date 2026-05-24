import { ResponsiveSwitch } from '@/components/layout/ResponsiveSwitch'
import { InvestimentosDesktop } from './InvestimentosDesktop'
import { InvestimentosMobile } from './InvestimentosMobile'

export function Page() {
  return <ResponsiveSwitch desktop={<InvestimentosDesktop />} mobile={<InvestimentosMobile />} />
}

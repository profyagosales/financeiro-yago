import { ResponsiveSwitch } from '@/components/layout/ResponsiveSwitch'
import { RelatoriosDesktop } from './RelatoriosDesktop'
import { RelatoriosMobile } from './RelatoriosMobile'

export function Page() {
  return <ResponsiveSwitch desktop={<RelatoriosDesktop />} mobile={<RelatoriosMobile />} />
}

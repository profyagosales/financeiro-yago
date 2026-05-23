import { IconCash, IconHome, IconCreditCard, IconListDetails } from '@tabler/icons-react'
import type { DividaTipo } from '@/db/schema'

export const TIPOS: { value: DividaTipo; label: string; cor: string; Icon: React.ElementType }[] = [
  { value: 'Empréstimo',      label: 'Empréstimo',      cor: '#C4553B', Icon: IconCash },
  { value: 'Financiamento',   label: 'Financiamento',   cor: '#A8442B', Icon: IconHome },
  { value: 'Cheque especial', label: 'Cheque especial', cor: '#B94040', Icon: IconCreditCard },
  { value: 'Outros',          label: 'Outros',          cor: '#7A5C4F', Icon: IconListDetails },
]

export const TIPO_META = new Map(TIPOS.map(t => [t.value, t]))

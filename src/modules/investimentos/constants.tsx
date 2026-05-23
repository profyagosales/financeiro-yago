import {
  IconChartLine, IconBuildingBank, IconPigMoney, IconWallet,
  IconCurrencyBitcoin, IconBuildingSkyscraper, IconChartArea,
  IconArrowsHorizontal, IconBox,
} from '@tabler/icons-react'
import type { InvestimentoTipo, InvestimentoBenchmark, InvestimentoLiquidez } from '@/db/schema'

export const TIPOS: { value: InvestimentoTipo; label: string; cor: string; Icon: React.ElementType; classe: 'fixa' | 'variavel' | 'cripto' | 'caixa' }[] = [
  { value: 'CDB',       label: 'CDB',              cor: '#3A8580', Icon: IconBuildingBank,       classe: 'fixa'     },
  { value: 'Tesouro',   label: 'Tesouro Direto',   cor: '#1E7D5A', Icon: IconChartLine,          classe: 'fixa'     },
  { value: 'Poupança',  label: 'Poupança',         cor: '#3D7EB5', Icon: IconPigMoney,           classe: 'caixa'    },
  { value: 'Caixinha',  label: 'Caixinha',         cor: '#D4A017', Icon: IconWallet,             classe: 'caixa'    },
  { value: 'Cripto',    label: 'Criptomoeda',      cor: '#8B4BC8', Icon: IconCurrencyBitcoin,    classe: 'cripto'   },
  { value: 'Ação',      label: 'Ações',            cor: '#C4553B', Icon: IconArrowsHorizontal,   classe: 'variavel' },
  { value: 'FII',       label: 'Fundos Imobiliários', cor: '#2C7470', Icon: IconBuildingSkyscraper, classe: 'variavel' },
  { value: 'ETF',       label: 'ETFs',             cor: '#E89527', Icon: IconChartArea,          classe: 'variavel' },
  { value: 'Outros',    label: 'Outros',           cor: '#7A5C4F', Icon: IconBox,                classe: 'caixa'    },
]

export const TIPO_META = new Map(TIPOS.map(t => [t.value, t]))

export const BENCHMARKS: InvestimentoBenchmark[] = ['CDI', 'Selic', 'IPCA+', 'Prefixado', 'Atrelado']

export const LIQUIDEZ_OPTIONS: { value: InvestimentoLiquidez; label: string }[] = [
  { value: 'diaria',         label: 'Liquidez diária (D+0)' },
  { value: '30d',            label: '30 dias' },
  { value: '90d',            label: '90 dias' },
  { value: '180d',           label: '180 dias' },
  { value: '365d',           label: '365 dias' },
  { value: 'no_vencimento',  label: 'No vencimento' },
]

export const LIQUIDEZ_LABEL: Record<InvestimentoLiquidez, string> = {
  diaria: 'D+0',
  '30d': '30 dias',
  '90d': '90 dias',
  '180d': '180 dias',
  '365d': '365 dias',
  no_vencimento: 'No vencimento',
}

export const CLASSE_LABEL = {
  fixa:     'Renda Fixa',
  variavel: 'Renda Variável',
  cripto:   'Criptomoedas',
  caixa:    'Caixa & Reserva',
}

export const CLASSE_COR = {
  fixa:     '#3A8580',
  variavel: '#C4553B',
  cripto:   '#8B4BC8',
  caixa:    '#D4A017',
}

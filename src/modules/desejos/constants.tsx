import { IconFlame, IconRefresh, IconArrowsSort, IconBookmark, IconHourglass } from '@tabler/icons-react'
import type { DesejoPrioridade } from '@/db/schema'

export const PRIORIDADES: {
  value: DesejoPrioridade
  label: string
  short: string
  descricao: string
  cor: string
  corLight: string
  Icon: React.ElementType
}[] = [
  { value: 'urgente',    label: 'Urgente',           short: 'Urgente',  descricao: 'Comprar o quanto antes',         cor: '#C4553B', corLight: '#FBEEEA', Icon: IconFlame },
  { value: 'mensal',     label: 'Mensal',            short: 'Mensal',   descricao: 'Compra recorrente todo mês',     cor: '#3A8580', corLight: '#E8F4F2', Icon: IconRefresh },
  { value: 'media',      label: 'Média prioridade',  short: 'Média',    descricao: 'Importante mas pode esperar',    cor: '#D4A017', corLight: '#FBF3DD', Icon: IconArrowsSort },
  { value: 'baixa',      label: 'Baixa prioridade',  short: 'Baixa',    descricao: 'Quando sobrar',                  cor: '#8B7355', corLight: '#F4EFE8', Icon: IconBookmark },
  { value: 'algum_dia',  label: 'Algum dia',         short: 'Um dia',   descricao: 'Sonho de consumo',               cor: '#9B7B6A', corLight: '#F2EBE5', Icon: IconHourglass },
]

export const PRIORIDADE_BY = new Map(PRIORIDADES.map(p => [p.value, p]))

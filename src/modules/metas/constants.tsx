import {
  IconShoppingBag, IconShieldCheck, IconArmchair, IconCircleDot,
  IconHome, IconPlane, IconCar, IconDeviceMobile, IconDeviceLaptop,
  IconSchool, IconHeart, IconStar, IconTrophy, IconBeach, IconGift,
  IconBike, IconPaw, IconBuildingBank,
} from '@tabler/icons-react'
import type { MetaTipo } from '@/db/schema'

// ─── Tipos de Meta ───────────────────────────────────────────────────
export const META_TIPOS: { value: MetaTipo; label: string; descricao: string; cor: string; Icon: React.ElementType }[] = [
  { value: 'compra',              label: 'Compra',                descricao: 'Uma compra ou objetivo específico',     cor: '#C4553B', Icon: IconShoppingBag },
  { value: 'reserva_emergencia',  label: 'Reserva de Emergência', descricao: 'Cobertura de 3, 6 ou 12 meses',         cor: '#3A8580', Icon: IconShieldCheck },
  { value: 'aposentadoria',       label: 'Aposentadoria',         descricao: 'Acúmulo de longo prazo',                cor: '#8B4BC8', Icon: IconArmchair },
  { value: 'outros',              label: 'Outros',                descricao: 'Sem categoria específica',              cor: '#7A5C4F', Icon: IconCircleDot },
]

export const META_TIPO_BY = new Map(META_TIPOS.map(t => [t.value, t]))

// ─── Ícones disponíveis pra meta (substitui emoji unicode) ──────────
export type MetaIconKey =
  | 'home' | 'plane' | 'car' | 'phone' | 'laptop' | 'school'
  | 'heart' | 'star' | 'trophy' | 'beach' | 'gift' | 'bike'
  | 'paw' | 'bank' | 'shield' | 'chair' | 'shopping' | 'target'

export const META_ICONS: { key: MetaIconKey; Icon: React.ElementType; label: string }[] = [
  { key: 'home',     Icon: IconHome,         label: 'Casa' },
  { key: 'plane',    Icon: IconPlane,        label: 'Viagem' },
  { key: 'car',      Icon: IconCar,          label: 'Carro' },
  { key: 'phone',    Icon: IconDeviceMobile, label: 'Celular' },
  { key: 'laptop',   Icon: IconDeviceLaptop, label: 'Notebook' },
  { key: 'school',   Icon: IconSchool,       label: 'Estudos' },
  { key: 'heart',    Icon: IconHeart,        label: 'Coração' },
  { key: 'star',     Icon: IconStar,         label: 'Estrela' },
  { key: 'trophy',   Icon: IconTrophy,       label: 'Conquista' },
  { key: 'beach',    Icon: IconBeach,        label: 'Praia' },
  { key: 'gift',     Icon: IconGift,         label: 'Presente' },
  { key: 'bike',     Icon: IconBike,         label: 'Bicicleta' },
  { key: 'paw',      Icon: IconPaw,          label: 'Pet' },
  { key: 'bank',     Icon: IconBuildingBank, label: 'Banco' },
  { key: 'shield',   Icon: IconShieldCheck,  label: 'Escudo' },
  { key: 'chair',    Icon: IconArmchair,     label: 'Aposentadoria' },
  { key: 'shopping', Icon: IconShoppingBag,  label: 'Compras' },
  { key: 'target',   Icon: IconCircleDot,    label: 'Alvo' },
]

export const META_ICON_BY = new Map(META_ICONS.map(i => [i.key, i.Icon]))

export function getMetaIcon(iconeKey: string | undefined): React.ElementType {
  if (!iconeKey) return IconCircleDot
  return META_ICON_BY.get(iconeKey as MetaIconKey) ?? IconCircleDot
}

export const META_CORES = [
  '#C4553B', '#3A8580', '#D4A017', '#8B4BC8',
  '#3D7EB5', '#E89527', '#D94F8A', '#1E7D5A',
]

// ─── Reserva de Emergência: opções de cobertura ──────────────────────
export const COBERTURA_OPTIONS: { value: 3 | 6 | 12; label: string; descricao: string }[] = [
  { value: 3,  label: '3 meses',  descricao: 'Cobertura mínima' },
  { value: 6,  label: '6 meses',  descricao: 'Recomendada' },
  { value: 12, label: '12 meses', descricao: 'Estabilidade total' },
]

// ─── Status semáforo da Reserva ──────────────────────────────────────
export function reservaStatus(progressoPct: number): {
  label: string
  cor: string
  descricao: string
} {
  if (progressoPct >= 100) return {
    label: 'Reserva completa',
    cor: '#3A8580',
    descricao: 'Sua reserva está protegida — siga investindo no longo prazo',
  }
  if (progressoPct >= 50) return {
    label: 'Construindo',
    cor: '#D4A017',
    descricao: 'Você está no caminho — continue priorizando aportes',
  }
  return {
    label: 'Atenção',
    cor: '#C4553B',
    descricao: 'Reserva insuficiente — priorize aportes em alta liquidez',
  }
}

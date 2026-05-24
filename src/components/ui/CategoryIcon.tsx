import { createElement, useMemo } from 'react'
import {
  ForkKnife, House, Car, Heartbeat, Star, GraduationCap,
  TShirt, MonitorPlay, ChartLineUp, Wallet, Laptop,
  CurrencyDollar, Gift, Handshake, ShoppingCart, Dog
} from '@phosphor-icons/react'

interface CategoryIconProps {
  nome: string
  cor: string
  size?: number
  radius?: number
}

const ICON_MAP: Record<string, React.ElementType> = {
  'alimentação': ForkKnife,
  'moradia': House,
  'transporte': Car,
  'saúde': Heartbeat,
  'lazer': Star,
  'educação': GraduationCap,
  'vestuário': TShirt,
  'assinaturas': MonitorPlay,
  'investimentos': ChartLineUp,
  'outros gastos': ShoppingCart,
  'empréstimos': Handshake,
  'dívidas': Handshake,
  'salário': Wallet,
  'freelance': Laptop,
  'rendimentos': ChartLineUp,
  'outros': CurrencyDollar,
}

function getIcon(nome: string): React.ElementType {
  const n = nome.toLowerCase()
  for (const [key, Icon] of Object.entries(ICON_MAP)) {
    if (n.includes(key) || key.includes(n)) return Icon
  }
  if (n.includes('comid') || n.includes('rest') || n.includes('ifood')) return ForkKnife
  if (n.includes('alug') || n.includes('casa') || n.includes('imóv')) return House
  if (n.includes('carro') || n.includes('uber') || n.includes('combustív')) return Car
  if (n.includes('médic') || n.includes('farm') || n.includes('saude')) return Heartbeat
  if (n.includes('stream') || n.includes('netflix') || n.includes('spotify')) return MonitorPlay
  if (n.includes('invest') || n.includes('rend') || n.includes('poupan')) return ChartLineUp
  if (n.includes('salár') || n.includes('salar')) return Wallet
  if (n.includes('roupa') || n.includes('moda')) return TShirt
  if (n.includes('escola') || n.includes('curso') || n.includes('facul')) return GraduationCap
  if (n.includes('gift') || n.includes('presente')) return Gift
  if (n.includes('pet') || n.includes('animal')) return Dog
  return CurrencyDollar
}

export function CategoryIcon({ nome, cor, size = 48, radius = 16 }: CategoryIconProps) {
  const iconSize = Math.round(size * 0.48)
  // Render do ícone via createElement (evita rule react-hooks/static-components)
  const iconNode = useMemo(
    () => createElement(getIcon(nome), { size: iconSize, color: 'white', weight: 'duotone' }),
    [nome, iconSize],
  )
  return (
    <div style={{
      width: size, height: size, borderRadius: radius,
      background: cor, display: 'flex', alignItems: 'center',
      justifyContent: 'center', flexShrink: 0,
    }}>
      {iconNode}
    </div>
  )
}

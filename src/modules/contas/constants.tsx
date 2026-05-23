// ─── Presets de bancos brasileiros ────────────────────────────────────
// Cores aproximadas dos bancos. O usuário pode ainda assim sobrescrever
// e fazer upload de logo customizado.

export interface BankPreset {
  key: string
  nome: string
  cor: string             // cor principal do banco
  tipoSugerido?: string   // tipo de conta sugerido (corrente/digital/etc)
}

export const BANK_PRESETS: BankPreset[] = [
  { key: 'nubank',    nome: 'Nubank',        cor: '#8B4BC8', tipoSugerido: 'digital' },
  { key: 'itau',      nome: 'Itaú',          cor: '#EC7000', tipoSugerido: 'corrente' },
  { key: 'bb',        nome: 'BB',            cor: '#FBC400', tipoSugerido: 'corrente' },
  { key: 'bradesco',  nome: 'Bradesco',      cor: '#CC0000', tipoSugerido: 'corrente' },
  { key: 'caixa',     nome: 'Caixa',         cor: '#0066B3', tipoSugerido: 'corrente' },
  { key: 'santander', nome: 'Santander',     cor: '#EC0000', tipoSugerido: 'corrente' },
  { key: 'inter',     nome: 'Inter',         cor: '#FF7A00', tipoSugerido: 'digital' },
  { key: 'c6',        nome: 'C6 Bank',       cor: '#1A1A1A', tipoSugerido: 'digital' },
  { key: 'xp',        nome: 'XP',            cor: '#1F1F1F', tipoSugerido: 'investimento' },
  { key: 'nomad',     nome: 'Nomad',         cor: '#3A8580', tipoSugerido: 'digital' },
  { key: 'brb',       nome: 'BRB',           cor: '#0F8742', tipoSugerido: 'corrente' },
  { key: 'mercado',   nome: 'Mercado Pago',  cor: '#00B1EA', tipoSugerido: 'digital' },
  { key: 'picpay',    nome: 'PicPay',        cor: '#21C25E', tipoSugerido: 'digital' },
  { key: 'will',      nome: 'Will Bank',     cor: '#FFD23F', tipoSugerido: 'digital' },
  { key: 'safra',     nome: 'Safra',         cor: '#005EA8', tipoSugerido: 'corrente' },
  { key: 'sicoob',    nome: 'Sicoob',        cor: '#003641', tipoSugerido: 'corrente' },
  { key: 'sicredi',   nome: 'Sicredi',       cor: '#00753C', tipoSugerido: 'corrente' },
  { key: 'binance',   nome: 'Binance',       cor: '#F0B90B', tipoSugerido: 'investimento' },
  { key: 'dinheiro',  nome: 'Dinheiro',      cor: '#1E7D5A', tipoSugerido: 'dinheiro' },
  { key: 'outro',     nome: 'Outro',         cor: '#7A5C4F', tipoSugerido: 'corrente' },
]

export const TIPOS_CONTA: { value: string; label: string; descricao: string }[] = [
  { value: 'corrente',     label: 'Corrente',     descricao: 'Conta bancária tradicional' },
  { value: 'digital',      label: 'Digital',      descricao: 'Banco digital sem agência' },
  { value: 'poupanca',     label: 'Poupança',     descricao: 'Conta poupança com rendimento' },
  { value: 'investimento', label: 'Investimento', descricao: 'Corretora ou conta de investimento' },
  { value: 'dinheiro',     label: 'Dinheiro',     descricao: 'Carteira em espécie' },
]

export const CORES_CONTA = [
  '#C4553B', '#EC7000', '#FBC400', '#3A8580',
  '#0066B3', '#8B4BC8', '#504E76', '#1E7D5A',
  '#D94F8A', '#2C1A0F',
]

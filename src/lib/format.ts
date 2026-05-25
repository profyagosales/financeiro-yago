export function fmt(value: number, showSign = false) {
  const formatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Math.abs(value))
  if (showSign) return value >= 0 ? `+${formatted}` : `-${formatted}`
  return value < 0 ? `-${formatted}` : formatted
}

// ─── Helpers de número/percentual em pt-BR ──────────────────────────
// O Brasil usa `.` pra milhar e `,` pra decimal (208.504,32). Sem helper
// dedicado, vários componentes caíam em `.toFixed(N)` (que sempre devolve
// "208504.32" — formato US) ou em template literals com ponto, criando
// inconsistência visual entre telas.
//
// Use SEMPRE estes helpers em qualquer texto de display:
//   - fmt(v)           → "R$ 1.234,56"           (currency BRL canônica)
//   - fmtMoeda('US$', v) → "US$ 1.234,56"        (currency com símbolo custom: USD, BTC, etc.)
//   - fmtPct(v, 1)     → "12,3%"                  (percentagem com N decimais)
//   - fmtNum(v, 2)     → "1.234,56"               (número puro, sem símbolo)

export function fmtPct(value: number, decimals = 1, showSign = false) {
  const formatted = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Math.abs(value))
  const withSign = showSign && value > 0 ? `+${formatted}` : value < 0 ? `-${formatted}` : formatted
  return `${withSign}%`
}

export function fmtNum(value: number, decimals = 2) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

// Para moedas com símbolo customizado (US$, BTC, etc) — Intl.NumberFormat
// com currency='USD' acabaria devolvendo "US$ 1.234,56" em pt-BR, mas pra
// crypto/símbolos custom não existe código ISO. Usa fmtNum + prefixo manual.
export function fmtMoeda(simbolo: string, value: number, decimals = 2) {
  return `${simbolo} ${fmtNum(Math.abs(value), decimals)}`
}

export function fmtDate(dateStr: string) {
  const date = new Date(dateStr + 'T12:00:00')
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return 'Hoje'
  if (date.toDateString() === yesterday.toDateString()) return 'Ontem'
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

// ─── Data de hoje em YYYY-MM-DD (HORA LOCAL, não UTC) ──────────────
// Bug histórico: `toISOString().split('T')[0]` retorna a data em UTC, que
// no Brasil (UTC-3) avança 1 dia toda noite após 21h local. Resultado:
// lançamentos default com data de amanhã → comprometeu fluxo de caixa
// noturno por meses. Sempre usar este helper (ou `todayISO()` que aliasa).
export function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Converte um Date arbitrário pra YYYY-MM-DD em hora LOCAL.
// Use sempre que tiver um Date e precisar serializar como ISO date-only.
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function mesAnoAtual() {
  const d = new Date()
  return { mes: d.getMonth() + 1, ano: d.getFullYear() }
}

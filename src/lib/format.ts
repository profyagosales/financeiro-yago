export function fmt(value: number, showSign = false) {
  const formatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Math.abs(value))
  if (showSign) return value >= 0 ? `+${formatted}` : `-${formatted}`
  return value < 0 ? `-${formatted}` : formatted
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

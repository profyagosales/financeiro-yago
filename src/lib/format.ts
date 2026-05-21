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

export function todayISO() {
  return new Date().toISOString().split('T')[0]
}

export function mesAnoAtual() {
  const d = new Date()
  return { mes: d.getMonth() + 1, ano: d.getFullYear() }
}

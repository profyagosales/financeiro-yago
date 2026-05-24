// ─── Conversores camelCase ↔ snake_case ─────────────────────────────
// Conversão automática de chaves de objetos. Lida com edge cases:
//   - 'id' continua 'id' (mas com semântica diferente local vs remote)
//   - 'updatedAt' ↔ 'updated_at'
//   - 'valorAtual' ↔ 'valor_atual'

export function camelToSnake(s: string): string {
  return s.replace(/[A-Z]/g, m => '_' + m.toLowerCase())
}

export function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

export function objCamelToSnake<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const k in obj) {
    out[camelToSnake(k)] = obj[k]
  }
  return out
}

export function objSnakeToCamel<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const k in obj) {
    out[snakeToCamel(k)] = obj[k]
  }
  return out
}

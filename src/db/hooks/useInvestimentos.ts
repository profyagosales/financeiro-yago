import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Investimento, type InvestimentoTipo } from '../schema'

export function useInvestimentos() {
  return useLiveQuery(() => db.investimentos.filter(i => i.ativo).toArray(), []) ?? []
}

export function useInvestimentosByTipo(tipo: InvestimentoTipo) {
  return useLiveQuery(
    () => db.investimentos.where('tipo').equals(tipo).filter(i => i.ativo).toArray(),
    [tipo],
  ) ?? []
}

export function useInvestimentosByMeta(metaId: number | undefined) {
  return useLiveQuery(
    () => metaId === undefined
      ? db.investimentos.filter(i => i.ativo && i.metaId === undefined).toArray()
      : db.investimentos.where('metaId').equals(metaId).filter(i => i.ativo).toArray(),
    [metaId],
  ) ?? []
}

export function useTotalInvestimentos() {
  const list = useInvestimentos()
  const total = list.reduce((s, i) => s + i.valorAtual, 0)
  const aplicado = list.reduce((s, i) => s + i.valorAplicado, 0)
  const rendimento = total - aplicado
  return { total, aplicado, rendimento }
}

export async function addInvestimento(
  data: Omit<Investimento, 'id' | 'syncId' | 'updatedAt'>,
) {
  return db.investimentos.add({ ...data, updatedAt: Date.now() })
}

export async function editInvestimento(id: number, data: Partial<Investimento>) {
  return db.investimentos.update(id, { ...data, updatedAt: Date.now() })
}

export async function deleteInvestimento(id: number) {
  return db.investimentos.update(id, { ativo: false, updatedAt: Date.now() })
}

// ─── Auto-update da rentabilidade (modo híbrido) ─────────────────────
// Aplica a rentabilidade proporcional aos meses decorridos desde a última atualização.
// Só roda se valorAtualSource === 'auto' e houver rentabilidadeAnual.
export async function aplicarRentabilidadeAuto(id: number) {
  const inv = await db.investimentos.get(id)
  if (!inv) return
  if (inv.valorAtualSource !== 'auto') return
  if (!inv.rentabilidadeAnual) return

  const last = inv.ultimaAtualizacaoAuto ?? new Date(inv.dataAplicacao + 'T00:00:00').getTime()
  const now = Date.now()
  const monthsElapsed = (now - last) / (1000 * 60 * 60 * 24 * 30.44)
  if (monthsElapsed < 1) return // só atualiza após 1 mês completo

  const monthlyRate = Math.pow(1 + inv.rentabilidadeAnual, 1 / 12) - 1
  const novoValor = inv.valorAtual * Math.pow(1 + monthlyRate, monthsElapsed)

  await db.investimentos.update(id, {
    valorAtual: Math.round(novoValor * 100) / 100,
    ultimaAtualizacaoAuto: now,
    updatedAt: Date.now(),
  })
}

export async function aplicarRentabilidadeAutoTodos() {
  const all = await db.investimentos
    .filter(i => i.ativo && i.valorAtualSource === 'auto' && !!i.rentabilidadeAnual)
    .toArray()
  for (const inv of all) {
    if (inv.id !== undefined) await aplicarRentabilidadeAuto(inv.id)
  }
}

// Liquidez de alta liquidez (para sugestão na Reserva de Emergência)
export const TIPOS_ALTA_LIQUIDEZ: InvestimentoTipo[] = ['Poupança', 'Caixinha', 'Tesouro', 'CDB']

export function isAltaLiquidez(inv: Pick<Investimento, 'tipo' | 'liquidez'>) {
  return TIPOS_ALTA_LIQUIDEZ.includes(inv.tipo) && (inv.liquidez === 'diaria' || inv.liquidez === undefined)
}

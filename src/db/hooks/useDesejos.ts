import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Desejo, type DesejoPrioridade, type DesejoStatus } from '../schema'

export function useDesejos() {
  return useLiveQuery(() => db.desejos.toArray(), []) ?? []
}

export function useDesejosByStatus(status: DesejoStatus) {
  return useLiveQuery(
    () => db.desejos.where('status').equals(status).toArray(),
    [status],
  ) ?? []
}

export function useDesejosAbertos() {
  return useDesejosByStatus('aberto')
}

export function useDesejosByPrioridade(prioridade: DesejoPrioridade) {
  return useLiveQuery(
    () => db.desejos
      .where('prioridade').equals(prioridade)
      .filter(d => d.status === 'aberto')
      .toArray(),
    [prioridade],
  ) ?? []
}

// ─── CRUD ────────────────────────────────────────────────────────────
export async function addDesejo(
  data: Omit<Desejo, 'id' | 'syncId' | 'updatedAt'>,
) {
  return db.desejos.add({ ...data, updatedAt: Date.now() })
}

export async function editDesejo(id: number, data: Partial<Desejo>) {
  return db.desejos.update(id, { ...data, updatedAt: Date.now() })
}

export async function deleteDesejo(id: number) {
  return db.desejos.delete(id)
}

export async function mudarPrioridade(id: number, prioridade: DesejoPrioridade) {
  return db.desejos.update(id, { prioridade, updatedAt: Date.now() })
}

// ─── Comprar desejo → vincula com Transação ──────────────────────────
export async function marcarComoComprado(
  id: number,
  transacaoId: number,
  valorReal: number,
) {
  const hoje = new Date().toISOString().split('T')[0]
  return db.desejos.update(id, {
    status: 'comprado',
    transacaoId,
    valorMenorEncontrado: valorReal,
    dataCompra: hoje,
    updatedAt: Date.now(),
  })
}

export async function desistirDesejo(id: number) {
  return db.desejos.update(id, {
    status: 'desistido',
    updatedAt: Date.now(),
  })
}

export async function reabrirDesejo(id: number) {
  return db.desejos.update(id, {
    status: 'aberto',
    transacaoId: undefined,
    dataCompra: undefined,
    updatedAt: Date.now(),
  })
}

// ─── Ordem visual das prioridades (urgente → algum dia) ──────────────
export const PRIORIDADE_ORDEM: DesejoPrioridade[] = [
  'urgente', 'mensal', 'media', 'baixa', 'algum_dia',
]

export const PRIORIDADE_LABEL: Record<DesejoPrioridade, string> = {
  urgente: 'Urgente',
  mensal: 'Mensal',
  media: 'Média prioridade',
  baixa: 'Baixa prioridade',
  algum_dia: 'Algum dia',
}

export const PRIORIDADE_COR: Record<DesejoPrioridade, string> = {
  urgente: '#C4553B',
  mensal: '#3A8580',
  media: '#D4A017',
  baixa: '#8B7355',
  algum_dia: '#9B7B6A',
}

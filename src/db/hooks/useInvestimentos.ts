import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Investimento, type InvestimentoTipo, type InvestimentoProvento, type InvestimentoAporte } from '../schema'
import { getTaxasBenchmark, calcTaxaEfetiva } from './useAppConfig'

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
// Usa taxa efetiva calculada a partir de tipoRendimento + taxas vigentes
// (CDI/Selic/IPCA) para pós-fixados e híbridos. Cai pra rentabilidadeAnual
// fixa pra prefixados ou casos legados.
export async function aplicarRentabilidadeAuto(id: number) {
  const inv = await db.investimentos.get(id)
  if (!inv) return
  if (inv.valorAtualSource !== 'auto') return

  const taxas = await getTaxasBenchmark()
  const taxaEfetiva = calcTaxaEfetiva(inv, taxas)
  if (!taxaEfetiva || taxaEfetiva <= 0) return

  const last = inv.ultimaAtualizacaoAuto ?? new Date(inv.dataAplicacao + 'T00:00:00').getTime()
  const now = Date.now()
  const monthsElapsed = (now - last) / (1000 * 60 * 60 * 24 * 30.44)
  if (monthsElapsed < 1) return // só atualiza após 1 mês completo

  const monthlyRate = Math.pow(1 + taxaEfetiva, 1 / 12) - 1
  const novoValor = inv.valorAtual * Math.pow(1 + monthlyRate, monthsElapsed)

  await db.investimentos.update(id, {
    valorAtual: Math.round(novoValor * 100) / 100,
    rentabilidadeAnual: taxaEfetiva, // mantém atualizado pra exibição
    ultimaAtualizacaoAuto: now,
    updatedAt: Date.now(),
  })
}

export async function aplicarRentabilidadeAutoTodos() {
  const all = await db.investimentos
    .filter(i => i.ativo && i.valorAtualSource === 'auto')
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

// ─── Classificação por modelo de cálculo ─────────────────────────────
// Renda variável usa quantidade × cotacaoAtual; renda fixa usa rentabilidade.
export const TIPOS_RENDA_VARIAVEL: InvestimentoTipo[] = ['Ação', 'FII', 'ETF', 'Cripto']
export const TIPOS_RENDA_FIXA: InvestimentoTipo[] = ['CDB', 'Tesouro']
export const TIPOS_PROVENTO: InvestimentoTipo[] = ['Ação', 'FII', 'ETF'] // costuma pagar dividendos

export function isRendaVariavel(tipo: InvestimentoTipo): boolean {
  return TIPOS_RENDA_VARIAVEL.includes(tipo)
}
export function isRendaFixa(tipo: InvestimentoTipo): boolean {
  return TIPOS_RENDA_FIXA.includes(tipo)
}
export function aceitaProventos(tipo: InvestimentoTipo): boolean {
  return TIPOS_PROVENTO.includes(tipo)
}

// ─── Proventos (dividendos, JCP, aluguéis de FII, etc) ───────────────
export function useProventos(investimentoId: number | undefined) {
  return useLiveQuery(
    () => investimentoId === undefined
      ? Promise.resolve([])
      : db.investimentosProventos.where('investimentoId').equals(investimentoId).reverse().sortBy('data'),
    [investimentoId],
  ) ?? []
}

export function useAllProventos() {
  return useLiveQuery(() => db.investimentosProventos.toArray(), []) ?? []
}

export async function addProvento(data: Omit<InvestimentoProvento, 'id' | 'syncId' | 'updatedAt'>) {
  return db.investimentosProventos.add({ ...data, updatedAt: Date.now() })
}

export async function deleteProvento(id: number) {
  return db.investimentosProventos.delete(id)
}

// Dividend Yield 12m = soma dos proventos dos últimos 365d / valorAtual
export function calcDY12m(proventos: InvestimentoProvento[], valorAtual: number): number {
  if (valorAtual <= 0) return 0
  const cutoff = Date.now() - 365 * 24 * 60 * 60 * 1000
  const totalAno = proventos
    .filter(p => new Date(p.data + 'T00:00:00').getTime() >= cutoff)
    .reduce((s, p) => s + p.valor, 0)
  return (totalAno / valorAtual) * 100
}

// Total recebido em proventos no mês corrente
export function calcProventosMes(proventos: InvestimentoProvento[]): number {
  const now = new Date()
  const mes = now.getMonth()
  const ano = now.getFullYear()
  return proventos
    .filter(p => {
      const d = new Date(p.data + 'T00:00:00')
      return d.getMonth() === mes && d.getFullYear() === ano
    })
    .reduce((s, p) => s + p.valor, 0)
}

// ─── Aportes (compras individuais) ─────────────────────────────────
// Renda variável: cada compra vira um aporte. Quantidade total e preço
// médio são DERIVADOS desta tabela (fonte da verdade).
export function useAportes(investimentoId: number | undefined) {
  return useLiveQuery(
    () => investimentoId === undefined
      ? Promise.resolve([])
      : db.investimentosAportes.where('investimentoId').equals(investimentoId).reverse().sortBy('data'),
    [investimentoId],
  ) ?? []
}

export async function addAporte(data: Omit<InvestimentoAporte, 'id' | 'syncId' | 'updatedAt'>) {
  const id = await db.investimentosAportes.add({ ...data, updatedAt: Date.now() })
  await recalcInvestimentoFromAportes(data.investimentoId)
  return id
}

export async function deleteAporte(id: number) {
  const aporte = await db.investimentosAportes.get(id)
  if (!aporte) return
  await db.investimentosAportes.delete(id)
  await recalcInvestimentoFromAportes(aporte.investimentoId)
}

// Recalcula quantidade, precoMedio, valorAplicado e valorAtual a partir
// dos aportes. Chamado automaticamente em add/delete.
export async function recalcInvestimentoFromAportes(investimentoId: number) {
  const inv = await db.investimentos.get(investimentoId)
  if (!inv) return
  const aportes = await db.investimentosAportes.where('investimentoId').equals(investimentoId).toArray()
  if (aportes.length === 0) return

  const qtdTotal = aportes.reduce((s, a) => s + a.quantidade, 0)
  const totalInvestido = aportes.reduce((s, a) => s + a.quantidade * a.precoUnitario, 0)
  const pm = qtdTotal > 0 ? totalInvestido / qtdTotal : 0
  // valorAtual = quantidade × cotação atual (se houver), senão usa PM
  const cotacao = inv.cotacaoAtual && inv.cotacaoAtual > 0 ? inv.cotacaoAtual : pm
  const valorAtual = qtdTotal * cotacao

  await db.investimentos.update(investimentoId, {
    quantidade: Math.round(qtdTotal * 100000000) / 100000000, // 8 casas (cripto)
    precoMedio: Math.round(pm * 100) / 100,
    valorAplicado: Math.round(totalInvestido * 100) / 100,
    valorAtual: Math.round(valorAtual * 100) / 100,
    updatedAt: Date.now(),
  })
}

// Atualiza apenas a cotação (sem mexer em aportes) e recalcula valor atual
export async function atualizarCotacao(investimentoId: number, novaCotacao: number) {
  const inv = await db.investimentos.get(investimentoId)
  if (!inv) return
  const qtd = inv.quantidade ?? 0
  const valorAtual = Math.round(qtd * novaCotacao * 100) / 100
  await db.investimentos.update(investimentoId, {
    cotacaoAtual: novaCotacao,
    valorAtual,
    updatedAt: Date.now(),
  })
}

// Stats consolidados a partir dos aportes (útil para o modal de aportes)
export function calcAportesStats(aportes: InvestimentoAporte[]) {
  const qtd = aportes.reduce((s, a) => s + a.quantidade, 0)
  const investido = aportes.reduce((s, a) => s + a.quantidade * a.precoUnitario, 0)
  const pm = qtd > 0 ? investido / qtd : 0
  return { quantidade: qtd, totalInvestido: investido, precoMedio: pm }
}

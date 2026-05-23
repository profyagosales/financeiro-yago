import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Divida } from '../schema'
import { addContaFixa } from './useContasFixas'

export function useDividas() {
  return useLiveQuery(() => db.dividas.filter(d => d.ativo).toArray(), []) ?? []
}

export function useDividasComputed() {
  const dividas = useDividas()
  return dividas.map(d => {
    const saldoDevedor = Math.max(0, d.valorTotal - d.valorPago)
    const parcelasRestantes = Math.max(0, d.parcelasTotal - d.parcelasPagas)
    const progresso = d.valorTotal > 0 ? (d.valorPago / d.valorTotal) * 100 : 0
    const quitada = saldoDevedor === 0 || progresso >= 100
    return { ...d, saldoDevedor, parcelasRestantes, progresso, quitada }
  })
}

export function useTotalDividas() {
  const dividas = useDividas()
  const totalDevido = dividas.reduce((s, d) => s + Math.max(0, d.valorTotal - d.valorPago), 0)
  const totalParcelaMensal = dividas
    .filter(d => d.parcelasPagas < d.parcelasTotal)
    .reduce((s, d) => s + d.valorParcela, 0)
  return { totalDevido, totalParcelaMensal }
}

// ─── Add/Edit/Delete ─────────────────────────────────────────────────
// Ao criar uma dívida com parcela mensal + categoriaId, cria automaticamente
// uma ContaFixa vinculada que aparece no orçamento do mês.
export async function addDivida(
  data: Omit<Divida, 'id' | 'syncId' | 'updatedAt' | 'contaFixaId'>,
) {
  const dividaId = (await db.dividas.add({ ...data, updatedAt: Date.now() })) as number

  if (data.valorParcela > 0 && data.categoriaId) {
    const contaFixaId = await addContaFixa({
      nome: data.nome,
      valor: data.valorParcela,
      diaVencimento: data.diaVencimento,
      categoriaId: data.categoriaId,
      contaId: null,
      recorrencia: 'mensal',
      alertaDiasAntes: 3,
      ativo: true,
    })
    await db.dividas.update(dividaId, { contaFixaId: contaFixaId as number })
  }

  return dividaId
}

export async function editDivida(id: number, data: Partial<Divida>) {
  return db.dividas.update(id, { ...data, updatedAt: Date.now() })
}

export async function deleteDivida(id: number) {
  // Soft delete da dívida + desativa contaFixa vinculada
  const divida = await db.dividas.get(id)
  if (divida?.contaFixaId) {
    await db.contasFixas.update(divida.contaFixaId, { ativo: false })
  }
  return db.dividas.update(id, { ativo: false, updatedAt: Date.now() })
}

// ─── Sincronização com pagamentos da ContaFixa ───────────────────────
// Quando uma parcela é paga (na página Contas Fixas), atualizamos o
// `parcelasPagas` e `valorPago` da dívida correspondente.
export async function sincronizarDividaComContaFixa(dividaId: number) {
  const divida = await db.dividas.get(dividaId)
  if (!divida?.contaFixaId) return

  const pagamentos = await db.pagamentosFixos
    .where('contaFixaId')
    .equals(divida.contaFixaId)
    .toArray()

  const pagas = pagamentos.filter(p => p.status === 'pago')
  const valorPago = pagas.reduce((s, p) => s + (p.valor ?? divida.valorParcela), 0)

  await db.dividas.update(dividaId, {
    parcelasPagas: pagas.length,
    valorPago,
    updatedAt: Date.now(),
  })
}

export async function sincronizarTodasDividas() {
  const dividas = await db.dividas.filter(d => d.ativo && !!d.contaFixaId).toArray()
  for (const d of dividas) {
    if (d.id !== undefined) await sincronizarDividaComContaFixa(d.id)
  }
}

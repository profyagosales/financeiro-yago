import { useLiveQuery } from 'dexie-react-hooks'
import { db, type ContaFixa } from '../schema'

export function useContasFixas() {
  return useLiveQuery(() => db.contasFixas.filter(c => c.ativo).toArray(), []) ?? []
}
export function usePagamentosFixos(mes: number, ano: number) {
  return useLiveQuery(
    () => db.pagamentosFixos.where('[mes+ano]').equals([mes, ano]).toArray(),
    [mes, ano]
  ) ?? []
}
export async function addContaFixa(data: Omit<ContaFixa, 'id' | 'syncId'>) {
  const id = await db.contasFixas.add(data)
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    let m = now.getMonth() + 1 + i
    let a = now.getFullYear()
    while (m > 12) { m -= 12; a += 1 }
    await db.pagamentosFixos.add({ contaFixaId: id as number, mes: m, ano: a, status: 'pendente' })
  }
  return id
}
export async function marcarPago(contaFixaId: number, mes: number, ano: number, valor: number) {
  const existing = await db.pagamentosFixos.where({ contaFixaId, mes, ano }).first()
  const today = new Date().toISOString().split('T')[0]
  if (existing) await db.pagamentosFixos.update(existing.id!, { status: 'pago', dataPagamento: today, valor })
  else await db.pagamentosFixos.add({ contaFixaId, mes, ano, status: 'pago', dataPagamento: today, valor })

  // Se a conta fixa é paga via cartão, criar lançamento na fatura do mês corrente
  const cf = await db.contasFixas.get(contaFixaId)
  if (cf?.cartaoId) {
    // Evita duplicidade: procura lançamento já vinculado a este pagamentoFixo (via descrição padronizada)
    const tag = `[fixa:${contaFixaId}:${mes}:${ano}]`
    const existingLanc = await db.lancamentosCartao
      .where('[cartaoId+mes+ano]').equals([cf.cartaoId, mes, ano])
      .filter(l => l.descricao.includes(tag))
      .first()
    if (!existingLanc) {
      await db.lancamentosCartao.add({
        cartaoId: cf.cartaoId,
        descricao: `${cf.nome} ${tag}`,
        valor,
        data: today,
        categoriaId: cf.categoriaId,
        parcelaAtual: 1,
        totalParcelas: 1,
        mes,
        ano,
      })
    }
  }

  await sincronizarDividaSeVinculada(contaFixaId)
}
export async function marcarPendente(contaFixaId: number, mes: number, ano: number) {
  const existing = await db.pagamentosFixos.where({ contaFixaId, mes, ano }).first()
  if (existing) await db.pagamentosFixos.update(existing.id!, { status: 'pendente', dataPagamento: undefined })

  // Se a conta fixa é paga via cartão, remover o lançamento criado automaticamente
  const cf = await db.contasFixas.get(contaFixaId)
  if (cf?.cartaoId) {
    const tag = `[fixa:${contaFixaId}:${mes}:${ano}]`
    const lanc = await db.lancamentosCartao
      .where('[cartaoId+mes+ano]').equals([cf.cartaoId, mes, ano])
      .filter(l => l.descricao.includes(tag))
      .first()
    if (lanc?.id) await db.lancamentosCartao.delete(lanc.id)
  }

  await sincronizarDividaSeVinculada(contaFixaId)
}

// ─── Sincronização com Dívida (se a ContaFixa for vinculada) ─────────
// Usa db direto pra evitar dependência circular com useDividas.
async function sincronizarDividaSeVinculada(contaFixaId: number) {
  const divida = await db.dividas.where('contaFixaId').equals(contaFixaId).first()
  if (!divida?.id) return
  const pagamentos = await db.pagamentosFixos.where('contaFixaId').equals(contaFixaId).toArray()
  const pagas = pagamentos.filter(p => p.status === 'pago')
  const valorPago = pagas.reduce((s, p) => s + (p.valor ?? divida.valorParcela), 0)
  await db.dividas.update(divida.id, {
    parcelasPagas: pagas.length,
    valorPago,
    updatedAt: Date.now(),
  })
}
export async function editContaFixa(id: number, data: Partial<import('../schema').ContaFixa>) {
  return db.contasFixas.update(id, data)
}
export async function deleteContaFixa(id: number) {
  return db.contasFixas.update(id, { ativo: false })
}

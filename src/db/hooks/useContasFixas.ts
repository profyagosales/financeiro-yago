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
// Tag determinística pra ligar pagamento ↔ lançamento/transação criada
function tagPagamento(contaFixaId: number, mes: number, ano: number): string {
  return `[fixa:${contaFixaId}:${mes}:${ano}]`
}

export async function marcarPago(contaFixaId: number, mes: number, ano: number, valor: number) {
  const existing = await db.pagamentosFixos.where({ contaFixaId, mes, ano }).first()
  const today = new Date().toISOString().split('T')[0]
  if (existing) await db.pagamentosFixos.update(existing.id!, { status: 'pago', dataPagamento: today, valor })
  else await db.pagamentosFixos.add({ contaFixaId, mes, ano, status: 'pago', dataPagamento: today, valor })

  const cf = await db.contasFixas.get(contaFixaId)
  if (!cf) return
  const tag = tagPagamento(contaFixaId, mes, ano)

  if (cf.cartaoId) {
    // Pagamento via CARTÃO: cria lançamento na fatura do mês.
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
  } else if (cf.contaId) {
    // Pagamento via CONTA (débito/PIX/boleto): cria Transacao que debita
    // a conta. Sem isso, o saldo da conta não baixaria e o patrimônio
    // ficaria inflado.
    const existingTx = await db.transacoes
      .filter(t => t.contaId === cf.contaId && t.descricao.includes(tag))
      .first()
    if (!existingTx) {
      const { addTransacao } = await import('./useTransacoes')
      await addTransacao({
        data: today,
        valor,
        tipo: 'despesa',
        contaId: cf.contaId,
        categoriaId: cf.categoriaId,
        descricao: `${cf.nome} ${tag}`,
        status: 'efetivada',
        recorrencia: 'unica',
      })
    }
  }

  await sincronizarDividaSeVinculada(contaFixaId)
}

export async function marcarPendente(contaFixaId: number, mes: number, ano: number) {
  const existing = await db.pagamentosFixos.where({ contaFixaId, mes, ano }).first()
  if (existing) await db.pagamentosFixos.update(existing.id!, { status: 'pendente', dataPagamento: undefined })

  const cf = await db.contasFixas.get(contaFixaId)
  if (!cf) return
  const tag = tagPagamento(contaFixaId, mes, ano)

  if (cf.cartaoId) {
    const lanc = await db.lancamentosCartao
      .where('[cartaoId+mes+ano]').equals([cf.cartaoId, mes, ano])
      .filter(l => l.descricao.includes(tag))
      .first()
    if (lanc?.id) await db.lancamentosCartao.delete(lanc.id)
  } else if (cf.contaId) {
    // Reverte a Transacao criada por marcarPago (vinculada por tag).
    const tx = await db.transacoes.filter(t => t.contaId === cf.contaId && t.descricao.includes(tag)).first()
    if (tx?.id) {
      const { deleteTransacao } = await import('./useTransacoes')
      await deleteTransacao(tx.id)
    }
  }

  await sincronizarDividaSeVinculada(contaFixaId)
}

// ─── Sincronização com Dívida (se a ContaFixa for vinculada) ─────────
// Delega pra recalcDividaFromAll, que considera amortizações/descontos/
// quitações além das parcelas pagas. Sem isso, marcarPago apagaria
// amortizações extraordinárias do saldo devedor.
async function sincronizarDividaSeVinculada(contaFixaId: number) {
  const divida = await db.dividas.where('contaFixaId').equals(contaFixaId).first()
  if (!divida?.id) return
  const { recalcDividaFromAll } = await import('./useDividas')
  await recalcDividaFromAll(divida.id)
}
export async function editContaFixa(id: number, data: Partial<import('../schema').ContaFixa>) {
  return db.contasFixas.update(id, data)
}
export async function deleteContaFixa(id: number) {
  return db.contasFixas.update(id, { ativo: false })
}

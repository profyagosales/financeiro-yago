import { useLiveQuery } from 'dexie-react-hooks'
import { db, type ContaFixa } from '../schema'
import { todayISO } from '@/lib/format'

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
  // Cria pagamentos do mês passado (i=-1) até 12 meses futuros (i=11). Sem
  // o i=-1 o user que cadastra "Aluguel" depois do vencimento daquele mês
  // ficaria sem a parcela atual (status 'pendente' não apareceria).
  for (let i = -1; i < 12; i++) {
    let m = now.getMonth() + 1 + i
    let a = now.getFullYear()
    while (m > 12) { m -= 12; a += 1 }
    while (m < 1)  { m += 12; a -= 1 }
    await db.pagamentosFixos.add({ contaFixaId: id as number, mes: m, ano: a, status: 'pendente' })
  }
  return id
}

// Garante que existam pagamentos pendentes a partir do mês atual até
// `monthsAhead` meses à frente pra uma ContaFixa. Idempotente: só insere
// o que faltar. Resolve o problema de contas "sumindo" após 12 meses
// (quando a janela inicial de pagamentosFixos se esgota).
//
// Chamada no boot do app via AppShell pra todas as contas ativas.
export async function garantirPagamentosFuturos(contaFixaId: number, monthsAhead = 12) {
  const cf = await db.contasFixas.get(contaFixaId)
  if (!cf || !cf.ativo) return
  const existentes = await db.pagamentosFixos.where('contaFixaId').equals(contaFixaId).toArray()
  const chaveExistente = new Set(existentes.map(p => `${p.mes}:${p.ano}`))

  const now = new Date()
  for (let i = 0; i < monthsAhead; i++) {
    let m = now.getMonth() + 1 + i
    let a = now.getFullYear()
    while (m > 12) { m -= 12; a += 1 }
    while (m < 1)  { m += 12; a -= 1 }
    if (chaveExistente.has(`${m}:${a}`)) continue
    await db.pagamentosFixos.add({ contaFixaId, mes: m, ano: a, status: 'pendente' })
  }
}

// Garante 12 meses à frente pra TODAS as contas fixas ativas. Idempotente,
// roda em background no boot (AppShell). Sem isso, conta fixa "Internet"
// cadastrada há > 12 meses pararia de aparecer na lista mensal.
export async function garantirPagamentosFuturosTodas(monthsAhead = 12) {
  const all = await db.contasFixas.filter(c => c.ativo).toArray()
  for (const cf of all) {
    if (cf.id !== undefined) await garantirPagamentosFuturos(cf.id, monthsAhead)
  }
}
// Tag determinística pra ligar pagamento ↔ lançamento/transação criada
function tagPagamento(contaFixaId: number, mes: number, ano: number): string {
  return `[fixa:${contaFixaId}:${mes}:${ano}]`
}

export async function marcarPago(contaFixaId: number, mes: number, ano: number, valor: number) {
  const existing = await db.pagamentosFixos.where({ contaFixaId, mes, ano }).first()
  const today = todayISO()
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

import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Transacao } from '../schema'
import { sounds, haptic } from '@/lib/sounds'

export function useTransacoes(limite = 50) {
  return useLiveQuery(() => db.transacoes.orderBy('data').reverse().limit(limite).toArray(), [limite]) ?? []
}
export function useTransacoesByMes(mes: number, ano: number) {
  const inicio = `${ano}-${String(mes).padStart(2,'0')}-01`
  const fim = `${ano}-${String(mes).padStart(2,'0')}-31`
  return useLiveQuery(() => db.transacoes.where('data').between(inicio, fim, true, true).toArray(), [mes, ano]) ?? []
}
export function useTotaisMes(mes: number, ano: number) {
  const txs = useTransacoesByMes(mes, ano)
  const receitas = txs.filter(t => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0)
  const despesas = txs.filter(t => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0)
  return { receitas, despesas, saldo: receitas - despesas }
}
export function useGastosPorCategoria(mes: number, ano: number) {
  const txs = useTransacoesByMes(mes, ano)
  const map = new Map<number, number>()
  txs.filter(t => t.tipo === 'despesa').forEach(t => map.set(t.categoriaId, (map.get(t.categoriaId) ?? 0) + t.valor))
  return map
}
export async function addTransacao(data: Omit<Transacao, 'id' | 'syncId' | 'updatedAt'>) {
  const id = await db.transacoes.add({ ...data, updatedAt: Date.now() })
  const conta = await db.contas.get(data.contaId)
  if (conta) {
    const delta = data.tipo === 'receita' ? data.valor : -data.valor
    await db.contas.update(data.contaId, { saldoAtual: conta.saldoAtual + delta, updatedAt: Date.now() })
  }
  if (data.tipo === 'receita') sounds.receita(); else sounds.despesa()
  haptic('light')
  return id
}
export async function deleteTransacao(id: number) {
  const tx = await db.transacoes.get(id)
  if (!tx) return
  await db.transacoes.delete(id)
  const conta = await db.contas.get(tx.contaId)
  if (conta) {
    const delta = tx.tipo === 'receita' ? -tx.valor : tx.valor
    await db.contas.update(tx.contaId, { saldoAtual: conta.saldoAtual + delta, updatedAt: Date.now() })
  }
  haptic('heavy')
}

export async function editTransacao(id: number, data: Partial<import('../schema').Transacao>) {
  return db.transacoes.update(id, { ...data, updatedAt: Date.now() })
}

// ─── Edit inteligente que ajusta saldo automaticamente ──────────────
// Se `valor`, `tipo` ou `contaId` mudarem, reverte o impacto antigo
// no saldo da conta e aplica o novo. Mantém consistência total.
export async function editTransacaoComSaldo(id: number, novosDados: Partial<Transacao>) {
  const original = await db.transacoes.get(id)
  if (!original) return

  const novoValor   = novosDados.valor   ?? original.valor
  const novoTipo    = novosDados.tipo    ?? original.tipo
  const novaContaId = novosDados.contaId ?? original.contaId

  // Houve mudança que afeta saldo?
  const afetaSaldo = novoValor !== original.valor
                  || novoTipo !== original.tipo
                  || novaContaId !== original.contaId

  if (afetaSaldo) {
    // Reverte impacto antigo na conta original
    const contaAntiga = await db.contas.get(original.contaId)
    if (contaAntiga) {
      const deltaReverter = original.tipo === 'receita' ? -original.valor : original.valor
      await db.contas.update(original.contaId, {
        saldoAtual: contaAntiga.saldoAtual + deltaReverter,
        updatedAt: Date.now(),
      })
    }
    // Aplica novo impacto (na conta nova, que pode ser a mesma)
    const contaNova = await db.contas.get(novaContaId)
    if (contaNova) {
      const deltaAplicar = novoTipo === 'receita' ? novoValor : -novoValor
      // Se conta é a mesma, o saldo já foi revertido — soma o novo
      const saldoBase = novaContaId === original.contaId
        ? (contaNova.saldoAtual + (original.tipo === 'receita' ? -original.valor : original.valor))
        : contaNova.saldoAtual
      await db.contas.update(novaContaId, {
        saldoAtual: saldoBase + deltaAplicar,
        updatedAt: Date.now(),
      })
    }
  }

  return db.transacoes.update(id, { ...novosDados, updatedAt: Date.now() })
}

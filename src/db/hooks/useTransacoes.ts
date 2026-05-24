import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Transacao } from '../schema'
import { sounds, haptic } from '@/lib/sounds'

// ─── STATUS canônico ────────────────────────────────────────────────
// 'efetivada' = lançamento confirmado e impactando saldo
// 'pendente'  = previsto, mas ainda não impacta saldo
// Histórico: 'confirmado' e 'pago' eram aliases que entraram por engano;
// migrados pra 'efetivada' no boot do app (ver migrateStatusToCanonical).
export type StatusTransacao = 'efetivada' | 'pendente'

export function useTransacoes(limite = 50) {
  return useLiveQuery(() => db.transacoes.orderBy('data').reverse().limit(limite).toArray(), [limite]) ?? []
}
export function useTransacoesByMes(mes: number, ano: number) {
  const inicio = `${ano}-${String(mes).padStart(2,'0')}-01`
  const fim = `${ano}-${String(mes).padStart(2,'0')}-31`
  return useLiveQuery(() => db.transacoes.where('data').between(inicio, fim, true, true).toArray(), [mes, ano]) ?? []
}

// Helper: transferências têm `transferId` (duas linhas vinculadas — uma
// despesa na conta origem + uma receita na destino). Devem ser EXCLUÍDAS
// de qualquer agregação de receitas/despesas porque a soma net é zero.
function semTransferencias(txs: Transacao[]): Transacao[] {
  return txs.filter(t => !t.transferId)
}

export function useTotaisMes(mes: number, ano: number) {
  const todas = useTransacoesByMes(mes, ano)
  const txs = semTransferencias(todas)
  const receitas = txs.filter(t => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0)
  const despesas = txs.filter(t => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0)
  return { receitas, despesas, saldo: receitas - despesas }
}
export function useGastosPorCategoria(mes: number, ano: number) {
  const todas = useTransacoesByMes(mes, ano)
  const txs = semTransferencias(todas)
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

// ─── Transferência entre contas (par vinculado via transferId) ──────
// Cria 2 transações com o MESMO transferId. Editar/deletar uma propaga
// pra outra automaticamente (ver editTransacaoComSaldo / deleteTransacao).
export async function addTransferencia(opts: {
  data: string
  valor: number
  contaOrigemId: number
  contaDestinoId: number
  descricao?: string
  categoriaId: number
  recorrencia?: string
}) {
  if (opts.contaOrigemId === opts.contaDestinoId) {
    throw new Error('Contas de origem e destino devem ser diferentes')
  }
  const transferId = crypto.randomUUID()
  const [origemConta, destinoConta] = await Promise.all([
    db.contas.get(opts.contaOrigemId),
    db.contas.get(opts.contaDestinoId),
  ])
  const desc = opts.descricao?.trim() || 'Transferência'
  const baseOut: Omit<Transacao, 'id' | 'syncId' | 'updatedAt'> = {
    data: opts.data,
    valor: opts.valor,
    tipo: 'despesa',
    contaId: opts.contaOrigemId,
    categoriaId: opts.categoriaId,
    descricao: `${desc} → ${destinoConta?.nome ?? 'destino'}`,
    status: 'efetivada',
    transferId,
    recorrencia: opts.recorrencia ?? 'unica',
  }
  const baseIn: Omit<Transacao, 'id' | 'syncId' | 'updatedAt'> = {
    data: opts.data,
    valor: opts.valor,
    tipo: 'receita',
    contaId: opts.contaDestinoId,
    categoriaId: opts.categoriaId,
    descricao: `${desc} ← ${origemConta?.nome ?? 'origem'}`,
    status: 'efetivada',
    transferId,
    recorrencia: 'unica',
  }
  const idOut = await addTransacao(baseOut)
  const idIn = await addTransacao(baseIn)
  return { transferId, idOut, idIn }
}

export async function deleteTransacao(id: number) {
  const tx = await db.transacoes.get(id)
  if (!tx) return
  // Cascade: se faz parte de transferência, deleta o par também.
  if (tx.transferId) {
    const irmas = await db.transacoes.filter(t => t.transferId === tx.transferId && t.id !== id).toArray()
    for (const irma of irmas) {
      if (irma.id == null) continue
      await db.transacoes.delete(irma.id)
      const c = await db.contas.get(irma.contaId)
      if (c) {
        const d = irma.tipo === 'receita' ? -irma.valor : irma.valor
        await db.contas.update(irma.contaId, { saldoAtual: c.saldoAtual + d, updatedAt: Date.now() })
      }
    }
  }
  await db.transacoes.delete(id)
  const conta = await db.contas.get(tx.contaId)
  if (conta) {
    const delta = tx.tipo === 'receita' ? -tx.valor : tx.valor
    await db.contas.update(tx.contaId, { saldoAtual: conta.saldoAtual + delta, updatedAt: Date.now() })
  }
  haptic('heavy')
}

export async function editTransacao(id: number, data: Partial<Transacao>) {
  const tx = await db.transacoes.get(id)
  // Cascade: se for transferência E o `valor` ou `data` mudou, propaga
  // pra irmã pra não dessincronizar o par.
  if (tx?.transferId && (data.valor !== undefined || data.data !== undefined)) {
    const irmas = await db.transacoes.filter(t => t.transferId === tx.transferId && t.id !== id).toArray()
    for (const irma of irmas) {
      if (irma.id == null) continue
      const updates: Partial<Transacao> = {}
      if (data.valor !== undefined) updates.valor = data.valor
      if (data.data !== undefined) updates.data = data.data
      await db.transacoes.update(irma.id, { ...updates, updatedAt: Date.now() })
    }
  }
  return db.transacoes.update(id, { ...data, updatedAt: Date.now() })
}

// ─── Migra status legados ('confirmado', 'pago') pro canônico 'efetivada' ──
// Roda 1x no boot. Idempotente: rápido e sem efeito se já normalizado.
let _statusMigrated = false
export async function migrateStatusToCanonical(): Promise<void> {
  if (_statusMigrated) return
  _statusMigrated = true
  try {
    const legados = await db.transacoes
      .filter(t => t.status === 'confirmado' || t.status === 'pago')
      .toArray()
    if (legados.length === 0) return
    const now = Date.now()
    await Promise.all(legados.map(t => t.id != null
      ? db.transacoes.update(t.id, { status: 'efetivada', updatedAt: now })
      : Promise.resolve(),
    ))
    console.log(`[migration] ${legados.length} transações status → 'efetivada'`)
  } catch (e) {
    console.warn('[migration] status canonical falhou:', e)
  }
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

  // Transferência: se mudou valor ou data, propaga pra irmã (espelho).
  // Sem isso, editar via EditableValueField uma das pernas dessincroniza
  // o par e o saldo das contas fica inconsistente.
  if (original.transferId && (novosDados.valor !== undefined || novosDados.data !== undefined)) {
    const irmas = await db.transacoes
      .filter(t => t.transferId === original.transferId && t.id !== id)
      .toArray()
    for (const irma of irmas) {
      if (irma.id == null) continue
      const updates: Partial<Transacao> = {}
      if (novosDados.valor !== undefined) updates.valor = novosDados.valor
      if (novosDados.data !== undefined) updates.data = novosDados.data
      // Recursão controlada: cascateia mas a irmã não vai cascatear de volta
      // porque o updatedAt já vai bater. Saldo da conta da irmã é ajustado aqui.
      const oldIrma = await db.transacoes.get(irma.id)
      if (!oldIrma) continue
      const contaIrma = await db.contas.get(oldIrma.contaId)
      if (contaIrma && novosDados.valor !== undefined) {
        const deltaReverter = oldIrma.tipo === 'receita' ? -oldIrma.valor : oldIrma.valor
        const deltaAplicar  = oldIrma.tipo === 'receita' ? novosDados.valor : -novosDados.valor
        await db.contas.update(oldIrma.contaId, {
          saldoAtual: contaIrma.saldoAtual + deltaReverter + deltaAplicar,
          updatedAt: Date.now(),
        })
      }
      await db.transacoes.update(irma.id, { ...updates, updatedAt: Date.now() })
    }
  }

  return db.transacoes.update(id, { ...novosDados, updatedAt: Date.now() })
}

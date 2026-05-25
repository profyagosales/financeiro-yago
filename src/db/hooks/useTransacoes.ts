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
//
// Espelhos de Investimento/Aporte (criados em useInvestimentos pra debitar
// conta no aporte) também devem ser excluídos das despesas — são
// movimentação patrimonial INTERNA (R$ saiu da conta, virou ativo
// investido) e não despesa real. Sem esse filtro, aportes inflam: gastos
// por categoria, saudeScore (savings rate cai), notificação de orçamento
// dispara falsa, projeção de despesa média mensal superestima, etc.
function semTransferencias(txs: Transacao[]): Transacao[] {
  return txs.filter(t => !t.transferId)
}

// Detecta Transacao espelho criada por useInvestimentos.addInvestimento
// ou addAporte (vem com tag determinística `[invest:id]` ou `[aporte:id]`
// na descrição).
export function isEspelhoInvestimento(tx: Transacao): boolean {
  return tx.descricao.includes('[invest:') || tx.descricao.includes('[aporte:')
}

// Filtro padrão pra agregações de gastos/receitas reais (excluindo
// transferências internas e espelhos de investimento).
function semTransferOuEspelhos(txs: Transacao[]): Transacao[] {
  return txs.filter(t => !t.transferId && !isEspelhoInvestimento(t))
}

export function useTotaisMes(mes: number, ano: number) {
  const todas = useTransacoesByMes(mes, ano)
  const txs = semTransferOuEspelhos(todas)
  const receitas = txs.filter(t => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0)
  const despesas = txs.filter(t => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0)
  return { receitas, despesas, saldo: receitas - despesas }
}
export function useGastosPorCategoria(mes: number, ano: number) {
  const todas = useTransacoesByMes(mes, ano)
  const txs = semTransferOuEspelhos(todas)
  const map = new Map<number, number>()
  txs.filter(t => t.tipo === 'despesa').forEach(t => map.set(t.categoriaId, (map.get(t.categoriaId) ?? 0) + t.valor))
  return map
}
export async function addTransacao(data: Omit<Transacao, 'id' | 'syncId' | 'updatedAt'>) {
  const id = await db.transacoes.add({ ...data, updatedAt: Date.now() })
  // SÓ impacta saldo se a transação está EFETIVADA. Pendentes são
  // previsões/agendamentos — não mexem no dinheiro real até serem
  // confirmadas. Bug histórico: criar tx pendente já debitava conta.
  if (data.status === 'efetivada') {
    const conta = await db.contas.get(data.contaId)
    if (conta) {
      const delta = data.tipo === 'receita' ? data.valor : -data.valor
      await db.contas.update(data.contaId, { saldoAtual: conta.saldoAtual + delta, updatedAt: Date.now() })
    }
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
      // Só reverte saldo se a irmã estava EFETIVADA (pendente não afeta)
      if (irma.status === 'efetivada') {
        const c = await db.contas.get(irma.contaId)
        if (c) {
          const d = irma.tipo === 'receita' ? -irma.valor : irma.valor
          await db.contas.update(irma.contaId, { saldoAtual: c.saldoAtual + d, updatedAt: Date.now() })
        }
      }
    }
  }
  await db.transacoes.delete(id)
  // Só reverte saldo se a tx estava EFETIVADA
  if (tx.status === 'efetivada') {
    const conta = await db.contas.get(tx.contaId)
    if (conta) {
      const delta = tx.tipo === 'receita' ? -tx.valor : tx.valor
      await db.contas.update(tx.contaId, { saldoAtual: conta.saldoAtual + delta, updatedAt: Date.now() })
    }
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
// Também limpa lastDolar legacy do appConfig (bug R9-R12 que causava
// crash 'null is not an object n.type' em loop por unique violation
// no &key constraint). Cleanup one-time.
let _statusMigrated = false
export async function migrateStatusToCanonical(): Promise<void> {
  if (_statusMigrated) return
  _statusMigrated = true

  // R12 cleanup: remove lastDolar do appConfig (era persistido no R9
  // mas causava ConstraintError em pull insert por &key unique).
  // Agora cotação fica em localStorage. Pull recovery em pull.ts
  // já trata se vier do Supabase, mas idealmente limpamos local também.
  try {
    const legacyDolar = await db.appConfig.where('key').equals('lastDolar').toArray()
    if (legacyDolar.length > 0) {
      await Promise.all(legacyDolar.map(r => r.id ? db.appConfig.delete(r.id) : Promise.resolve()))
      console.log(`[migration R12] removidas ${legacyDolar.length} rows legacy lastDolar do appConfig`)
    }
  } catch (e) {
    console.warn('[migration R12] cleanup lastDolar falhou:', e)
  }

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
// Se `valor`, `tipo`, `contaId` OU `status` mudarem, reverte o impacto
// antigo no saldo e aplica o novo. Mantém consistência total.
//
// Função pura `impacto` calcula o delta da conta dado (tipo, valor, status):
// pendente → 0 (não afeta), efetivada → ±valor por tipo. Isso cobre TODOS
// os cenários: toggle pendente↔efetivada, edição de valor, mudança de conta,
// mudança de tipo, ou combinações.
export async function editTransacaoComSaldo(id: number, novosDados: Partial<Transacao>) {
  const original = await db.transacoes.get(id)
  if (!original) return

  const novoValor   = novosDados.valor   ?? original.valor
  const novoTipo    = novosDados.tipo    ?? original.tipo
  const novaContaId = novosDados.contaId ?? original.contaId
  const novoStatus  = novosDados.status  ?? original.status

  // Impacto NO SALDO de uma tx: positivo = entra, negativo = sai, 0 = pendente
  const impacto = (tipo: string, valor: number, status: string): number => {
    if (status !== 'efetivada') return 0
    return tipo === 'receita' ? valor : -valor
  }

  const antigoImpacto = impacto(original.tipo, original.valor, original.status)
  const novoImpacto = impacto(novoTipo, novoValor, novoStatus)

  if (novaContaId === original.contaId) {
    // Mesma conta: aplica delta (novo - antigo) em uma operação
    const delta = novoImpacto - antigoImpacto
    if (delta !== 0) {
      const conta = await db.contas.get(novaContaId)
      if (conta) {
        await db.contas.update(novaContaId, {
          saldoAtual: conta.saldoAtual + delta,
          updatedAt: Date.now(),
        })
      }
    }
  } else {
    // Conta mudou: reverte na antiga, aplica na nova
    if (antigoImpacto !== 0) {
      const contaAntiga = await db.contas.get(original.contaId)
      if (contaAntiga) {
        await db.contas.update(original.contaId, {
          saldoAtual: contaAntiga.saldoAtual - antigoImpacto,
          updatedAt: Date.now(),
        })
      }
    }
    if (novoImpacto !== 0) {
      const contaNova = await db.contas.get(novaContaId)
      if (contaNova) {
        await db.contas.update(novaContaId, {
          saldoAtual: contaNova.saldoAtual + novoImpacto,
          updatedAt: Date.now(),
        })
      }
    }
  }

  // Transferência: se mudou valor, data OU status, propaga pra irmã (espelho).
  // Sem isso, editar uma perna dessincroniza o par e os saldos das contas
  // ficam inconsistentes. Status é crítico: toggle pendente↔efetivada em
  // uma perna deve refletir na outra (do contrário só metade do par afeta
  // saldo).
  if (original.transferId && (novosDados.valor !== undefined || novosDados.data !== undefined || novosDados.status !== undefined)) {
    const irmas = await db.transacoes
      .filter(t => t.transferId === original.transferId && t.id !== id)
      .toArray()
    for (const irma of irmas) {
      if (irma.id == null) continue
      const updates: Partial<Transacao> = {}
      if (novosDados.valor !== undefined) updates.valor = novosDados.valor
      if (novosDados.data !== undefined) updates.data = novosDados.data
      if (novosDados.status !== undefined) updates.status = novosDados.status
      const oldIrma = await db.transacoes.get(irma.id)
      if (!oldIrma) continue
      // Ajusta saldo da conta da irmã usando função pura impacto (respeita
      // status novo e antigo). Cobre cenários: só valor, só status, ambos.
      const novoIrmaValor = novosDados.valor ?? oldIrma.valor
      const novoIrmaStatus = novosDados.status ?? oldIrma.status
      const antIrmaImp = impacto(oldIrma.tipo, oldIrma.valor, oldIrma.status)
      const novIrmaImp = impacto(oldIrma.tipo, novoIrmaValor, novoIrmaStatus)
      const dIrma = novIrmaImp - antIrmaImp
      if (dIrma !== 0) {
        const contaIrma = await db.contas.get(oldIrma.contaId)
        if (contaIrma) {
          await db.contas.update(oldIrma.contaId, {
            saldoAtual: contaIrma.saldoAtual + dIrma,
            updatedAt: Date.now(),
          })
        }
      }
      await db.transacoes.update(irma.id, { ...updates, updatedAt: Date.now() })
    }
  }

  return db.transacoes.update(id, { ...novosDados, updatedAt: Date.now() })
}

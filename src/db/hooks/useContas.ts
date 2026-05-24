import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Conta } from '../schema'

export function useContas() {
  return useLiveQuery(() => db.contas.filter(c => c.ativo).toArray(), []) ?? []
}
export function useSaldoTotal() {
  const contas = useContas()
  return contas.reduce((sum, c) => sum + c.saldoAtual, 0)
}
export async function addConta(data: Omit<Conta, 'id' | 'syncId' | 'updatedAt'>) {
  return db.contas.add({ ...data, updatedAt: Date.now() })
}
export async function updateConta(id: number, data: Partial<Conta>) {
  return db.contas.update(id, { ...data, updatedAt: Date.now() })
}
export async function deleteConta(id: number) {
  return db.contas.update(id, { ativo: false, updatedAt: Date.now() })
}

export async function editConta(id: number, data: Partial<import('../schema').Conta>) {
  return db.contas.update(id, { ...data, updatedAt: Date.now() })
}

// Quantos registros estão ATIVOS pendurados nessa conta. Use antes de
// oferecer "Excluir conta" pra avisar o usuário (cascade-safe UX).
// Inclui: transações + contas fixas + investimentos vinculados.
export async function countDependentesByConta(contaId: number): Promise<{
  transacoes: number
  contasFixas: number
  investimentos: number
  total: number
}> {
  const [transacoes, contasFixas, transferDest, invest] = await Promise.all([
    db.transacoes.where('contaId').equals(contaId).count(),
    db.contasFixas.filter(cf => cf.ativo && cf.contaId === contaId).count(),
    // Lado destino de transferências também conta (não indexado, filter scan)
    db.transacoes.filter(t => !!t.transferId && t.contaId === contaId).count(),
    // Investimentos ligados à conta via campo instituicao (texto livre = aproximação)
    db.investimentos.filter(i => i.ativo).count().then(async () => {
      const conta = await db.contas.get(contaId)
      if (!conta) return 0
      return db.investimentos
        .filter(i => i.ativo && i.instituicao?.toLowerCase() === conta.nome.toLowerCase())
        .count()
    }),
  ])
  void transferDest // contado no transacoes via where
  return {
    transacoes,
    contasFixas,
    investimentos: invest,
    total: transacoes + contasFixas + invest,
  }
}

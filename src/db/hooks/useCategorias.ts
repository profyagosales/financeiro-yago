import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Categoria } from '../schema'

// ─── Nomes das 15 categorias seed ─────────────────────────────────────
// Usado pra distinguir categorias seed (read-only) de categorias customizadas
// criadas pelo user. Match por `nome` (case-insensitive, trim).
export const SEED_NAMES = [
  'Alimentação',
  'Moradia',
  'Transporte',
  'Saúde',
  'Lazer',
  'Educação',
  'Vestuário',
  'Assinaturas',
  'Investimentos',
  'Outros gastos',
  'Empréstimos & Dívidas',
  'Salário',
  'Freelance',
  'Rendimentos',
  'Outros',
] as const

export function isSeedCategoria(cat: Pick<Categoria, 'nome'>): boolean {
  const n = cat.nome.trim().toLowerCase()
  return SEED_NAMES.some(s => s.toLowerCase() === n)
}

export function useCategorias(tipo?: 'receita' | 'despesa') {
  return useLiveQuery(
    async () => {
      const cats = tipo
        ? await db.categorias.where('tipo').equals(tipo).toArray()
        : await db.categorias.toArray()
      return cats.sort((a, b) => a.ordem - b.ordem)
    },
    [tipo]
  ) ?? []
}

export async function addCategoria(data: Omit<Categoria, 'id' | 'syncId' | 'ordem'> & { ordem?: number }) {
  const last = await db.categorias.orderBy('ordem').last()
  const nextOrdem = data.ordem ?? ((last?.ordem ?? 0) + 1)
  return db.categorias.add({
    nome: data.nome.trim(),
    tipo: data.tipo,
    icone: data.icone ?? '',
    cor: data.cor,
    ordem: nextOrdem,
  })
}

export async function editCategoria(id: number, data: Partial<Categoria>) {
  // Não permite mudar tipo via essa função (quebraria filtros de transações)
  const { tipo: _tipo, id: _id, syncId: _syncId, ...rest } = data
  void _tipo; void _id; void _syncId
  const patch: Partial<Categoria> = { ...rest }
  if (patch.nome != null) patch.nome = patch.nome.trim()
  return db.categorias.update(id, patch)
}

export async function deleteCategoria(id: number) {
  return db.categorias.delete(id)
}

/** Conta quantas transações referenciam essa categoria (regular + lançamentos cartão + contas fixas). */
export async function countTransacoesByCategoria(id: number): Promise<number> {
  const [tx, lanc, fixas] = await Promise.all([
    db.transacoes.where('categoriaId').equals(id).count(),
    // lancamentosCartao.categoriaId não é indexado — table scan via filter
    db.lancamentosCartao.filter(l => l.categoriaId === id).count(),
    db.contasFixas.where('categoriaId').equals(id).count(),
  ])
  return tx + lanc + fixas
}

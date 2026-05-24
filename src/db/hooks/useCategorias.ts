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
      // `ordem` não é indexado no Dexie — sort em memória, defendendo contra
      // registros legados sem o campo (vem como undefined do sync remoto).
      return cats.sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
    },
    [tipo]
  ) ?? []
}

export async function addCategoria(data: Omit<Categoria, 'id' | 'syncId' | 'ordem'> & { ordem?: number }) {
  // `ordem` não é indexado — table scan pra achar o maior. Volume baixo
  // (sempre < 50 categorias) torna isso aceitável.
  const all = await db.categorias.toArray()
  const maxOrdem = all.reduce((max, c) => (c.ordem ?? 0) > max ? (c.ordem ?? 0) : max, 0)
  const nextOrdem = data.ordem ?? (maxOrdem + 1)
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

// Delete que evita FKs órfãs: reassina referências em transacoes,
// lancamentosCartao, contasFixas, orcamentos e desejos pra categoria
// 'Outros' (mesma tipo) antes de remover. Sem isso, telas que fazem
// `categorias.find(c => c.id === tx.categoriaId)` recebem undefined e
// renderizam "—" / quebram tooltip / o Orçamento dessa categoria fica
// fantasma.
export async function deleteCategoria(id: number) {
  const cat = await db.categorias.get(id)
  if (!cat) return
  // Acha fallback do mesmo tipo (preferência: "Outros" / "Outros gastos")
  const candidatosFallback = await db.categorias
    .where('tipo').equals(cat.tipo)
    .filter(c => c.id !== id)
    .toArray()
  let fallback = candidatosFallback.find(c => /^outros/i.test(c.nome))
              ?? candidatosFallback[0]
  // Se é a ÚLTIMA categoria do tipo, cria "Outros" automaticamente pra
  // não deixar referências órfãs. Sem isso, deletar a última despesa
  // deixava transações/lancamentos com categoriaId apontando pra nada.
  if (!fallback) {
    const nomeFallback = cat.tipo === 'despesa' ? 'Outros gastos' : 'Outros'
    const newId = await db.categorias.add({
      nome: nomeFallback,
      tipo: cat.tipo,
      icone: '📦',
      cor: '#9B7B6A',
      ordem: 999,
    }) as number
    fallback = await db.categorias.get(newId)
  }
  if (fallback?.id) {
    const fallbackId = fallback.id
    await Promise.all([
      // transacoes.categoriaId é indexado — usa where direto
      db.transacoes.where('categoriaId').equals(id).modify({ categoriaId: fallbackId, updatedAt: Date.now() }),
      // lancamentosCartao.categoriaId NÃO é indexado — filter scan
      db.lancamentosCartao.filter(l => l.categoriaId === id).modify({ categoriaId: fallbackId }),
      db.contasFixas.where('categoriaId').equals(id).modify({ categoriaId: fallbackId }),
      // orcamentos: indexado em categoriaId
      db.orcamentos.where('categoriaId').equals(id).modify({ categoriaId: fallbackId }),
      // desejos: categoriaId opcional (filter scan, não indexado)
      db.desejos.filter(d => d.categoriaId === id).modify({ categoriaId: fallbackId, updatedAt: Date.now() }),
    ])
  }
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

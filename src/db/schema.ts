import Dexie, { type Table } from 'dexie'

export interface Conta { id?: number; nome: string; tipo: string; saldoInicial: number; saldoAtual: number; cor: string; icone: string; chequeEspecialLimite?: number; ativo: boolean; syncId?: string; updatedAt: number }
export interface Categoria { id?: number; nome: string; tipo: string; icone: string; cor: string; ordem: number; syncId?: string }
export interface Transacao { id?: number; data: string; valor: number; tipo: string; contaId: number; categoriaId: number; descricao: string; notas?: string; tags?: string[]; status: string; transferId?: string; recorrencia?: string; syncId?: string; updatedAt: number }
export interface Cartao { id?: number; nome: string; bandeira: string; limite: number; cor: string; diaFechamento: number; diaVencimento: number; ativo: boolean; syncId?: string }
export interface LancamentoCartao { id?: number; cartaoId: number; descricao: string; valor: number; data: string; categoriaId: number; parcelaAtual: number; totalParcelas: number; parcelaPaiId?: number; mes: number; ano: number; syncId?: string }
export interface ContaFixa { id?: number; nome: string; valor: number; diaVencimento: number; categoriaId: number; contaId?: number | null; cartaoId?: number; recorrencia: string; alertaDiasAntes: number; ativo: boolean; syncId?: string }
export interface PagamentoFixo { id?: number; contaFixaId: number; mes: number; ano: number; status: string; dataPagamento?: string; valor?: number; syncId?: string }
export interface Meta { id?: number; nome: string; valorAlvo: number; valorAtual: number; prazo?: string; cor: string; icone: string; ativo: boolean; syncId?: string; updatedAt: number }
export interface PatrimonioItem { id?: number; nome: string; tipo: string; subtipo: string; valor: number; jurosAnual?: number; dataQuitacao?: string; syncId?: string; updatedAt: number }

class FinanceiroYagoDB extends Dexie {
  contas!: Table<Conta>; categorias!: Table<Categoria>; transacoes!: Table<Transacao>
  cartoes!: Table<Cartao>; lancamentosCartao!: Table<LancamentoCartao>
  contasFixas!: Table<ContaFixa>; pagamentosFixos!: Table<PagamentoFixo>
  metas!: Table<Meta>; patrimonio!: Table<PatrimonioItem>
  orcamentos!: Table<Orcamento>

  constructor() {
    super('FinanceiroYago')
    this.version(3).stores({
      contas: '++id, tipo, ativo, syncId',
      categorias: '++id, tipo, syncId',
      transacoes: '++id, data, tipo, contaId, categoriaId, status, syncId',
      cartoes: '++id, ativo, syncId',
      lancamentosCartao: '++id, cartaoId, [cartaoId+mes+ano], mes, ano, parcelaPaiId, syncId',
      contasFixas: '++id, ativo, categoriaId, syncId',
      pagamentosFixos: '++id, contaFixaId, [contaFixaId+mes+ano], [mes+ano], syncId',
      metas: '++id, ativo, syncId',
      patrimonio: '++id, tipo, syncId',
      orcamentos: '++id, categoriaId, syncId',
    })
  }
}

export const db = new FinanceiroYagoDB()

export async function seedCategories() {
  const count = await db.categorias.count()
  if (count > 0) return
  await db.categorias.bulkAdd([
    { nome: 'Alimentação', tipo: 'despesa', icone: '🍜', cor: '#E8622A', ordem: 1 },
    { nome: 'Moradia', tipo: 'despesa', icone: '🏠', cor: '#3D7EB5', ordem: 2 },
    { nome: 'Transporte', tipo: 'despesa', icone: '🚗', cor: '#7C5CBF', ordem: 3 },
    { nome: 'Saúde', tipo: 'despesa', icone: '❤️', cor: '#3AA876', ordem: 4 },
    { nome: 'Lazer', tipo: 'despesa', icone: '⭐', cor: '#E89527', ordem: 5 },
    { nome: 'Educação', tipo: 'despesa', icone: '🎓', cor: '#8B4BC8', ordem: 6 },
    { nome: 'Vestuário', tipo: 'despesa', icone: '👕', cor: '#D94F8A', ordem: 7 },
    { nome: 'Assinaturas', tipo: 'despesa', icone: '📺', cor: '#2AA899', ordem: 8 },
    { nome: 'Investimentos', tipo: 'despesa', icone: '📈', cor: '#1E7D5A', ordem: 9 },
    { nome: 'Outros gastos', tipo: 'despesa', icone: '💸', cor: '#9B8A7A', ordem: 10 },
    { nome: 'Salário', tipo: 'receita', icone: '💰', cor: '#3A8580', ordem: 11 },
    { nome: 'Freelance', tipo: 'receita', icone: '💻', cor: '#1E7D5A', ordem: 12 },
    { nome: 'Rendimentos', tipo: 'receita', icone: '📊', cor: '#D4A017', ordem: 13 },
    { nome: 'Outros', tipo: 'receita', icone: '✨', cor: '#7A5C4F', ordem: 14 },
  ])
}

export interface Orcamento { id?: number; categoriaId: number; valorLimite: number; periodo: string; rollover: boolean; inicio?: string; fim?: string; syncId?: string }

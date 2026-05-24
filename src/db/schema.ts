import Dexie, { type Table } from 'dexie'

// ─── Existentes ──────────────────────────────────────────────────────
export interface Conta { id?: number; nome: string; tipo: string; saldoInicial: number; saldoAtual: number; cor: string; icone: string; logo?: string; chequeEspecialLimite?: number; ativo: boolean; syncId?: string; updatedAt: number }
export interface Categoria { id?: number; nome: string; tipo: string; icone: string; cor: string; ordem: number; syncId?: string }
export interface Transacao { id?: number; data: string; valor: number; tipo: string; contaId: number; categoriaId: number; descricao: string; notas?: string; tags?: string[]; status: string; transferId?: string; recorrencia?: string; syncId?: string; updatedAt: number }
export interface Cartao { id?: number; nome: string; bandeira: string; limite: number; cor: string; diaFechamento: number; diaVencimento: number; ativo: boolean; logo?: string; titular?: string; ultimosDigitos?: string; syncId?: string }
export interface LancamentoCartao { id?: number; cartaoId: number; descricao: string; valor: number; data: string; categoriaId: number; parcelaAtual: number; totalParcelas: number; parcelaPaiId?: number; mes: number; ano: number; syncId?: string }
export interface ContaFixa { id?: number; nome: string; valor: number; diaVencimento: number; categoriaId: number; contaId?: number | null; cartaoId?: number; recorrencia: string; alertaDiasAntes: number; ativo: boolean; syncId?: string }
export interface PagamentoFixo { id?: number; contaFixaId: number; mes: number; ano: number; status: string; dataPagamento?: string; valor?: number; syncId?: string }

// ─── Meta refatorada (v5) ────────────────────────────────────────────
//   - Novo campo `tipo` distingue Compra / Reserva de Emergência / Aposentadoria / Outros
//   - Campos `mesesCobertura` e `alvoAutoCalculado` exclusivos de Reserva
//   - `valorAtual` continua existindo (aportes diretos sem investimento)
//   - Total real da meta = valorAtual + soma dos investimentos vinculados
export type MetaTipo = 'compra' | 'reserva_emergencia' | 'aposentadoria' | 'outros'
export interface Meta {
  id?: number
  nome: string
  tipo?: MetaTipo
  valorAlvo: number
  valorAtual: number
  prazo?: string
  mesesCobertura?: 3 | 6 | 12      // só Reserva
  alvoAutoCalculado?: boolean      // só Reserva
  cor: string
  icone: string
  ativo: boolean
  syncId?: string
  updatedAt: number
}

// ─── PatrimonioItem (legacy) — mantido durante migração ──────────────
export interface PatrimonioItem { id?: number; nome: string; tipo: string; subtipo: string; valor: number; jurosAnual?: number; dataQuitacao?: string; syncId?: string; updatedAt: number }

// ─── Investimento (NOVO v5) ──────────────────────────────────────────
export type InvestimentoTipo = 'CDB' | 'Tesouro' | 'Poupança' | 'Caixinha' | 'Cripto' | 'Ação' | 'FII' | 'ETF' | 'Outros'
export type InvestimentoBenchmark = 'CDI' | 'Selic' | 'IPCA+' | 'Prefixado' | 'Atrelado'
export type InvestimentoLiquidez = 'diaria' | 'no_vencimento' | '30d' | '90d' | '180d' | '365d'
export type ValorAtualSource = 'auto' | 'manual'

// Modelo de rendimento da renda fixa:
//   prefixado    → taxa fixa anual (12% a.a.) — não importa o que aconteça no mercado
//   pos_cdi      → % do CDI (ex: 102% do CDI vigente)
//   pos_selic    → % da Selic
//   ipca_mais    → IPCA + X% a.a. (híbrido)
//   prefixado_ipca → IPCA cheio (sem adicional)
export type TipoRendimento = 'prefixado' | 'pos_cdi' | 'pos_selic' | 'ipca_mais' | 'prefixado_ipca'

export interface Investimento {
  id?: number
  nome: string
  tipo: InvestimentoTipo
  instituicao?: string
  valorAplicado: number
  valorAtual: number
  valorAtualSource: ValorAtualSource    // hibrido: 'auto' aplica rentabilidade / 'manual' fixo
  rentabilidadeAnual?: number           // taxa efetiva anual EM DECIMAL (0.12 = 12% ao ano)
                                        //   - prefixado: a taxa em si
                                        //   - pos_*: calculada (% indexador × taxa do indexador)
                                        //   - ipca_mais: aproximada (IPCA + adicional)
  benchmark?: InvestimentoBenchmark     // (legacy) — usar tipoRendimento
  liquidez?: InvestimentoLiquidez
  dataAplicacao: string                 // YYYY-MM-DD
  dataVencimento?: string               // YYYY-MM-DD
  metaId?: number                       // vinculo com Meta
  cor: string
  icone?: string
  ativo: boolean
  ultimaAtualizacaoAuto?: number        // timestamp da última aplicação auto
  // ─── Modelo de rendimento (renda fixa) ────────────────────────────
  tipoRendimento?: TipoRendimento
  percentualIndexador?: number          // 1.02 = 102%; usado em pos_cdi/pos_selic
  taxaAdicional?: number                // 0.0545 = 5,45% a.a.; usado em ipca_mais
  // ─── Renda variável (Ações, FIIs, ETFs, Cripto) ───────────────────
  quantidade?: number                   // X cotas/ações/moedas
  precoMedio?: number                   // preço médio de compra por unidade (na moeda do ativo)
  cotacaoAtual?: number                 // cotação atual por unidade (na moeda do ativo)
  ticker?: string                       // BBAS3, HGLG11, BTC, AAPL, etc
  // ─── Moeda do ativo (v10) ─────────────────────────────────────────
  // BRL é padrão. USD usado pra ativos no exterior (ações US, REITs,
  // ETFs US, cripto cotada em dólar). Valores armazenados nessa moeda;
  // conversão pra BRL acontece on-the-fly via cotação do dólar.
  moeda?: 'BRL' | 'USD'                 // default 'BRL'
  syncId?: string
  updatedAt: number
}

// ─── AppConfig (NOVO v9) ─────────────────────────────────────────────
// Key-value pra configurações globais (taxas de mercado, preferências).
export interface AppConfig {
  id?: number
  key: string                           // 'taxas_benchmark', 'tema', etc
  value: unknown                        // JSON serializável
  updatedAt: number
}

// Taxas de mercado correntes (atualizadas pelo usuário em Configurações)
export interface TaxasBenchmark {
  cdi: number       // 0.1065 = 10,65% a.a.
  selic: number     // 0.1075 = 10,75% a.a.
  ipca: number      // 0.0445 = 4,45% a.a.
  atualizadoEm: number  // timestamp
}

export const TAXAS_BENCHMARK_DEFAULT: TaxasBenchmark = {
  cdi: 0.1065,   // valores aproximados maio/2026
  selic: 0.1075,
  ipca: 0.0445,
  atualizadoEm: Date.now(),
}

// ─── DividaMovimentacao (NOVO v8) ────────────────────────────────────
// Eventos que afetam o saldo da dívida além das parcelas regulares:
// - amortização extraordinária (paga valor extra, abate principal)
// - desconto (banco perdoa parte do saldo)
// - quitação (paga restante, opcionalmente com desconto)
// - ajuste manual (juros adicionais cobrados, correções, etc)
export type MovimentacaoTipo = 'amortizacao' | 'desconto' | 'quitacao' | 'ajuste'

export interface DividaMovimentacao {
  id?: number
  dividaId: number
  data: string                          // YYYY-MM-DD
  tipo: MovimentacaoTipo
  valor: number                         // R$ — sempre positivo; "ajuste" pode ser negativo (acréscimo)
  reduzParcelas?: number                // amortização que adianta N parcelas finais (opcional)
  observacao?: string
  syncId?: string
  updatedAt: number
}

// ─── InvestimentoAporte (NOVO v7, custos em v10) ─────────────────────
// Cada compra individual de um ativo de renda variável.
// Quantidade total e preço médio são derivados desta tabela.
export interface InvestimentoAporte {
  id?: number
  investimentoId: number
  data: string                          // YYYY-MM-DD da compra
  quantidade: number                    // cotas/ações/moedas adquiridas
  precoUnitario: number                 // VALOR por unidade na moeda do ativo
  // Custos da operação (corretagem + emolumentos + IOF + taxas) — v10
  custos?: number                       // VALOR total na moeda do ativo (incluído no PM)
  observacao?: string
  syncId?: string
  updatedAt: number
}

// ─── InvestimentoMovimentacao (NOVO v10) ─────────────────────────────
// Eventos de SAÍDA: venda de renda variável ou resgate de renda fixa.
// Aportes ficam em InvestimentoAporte (entradas); aqui ficam saídas.
export type InvestMovTipo = 'venda' | 'resgate'

export interface InvestimentoMovimentacao {
  id?: number
  investimentoId: number
  data: string                          // YYYY-MM-DD
  tipo: InvestMovTipo
  // ─── Renda variável (venda) ──────────────────────────────────────
  quantidade?: number                   // unidades vendidas (RV)
  precoUnitario?: number                // preço de venda por unidade
  // ─── Renda fixa (resgate) ────────────────────────────────────────
  valorResgate?: number                 // R$/US$ resgatado (RF)
  // ─── Comum a ambos ───────────────────────────────────────────────
  custos?: number                       // corretagem/emolumentos/IOF na saída
  // Snapshot pra histórico/cálculo de resultado (não é fonte da verdade)
  pmNaData?: number                     // PM do ativo no momento da venda
  resultado?: number                    // lucro/prejuízo realizado (líquido)
  observacao?: string
  syncId?: string
  updatedAt: number
}

// ─── InvestimentoProvento (NOVO v6) ──────────────────────────────────
// Registro de proventos recebidos (dividendos de ações, aluguéis de FII,
// JCP, rendimentos de cripto staking, etc).
export type ProventoTipo = 'dividendo' | 'jcp' | 'aluguel' | 'rendimento' | 'bonificacao' | 'outros'

export interface InvestimentoProvento {
  id?: number
  investimentoId: number
  data: string                          // YYYY-MM-DD do recebimento
  valor: number                         // R$ líquido recebido
  tipo: ProventoTipo
  observacao?: string
  syncId?: string
  updatedAt: number
}

// ─── Divida (NOVO v5) ────────────────────────────────────────────────
export type DividaTipo = 'Empréstimo' | 'Financiamento' | 'Cheque especial' | 'Outros'

export interface Divida {
  id?: number
  nome: string
  tipo: DividaTipo
  instituicao?: string
  valorTotal: number                    // total da dívida (com juros já considerado)
  valorPago: number                     // total já pago
  valorParcela: number
  parcelasTotal: number
  parcelasPagas: number
  jurosAnual?: number                   // 0.18 = 18% ao ano
  dataInicio: string                    // YYYY-MM-DD
  diaVencimento: number                 // 1-31
  contaFixaId?: number                  // vínculo automático com ContaFixa
  categoriaId?: number                  // categoria usada na ContaFixa
  cor: string
  ativo: boolean
  syncId?: string
  updatedAt: number
}

// ─── Desejo (NOVO v5) ────────────────────────────────────────────────
export type DesejoPrioridade = 'urgente' | 'mensal' | 'media' | 'baixa' | 'algum_dia'
export type DesejoStatus = 'aberto' | 'comprado' | 'desistido'

export interface Desejo {
  id?: number
  nome: string
  descricao?: string
  prioridade: DesejoPrioridade
  valorEstimado?: number
  valorMenorEncontrado?: number
  link?: string
  imagem?: string                       // base64
  observacoes?: string
  status: DesejoStatus
  categoriaId?: number                  // sugestão ao comprar
  dataDesejo: string                    // YYYY-MM-DD
  dataCompra?: string
  transacaoId?: number                  // vínculo com transação se comprado
  cor?: string
  icone?: string
  syncId?: string
  updatedAt: number
}

// ─── Orcamento (mantido) ─────────────────────────────────────────────
export interface Orcamento { id?: number; categoriaId: number; valorLimite: number; periodo: string; rollover: boolean; inicio?: string; fim?: string; syncId?: string }
// ─── Anexo (mantido) ─────────────────────────────────────────────────
export interface Anexo { id?: number; transacaoId: number; tipo: string; nomeArquivo: string; dados: string; tamanho: number; criadoEm: string }

// ═══ Database ════════════════════════════════════════════════════════
class FinanceiroYagoDB extends Dexie {
  contas!: Table<Conta>
  categorias!: Table<Categoria>
  transacoes!: Table<Transacao>
  cartoes!: Table<Cartao>
  lancamentosCartao!: Table<LancamentoCartao>
  contasFixas!: Table<ContaFixa>
  pagamentosFixos!: Table<PagamentoFixo>
  metas!: Table<Meta>
  patrimonio!: Table<PatrimonioItem>      // legacy (mantida pra migração)
  orcamentos!: Table<Orcamento>
  anexos!: Table<Anexo>
  // Novas tabelas v5
  investimentos!: Table<Investimento>
  dividas!: Table<Divida>
  desejos!: Table<Desejo>
  // Novas tabelas v6
  investimentosProventos!: Table<InvestimentoProvento>
  // Nova tabela v7
  investimentosAportes!: Table<InvestimentoAporte>
  // Nova tabela v8
  dividasMovimentacoes!: Table<DividaMovimentacao>
  // Nova tabela v9
  appConfig!: Table<AppConfig>
  // Nova tabela v10
  investimentosMovimentacoes!: Table<InvestimentoMovimentacao>

  constructor() {
    super('FinanceiroYago')

    // v4 (estado anterior)
    this.version(4).stores({
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
      anexos: '++id, transacaoId',
    })

    // v5 — Investimentos + Dívidas + Desejos + Meta com tipos
    this.version(5).stores({
      contas: '++id, tipo, ativo, syncId',
      categorias: '++id, tipo, syncId',
      transacoes: '++id, data, tipo, contaId, categoriaId, status, syncId',
      cartoes: '++id, ativo, syncId',
      lancamentosCartao: '++id, cartaoId, [cartaoId+mes+ano], mes, ano, parcelaPaiId, syncId',
      contasFixas: '++id, ativo, categoriaId, syncId',
      pagamentosFixos: '++id, contaFixaId, [contaFixaId+mes+ano], [mes+ano], syncId',
      metas: '++id, ativo, tipo, syncId',
      patrimonio: '++id, tipo, syncId',
      orcamentos: '++id, categoriaId, syncId',
      anexos: '++id, transacaoId',
      // NOVAS
      investimentos: '++id, tipo, metaId, ativo, syncId',
      dividas: '++id, tipo, contaFixaId, ativo, syncId',
      desejos: '++id, status, prioridade, transacaoId, syncId',
    }).upgrade(async tx => {
      // ── Migração: PatrimonioItem → Investimento / Divida ──
      const items = await tx.table('patrimonio').toArray() as PatrimonioItem[]
      const hoje = new Date().toISOString().split('T')[0]

      for (const item of items) {
        if (item.tipo === 'ativo') {
          // ativo → investimento
          const tipoMap: Record<string, InvestimentoTipo> = {
            'investimento': 'CDB',
            'poupanca': 'Poupança',
            'imovel': 'Outros',
            'veiculo': 'Outros',
            'outros': 'Outros',
          }
          await tx.table('investimentos').add({
            nome: item.nome,
            tipo: tipoMap[item.subtipo] ?? 'Outros',
            valorAplicado: item.valor,
            valorAtual: item.valor,
            valorAtualSource: 'manual',
            rentabilidadeAnual: item.jurosAnual,
            dataAplicacao: hoje,
            cor: '#3A8580',
            ativo: true,
            updatedAt: Date.now(),
          } as Investimento)
        } else if (item.tipo === 'passivo') {
          // passivo → divida
          const tipoMap: Record<string, DividaTipo> = {
            'financiamento': 'Financiamento',
            'emprestimo': 'Empréstimo',
            'cartao': 'Outros',
            'outros': 'Outros',
          }
          await tx.table('dividas').add({
            nome: item.nome,
            tipo: tipoMap[item.subtipo] ?? 'Outros',
            valorTotal: item.valor,
            valorPago: 0,
            valorParcela: 0,
            parcelasTotal: 0,
            parcelasPagas: 0,
            jurosAnual: item.jurosAnual,
            dataInicio: hoje,
            diaVencimento: 1,
            cor: '#C4553B',
            ativo: true,
            updatedAt: Date.now(),
          } as Divida)
        }
      }

      // ── Migração: Meta ganha tipo default 'outros' ──
      const metas = await tx.table('metas').toArray()
      for (const meta of metas) {
        if (!meta.tipo) {
          await tx.table('metas').update(meta.id!, { tipo: 'outros' })
        }
      }
    })

    // v6 — Proventos de investimentos (renda variável: FII, ações, etc)
    this.version(6).stores({
      contas: '++id, tipo, ativo, syncId',
      categorias: '++id, tipo, syncId',
      transacoes: '++id, data, tipo, contaId, categoriaId, status, syncId',
      cartoes: '++id, ativo, syncId',
      lancamentosCartao: '++id, cartaoId, [cartaoId+mes+ano], mes, ano, parcelaPaiId, syncId',
      contasFixas: '++id, ativo, categoriaId, syncId',
      pagamentosFixos: '++id, contaFixaId, [contaFixaId+mes+ano], [mes+ano], syncId',
      metas: '++id, ativo, tipo, syncId',
      patrimonio: '++id, tipo, syncId',
      orcamentos: '++id, categoriaId, syncId',
      anexos: '++id, transacaoId',
      investimentos: '++id, tipo, metaId, ativo, syncId',
      dividas: '++id, tipo, contaFixaId, ativo, syncId',
      desejos: '++id, status, prioridade, transacaoId, syncId',
      // NOVA
      investimentosProventos: '++id, investimentoId, data, tipo, syncId',
    })

    // v7 — Aportes (compras individuais) → derivam quantidade e preço médio
    this.version(7).stores({
      contas: '++id, tipo, ativo, syncId',
      categorias: '++id, tipo, syncId',
      transacoes: '++id, data, tipo, contaId, categoriaId, status, syncId',
      cartoes: '++id, ativo, syncId',
      lancamentosCartao: '++id, cartaoId, [cartaoId+mes+ano], mes, ano, parcelaPaiId, syncId',
      contasFixas: '++id, ativo, categoriaId, syncId',
      pagamentosFixos: '++id, contaFixaId, [contaFixaId+mes+ano], [mes+ano], syncId',
      metas: '++id, ativo, tipo, syncId',
      patrimonio: '++id, tipo, syncId',
      orcamentos: '++id, categoriaId, syncId',
      anexos: '++id, transacaoId',
      investimentos: '++id, tipo, metaId, ativo, syncId',
      dividas: '++id, tipo, contaFixaId, ativo, syncId',
      desejos: '++id, status, prioridade, transacaoId, syncId',
      investimentosProventos: '++id, investimentoId, data, tipo, syncId',
      investimentosAportes: '++id, investimentoId, data, syncId',
    }).upgrade(async tx => {
      // Migração: investimentos de renda variável que já têm quantidade+precoMedio
      // ganham um "aporte inicial" sintético para preservar o histórico.
      const RV: string[] = ['Ação', 'FII', 'ETF', 'Cripto']
      const invs = await tx.table('investimentos').toArray()
      for (const inv of invs) {
        if (!inv.id) continue
        if (!RV.includes(inv.tipo)) continue
        if (!inv.quantidade || !inv.precoMedio) continue
        await tx.table('investimentosAportes').add({
          investimentoId: inv.id,
          data: inv.dataAplicacao,
          quantidade: inv.quantidade,
          precoUnitario: inv.precoMedio,
          observacao: 'Aporte inicial (migração)',
          updatedAt: Date.now(),
        })
      }
    })

    // v8 — Movimentações de dívidas (amortização, desconto, quitação, ajuste)
    this.version(8).stores({
      contas: '++id, tipo, ativo, syncId',
      categorias: '++id, tipo, syncId',
      transacoes: '++id, data, tipo, contaId, categoriaId, status, syncId',
      cartoes: '++id, ativo, syncId',
      lancamentosCartao: '++id, cartaoId, [cartaoId+mes+ano], mes, ano, parcelaPaiId, syncId',
      contasFixas: '++id, ativo, categoriaId, syncId',
      pagamentosFixos: '++id, contaFixaId, [contaFixaId+mes+ano], [mes+ano], syncId',
      metas: '++id, ativo, tipo, syncId',
      patrimonio: '++id, tipo, syncId',
      orcamentos: '++id, categoriaId, syncId',
      anexos: '++id, transacaoId',
      investimentos: '++id, tipo, metaId, ativo, syncId',
      dividas: '++id, tipo, contaFixaId, ativo, syncId',
      desejos: '++id, status, prioridade, transacaoId, syncId',
      investimentosProventos: '++id, investimentoId, data, tipo, syncId',
      investimentosAportes: '++id, investimentoId, data, syncId',
      dividasMovimentacoes: '++id, dividaId, data, tipo, syncId',
    })

    // v9 — AppConfig (taxas de mercado, preferências)
    this.version(9).stores({
      contas: '++id, tipo, ativo, syncId',
      categorias: '++id, tipo, syncId',
      transacoes: '++id, data, tipo, contaId, categoriaId, status, syncId',
      cartoes: '++id, ativo, syncId',
      lancamentosCartao: '++id, cartaoId, [cartaoId+mes+ano], mes, ano, parcelaPaiId, syncId',
      contasFixas: '++id, ativo, categoriaId, syncId',
      pagamentosFixos: '++id, contaFixaId, [contaFixaId+mes+ano], [mes+ano], syncId',
      metas: '++id, ativo, tipo, syncId',
      patrimonio: '++id, tipo, syncId',
      orcamentos: '++id, categoriaId, syncId',
      anexos: '++id, transacaoId',
      investimentos: '++id, tipo, metaId, ativo, syncId',
      dividas: '++id, tipo, contaFixaId, ativo, syncId',
      desejos: '++id, status, prioridade, transacaoId, syncId',
      investimentosProventos: '++id, investimentoId, data, tipo, syncId',
      investimentosAportes: '++id, investimentoId, data, syncId',
      dividasMovimentacoes: '++id, dividaId, data, tipo, syncId',
      // NOVA
      appConfig: '++id, &key',
    })

    // v10 — Vendas/resgates de investimento + custos no aporte + moeda do ativo
    this.version(10).stores({
      contas: '++id, tipo, ativo, syncId',
      categorias: '++id, tipo, syncId',
      transacoes: '++id, data, tipo, contaId, categoriaId, status, syncId',
      cartoes: '++id, ativo, syncId',
      lancamentosCartao: '++id, cartaoId, [cartaoId+mes+ano], mes, ano, parcelaPaiId, syncId',
      contasFixas: '++id, ativo, categoriaId, syncId',
      pagamentosFixos: '++id, contaFixaId, [contaFixaId+mes+ano], [mes+ano], syncId',
      metas: '++id, ativo, tipo, syncId',
      patrimonio: '++id, tipo, syncId',
      orcamentos: '++id, categoriaId, syncId',
      anexos: '++id, transacaoId',
      investimentos: '++id, tipo, metaId, ativo, syncId',
      dividas: '++id, tipo, contaFixaId, ativo, syncId',
      desejos: '++id, status, prioridade, transacaoId, syncId',
      investimentosProventos: '++id, investimentoId, data, tipo, syncId',
      investimentosAportes: '++id, investimentoId, data, syncId',
      dividasMovimentacoes: '++id, dividaId, data, tipo, syncId',
      appConfig: '++id, &key',
      // NOVA
      investimentosMovimentacoes: '++id, investimentoId, data, tipo, syncId',
    })
  }
}

export const db = new FinanceiroYagoDB()

// ═══ Seeds ════════════════════════════════════════════════════════════
let _seeding = false
export async function seedCategories() {
  if (_seeding) return
  _seeding = true
  try {
    const count = await db.categorias.count()
    if (count > 0) {
      // Categoria nova "Empréstimos & Dívidas" — garantir mesmo em bases antigas
      const existeEmprestimos = await db.categorias.filter(c => c.nome.toLowerCase().includes('empréstimo') || c.nome.toLowerCase().includes('emprestimo')).first()
      if (!existeEmprestimos) {
        await db.categorias.add({ nome: 'Empréstimos & Dívidas', tipo: 'despesa', icone: '', cor: '#B94040', ordem: 11 })
      }
      _seeding = false
      return
    }
    await db.categorias.bulkAdd([
      { nome: 'Alimentação',          tipo: 'despesa', icone: '', cor: '#E8622A', ordem: 1 },
      { nome: 'Moradia',              tipo: 'despesa', icone: '', cor: '#3D7EB5', ordem: 2 },
      { nome: 'Transporte',           tipo: 'despesa', icone: '', cor: '#7C5CBF', ordem: 3 },
      { nome: 'Saúde',                tipo: 'despesa', icone: '', cor: '#3AA876', ordem: 4 },
      { nome: 'Lazer',                tipo: 'despesa', icone: '', cor: '#E89527', ordem: 5 },
      { nome: 'Educação',             tipo: 'despesa', icone: '', cor: '#8B4BC8', ordem: 6 },
      { nome: 'Vestuário',            tipo: 'despesa', icone: '', cor: '#D94F8A', ordem: 7 },
      { nome: 'Assinaturas',          tipo: 'despesa', icone: '', cor: '#2AA899', ordem: 8 },
      { nome: 'Investimentos',        tipo: 'despesa', icone: '', cor: '#1E7D5A', ordem: 9 },
      { nome: 'Outros gastos',        tipo: 'despesa', icone: '', cor: '#9B8A7A', ordem: 10 },
      { nome: 'Empréstimos & Dívidas',tipo: 'despesa', icone: '', cor: '#B94040', ordem: 11 },
      { nome: 'Salário',              tipo: 'receita', icone: '', cor: '#3A8580', ordem: 12 },
      { nome: 'Freelance',            tipo: 'receita', icone: '', cor: '#1E7D5A', ordem: 13 },
      { nome: 'Rendimentos',          tipo: 'receita', icone: '', cor: '#D4A017', ordem: 14 },
      { nome: 'Outros',               tipo: 'receita', icone: '', cor: '#7A5C4F', ordem: 15 },
    ])
  } finally { _seeding = false }
}

export async function deduplicateCategories() {
  const all = await db.categorias.orderBy('id').toArray()
  const seen = new Set<string>()
  const toDelete: number[] = []
  for (const cat of all) {
    const key = `${cat.nome}|${cat.tipo}`
    if (seen.has(key)) toDelete.push(cat.id!)
    else seen.add(key)
  }
  if (toDelete.length > 0) await db.categorias.bulkDelete(toDelete)
}

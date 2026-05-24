import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Investimento, type InvestimentoTipo, type InvestimentoProvento, type InvestimentoAporte, type InvestimentoMovimentacao } from '../schema'
import { getTaxasBenchmark, calcTaxaEfetiva, getBrapiToken } from './useAppConfig'
import { fetchCotacaoPorTipo, fetchCotacaoDolar, registerBrapiTokenGetter } from '@/lib/cotacoes'

// Registra getter do token Brapi (resolve dependência circular: lib/cotacoes
// não pode importar de db/hooks diretamente).
registerBrapiTokenGetter(getBrapiToken)

export function useInvestimentos() {
  return useLiveQuery(() => db.investimentos.filter(i => i.ativo).toArray(), []) ?? []
}

export function useInvestimentosByTipo(tipo: InvestimentoTipo) {
  return useLiveQuery(
    () => db.investimentos.where('tipo').equals(tipo).filter(i => i.ativo).toArray(),
    [tipo],
  ) ?? []
}

export function useInvestimentosByMeta(metaId: number | undefined) {
  return useLiveQuery(
    () => metaId === undefined
      ? db.investimentos.filter(i => i.ativo && i.metaId === undefined).toArray()
      : db.investimentos.where('metaId').equals(metaId).filter(i => i.ativo).toArray(),
    [metaId],
  ) ?? []
}

export function useTotalInvestimentos() {
  const list = useInvestimentos()
  // Converte ativos USD pra BRL usando cotação cacheada
  const { totalBRL, aplicadoBRL, rendimentoBRL } = totalCarteiraBRL(list)
  return { total: totalBRL, aplicado: aplicadoBRL, rendimento: rendimentoBRL }
}

// ─── Tags determinísticas pra rastrear Transacao espelho ─────────────
// Usadas em addInvestimento + addAporte pra ligar a Transacao de débito
// criada na conta origem. Permite reverter saldo no delete sem mexer
// no schema (descricao é livre, e os tags são únicos por entidade).
const tagInvest = (id: number) => `[invest:${id}]`
const tagAporte = (id: number) => `[aporte:${id}]`

export async function addInvestimento(
  data: Omit<Investimento, 'id' | 'syncId' | 'updatedAt'>,
  opts?: { contaOrigemId?: number; categoriaId?: number },
) {
  const id = await db.investimentos.add({ ...data, updatedAt: Date.now() })
  // Se origem informada, debita conta com Transacao categoria "Investimentos".
  // Tag determinística na descricao permite reverter no delete.
  if (opts?.contaOrigemId && data.valorAplicado > 0) {
    const catInvest = await db.categorias.filter(c => c.tipo === 'despesa' && c.nome.toLowerCase().includes('investimento')).first()
    const catId = opts.categoriaId ?? catInvest?.id ?? 1
    const { addTransacao } = await import('./useTransacoes')
    await addTransacao({
      data: data.dataAplicacao,
      valor: data.valorAplicado,
      tipo: 'despesa',
      contaId: opts.contaOrigemId,
      categoriaId: catId,
      descricao: `Aplicação em ${data.nome} ${tagInvest(id as number)}`,
      status: 'efetivada',
      recorrencia: 'unica',
    })
  }
  return id
}

export async function editInvestimento(id: number, data: Partial<Investimento>) {
  return db.investimentos.update(id, { ...data, updatedAt: Date.now() })
}

export async function deleteInvestimento(id: number) {
  // Reverte a Transacao espelho (se existir): deletar a tx restaura o
  // saldo da conta automaticamente via deleteTransacao.
  const tag = tagInvest(id)
  const espelho = await db.transacoes.filter(t => t.descricao.includes(tag)).first()
  if (espelho?.id) {
    const { deleteTransacao } = await import('./useTransacoes')
    await deleteTransacao(espelho.id)
  }
  return db.investimentos.update(id, { ativo: false, updatedAt: Date.now() })
}

// ─── Auto-update da rentabilidade (modo híbrido) ─────────────────────
// Aplica a rentabilidade proporcional aos meses decorridos desde a última atualização.
// Usa taxa efetiva calculada a partir de tipoRendimento + taxas vigentes
// (CDI/Selic/IPCA) para pós-fixados e híbridos. Cai pra rentabilidadeAnual
// fixa pra prefixados ou casos legados.
export async function aplicarRentabilidadeAuto(id: number) {
  const inv = await db.investimentos.get(id)
  if (!inv) return
  if (inv.valorAtualSource !== 'auto') return

  const taxas = await getTaxasBenchmark()
  const taxaEfetiva = calcTaxaEfetiva(inv, taxas)
  if (!taxaEfetiva || taxaEfetiva <= 0) return

  const last = inv.ultimaAtualizacaoAuto ?? new Date(inv.dataAplicacao + 'T00:00:00').getTime()
  const now = Date.now()
  const monthsElapsed = (now - last) / (1000 * 60 * 60 * 24 * 30.44)
  if (monthsElapsed < 1) return // só atualiza após 1 mês completo

  const monthlyRate = Math.pow(1 + taxaEfetiva, 1 / 12) - 1
  const novoValor = inv.valorAtual * Math.pow(1 + monthlyRate, monthsElapsed)

  await db.investimentos.update(id, {
    valorAtual: Math.round(novoValor * 100) / 100,
    rentabilidadeAnual: taxaEfetiva, // mantém atualizado pra exibição
    ultimaAtualizacaoAuto: now,
    updatedAt: Date.now(),
  })
}

export async function aplicarRentabilidadeAutoTodos() {
  const all = await db.investimentos
    .filter(i => i.ativo && i.valorAtualSource === 'auto')
    .toArray()
  for (const inv of all) {
    if (inv.id !== undefined) await aplicarRentabilidadeAuto(inv.id)
  }
}

// Liquidez de alta liquidez (para sugestão na Reserva de Emergência)
export const TIPOS_ALTA_LIQUIDEZ: InvestimentoTipo[] = ['Poupança', 'Caixinha', 'Tesouro', 'CDB']

export function isAltaLiquidez(inv: Pick<Investimento, 'tipo' | 'liquidez'>) {
  return TIPOS_ALTA_LIQUIDEZ.includes(inv.tipo) && (inv.liquidez === 'diaria' || inv.liquidez === undefined)
}

// ─── Classificação por modelo de cálculo ─────────────────────────────
// Renda variável usa quantidade × cotacaoAtual; renda fixa usa rentabilidade.
export const TIPOS_RENDA_VARIAVEL: InvestimentoTipo[] = ['Ação', 'FII', 'ETF', 'Cripto']
export const TIPOS_RENDA_FIXA: InvestimentoTipo[] = ['CDB', 'Tesouro']
export const TIPOS_PROVENTO: InvestimentoTipo[] = ['Ação', 'FII', 'ETF'] // costuma pagar dividendos

export function isRendaVariavel(tipo: InvestimentoTipo): boolean {
  return TIPOS_RENDA_VARIAVEL.includes(tipo)
}
export function isRendaFixa(tipo: InvestimentoTipo): boolean {
  return TIPOS_RENDA_FIXA.includes(tipo)
}
export function aceitaProventos(tipo: InvestimentoTipo): boolean {
  return TIPOS_PROVENTO.includes(tipo)
}

// ─── Proventos (dividendos, JCP, aluguéis de FII, etc) ───────────────
export function useProventos(investimentoId: number | undefined) {
  return useLiveQuery(
    () => investimentoId === undefined
      ? Promise.resolve([])
      : db.investimentosProventos.where('investimentoId').equals(investimentoId).reverse().sortBy('data'),
    [investimentoId],
  ) ?? []
}

export function useAllProventos() {
  return useLiveQuery(() => db.investimentosProventos.toArray(), []) ?? []
}

export async function addProvento(data: Omit<InvestimentoProvento, 'id' | 'syncId' | 'updatedAt'>) {
  return db.investimentosProventos.add({ ...data, updatedAt: Date.now() })
}

export async function deleteProvento(id: number) {
  return db.investimentosProventos.delete(id)
}

// Dividend Yield 12m = soma dos proventos dos últimos 365d / valorAtual
export function calcDY12m(proventos: InvestimentoProvento[], valorAtual: number): number {
  if (valorAtual <= 0) return 0
  const cutoff = Date.now() - 365 * 24 * 60 * 60 * 1000
  const totalAno = proventos
    .filter(p => new Date(p.data + 'T00:00:00').getTime() >= cutoff)
    .reduce((s, p) => s + p.valor, 0)
  return (totalAno / valorAtual) * 100
}

// Total recebido em proventos no mês corrente
export function calcProventosMes(proventos: InvestimentoProvento[]): number {
  const now = new Date()
  const mes = now.getMonth()
  const ano = now.getFullYear()
  return proventos
    .filter(p => {
      const d = new Date(p.data + 'T00:00:00')
      return d.getMonth() === mes && d.getFullYear() === ano
    })
    .reduce((s, p) => s + p.valor, 0)
}

// ─── Aportes (compras individuais) ─────────────────────────────────
// Renda variável: cada compra vira um aporte. Quantidade total e preço
// médio são DERIVADOS desta tabela (fonte da verdade).
export function useAportes(investimentoId: number | undefined) {
  return useLiveQuery(
    () => investimentoId === undefined
      ? Promise.resolve([])
      : db.investimentosAportes.where('investimentoId').equals(investimentoId).reverse().sortBy('data'),
    [investimentoId],
  ) ?? []
}

export async function addAporte(
  data: Omit<InvestimentoAporte, 'id' | 'syncId' | 'updatedAt'>,
  opts?: { contaOrigemId?: number; categoriaId?: number },
) {
  const id = await db.investimentosAportes.add({ ...data, updatedAt: Date.now() }) as number
  await recalcInvestimentoFromAportes(data.investimentoId)
  // Debita conta se origem informada. Tag determinística [aporte:{id}]
  // permite reverter a Transacao no deleteAporte.
  if (opts?.contaOrigemId) {
    const inv = await db.investimentos.get(data.investimentoId)
    const valorTotal = data.quantidade * data.precoUnitario + (data.custos ?? 0)
    if (valorTotal > 0) {
      const catInvest = await db.categorias.filter(c => c.tipo === 'despesa' && c.nome.toLowerCase().includes('investimento')).first()
      const catId = opts.categoriaId ?? catInvest?.id ?? 1
      const { addTransacao } = await import('./useTransacoes')
      await addTransacao({
        data: data.data,
        valor: valorTotal,
        tipo: 'despesa',
        contaId: opts.contaOrigemId,
        categoriaId: catId,
        descricao: `Aporte em ${inv?.nome ?? 'investimento'} ${tagAporte(id)}`,
        status: 'efetivada',
        recorrencia: 'unica',
      })
    }
  }
  return id
}

export async function deleteAporte(id: number) {
  const aporte = await db.investimentosAportes.get(id)
  if (!aporte) return
  // Reverte Transacao espelho (se criada via opts.contaOrigemId).
  const tag = tagAporte(id)
  const espelho = await db.transacoes.filter(t => t.descricao.includes(tag)).first()
  if (espelho?.id) {
    const { deleteTransacao } = await import('./useTransacoes')
    await deleteTransacao(espelho.id)
  }
  await db.investimentosAportes.delete(id)
  await recalcInvestimentoFromAportes(aporte.investimentoId)
}

// Recalcula quantidade, precoMedio, valorAplicado e valorAtual a partir
// dos aportes E vendas. Chamado automaticamente em add/delete.
//
// Convenção (padrão Brasil):
//   PM inclui custos (corretagem + emolumentos + IOF)
//   Vendas reduzem a quantidade mas NÃO mudam o PM (regra contábil BR)
//   valorAplicado = valor que o usuário desembolsou ainda EM POSIÇÃO
//                 = qtd_atual × PM
//
// IMPORTANTE: TODOS os valores (precoMedio, valorAplicado, valorAtual,
// cotacaoAtual) ficam armazenados na moeda do ativo (inv.moeda). A
// conversão pra BRL acontece UMA ÚNICA VEZ em totalCarteiraBRL.
export async function recalcInvestimentoFromAportes(investimentoId: number) {
  const inv = await db.investimentos.get(investimentoId)
  if (!inv) return
  const aportes = await db.investimentosAportes.where('investimentoId').equals(investimentoId).toArray()
  if (aportes.length === 0) return

  // PM ponderado por custo total (com custos)
  const qtdCompradaTotal = aportes.reduce((s, a) => s + a.quantidade, 0)
  const custoTotal = aportes.reduce((s, a) => s + a.quantidade * a.precoUnitario + (a.custos ?? 0), 0)
  const pm = qtdCompradaTotal > 0 ? custoTotal / qtdCompradaTotal : 0

  // Vendas reduzem quantidade em estoque
  const vendas = await db.investimentosMovimentacoes
    .where('investimentoId').equals(investimentoId)
    .filter(m => m.tipo === 'venda')
    .toArray()
  const qtdVendida = vendas.reduce((s, v) => s + (v.quantidade ?? 0), 0)
  const qtdEstoque = Math.max(0, qtdCompradaTotal - qtdVendida)

  // valorAplicado = posição atual ao preço médio (custo da posição em estoque)
  const valorAplicadoEstoque = qtdEstoque * pm
  // valorAtual = quantidade em estoque × cotação atual (ou PM se sem cotação)
  const cotacao = inv.cotacaoAtual && inv.cotacaoAtual > 0 ? inv.cotacaoAtual : pm
  const valorAtual = qtdEstoque * cotacao

  await db.investimentos.update(investimentoId, {
    quantidade: Math.round(qtdEstoque * 100000000) / 100000000, // 8 casas (cripto)
    // 8 casas no PM também — cripto sub-centavo (SHIB, PEPE) tem preço
    // < R$ 0,01/unidade. Arredondar pra 2 casas zerava o PM e quebrava
    // os cálculos de rendimento.
    precoMedio: Math.round(pm * 100000000) / 100000000,
    valorAplicado: Math.round(valorAplicadoEstoque * 100) / 100,
    valorAtual: Math.round(valorAtual * 100) / 100,
    updatedAt: Date.now(),
  })
}

// Atualiza apenas a cotação (sem mexer em aportes) e recalcula valor atual
export async function atualizarCotacao(investimentoId: number, novaCotacao: number) {
  const inv = await db.investimentos.get(investimentoId)
  if (!inv) return
  const qtd = inv.quantidade ?? 0
  const valorAtual = Math.round(qtd * novaCotacao * 100) / 100
  await db.investimentos.update(investimentoId, {
    cotacaoAtual: novaCotacao,
    valorAtual,
    updatedAt: Date.now(),
  })
}

// ─── Cotação automática via API ──────────────────────────────────────
// Busca cotação atual do ativo (CoinGecko pra cripto, Brapi pra B3) e
// atualiza o investimento. A cotação é gravada NA MOEDA DO ATIVO (BRL ou
// USD) — sem isso, ativo USD teria cotação em BRL e seria reconvertido
// pelo totalCarteiraBRL, gerando dupla conversão (~5x).
// Retorna a nova cotação na moeda do ativo, ou null se falhou.
export async function atualizarCotacaoAuto(investimentoId: number): Promise<number | null> {
  const inv = await db.investimentos.get(investimentoId)
  if (!inv || !inv.ticker) return null
  const moeda = inv.moeda ?? 'BRL'
  const cotacao = await fetchCotacaoPorTipo(inv.tipo, inv.ticker, moeda)
  if (cotacao === null) return null
  await atualizarCotacao(investimentoId, cotacao)
  return cotacao
}

// Atualiza cotação de todos os ativos de renda variável que têm ticker.
// Retorna { sucesso, falhou } contagem.
export async function atualizarCotacoesTodos(): Promise<{ sucesso: number; falhou: number }> {
  const all = await db.investimentos.filter(i => i.ativo && isRendaVariavel(i.tipo) && !!i.ticker).toArray()
  let sucesso = 0, falhou = 0
  for (const inv of all) {
    if (inv.id === undefined) continue
    const r = await atualizarCotacaoAuto(inv.id)
    if (r !== null) sucesso += 1
    else falhou += 1
  }
  return { sucesso, falhou }
}

// Stats consolidados a partir dos aportes (útil para o modal de aportes)
// Inclui custos no preço médio (padrão BR).
export function calcAportesStats(aportes: InvestimentoAporte[]) {
  const qtd = aportes.reduce((s, a) => s + a.quantidade, 0)
  const investidoSemCustos = aportes.reduce((s, a) => s + a.quantidade * a.precoUnitario, 0)
  const totalCustos = aportes.reduce((s, a) => s + (a.custos ?? 0), 0)
  const custoTotal = investidoSemCustos + totalCustos
  const pm = qtd > 0 ? custoTotal / qtd : 0
  return {
    quantidade: qtd,
    totalInvestido: custoTotal,        // total real gasto (com custos)
    investidoSemCustos,                // só o valor das unidades
    totalCustos,                       // somatório dos custos
    precoMedio: pm,                    // PM com custos (padrão BR)
  }
}

// ─── Vendas / resgates ───────────────────────────────────────────────
// Renda variável: venda de N unidades a preço unitário
// Renda fixa: resgate de R$ X (sem qtd/preço)
export function useMovimentacoesInvest(investimentoId: number | undefined) {
  return useLiveQuery(
    () => investimentoId === undefined
      ? Promise.resolve([])
      : db.investimentosMovimentacoes.where('investimentoId').equals(investimentoId).reverse().sortBy('data'),
    [investimentoId],
  ) ?? []
}

export async function registrarVenda(args: {
  investimentoId: number
  data: string
  quantidade: number
  precoUnitario: number
  custos?: number
  observacao?: string
}): Promise<number | null> {
  const inv = await db.investimentos.get(args.investimentoId)
  if (!inv) return null

  const valorBruto = args.quantidade * args.precoUnitario
  const valorLiquido = valorBruto - (args.custos ?? 0)
  const pm = inv.precoMedio ?? 0
  const custoEstoque = args.quantidade * pm
  const resultado = valorLiquido - custoEstoque

  const id = await db.investimentosMovimentacoes.add({
    investimentoId: args.investimentoId,
    data: args.data,
    tipo: 'venda',
    quantidade: args.quantidade,
    precoUnitario: args.precoUnitario,
    custos: args.custos,
    pmNaData: pm,
    resultado,
    observacao: args.observacao,
    updatedAt: Date.now(),
  })

  await recalcInvestimentoFromAportes(args.investimentoId)
  return id as number
}

export async function registrarResgate(args: {
  investimentoId: number
  data: string
  valorResgate: number
  custos?: number
  observacao?: string
}): Promise<number | null> {
  const inv = await db.investimentos.get(args.investimentoId)
  if (!inv) return null

  // Em renda fixa, resgate é proporcional ao valor atual.
  // Resultado bruto = valorResgate - (valorAplicado × proporção_resgatada)
  const proporcao = inv.valorAtual > 0 ? args.valorResgate / inv.valorAtual : 0
  const custoProporcional = inv.valorAplicado * proporcao
  const valorLiquido = args.valorResgate - (args.custos ?? 0)
  const resultado = valorLiquido - custoProporcional

  const id = await db.investimentosMovimentacoes.add({
    investimentoId: args.investimentoId,
    data: args.data,
    tipo: 'resgate',
    valorResgate: args.valorResgate,
    valorAplicadoConsumido: custoProporcional, // snapshot pra restaurar no delete
    custos: args.custos,
    resultado,
    observacao: args.observacao,
    updatedAt: Date.now(),
  })

  // Reduz proporcionalmente valorAplicado e valorAtual
  const novoValorAtual = Math.max(0, inv.valorAtual - args.valorResgate)
  const novoValorAplicado = Math.max(0, inv.valorAplicado - custoProporcional)
  await db.investimentos.update(args.investimentoId, {
    valorAtual: Math.round(novoValorAtual * 100) / 100,
    valorAplicado: Math.round(novoValorAplicado * 100) / 100,
    updatedAt: Date.now(),
  })

  return id as number
}

export async function deleteMovimentacaoInvest(id: number) {
  const m = await db.investimentosMovimentacoes.get(id)
  if (!m) return
  await db.investimentosMovimentacoes.delete(id)
  // Reverter na dívida/investimento
  if (m.tipo === 'venda') {
    await recalcInvestimentoFromAportes(m.investimentoId)
  } else if (m.tipo === 'resgate') {
    // Restaura valorAtual e valorAplicado. Usa snapshot
    // `valorAplicadoConsumido` (gravado no registrarResgate) pra restaurar
    // com PRECISÃO. Para movimentos legados sem snapshot, recalcula
    // proporção atual como fallback (aproximado, mas melhor que ignorar).
    const inv = await db.investimentos.get(m.investimentoId)
    if (inv && m.valorResgate) {
      const restoreAtual = inv.valorAtual + m.valorResgate
      const restoreAplicado = m.valorAplicadoConsumido !== undefined
        ? inv.valorAplicado + m.valorAplicadoConsumido
        : (() => {
            // Fallback p/ movs legados sem snapshot — calcula proporção atual
            const totalAtualPlus = inv.valorAtual + m.valorResgate
            const ratio = totalAtualPlus > 0 ? m.valorResgate / totalAtualPlus : 0
            return inv.valorAplicado + (inv.valorAplicado * ratio / (1 - ratio || 1))
          })()
      await db.investimentos.update(m.investimentoId, {
        valorAtual: Math.round(restoreAtual * 100) / 100,
        valorAplicado: Math.round(restoreAplicado * 100) / 100,
        updatedAt: Date.now(),
      })
    }
  }
}

export function calcVendasStats(movs: InvestimentoMovimentacao[]) {
  const vendas = movs.filter(m => m.tipo === 'venda')
  const qtdVendida = vendas.reduce((s, v) => s + (v.quantidade ?? 0), 0)
  const totalRecebido = vendas.reduce((s, v) => s + ((v.quantidade ?? 0) * (v.precoUnitario ?? 0)) - (v.custos ?? 0), 0)
  const resultadoRealizado = vendas.reduce((s, v) => s + (v.resultado ?? 0), 0)
  return { qtdVendida, totalRecebido, resultadoRealizado, totalVendas: vendas.length }
}

// ─── Conversão de moeda (BRL ↔ USD) ──────────────────────────────────
// Reativo: useDolar() retorna a cotação atual do dólar, busca via API
// se não tiver, cacheia 5min, fallback default 5.40 se API offline.
let _ultimoDolar = 5.40

export function useDolar(): number {
  return _ultimoDolar
}

export async function fetchDolarECache(): Promise<number> {
  const c = await fetchCotacaoDolar()
  if (c && c > 0) _ultimoDolar = c
  return _ultimoDolar
}

// Inicializa cotação na primeira chamada (chame em /investimentos mount)
let _dolarFetchInProgress: Promise<number> | null = null
export async function ensureDolarLoaded(): Promise<number> {
  if (!_dolarFetchInProgress) _dolarFetchInProgress = fetchDolarECache()
  return _dolarFetchInProgress
}

// Converte valor entre moedas usando cotação atual (default 5.40)
export function converterParaBRL(valor: number, moedaOrigem: 'BRL' | 'USD' = 'BRL'): number {
  if (moedaOrigem === 'BRL') return valor
  return valor * _ultimoDolar
}
export function converterParaUSD(valorBRL: number): number {
  return _ultimoDolar > 0 ? valorBRL / _ultimoDolar : 0
}

// Total da carteira convertendo tudo pra BRL
export function totalCarteiraBRL(investimentos: Investimento[]): { totalBRL: number; aplicadoBRL: number; rendimentoBRL: number } {
  let totalBRL = 0, aplicadoBRL = 0
  for (const i of investimentos) {
    totalBRL += converterParaBRL(i.valorAtual, i.moeda ?? 'BRL')
    aplicadoBRL += converterParaBRL(i.valorAplicado, i.moeda ?? 'BRL')
  }
  return { totalBRL, aplicadoBRL, rendimentoBRL: totalBRL - aplicadoBRL }
}

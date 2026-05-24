// ─── Geração de relatórios em PDF ───────────────────────────────────
// Usa jsPDF + jspdf-autotable. Tudo client-side, sem servidor.
// Cada função retorna um Blob — o caller decide se baixa ou abre.

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { db, type Conta, type Cartao, type LancamentoCartao, type Transacao, type Investimento, type Divida, type Categoria } from '@/db/schema'

// ─── Helpers ──────────────────────────────────────────────────────────
const fmtBRL = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

const fmtDate = (d: string) => {
  try { return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') } catch { return d }
}

// Paleta usada nos PDFs (consistente com o app)
const COR = {
  terra: [196, 85, 59] as [number, number, number],
  terraDark: [44, 26, 15] as [number, number, number],
  teal: [58, 133, 128] as [number, number, number],
  amber: [212, 160, 23] as [number, number, number],
  cinza: [122, 92, 79] as [number, number, number],
  cinzaClaro: [155, 123, 106] as [number, number, number],
  fundo: [251, 248, 243] as [number, number, number],
}

// Header padrão de toda página
function addHeader(doc: jsPDF, titulo: string, subtitulo?: string) {
  doc.setFillColor(...COR.terra)
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 24, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('Financeiro do Yago', 14, 11)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('Relatório gerado em ' + new Date().toLocaleString('pt-BR'), 14, 18)

  // Bloco do título
  doc.setTextColor(...COR.terraDark)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text(titulo, 14, 38)

  if (subtitulo) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...COR.cinza)
    doc.text(subtitulo, 14, 45)
  }
}

// Footer com número de página
function addFooter(doc: jsPDF) {
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    const w = doc.internal.pageSize.getWidth()
    const h = doc.internal.pageSize.getHeight()
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...COR.cinzaClaro)
    doc.text('Financeiro do Yago · página ' + i + ' de ' + pages, w / 2, h - 8, { align: 'center' })
  }
}

// KPI box (mostra Label + Valor grande)
function addKpiRow(doc: jsPDF, y: number, kpis: { label: string; valor: string; cor?: [number, number, number] }[]) {
  const w = doc.internal.pageSize.getWidth()
  const margin = 14
  const gap = 8
  const totalGap = gap * (kpis.length - 1)
  const boxW = (w - margin * 2 - totalGap) / kpis.length

  kpis.forEach((k, i) => {
    const x = margin + i * (boxW + gap)
    doc.setFillColor(...COR.fundo)
    doc.roundedRect(x, y, boxW, 22, 3, 3, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...COR.cinza)
    doc.text(k.label.toUpperCase(), x + 4, y + 6)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(...(k.cor ?? COR.terraDark))
    doc.text(k.valor, x + 4, y + 16)
  })
}

// ─── Opções comuns ───────────────────────────────────────────────────
export interface PDFOptions {
  periodoInicio?: string  // YYYY-MM-DD
  periodoFim?: string     // YYYY-MM-DD
  contasIds?: number[]    // filtrar por contas específicas
  cartoesIds?: number[]   // filtrar por cartões específicos
  categoriasIds?: number[]
}

// ═════════════════════════════════════════════════════════════════════
// RELATÓRIO 1: VISÃO GERAL DO PATRIMÔNIO
// ═════════════════════════════════════════════════════════════════════
export async function gerarRelatorioPatrimonio(): Promise<Blob> {
  const [contas, invests, dividas] = await Promise.all([
    db.contas.filter(c => c.ativo).toArray(),
    db.investimentos.filter(i => i.ativo).toArray(),
    db.dividas.filter(d => d.ativo).toArray(),
  ])

  const saldoContas = contas.reduce((s, c) => s + c.saldoAtual, 0)
  const totalInvest = invests.reduce((s, i) => s + i.valorAtual, 0)
  const totalAplicado = invests.reduce((s, i) => s + i.valorAplicado, 0)
  const rendimento = totalInvest - totalAplicado
  const totalDevido = dividas.reduce((s, d) => s + Math.max(0, d.valorTotal - d.valorPago), 0)
  const totalAtivos = saldoContas + totalInvest
  const patrimonio = totalAtivos - totalDevido

  const doc = new jsPDF('p', 'mm', 'a4')
  addHeader(doc, 'Visão geral do patrimônio', `Data: ${new Date().toLocaleDateString('pt-BR')}`)

  addKpiRow(doc, 52, [
    { label: 'Ativos', valor: fmtBRL(totalAtivos), cor: COR.teal },
    { label: 'Passivos', valor: fmtBRL(totalDevido), cor: COR.terra },
    { label: 'Patrimônio líquido', valor: fmtBRL(patrimonio), cor: COR.terraDark },
  ])

  // Contas
  autoTable(doc, {
    startY: 82,
    head: [['Conta', 'Tipo', 'Saldo atual']],
    body: contas.map(c => [c.nome, c.tipo, fmtBRL(c.saldoAtual)]),
    foot: [['', 'Total em contas', fmtBRL(saldoContas)]],
    theme: 'plain',
    headStyles: { fillColor: COR.terra, textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: COR.fundo, textColor: COR.terraDark, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 4 },
    columnStyles: { 2: { halign: 'right' } },
  })

  // Investimentos
  const finalY1 = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
  autoTable(doc, {
    startY: finalY1 + 12,
    head: [['Investimento', 'Tipo', 'Aplicado', 'Atual', 'Rend.']],
    body: invests.map(i => {
      const rend = i.valorAtual - i.valorAplicado
      const pct = i.valorAplicado > 0 ? (rend / i.valorAplicado) * 100 : 0
      return [
        i.nome + (i.ticker ? ` (${i.ticker})` : ''),
        i.tipo,
        fmtBRL(i.valorAplicado),
        fmtBRL(i.valorAtual),
        `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`,
      ]
    }),
    foot: [['Total', '', fmtBRL(totalAplicado), fmtBRL(totalInvest), `${totalAplicado > 0 ? ((rendimento / totalAplicado) * 100).toFixed(2) : '0'}%`]],
    theme: 'plain',
    headStyles: { fillColor: COR.teal, textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: COR.fundo, textColor: COR.terraDark, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 4 },
    columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
  })

  // Dívidas
  if (dividas.length > 0) {
    const finalY2 = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
    autoTable(doc, {
      startY: finalY2 + 12,
      head: [['Dívida', 'Tipo', 'Valor total', 'Pago', 'Saldo devedor']],
      body: dividas.map(d => [
        d.nome,
        d.tipo,
        fmtBRL(d.valorTotal),
        fmtBRL(d.valorPago),
        fmtBRL(Math.max(0, d.valorTotal - d.valorPago)),
      ]),
      foot: [['Total', '', '', '', fmtBRL(totalDevido)]],
      theme: 'plain',
      headStyles: { fillColor: COR.terra, textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: COR.fundo, textColor: COR.terraDark, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
    })
  }

  addFooter(doc)
  return doc.output('blob')
}

// ═════════════════════════════════════════════════════════════════════
// RELATÓRIO 2: EXTRATO DE CONTAS
// ═════════════════════════════════════════════════════════════════════
export async function gerarRelatorioContas(opts: PDFOptions = {}): Promise<Blob> {
  const todas = await db.contas.filter(c => c.ativo).toArray()
  const contas = opts.contasIds?.length
    ? todas.filter(c => c.id !== undefined && opts.contasIds!.includes(c.id))
    : todas

  const doc = new jsPDF('p', 'mm', 'a4')
  addHeader(doc, 'Extrato de contas',
    opts.periodoInicio
      ? `Período: ${fmtDate(opts.periodoInicio)} a ${fmtDate(opts.periodoFim ?? new Date().toISOString().split('T')[0])}`
      : 'Histórico completo')

  let cursorY = 52

  for (const conta of contas) {
    // Filtra transações desta conta no período
    const todasTxs = await db.transacoes.where('contaId').equals(conta.id!).toArray()
    const txs = filtrarPorPeriodo(todasTxs, opts)
      .sort((a, b) => a.data.localeCompare(b.data))

    if (txs.length === 0) continue

    const entradas = txs.filter(t => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0)
    const saidas = txs.filter(t => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0)

    // Header da conta
    doc.setFillColor(...COR.fundo)
    doc.rect(14, cursorY, doc.internal.pageSize.getWidth() - 28, 18, 'F')
    doc.setTextColor(...COR.terraDark)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text(conta.nome, 18, cursorY + 7)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...COR.cinza)
    doc.text(`${conta.tipo} · ${txs.length} transações · entradas ${fmtBRL(entradas)} · saídas ${fmtBRL(saidas)}`, 18, cursorY + 13)

    const cats = await db.categorias.toArray()
    const catMap = new Map(cats.map(c => [c.id, c.nome]))

    autoTable(doc, {
      startY: cursorY + 22,
      head: [['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor']],
      body: txs.map(t => [
        fmtDate(t.data),
        t.descricao || '-',
        catMap.get(t.categoriaId) ?? '-',
        t.tipo === 'receita' ? 'Receita' : 'Despesa',
        (t.tipo === 'receita' ? '+' : '-') + fmtBRL(t.valor),
      ]),
      foot: [['', '', '', 'Saldo no período', fmtBRL(entradas - saidas)]],
      theme: 'plain',
      headStyles: { fillColor: COR.terra, textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: COR.fundo, textColor: COR.terraDark, fontStyle: 'bold' },
      styles: { fontSize: 8.5, cellPadding: 3 },
      columnStyles: { 4: { halign: 'right' } },
    })

    cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
    if (cursorY > 250) { doc.addPage(); cursorY = 20 }
  }

  if (contas.every(async c => {
    const all = await db.transacoes.where('contaId').equals(c.id!).toArray()
    return filtrarPorPeriodo(all, opts).length === 0
  })) {
    doc.setFontSize(10)
    doc.setTextColor(...COR.cinza)
    doc.text('Nenhuma transação no período selecionado.', 14, cursorY)
  }

  addFooter(doc)
  return doc.output('blob')
}

// ═════════════════════════════════════════════════════════════════════
// RELATÓRIO 3: FATURA DE CARTÃO
// ═════════════════════════════════════════════════════════════════════
export async function gerarRelatorioFatura(cartaoId: number, mes: number, ano: number): Promise<Blob> {
  const cartao = await db.cartoes.get(cartaoId)
  if (!cartao) throw new Error('Cartão não encontrado')

  const lancs = await db.lancamentosCartao
    .where('[cartaoId+mes+ano]').equals([cartaoId, mes, ano])
    .toArray()

  const cats = await db.categorias.toArray()
  const catMap = new Map(cats.map(c => [c.id, c.nome]))

  const total = lancs.reduce((s, l) => s + l.valor, 0)
  const mesNome = new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  const doc = new jsPDF('p', 'mm', 'a4')
  addHeader(doc, `Fatura ${cartao.nome}`, `${mesNome.charAt(0).toUpperCase() + mesNome.slice(1)} · ${cartao.bandeira}`)

  addKpiRow(doc, 52, [
    { label: 'Total da fatura', valor: fmtBRL(total), cor: COR.terra },
    { label: 'Lançamentos', valor: String(lancs.length), cor: COR.terraDark },
    { label: 'Limite usado', valor: cartao.limite > 0 ? `${((total / cartao.limite) * 100).toFixed(0)}%` : '—', cor: COR.amber },
  ])

  autoTable(doc, {
    startY: 82,
    head: [['Data', 'Descrição', 'Categoria', 'Parcela', 'Valor']],
    body: lancs
      .sort((a, b) => a.data.localeCompare(b.data))
      .map(l => [
        fmtDate(l.data),
        l.descricao.replace(/\[fixa:[^\]]+\]/g, '').trim(),
        catMap.get(l.categoriaId) ?? '-',
        l.totalParcelas > 1 ? `${l.parcelaAtual}/${l.totalParcelas}` : '-',
        fmtBRL(l.valor),
      ]),
    foot: [['', '', '', 'Total', fmtBRL(total)]],
    theme: 'plain',
    headStyles: { fillColor: COR.terra, textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: COR.fundo, textColor: COR.terraDark, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 4 },
    columnStyles: { 3: { halign: 'center' }, 4: { halign: 'right' } },
  })

  addFooter(doc)
  return doc.output('blob')
}

// ═════════════════════════════════════════════════════════════════════
// RELATÓRIO 4: CARTEIRA DE INVESTIMENTOS
// ═════════════════════════════════════════════════════════════════════
export async function gerarRelatorioInvestimentos(): Promise<Blob> {
  const invests = await db.investimentos.filter(i => i.ativo).toArray()
  const total = invests.reduce((s, i) => s + i.valorAtual, 0)
  const aplicado = invests.reduce((s, i) => s + i.valorAplicado, 0)
  const rendimento = total - aplicado

  // Agrupa por tipo
  const grupos = new Map<string, Investimento[]>()
  invests.forEach(i => {
    const arr = grupos.get(i.tipo) ?? []
    arr.push(i)
    grupos.set(i.tipo, arr)
  })

  const doc = new jsPDF('p', 'mm', 'a4')
  addHeader(doc, 'Carteira de investimentos', `${invests.length} ativos em ${grupos.size} categorias`)

  addKpiRow(doc, 52, [
    { label: 'Aplicado', valor: fmtBRL(aplicado), cor: COR.terraDark },
    { label: 'Valor atual', valor: fmtBRL(total), cor: COR.teal },
    { label: 'Rendimento', valor: `${rendimento >= 0 ? '+' : ''}${fmtBRL(rendimento)} (${aplicado > 0 ? ((rendimento / aplicado) * 100).toFixed(2) : '0'}%)`, cor: rendimento >= 0 ? COR.teal : COR.terra },
  ])

  let cursorY = 82

  for (const [tipo, items] of grupos) {
    const subtotal = items.reduce((s, i) => s + i.valorAtual, 0)

    doc.setFillColor(...COR.fundo)
    doc.rect(14, cursorY, doc.internal.pageSize.getWidth() - 28, 10, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...COR.terraDark)
    doc.text(tipo, 18, cursorY + 7)
    doc.text(fmtBRL(subtotal), doc.internal.pageSize.getWidth() - 18, cursorY + 7, { align: 'right' })

    autoTable(doc, {
      startY: cursorY + 14,
      head: [['Nome', 'Instituição', 'Aplicado', 'Atual', 'Rend.']],
      body: items.map(i => {
        const r = i.valorAtual - i.valorAplicado
        const pct = i.valorAplicado > 0 ? (r / i.valorAplicado) * 100 : 0
        return [
          i.nome + (i.ticker ? ` (${i.ticker})` : ''),
          i.instituicao ?? '-',
          fmtBRL(i.valorAplicado),
          fmtBRL(i.valorAtual),
          `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`,
        ]
      }),
      theme: 'plain',
      headStyles: { fillColor: COR.teal, textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8.5, cellPadding: 3 },
      columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
    })

    cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
    if (cursorY > 250) { doc.addPage(); cursorY = 20 }
  }

  addFooter(doc)
  return doc.output('blob')
}

// ═════════════════════════════════════════════════════════════════════
// RELATÓRIO 5: DÍVIDAS
// ═════════════════════════════════════════════════════════════════════
export async function gerarRelatorioDividas(): Promise<Blob> {
  const dividas = await db.dividas.filter(d => d.ativo).toArray()
  const movs = await db.dividasMovimentacoes.toArray()
  const movMap = new Map<number, typeof movs>()
  movs.forEach(m => {
    const arr = movMap.get(m.dividaId) ?? []
    arr.push(m)
    movMap.set(m.dividaId, arr)
  })

  const totalDevido = dividas.reduce((s, d) => s + Math.max(0, d.valorTotal - d.valorPago), 0)
  const totalPago = dividas.reduce((s, d) => s + d.valorPago, 0)
  const parcelaMensal = dividas
    .filter(d => d.parcelasPagas < d.parcelasTotal)
    .reduce((s, d) => s + d.valorParcela, 0)

  const doc = new jsPDF('p', 'mm', 'a4')
  addHeader(doc, 'Dívidas', `${dividas.length} dívida(s) cadastrada(s)`)

  addKpiRow(doc, 52, [
    { label: 'Saldo devedor', valor: fmtBRL(totalDevido), cor: COR.terra },
    { label: 'Já pago', valor: fmtBRL(totalPago), cor: COR.teal },
    { label: 'Parcela mensal', valor: fmtBRL(parcelaMensal), cor: COR.amber },
  ])

  let cursorY = 82

  for (const d of dividas) {
    const saldo = Math.max(0, d.valorTotal - d.valorPago)
    const movsDessa = movMap.get(d.id!) ?? []

    doc.setFillColor(...COR.fundo)
    doc.rect(14, cursorY, doc.internal.pageSize.getWidth() - 28, 14, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...COR.terraDark)
    doc.text(d.nome, 18, cursorY + 6)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...COR.cinza)
    doc.text(`${d.tipo}${d.instituicao ? ' · ' + d.instituicao : ''} · ${d.parcelasPagas}/${d.parcelasTotal} parcelas`, 18, cursorY + 11)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...COR.terra)
    doc.text(fmtBRL(saldo), doc.internal.pageSize.getWidth() - 18, cursorY + 9, { align: 'right' })

    cursorY += 18

    if (movsDessa.length > 0) {
      autoTable(doc, {
        startY: cursorY,
        head: [['Data', 'Tipo', 'Valor', 'Observação']],
        body: movsDessa
          .sort((a, b) => a.data.localeCompare(b.data))
          .map(m => [fmtDate(m.data), m.tipo, fmtBRL(m.valor), m.observacao ?? '-']),
        theme: 'plain',
        headStyles: { fillColor: COR.cinza, textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8.5, cellPadding: 3 },
        columnStyles: { 2: { halign: 'right' } },
      })
      cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
    }

    if (cursorY > 250) { doc.addPage(); cursorY = 20 }
  }

  addFooter(doc)
  return doc.output('blob')
}

// ═════════════════════════════════════════════════════════════════════
// RELATÓRIO 6: TRANSAÇÕES (extrato livre)
// ═════════════════════════════════════════════════════════════════════
export async function gerarRelatorioTransacoes(opts: PDFOptions = {}): Promise<Blob> {
  const todas = await db.transacoes.toArray()
  let txs = filtrarPorPeriodo(todas, opts)
  if (opts.contasIds?.length)     txs = txs.filter(t => opts.contasIds!.includes(t.contaId))
  if (opts.categoriasIds?.length) txs = txs.filter(t => opts.categoriasIds!.includes(t.categoriaId))
  txs.sort((a, b) => a.data.localeCompare(b.data))

  const cats = await db.categorias.toArray()
  const contas = await db.contas.toArray()
  const catMap = new Map(cats.map(c => [c.id, c.nome]))
  const contaMap = new Map(contas.map(c => [c.id, c.nome]))

  const entradas = txs.filter(t => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0)
  const saidas = txs.filter(t => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0)
  const saldo = entradas - saidas

  const doc = new jsPDF('p', 'mm', 'a4')
  addHeader(doc, 'Extrato de transações',
    opts.periodoInicio
      ? `${fmtDate(opts.periodoInicio)} a ${fmtDate(opts.periodoFim ?? new Date().toISOString().split('T')[0])}`
      : 'Todas as transações')

  addKpiRow(doc, 52, [
    { label: 'Receitas', valor: fmtBRL(entradas), cor: COR.teal },
    { label: 'Despesas', valor: fmtBRL(saidas), cor: COR.terra },
    { label: 'Saldo', valor: (saldo >= 0 ? '+' : '') + fmtBRL(saldo), cor: saldo >= 0 ? COR.teal : COR.terra },
  ])

  autoTable(doc, {
    startY: 82,
    head: [['Data', 'Descrição', 'Conta', 'Categoria', 'Tipo', 'Valor']],
    body: txs.map(t => [
      fmtDate(t.data),
      t.descricao || '-',
      contaMap.get(t.contaId) ?? '-',
      catMap.get(t.categoriaId) ?? '-',
      t.tipo === 'receita' ? 'Receita' : 'Despesa',
      (t.tipo === 'receita' ? '+' : '-') + fmtBRL(t.valor),
    ]),
    foot: [['', '', '', '', 'Saldo', (saldo >= 0 ? '+' : '') + fmtBRL(saldo)]],
    theme: 'plain',
    headStyles: { fillColor: COR.terra, textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: COR.fundo, textColor: COR.terraDark, fontStyle: 'bold' },
    styles: { fontSize: 8.5, cellPadding: 3 },
    columnStyles: { 5: { halign: 'right' } },
  })

  addFooter(doc)
  return doc.output('blob')
}

// ─── Helpers ──────────────────────────────────────────────────────────
function filtrarPorPeriodo<T extends { data: string }>(items: T[], opts: PDFOptions): T[] {
  if (!opts.periodoInicio && !opts.periodoFim) return items
  const ini = opts.periodoInicio ?? '0000-00-00'
  const fim = opts.periodoFim ?? '9999-12-31'
  return items.filter(t => t.data >= ini && t.data <= fim)
}

// ─── Download utilitário ─────────────────────────────────────────────
export function baixarBlob(blob: Blob, nomeArquivo: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function visualizarBlob(blob: Blob) {
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}

// ─── Re-exports usadas pelo modal ───────────────────────────────────
export type { Conta, Cartao, LancamentoCartao, Transacao, Investimento, Divida, Categoria }

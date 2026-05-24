import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Meta, type Investimento } from '../schema'
import { todayISO } from '@/lib/format'

export function useMetas() {
  return useLiveQuery(() => db.metas.filter(m => m.ativo).toArray(), []) ?? []
}

// ─── Metas com valorAtual computado ─────────────────────────────────
// Total real da meta = aportes diretos (meta.valorAtual) + soma dos
// investimentos vinculados (i.metaId === meta.id).
export interface MetaComputed extends Meta {
  valorInvestido: number
  valorAporteDireto: number
  valorAtualTotal: number
  investimentos: Investimento[]
  progressoPct: number
}

export function useMetasComputed(): MetaComputed[] {
  const metas = useMetas()
  const investimentos = useLiveQuery(
    () => db.investimentos.filter(i => i.ativo && i.metaId !== undefined).toArray(),
    [],
  ) ?? []

  return metas.map(m => {
    const linked = investimentos.filter(i => i.metaId === m.id)
    const valorInvestido = linked.reduce((s, i) => s + i.valorAtual, 0)
    const valorAporteDireto = m.valorAtual ?? 0
    const valorAtualTotal = valorAporteDireto + valorInvestido
    const progressoPct = m.valorAlvo > 0
      ? Math.min(100, (valorAtualTotal / m.valorAlvo) * 100)
      : 0
    return {
      ...m,
      valorInvestido,
      valorAporteDireto,
      valorAtualTotal,
      investimentos: linked,
      progressoPct,
    }
  })
}

// ─── Reserva de Emergência (singleton) ──────────────────────────────
export function useReservaEmergencia(): MetaComputed | null {
  const all = useMetasComputed()
  return all.find(m => m.tipo === 'reserva_emergencia') ?? null
}

export function useMetasPorTipo() {
  const all = useMetasComputed()
  return {
    reserva: all.find(m => m.tipo === 'reserva_emergencia') ?? null,
    compras: all.filter(m => m.tipo === 'compra'),
    aposentadoria: all.filter(m => m.tipo === 'aposentadoria'),
    outros: all.filter(m => m.tipo === 'outros' || !m.tipo),
  }
}

// ─── CRUD ───────────────────────────────────────────────────────────
export async function addMeta(data: Omit<Meta, 'id' | 'syncId' | 'updatedAt'>) {
  return db.metas.add({ ...data, updatedAt: Date.now() })
}

// Aporte direto na meta. Se `contaOrigemId` for passado, cria também
// uma Transacao de despesa categoria "Investimentos" que debita a conta —
// mantém o patrimônio CONSISTENTE (sem inflação artificial).
//
// Quando o aporte é feito SEM origem (modo legado / fluxos antigos), só
// atualiza valorAtual da meta — usuário precisa lançar transação à parte.
export async function aportarMeta(id: number, valor: number, opts?: {
  contaOrigemId?: number
  data?: string
  descricao?: string
}) {
  const meta = await db.metas.get(id)
  if (!meta) return
  await db.metas.update(id, {
    valorAtual: (meta.valorAtual ?? 0) + valor,
    updatedAt: Date.now(),
  })
  if (opts?.contaOrigemId) {
    // Procura categoria "Investimentos" (seed) — fallback pra primeira despesa
    const catInvest = await db.categorias.filter(c => c.tipo === 'despesa' && c.nome.toLowerCase().includes('investimento')).first()
    const catId = catInvest?.id ?? (await db.categorias.where('tipo').equals('despesa').first())?.id ?? 1
    const { addTransacao } = await import('./useTransacoes')
    await addTransacao({
      data: opts.data ?? todayISO(),
      valor,
      tipo: 'despesa',
      contaId: opts.contaOrigemId,
      categoriaId: catId,
      descricao: opts.descricao ?? `Aporte em ${meta.nome}`,
      status: 'efetivada',
      recorrencia: 'unica',
    })
  }
}

export async function editMeta(id: number, data: Partial<Meta>) {
  return db.metas.update(id, { ...data, updatedAt: Date.now() })
}

export async function deleteMeta(id: number) {
  return db.metas.update(id, { ativo: false, updatedAt: Date.now() })
}

// ─── Cálculo do alvo da Reserva de Emergência ────────────────────────
// alvo = média das despesas dos últimos 6 meses × meses de cobertura.
// Exclui transferências (transferId): elas geram despesa na conta-origem
// mas não são gasto real — inflariam o alvo.
//
// Bug histórico: dividia o total SEMPRE por 6, mesmo quando o usuário
// tinha < 6 meses de histórico (resultado: alvo subestimado em até 3x
// no início do uso). Agora divide pelo nº de meses DISTINTOS com despesa
// (mínimo 1, máximo 6) — reflete o gasto médio real.
export async function calcularAlvoReserva(mesesCobertura: 3 | 6 | 12): Promise<number> {
  const todasDespesas = await db.transacoes
    .filter(t => t.tipo === 'despesa' && !t.transferId)
    .toArray()
  if (todasDespesas.length === 0) return 0

  const now = new Date()
  const sixMonthsAgo = new Date(now)
  sixMonthsAgo.setMonth(now.getMonth() - 6)
  const recentes = todasDespesas.filter(t => new Date(t.data + 'T00:00:00') >= sixMonthsAgo)
  if (recentes.length === 0) return 0

  // Conta meses DISTINTOS com despesa (YYYY-MM), max 6
  const mesesComDespesa = new Set<string>()
  for (const t of recentes) {
    mesesComDespesa.add(t.data.slice(0, 7)) // YYYY-MM
  }
  const divisor = Math.min(6, Math.max(1, mesesComDespesa.size))

  const total = recentes.reduce((s, t) => s + t.valor, 0)
  const mediaMensal = total / divisor
  return Math.round(mediaMensal * mesesCobertura * 100) / 100
}

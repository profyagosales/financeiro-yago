// ─── usePeriodo: estado global do filtro + helpers de data ──────────
// Toda a página de relatórios é controlada por este hook. Mudou
// período → tudo recalcula via Dexie liveQuery.

import { create } from 'zustand'

export type PeriodoPreset = 'mes' | '3m' | '6m' | '12m' | 'ytd' | 'custom'

interface PeriodoState {
  preset: PeriodoPreset
  // refMes/refAno = mês "ancorado" pra preset 'mes'
  refMes: number
  refAno: number
  // Para 'custom'
  customStart: string  // YYYY-MM-DD
  customEnd: string

  // Filtros adicionais
  contaId: number | null
  categoriaId: number | null
  tipo: 'todos' | 'receita' | 'despesa'

  setPreset: (p: PeriodoPreset) => void
  setRefMes: (mes: number, ano: number) => void
  shiftMes: (delta: number) => void
  setCustom: (start: string, end: string) => void
  setConta: (id: number | null) => void
  setCategoria: (id: number | null) => void
  setTipo: (t: 'todos' | 'receita' | 'despesa') => void
  reset: () => void
}

function now() {
  const d = new Date()
  return { mes: d.getMonth() + 1, ano: d.getFullYear() }
}

const initial = (() => {
  const n = now()
  return {
    preset: 'mes' as PeriodoPreset,
    refMes: n.mes,
    refAno: n.ano,
    customStart: `${n.ano}-${String(n.mes).padStart(2, '0')}-01`,
    customEnd: `${n.ano}-${String(n.mes).padStart(2, '0')}-${String(new Date(n.ano, n.mes, 0).getDate()).padStart(2, '0')}`,
    contaId: null,
    categoriaId: null,
    tipo: 'todos' as const,
  }
})()

export const usePeriodo = create<PeriodoState>(set => ({
  ...initial,

  setPreset: p => set({ preset: p }),
  setRefMes: (mes, ano) => set({ refMes: mes, refAno: ano, preset: 'mes' }),
  shiftMes: delta => set(s => {
    const novo = new Date(s.refAno, s.refMes - 1 + delta, 1)
    return { refMes: novo.getMonth() + 1, refAno: novo.getFullYear() }
  }),
  setCustom: (start, end) => set({ customStart: start, customEnd: end, preset: 'custom' }),
  setConta: id => set({ contaId: id }),
  setCategoria: id => set({ categoriaId: id }),
  setTipo: t => set({ tipo: t }),
  reset: () => set(initial),
}))

// ─── Resolução do intervalo ─────────────────────────────────────────
export interface Intervalo {
  start: string         // YYYY-MM-DD
  end: string           // YYYY-MM-DD
  label: string         // "Maio 2026" / "Últimos 6 meses" / etc
  meses: { mes: number; ano: number; label: string }[]  // meses contidos (ordem ASC)
  // Comparativo: período imediatamente anterior do mesmo tamanho
  prev: { start: string; end: string; label: string }
}

function pad2(n: number) { return String(n).padStart(2, '0') }
function fimMes(ano: number, mes: number): number { return new Date(ano, mes, 0).getDate() }

function listMeses(startMes: number, startAno: number, count: number) {
  const out: { mes: number; ano: number; label: string }[] = []
  for (let i = 0; i < count; i += 1) {
    const d = new Date(startAno, startMes - 1 + i, 1)
    const mes = d.getMonth() + 1
    const ano = d.getFullYear()
    const label = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
    out.push({ mes, ano, label })
  }
  return out
}

export function resolveIntervalo(s: PeriodoState): Intervalo {
  const n = now()
  if (s.preset === 'mes') {
    const start = `${s.refAno}-${pad2(s.refMes)}-01`
    const end = `${s.refAno}-${pad2(s.refMes)}-${pad2(fimMes(s.refAno, s.refMes))}`
    // Anterior: mês anterior
    const prevDate = new Date(s.refAno, s.refMes - 2, 1)
    const pm = prevDate.getMonth() + 1
    const pa = prevDate.getFullYear()
    const label = new Date(s.refAno, s.refMes - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    return {
      start, end,
      label: label.charAt(0).toUpperCase() + label.slice(1),
      meses: listMeses(s.refMes, s.refAno, 1),
      prev: {
        start: `${pa}-${pad2(pm)}-01`,
        end: `${pa}-${pad2(pm)}-${pad2(fimMes(pa, pm))}`,
        label: new Date(pa, pm - 1, 1).toLocaleDateString('pt-BR', { month: 'long' }),
      },
    }
  }

  if (s.preset === '3m' || s.preset === '6m' || s.preset === '12m') {
    const count = s.preset === '3m' ? 3 : s.preset === '6m' ? 6 : 12
    const startDate = new Date(n.ano, n.mes - count, 1)
    const sm = startDate.getMonth() + 1
    const sa = startDate.getFullYear()
    const start = `${sa}-${pad2(sm)}-01`
    const end = `${n.ano}-${pad2(n.mes)}-${pad2(fimMes(n.ano, n.mes))}`
    const prevStartDate = new Date(n.ano, n.mes - 2 * count, 1)
    const psm = prevStartDate.getMonth() + 1
    const psa = prevStartDate.getFullYear()
    const prevEndDate = new Date(n.ano, n.mes - count, 0)
    return {
      start, end,
      label: `Últimos ${count} meses`,
      meses: listMeses(sm, sa, count),
      prev: {
        start: `${psa}-${pad2(psm)}-01`,
        end: `${prevEndDate.getFullYear()}-${pad2(prevEndDate.getMonth() + 1)}-${pad2(prevEndDate.getDate())}`,
        label: `${count}m anteriores`,
      },
    }
  }

  if (s.preset === 'ytd') {
    const start = `${n.ano}-01-01`
    const end = `${n.ano}-${pad2(n.mes)}-${pad2(fimMes(n.ano, n.mes))}`
    const count = n.mes
    // Anterior: mesmo período do ano passado
    const prevStart = `${n.ano - 1}-01-01`
    const prevEnd = `${n.ano - 1}-${pad2(n.mes)}-${pad2(fimMes(n.ano - 1, n.mes))}`
    return {
      start, end,
      label: `${n.ano} até agora`,
      meses: listMeses(1, n.ano, count),
      prev: { start: prevStart, end: prevEnd, label: `Mesmo período em ${n.ano - 1}` },
    }
  }

  // custom
  // Calcula prev como faixa do mesmo tamanho imediatamente antes
  const ds = new Date(s.customStart + 'T00:00:00')
  const de = new Date(s.customEnd + 'T00:00:00')
  const dias = Math.max(1, Math.round((de.getTime() - ds.getTime()) / 86_400_000) + 1)
  const prevEnd = new Date(ds.getTime() - 86_400_000)
  const prevStart = new Date(prevEnd.getTime() - (dias - 1) * 86_400_000)
  const fmtISO = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
  // Lista meses contidos
  const meses: { mes: number; ano: number; label: string }[] = []
  const cur = new Date(ds.getFullYear(), ds.getMonth(), 1)
  while (cur <= de) {
    const m = cur.getMonth() + 1
    const a = cur.getFullYear()
    meses.push({ mes: m, ano: a, label: cur.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '') })
    cur.setMonth(cur.getMonth() + 1)
  }
  return {
    start: s.customStart,
    end: s.customEnd,
    label: `${ds.toLocaleDateString('pt-BR')} → ${de.toLocaleDateString('pt-BR')}`,
    meses,
    prev: {
      start: fmtISO(prevStart),
      end: fmtISO(prevEnd),
      label: 'Período anterior',
    },
  }
}

// Hook auxiliar: pega state + intervalo resolvido em uma chamada
export function usePeriodoResolved(): { state: PeriodoState; intervalo: Intervalo } {
  const state = usePeriodo()
  const intervalo = resolveIntervalo(state)
  return { state, intervalo }
}

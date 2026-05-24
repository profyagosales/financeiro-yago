// ─── ChartContainer ────────────────────────────────────────────────
// Wrapper pra gráficos do Recharts que ELIMINA o warning persistente:
//   "The width(-1) and height(-1) of chart should be greater than 0"
//
// CAUSA do warning: ResponsiveContainer do Recharts inicializa com
// `containerWidth=-1, containerHeight=-1` por padrão e clona o gráfico
// filho com esses valores ANTES da primeira medição via ResizeObserver.
// O AreaChart/PieChart valida no mount e printa o warning.
//
// SOLUÇÃO: pular o ResponsiveContainer. Medimos o div wrapper nós mesmos
// via ResizeObserver e clonamos o chart filho com `width` e `height`
// NUMÉRICOS reais. O chart só monta depois que temos dimensions > 0,
// então nunca recebe -1.
//
// Uso:
//   <ChartContainer height={280}>
//     <AreaChart data={...}>...</AreaChart>
//   </ChartContainer>

import { cloneElement, useEffect, useRef, useState, type ReactElement } from 'react'

interface Props {
  height: number
  /** Único filho — AreaChart, PieChart, ComposedChart, BarChart, etc. */
  children: ReactElement<{ width?: number; height?: number }>
  /** Inline style extra no wrapper */
  style?: React.CSSProperties
}

export function ChartContainer({ height, children, style }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState<{ w: number; h: number }>({ w: 0, h: 0 })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      // Só atualiza se mudou de fato — evita re-render desnecessário
      setDims(prev => {
        const w = Math.floor(r.width)
        const h = Math.floor(r.height)
        if (prev.w === w && prev.h === h) return prev
        return { w, h }
      })
    }
    measure()
    if (typeof ResizeObserver === 'undefined') {
      const raf = requestAnimationFrame(measure)
      return () => cancelAnimationFrame(raf)
    }
    const obs = new ResizeObserver(measure)
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const canRender = dims.w > 0 && dims.h > 0

  return (
    <div
      ref={ref}
      style={{ width: '100%', height, minWidth: 0, position: 'relative', ...style }}
    >
      {canRender && cloneElement(children, { width: dims.w, height: dims.h })}
    </div>
  )
}

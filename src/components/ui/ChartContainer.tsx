// ─── ChartContainer ────────────────────────────────────────────────
// Wrapper pro Recharts que só renderiza o gráfico quando o container
// tem dimensões reais (> 0). Sem isso, o ResponsiveContainer do Recharts
// pode disparar warning "width(-1) height(-1)" no primeiro paint quando
// o pai ainda não estabilizou (lazy load, modal recém-aberto, grid child
// sem minWidth: 0, etc).
//
// Uso típico (substitui o padrão antigo `<div style={...}><Responsive...>`):
//   <ChartContainer height={280}>
//     <AreaChart data={...}>...</AreaChart>
//   </ChartContainer>
//
// Internamente usa ResizeObserver pra detectar quando dimensions ≥ 1px.
// `minWidth: 0` aplicado no wrapper (defesa em flex/grid children).

import { useEffect, useRef, useState, type ReactElement } from 'react'
import { ResponsiveContainer } from 'recharts'

interface Props {
  height: number
  /** Conteúdo: deve ser UM filho React (ex: <AreaChart>, <PieChart>) */
  children: ReactElement
  /** debounce em ms passado ao ResponsiveContainer (default 0) */
  debounce?: number
  /** Inline style extra no wrapper */
  style?: React.CSSProperties
}

export function ChartContainer({ height, children, debounce = 50, style }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const check = () => {
      const r = el.getBoundingClientRect()
      if (r.width > 0 && r.height > 0) setReady(true)
    }
    check()
    if (typeof ResizeObserver === 'undefined') {
      // Fallback: requestAnimationFrame até medir
      const raf = requestAnimationFrame(check)
      return () => cancelAnimationFrame(raf)
    }
    const obs = new ResizeObserver(check)
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{ width: '100%', height, minWidth: 0, position: 'relative', ...style }}
    >
      {ready && (
        <ResponsiveContainer width="100%" height="100%" debounce={debounce}>
          {children}
        </ResponsiveContainer>
      )}
    </div>
  )
}

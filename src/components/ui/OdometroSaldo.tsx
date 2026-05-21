import { useEffect, useRef, useState } from 'react'

interface OdometroProps {
  value: number
  style?: React.CSSProperties
  decimals?: boolean
}

export function OdometroSaldo({ value, style, decimals = true }: OdometroProps) {
  const [display, setDisplay] = useState(value)
  const prevRef = useRef(value)

  useEffect(() => {
    const start = prevRef.current
    const end = value
    if (start === end) return
    const duration = 600
    const startTime = performance.now()
    const tick = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1)
      const ease = 1 - Math.pow(1 - t, 3)
      setDisplay(start + (end - start) * ease)
      if (t < 1) requestAnimationFrame(tick)
      else prevRef.current = end
    }
    requestAnimationFrame(tick)
  }, [value])

  const formatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL',
    minimumFractionDigits: decimals ? 2 : 0,
  }).format(display)

  return <span style={style}>{formatted}</span>
}

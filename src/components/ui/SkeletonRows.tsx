// ─── SkeletonRows ──────────────────────────────────────────────────
// Lista de placeholders animados (shimmer) durante loading.
//
// Usa a classe `.skeleton` definida em index.css (gradiente animado
// linear shimmer). Respeita prefers-reduced-motion via CSS global
// (já configurado no index.css R4).
//
// Props:
//   count    — número de rows (default 4)
//   height   — altura de cada row em px (default 56)
//   rounded  — border radius em px (default 14)
//   gap      — espaço entre rows (default 8)
//   widthVar — true: largura aleatória 70-100% (mais natural);
//              false: largura sempre 100%
//
// Uso típico:
//   {loading ? <SkeletonRows count={5} /> : <List items={data} />}

import { type CSSProperties } from 'react'

interface Props {
  count?: number
  height?: number
  rounded?: number
  gap?: number
  widthVar?: boolean
  style?: CSSProperties
}

// Larguras pseudo-aleatórias (determinísticas) pra parecer natural sem
// reflows quando count muda
const WIDTHS = [100, 84, 92, 76, 88, 96, 80, 90, 72, 98]

export function SkeletonRows({
  count = 4,
  height = 56,
  rounded = 14,
  gap = 8,
  widthVar = true,
  style,
}: Props) {
  return (
    <div role="status" aria-label="Carregando..."
      style={{ display: 'flex', flexDirection: 'column', gap, ...style }}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i}
          className="skeleton"
          style={{
            height,
            width: widthVar ? `${WIDTHS[i % WIDTHS.length]}%` : '100%',
            borderRadius: rounded,
          }}
        />
      ))}
      {/* Texto sr-only pra screen reader anunciar */}
      <span style={{
        position: 'absolute', width: 1, height: 1, padding: 0,
        margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)',
        whiteSpace: 'nowrap', border: 0,
      }}>Carregando…</span>
    </div>
  )
}

// Variante card-grid pra dashboards (com header + body)
export function SkeletonCard({ height = 120, style }: { height?: number; style?: CSSProperties }) {
  return (
    <div role="status" aria-label="Carregando..."
      className="skeleton"
      style={{
        width: '100%', height,
        borderRadius: 18,
        ...style,
      }}
    />
  )
}

// ─── ChartTooltip: tooltip dark padrão pros gráficos Recharts ──────
import { fmt } from '@/lib/format'

interface TooltipProps {
  active?: boolean
  payload?: Array<{ color?: string; value: number; name?: string; dataKey?: string; payload?: Record<string, unknown> }>
  label?: string
}

export function ChartTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(26,10,5,0.95)',
      backdropFilter: 'blur(8px)',
      borderRadius: 12, padding: '10px 13px',
      border: '1px solid rgba(255,255,255,0.08)',
      boxShadow: '0 14px 32px rgba(0,0,0,0.32)',
      fontFamily: "'Plus Jakarta Sans',sans-serif",
      minWidth: 130,
    }}>
      {label && (
        <p style={{
          margin: '0 0 6px',
          fontSize: 10, color: 'rgba(255,255,255,0.5)',
          letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 700,
        }}>{label}</p>
      )}
      {payload.map((p, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '3px 0',
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: 3,
            background: p.color ?? '#FFFFFF',
            display: 'inline-block', flexShrink: 0,
          }} />
          <span style={{
            fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.7)',
            flex: 1,
          }}>{p.name ?? p.dataKey ?? '—'}</span>
          <span style={{
            fontSize: 13, fontWeight: 700, color: '#FFFFFF',
            letterSpacing: '-0.2px',
          }}>{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

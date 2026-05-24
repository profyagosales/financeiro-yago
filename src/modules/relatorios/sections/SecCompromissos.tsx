// ─── Compromissos Futuros: timeline 90 dias ────────────────────────
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { IconCalendarEvent, IconCircleCheck } from '@tabler/icons-react'
import { SectionShell } from '../components/SectionShell'
import { fmt } from '@/lib/format'
import type { RelatoriosData } from '../lib/useRelatoriosData'

interface Props { d: RelatoriosData }

const TIPO_BG: Record<string, string> = {
  'conta-fixa': '#D4A017',
  'parcela-cartao': '#7A5C4F',
  'fatura': '#C4553B',
}

export function SecCompromissos({ d }: Props) {
  const navigate = useNavigate()
  const compromissos = d.compromissos
  const total = compromissos.filter(c => c.status !== 'pago').reduce((s, c) => s + c.valor, 0)

  // Agrupa por bucket: próximos 7 / 8-30 / 31-60 / 61-90
  const buckets = [
    { label: 'Próximos 7 dias',   range: [0, 7],   items: [] as typeof compromissos },
    { label: '8–30 dias',         range: [8, 30],  items: [] as typeof compromissos },
    { label: '31–60 dias',        range: [31, 60], items: [] as typeof compromissos },
    { label: '61–90 dias',        range: [61, 90], items: [] as typeof compromissos },
  ]
  compromissos.forEach(c => {
    const b = buckets.find(x => c.diasFalta >= x.range[0] && c.diasFalta <= x.range[1])
    if (b) b.items.push(c)
  })

  return (
    <SectionShell
      id="compromissos"
      eyebrow="Compromissos futuros"
      title="Próximos 90 dias"
      description="Contas fixas e faturas que precisam de fluxo de caixa."
      icon={<IconCalendarEvent size={18} stroke={2} color="#A8730F" />}
      accent="#D4A017"
      action={total > 0 ? (
        <span style={{
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          fontSize: 13, fontWeight: 700, color: '#A8442B',
          padding: '6px 12px', borderRadius: 999,
          background: 'rgba(196,85,59,0.1)', border: '1px solid rgba(196,85,59,0.25)',
        }}>{fmt(total)} pendente</span>
      ) : undefined}
    >
      {compromissos.length === 0 ? (
        <div style={{
          padding: '32px 20px', textAlign: 'center',
          background: 'rgba(58,133,128,0.06)', borderRadius: 14, border: '1px dashed rgba(58,133,128,0.3)',
        }}>
          <IconCircleCheck size={32} stroke={1.8} color="#1E7D5A" />
          <p style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 600,
            color: '#1E5944', margin: '8px 0 0',
          }}>Sem compromissos nos próximos 90 dias</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {buckets.filter(b => b.items.length > 0).map(b => {
            const totalBucket = b.items.filter(i => i.status !== 'pago').reduce((s, i) => s + i.valor, 0)
            return (
              <div key={b.label}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <h3 style={{
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                    fontSize: 11.5, fontWeight: 700, color: '#7A5C4F',
                    letterSpacing: '.12em', textTransform: 'uppercase',
                    margin: 0,
                  }}>{b.label}</h3>
                  <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, #EDE6DC, transparent)' }} />
                  <span style={{
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                    fontSize: 12, fontWeight: 700, color: '#2C1A0F',
                  }}>{fmt(totalBucket)}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
                  {b.items.map((c, i) => {
                    const isPago = c.status === 'pago'
                    const dt = new Date(c.data + 'T00:00:00')
                    const diaLabel = dt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')
                    return (
                      <motion.button key={c.id}
                        onClick={() => navigate(c.tipo === 'conta-fixa' ? '/contas-fixas' : '/cartoes')}
                        initial={{ opacity: 0, y: 4 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                        transition={{ delay: i * 0.02 }}
                        whileHover={{ y: -1 }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 12px',
                          background: isPago ? 'rgba(58,133,128,0.05)' : '#FFFFFF',
                          border: `1px solid ${isPago ? 'rgba(58,133,128,0.25)' : '#EDE6DC'}`,
                          borderRadius: 12,
                          cursor: 'pointer', textAlign: 'left',
                          fontFamily: "'Plus Jakarta Sans',sans-serif",
                          opacity: isPago ? 0.7 : 1,
                          transition: 'all .15s',
                        }}>
                        <div style={{
                          width: 4, height: 36, borderRadius: 3,
                          background: isPago ? '#3A8580' : (TIPO_BG[c.tipo] ?? c.cor),
                          flexShrink: 0,
                        }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{
                            fontSize: 12.5, fontWeight: 600, color: '#2C1A0F',
                            margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            textDecoration: isPago ? 'line-through' : undefined,
                          }}>{c.titulo}</p>
                          <p style={{
                            fontSize: 10.5, color: '#9B7B6A', margin: 0, fontWeight: 600,
                          }}>{diaLabel} {c.subtitulo ? `· ${c.subtitulo}` : ''}</p>
                        </div>
                        <span style={{
                          fontSize: 13, fontWeight: 700,
                          color: isPago ? '#1E7D5A' : (TIPO_BG[c.tipo] ?? c.cor),
                          letterSpacing: '-0.2px', whiteSpace: 'nowrap',
                        }}>{fmt(c.valor)}</span>
                      </motion.button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </SectionShell>
  )
}

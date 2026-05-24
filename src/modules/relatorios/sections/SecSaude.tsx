// ─── Saúde Financeira: gauge 0-100 + breakdown dos 4 fatores ────────
import { motion } from 'framer-motion'
import { IconShieldCheck, IconTarget, IconWaveSawTool, IconScaleOutline, IconCoin } from '@tabler/icons-react'
import { SectionShell } from '../components/SectionShell'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { corStatus, labelStatus, type SaudeScore, type StatusFinanceiro } from '@/modules/dashboard/lib/calculos'

interface Props {
  score: SaudeScore
  status: StatusFinanceiro
}

const FATORES: Array<{ key: keyof SaudeScore['fatores']; label: string; description: string; icon: typeof IconShieldCheck; peso: number; color: string }> = [
  { key: 'reserva',        label: 'Reserva de emergência', description: 'Cobertura do alvo definido (ou 6m de despesa).', icon: IconShieldCheck,  peso: 30, color: '#3A8580' },
  { key: 'economia',       label: 'Taxa de economia',      description: 'Quanto da renda você guarda no mês (savings rate). Ideal: 20%+.',     icon: IconCoin,         peso: 25, color: '#1E7D5A' },
  { key: 'endividamento',  label: 'Endividamento',         description: 'Parcela de dívidas vs renda. Menor = melhor.',   icon: IconScaleOutline, peso: 25, color: '#A8442B' },
  { key: 'liquidez',       label: 'Liquidez',              description: 'Saldo em contas vs despesa mensal (3m = ótimo).', icon: IconWaveSawTool,  peso: 20, color: '#504E76' },
]

export function SecSaude({ score, status }: Props) {
  const cor = corStatus(status)

  return (
    <SectionShell
      id="saude"
      eyebrow="Saúde financeira"
      title="Termômetro geral · 0–100"
      description="Score composto por 4 fatores ponderados. Use como bússola — não como nota final."
      icon={<IconTarget size={18} stroke={2} color="#1E7D5A" />}
      accent="#1E7D5A"
    >
      <div style={{
        display: 'grid', gridTemplateColumns: 'minmax(220px, 280px) 1fr', gap: 28,
        alignItems: 'center',
      }} className="saude-grid">
        {/* Gauge */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <Gauge score={score.total} color={cor.bg} />
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '8px 16px', borderRadius: 999,
            background: cor.bg, color: cor.text,
            boxShadow: `0 8px 24px ${cor.bg}55`,
          }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: cor.text, boxShadow: `0 0 6px ${cor.text}` }} />
            <span style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 13, fontWeight: 700, letterSpacing: '.02em',
            }}>{labelStatus(status)}</span>
          </div>
        </div>

        {/* Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {FATORES.map((f, i) => {
            const Icon = f.icon
            const valor = score.fatores[f.key]
            return (
              <motion.div key={f.key}
                initial={{ opacity: 0, x: -6 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: `${f.color}1c`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Icon size={14} stroke={2.2} color={f.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                      fontSize: 13, fontWeight: 700, color: '#2C1A0F', margin: 0,
                    }}>{f.label}</p>
                    <p style={{
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                      fontSize: 11, color: '#7A5C4F', margin: 0, fontWeight: 500,
                    }}>{f.description}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                      fontSize: 16, fontWeight: 700,
                      color: valor >= 70 ? '#1E7D5A' : valor >= 40 ? '#A8730F' : '#A8442B',
                      letterSpacing: '-0.3px', margin: 0, lineHeight: 1,
                    }}>{valor}</p>
                    <p style={{
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                      fontSize: 10, color: '#9B7B6A', margin: 0, fontWeight: 600,
                    }}>peso {f.peso}%</p>
                  </div>
                </div>
                <ProgressBar
                  value={valor}
                  color={f.color}
                  height={6}
                  background="#F5EEE3"
                />
              </motion.div>
            )
          })}
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .saude-grid { grid-template-columns: 1fr !important; gap: 24px !important; }
        }
      `}</style>
    </SectionShell>
  )
}

// ─── Gauge SVG circular ─────────────────────────────────────────────
function Gauge({ score, color }: { score: number; color: string }) {
  const size = 200
  const stroke = 14
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const arc = c * 0.75   // mostra 3/4 do círculo (270°)
  const offset = arc - (arc * Math.max(0, Math.min(100, score))) / 100

  return (
    <div style={{ position: 'relative', width: size, height: size * 0.75 + 20 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(135deg)' }}>
        {/* Track */}
        <circle cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="#F0E9DD" strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${arc} ${c}`} />
        {/* Fill */}
        <motion.circle cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round"
          initial={{ strokeDashoffset: arc }}
          whileInView={{ strokeDashoffset: offset }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, ease: [0.22, 0.6, 0.36, 1] }}
          strokeDasharray={`${arc} ${c}`}
          style={{ filter: `drop-shadow(0 0 12px ${color}55)` }} />
      </svg>
      {/* Score grande */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -42%)',
        textAlign: 'center',
      }}>
        <p style={{
          fontFamily: "'Fraunces',Georgia,serif",
          fontSize: 56, fontWeight: 700, color: '#2C1A0F',
          letterSpacing: '-2px', lineHeight: 1, margin: 0,
        }}>{score}</p>
        <p style={{
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          fontSize: 10, fontWeight: 700, color: '#9B7B6A',
          letterSpacing: '.18em', textTransform: 'uppercase', margin: '2px 0 0',
        }}>de 100</p>
      </div>
    </div>
  )
}

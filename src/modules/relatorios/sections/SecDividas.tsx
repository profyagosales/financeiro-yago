// ─── Dívidas: progresso + debt avalanche ──────────────────────────
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  IconCreditCardOff, IconFlame, IconSnowflake, IconCircleCheck,
} from '@tabler/icons-react'
import { SectionShell } from '../components/SectionShell'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { fmt } from '@/lib/format'
import type { RelatoriosData } from '../lib/useRelatoriosData'

interface Props { d: RelatoriosData }

export function SecDividas({ d }: Props) {
  const navigate = useNavigate()
  const [estrategia, setEstrategia] = useState<'avalanche' | 'snowball'>('avalanche')
  const lista = estrategia === 'avalanche' ? d.avalanche : d.snowball
  const totalSaldo = lista.reduce((s, x) => s + x.saldoDevedor, 0)
  const totalParcela = lista.reduce((s, x) => s + x.parcela, 0)

  if (d.dividas.length === 0 || totalSaldo === 0) {
    return (
      <SectionShell
        id="dividas"
        eyebrow="Dívidas"
        title="Comprometimentos"
        icon={<IconCreditCardOff size={18} stroke={2} color="#1E7D5A" />}
        accent="#1E7D5A"
      >
        <div style={{
          padding: '28px 20px', textAlign: 'center',
          background: 'rgba(58,133,128,0.06)', borderRadius: 14, border: '1px dashed rgba(58,133,128,0.3)',
        }}>
          <IconCircleCheck size={32} stroke={1.8} color="#1E7D5A" />
          <p style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 700,
            color: '#1E5944', margin: '8px 0 4px',
          }}>Você está sem dívidas</p>
          <p style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12,
            color: '#7A5C4F', margin: 0,
          }}>Mantenha a disciplina — sem novos parcelamentos longos.</p>
        </div>
      </SectionShell>
    )
  }

  return (
    <SectionShell
      id="dividas"
      eyebrow="Dívidas"
      title="Estratégia de quitação"
      description="Avalanche prioriza maior juros (paga menos no total). Snowball prioriza menor saldo (motivação rápida)."
      icon={<IconCreditCardOff size={18} stroke={2} color="#A8442B" />}
      accent="#A8442B"
    >
      {/* Header: total + estratégia toggle */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <p style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 10, fontWeight: 700, color: '#7A5C4F',
            letterSpacing: '.12em', textTransform: 'uppercase', margin: 0,
          }}>Saldo devedor total</p>
          <p style={{
            fontFamily: "'Fraunces',Georgia,serif",
            fontSize: 32, fontWeight: 700, color: '#A8442B',
            letterSpacing: '-0.8px', margin: '4px 0 0', lineHeight: 1,
          }}>{fmt(totalSaldo)}</p>
          <p style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 12, color: '#7A5C4F', margin: '4px 0 0', fontWeight: 500,
          }}>Comprometimento mensal: <strong style={{ color: '#2C1A0F' }}>{fmt(totalParcela)}</strong></p>
        </div>
        <div style={{
          display: 'flex', gap: 4, background: '#FBF8F3', borderRadius: 12, padding: 4, border: '1px solid #EDE6DC',
        }}>
          <ToggleEstrategia active={estrategia === 'avalanche'} onClick={() => setEstrategia('avalanche')}
            icon={<IconFlame size={13} stroke={2.2} />} label="Avalanche" />
          <ToggleEstrategia active={estrategia === 'snowball'} onClick={() => setEstrategia('snowball')}
            icon={<IconSnowflake size={13} stroke={2.2} />} label="Snowball" />
        </div>
      </div>

      {/* Lista ranqueada */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {lista.map((dv, i) => {
          const divComputed = d.dividas.find(x => x.id === dv.id)
          const pago = divComputed ? divComputed.valorPago : 0
          const totalOriginal = divComputed ? divComputed.valorTotalEfetivo : (dv.saldoDevedor + pago)
          const progressoPct = totalOriginal > 0 ? (pago / totalOriginal) * 100 : 0
          return (
            <motion.div key={dv.id}
              initial={{ opacity: 0, y: 4 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigate('/dividas')}
              style={{
                padding: '14px 16px',
                background: i === 0 ? 'linear-gradient(135deg, rgba(196,85,59,0.07), rgba(196,85,59,0.02))' : '#FBF8F3',
                border: i === 0 ? '1px solid rgba(196,85,59,0.28)' : '1px solid #EDE6DC',
                borderRadius: 14, cursor: 'pointer',
                transition: 'all .15s',
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 7,
                  background: i === 0 ? '#C4553B' : '#EDE6DC',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: i === 0 ? '#FFFFFF' : '#7A5C4F',
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontSize: 12, fontWeight: 800,
                }}>{dv.prioridade}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                    fontSize: 13.5, fontWeight: 700, color: '#2C1A0F',
                    margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{dv.nome}</p>
                  <p style={{
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                    fontSize: 11, color: '#7A5C4F', margin: 0, fontWeight: 500,
                  }}>
                    {dv.jurosAnual > 0 ? `${dv.jurosAnual.toFixed(2)}% a.a.` : 'Sem juros'} · {dv.parcelasRestantes} parcelas restantes
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                    fontSize: 15, fontWeight: 700, color: '#A8442B',
                    letterSpacing: '-0.3px', margin: 0,
                  }}>{fmt(dv.saldoDevedor)}</p>
                  <p style={{
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                    fontSize: 11, color: '#7A5C4F', margin: '2px 0 0', fontWeight: 500,
                  }}>{fmt(dv.parcela)}/mês</p>
                </div>
              </div>
              <ProgressBar value={progressoPct} color="#3A8580" colorTo="#1E7D5A" height={6} background="#F5EEE3" />
              <p style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontSize: 10.5, color: '#7A5C4F', margin: '4px 0 0', fontWeight: 600,
              }}>{progressoPct.toFixed(0)}% quitado</p>
            </motion.div>
          )
        })}
      </div>
    </SectionShell>
  )
}

function ToggleEstrategia({ active, onClick, icon, label }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string
}) {
  return (
    <button onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '6px 12px', borderRadius: 9, border: 'none',
        background: active ? '#FFFFFF' : 'transparent',
        boxShadow: active ? '0 1px 3px rgba(44,26,15,0.1)' : 'none',
        fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700,
        color: active ? '#A8442B' : '#7A5C4F',
        cursor: 'pointer', transition: 'all .15s',
      }}>{icon} {label}</button>
  )
}

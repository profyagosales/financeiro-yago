// ─── Próximos 7 dias: timeline horizontal compacta ──────────────────
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { IconCircleCheck } from '@tabler/icons-react'
import { fmt } from '@/lib/format'
import type { ProximoEvento } from '../lib/useDashboardData'

interface Proximos7DiasProps {
  eventos: ProximoEvento[]
}

const TIPO_LABEL: Record<ProximoEvento['tipo'], string> = {
  'conta-fixa': 'Conta fixa',
  'parcela-cartao': 'Parcela',
  'fatura-fechamento': 'Fecha fatura',
  'fatura-vencimento': 'Vence fatura',
}

export function Proximos7Dias({ eventos }: Proximos7DiasProps) {
  const navigate = useNavigate()
  const total = eventos.reduce((s, e) => s + e.valor, 0)

  // Agrupa por dia
  const porDia = new Map<number, ProximoEvento[]>()
  eventos.forEach(e => {
    porDia.set(e.diasFalta, [...(porDia.get(e.diasFalta) ?? []), e])
  })
  const dias = Array.from(porDia.keys()).sort((a, b) => a - b)

  return (
    <section style={{
      background: '#FFFFFF',
      border: '1px solid #EDE6DC',
      borderRadius: 22,
      padding: '20px 22px',
      boxShadow: '0 1px 3px rgba(44,26,15,0.05), 0 4px 16px rgba(44,26,15,0.06)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <p style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 10, fontWeight: 700,
            color: '#7A5C4F', letterSpacing: '.14em', textTransform: 'uppercase', margin: 0,
          }}>Próximos 7 dias</p>
          <h2 style={{
            fontFamily: "'Fraunces',Georgia,serif",
            fontSize: 22, fontWeight: 700, color: '#2C1A0F',
            letterSpacing: '-0.5px', margin: '2px 0 0',
          }}>{eventos.length} {eventos.length === 1 ? 'compromisso' : 'compromissos'}</h2>
        </div>
        {total > 0 && (
          <span style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 13, fontWeight: 700, color: '#A8442B',
            padding: '6px 12px', borderRadius: 999,
            background: 'rgba(196,85,59,0.1)',
            border: '1px solid rgba(196,85,59,0.25)',
          }}>{fmt(total)}</span>
        )}
      </div>

      {eventos.length === 0 ? (
        <div style={{
          padding: '24px 16px', textAlign: 'center',
          background: 'rgba(58,133,128,0.06)', borderRadius: 14, border: '1px dashed rgba(58,133,128,0.3)',
        }}>
          <IconCircleCheck size={28} stroke={1.8} color="#1E7D5A" />
          <p style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 600,
            color: '#1E5944', margin: '8px 0 0',
          }}>Nenhum compromisso nos próximos 7 dias</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {dias.map(dia => {
            const evs = porDia.get(dia)!
            const dt = new Date()
            dt.setDate(dt.getDate() + dia)
            const diaLabel = dia === 0 ? 'Hoje' : dia === 1 ? 'Amanhã' : dt.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }).replace('.', '')
            const isToday = dia === 0
            const isTomorrow = dia === 1
            return (
              <motion.div key={dia}
                initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: dia * 0.03 }}
                style={{
                  display: 'grid', gridTemplateColumns: '88px 1fr',
                  gap: 12, alignItems: 'flex-start',
                  padding: '10px 0', borderBottom: '1px dashed #F5EEE3',
                }}>
                {/* Dia */}
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                  padding: '6px 10px', borderRadius: 10,
                  background: isToday ? 'rgba(196,85,59,0.1)' : isTomorrow ? 'rgba(212,160,23,0.1)' : '#FBF8F3',
                  border: `1px solid ${isToday ? 'rgba(196,85,59,0.3)' : isTomorrow ? 'rgba(212,160,23,0.3)' : '#EDE6DC'}`,
                }}>
                  <span style={{
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                    fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase',
                    color: isToday ? '#A8442B' : isTomorrow ? '#A8730F' : '#9B7B6A',
                  }}>{diaLabel}</span>
                  <span style={{
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                    fontSize: 10, color: isToday ? '#A8442B' : isTomorrow ? '#A8730F' : '#7A5C4F',
                    fontWeight: 500,
                  }}>
                    {evs.length} {evs.length === 1 ? 'item' : 'itens'}
                  </span>
                </div>
                {/* Eventos */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {evs.map(ev => (
                    <button
                      key={ev.id}
                      onClick={() => navigate(ev.tipo === 'conta-fixa' ? '/contas-fixas' : '/cartoes')}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 9,
                        padding: '6px 10px',
                        background: 'transparent', border: 'none',
                        borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                        fontFamily: "'Plus Jakarta Sans',sans-serif",
                        transition: 'background .15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#FBF8F3')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{
                        width: 4, height: 28, borderRadius: 3, background: ev.cor, flexShrink: 0,
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          fontSize: 12.5, fontWeight: 600, color: '#2C1A0F',
                          margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{ev.titulo}</p>
                        <p style={{
                          fontSize: 10.5, color: '#7A5C4F', margin: 0, fontWeight: 500,
                        }}>{ev.subtitulo ?? TIPO_LABEL[ev.tipo]}</p>
                      </div>
                      {ev.valor > 0 && (
                        <span style={{
                          fontSize: 12.5, fontWeight: 700, color: ev.cor,
                          letterSpacing: '-0.2px', whiteSpace: 'nowrap',
                        }}>{fmt(ev.valor)}</span>
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </section>
  )
}

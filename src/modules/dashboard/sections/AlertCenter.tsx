// ─── AlertCenter: central de atenção imediata ───────────────────────
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  IconCalendarEvent, IconCreditCard, IconShieldCheck, IconWallet,
  IconCircleCheck, IconChartArrows,
} from '@tabler/icons-react'
import { AlertChip } from '@/components/ui/AlertChip'
import type { Alerta } from '../lib/useDashboardData'

const ICONS: Record<string, typeof IconCalendarEvent> = {
  'conta-fixa': IconCalendarEvent,
  'cartao': IconCreditCard,
  'orcamento': IconChartArrows,
  'reserva': IconShieldCheck,
  'parcela': IconCalendarEvent,
  'meta': IconShieldCheck,
  'saldo': IconWallet,
}

interface AlertCenterProps {
  alertas: Alerta[]
}

export function AlertCenter({ alertas }: AlertCenterProps) {
  const navigate = useNavigate()
  const top = alertas.slice(0, 6)

  return (
    <section style={{
      background: '#FFFFFF',
      border: '1px solid #EDE6DC',
      borderRadius: 22,
      padding: '20px 22px',
      boxShadow: '0 1px 3px rgba(44,26,15,0.05), 0 4px 16px rgba(44,26,15,0.06)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <p style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 10, fontWeight: 700,
            color: '#7A5C4F', letterSpacing: '.14em', textTransform: 'uppercase',
            margin: 0,
          }}>Atenção imediata</p>
          <h2 style={{
            fontFamily: "'Fraunces',Georgia,serif",
            fontSize: 22, fontWeight: 700, color: '#2C1A0F',
            letterSpacing: '-0.5px', margin: '2px 0 0',
          }}>
            {top.length === 0 ? 'Tudo em ordem' : `${alertas.length} ${alertas.length === 1 ? 'alerta' : 'alertas'}`}
          </h2>
        </div>
        {top.length > 0 && (
          <span style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 11, fontWeight: 600,
            padding: '4px 10px', borderRadius: 999,
            background: 'rgba(229,94,60,0.1)', color: '#A8442B',
          }}>
            {alertas.filter(a => a.severity === 'critical').length} críticos
          </span>
        )}
      </div>

      <AnimatePresence mode="wait">
        {top.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{
              padding: '24px 20px', textAlign: 'center',
              background: 'linear-gradient(135deg, rgba(58,133,128,0.07), rgba(58,133,128,0.02))',
              borderRadius: 16, border: '1px dashed rgba(58,133,128,0.3)',
            }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14, margin: '0 auto 10px',
              background: 'rgba(58,133,128,0.16)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <IconCircleCheck size={26} stroke={2} color="#1E7D5A" />
            </div>
            <p style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700,
              color: '#1E5944', margin: '0 0 4px',
            }}>Nada pegando fogo</p>
            <p style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12,
              color: '#7A5C4F', margin: 0, fontWeight: 500,
            }}>Sem contas vencidas, cartões no limite ou metas atrasadas. Bom trabalho.</p>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ display: 'grid', gap: 8 }}>
            {top.map((a, i) => (
              <motion.div key={a.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04, type: 'spring', stiffness: 280, damping: 24 }}>
                <AlertChip
                  icon={ICONS[a.iconKey] ?? IconCalendarEvent}
                  title={a.title}
                  subtitle={a.subtitle}
                  value={a.value}
                  meta={a.meta}
                  severity={a.severity}
                  onClick={a.href ? () => navigate(a.href!) : undefined}
                />
              </motion.div>
            ))}
            {alertas.length > 6 && (
              <button
                onClick={() => navigate('/relatorios')}
                style={{
                  marginTop: 4, padding: '8px 12px',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontSize: 12, fontWeight: 600, color: '#7A5C4F',
                  textAlign: 'left',
                }}>
                + {alertas.length - 6} {alertas.length - 6 === 1 ? 'outro alerta' : 'outros alertas'}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

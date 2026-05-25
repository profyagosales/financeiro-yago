import { motion } from 'framer-motion'
import { IconShieldCheck, IconEdit, IconPlus, IconLink, IconAlertTriangle } from '@tabler/icons-react'
import type { MetaComputed } from '@/db/hooks/useMetas'
import { fmt, fmtPct } from '@/lib/format'
import { reservaStatus } from './constants'

interface Props {
  reserva: MetaComputed
  onEdit: () => void
  onAporte: () => void
}

export function ReservaCard({ reserva, onEdit, onAporte }: Props) {
  const status = reservaStatus(reserva.progressoPct)
  const meses = reserva.mesesCobertura ?? 6
  const falta = Math.max(0, reserva.valorAlvo - reserva.valorAtualTotal)
  const mesesCobertosAgora = reserva.valorAlvo > 0
    ? (reserva.valorAtualTotal / reserva.valorAlvo) * meses
    : 0

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      style={{
        position: 'relative',
        background: 'linear-gradient(155deg, #1E5E5A 0%, #143E3B 100%)',
        borderRadius: 24,
        padding: '28px 32px',
        boxShadow: '0 8px 32px rgba(20,62,59,0.32), 0 2px 8px rgba(20,62,59,0.16)',
        overflow: 'hidden',
      }}>
      {/* Decoração concêntrica */}
      <svg style={{ position: 'absolute', right: -10, top: -20, width: 220, height: 220, opacity: 0.07, pointerEvents: 'none' }} viewBox="0 0 200 200" fill="none">
        <circle cx="100" cy="100" r="90" stroke="white" strokeWidth="1"/>
        <circle cx="100" cy="100" r="62" stroke="white" strokeWidth="1"/>
        <circle cx="100" cy="100" r="35" stroke="white" strokeWidth="1"/>
      </svg>

      <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 28, alignItems: 'stretch' }}>
        {/* Esquerda: identificação + progresso */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <IconShieldCheck size={20} stroke={1.8} color="#A7E0DC" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700,
                color: 'rgba(167,224,220,0.7)', letterSpacing: '.18em', textTransform: 'uppercase', margin: 0,
              }}>Reserva de Emergência</p>
              <h2 style={{
                fontFamily: "'Fraunces',Georgia,serif", fontSize: 24, fontWeight: 700,
                color: '#FFFFFF', margin: '2px 0 0', letterSpacing: '-0.6px', lineHeight: 1,
              }}>{reserva.nome}</h2>
            </div>
            <button onClick={onEdit} title="Editar"
              style={{
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 9, width: 32, height: 32, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
              <IconEdit size={14} stroke={1.8} color="#A7E0DC" />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 44, fontWeight: 700, color: '#FFFFFF', margin: 0, letterSpacing: '-0.3px', lineHeight: 1 }}>
              {fmt(reserva.valorAtualTotal)}
            </p>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: 'rgba(167,224,220,0.65)', margin: 0 }}>
              de {fmt(reserva.valorAlvo)}
              {reserva.alvoAutoCalculado && (
                <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, color: '#D4A017', letterSpacing: '.06em', textTransform: 'uppercase' }}>auto</span>
              )}
            </p>
          </div>

          {/* Barra de progresso */}
          <div style={{ marginTop: 14 }}>
            <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, reserva.progressoPct)}%` }}
                transition={{ type: 'spring', stiffness: 100, damping: 22 }}
                style={{ height: '100%', background: `linear-gradient(90deg, ${status.cor}, ${status.cor})`, borderRadius: 4 }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <span style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700,
                color: status.cor, letterSpacing: '.04em',
              }}>{status.label} · {fmtPct(reserva.progressoPct, 0)}</span>
              <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: 'rgba(167,224,220,0.6)' }}>
                {mesesCobertosAgora.toFixed(1)} de {meses} meses cobertos
              </span>
            </div>
          </div>

          {/* Status message */}
          <div style={{
            marginTop: 14, padding: '10px 12px', borderRadius: 10,
            background: `${status.cor}1F`, border: `1px solid ${status.cor}40`,
            display: 'flex', alignItems: 'flex-start', gap: 8,
          }}>
            {reserva.progressoPct < 50 && <IconAlertTriangle size={14} stroke={2} color={status.cor} style={{ marginTop: 2, flexShrink: 0 }} />}
            <div>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, color: '#FFFFFF', margin: 0, lineHeight: 1.4 }}>
                {status.descricao}
              </p>
              {falta > 0 && (
                <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: 'rgba(167,224,220,0.75)', margin: '4px 0 0' }}>
                  Faltam <strong style={{ color: '#FFFFFF' }}>{fmt(falta)}</strong> para a meta completa
                </p>
              )}
            </div>
          </div>

          {/* CTA aporte */}
          {reserva.progressoPct < 100 && (
            <button onClick={onAporte}
              style={{
                marginTop: 14, background: '#FFFFFF',
                color: '#143E3B', border: 'none', borderRadius: 12,
                padding: '10px 18px', cursor: 'pointer',
                fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 800,
                display: 'inline-flex', alignItems: 'center', gap: 6,
                boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
                letterSpacing: '.01em',
              }}>
              <IconPlus size={14} stroke={2.5} /> Aportar à reserva
            </button>
          )}
        </div>

        {/* Direita: composição */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 14, padding: '14px 16px',
          display: 'flex', flexDirection: 'column',
        }}>
          <p style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 700,
            color: 'rgba(167,224,220,0.7)', letterSpacing: '.18em', textTransform: 'uppercase', margin: 0,
          }}>Composição</p>

          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 7, flex: 1 }}>
            {reserva.valorAporteDireto > 0 && (
              <ItemRow label="Aporte direto" valor={reserva.valorAporteDireto} />
            )}
            {reserva.investimentos.length === 0 && reserva.valorAporteDireto === 0 ? (
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: 'rgba(167,224,220,0.45)', margin: 0 }}>
                Sem investimentos ou aportes vinculados ainda.
              </p>
            ) : (
              reserva.investimentos.map(inv => (
                <ItemRow
                  key={inv.id}
                  icon={<IconLink size={10} stroke={2.2} color="#A7E0DC" />}
                  label={inv.nome}
                  sub={inv.instituicao}
                  valor={inv.valorAtual}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function ItemRow({ label, sub, valor, icon }: { label: string; sub?: string; valor: number; icon?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      {icon && <span style={{ flexShrink: 0 }}>{icon}</span>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, color: '#FFFFFF', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label}
        </p>
        {sub && (
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 500, color: 'rgba(167,224,220,0.55)', margin: '1px 0 0' }}>
            {sub}
          </p>
        )}
      </div>
      <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, color: '#FFFFFF', flexShrink: 0 }}>
        {fmt(valor)}
      </span>
    </div>
  )
}

// ─── Metas mobile — identidade peach + lista de metas + reserva ────
import { useState } from 'react'
import { motion } from 'framer-motion'
import { IconPlus, IconTarget, IconShieldCheck, IconChevronRight, IconTrophy } from '@tabler/icons-react'
import { useMetasComputed, useReservaEmergencia } from '@/db/hooks/useMetas'
import { fmt } from '@/lib/format'
import { Modal } from '@/components/ui/Modal'
import { MetaForm } from './MetaForm'
import { ReservaCard } from './ReservaCard'

const C = {
  bgTop: '#FFE2C7', bgMid: '#FFF1DE', bgBottom: '#FFE9D7',
  ink: '#2C1A0F', inkSoft: '#5C4339', muted: '#9B7B6A',
  purple: '#2A1E3F', orange: '#C4553B', orangeBri: '#F1642E',
  gold: '#D4A017', green: '#1E7D5A',
  glass: 'rgba(255,255,255,0.65)', glassStrong: 'rgba(255,255,255,0.85)',
  glassBorder: 'rgba(255,255,255,0.7)',
  glassShadow: '0 1px 2px rgba(196,85,59,0.06), 0 8px 24px rgba(196,85,59,0.08)',
}

const PAGE = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.04 } } }
const ITEM = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 200, damping: 24 } } }

export function MetasMobile() {
  const metas = useMetasComputed()
  const reserva = useReservaEmergencia()
  const outras = metas.filter(m => m.tipo !== 'reserva_emergencia')
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  const ativas = outras.filter(m => m.progressoPct < 100)
  const concluidas = outras.filter(m => m.progressoPct >= 100)

  return (
    <div style={{
      position: 'relative', minHeight: '100dvh', width: '100%',
      background: `linear-gradient(180deg, ${C.bgTop} 0%, ${C.bgMid} 35%, ${C.bgBottom} 100%)`,
    }}>
      <div aria-hidden style={{ position: 'absolute', right: -80, top: -120, width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle, rgba(241,100,46,0.18), transparent 65%)', filter: 'blur(20px)', pointerEvents: 'none' }} />
      <div aria-hidden style={{ position: 'absolute', left: -100, bottom: -80, width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,160,23,0.16), transparent 60%)', filter: 'blur(28px)', pointerEvents: 'none' }} />

      <motion.div variants={PAGE} initial="hidden" animate="show"
        style={{
          position: 'relative',
          padding: '16px 18px',
          paddingTop: 'calc(20px + env(safe-area-inset-top))',
          paddingBottom: 'calc(120px + env(safe-area-inset-bottom))',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>

        <motion.header variants={ITEM}
          style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 30, fontWeight: 700, color: C.ink, letterSpacing: '-1px', margin: 0, lineHeight: 1 }}>Metas</h1>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11.5, color: C.muted, margin: '4px 0 0', fontWeight: 500 }}>
              {ativas.length === 0 && concluidas.length === 0 ? 'Defina suas metas' : `${ativas.length} ativa${ativas.length === 1 ? '' : 's'}${concluidas.length ? ` · ${concluidas.length} concluída${concluidas.length === 1 ? '' : 's'}` : ''}`}
            </p>
          </div>
          <button onClick={() => { setEditingId(null); setFormOpen(true) }}
            aria-label="Nova meta"
            style={{
              width: 44, height: 44, borderRadius: 14,
              background: `linear-gradient(135deg, ${C.orangeBri}, ${C.orange})`,
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 8px 22px rgba(196,85,59,0.42)',
            }}>
            <IconPlus size={20} stroke={2.6} color="#FFFFFF" />
          </button>
        </motion.header>

        {/* Reserva de emergência (destaque especial) */}
        {reserva && (
          <motion.section variants={ITEM}>
            <ReservaCard
              reserva={reserva}
              onEdit={() => { setEditingId(reserva.id!); setFormOpen(true) }}
              onAporte={() => { setEditingId(reserva.id!); setFormOpen(true) }}
            />
          </motion.section>
        )}

        {ativas.length === 0 && concluidas.length === 0 && !reserva && (
          <MetasEmptyState onAdd={() => { setEditingId(null); setFormOpen(true) }} />
        )}

        {/* Metas ativas */}
        {ativas.length > 0 && (
          <motion.section variants={ITEM}>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: C.inkSoft, letterSpacing: '.16em', textTransform: 'uppercase', margin: '0 0 8px', padding: '0 4px' }}>Em andamento</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {ativas.map(m => (
                <MetaRow key={m.id} meta={m} onClick={() => { setEditingId(m.id!); setFormOpen(true) }} />
              ))}
            </div>
          </motion.section>
        )}

        {/* Metas concluídas */}
        {concluidas.length > 0 && (
          <motion.section variants={ITEM}>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: C.green, letterSpacing: '.16em', textTransform: 'uppercase', margin: '0 0 8px', padding: '0 4px' }}>Concluídas · {concluidas.length}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {concluidas.map(m => (
                <MetaRow key={m.id} meta={m} concluida onClick={() => { setEditingId(m.id!); setFormOpen(true) }} />
              ))}
            </div>
          </motion.section>
        )}
      </motion.div>

      {/* Form (MetaForm tem overlay próprio — só renderiza quando aberto) */}
      {formOpen && (
        <MetaForm
          meta={editingId ? metas.find(m => m.id === editingId) ?? null : null}
          onClose={() => { setFormOpen(false); setEditingId(null) }}
        />
      )}
    </div>
  )
}

function MetaRow({ meta, onClick, concluida }: {
  meta: ReturnType<typeof useMetasComputed>[number]
  onClick: () => void
  concluida?: boolean
}) {
  const pct = meta.progressoPct
  return (
    <motion.button onClick={onClick}
      whileTap={{ scale: 0.99 }}
      style={{
        background: C.glassStrong,
        backdropFilter: 'blur(18px)',
        border: `1px solid ${C.glassBorder}`,
        borderRadius: 18, padding: '14px 16px',
        cursor: 'pointer', textAlign: 'left',
        boxShadow: C.glassShadow,
        opacity: concluida ? 0.78 : 1,
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 11,
          background: `${meta.cor}22`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {concluida
            ? <IconTrophy size={17} stroke={2} color={meta.cor} />
            : <IconTarget size={17} stroke={2} color={meta.cor} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 15, fontWeight: 700, color: C.ink, margin: 0, letterSpacing: '-0.3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meta.nome}</p>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: C.muted, margin: 0, fontWeight: 500 }}>
            {fmt(meta.valorAtualTotal)} de {fmt(meta.valorAlvo)}
          </p>
        </div>
        <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 700, color: meta.cor, whiteSpace: 'nowrap', letterSpacing: '-0.2px' }}>
          {pct.toFixed(0)}%
        </span>
      </div>
      <div style={{ position: 'relative', height: 6, background: '#F5EEE3', borderRadius: 999, overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, pct)}%` }}
          transition={{ duration: 0.8 }}
          style={{
            height: '100%',
            background: `linear-gradient(90deg, ${meta.cor}, ${meta.cor}d0)`,
            borderRadius: 999,
            boxShadow: pct >= 100 ? `0 0 10px ${meta.cor}80` : 'none',
          }}
        />
      </div>
    </motion.button>
  )
}

function MetasEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <motion.section variants={ITEM}
      style={{
        background: C.glass,
        backdropFilter: 'blur(16px)',
        border: `1px solid ${C.glassBorder}`,
        borderRadius: 20, padding: '32px 24px', textAlign: 'center',
        boxShadow: C.glassShadow, marginTop: 8,
      }}>
      <div style={{
        width: 64, height: 64, borderRadius: 18, margin: '0 auto 14px',
        background: `linear-gradient(135deg, #7C5CBF, ${C.purple})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 22px rgba(124,92,191,0.42)',
      }}>
        <IconTarget size={28} stroke={1.8} color="#FFFFFF" />
      </div>
      <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: C.ink, margin: 0, letterSpacing: '-0.5px' }}>Defina uma meta</p>
      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12.5, color: C.muted, margin: '8px 0 18px', fontWeight: 500, lineHeight: 1.5 }}>Reserva, viagem, sonho — definir uma meta dá direção pro seu dinheiro.</p>
      <button onClick={onAdd}
        style={{
          padding: '12px 24px',
          background: `linear-gradient(135deg, ${C.orangeBri}, ${C.orange})`,
          color: '#FFFFFF', border: 'none', borderRadius: 12, cursor: 'pointer',
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          fontSize: 13, fontWeight: 700,
          boxShadow: '0 8px 22px rgba(196,85,59,0.42)',
        }}>
        Criar primeira meta
      </button>
    </motion.section>
  )
}

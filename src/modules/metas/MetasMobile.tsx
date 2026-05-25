// ─── Metas mobile — identidade peach + lista de metas + reserva ────
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  IconPlus, IconTarget, IconShieldCheck, IconChevronRight, IconTrophy,
  IconCurrencyReal, IconEdit, IconTrash, IconX,
} from '@tabler/icons-react'
import { useMetasComputed, useReservaEmergencia, deleteMeta, type MetaComputed } from '@/db/hooks/useMetas'
import { fmt, fmtPct } from '@/lib/format'
import { MetaForm } from './MetaForm'
import { ReservaCard } from './ReservaCard'
import { AporteForm } from './AporteForm'
import { InvestimentoForm } from '../investimentos/InvestimentoForm'

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
  // Tap-to-action: ao tocar numa meta, abre sheet com Aportar / Editar / Excluir
  const [actionFor, setActionFor] = useState<MetaComputed | null>(null)
  const [aporteFor, setAporteFor] = useState<MetaComputed | null>(null)
  const [vincularInvestParaMetaId, setVincularInvestParaMetaId] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<MetaComputed | null>(null)

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
              onAporte={() => setAporteFor(reserva)}
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
                <MetaRow key={m.id} meta={m} onClick={() => setActionFor(m)} />
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
                <MetaRow key={m.id} meta={m} concluida onClick={() => setActionFor(m)} />
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

      <AnimatePresence>
        {actionFor && (
          <MetaActionSheet
            meta={actionFor}
            onClose={() => setActionFor(null)}
            onAporte={() => { setAporteFor(actionFor); setActionFor(null) }}
            onEdit={() => { setEditingId(actionFor.id!); setActionFor(null); setFormOpen(true) }}
            onDelete={() => { setConfirmDelete(actionFor); setActionFor(null) }}
          />
        )}
      </AnimatePresence>

      {aporteFor && (
        <AporteForm
          meta={aporteFor}
          onClose={() => setAporteFor(null)}
          onOpenInvestimento={() => {
            if (aporteFor.id !== undefined) {
              setVincularInvestParaMetaId(aporteFor.id)
              setAporteFor(null)
            }
          }}
        />
      )}

      {vincularInvestParaMetaId !== null && (
        <InvestimentoForm
          presetMetaId={vincularInvestParaMetaId}
          onClose={() => setVincularInvestParaMetaId(null)}
        />
      )}

      <AnimatePresence>
        {confirmDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setConfirmDelete(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 110,
              background: 'rgba(28,10,5,0.55)', backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
            }}>
            <motion.div initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ background: '#FFFDF9', borderRadius: 22, padding: '28px 24px', maxWidth: 380, width: '100%', textAlign: 'center', boxShadow: '0 24px 64px rgba(13,6,4,0.4)' }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: '#FAF0EE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <IconTrash size={26} color={C.orange} stroke={1.8} />
              </div>
              <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: C.ink, letterSpacing: '-0.5px', margin: '0 0 8px' }}>
                Excluir "{confirmDelete.nome}"?
              </p>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: C.muted, marginBottom: 22, lineHeight: 1.5 }}>
                A meta será desativada. Investimentos vinculados são mantidos, mas perdem o vínculo.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setConfirmDelete(null)}
                  style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: '1.5px solid #E8E0D5', background: 'white', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, color: '#7A5C4F', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <motion.button whileTap={{ scale: 0.97 }}
                  onClick={async () => {
                    if (confirmDelete.id !== undefined) await deleteMeta(confirmDelete.id)
                    setConfirmDelete(null)
                  }}
                  style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: 'none', background: C.orange, fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, color: 'white', cursor: 'pointer', boxShadow: '0 4px 12px rgba(196,85,59,0.3)' }}>
                  Excluir
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Action sheet ao tocar numa meta ──────────────────────────────
function MetaActionSheet({
  meta, onClose, onAporte, onEdit, onDelete,
}: {
  meta: MetaComputed
  onClose: () => void
  onAporte: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const isReserva = meta.tipo === 'reserva_emergencia'
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 90,
        background: 'rgba(28,10,5,0.45)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}>
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: '#FFFDF9', width: '100%', maxWidth: 520,
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          padding: '12px 18px calc(20px + env(safe-area-inset-bottom))',
          boxShadow: '0 -8px 32px rgba(13,6,4,0.18)',
        }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(44,26,15,0.18)' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 4px 14px' }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: `${meta.cor}22`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            {isReserva
              ? <IconShieldCheck size={20} stroke={2} color={meta.cor} />
              : <IconTarget size={20} stroke={2} color={meta.cor} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontFamily: "'Fraunces',Georgia,serif", fontSize: 18, fontWeight: 700,
              color: C.ink, margin: 0, letterSpacing: '-0.3px',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{meta.nome}</p>
            <p style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: C.muted,
              margin: '2px 0 0', fontWeight: 500,
            }}>
              {fmt(meta.valorAtualTotal)} de {fmt(meta.valorAlvo)} · {fmtPct(meta.progressoPct, 0)}
            </p>
          </div>
          <button onClick={onClose} aria-label="Fechar"
            style={{
              background: 'rgba(44,26,15,0.06)', border: 'none', borderRadius: 10,
              width: 34, height: 34, cursor: 'pointer', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <IconX size={16} stroke={2} color="#7A5C4F" />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <ActionRow
            onClick={onAporte}
            icon={<IconCurrencyReal size={18} stroke={2} color="#FFFFFF" />}
            iconBg="linear-gradient(135deg, #F1642E, #C4553B)"
            title="Aportar"
            subtitle="Adicionar dinheiro à meta"
          />
          <ActionRow
            onClick={onEdit}
            icon={<IconEdit size={18} stroke={2} color="#FFFFFF" />}
            iconBg="linear-gradient(135deg, #7A5C4F, #5C4339)"
            title="Editar"
            subtitle="Alvo, prazo, cor e mais"
          />
          {!isReserva && (
            <ActionRow
              onClick={onDelete}
              icon={<IconTrash size={18} stroke={2} color="#FFFFFF" />}
              iconBg="linear-gradient(135deg, #A8442B, #6E2918)"
              title="Excluir"
              subtitle="Desativa a meta (não apaga investimentos)"
            />
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

function ActionRow({ onClick, icon, iconBg, title, subtitle }: {
  onClick: () => void
  icon: React.ReactNode
  iconBg: string
  title: string
  subtitle: string
}) {
  return (
    <button onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        background: '#FFFFFF', border: '1px solid #EDE6DC',
        borderRadius: 14, padding: '12px 14px',
        cursor: 'pointer', textAlign: 'left', width: '100%',
        fontFamily: "'Plus Jakarta Sans',sans-serif",
      }}>
      <div style={{
        width: 38, height: 38, borderRadius: 11, background: iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        boxShadow: '0 4px 12px rgba(44,26,15,0.14)',
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13.5, fontWeight: 700, color: C.ink, margin: 0 }}>{title}</p>
        <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0', fontWeight: 500 }}>{subtitle}</p>
      </div>
      <IconChevronRight size={14} stroke={2.2} color={C.muted} />
    </button>
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
          {fmtPct(pct, 0)}
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

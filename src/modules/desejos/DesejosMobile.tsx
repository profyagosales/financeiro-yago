// ─── Desejos mobile — lista limpa com pills de prioridade ──────────
import { useState } from 'react'
import { motion } from 'framer-motion'
import { IconPlus, IconHeart, IconShoppingCart, IconChevronRight } from '@tabler/icons-react'
import { useDesejos, deleteDesejo } from '@/db/hooks/useDesejos'
import { PRIORIDADE_BY } from './constants'
import { fmt } from '@/lib/format'
import { DesejoForm } from './DesejoForm'
import { ComprarForm } from './ComprarForm'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { sounds, haptic } from '@/lib/sounds'
import type { Desejo } from '@/db/schema'

const C = {
  bgTop: '#FFE2C7', bgMid: '#FFF1DE', bgBottom: '#FFE9D7',
  ink: '#2C1A0F', inkSoft: '#5C4339', muted: '#9B7B6A',
  purple: '#2A1E3F', orange: '#C4553B', orangeBri: '#F1642E',
  green: '#1E7D5A',
  glass: 'rgba(255,255,255,0.65)', glassStrong: 'rgba(255,255,255,0.85)',
  glassBorder: 'rgba(255,255,255,0.7)',
  glassShadow: '0 1px 2px rgba(196,85,59,0.06), 0 8px 24px rgba(196,85,59,0.08)',
}
const PAGE = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.04 } } }
const ITEM = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 200, damping: 24 } } }

export function DesejosMobile() {
  const desejos = useDesejos()
  const abertos = desejos.filter(d => d.status === 'aberto')
  const comprados = desejos.filter(d => d.status === 'comprado')
  const totalEstimado = abertos.reduce((s, d) => s + (d.valorEstimado ?? 0), 0)
  const [creating, setCreating] = useState<Desejo['prioridade'] | null>(null)
  const [editing, setEditing] = useState<Desejo | null>(null)
  const [comprando, setComprando] = useState<Desejo | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Desejo | null>(null)

  return (
    <div style={{ position: 'relative', minHeight: '100dvh', width: '100%',
      background: `linear-gradient(180deg, ${C.bgTop} 0%, ${C.bgMid} 35%, ${C.bgBottom} 100%)` }}>
      <div aria-hidden style={{ position: 'absolute', right: -80, top: -120, width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle, rgba(241,100,46,0.18), transparent 65%)', filter: 'blur(20px)', pointerEvents: 'none' }} />
      <div aria-hidden style={{ position: 'absolute', left: -100, bottom: -80, width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,160,23,0.16), transparent 60%)', filter: 'blur(28px)', pointerEvents: 'none' }} />

      <motion.div variants={PAGE} initial="hidden" animate="show"
        style={{ position: 'relative', padding: '16px 18px', paddingTop: 'calc(20px + env(safe-area-inset-top))', paddingBottom: 'calc(120px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 16 }}>

        <motion.header variants={ITEM} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 30, fontWeight: 700, color: C.ink, letterSpacing: '-1px', margin: 0, lineHeight: 1 }}>Desejos</h1>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11.5, color: C.muted, margin: '4px 0 0', fontWeight: 500 }}>
              {abertos.length === 0 && comprados.length === 0 ? 'Sua wishlist está vazia' : `${abertos.length} em aberto${comprados.length ? ` · ${comprados.length} comprados` : ''}`}
            </p>
          </div>
          <button onClick={() => setCreating('media')}
            style={{ width: 44, height: 44, borderRadius: 14, background: `linear-gradient(135deg, ${C.orangeBri}, ${C.orange})`, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 8px 22px rgba(196,85,59,0.42)' }}>
            <IconPlus size={20} stroke={2.6} color="#FFFFFF" />
          </button>
        </motion.header>

        {totalEstimado > 0 && (
          <motion.section variants={ITEM} style={{ background: C.glassStrong, backdropFilter: 'blur(20px)', border: `1px solid ${C.glassBorder}`, borderRadius: 22, padding: '18px 20px', boxShadow: C.glassShadow }}>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10.5, fontWeight: 700, color: C.muted, letterSpacing: '.16em', textTransform: 'uppercase', margin: 0 }}>Total estimado em aberto</p>
            <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 'clamp(28px, 9vw, 38px)', fontWeight: 700, color: C.ink, letterSpacing: '-1px', lineHeight: 1, margin: '6px 0 0', fontVariantNumeric: 'tabular-nums' }}>{fmt(totalEstimado)}</p>
          </motion.section>
        )}

        {abertos.length === 0 && comprados.length === 0 ? (
          <EmptyDesejos onAdd={() => setCreating('media')} />
        ) : (
          <>
            {abertos.length > 0 && (
              <motion.section variants={ITEM}>
                <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: C.inkSoft, letterSpacing: '.16em', textTransform: 'uppercase', margin: '0 0 8px', padding: '0 4px' }}>Em aberto</h2>
                <div style={{ background: C.glass, backdropFilter: 'blur(16px)', border: `1px solid ${C.glassBorder}`, borderRadius: 18, padding: '4px 14px', boxShadow: C.glassShadow }}>
                  {abertos.map((d, i) => (
                    <DesejoRow key={d.id} desejo={d} divider={i > 0} onClick={() => setEditing(d)} />
                  ))}
                </div>
              </motion.section>
            )}
            {comprados.length > 0 && (
              <motion.section variants={ITEM}>
                <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: C.green, letterSpacing: '.16em', textTransform: 'uppercase', margin: '0 0 8px', padding: '0 4px' }}>Comprados · {comprados.length}</h2>
                <div style={{ background: C.glass, backdropFilter: 'blur(16px)', border: `1px solid ${C.glassBorder}`, borderRadius: 18, padding: '4px 14px', boxShadow: C.glassShadow, opacity: 0.8 }}>
                  {comprados.slice(0, 6).map((d, i) => (
                    <DesejoRow key={d.id} desejo={d} divider={i > 0} comprado onClick={() => setEditing(d)} />
                  ))}
                </div>
              </motion.section>
            )}
          </>
        )}
      </motion.div>

      {(creating || editing) && (
        <DesejoForm
          desejo={editing}
          presetPrioridade={creating ?? undefined}
          onClose={() => { setCreating(null); setEditing(null) }}
          onDelete={editing ? () => setConfirmDelete(editing) : undefined}
          onComprar={editing ? () => { setComprando(editing); setEditing(null) } : undefined}
        />
      )}

      {comprando && (
        <ComprarForm
          desejo={comprando}
          onClose={() => setComprando(null)}
        />
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title={`Excluir "${confirmDelete?.nome ?? 'desejo'}"?`}
        body={confirmDelete?.transacaoId
          ? 'O desejo será removido. A transação vinculada será mantida no histórico.'
          : 'O desejo será removido permanentemente da sua lista.'}
        confirmLabel="Excluir"
        destructive
        onConfirm={async () => {
          if (confirmDelete?.id !== undefined) {
            await deleteDesejo(confirmDelete.id)
            sounds.success(); haptic('heavy')
          }
          setConfirmDelete(null)
          setEditing(null)
        }}
        onClose={() => setConfirmDelete(null)}
      />
    </div>
  )
}

function DesejoRow({ desejo, divider, comprado, onClick }: { desejo: Desejo; divider: boolean; comprado?: boolean; onClick: () => void }) {
  const prio = PRIORIDADE_BY.get(desejo.prioridade)!
  const PrioIcon = prio.Icon
  return (
    <button onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 0', width: '100%',
        background: 'transparent', border: 'none', cursor: 'pointer',
        textAlign: 'left',
        borderTop: divider ? '1px dashed rgba(44,26,15,0.08)' : 'none',
        fontFamily: "'Plus Jakarta Sans',sans-serif",
      }}>
      <div style={{ width: 36, height: 36, borderRadius: 11, background: prio.corLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {comprado
          ? <IconShoppingCart size={16} stroke={2} color={C.green} />
          : <PrioIcon size={16} stroke={2} color={prio.cor} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: C.ink, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: comprado ? 'line-through' : 'none', textDecorationColor: 'rgba(44,26,15,0.3)' }}>{desejo.nome}</p>
        <p style={{ fontSize: 10.5, color: C.muted, margin: 0, fontWeight: 500 }}>{prio.label}</p>
      </div>
      {desejo.valorEstimado && desejo.valorEstimado > 0 && (
        <span style={{ fontSize: 13, fontWeight: 700, color: C.ink, whiteSpace: 'nowrap', letterSpacing: '-0.2px' }}>{fmt(desejo.valorEstimado)}</span>
      )}
      <IconChevronRight size={14} stroke={2.2} color={C.muted} />
    </button>
  )
}

function EmptyDesejos({ onAdd }: { onAdd: () => void }) {
  return (
    <motion.section variants={ITEM} style={{ background: C.glass, backdropFilter: 'blur(16px)', border: `1px solid ${C.glassBorder}`, borderRadius: 20, padding: '32px 24px', textAlign: 'center', boxShadow: C.glassShadow, marginTop: 8 }}>
      <div style={{ width: 64, height: 64, borderRadius: 18, margin: '0 auto 14px', background: `linear-gradient(135deg, ${C.orange}, ${C.orangeBri})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 22px rgba(196,85,59,0.42)' }}>
        <IconHeart size={28} stroke={1.8} color="#FFFFFF" />
      </div>
      <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: C.ink, margin: 0, letterSpacing: '-0.5px' }}>Sua wishlist está vazia</p>
      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12.5, color: C.muted, margin: '8px 0 18px', fontWeight: 500, lineHeight: 1.5 }}>Tudo que você quer comprar — eletrônico, viagem, presente. Organize por prioridade.</p>
      <button onClick={onAdd} style={{ padding: '12px 24px', background: `linear-gradient(135deg, ${C.orangeBri}, ${C.orange})`, color: '#FFFFFF', border: 'none', borderRadius: 12, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, boxShadow: '0 8px 22px rgba(196,85,59,0.42)' }}>
        Adicionar desejo
      </button>
    </motion.section>
  )
}

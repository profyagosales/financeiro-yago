// ─── Contas mobile — identidade peach + lista de contas ────────────
import { useState } from 'react'
import { motion } from 'framer-motion'
import { IconPlus, IconBuildingBank, IconWallet, IconChevronRight } from '@tabler/icons-react'
import { useContas, useSaldoTotal, deleteConta } from '@/db/hooks/useContas'
import { fmt } from '@/lib/format'
import { ContaForm } from './ContaForm'
import { StackScreen } from '@/components/layout/StackScreen'
import { sounds, haptic } from '@/lib/sounds'
import type { Conta } from '@/db/schema'

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

export function ContasMobile() {
  const contas = useContas()
  const saldoTotal = useSaldoTotal()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Conta | null>(null)

  return (
    <div style={{
      position: 'relative', minHeight: '100dvh', width: '100%',
      background: `linear-gradient(180deg, ${C.bgTop} 0%, ${C.bgMid} 35%, ${C.bgBottom} 100%)`,
    }}>
      <div aria-hidden style={{ position: 'absolute', right: -80, top: -120, width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle, rgba(241,100,46,0.18), transparent 65%)', filter: 'blur(20px)', pointerEvents: 'none' }} />
      <div aria-hidden style={{ position: 'absolute', left: -100, bottom: -80, width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(61,126,181,0.16), transparent 60%)', filter: 'blur(28px)', pointerEvents: 'none' }} />

      <motion.div variants={PAGE} initial="hidden" animate="show"
        style={{
          position: 'relative', padding: '16px 18px',
          paddingTop: 'calc(20px + env(safe-area-inset-top))',
          paddingBottom: 'calc(120px + env(safe-area-inset-bottom))',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>

        <motion.header variants={ITEM}
          style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 30, fontWeight: 700, color: C.ink, letterSpacing: '-1px', margin: 0, lineHeight: 1 }}>Contas</h1>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11.5, color: C.muted, margin: '4px 0 0', fontWeight: 500 }}>
              {contas.length === 0 ? 'Nenhuma cadastrada' : `${contas.length} ${contas.length === 1 ? 'conta ativa' : 'contas ativas'}`}
            </p>
          </div>
          <button onClick={() => { setEditing(null); setFormOpen(true) }}
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

        {/* Saldo total */}
        {contas.length > 0 && (
          <motion.section variants={ITEM}
            style={{
              background: C.glassStrong, backdropFilter: 'blur(20px)',
              border: `1px solid ${C.glassBorder}`, borderRadius: 22,
              padding: '18px 20px', boxShadow: C.glassShadow,
            }}>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10.5, fontWeight: 700, color: C.muted, letterSpacing: '.16em', textTransform: 'uppercase', margin: 0 }}>Saldo total</p>
            <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 'clamp(34px, 10vw, 44px)', fontWeight: 700, color: C.ink, letterSpacing: '-1.2px', lineHeight: 1, margin: '6px 0 0', fontVariantNumeric: 'tabular-nums' }}>{fmt(saldoTotal)}</p>
          </motion.section>
        )}

        {/* Lista de contas */}
        {contas.length === 0
          ? <ContasEmptyState onAdd={() => { setEditing(null); setFormOpen(true) }} />
          : (
            <motion.section variants={ITEM}>
              <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: C.inkSoft, letterSpacing: '.16em', textTransform: 'uppercase', margin: '0 0 8px', padding: '0 4px' }}>Suas contas</h2>
              <div style={{
                background: C.glass, backdropFilter: 'blur(16px)',
                border: `1px solid ${C.glassBorder}`, borderRadius: 18,
                padding: '4px 14px', boxShadow: C.glassShadow,
              }}>
                {contas.map((c, i) => (
                  <button key={c.id}
                    onClick={() => { setEditing(c); setFormOpen(true); haptic('light') }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '14px 0', width: '100%',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      textAlign: 'left',
                      borderTop: i > 0 ? '1px dashed rgba(44,26,15,0.08)' : 'none',
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                    }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 12,
                      background: `${c.cor}1f`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <IconBuildingBank size={18} stroke={2} color={c.cor} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: C.ink, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nome}</p>
                      <p style={{ fontSize: 11, color: C.muted, margin: 0, fontWeight: 500, textTransform: 'capitalize' }}>{c.tipo}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 15, fontWeight: 700, color: c.saldoAtual >= 0 ? C.ink : C.orange, letterSpacing: '-0.2px', margin: 0, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{fmt(c.saldoAtual)}</p>
                    </div>
                    <IconChevronRight size={14} stroke={2.2} color={C.muted} />
                  </button>
                ))}
              </div>
            </motion.section>
          )
        }
      </motion.div>

      <ContaForm
        open={formOpen}
        conta={editing}
        onClose={() => { setFormOpen(false); setEditing(null) }}
        onSave={() => { setFormOpen(false); setEditing(null) }}
      />
    </div>
  )
}

function ContasEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <motion.section variants={ITEM}
      style={{
        background: C.glass, backdropFilter: 'blur(16px)',
        border: `1px solid ${C.glassBorder}`, borderRadius: 20,
        padding: '32px 24px', textAlign: 'center',
        boxShadow: C.glassShadow, marginTop: 8,
      }}>
      <div style={{
        width: 64, height: 64, borderRadius: 18, margin: '0 auto 14px',
        background: `linear-gradient(135deg, #3D7EB5, #2E6493)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 22px rgba(61,126,181,0.42)',
      }}>
        <IconWallet size={28} stroke={1.8} color="#FFFFFF" />
      </div>
      <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: C.ink, margin: 0, letterSpacing: '-0.5px' }}>Adicione sua primeira conta</p>
      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12.5, color: C.muted, margin: '8px 0 18px', fontWeight: 500, lineHeight: 1.5 }}>Carteira, conta corrente, poupança — toda movimentação fica vinculada a uma conta.</p>
      <button onClick={onAdd}
        style={{
          padding: '12px 24px',
          background: `linear-gradient(135deg, ${C.orangeBri}, ${C.orange})`,
          color: '#FFFFFF', border: 'none', borderRadius: 12, cursor: 'pointer',
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          fontSize: 13, fontWeight: 700,
          boxShadow: '0 8px 22px rgba(196,85,59,0.42)',
        }}>
        Adicionar conta
      </button>
    </motion.section>
  )
}

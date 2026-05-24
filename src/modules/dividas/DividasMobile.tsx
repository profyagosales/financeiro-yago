// ─── Dívidas mobile — identidade peach + lista enxuta ──────────────
import { useState } from 'react'
import { motion } from 'framer-motion'
import { IconPlus, IconCreditCardOff, IconChevronRight, IconCircleCheck } from '@tabler/icons-react'
import { useDividasComputed, deleteDivida } from '@/db/hooks/useDividas'
import { fmt } from '@/lib/format'
import { DividaForm } from './DividaForm'
import type { Divida } from '@/db/schema'

const C = {
  bgTop: '#FFE2C7', bgMid: '#FFF1DE', bgBottom: '#FFE9D7',
  ink: '#2C1A0F', inkSoft: '#5C4339', muted: '#9B7B6A',
  orange: '#C4553B', orangeBri: '#F1642E', green: '#1E7D5A',
  glass: 'rgba(255,255,255,0.65)', glassStrong: 'rgba(255,255,255,0.85)',
  glassBorder: 'rgba(255,255,255,0.7)',
  glassShadow: '0 1px 2px rgba(196,85,59,0.06), 0 8px 24px rgba(196,85,59,0.08)',
}
const PAGE = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.04 } } }
const ITEM = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 200, damping: 24 } } }

export function DividasMobile() {
  const dividas = useDividasComputed()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Divida | null>(null)

  const ativas = dividas.filter(d => !d.quitada)
  const quitadas = dividas.filter(d => d.quitada)
  const totalDevido = ativas.reduce((s, d) => s + d.saldoDevedor, 0)
  const parcelaMensal = ativas.reduce((s, d) => s + d.valorParcela, 0)

  return (
    <div style={{ position: 'relative', minHeight: '100dvh', width: '100%',
      background: `linear-gradient(180deg, ${C.bgTop} 0%, ${C.bgMid} 35%, ${C.bgBottom} 100%)` }}>
      <div aria-hidden style={{ position: 'absolute', right: -80, top: -120, width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle, rgba(196,85,59,0.18), transparent 65%)', filter: 'blur(20px)', pointerEvents: 'none' }} />
      <div aria-hidden style={{ position: 'absolute', left: -100, bottom: -80, width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,160,23,0.16), transparent 60%)', filter: 'blur(28px)', pointerEvents: 'none' }} />

      <motion.div variants={PAGE} initial="hidden" animate="show"
        style={{ position: 'relative', padding: '16px 18px', paddingTop: 'calc(20px + env(safe-area-inset-top))', paddingBottom: 'calc(120px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 16 }}>

        <motion.header variants={ITEM} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 30, fontWeight: 700, color: C.ink, letterSpacing: '-1px', margin: 0, lineHeight: 1 }}>Dívidas</h1>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11.5, color: C.muted, margin: '4px 0 0', fontWeight: 500 }}>
              {ativas.length === 0 && quitadas.length === 0 ? 'Nenhuma cadastrada' : `${ativas.length} ativa${ativas.length === 1 ? '' : 's'}${quitadas.length ? ` · ${quitadas.length} quitada${quitadas.length === 1 ? '' : 's'}` : ''}`}
            </p>
          </div>
          <button onClick={() => { setEditing(null); setFormOpen(true) }}
            style={{ width: 44, height: 44, borderRadius: 14, background: `linear-gradient(135deg, ${C.orangeBri}, ${C.orange})`, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 8px 22px rgba(196,85,59,0.42)' }}>
            <IconPlus size={20} stroke={2.6} color="#FFFFFF" />
          </button>
        </motion.header>

        {ativas.length > 0 && (
          <motion.section variants={ITEM} style={{ background: C.glassStrong, backdropFilter: 'blur(20px)', border: `1px solid ${C.glassBorder}`, borderRadius: 22, padding: '18px 20px', boxShadow: C.glassShadow }}>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10.5, fontWeight: 700, color: C.muted, letterSpacing: '.16em', textTransform: 'uppercase', margin: 0 }}>Saldo devedor total</p>
            <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 'clamp(34px, 10vw, 44px)', fontWeight: 700, color: C.orange, letterSpacing: '-1.2px', lineHeight: 1, margin: '6px 0 0', fontVariantNumeric: 'tabular-nums' }}>{fmt(totalDevido)}</p>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: C.inkSoft, margin: '10px 0 0', fontWeight: 500 }}>
              Comprometimento mensal: <strong style={{ color: C.ink, fontWeight: 800 }}>{fmt(parcelaMensal)}</strong>
            </p>
          </motion.section>
        )}

        {ativas.length === 0 && quitadas.length === 0 ? (
          <EmptyStateDividas onAdd={() => { setEditing(null); setFormOpen(true) }} />
        ) : ativas.length === 0 ? (
          <motion.section variants={ITEM} style={{ background: 'rgba(58,133,128,0.1)', border: '1px solid rgba(58,133,128,0.3)', borderRadius: 20, padding: '24px 18px', textAlign: 'center' }}>
            <IconCircleCheck size={36} stroke={1.8} color={C.green} style={{ marginBottom: 8 }} />
            <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 18, fontWeight: 700, color: C.green, margin: 0, letterSpacing: '-0.4px' }}>Sem dívidas ativas!</p>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12.5, color: C.inkSoft, margin: '6px 0 0', fontWeight: 500 }}>{quitadas.length} {quitadas.length === 1 ? 'dívida quitada' : 'dívidas quitadas'} no histórico</p>
          </motion.section>
        ) : null}

        {ativas.length > 0 && (
          <motion.section variants={ITEM}>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: C.inkSoft, letterSpacing: '.16em', textTransform: 'uppercase', margin: '0 0 8px', padding: '0 4px' }}>Ativas</h2>
            <div style={{ background: C.glass, backdropFilter: 'blur(16px)', border: `1px solid ${C.glassBorder}`, borderRadius: 18, padding: '4px 14px', boxShadow: C.glassShadow }}>
              {ativas.map((d, i) => (
                <button key={d.id} onClick={() => { setEditing(d); setFormOpen(true) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '14px 0', width: '100%',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    textAlign: 'left',
                    borderTop: i > 0 ? '1px dashed rgba(44,26,15,0.08)' : 'none',
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                  }}>
                  <div style={{ width: 4, height: 40, borderRadius: 3, background: d.cor, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13.5, fontWeight: 700, color: C.ink, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.nome}</p>
                    <p style={{ fontSize: 10.5, color: C.muted, margin: 0, fontWeight: 500 }}>
                      {d.tipo}{d.jurosAnual ? ` · ${(d.jurosAnual * 100).toFixed(2)}% a.a.` : ''}
                      {d.parcelasRestantes > 0 && ` · ${d.parcelasRestantes} parcelas`}
                    </p>
                    <div style={{ marginTop: 6, position: 'relative', height: 4, background: '#F5EEE3', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${d.progresso}%`, background: `linear-gradient(90deg, ${C.green}, #155F45)`, borderRadius: 999 }} />
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: C.orange, letterSpacing: '-0.2px', margin: 0, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{fmt(d.saldoDevedor)}</p>
                    <p style={{ fontSize: 10.5, color: C.muted, margin: '1px 0 0', fontWeight: 500 }}>{d.progresso.toFixed(0)}% pago</p>
                  </div>
                </button>
              ))}
            </div>
          </motion.section>
        )}

        {quitadas.length > 0 && (
          <motion.section variants={ITEM}>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: C.green, letterSpacing: '.16em', textTransform: 'uppercase', margin: '0 0 8px', padding: '0 4px' }}>Quitadas · {quitadas.length}</h2>
            <div style={{ background: C.glass, backdropFilter: 'blur(16px)', border: `1px solid ${C.glassBorder}`, borderRadius: 18, padding: '4px 14px', boxShadow: C.glassShadow, opacity: 0.78 }}>
              {quitadas.map((d, i) => (
                <button key={d.id} onClick={() => { setEditing(d); setFormOpen(true) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', borderTop: i > 0 ? '1px dashed rgba(44,26,15,0.06)' : 'none', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                  <IconCircleCheck size={16} stroke={2.2} color={C.green} />
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: C.inkSoft, flex: 1, textDecoration: 'line-through', textDecorationColor: 'rgba(44,26,15,0.3)' }}>{d.nome}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>{fmt(d.valorTotal)}</span>
                </button>
              ))}
            </div>
          </motion.section>
        )}
      </motion.div>

      {formOpen && (
        <DividaForm
          divida={editing}
          onClose={() => { setFormOpen(false); setEditing(null) }}
        />
      )}
    </div>
  )
}

function EmptyStateDividas({ onAdd }: { onAdd: () => void }) {
  return (
    <motion.section variants={ITEM} style={{ background: C.glass, backdropFilter: 'blur(16px)', border: `1px solid ${C.glassBorder}`, borderRadius: 20, padding: '32px 24px', textAlign: 'center', boxShadow: C.glassShadow, marginTop: 8 }}>
      <div style={{ width: 64, height: 64, borderRadius: 18, margin: '0 auto 14px', background: `linear-gradient(135deg, ${C.orange}, #A8442B)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 22px rgba(196,85,59,0.42)' }}>
        <IconCreditCardOff size={28} stroke={1.8} color="#FFFFFF" />
      </div>
      <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: C.ink, margin: 0, letterSpacing: '-0.5px' }}>Você está sem dívidas</p>
      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12.5, color: C.muted, margin: '8px 0 18px', fontWeight: 500, lineHeight: 1.5 }}>Quando tiver empréstimo ou financiamento, adicione aqui pra acompanhar quitação e juros.</p>
      <button onClick={onAdd} style={{ padding: '12px 24px', background: `linear-gradient(135deg, ${C.orangeBri}, ${C.orange})`, color: '#FFFFFF', border: 'none', borderRadius: 12, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, boxShadow: '0 8px 22px rgba(196,85,59,0.42)' }}>
        Adicionar dívida
      </button>
    </motion.section>
  )
}

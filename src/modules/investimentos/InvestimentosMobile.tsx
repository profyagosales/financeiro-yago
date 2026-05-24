// ─── Investimentos mobile — identidade peach + lista simplificada ──
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  IconPlus, IconChartLine, IconTrendingUp, IconTrendingDown, IconChevronRight,
  IconShoppingCart, IconShoppingBag, IconCoins, IconEdit, IconX,
} from '@tabler/icons-react'
import { useInvestimentos, useTotalInvestimentos, isRendaVariavel, aceitaProventos } from '@/db/hooks/useInvestimentos'
import { fmt } from '@/lib/format'
import { InvestimentoForm } from './InvestimentoForm'
import { AportesModal } from './AportesModal'
import { ProventosModal } from './ProventosModal'
import { VendasModal } from './VendasModal'
import type { Investimento } from '@/db/schema'

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

export function InvestimentosMobile() {
  const invs = useInvestimentos()
  const { total, aplicado } = useTotalInvestimentos()
  const rendimento = total - aplicado
  const pct = aplicado > 0 ? (rendimento / aplicado) * 100 : 0
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Investimento | null>(null)
  // Action sheet ao tocar num investimento
  const [actionFor, setActionFor] = useState<Investimento | null>(null)
  // Modais de operação (espelham o desktop)
  const [aportesFor, setAportesFor] = useState<Investimento | null>(null)
  const [proventosFor, setProventosFor] = useState<Investimento | null>(null)
  const [vendasFor, setVendasFor] = useState<Investimento | null>(null)

  // Ordena por rentabilidade
  const ordenados = [...invs].map(i => ({
    ...i,
    ganho: i.valorAtual - i.valorAplicado,
    pctRend: i.valorAplicado > 0 ? ((i.valorAtual - i.valorAplicado) / i.valorAplicado) * 100 : 0,
  })).sort((a, b) => b.pctRend - a.pctRend)

  return (
    <div style={{
      position: 'relative', minHeight: '100dvh', width: '100%',
      background: `linear-gradient(180deg, ${C.bgTop} 0%, ${C.bgMid} 35%, ${C.bgBottom} 100%)`,
    }}>
      <div aria-hidden style={{ position: 'absolute', right: -80, top: -120, width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle, rgba(80,78,118,0.16), transparent 65%)', filter: 'blur(20px)', pointerEvents: 'none' }} />
      <div aria-hidden style={{ position: 'absolute', left: -100, bottom: -80, width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,160,23,0.16), transparent 60%)', filter: 'blur(28px)', pointerEvents: 'none' }} />

      <motion.div variants={PAGE} initial="hidden" animate="show"
        style={{
          position: 'relative', padding: '16px 18px',
          paddingTop: 'calc(20px + env(safe-area-inset-top))',
          paddingBottom: 'calc(120px + env(safe-area-inset-bottom))',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>

        <motion.header variants={ITEM} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 30, fontWeight: 700, color: C.ink, letterSpacing: '-1px', margin: 0, lineHeight: 1 }}>Investimentos</h1>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11.5, color: C.muted, margin: '4px 0 0', fontWeight: 500 }}>{invs.length} {invs.length === 1 ? 'ativo' : 'ativos'}</p>
          </div>
          <button onClick={() => { setEditing(null); setFormOpen(true) }}
            style={{ width: 44, height: 44, borderRadius: 14, background: `linear-gradient(135deg, ${C.orangeBri}, ${C.orange})`, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 8px 22px rgba(196,85,59,0.42)' }}>
            <IconPlus size={20} stroke={2.6} color="#FFFFFF" />
          </button>
        </motion.header>

        {invs.length > 0 && (
          <motion.section variants={ITEM}
            style={{ background: C.glassStrong, backdropFilter: 'blur(20px)', border: `1px solid ${C.glassBorder}`, borderRadius: 22, padding: '18px 20px', boxShadow: C.glassShadow }}>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10.5, fontWeight: 700, color: C.muted, letterSpacing: '.16em', textTransform: 'uppercase', margin: 0 }}>Patrimônio investido</p>
            <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 'clamp(34px, 10vw, 44px)', fontWeight: 700, color: C.ink, letterSpacing: '-1.2px', lineHeight: 1, margin: '6px 0 0', fontVariantNumeric: 'tabular-nums' }}>{fmt(total)}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: C.inkSoft, fontWeight: 600 }}>{fmt(aplicado)} aplicado</span>
              {pct !== 0 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '3px 9px', borderRadius: 999, background: pct > 0 ? 'rgba(30,125,90,0.12)' : 'rgba(196,85,59,0.12)', color: pct > 0 ? C.green : C.orange, fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700 }}>
                  {pct > 0 ? <IconTrendingUp size={11} stroke={2.4} /> : <IconTrendingDown size={11} stroke={2.4} />}
                  {pct > 0 ? '+' : ''}{pct.toFixed(2)}% ({pct > 0 ? '+' : ''}{fmt(rendimento)})
                </span>
              )}
            </div>
          </motion.section>
        )}

        {invs.length === 0
          ? <EmptyState onAdd={() => { setEditing(null); setFormOpen(true) }} />
          : (
            <motion.section variants={ITEM}>
              <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: C.inkSoft, letterSpacing: '.16em', textTransform: 'uppercase', margin: '0 0 8px', padding: '0 4px' }}>Sua carteira</h2>
              <div style={{ background: C.glass, backdropFilter: 'blur(16px)', border: `1px solid ${C.glassBorder}`, borderRadius: 18, padding: '4px 14px', boxShadow: C.glassShadow }}>
                {ordenados.map((inv, i) => (
                  <button key={inv.id} onClick={() => setActionFor(inv)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 0', width: '100%',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      textAlign: 'left',
                      borderTop: i > 0 ? '1px dashed rgba(44,26,15,0.08)' : 'none',
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                    }}>
                    <div style={{ width: 4, height: 36, borderRadius: 3, background: inv.cor, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13.5, fontWeight: 700, color: C.ink, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.nome}</p>
                      <p style={{ fontSize: 10.5, color: C.muted, margin: 0, fontWeight: 500, letterSpacing: '.04em' }}>{inv.tipo}{inv.instituicao ? ` · ${inv.instituicao}` : ''}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 13.5, fontWeight: 700, color: C.ink, margin: 0, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {inv.moeda === 'USD'
                          ? `US$ ${inv.valorAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                          : fmt(inv.valorAtual)}
                      </p>
                      <p style={{ fontSize: 10.5, fontWeight: 700, color: inv.pctRend >= 0 ? C.green : C.orange, margin: '1px 0 0' }}>
                        {inv.pctRend >= 0 ? '+' : ''}{inv.pctRend.toFixed(2)}%
                      </p>
                    </div>
                    <IconChevronRight size={14} stroke={2.2} color={C.muted} />
                  </button>
                ))}
              </div>
            </motion.section>
          )
        }
      </motion.div>

      {formOpen && (
        <InvestimentoForm
          invest={editing}
          onClose={() => { setFormOpen(false); setEditing(null) }}
        />
      )}

      <AnimatePresence>
        {actionFor && (
          <InvestimentoActionSheet
            invest={actionFor}
            onClose={() => setActionFor(null)}
            onEdit={() => { setEditing(actionFor); setActionFor(null); setFormOpen(true) }}
            onAportes={() => { setAportesFor(actionFor); setActionFor(null) }}
            onProventos={() => { setProventosFor(actionFor); setActionFor(null) }}
            onVendas={() => { setVendasFor(actionFor); setActionFor(null) }}
          />
        )}
      </AnimatePresence>

      {aportesFor && (
        <AportesModal invest={aportesFor} onClose={() => setAportesFor(null)} />
      )}
      {proventosFor && (
        <ProventosModal invest={proventosFor} onClose={() => setProventosFor(null)} />
      )}
      {vendasFor && (
        <VendasModal invest={vendasFor} onClose={() => setVendasFor(null)} />
      )}
    </div>
  )
}

// ─── Action sheet (bottom sheet) que aparece ao tocar num investimento ───
function InvestimentoActionSheet({
  invest, onClose, onEdit, onAportes, onProventos, onVendas,
}: {
  invest: Investimento
  onClose: () => void
  onEdit: () => void
  onAportes: () => void
  onProventos: () => void
  onVendas: () => void
}) {
  const isVar = isRendaVariavel(invest.tipo)
  const showProventos = aceitaProventos(invest.tipo) || invest.tipo === 'Cripto'
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
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(44,26,15,0.18)' }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 4px 14px' }}>
          <div style={{ width: 4, height: 36, borderRadius: 3, background: invest.cor, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontFamily: "'Fraunces',Georgia,serif", fontSize: 18, fontWeight: 700,
              color: '#2C1A0F', margin: 0, letterSpacing: '-0.3px',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{invest.nome}</p>
            <p style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#7A5C4F',
              margin: '2px 0 0', fontWeight: 500, letterSpacing: '.04em',
            }}>{invest.tipo}{invest.instituicao ? ` · ${invest.instituicao}` : ''}</p>
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

        {/* Ações */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <ActionRow
            onClick={onAportes}
            icon={<IconShoppingCart size={18} stroke={2} color="#FFFFFF" />}
            iconBg="linear-gradient(135deg, #504E76, #3A3860)"
            title={isVar ? 'Aportes' : 'Aplicações'}
            subtitle={isVar ? 'Registrar compras / ver histórico' : 'Registrar novos aportes'}
          />
          {showProventos && (
            <ActionRow
              onClick={onProventos}
              icon={<IconCoins size={18} stroke={2} color="#FFFFFF" />}
              iconBg="linear-gradient(135deg, #3A8580, #1E7D5A)"
              title="Proventos"
              subtitle="Dividendos, JCP, aluguéis, rendimentos"
            />
          )}
          <ActionRow
            onClick={onVendas}
            icon={<IconShoppingBag size={18} stroke={2} color="#FFFFFF" />}
            iconBg="linear-gradient(135deg, #A8442B, #6E2918)"
            title={isVar ? 'Vendas' : 'Resgates'}
            subtitle={isVar ? 'Registrar venda e ver lucro/prejuízo' : 'Registrar resgate e ver impacto'}
          />
          <ActionRow
            onClick={onEdit}
            icon={<IconEdit size={18} stroke={2} color="#FFFFFF" />}
            iconBg="linear-gradient(135deg, #7A5C4F, #5C4339)"
            title="Editar"
            subtitle="Nome, instituição, vínculos e mais"
          />
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
        <p style={{ fontSize: 13.5, fontWeight: 700, color: '#2C1A0F', margin: 0 }}>{title}</p>
        <p style={{ fontSize: 11, color: '#7A5C4F', margin: '2px 0 0', fontWeight: 500 }}>{subtitle}</p>
      </div>
      <IconChevronRight size={14} stroke={2.2} color="#9B7B6A" />
    </button>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <motion.section variants={ITEM} style={{ background: C.glass, backdropFilter: 'blur(16px)', border: `1px solid ${C.glassBorder}`, borderRadius: 20, padding: '32px 24px', textAlign: 'center', boxShadow: C.glassShadow, marginTop: 8 }}>
      <div style={{ width: 64, height: 64, borderRadius: 18, margin: '0 auto 14px', background: `linear-gradient(135deg, ${C.purple}, #504E76)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 22px rgba(42,30,63,0.42)' }}>
        <IconChartLine size={28} stroke={1.8} color="#FFFFFF" />
      </div>
      <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: C.ink, margin: 0, letterSpacing: '-0.5px' }}>Comece a investir</p>
      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12.5, color: C.muted, margin: '8px 0 18px', fontWeight: 500, lineHeight: 1.5 }}>Renda fixa, ações, FIIs, cripto — acompanhe sua carteira inteira em um lugar só.</p>
      <button onClick={onAdd}
        style={{ padding: '12px 24px', background: `linear-gradient(135deg, ${C.orangeBri}, ${C.orange})`, color: '#FFFFFF', border: 'none', borderRadius: 12, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, boxShadow: '0 8px 22px rgba(196,85,59,0.42)' }}>
        Adicionar investimento
      </button>
    </motion.section>
  )
}

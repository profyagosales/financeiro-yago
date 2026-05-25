// ─── Relatórios mobile — versão enxuta ─────────────────────────────
// Não tenta replicar as 12 seções do desktop. Mostra os essenciais:
// score de saúde + KPIs + top categorias + insights chips.

import { motion } from 'framer-motion'
import {
  IconTarget, IconArrowUpRight, IconArrowDownRight,
  IconCoin, IconScale, IconBulb,
} from '@tabler/icons-react'
import { useRelatoriosData } from './lib/useRelatoriosData'
import { corStatus, labelStatus } from '@/modules/dashboard/lib/calculos'
import { fmt, fmtPct } from '@/lib/format'
import { usePeriodo, type PeriodoPreset } from './lib/usePeriodo'

const C = {
  bgTop: '#FFE2C7', bgMid: '#FFF1DE', bgBottom: '#FFE9D7',
  ink: '#2C1A0F', inkSoft: '#5C4339', muted: '#9B7B6A',
  purple: '#2A1E3F', orange: '#C4553B', green: '#1E7D5A', gold: '#D4A017',
  glass: 'rgba(255,255,255,0.65)', glassStrong: 'rgba(255,255,255,0.85)',
  glassBorder: 'rgba(255,255,255,0.7)',
  glassShadow: '0 1px 2px rgba(196,85,59,0.06), 0 8px 24px rgba(196,85,59,0.08)',
}
const PAGE = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.04 } } }
const ITEM = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 200, damping: 24 } } }

const PRESETS: Array<{ key: PeriodoPreset; label: string }> = [
  { key: 'mes', label: 'Mês' },
  { key: '3m', label: '3M' },
  { key: '6m', label: '6M' },
  { key: '12m', label: '12M' },
  { key: 'ytd', label: 'Ano' },
]

export function RelatoriosMobile() {
  const d = useRelatoriosData()
  const periodo = usePeriodo()
  const cor = corStatus(d.status)
  const top3Cats = d.categoriasAgr.slice(0, 5)
  const insightsTop = d.insights.slice(0, 4)

  return (
    <div style={{ position: 'relative', minHeight: '100dvh', width: '100%',
      background: `linear-gradient(180deg, ${C.bgTop} 0%, ${C.bgMid} 35%, ${C.bgBottom} 100%)` }}>
      <div aria-hidden style={{ position: 'absolute', right: -80, top: -120, width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle, rgba(241,100,46,0.18), transparent 65%)', filter: 'blur(20px)', pointerEvents: 'none' }} />
      <div aria-hidden style={{ position: 'absolute', left: -100, bottom: -80, width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,92,191,0.14), transparent 60%)', filter: 'blur(28px)', pointerEvents: 'none' }} />

      <motion.div variants={PAGE} initial="hidden" animate="show"
        style={{ position: 'relative', padding: '16px 18px', paddingTop: 'calc(20px + env(safe-area-inset-top))', paddingBottom: 'calc(120px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 16 }}>

        <motion.header variants={ITEM}>
          <h1 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 30, fontWeight: 700, color: C.ink, letterSpacing: '-1px', margin: 0, lineHeight: 1 }}>Análise</h1>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11.5, color: C.muted, margin: '4px 0 0', fontWeight: 500, textTransform: 'capitalize' }}>
            {d.intervalo.label}
          </p>
        </motion.header>

        {/* Preset período */}
        <motion.div variants={ITEM}
          style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' }}
          className="presets">
          {PRESETS.map(p => {
            const active = periodo.preset === p.key
            return (
              <button key={p.key}
                onClick={() => periodo.setPreset(p.key)}
                style={{
                  padding: '7px 14px', borderRadius: 999,
                  background: active ? C.ink : 'rgba(255,255,255,0.6)',
                  border: active ? 'none' : '1px solid rgba(255,255,255,0.8)',
                  color: active ? '#FFFFFF' : C.inkSoft,
                  cursor: 'pointer',
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontSize: 12, fontWeight: 700,
                  whiteSpace: 'nowrap', flexShrink: 0,
                  boxShadow: active ? '0 4px 14px rgba(44,26,15,0.3)' : 'none',
                }}>{p.label}</button>
            )
          })}
          <style>{`.presets::-webkit-scrollbar { display: none; }`}</style>
        </motion.div>

        {/* Score de saúde */}
        <motion.section variants={ITEM}
          style={{
            background: C.glassStrong, backdropFilter: 'blur(20px)',
            border: `1px solid ${C.glassBorder}`, borderRadius: 22,
            padding: '18px 20px', boxShadow: C.glassShadow,
            display: 'flex', alignItems: 'center', gap: 16,
          }}>
          {/* Gauge mini */}
          <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
            <svg width="72" height="72" viewBox="0 0 72 72" style={{ transform: 'rotate(135deg)' }}>
              <circle cx="36" cy="36" r="28" fill="none" stroke="rgba(44,26,15,0.08)" strokeWidth="6" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 28 * 0.75} ${2 * Math.PI * 28}`} />
              <circle cx="36" cy="36" r="28" fill="none" stroke={cor.bg} strokeWidth="6" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 28 * 0.75 * (d.score.total / 100)} ${2 * Math.PI * 28}`}
                style={{ filter: `drop-shadow(0 0 8px ${cor.bg}66)` }} />
            </svg>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -42%)', textAlign: 'center' }}>
              <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700, color: C.ink, margin: 0, letterSpacing: '-0.5px', lineHeight: 1 }}>{d.score.total}</p>
            </div>
          </div>
          <div>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: '.16em', textTransform: 'uppercase', margin: 0 }}>Saúde financeira</p>
            <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 19, fontWeight: 700, color: C.ink, letterSpacing: '-0.4px', margin: '4px 0 0' }}>{labelStatus(d.status)}</p>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: C.muted, margin: '2px 0 0', fontWeight: 500 }}>Reserva, economia, dívidas, liquidez</p>
          </div>
        </motion.section>

        {/* KPIs grid 2x2 */}
        <motion.section variants={ITEM}
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <KpiTile label="Receitas" value={d.totais.receitas} color={C.green} icon={IconArrowUpRight} delta={d.totais.deltaReceitas} />
          <KpiTile label="Despesas" value={d.totais.despesas} color={C.orange} icon={IconArrowDownRight} delta={d.totais.deltaDespesas} inverse />
          <KpiTile label="Saldo" value={d.totais.saldo} color={d.totais.saldo >= 0 ? C.green : C.orange} icon={IconScale} delta={d.totais.deltaSaldo} signed />
          <KpiTile label="Patrimônio" value={d.patrimonioLiquido} color={C.purple} icon={IconCoin} />
        </motion.section>

        {/* Top categorias */}
        {top3Cats.length > 0 && (
          <motion.section variants={ITEM}>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: C.inkSoft, letterSpacing: '.16em', textTransform: 'uppercase', margin: '0 0 8px', padding: '0 4px' }}>Top categorias · despesas</h2>
            <div style={{ background: C.glass, backdropFilter: 'blur(16px)', border: `1px solid ${C.glassBorder}`, borderRadius: 18, padding: '4px 14px', boxShadow: C.glassShadow }}>
              {top3Cats.map((c, i) => (
                <div key={c.id} style={{ padding: '12px 0', borderTop: i > 0 ? '1px dashed rgba(44,26,15,0.08)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 3, background: c.cor }} />
                    <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12.5, fontWeight: 600, color: C.ink, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nome}</span>
                    <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, color: C.ink, fontVariantNumeric: 'tabular-nums' }}>{fmt(c.valor)}</span>
                  </div>
                  <div style={{ position: 'relative', height: 4, background: '#F5EEE3', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${c.pct}%`, background: c.cor, borderRadius: 999 }} />
                  </div>
                  <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: C.muted, margin: '4px 0 0', fontWeight: 600 }}>{fmtPct(c.pct, 1)}</p>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Insights inline */}
        {insightsTop.length > 0 && (
          <motion.section variants={ITEM}>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: '.16em', textTransform: 'uppercase', margin: '0 0 8px', padding: '0 4px', display: 'flex', alignItems: 'center', gap: 5 }}>
              <IconBulb size={12} stroke={2.4} /> Insights
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {insightsTop.map(ins => {
                const tone = ins.tone === 'positive' ? C.green
                  : ins.tone === 'negative' ? C.orange
                  : ins.tone === 'highlight' ? C.gold : C.purple
                const Icon = ins.icon
                return (
                  <div key={ins.id} style={{
                    background: C.glass, backdropFilter: 'blur(14px)',
                    border: `1px solid ${tone}30`,
                    borderRadius: 14, padding: '12px 14px',
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                  }}>
                    <div style={{ width: 30, height: 30, borderRadius: 9, background: `${tone}1f`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={14} stroke={2.2} color={tone} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12.5, fontWeight: 700, color: C.ink, margin: 0, lineHeight: 1.25 }}>{ins.title}</p>
                      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11.5, color: C.inkSoft, margin: '3px 0 0', fontWeight: 500, lineHeight: 1.45 }}>{ins.body}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.section>
        )}
      </motion.div>
    </div>
  )
}

function KpiTile({ label, value, color, icon: Icon, delta, inverse, signed }: {
  label: string; value: number; color: string; icon: typeof IconTarget; delta?: number; inverse?: boolean; signed?: boolean
}) {
  return (
    <div style={{
      background: C.glassStrong, backdropFilter: 'blur(18px)',
      border: `1px solid ${C.glassBorder}`, borderRadius: 16,
      padding: '12px 14px',
      display: 'flex', flexDirection: 'column', gap: 4,
      boxShadow: C.glassShadow,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <Icon size={12} stroke={2.4} color={color} />
        <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9.5, fontWeight: 700, color: C.muted, letterSpacing: '.12em', textTransform: 'uppercase' }}>{label}</span>
      </div>
      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 16, fontWeight: 700, color, margin: 0, letterSpacing: '-0.3px', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
        {signed && value !== 0 ? (value > 0 ? '+' : '') : ''}{fmt(Math.abs(value))}
      </p>
      {delta !== undefined && Math.abs(delta) >= 1 && (
        <span style={{
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          fontSize: 10, fontWeight: 700,
          color: inverse ? (delta > 0 ? C.orange : C.green) : (delta > 0 ? C.green : C.orange),
        }}>
          {fmtPct(delta, 0, true)} vs anterior
        </span>
      )}
    </div>
  )
}

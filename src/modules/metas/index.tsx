import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconPlus, IconTarget, IconShieldCheck, IconTrash, IconTrophy, IconCoins, IconFlag } from '@tabler/icons-react'
import { useMetasPorTipo, deleteMeta } from '@/db/hooks/useMetas'
import type { Meta, MetaTipo } from '@/db/schema'
import { MetaForm } from './MetaForm'
import { MetaCard } from './MetaCard'
import { ReservaCard } from './ReservaCard'
import { AporteForm } from './AporteForm'
import { OrcamentoSection } from './OrcamentoSection'
import { InvestimentoForm } from '../investimentos/InvestimentoForm'
import { useOrcamentos } from '@/db/hooks/useOrcamentos'
import { fmt } from '@/lib/format'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import type { MetaComputed } from '@/db/hooks/useMetas'

const LABEL: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }
const NUM: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, letterSpacing: '-0.3px', lineHeight: 1.1 }
const SUB: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#9B7B6A' }
const TEXT: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans',sans-serif" }
const DISPLAY: React.CSSProperties = { fontFamily: "'Fraunces',Georgia,serif", fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1.1 }

export function Page() {
  const { reserva, compras, aposentadoria, outros } = useMetasPorTipo()
  const orcamentos = useOrcamentos()

  const [editingMeta, setEditingMeta] = useState<Meta | null>(null)
  const [creatingTipo, setCreatingTipo] = useState<MetaTipo | null>(null)
  const [aporteMeta, setAporteMeta] = useState<MetaComputed | null>(null)
  const [vincularInvestParaMetaId, setVincularInvestParaMetaId] = useState<number | null>(null)
  const [confirmDeleteMeta, setConfirmDeleteMeta] = useState<MetaComputed | null>(null)

  useBodyScrollLock(confirmDeleteMeta !== null)

  const todasMetas = [...compras, ...aposentadoria, ...outros]
  const metasComReserva = reserva ? [reserva, ...todasMetas] : todasMetas

  // KPIs agregados
  const totalGuardado = metasComReserva.reduce((s, m) => s + m.valorAtualTotal, 0)
  const totalAlvo = metasComReserva.reduce((s, m) => s + m.valorAlvo, 0)
  const progressoGeral = totalAlvo > 0 ? (totalGuardado / totalAlvo) * 100 : 0
  const conquistadas = metasComReserva.filter(m => m.progressoPct >= 100).length

  return (
    <div style={{ padding: 32, width: '100%' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, paddingBottom: 18, borderBottom: '1px solid #EDE6DC' }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces',Georgia,serif", fontWeight: 700, fontSize: 38, color: '#2C1A0F', margin: 0, letterSpacing: '-1.5px' }}>Metas & Orçamento</h1>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#9B7B6A', marginTop: 4 }}>
            {todasMetas.length + (reserva ? 1 : 0)} {todasMetas.length + (reserva ? 1 : 0) === 1 ? 'meta ativa' : 'metas ativas'} · {orcamentos.length} {orcamentos.length === 1 ? 'orçamento' : 'orçamentos'} definido{orcamentos.length === 1 ? '' : 's'}
          </p>
        </div>
        <button onClick={() => setCreatingTipo('compra')}
          style={{
            background: 'linear-gradient(135deg, #D4643A, #C4553B)', color: '#FFFFFF', border: 'none',
            borderRadius: 12, padding: '11px 18px', cursor: 'pointer',
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 6,
            boxShadow: '0 4px 16px rgba(196,85,59,0.35)', flexShrink: 0,
          }}>
          <IconPlus size={16} stroke={2.5} /> Nova meta
        </button>
      </div>

      {/* KPIs strip */}
      {metasComReserva.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 28 }}>
          <Kpi icon={<IconCoins size={14} stroke={2} />} label="Total guardado" value={fmt(totalGuardado)} sub={`em ${metasComReserva.length} ${metasComReserva.length === 1 ? 'meta' : 'metas'}`} cor="#3A8580" bg="#EBF5F0" border="rgba(58,133,128,0.18)" />
          <Kpi icon={<IconFlag size={14} stroke={2} />} label="Alvo total" value={fmt(totalAlvo)} sub={`${fmt(Math.max(0, totalAlvo - totalGuardado))} restante`} cor="#2C1A0F" bg="#F5F0E8" border="rgba(44,26,15,0.08)" />
          <Kpi icon={<IconTarget size={14} stroke={2} />} label="Progresso geral" value={`${progressoGeral.toFixed(0)}%`} sub={progressoGeral >= 100 ? 'todas concluídas' : 'média ponderada'} cor="#504E76" bg="#F0EEF7" border="rgba(80,78,118,0.15)" progress={progressoGeral} />
          <Kpi icon={<IconTrophy size={14} stroke={2} />} label="Conquistadas" value={`${conquistadas}`} sub={conquistadas === 0 ? 'nenhuma ainda' : conquistadas === 1 ? '1 meta atingida' : `${conquistadas} metas atingidas`} cor="#A8730F" bg="#FDF4E3" border="rgba(212,160,23,0.2)" />
        </div>
      )}

      {/* RESERVA DE EMERGÊNCIA — destaque ou CTA */}
      <section style={{ marginBottom: 32 }}>
        {reserva ? (
          <ReservaCard
            reserva={reserva}
            onEdit={() => setEditingMeta(reserva)}
            onAporte={() => setAporteMeta(reserva)}
          />
        ) : (
          <CTAReserva onCreate={() => setCreatingTipo('reserva_emergencia')} />
        )}
      </section>

      {/* OUTRAS METAS */}
      <section style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700, color: '#2C1A0F', margin: 0, letterSpacing: '-0.6px' }}>
            Outras metas
          </h2>
          {todasMetas.length > 0 && (
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600, color: '#9B7B6A' }}>
              {todasMetas.length} {todasMetas.length === 1 ? 'meta' : 'metas'}
            </p>
          )}
        </div>

        {todasMetas.length === 0 ? (
          <EmptyStateMetas onCreate={() => setCreatingTipo('compra')} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: 14, alignItems: 'stretch' }}>
            {todasMetas.map(m => (
              <MetaCard
                key={m.id}
                meta={m}
                onEdit={() => setEditingMeta(m)}
                onAporte={() => setAporteMeta(m)}
                onDelete={() => setConfirmDeleteMeta(m)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ORÇAMENTOS */}
      <OrcamentoSection />

      {/* ─── Modals ─── */}
      <AnimatePresence>
        {(editingMeta || creatingTipo) && (
          <MetaForm
            meta={editingMeta}
            presetTipo={creatingTipo ?? undefined}
            onClose={() => { setEditingMeta(null); setCreatingTipo(null) }}
          />
        )}

        {aporteMeta && (
          <AporteForm
            meta={aporteMeta}
            onClose={() => setAporteMeta(null)}
            onOpenInvestimento={() => {
              if (aporteMeta.id !== undefined) {
                setVincularInvestParaMetaId(aporteMeta.id)
                setAporteMeta(null)
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

        {confirmDeleteMeta && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setConfirmDeleteMeta(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(28,10,5,0.55)', backdropFilter: 'blur(8px)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <motion.div initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ background: '#FFFDF9', borderRadius: 22, padding: '28px 24px', maxWidth: 360, width: '100%', textAlign: 'center', boxShadow: '0 24px 64px rgba(13,6,4,0.4)' }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: '#FAF0EE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <IconTrash size={26} color="#C4553B" stroke={1.8} />
              </div>
              <p style={{ ...DISPLAY as object, fontSize: 20, color: '#2C1A0F', marginBottom: 8 }}>Excluir "{confirmDeleteMeta.nome}"?</p>
              <p style={{ ...SUB as object, fontSize: 13, marginBottom: 22, lineHeight: 1.5 }}>
                Os aportes diretos serão perdidos. Investimentos vinculados continuam existindo, sem vínculo.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setConfirmDeleteMeta(null)}
                  style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: '1.5px solid #E8E0D5', background: 'white', ...TEXT, fontSize: 13, fontWeight: 700, color: '#7A5C4F', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <motion.button whileTap={{ scale: 0.97 }}
                  onClick={async () => {
                    if (confirmDeleteMeta.id !== undefined) await deleteMeta(confirmDeleteMeta.id)
                    setConfirmDeleteMeta(null)
                  }}
                  style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: 'none', background: '#C4553B', ...TEXT, fontSize: 13, fontWeight: 700, color: 'white', cursor: 'pointer', boxShadow: '0 4px 12px rgba(196,85,59,0.3)' }}>
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

// ─── KPI ──────────────────────────────────────────────────────────────
function Kpi({ icon, label, value, sub, cor, bg, border, progress }: { icon: React.ReactNode; label: string; value: string; sub: string; cor: string; bg: string; border: string; progress?: number }) {
  return (
    <div style={{ background: bg, borderRadius: 14, padding: '12px 14px', border: `1px solid ${border}`, position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ color: cor }}>{icon}</span>
        <p style={{ ...LABEL as object, color: cor, margin: 0 }}>{label}</p>
      </div>
      <p style={{ ...NUM as object, fontSize: 20, color: cor, margin: 0 }}>{value}</p>
      <p style={{ ...SUB as object, fontSize: 10, marginTop: 3, margin: '3px 0 0' }}>{sub}</p>
      {progress !== undefined && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'rgba(80,78,118,0.15)' }}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, progress)}%` }} transition={{ type: 'spring', stiffness: 140, damping: 22 }}
            style={{ height: '100%', background: cor }} />
        </div>
      )}
    </div>
  )
}

function CTAReserva({ onCreate }: { onCreate: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      style={{
        position: 'relative',
        background: 'linear-gradient(155deg, #FFF8F0 0%, #FFF1E6 100%)',
        border: '1.5px dashed rgba(58,133,128,0.45)',
        borderRadius: 24, padding: '28px 32px',
        display: 'flex', gap: 20, alignItems: 'center',
      }}>
      <div style={{
        width: 60, height: 60, borderRadius: 18,
        background: 'linear-gradient(135deg, #3A8580, #2C7470)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 24px rgba(58,133,128,0.3)', flexShrink: 0,
      }}>
        <IconShieldCheck size={30} stroke={1.8} color="#FFFFFF" />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: '#3A8580', letterSpacing: '.16em', textTransform: 'uppercase', margin: 0 }}>
          Comece pelo essencial
        </p>
        <h3 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700, color: '#2C1A0F', margin: '4px 0 6px', letterSpacing: '-0.6px' }}>
          Crie sua Reserva de Emergência
        </h3>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#7A5C4F', margin: 0, lineHeight: 1.5, maxWidth: 520 }}>
          O primeiro passo da segurança financeira. Calculamos automaticamente o quanto você precisa com base nas suas despesas dos últimos meses e cobertura desejada (3, 6 ou 12 meses).
        </p>
      </div>
      <button onClick={onCreate}
        style={{
          background: 'linear-gradient(135deg, #3A8580, #2C7470)',
          color: '#FFFFFF', border: 'none', borderRadius: 12,
          padding: '12px 20px', cursor: 'pointer',
          fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0,
          boxShadow: '0 4px 16px rgba(58,133,128,0.32)',
        }}>
        <IconPlus size={16} stroke={2.5} /> Criar reserva
      </button>
    </motion.div>
  )
}

function EmptyStateMetas({ onCreate }: { onCreate: () => void }) {
  return (
    <div style={{
      background: '#FFFFFF', border: '1px dashed #D4C8BC', borderRadius: 18,
      padding: '40px 28px', textAlign: 'center',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16,
        background: 'linear-gradient(135deg, #D4643A, #C4553B)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 24px rgba(196,85,59,0.28)',
      }}>
        <IconTarget size={28} stroke={1.6} color="#FFFFFF" />
      </div>
      <div>
        <h3 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: '#2C1A0F', margin: 0, letterSpacing: '-0.5px' }}>
          Sem outras metas ainda
        </h3>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#7A5C4F', marginTop: 6, maxWidth: 400 }}>
          Defina objetivos financeiros — viagens, compras, aposentadoria. Você pode vincular investimentos a cada meta e acompanhar o progresso em tempo real.
        </p>
      </div>
      <button onClick={onCreate} style={{
        background: 'linear-gradient(135deg, #D4643A, #C4553B)', color: '#FFFFFF', border: 'none',
        borderRadius: 12, padding: '10px 18px', cursor: 'pointer',
        fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700,
        display: 'flex', alignItems: 'center', gap: 6,
        boxShadow: '0 4px 16px rgba(196,85,59,0.32)',
      }}>
        <IconPlus size={16} stroke={2.5} /> Criar primeira meta
      </button>
    </div>
  )
}

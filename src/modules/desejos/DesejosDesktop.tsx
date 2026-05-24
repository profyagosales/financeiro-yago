import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconPlus, IconHeart, IconShoppingCart, IconCircleMinus, IconTrash, IconPigMoney } from '@tabler/icons-react'
import { fmt } from '@/lib/format'
import { useDesejos, deleteDesejo } from '@/db/hooks/useDesejos'
import type { Desejo, DesejoPrioridade, DesejoStatus } from '@/db/schema'
import { PRIORIDADES } from './constants'
import { DesejoCard } from './DesejoCard'
import { DesejoForm } from './DesejoForm'
import { ComprarForm } from './ComprarForm'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'

const LABEL: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }
const NUM: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, letterSpacing: '-0.3px', lineHeight: 1.1 }
const SUB: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#9B7B6A' }
const TEXT: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans',sans-serif" }
const DISPLAY: React.CSSProperties = { fontFamily: "'Fraunces',Georgia,serif", fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1.1 }

export function DesejosDesktop() {
  const todos = useDesejos()

  const [editingDesejo, setEditingDesejo] = useState<Desejo | null>(null)
  const [creatingPrio, setCreatingPrio] = useState<DesejoPrioridade | null>(null)
  const [comprandoDesejo, setComprandoDesejo] = useState<Desejo | null>(null)
  const [confirmDeleteDesejo, setConfirmDeleteDesejo] = useState<Desejo | null>(null)
  const [tab, setTab] = useState<DesejoStatus>('aberto')

  useBodyScrollLock(confirmDeleteDesejo !== null)

  const abertos = todos.filter(d => d.status === 'aberto')
  const comprados = todos.filter(d => d.status === 'comprado')
  const desistidos = todos.filter(d => d.status === 'desistido')

  const filtered = tab === 'aberto' ? abertos : tab === 'comprado' ? comprados : desistidos

  // Agrupa por prioridade (só relevante na aba "aberto")
  const grupos = useMemo(() => {
    const map = new Map<DesejoPrioridade, Desejo[]>()
    PRIORIDADES.forEach(p => map.set(p.value, []))
    filtered.forEach(d => map.get(d.prioridade)?.push(d))
    return map
  }, [filtered])

  // Stats
  const totalEstimadoAbertos = abertos.reduce((s, d) => s + (d.valorEstimado ?? 0), 0)
  const totalGastoComprados = comprados.reduce((s, d) => s + (d.valorMenorEncontrado ?? 0), 0)
  const economiaTotal = comprados.reduce((s, d) => {
    if (d.valorEstimado && d.valorMenorEncontrado && d.valorMenorEncontrado < d.valorEstimado) {
      return s + (d.valorEstimado - d.valorMenorEncontrado)
    }
    return s
  }, 0)

  return (
    <div style={{ padding: 32, width: '100%' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, paddingBottom: 18, borderBottom: '1px solid #EDE6DC' }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces',Georgia,serif", fontWeight: 700, fontSize: 38, color: '#2C1A0F', margin: 0, letterSpacing: '-1.5px' }}>Lista de Desejos</h1>
        </div>
        <button onClick={() => setCreatingPrio('media')}
          style={{
            background: 'linear-gradient(135deg, #2A1E3F, #504E76)', color: '#FFFFFF', border: 'none',
            borderRadius: 12, padding: '11px 18px', cursor: 'pointer',
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 6,
            boxShadow: '0 8px 22px rgba(42,30,63,0.42)', flexShrink: 0,
          }}>
          <IconPlus size={16} stroke={2.5} /> Novo desejo
        </button>
      </div>

      {/* KPIs (padrão filled — consistente com /metas, /cartoes, /contas-fixas) */}
      {(abertos.length > 0 || comprados.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
          <Kpi icon={<IconHeart size={14} stroke={2} />} label="Em aberto" value={String(abertos.length)} sub={totalEstimadoAbertos > 0 ? `${fmt(totalEstimadoAbertos)} estimado` : 'sem valor estimado'} cor="#504E76" bg="rgba(80,78,118,0.08)" border="rgba(80,78,118,0.22)" />
          <Kpi icon={<IconShoppingCart size={14} stroke={2} />} label="Comprados" value={String(comprados.length)} sub={totalGastoComprados > 0 ? `${fmt(totalGastoComprados)} gasto` : 'nenhum ainda'} cor="#3A8580" bg="#EBF5F0" border="rgba(58,133,128,0.18)" />
          <Kpi icon={<IconPigMoney size={14} stroke={2} />} label="Economia" value={fmt(economiaTotal)} sub="vs estimado" cor="#A8730F" bg="#FDF4E3" border="rgba(212,160,23,0.2)" />
          <Kpi icon={<IconCircleMinus size={14} stroke={2} />} label="Desistidos" value={String(desistidos.length)} sub={desistidos.length === 0 ? 'nenhum' : 'arquivados'} cor="#7A5C4F" bg="#F5F0E8" border="rgba(122,92,79,0.18)" />
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: '#F5F0E8', padding: 4, borderRadius: 12, marginBottom: 20, width: 'fit-content' }}>
        <TabBtn active={tab === 'aberto'} onClick={() => setTab('aberto')} count={abertos.length}>Em aberto</TabBtn>
        <TabBtn active={tab === 'comprado'} onClick={() => setTab('comprado')} count={comprados.length}>Comprados</TabBtn>
        <TabBtn active={tab === 'desistido'} onClick={() => setTab('desistido')} count={desistidos.length}>Desistidos</TabBtn>
      </div>

      {/* Conteúdo */}
      {tab === 'aberto' ? (
        abertos.length === 0 ? (
          <EmptyState onCreate={() => setCreatingPrio('media')} />
        ) : (
          // KANBAN
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${PRIORIDADES.length}, minmax(220px, 1fr))`,
            gap: 12,
            alignItems: 'flex-start',
          }}>
            {PRIORIDADES.map(p => {
              const items = grupos.get(p.value) ?? []
              const totalCol = items.reduce((s, d) => s + (d.valorEstimado ?? 0), 0)
              return (
                <div key={p.value} style={{
                  background: p.corLight,
                  borderRadius: 14,
                  padding: 12,
                  display: 'flex', flexDirection: 'column', gap: 10,
                  minHeight: 200,
                }}>
                  {/* Header da coluna */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    paddingBottom: 8, borderBottom: `1.5px solid ${p.cor}30`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: 8, background: p.cor,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <p.Icon size={14} stroke={1.8} color="#FFFFFF" />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{
                          fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700,
                          color: p.cor, margin: 0, letterSpacing: '.04em',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{p.short.toUpperCase()}</p>
                        <p style={{
                          fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 600,
                          color: '#7A5C4F', margin: '1px 0 0',
                        }}>
                          {items.length} {items.length === 1 ? 'item' : 'itens'}
                          {totalCol > 0 && ` · ${fmt(totalCol)}`}
                        </p>
                      </div>
                    </div>
                    <button onClick={() => setCreatingPrio(p.value)}
                      title={`Adicionar em ${p.label}`}
                      style={{
                        background: '#FFFFFF', border: `1px solid ${p.cor}40`,
                        borderRadius: 8, width: 26, height: 26, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                      <IconPlus size={12} stroke={2.4} color={p.cor} />
                    </button>
                  </div>

                  {/* Cards da coluna */}
                  {items.length === 0 ? (
                    <div style={{
                      padding: '24px 8px', textAlign: 'center',
                      fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11,
                      color: 'rgba(122,92,79,0.5)',
                    }}>
                      Sem itens
                    </div>
                  ) : (
                    items.map(d => (
                      <DesejoCard
                        key={d.id}
                        desejo={d}
                        onEdit={() => setEditingDesejo(d)}
                        onComprar={() => setComprandoDesejo(d)}
                        onDelete={() => setConfirmDeleteDesejo(d)}
                      />
                    ))
                  )}
                </div>
              )
            })}
          </div>
        )
      ) : (
        // Listas comprados / desistidos (grid simples)
        filtered.length === 0 ? (
          <EmptyStateOther status={tab} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, alignItems: 'stretch' }}>
            {filtered.map(d => (
              <DesejoCard
                key={d.id}
                desejo={d}
                onEdit={() => setEditingDesejo(d)}
                onDelete={() => setConfirmDeleteDesejo(d)}
              />
            ))}
          </div>
        )
      )}

      {/* Modals */}
      <AnimatePresence>
        {(editingDesejo || creatingPrio) && (
          <DesejoForm
            desejo={editingDesejo}
            presetPrioridade={creatingPrio ?? undefined}
            onClose={() => { setEditingDesejo(null); setCreatingPrio(null) }}
          />
        )}
        {comprandoDesejo && (
          <ComprarForm
            desejo={comprandoDesejo}
            onClose={() => setComprandoDesejo(null)}
          />
        )}

        {confirmDeleteDesejo && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setConfirmDeleteDesejo(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(28,10,5,0.55)', backdropFilter: 'blur(8px)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <motion.div initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ background: '#FFFDF9', borderRadius: 22, padding: '28px 24px', maxWidth: 360, width: '100%', textAlign: 'center', boxShadow: '0 24px 64px rgba(13,6,4,0.4)' }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: '#FAF0EE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <IconTrash size={26} color="#C4553B" stroke={1.8} />
              </div>
              <p style={{ ...DISPLAY as object, fontSize: 20, color: '#2C1A0F', marginBottom: 8 }}>Excluir "{confirmDeleteDesejo.nome}"?</p>
              <p style={{ ...SUB as object, fontSize: 13, marginBottom: 22, lineHeight: 1.5 }}>
                O desejo será removido permanentemente da sua lista.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setConfirmDeleteDesejo(null)}
                  style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: '1.5px solid #E8E0D5', background: 'white', ...TEXT, fontSize: 13, fontWeight: 700, color: '#7A5C4F', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <motion.button whileTap={{ scale: 0.97 }}
                  onClick={async () => {
                    if (confirmDeleteDesejo.id !== undefined) await deleteDesejo(confirmDeleteDesejo.id)
                    setConfirmDeleteDesejo(null)
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

// ─── KPI (mesmo padrão visual de /metas e /contas-fixas) ─────────────
function Kpi({ icon, label, value, sub, cor, bg, border }: { icon: React.ReactNode; label: string; value: string; sub: string; cor: string; bg: string; border: string }) {
  return (
    <div style={{ background: bg, borderRadius: 14, padding: '12px 14px', border: `1px solid ${border}`, position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ color: cor }}>{icon}</span>
        <p style={{ ...LABEL as object, color: cor, margin: 0 }}>{label}</p>
      </div>
      <p style={{ ...NUM as object, fontSize: 20, color: cor, margin: 0 }}>{value}</p>
      <p style={{ ...SUB as object, fontSize: 10, marginTop: 3, margin: '3px 0 0' }}>{sub}</p>
    </div>
  )
}

function TabBtn({ children, active, count, onClick }: { children: React.ReactNode; active: boolean; count?: number; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      background: active ? '#2A1E3F' : 'transparent',
      color: active ? '#FFFFFF' : '#7A5C4F',
      border: 'none', borderRadius: 9,
      padding: '8px 16px', cursor: 'pointer',
      fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700,
      display: 'inline-flex', alignItems: 'center', gap: 6,
      letterSpacing: '.02em',
      transition: 'all .15s',
      boxShadow: active ? '0 4px 12px rgba(42,30,63,0.4)' : 'none',
    }}>
      {children}
      {count !== undefined && (
        <span style={{
          background: active ? 'rgba(255,255,255,0.22)' : 'rgba(122,92,79,0.15)',
          padding: '1px 7px', borderRadius: 6, fontSize: 10,
        }}>{count}</span>
      )}
    </button>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div style={{
      background: '#FFFFFF', border: '1px dashed #D4C8BC', borderRadius: 22,
      padding: '48px 32px', textAlign: 'center',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 20,
        background: 'linear-gradient(135deg, #2A1E3F, #504E76)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 10px 28px rgba(42,30,63,0.4)',
      }}>
        <IconHeart size={32} stroke={1.6} color="#FFFFFF" />
      </div>
      <div>
        <h3 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700, color: '#2C1A0F', margin: 0, letterSpacing: '-0.6px' }}>
          Sua lista de desejos está vazia
        </h3>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#7A5C4F', marginTop: 6, maxWidth: 460 }}>
          Adicione tudo que você quer ou precisa comprar — ração do pet, presente, eletrônico, viagem. Organize por prioridade e registre como comprado quando for a hora.
        </p>
      </div>
      <button onClick={onCreate} style={{
        background: 'linear-gradient(135deg, #2A1E3F, #504E76)', color: '#FFFFFF', border: 'none',
        borderRadius: 12, padding: '11px 20px', cursor: 'pointer',
        fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700,
        display: 'flex', alignItems: 'center', gap: 6,
        boxShadow: '0 8px 22px rgba(42,30,63,0.42)', marginTop: 4,
      }}>
        <IconPlus size={16} stroke={2.5} /> Adicionar primeiro desejo
      </button>
    </div>
  )
}

function EmptyStateOther({ status }: { status: DesejoStatus }) {
  return (
    <div style={{
      background: '#FFFFFF', border: '1px dashed #D4C8BC', borderRadius: 18,
      padding: '32px 24px', textAlign: 'center',
    }}>
      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#7A5C4F', margin: 0 }}>
        {status === 'comprado'
          ? 'Você ainda não comprou nada da sua lista'
          : 'Nenhum desejo descartado por aqui'}
      </p>
    </div>
  )
}

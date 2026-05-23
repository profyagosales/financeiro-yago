import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconPlus, IconHeart, IconShoppingCart, IconCircleMinus } from '@tabler/icons-react'
import { fmt } from '@/lib/format'
import { useDesejos } from '@/db/hooks/useDesejos'
import type { Desejo, DesejoPrioridade, DesejoStatus } from '@/db/schema'
import { PRIORIDADES } from './constants'
import { DesejoCard } from './DesejoCard'
import { DesejoForm } from './DesejoForm'
import { ComprarForm } from './ComprarForm'

export function Page() {
  const todos = useDesejos()

  const [editingDesejo, setEditingDesejo] = useState<Desejo | null>(null)
  const [creatingPrio, setCreatingPrio] = useState<DesejoPrioridade | null>(null)
  const [comprandoDesejo, setComprandoDesejo] = useState<Desejo | null>(null)
  const [tab, setTab] = useState<DesejoStatus>('aberto')

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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: 32, width: '100%' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, paddingBottom: 18, borderBottom: '1px solid #EDE6DC' }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces',Georgia,serif", fontWeight: 700, fontSize: 38, color: '#2C1A0F', margin: 0, letterSpacing: '-1.5px' }}>Lista de Desejos</h1>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#9B7B6A', marginTop: 4 }}>
            Organize o que você quer ou precisa comprar — kanban por prioridade
          </p>
        </div>
        <button onClick={() => setCreatingPrio('media')}
          style={{
            background: 'linear-gradient(135deg, #D4643A, #C4553B)', color: '#FFFFFF', border: 'none',
            borderRadius: 12, padding: '11px 18px', cursor: 'pointer',
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 6,
            boxShadow: '0 4px 16px rgba(196,85,59,0.35)', flexShrink: 0,
          }}>
          <IconPlus size={16} stroke={2.5} /> Novo desejo
        </button>
      </div>

      {/* Stats (só mostra se houver dados) */}
      {(abertos.length > 0 || comprados.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
          <StatCard
            icon={<IconHeart size={18} stroke={1.8} color="#C4553B" />}
            label="Desejos em aberto"
            value={String(abertos.length)}
            sub={totalEstimadoAbertos > 0 ? `${fmt(totalEstimadoAbertos)} estimado` : undefined}
            cor="#C4553B"
          />
          <StatCard
            icon={<IconShoppingCart size={18} stroke={1.8} color="#3A8580" />}
            label="Comprados"
            value={String(comprados.length)}
            sub={totalGastoComprados > 0 ? `${fmt(totalGastoComprados)} gasto` : undefined}
            cor="#3A8580"
          />
          <StatCard
            icon={<IconCircleMinus size={18} stroke={1.8} color="#D4A017" />}
            label="Economia"
            value={fmt(economiaTotal)}
            sub="vs estimado nas compras"
            cor="#D4A017"
          />
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
      </AnimatePresence>
    </motion.div>
  )
}

function StatCard({ icon, label, value, sub, cor }: { icon: React.ReactNode; label: string; value: string; sub?: string; cor: string }) {
  return (
    <div style={{
      background: '#FFFFFF', border: '1px solid #EDE6DC',
      borderLeft: `3px solid ${cor}`,
      borderRadius: 14, padding: '14px 18px',
      boxShadow: '0 1px 3px rgba(44,26,15,0.05), 0 2px 8px rgba(44,26,15,0.04)',
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon}
        <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: '#7A5C4F', letterSpacing: '.1em', textTransform: 'uppercase' }}>
          {label}
        </span>
      </div>
      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 24, fontWeight: 700, color: '#2C1A0F', margin: 0, letterSpacing: '-0.3px', lineHeight: 1 }}>
        {value}
      </p>
      {sub && (
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#9B7B6A', margin: 0 }}>
          {sub}
        </p>
      )}
    </div>
  )
}

function TabBtn({ children, active, count, onClick }: { children: React.ReactNode; active: boolean; count?: number; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      background: active ? '#C4553B' : 'transparent',
      color: active ? '#FFFFFF' : '#7A5C4F',
      border: 'none', borderRadius: 9,
      padding: '8px 16px', cursor: 'pointer',
      fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700,
      display: 'inline-flex', alignItems: 'center', gap: 6,
      letterSpacing: '.02em',
      transition: 'all .15s',
      boxShadow: active ? '0 2px 8px rgba(196,85,59,0.32)' : 'none',
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
        background: 'linear-gradient(135deg, #D4643A, #C4553B)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 24px rgba(196,85,59,0.3)',
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
        background: 'linear-gradient(135deg, #D4643A, #C4553B)', color: '#FFFFFF', border: 'none',
        borderRadius: 12, padding: '11px 20px', cursor: 'pointer',
        fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700,
        display: 'flex', alignItems: 'center', gap: 6,
        boxShadow: '0 4px 16px rgba(196,85,59,0.35)', marginTop: 4,
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

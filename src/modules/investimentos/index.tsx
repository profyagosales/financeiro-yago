import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconPlus, IconChartLine, IconRefresh, IconArrowUpRight, IconArrowDownRight, IconTrash } from '@tabler/icons-react'
import { fmt } from '@/lib/format'
import {
  useInvestimentos, useTotalInvestimentos,
  deleteInvestimento, aplicarRentabilidadeAutoTodos,
  atualizarCotacoesTodos,
} from '@/db/hooks/useInvestimentos'
import { useMetas } from '@/db/hooks/useMetas'
import type { Investimento, InvestimentoTipo } from '@/db/schema'
import { TIPOS, TIPO_META, CLASSE_COR, CLASSE_LABEL } from './constants'
import { InvestimentoCard } from './InvestimentoCard'
import { InvestimentoForm } from './InvestimentoForm'
import { ProventosModal } from './ProventosModal'
import { AportesModal } from './AportesModal'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'

export function Page() {
  const investimentos = useInvestimentos()
  const { total, aplicado, rendimento } = useTotalInvestimentos()
  const metas = useMetas()

  const [filterTipo, setFilterTipo] = useState<InvestimentoTipo | null>(null)
  const [editing, setEditing] = useState<Investimento | null>(null)
  const [adding, setAdding] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Investimento | null>(null)
  const [proventosFor, setProventosFor] = useState<Investimento | null>(null)
  const [aportesFor, setAportesFor] = useState<Investimento | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null)

  useBodyScrollLock(confirmDelete !== null)

  // Aplica rentabilidade auto na carga inicial
  useEffect(() => { aplicarRentabilidadeAutoTodos() }, [])

  const metaById = useMemo(
    () => new Map(metas.map(m => [m.id!, m])),
    [metas],
  )

  // Filtragem
  const filtrados = filterTipo
    ? investimentos.filter(i => i.tipo === filterTipo)
    : investimentos

  // Agrupa por tipo
  const grupos = useMemo(() => {
    const map = new Map<InvestimentoTipo, Investimento[]>()
    filtrados.forEach(i => {
      const arr = map.get(i.tipo) ?? []
      arr.push(i)
      map.set(i.tipo, arr)
    })
    return Array.from(map.entries()).sort((a, b) => {
      // Ordem definida em TIPOS
      const orderA = TIPOS.findIndex(t => t.value === a[0])
      const orderB = TIPOS.findIndex(t => t.value === b[0])
      return orderA - orderB
    })
  }, [filtrados])

  // Distribuição por classe (Renda Fixa / Variável / Cripto / Caixa)
  const distribuicaoClasse = useMemo(() => {
    const acc: Record<'fixa'|'variavel'|'cripto'|'caixa', number> = { fixa: 0, variavel: 0, cripto: 0, caixa: 0 }
    investimentos.forEach(i => {
      const tm = TIPO_META.get(i.tipo)
      if (tm) acc[tm.classe] += i.valorAtual
    })
    return acc
  }, [investimentos])

  // Contagem por tipo (pra mostrar no filtro)
  const countByTipo = useMemo(() => {
    const map = new Map<InvestimentoTipo, number>()
    investimentos.forEach(i => map.set(i.tipo, (map.get(i.tipo) ?? 0) + 1))
    return map
  }, [investimentos])

  const rendimentoPct = aplicado > 0 ? (rendimento / aplicado) * 100 : 0
  const rendimentoPositivo = rendimento >= 0

  return (
    <div style={{ padding: 32, width: '100%' }}>

      {/* ─── Header ─── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, paddingBottom: 18, borderBottom: '1px solid #EDE6DC' }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces',Georgia,serif", fontWeight: 700, fontSize: 38, color: '#2C1A0F', margin: 0, letterSpacing: '-1.5px' }}>Investimentos</h1>
        </div>
        <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
          <button onClick={async () => {
              setRefreshing(true)
              setRefreshMsg(null)
              await aplicarRentabilidadeAutoTodos()
              const r = await atualizarCotacoesTodos()
              setRefreshing(false)
              const parts: string[] = []
              if (r.sucesso > 0) parts.push(`${r.sucesso} cotação${r.sucesso !== 1 ? 'ões' : ''} atualizada${r.sucesso !== 1 ? 's' : ''}`)
              if (r.falhou > 0) parts.push(`${r.falhou} falhou`)
              setRefreshMsg(parts.length > 0 ? parts.join(' · ') : 'Rendimentos atualizados')
              setTimeout(() => setRefreshMsg(null), 3000)
            }}
            title="Aplicar rentabilidade mensal (renda fixa) + buscar cotações (renda variável)"
            disabled={refreshing}
            style={{
              background: '#FFFFFF', color: '#7A5C4F', border: '1.5px solid #EDE6DC',
              borderRadius: 12, padding: '10px 16px', cursor: refreshing ? 'default' : 'pointer',
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 6,
              opacity: refreshing ? 0.7 : 1,
            }}>
            <motion.span
              animate={refreshing ? { rotate: 360 } : { rotate: 0 }}
              transition={refreshing ? { repeat: Infinity, duration: 0.8, ease: 'linear' } : { duration: 0.2 }}
              style={{ display: 'inline-flex' }}>
              <IconRefresh size={14} stroke={2} />
            </motion.span>
            {refreshing ? 'Atualizando…' : (refreshMsg ?? 'Atualizar tudo')}
          </button>
          <button onClick={() => setAdding(true)}
            style={{
              background: 'linear-gradient(135deg, #D4643A, #C4553B)', color: '#FFFFFF', border: 'none',
              borderRadius: 12, padding: '11px 18px', cursor: 'pointer',
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: '0 4px 16px rgba(196,85,59,0.35)',
            }}>
            <IconPlus size={16} stroke={2.5} /> Novo investimento
          </button>
        </div>
      </div>

      {/* ─── Hero stats card ─── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        style={{
          position: 'relative',
          background: 'linear-gradient(155deg, #504E76 0%, #2A2150 100%)',
          borderRadius: 24, padding: '28px 32px',
          boxShadow: '0 8px 32px rgba(42,33,80,0.28)',
          marginBottom: 24, overflow: 'hidden',
        }}>
        {/* Decoração */}
        <svg style={{ position: 'absolute', right: -10, top: -20, width: 220, height: 220, opacity: 0.07, pointerEvents: 'none' }} viewBox="0 0 200 200" fill="none">
          <circle cx="100" cy="100" r="90" stroke="white" strokeWidth="1"/>
          <circle cx="100" cy="100" r="62" stroke="white" strokeWidth="1"/>
          <circle cx="100" cy="100" r="35" stroke="white" strokeWidth="1"/>
        </svg>
        <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 32, alignItems: 'center' }}>
          {/* Left */}
          <div>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: 'rgba(196,195,227,0.65)', letterSpacing: '.18em', textTransform: 'uppercase', margin: 0 }}>
              Patrimônio investido
            </p>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 44, fontWeight: 700, color: '#FFFFFF', margin: '6px 0 0', letterSpacing: '-0.3px', lineHeight: 1 }}>
              {fmt(total)}
            </p>
            <div style={{ height: 1, background: 'linear-gradient(90deg, rgba(212,160,23,0.4) 0%, rgba(255,255,255,0.08) 60%, transparent 100%)', margin: '14px 0 14px 0' }}/>
            <div style={{ display: 'flex', gap: 28 }}>
              <Stat label="Aplicado" value={fmt(aplicado)} />
              <Stat
                label="Rendimento"
                value={
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {rendimentoPositivo ? <IconArrowUpRight size={14} stroke={2.4} color="#F2C745" /> : <IconArrowDownRight size={14} stroke={2.4} color="#F2C745" />}
                    {fmt(rendimento)}
                    <span style={{ fontSize: 12, fontFamily: "'Plus Jakarta Sans',sans-serif", color: '#F2C745', fontWeight: 600 }}>
                      ({rendimentoPositivo ? '+' : ''}{rendimentoPct.toFixed(2)}%)
                    </span>
                  </span>
                }
              />
            </div>
          </div>

          {/* Right — distribuição por classe (stacked bar) */}
          <div>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: 'rgba(196,195,227,0.65)', letterSpacing: '.18em', textTransform: 'uppercase', margin: '0 0 12px' }}>
              Distribuição da carteira
            </p>
            {total > 0 ? (
              <>
                <div style={{ height: 10, background: 'rgba(255,255,255,0.07)', borderRadius: 5, overflow: 'hidden', display: 'flex' }}>
                  {(['fixa','variavel','cripto','caixa'] as const).map(c => {
                    const pct = total > 0 ? (distribuicaoClasse[c] / total) * 100 : 0
                    if (pct === 0) return null
                    return <div key={c} style={{ width: `${pct}%`, background: CLASSE_COR[c], height: '100%' }} />
                  })}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
                  {(['fixa','variavel','cripto','caixa'] as const).map(c => {
                    const v = distribuicaoClasse[c]
                    const pct = total > 0 ? (v / total) * 100 : 0
                    if (v === 0) return null
                    return (
                      <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: CLASSE_COR[c], flexShrink: 0 }} />
                        <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.85)', flex: 1 }}>{CLASSE_LABEL[c]}</span>
                        <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700, color: '#FFFFFF' }}>{pct.toFixed(0)}%</span>
                        <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: 'rgba(196,195,227,0.7)', minWidth: 70, textAlign: 'right' }}>{fmt(v)}</span>
                      </div>
                    )
                  })}
                </div>
              </>
            ) : (
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Adicione seu primeiro investimento para ver a distribuição</p>
            )}
          </div>
        </div>
      </motion.div>

      {/* ─── Filtros ─── */}
      {investimentos.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <FilterChip active={filterTipo === null} onClick={() => setFilterTipo(null)}>
            Todos · {investimentos.length}
          </FilterChip>
          {TIPOS.map(t => {
            const count = countByTipo.get(t.value) ?? 0
            if (count === 0) return null
            const active = filterTipo === t.value
            return (
              <FilterChip key={t.value} active={active} cor={t.cor} onClick={() => setFilterTipo(t.value)}>
                <t.Icon size={12} stroke={2} />
                {t.label} · {count}
              </FilterChip>
            )
          })}
        </div>
      )}

      {/* ─── Lista de investimentos agrupada por tipo ─── */}
      {investimentos.length === 0 ? (
        <EmptyState onAdd={() => setAdding(true)} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {grupos.map(([tipo, items]) => {
            const tm = TIPO_META.get(tipo)
            const subtotal = items.reduce((s, i) => s + i.valorAtual, 0)
            return (
              <section key={tipo}>
                <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    <h2 style={{
                      fontFamily: "'Fraunces',Georgia,serif", fontSize: 18, fontWeight: 700,
                      color: '#2C1A0F', margin: 0, letterSpacing: '-0.4px',
                    }}>{tm?.label ?? tipo}</h2>
                    <span style={{
                      fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600,
                      color: '#9B7B6A',
                    }}>{items.length} {items.length === 1 ? 'investimento' : 'investimentos'}</span>
                  </div>
                  <span style={{
                    fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 16, fontWeight: 700,
                    color: tm?.cor ?? '#2C1A0F', letterSpacing: '-0.3px',
                  }}>{fmt(subtotal)}</span>
                </header>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {items.map(inv => (
                    <InvestimentoCard
                      key={inv.id}
                      invest={inv}
                      meta={inv.metaId !== undefined ? metaById.get(inv.metaId) : null}
                      onEdit={() => setEditing(inv)}
                      onDelete={() => setConfirmDelete(inv)}
                      onProventos={() => setProventosFor(inv)}
                      onAportes={() => setAportesFor(inv)}
                    />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {/* ─── Modais ─── */}
      <AnimatePresence>
        {(adding || editing) && (
          <InvestimentoForm
            invest={editing}
            onClose={() => { setAdding(false); setEditing(null) }}
          />
        )}

        {proventosFor && (
          <ProventosModal
            invest={proventosFor}
            onClose={() => setProventosFor(null)}
          />
        )}

        {aportesFor && (
          <AportesModal
            invest={aportesFor}
            onClose={() => setAportesFor(null)}
          />
        )}

        {confirmDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setConfirmDelete(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(28,10,5,0.55)', backdropFilter: 'blur(8px)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <motion.div initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ background: '#FFFDF9', borderRadius: 22, padding: '28px 24px', maxWidth: 380, width: '100%', textAlign: 'center', boxShadow: '0 24px 64px rgba(13,6,4,0.4)' }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: '#FAF0EE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <IconTrash size={26} color="#C4553B" stroke={1.8} />
              </div>
              <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: '#2C1A0F', letterSpacing: '-0.5px', margin: '0 0 8px' }}>Excluir "{confirmDelete.nome}"?</p>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#9B7B6A', marginBottom: 22, lineHeight: 1.5 }}>
                O investimento será desativado. Histórico de proventos será mantido caso reative depois.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setConfirmDelete(null)}
                  style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: '1.5px solid #E8E0D5', background: 'white', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, color: '#7A5C4F', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <motion.button whileTap={{ scale: 0.97 }}
                  onClick={async () => {
                    if (confirmDelete.id !== undefined) await deleteInvestimento(confirmDelete.id)
                    setConfirmDelete(null)
                  }}
                  style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: 'none', background: '#C4553B', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, color: 'white', cursor: 'pointer', boxShadow: '0 4px 12px rgba(196,85,59,0.3)' }}>
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

// ─── Subcomponentes ─────────────────────────────────────────────────
function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: 'rgba(196,195,227,0.55)', letterSpacing: '.1em', textTransform: 'uppercase', margin: 0 }}>
        {label}
      </p>
      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 18, fontWeight: 700, color: '#FFFFFF', margin: '4px 0 0', letterSpacing: '-0.3px', lineHeight: 1 }}>
        {value}
      </p>
    </div>
  )
}

function FilterChip({ children, active, cor, onClick }: {
  children: React.ReactNode
  active: boolean
  cor?: string
  onClick: () => void
}) {
  return (
    <button onClick={onClick} style={{
      background: active ? (cor ?? '#2C1A0F') : '#FFFFFF',
      color: active ? '#FFFFFF' : '#7A5C4F',
      border: `1.5px solid ${active ? (cor ?? '#2C1A0F') : '#EDE6DC'}`,
      borderRadius: 22, padding: '6px 12px', cursor: 'pointer',
      fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700,
      display: 'inline-flex', alignItems: 'center', gap: 5,
      letterSpacing: '.02em',
      transition: 'all .15s',
    }}>{children}</button>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div style={{
      background: '#FFFFFF', border: '1px dashed #D4C8BC', borderRadius: 22,
      padding: '48px 32px', textAlign: 'center',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 20,
        background: 'linear-gradient(135deg, #3A8580, #2C7470)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 24px rgba(58,133,128,0.3)',
      }}>
        <IconChartLine size={32} stroke={1.6} color="#FFFFFF" />
      </div>
      <div>
        <h3 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700, color: '#2C1A0F', margin: 0, letterSpacing: '-0.6px' }}>
          Sem investimentos cadastrados ainda
        </h3>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#7A5C4F', marginTop: 6, maxWidth: 440 }}>
          Cadastre seus CDBs, ações, FIIs, criptomoedas e mais. Acompanhe o rendimento real, defina rentabilidade automática e vincule investimentos às suas metas.
        </p>
      </div>
      <button onClick={onAdd} style={{
        background: 'linear-gradient(135deg, #D4643A, #C4553B)', color: '#FFFFFF', border: 'none',
        borderRadius: 12, padding: '11px 20px', cursor: 'pointer',
        fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700,
        display: 'flex', alignItems: 'center', gap: 6,
        boxShadow: '0 4px 16px rgba(196,85,59,0.35)', marginTop: 4,
      }}>
        <IconPlus size={16} stroke={2.5} /> Adicionar primeiro investimento
      </button>
    </div>
  )
}

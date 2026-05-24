import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  IconPlus, IconBuildingBank, IconSearch, IconWallet,
  IconTrash, IconArrowUpRight, IconArrowDownRight,
} from '@tabler/icons-react'
import { useContas, addConta, deleteConta, editConta, useSaldoTotal } from '@/db/hooks/useContas'
import { db } from '@/db/schema'
import type { Conta } from '@/db/schema'
import { fmt, mesAnoAtual } from '@/lib/format'
import { useUIStore } from '@/store/ui'
import { Modal } from '@/components/ui/Modal'
import { AccountListRow } from './AccountListRow'
import { AccountDetail } from './AccountDetail'
import { ContaForm } from './ContaForm'

export function ContasDesktop() {
  const contas = useContas()
  const saldoTotal = useSaldoTotal()
  const navigate = useNavigate()
  const { openFab } = useUIStore()
  const { mes, ano } = mesAnoAtual()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Conta | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Conta | null>(null)
  const [search, setSearch] = useState('')
  const [filterTipo, setFilterTipo] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  // Auto-seleciona conta com maior saldo na 1ª carga (derived state pattern)
  if (selectedId === null && contas.length > 0) {
    const biggest = [...contas].sort((a, b) => b.saldoAtual - a.saldoAtual)[0]
    if (biggest.id !== undefined) setSelectedId(biggest.id)
  }

  // Tipos disponíveis com contagem
  const tiposDisponiveis = useMemo(() => {
    const map = new Map<string, number>()
    contas.forEach(c => map.set(c.tipo, (map.get(c.tipo) ?? 0) + 1))
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [contas])

  // Filtragem por busca + tipo
  const contasFiltradas = useMemo(() => {
    let result = contas
    if (filterTipo) result = result.filter(c => c.tipo === filterTipo)
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(c => c.nome.toLowerCase().includes(q) || c.tipo.toLowerCase().includes(q))
    }
    return result
  }, [contas, search, filterTipo])

  // Métricas globais (header)
  const inicioMes = `${ano}-${String(mes).padStart(2, '0')}-01`
  const fimMes = `${ano}-${String(mes).padStart(2, '0')}-31`
  const txsMes = useLiveQuery(
    () => db.transacoes.where('data').between(inicioMes, fimMes, true, true).toArray(),
    [inicioMes, fimMes],
  ) ?? []
  // Métricas do header excluem transferências (transferId): elas viram
  // par despesa+receita entre contas próprias e inflariam totais 2x.
  const txsMesSemTransfer = txsMes.filter(t => !t.transferId)
  const recMes = txsMesSemTransfer.filter(t => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0)
  const desMes = txsMesSemTransfer.filter(t => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0)
  const deltaMes = recMes - desMes

  // Sparklines por conta (últimas 14 datapoints — diário)
  const ultimas30d = useMemo(() => {
    const hoje = new Date()
    const inicio = new Date(hoje)
    inicio.setDate(hoje.getDate() - 13)
    return inicio.toISOString().split('T')[0]
  }, [])
  const txs14d = useLiveQuery(
    () => db.transacoes.where('data').aboveOrEqual(ultimas30d).toArray(),
    [ultimas30d],
  ) ?? []

  const sparkByConta = useMemo(() => {
    const map = new Map<number, number[]>()
    contas.forEach(c => {
      if (c.id === undefined) return
      const hoje = new Date()
      const points: number[] = []
      let acc = c.saldoAtual
      const deltaByDay = new Map<string, number>()
      txs14d.filter(t => t.contaId === c.id).forEach(t => {
        const delta = t.tipo === 'receita' ? t.valor : -t.valor
        deltaByDay.set(t.data, (deltaByDay.get(t.data) ?? 0) + delta)
      })
      for (let i = 0; i < 14; i++) {
        const d = new Date(hoje)
        d.setDate(hoje.getDate() - i)
        const key = d.toISOString().split('T')[0]
        points.push(acc)
        acc -= deltaByDay.get(key) ?? 0
      }
      map.set(c.id, points.reverse())
    })
    return map
  }, [contas, txs14d])

  const selected = contas.find(c => c.id === selectedId) ?? null

  const openAdd = () => { setEditing(null); setFormOpen(true) }
  const openEdit = (c: Conta) => { setEditing(c); setFormOpen(true) }
  const handleSave = async (data: Omit<Conta, 'id' | 'syncId' | 'updatedAt'>) => {
    if (editing?.id) await editConta(editing.id, data)
    else await addConta(data)
  }

  // Stats compactas no topo
  const maiorSaldo = contas.length > 0 ? Math.max(...contas.map(c => c.saldoAtual)) : 0
  const contaMaior = contas.find(c => c.saldoAtual === maiorSaldo)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      style={{
        padding: 32, width: '100%',
        height: '100dvh',
        display: 'flex', flexDirection: 'column',
      }}>


      {/* Header — clean editorial */}
      <div style={{ marginBottom: 24, paddingBottom: 18, borderBottom: '1px solid #EDE6DC', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontFamily: "'Fraunces',Georgia,serif", fontWeight: 700, fontSize: 38, color: '#2C1A0F', margin: 0, letterSpacing: '-1.5px' }}>
              Contas
            </h1>
          </div>

          {/* Top KPIs inline */}
          {contas.length > 0 && (
            <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
              <TopKpi label="Saldo total" value={fmt(saldoTotal)} cor={saldoTotal >= 0 ? '#2C1A0F' : '#C4553B'} />
              <Divider />
              <TopKpi
                label="Variação no mês"
                value={`${deltaMes >= 0 ? '+' : ''}${fmt(deltaMes)}`}
                cor={deltaMes >= 0 ? '#1E7D5A' : '#C4553B'}
                icon={deltaMes >= 0
                  ? <IconArrowUpRight size={16} stroke={2.2} color="#1E7D5A" />
                  : <IconArrowDownRight size={16} stroke={2.2} color="#C4553B" />}
              />
              {contaMaior && (
                <>
                  <Divider />
                  <TopKpi label={`Maior: ${contaMaior.nome}`} value={fmt(maiorSaldo)} cor="#504E76" />
                </>
              )}

              <button onClick={openAdd}
                style={{
                  background: 'linear-gradient(135deg, #D4643A, #C4553B)', color: '#FFFFFF', border: 'none',
                  borderRadius: 12, padding: '11px 18px', cursor: 'pointer',
                  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: 6,
                  boxShadow: '0 4px 16px rgba(196,85,59,0.35)', marginLeft: 8,
                }}>
                <IconPlus size={16} stroke={2.5} /> Adicionar
              </button>
            </div>
          )}

          {contas.length === 0 && (
            <button onClick={openAdd}
              style={{
                background: 'linear-gradient(135deg, #D4643A, #C4553B)', color: '#FFFFFF', border: 'none',
                borderRadius: 12, padding: '11px 18px', cursor: 'pointer',
                fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 6,
                boxShadow: '0 4px 16px rgba(196,85,59,0.35)',
              }}>
              <IconPlus size={16} stroke={2.5} /> Adicionar
            </button>
          )}
        </div>
      </div>

      {/* Master-detail layout */}
      {contas.length === 0 ? (
        <EmptyState onAdd={openAdd} />
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '340px 1fr',
          gap: 16,
          alignItems: 'stretch',
          flex: 1,
          minHeight: 0,
        }}>
          {/* ─── LEFT: list ─── */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #EDE6DC',
            borderRadius: 22,
            boxShadow: '0 1px 3px rgba(44,26,15,0.05), 0 4px 14px rgba(44,26,15,0.04)',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            height: '100%',
            minHeight: 0,
          }}>
            {/* LOCKED HEADER — busca + filtros */}
            <div style={{
              padding: '18px 18px 14px',
              borderBottom: '1px solid #EDE6DC',
              background: '#FBF8F3',
              flexShrink: 0,
            }}>
              {/* Search bar */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: '#FFFFFF',
                border: '1px solid #EDE6DC',
                borderRadius: 10,
                padding: '9px 12px',
                marginBottom: 12,
              }}>
                <IconSearch size={14} stroke={2} color="#9B7B6A" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar conta..."
                  style={{
                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                    fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 500,
                    color: '#2C1A0F',
                  }}
                />
                {search && (
                  <button onClick={() => setSearch('')}
                    title="Limpar busca"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9B7B6A', padding: 2, fontSize: 11 }}>
                    ✕
                  </button>
                )}
              </div>

              {/* Filter chips por tipo */}
              <div style={{
                display: 'flex', gap: 5, overflowX: 'auto', overflowY: 'hidden',
                paddingBottom: 2,
                scrollbarWidth: 'none',
              }}>
                <ChipFilter
                  label="Todas"
                  count={contas.length}
                  active={filterTipo === null}
                  onClick={() => setFilterTipo(null)}
                />
                {tiposDisponiveis.map(([tipo, count]) => (
                  <ChipFilter
                    key={tipo}
                    label={tipo}
                    count={count}
                    active={filterTipo === tipo}
                    onClick={() => setFilterTipo(filterTipo === tipo ? null : tipo)}
                  />
                ))}
              </div>
            </div>

            {/* Account rows */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px 16px' }}>
              {contasFiltradas.length === 0 ? (
                <p style={{
                  padding: '24px 16px', textAlign: 'center',
                  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#9B7B6A',
                }}>Nenhuma conta encontrada</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {contasFiltradas.map(c => (
                    <AccountListRow
                      key={c.id}
                      conta={c}
                      active={selectedId === c.id}
                      spark={c.id !== undefined ? sparkByConta.get(c.id) : []}
                      onClick={() => c.id !== undefined && setSelectedId(c.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Footer da lista — contagem de contas cadastradas */}
            <div style={{
              padding: '10px 14px',
              borderTop: '1px solid #EDE6DC',
              background: '#FBF8F3',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700,
                color: '#7A5C4F', letterSpacing: '.1em', textTransform: 'uppercase',
              }}>
                Cadastradas
              </span>
              <span style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 16, fontWeight: 700,
                color: '#2C1A0F', letterSpacing: '-0.3px',
              }}>
                {contas.length} {contas.length === 1 ? 'conta' : 'contas'}
              </span>
            </div>
          </div>

          {/* ─── RIGHT: detail panel ─── */}
          {selected ? (
            <AccountDetail
              conta={selected}
              onEdit={() => openEdit(selected)}
              onLancar={() => openFab(selected.id)}
              onHistorico={() => navigate('/transacoes')}
              onDelete={() => setConfirmDelete(selected)}
            />
          ) : (
            <div style={{
              background: '#FFFFFF', border: '1px solid #EDE6DC', borderRadius: 22,
              padding: 48, textAlign: 'center',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
              height: '100%',
            }}>
              <IconWallet size={48} stroke={1.4} color="#D4C8BC" />
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#9B7B6A', margin: 0 }}>
                Selecione uma conta na lista
              </p>
            </div>
          )}
        </div>
      )}

      {/* ─── Form Modal ─── */}
      <ContaForm
        open={formOpen}
        conta={editing}
        onClose={() => { setFormOpen(false); setEditing(null) }}
        onSave={handleSave}
      />

      {/* ─── Confirm delete ─── */}
      <Modal
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        size="sm"
        title="Excluir conta?"
        subtitle={confirmDelete ? `"${confirmDelete.nome}" será desativada` : ''}
        icon={<IconTrash size={20} stroke={1.8} color="#C4553B" />}
      >
        <Modal.Body>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#7A5C4F', lineHeight: 1.5, margin: 0 }}>
            As transações associadas a esta conta serão mantidas — apenas a conta deixa de aparecer na lista. Essa ação pode ser revertida no futuro.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <button onClick={() => setConfirmDelete(null)}
            style={{ background: 'transparent', color: '#7A5C4F', border: '1.5px solid #EDE6DC', borderRadius: 12, padding: '11px 20px', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700 }}>
            Cancelar
          </button>
          <button onClick={async () => {
            if (confirmDelete?.id !== undefined) {
              const wasSelected = selectedId === confirmDelete.id
              await deleteConta(confirmDelete.id)
              setConfirmDelete(null)
              if (wasSelected) setSelectedId(null)
            }
          }}
            style={{ background: 'linear-gradient(135deg, #D4643A, #C4553B)', color: '#FFFFFF', border: 'none', borderRadius: 12, padding: '11px 22px', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 7, boxShadow: '0 4px 16px rgba(196,85,59,0.35)' }}>
            <IconTrash size={15} stroke={2.4} /> Excluir
          </button>
        </Modal.Footer>
      </Modal>
    </motion.div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────
function TopKpi({ label, value, cor, icon }: { label: string; value: string; cor: string; icon?: React.ReactNode }) {
  return (
    <div>
      <p style={{
        fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 700,
        color: '#9B7B6A', letterSpacing: '.12em', textTransform: 'uppercase', margin: 0,
      }}>{label}</p>
      <p style={{
        fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 20, fontWeight: 700,
        color: cor, margin: '4px 0 0', letterSpacing: '-0.3px', lineHeight: 1,
        display: 'inline-flex', alignItems: 'center', gap: 4,
      }}>
        {icon}{value}
      </p>
    </div>
  )
}

function Divider() {
  return <div style={{ width: 1, height: 32, background: '#EDE6DC' }} />
}

function ChipFilter({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      style={{
        background: active ? '#2C1A0F' : '#FFFFFF',
        color: active ? '#FFFFFF' : '#7A5C4F',
        border: `1px solid ${active ? '#2C1A0F' : '#EDE6DC'}`,
        borderRadius: 20,
        padding: '4px 10px',
        cursor: 'pointer',
        fontFamily: "'Plus Jakarta Sans',sans-serif",
        fontSize: 10, fontWeight: 700,
        letterSpacing: '.04em',
        display: 'inline-flex', alignItems: 'center', gap: 4,
        whiteSpace: 'nowrap', flexShrink: 0,
        textTransform: 'capitalize',
        transition: 'all .12s',
      }}>
      {label}
      <span style={{
        background: active ? 'rgba(255,255,255,0.18)' : 'rgba(122,92,79,0.12)',
        padding: '1px 6px', borderRadius: 8, fontSize: 9,
      }}>{count}</span>
    </button>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div style={{
      background: '#FFFFFF', border: '1px dashed #D4C8BC', borderRadius: 22,
      padding: '60px 32px', textAlign: 'center',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: 22,
        background: 'linear-gradient(135deg, #D4643A, #C4553B)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 12px 32px rgba(196,85,59,0.35)',
      }}>
        <IconBuildingBank size={36} stroke={1.6} color="#FFFFFF" />
      </div>
      <div>
        <h3 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 26, fontWeight: 700, color: '#2C1A0F', margin: 0, letterSpacing: '-0.8px' }}>
          Adicione sua primeira conta
        </h3>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#7A5C4F', marginTop: 8, maxWidth: 480 }}>
          Cadastre contas bancárias e carteiras com logo customizado.
          Acompanhe saldo, movimentações e tenha controle total das suas finanças.
        </p>
      </div>
      <button onClick={onAdd} style={{
        background: 'linear-gradient(135deg, #D4643A, #C4553B)', color: '#FFFFFF', border: 'none',
        borderRadius: 12, padding: '12px 22px', cursor: 'pointer',
        fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700,
        display: 'flex', alignItems: 'center', gap: 6,
        boxShadow: '0 6px 18px rgba(196,85,59,0.35)', marginTop: 6,
      }}>
        <IconPlus size={16} stroke={2.5} /> Adicionar conta
      </button>
    </div>
  )
}

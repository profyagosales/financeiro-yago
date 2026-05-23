import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  IconPlus, IconCreditCard, IconSearch, IconTrash,
} from '@tabler/icons-react'
import { useCartoes, deleteCartao } from '@/db/hooks/useCartoes'
import type { Cartao, LancamentoCartao } from '@/db/schema'
import { db } from '@/db/schema'
import { fmt, mesAnoAtual } from '@/lib/format'
import { Modal } from '@/components/ui/Modal'
import { CartaoListRow } from './CartaoListRow'
import { CartaoDetail } from './CartaoDetail'
import { CartaoForm } from './CartaoForm'
import { LancamentoForm } from './LancamentoForm'

export function Page() {
  const cartoes = useCartoes()
  const { mes, ano } = mesAnoAtual()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Cartao | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Cartao | null>(null)
  const [search, setSearch] = useState('')
  const [filterBandeira, setFilterBandeira] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  // Lançamento modal state
  const [lancOpen, setLancOpen] = useState(false)
  const [lancMes, setLancMes] = useState(mes)
  const [lancAno, setLancAno] = useState(ano)
  const [lancEditing, setLancEditing] = useState<LancamentoCartao | null>(null)

  // Auto-seleciona cartão com maior fatura na 1ª carga
  useEffect(() => {
    if (selectedId === null && cartoes.length > 0) {
      const first = cartoes[0]
      if (first.id !== undefined) setSelectedId(first.id)
    }
  }, [cartoes, selectedId])

  // Total de fatura do mês corrente (todos cartões somados)
  // Note: `[mes+ano]` não está indexado no schema. Usa o índice `mes`
  // e filtra `ano` em JS — simples e suficiente.
  const todasLancsMes = useLiveQuery(
    () => db.lancamentosCartao.where('mes').equals(mes).and(l => l.ano === ano).toArray(),
    [mes, ano],
  ) ?? []
  const faturaTotalMes = todasLancsMes.reduce((s, l) => s + l.valor, 0)
  const limiteTotal = cartoes.reduce((s, c) => s + c.limite, 0)

  // Bandeiras únicas
  const bandeirasDisponiveis = useMemo(() => {
    const map = new Map<string, number>()
    cartoes.forEach(c => {
      const b = c.bandeira.toLowerCase()
      map.set(b, (map.get(b) ?? 0) + 1)
    })
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [cartoes])

  // Filtragem
  const cartoesFiltrados = useMemo(() => {
    let r = cartoes
    if (filterBandeira) r = r.filter(c => c.bandeira.toLowerCase() === filterBandeira)
    if (search) {
      const q = search.toLowerCase()
      r = r.filter(c => c.nome.toLowerCase().includes(q) || c.bandeira.toLowerCase().includes(q))
    }
    return r
  }, [cartoes, search, filterBandeira])

  const selected = cartoes.find(c => c.id === selectedId) ?? null

  const openAdd = () => { setEditing(null); setFormOpen(true) }
  const openEdit = (c: Cartao) => { setEditing(c); setFormOpen(true) }

  const openLancar = (m: number, a: number, l?: LancamentoCartao) => {
    setLancMes(m); setLancAno(a)
    setLancEditing(l ?? null)
    setLancOpen(true)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      style={{
        padding: 32, width: '100%',
        height: '100dvh',
        display: 'flex', flexDirection: 'column',
      }}>

      {/* Header */}
      <div style={{ marginBottom: 24, paddingBottom: 18, borderBottom: '1px solid #EDE6DC', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
          <h1 style={{ fontFamily: "'Fraunces',Georgia,serif", fontWeight: 700, fontSize: 38, color: '#2C1A0F', margin: 0, letterSpacing: '-1.5px' }}>
            Cartões
          </h1>

          {cartoes.length > 0 && (
            <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
              <TopKpi label="Fatura do mês" value={fmt(faturaTotalMes)} cor="#C4553B" />
              <Divider />
              <TopKpi label="Limite total" value={fmt(limiteTotal)} cor="#504E76" />
              <Divider />
              <TopKpi label="Disponível" value={fmt(Math.max(0, limiteTotal - faturaTotalMes))} cor="#1E7D5A" />

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
          {cartoes.length === 0 && (
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

      {cartoes.length === 0 ? (
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
            {/* LOCKED top */}
            <div style={{
              padding: '18px 18px 14px',
              borderBottom: '1px solid #EDE6DC',
              background: '#FBF8F3',
              flexShrink: 0,
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: '#FFFFFF',
                border: '1px solid #EDE6DC',
                borderRadius: 10, padding: '9px 12px',
                marginBottom: 12,
              }}>
                <IconSearch size={14} stroke={2} color="#9B7B6A" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar cartão..."
                  style={{
                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                    fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 500,
                    color: '#2C1A0F',
                  }}
                />
                {search && (
                  <button onClick={() => setSearch('')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9B7B6A', padding: 2, fontSize: 11 }}>✕</button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 5, overflowX: 'auto', overflowY: 'hidden', paddingBottom: 2, scrollbarWidth: 'none' }}>
                <ChipFilter
                  label="Todas"
                  count={cartoes.length}
                  active={filterBandeira === null}
                  onClick={() => setFilterBandeira(null)}
                />
                {bandeirasDisponiveis.map(([b, c]) => (
                  <ChipFilter
                    key={b}
                    label={b}
                    count={c}
                    active={filterBandeira === b}
                    onClick={() => setFilterBandeira(filterBandeira === b ? null : b)}
                  />
                ))}
              </div>
            </div>

            {/* Scrollable rows */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px 16px' }}>
              {cartoesFiltrados.length === 0 ? (
                <p style={{ padding: '24px 16px', textAlign: 'center', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#9B7B6A' }}>
                  Nenhum cartão encontrado
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {cartoesFiltrados.map(c => (
                    <CartaoListRow
                      key={c.id}
                      cartao={c}
                      active={selectedId === c.id}
                      onClick={() => c.id !== undefined && setSelectedId(c.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Footer da lista */}
            <div style={{
              padding: '10px 14px',
              borderTop: '1px solid #EDE6DC',
              background: '#FBF8F3',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: '#7A5C4F', letterSpacing: '.1em', textTransform: 'uppercase' }}>
                Cadastrados
              </span>
              <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 16, fontWeight: 700, color: '#2C1A0F', letterSpacing: '-0.3px' }}>
                {cartoes.length} {cartoes.length === 1 ? 'cartão' : 'cartões'}
              </span>
            </div>
          </div>

          {/* ─── RIGHT: detail ─── */}
          {selected ? (
            <CartaoDetail
              cartao={selected}
              onEdit={() => openEdit(selected)}
              onDelete={() => setConfirmDelete(selected)}
              onLancar={openLancar}
            />
          ) : (
            <div style={{
              background: '#FFFFFF', border: '1px solid #EDE6DC', borderRadius: 22,
              padding: 48, textAlign: 'center',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
              height: '100%',
            }}>
              <IconCreditCard size={48} stroke={1.4} color="#D4C8BC" />
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#9B7B6A', margin: 0 }}>
                Selecione um cartão na lista
              </p>
            </div>
          )}
        </div>
      )}

      {/* ─── Form modal ─── */}
      <CartaoForm
        open={formOpen}
        cartao={editing}
        onClose={() => { setFormOpen(false); setEditing(null) }}
      />

      {/* ─── Lançamento modal ─── */}
      {selected && (
        <LancamentoForm
          open={lancOpen}
          cartao={selected}
          lancamento={lancEditing}
          mes={lancMes}
          ano={lancAno}
          onClose={() => { setLancOpen(false); setLancEditing(null) }}
        />
      )}

      {/* ─── Confirm delete card ─── */}
      <Modal
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        size="sm"
        title="Excluir cartão?"
        subtitle={confirmDelete ? `"${confirmDelete.nome}" será desativado` : ''}
        icon={<IconTrash size={20} stroke={1.8} color="#C4553B" />}
      >
        <Modal.Body>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#7A5C4F', lineHeight: 1.5, margin: 0 }}>
            Os lançamentos e parcelas associadas serão mantidos, mas o cartão deixa de aparecer na lista.
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
              await deleteCartao(confirmDelete.id)
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
function TopKpi({ label, value, cor }: { label: string; value: string; cor: string }) {
  return (
    <div>
      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 700, color: '#9B7B6A', letterSpacing: '.12em', textTransform: 'uppercase', margin: 0 }}>
        {label}
      </p>
      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 20, fontWeight: 700, color: cor, margin: '4px 0 0', letterSpacing: '-0.3px', lineHeight: 1 }}>
        {value}
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
        borderRadius: 20, padding: '4px 10px', cursor: 'pointer',
        fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700,
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
      flex: 1,
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: 22,
        background: 'linear-gradient(135deg, #820AD1, #6710A8)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 12px 32px rgba(130,10,209,0.35)',
      }}>
        <IconCreditCard size={36} stroke={1.6} color="#FFFFFF" />
      </div>
      <div>
        <h3 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 26, fontWeight: 700, color: '#2C1A0F', margin: 0, letterSpacing: '-0.8px' }}>
          Adicione seu primeiro cartão
        </h3>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#7A5C4F', marginTop: 8, maxWidth: 480 }}>
          Cadastre cartões de crédito com bandeira, limite e logo personalizado.
          Acompanhe faturas, parcelas e categorias mês a mês.
        </p>
      </div>
      <button onClick={onAdd} style={{
        background: 'linear-gradient(135deg, #D4643A, #C4553B)', color: '#FFFFFF', border: 'none',
        borderRadius: 12, padding: '12px 22px', cursor: 'pointer',
        fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700,
        display: 'flex', alignItems: 'center', gap: 6,
        boxShadow: '0 6px 18px rgba(196,85,59,0.35)', marginTop: 6,
      }}>
        <IconPlus size={16} stroke={2.5} /> Adicionar cartão
      </button>
    </div>
  )
}

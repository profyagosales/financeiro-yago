import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { IconPlus, IconBuildingBank, IconTrash, IconWallet, IconTrendingUp, IconChartLine } from '@tabler/icons-react'
import { useContas, addConta, deleteConta, editConta, useSaldoTotal } from '@/db/hooks/useContas'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/schema'
import type { Conta } from '@/db/schema'
import { fmt, mesAnoAtual } from '@/lib/format'
import { useUIStore } from '@/store/ui'
import { Modal } from '@/components/ui/Modal'
import { ContaCard } from './ContaCard'
import { ContaForm } from './ContaForm'

export function Page() {
  const contas = useContas()
  const saldoTotal = useSaldoTotal()
  const navigate = useNavigate()
  const { openFab } = useUIStore()
  const { mes, ano } = mesAnoAtual()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Conta | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Conta | null>(null)

  // Métricas do mês por conta — pra mostrar nos cards
  const inicioMes = `${ano}-${String(mes).padStart(2, '0')}-01`
  const fimMes = `${ano}-${String(mes).padStart(2, '0')}-31`
  const txsMes = useLiveQuery(
    () => db.transacoes.where('data').between(inicioMes, fimMes, true, true).toArray(),
    [inicioMes, fimMes],
  ) ?? []

  const metricsByConta = useMemo(() => {
    const map = new Map<number, { count: number; ultimaData?: string; deltaMes: number }>()
    contas.forEach(c => {
      if (c.id !== undefined) map.set(c.id, { count: 0, deltaMes: 0 })
    })
    txsMes.forEach(t => {
      const m = map.get(t.contaId)
      if (!m) return
      m.count += 1
      const delta = t.tipo === 'receita' ? t.valor : -t.valor
      m.deltaMes += delta
      if (!m.ultimaData || t.data > m.ultimaData) m.ultimaData = t.data
    })
    return map
  }, [contas, txsMes])

  const formatRelDate = (data?: string): string | null => {
    if (!data) return null
    const d = new Date(data + 'T00:00:00')
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
    const ontem = new Date(hoje); ontem.setDate(ontem.getDate() - 1)
    if (d.getTime() === hoje.getTime()) return 'hoje'
    if (d.getTime() === ontem.getTime()) return 'ontem'
    const diff = Math.round((hoje.getTime() - d.getTime()) / 86400000)
    if (diff > 0 && diff < 7) return `há ${diff} dias`
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  }

  const maiorSaldo = contas.length > 0 ? Math.max(...contas.map(c => c.saldoAtual)) : 0
  const contasAtivas = contas.filter(c => c.ativo).length

  const openAdd = () => { setEditing(null); setFormOpen(true) }
  const openEdit = (c: Conta) => { setEditing(c); setFormOpen(true) }

  const handleSave = async (data: Omit<Conta, 'id' | 'syncId' | 'updatedAt'>) => {
    if (editing?.id) {
      await editConta(editing.id, data)
    } else {
      await addConta(data)
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: 32, width: '100%' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, paddingBottom: 18, borderBottom: '1px solid #EDE6DC' }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces',Georgia,serif", fontWeight: 700, fontSize: 38, color: '#2C1A0F', margin: 0, letterSpacing: '-1.5px' }}>Contas</h1>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#9B7B6A', marginTop: 4 }}>
            {contas.length > 0
              ? `${contas.length} ${contas.length === 1 ? 'conta cadastrada' : 'contas cadastradas'}`
              : 'Gerencie suas contas bancárias e carteiras'}
          </p>
        </div>
        <button onClick={openAdd}
          style={{
            background: 'linear-gradient(135deg, #D4643A, #C4553B)', color: '#FFFFFF', border: 'none',
            borderRadius: 12, padding: '11px 18px', cursor: 'pointer',
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 6,
            boxShadow: '0 4px 16px rgba(196,85,59,0.35)', flexShrink: 0,
          }}>
          <IconPlus size={16} stroke={2.5} /> Adicionar
        </button>
      </div>

      {contas.length === 0 ? (
        <EmptyState onAdd={openAdd} />
      ) : (
        <>
          {/* KPI strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
            <KpiCard
              icon={<IconWallet size={18} stroke={1.8} color={saldoTotal >= 0 ? '#3A8580' : '#C4553B'} />}
              label="Saldo total"
              value={fmt(saldoTotal)}
              cor={saldoTotal >= 0 ? '#3A8580' : '#C4553B'}
            />
            <KpiCard
              icon={<IconBuildingBank size={18} stroke={1.8} color="#504E76" />}
              label="Contas ativas"
              value={`${contasAtivas} ${contasAtivas === 1 ? 'conta' : 'contas'}`}
              cor="#504E76"
            />
            <KpiCard
              icon={<IconTrendingUp size={18} stroke={1.8} color="#1E7D5A" />}
              label="Maior saldo"
              value={fmt(maiorSaldo)}
              cor="#1E7D5A"
            />
          </div>

          {/* Grid de contas */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: 14,
            alignItems: 'stretch',
          }}>
            {contas.map(c => {
              const m = c.id !== undefined ? metricsByConta.get(c.id) : undefined
              const saldoAnterior = c.saldoAtual - (m?.deltaMes ?? 0)
              const variacao = saldoAnterior !== 0
                ? (((c.saldoAtual - saldoAnterior) / Math.abs(saldoAnterior)) * 100)
                : null
              return (
                <ContaCard
                  key={c.id}
                  conta={c}
                  variacaoPct={variacao}
                  ultimaMovimentacao={formatRelDate(m?.ultimaData)}
                  transacoesMes={m?.count ?? 0}
                  onEdit={() => openEdit(c)}
                  onLancar={() => openFab(c.id)}
                  onHistorico={() => navigate('/transacoes')}
                  onDelete={() => setConfirmDelete(c)}
                />
              )
            })}
          </div>
        </>
      )}

      {/* ─── Form Modal (wide) ─── */}
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
              await deleteConta(confirmDelete.id)
              setConfirmDelete(null)
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

function KpiCard({ icon, label, value, cor }: { icon: React.ReactNode; label: string; value: string; cor: string }) {
  return (
    <div style={{
      background: '#FFFFFF', border: '1px solid #EDE6DC',
      borderRadius: 16, padding: '16px 20px',
      boxShadow: '0 1px 3px rgba(44,26,15,0.05), 0 2px 10px rgba(44,26,15,0.04)',
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        {icon}
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: '#9B7B6A', letterSpacing: '.12em', textTransform: 'uppercase', margin: 0 }}>
          {label}
        </p>
      </div>
      <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 24, fontWeight: 700, color: cor, margin: 0, letterSpacing: '-0.8px', lineHeight: 1 }}>
        {value}
      </p>
    </div>
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
        width: 68, height: 68, borderRadius: 20,
        background: 'linear-gradient(135deg, #D4643A, #C4553B)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 10px 28px rgba(196,85,59,0.32)',
      }}>
        <IconBuildingBank size={32} stroke={1.6} color="#FFFFFF" />
      </div>
      <div>
        <h3 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 24, fontWeight: 700, color: '#2C1A0F', margin: 0, letterSpacing: '-0.7px' }}>
          Adicione sua primeira conta
        </h3>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#7A5C4F', marginTop: 8, maxWidth: 480 }}>
          Cadastre suas contas bancárias e carteiras com logo customizado.
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

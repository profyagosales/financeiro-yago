import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import {
  IconPlus, IconHistory, IconEdit, IconTrash, IconArrowUpRight, IconArrowDownRight,
  IconCalendar, IconArrowsUpDown, IconWallet, IconReceipt,
} from '@tabler/icons-react'
import type { Conta, Transacao, Categoria } from '@/db/schema'
import { db } from '@/db/schema'
import { useLiveQuery } from 'dexie-react-hooks'
import { useCategorias } from '@/db/hooks/useCategorias'
import { fmt } from '@/lib/format'
import { BankLogo } from '@/components/ui/BankLogo'
import { CategoryIcon } from '@/components/ui/CategoryIcon'

interface Props {
  conta: Conta
  onEdit: () => void
  onLancar: () => void
  onHistorico: () => void
  onDelete: () => void
}

export function AccountDetail({ conta, onEdit, onLancar, onHistorico, onDelete }: Props) {
  const categorias = useCategorias()
  const catById = useMemo(() => new Map(categorias.map(c => [c.id!, c])), [categorias])

  // Transações dessa conta (todas)
  const todasTxs = useLiveQuery(
    () => db.transacoes.where('contaId').equals(conta.id!).reverse().sortBy('data'),
    [conta.id],
  ) ?? []

  // Janela de 30 dias
  const hoje = new Date()
  const trintaDiasAtras = new Date(hoje)
  trintaDiasAtras.setDate(hoje.getDate() - 29)
  const inicio30Str = trintaDiasAtras.toISOString().split('T')[0]
  const txs30d = todasTxs.filter(t => t.data >= inicio30Str)

  // Métricas
  const receitas30d = txs30d.filter(t => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0)
  const despesas30d = txs30d.filter(t => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0)
  const delta30d = receitas30d - despesas30d
  const saldoAnterior = conta.saldoAtual - delta30d
  const trendPct = saldoAnterior !== 0 ? (delta30d / Math.abs(saldoAnterior)) * 100 : null
  const positivo = delta30d >= 0

  // Chart de evolução diária (30 dias)
  // Reconstrói saldo histórico subtraindo deltas indo de hoje pra trás
  const chartData = useMemo(() => {
    const pts: { dia: string; saldo: number; dateKey: string }[] = []
    let acc = conta.saldoAtual
    // Map: para cada dia, soma os deltas
    const deltaByDay = new Map<string, number>()
    txs30d.forEach(t => {
      const delta = t.tipo === 'receita' ? t.valor : -t.valor
      deltaByDay.set(t.data, (deltaByDay.get(t.data) ?? 0) + delta)
    })
    // De hoje pra trás, 30 dias
    for (let i = 0; i < 30; i++) {
      const d = new Date(hoje)
      d.setDate(hoje.getDate() - i)
      const key = d.toISOString().split('T')[0]
      pts.push({
        dateKey: key,
        dia: d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', ''),
        saldo: acc,
      })
      acc -= deltaByDay.get(key) ?? 0
    }
    return pts.reverse()
  }, [conta.saldoAtual, txs30d])

  // Últimas 6 transações
  const ultimasTxs = todasTxs.slice(0, 6)

  const negativo = conta.saldoAtual < 0
  const corSaldo = negativo ? '#C4553B' : '#2C1A0F'

  return (
    <motion.div
      key={conta.id}
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        background: '#FFFFFF',
        border: '1px solid #EDE6DC',
        borderRadius: 22,
        boxShadow: '0 1px 3px rgba(44,26,15,0.05), 0 6px 20px rgba(44,26,15,0.06)',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* ─── LOCKED HEADER (sticky) — só identificação ─── */}
      <div style={{
        position: 'relative',
        background: `linear-gradient(135deg, ${conta.cor}18 0%, ${conta.cor}05 100%)`,
        padding: '22px 28px',
        borderBottom: '1px solid #EDE6DC',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <BankLogo logo={conta.logo} nome={conta.nome} cor={conta.cor} size={64} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h2 style={{
                fontFamily: "'Fraunces',Georgia,serif",
                fontSize: 26, fontWeight: 700,
                color: '#2C1A0F', margin: 0,
                letterSpacing: '-0.8px', lineHeight: 1.05,
              }}>{conta.nome}</h2>
              <span style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontSize: 10, fontWeight: 700,
                color: conta.cor, background: `${conta.cor}1A`,
                border: `1px solid ${conta.cor}40`,
                padding: '3px 10px', borderRadius: 7,
                letterSpacing: '.08em', textTransform: 'uppercase',
              }}>{conta.tipo}</span>
            </div>
            <p style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 11, fontWeight: 500,
              color: '#9B7B6A', margin: '6px 0 0',
            }}>
              {todasTxs.length} {todasTxs.length === 1 ? 'transação registrada' : 'transações registradas'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button onClick={onEdit} title="Editar" style={ICON_BTN}>
              <IconEdit size={14} stroke={1.8} color="#7A5C4F" />
            </button>
            <button onClick={onDelete} title="Excluir" style={{ ...ICON_BTN, background: '#FAEAEA' }}>
              <IconTrash size={14} stroke={2} color="#C4553B" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── SCROLLABLE BODY (saldo + chart + tx) ─── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>

        {/* Saldo + trend + ações primárias */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
            <div>
              <p style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontSize: 10, fontWeight: 700,
                color: '#9B7B6A', letterSpacing: '.14em', textTransform: 'uppercase', margin: 0,
              }}>Saldo atual</p>
              <p style={{
                fontFamily: "'Fraunces',Georgia,serif",
                fontSize: 48, fontWeight: 700,
                color: corSaldo,
                letterSpacing: '-2px', lineHeight: 1,
                margin: '4px 0 0',
              }}>{fmt(conta.saldoAtual)}</p>
            </div>
            {trendPct !== null && Math.abs(trendPct) > 0.1 && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700,
                color: positivo ? '#1E7D5A' : '#C4553B',
                background: positivo ? 'rgba(58,133,128,0.14)' : 'rgba(196,85,59,0.14)',
                border: `1px solid ${positivo ? 'rgba(58,133,128,0.35)' : 'rgba(196,85,59,0.35)'}`,
                padding: '4px 10px', borderRadius: 16,
                letterSpacing: '.02em',
              }}>
                {positivo ? <IconArrowUpRight size={12} stroke={2.4} /> : <IconArrowDownRight size={12} stroke={2.4} />}
                {positivo ? '+' : ''}{fmt(delta30d)} ({Math.abs(trendPct).toFixed(1)}%) em 30d
              </span>
            )}
          </div>

          {/* Primary actions */}
          <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
            <button onClick={onLancar}
              style={{
                background: conta.cor, color: '#FFFFFF', border: 'none',
                borderRadius: 12, padding: '11px 18px', cursor: 'pointer',
                fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', gap: 6,
                boxShadow: `0 4px 16px ${conta.cor}50`,
                letterSpacing: '.02em',
              }}>
              <IconPlus size={15} stroke={2.5} /> Nova transação
            </button>
            <button onClick={onHistorico}
              style={{
                background: '#FFFFFF', color: '#2C1A0F', border: '1px solid #EDE6DC',
                borderRadius: 12, padding: '11px 16px', cursor: 'pointer',
                fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', gap: 6,
                letterSpacing: '.02em',
              }}>
              <IconHistory size={14} stroke={2} /> Histórico completo
            </button>
          </div>
        </div>

        {/* 3 quick stats 30d */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
          <QuickStat
            icon={<IconArrowUpRight size={14} stroke={2} color="#1E7D5A" />}
            label="Entradas 30d"
            value={fmt(receitas30d)}
            cor="#1E7D5A"
          />
          <QuickStat
            icon={<IconArrowDownRight size={14} stroke={2} color="#C4553B" />}
            label="Saídas 30d"
            value={fmt(despesas30d)}
            cor="#C4553B"
          />
          <QuickStat
            icon={<IconArrowsUpDown size={14} stroke={2} color="#7A5C4F" />}
            label="Transações 30d"
            value={String(txs30d.length)}
            cor="#7A5C4F"
          />
        </div>

        {/* Chart de 30 dias */}
        <section style={{ marginBottom: 24 }}>
          <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
            <h3 style={{
              fontFamily: "'Fraunces',Georgia,serif", fontSize: 16, fontWeight: 700,
              color: '#2C1A0F', margin: 0, letterSpacing: '-0.4px',
            }}>Saldo nos últimos 30 dias</h3>
          </header>
          <div style={{ width: '100%', height: 180 }}>
            <ResponsiveContainer>
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id={`grad-${conta.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={conta.cor} stopOpacity={0.32}/>
                    <stop offset="100%" stopColor={conta.cor} stopOpacity={0.02}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(44,26,15,0.05)" vertical={false} />
                <XAxis dataKey="dia"
                  tick={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, fill: '#9B7B6A' }}
                  axisLine={false} tickLine={false}
                  interval={Math.max(0, Math.floor(chartData.length / 6) - 1)}
                />
                <YAxis
                  tick={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 10, fill: '#9B7B6A' }}
                  axisLine={false} tickLine={false}
                  tickFormatter={v => Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(Math.round(v))}
                  width={40}
                />
                <Tooltip
                  content={({ active, payload }) => active && payload?.[0] ? (
                    <div style={{ background: '#1A0A05', borderRadius: 10, padding: '8px 12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <p style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 10, color: 'rgba(255,255,255,0.45)', letterSpacing: '.06em', textTransform: 'uppercase', margin: 0 }}>{payload[0].payload.dia}</p>
                      <p style={{ fontFamily: 'Fraunces, serif', fontSize: 14, fontWeight: 700, color: '#fff', margin: '4px 0 0' }}>{fmt(payload[0].value as number)}</p>
                    </div>
                  ) : null}
                />
                <Area type="monotone" dataKey="saldo"
                  stroke={conta.cor} strokeWidth={2.4}
                  fill={`url(#grad-${conta.id})`}
                  dot={false}
                  activeDot={{ r: 4, fill: conta.cor, strokeWidth: 2, stroke: '#FFFFFF' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Últimas transações */}
        <section>
          <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{
              fontFamily: "'Fraunces',Georgia,serif", fontSize: 16, fontWeight: 700,
              color: '#2C1A0F', margin: 0, letterSpacing: '-0.4px',
            }}>Últimas transações</h3>
            <button onClick={onHistorico}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700,
                color: '#C4553B', letterSpacing: '.04em',
              }}>
              Ver tudo →
            </button>
          </header>

          {ultimasTxs.length === 0 ? (
            <EmptyTransactions onLancar={onLancar} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {ultimasTxs.map(tx => (
                <TransactionRow key={tx.id} tx={tx} cat={catById.get(tx.categoriaId)} />
              ))}
            </div>
          )}
        </section>
      </div>
    </motion.div>
  )
}

// ─── Subcomponentes ─────────────────────────────────────────────────
function QuickStat({ icon, label, value, cor }: { icon: React.ReactNode; label: string; value: string; cor: string }) {
  return (
    <div style={{
      background: '#FBF8F3',
      border: '1px solid #EDE6DC',
      borderRadius: 12, padding: '10px 12px',
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        {icon}
        <p style={{
          fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 700,
          color: '#7A5C4F', letterSpacing: '.1em', textTransform: 'uppercase', margin: 0,
        }}>{label}</p>
      </div>
      <p style={{
        fontFamily: "'Fraunces',Georgia,serif", fontSize: 17, fontWeight: 700,
        color: cor, margin: 0, letterSpacing: '-0.5px', lineHeight: 1,
      }}>{value}</p>
    </div>
  )
}

function TransactionRow({ tx, cat }: { tx: Transacao; cat?: Categoria }) {
  const isReceita = tx.tipo === 'receita'
  const dataFmt = new Date(tx.data + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 4px', borderRadius: 10,
      transition: 'background .12s',
    }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#FBF8F3'}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
    >
      {cat ? (
        <CategoryIcon nome={cat.nome} cor={cat.cor} size={34} radius={9} />
      ) : (
        <div style={{
          width: 34, height: 34, borderRadius: 9,
          background: 'rgba(122,92,79,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <IconReceipt size={16} stroke={1.8} color="#7A5C4F" />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 600,
          color: '#2C1A0F', margin: 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{tx.descricao || cat?.nome || 'Sem descrição'}</p>
        <p style={{
          fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11,
          color: '#9B7B6A', margin: '2px 0 0',
        }}>{cat?.nome ?? '—'} · {dataFmt}</p>
      </div>
      <span style={{
        fontFamily: "'Fraunces',Georgia,serif", fontSize: 15, fontWeight: 700,
        color: isReceita ? '#1E7D5A' : '#2C1A0F',
        letterSpacing: '-0.4px', flexShrink: 0,
      }}>
        {isReceita ? '+' : '−'}{fmt(tx.valor)}
      </span>
    </div>
  )
}

function EmptyTransactions({ onLancar }: { onLancar: () => void }) {
  return (
    <div style={{
      padding: '32px 24px', textAlign: 'center',
      background: '#FBF8F3', border: '1px dashed #EDE6DC', borderRadius: 14,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: 'rgba(122,92,79,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <IconWallet size={22} stroke={1.6} color="#7A5C4F" />
      </div>
      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#7A5C4F', margin: 0 }}>
        Nenhuma transação nessa conta ainda
      </p>
      <button onClick={onLancar}
        style={{
          background: 'transparent', color: '#C4553B', border: '1px solid #C4553B',
          borderRadius: 10, padding: '7px 14px', cursor: 'pointer',
          fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700,
          display: 'inline-flex', alignItems: 'center', gap: 5,
        }}>
        <IconPlus size={13} stroke={2.4} /> Lançar primeira
      </button>
    </div>
  )
}

const ICON_BTN: React.CSSProperties = {
  background: '#FFFFFF', border: '1px solid #EDE6DC',
  borderRadius: 9, width: 32, height: 32, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0, transition: 'background .15s',
}

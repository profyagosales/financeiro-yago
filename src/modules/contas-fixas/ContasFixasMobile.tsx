// ─── Contas-fixas mobile — agrupadas por status + tap pra detail ────
// Identidade peach gradient + glass. Próxima a vencer em destaque,
// lista agrupada (Pendentes / Pagas), tap abre StackScreen com edição.
// CTA específico "Nova conta fixa" no header (não duplica FAB de
// transação porque cria template recorrente, não transação avulsa).

import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  IconPlus, IconChevronLeft, IconChevronRight, IconCheck, IconClock,
  IconAlertTriangle, IconCircleCheck, IconTrash, IconPencil, IconCalendarTime,
  IconBuildingBank, IconCreditCard, IconRepeat, IconCalendarDue,
} from '@tabler/icons-react'
import { useContasFixas, usePagamentosFixos, addContaFixa, editContaFixa, marcarPago, marcarPendente, deleteContaFixa } from '@/db/hooks/useContasFixas'
import { useContas } from '@/db/hooks/useContas'
import { useCartoes } from '@/db/hooks/useCartoes'
import { useCategorias } from '@/db/hooks/useCategorias'
import type { ContaFixa } from '@/db/schema'
import { fmt } from '@/lib/format'
import { LegacyModalShell } from '@/components/ui/LegacyModalShell'
import { IconX } from '@tabler/icons-react'
import { sounds, haptic } from '@/lib/sounds'

// ─── Tokens ────────────────────────────────────────────────────────
const C = {
  bgTop:    '#FFE2C7',
  bgMid:    '#FFF1DE',
  bgBottom: '#FFE9D7',
  ink:      '#2C1A0F',
  inkSoft:  '#5C4339',
  muted:    '#9B7B6A',
  purple:   '#2A1E3F',
  orange:   '#C4553B',
  orangeBri:'#F1642E',
  gold:     '#D4A017',
  green:    '#1E7D5A',
  glass:        'rgba(255,255,255,0.65)',
  glassStrong:  'rgba(255,255,255,0.85)',
  glassBorder:  'rgba(255,255,255,0.7)',
  glassShadow:  '0 1px 2px rgba(196,85,59,0.06), 0 8px 24px rgba(196,85,59,0.08)',
}

const PAGE = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
}
const ITEM = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 200, damping: 24 } },
}

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const MESES_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

// ─── Page ──────────────────────────────────────────────────────────

export function ContasFixasMobile() {
  const today = new Date()
  const [view, setView] = useState({ mes: today.getMonth() + 1, ano: today.getFullYear() })
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  const contasFixas = useContasFixas()
  const pagamentos = usePagamentosFixos(view.mes, view.ano)
  const categorias = useCategorias('despesa')
  const contas = useContas()
  const cartoes = useCartoes()

  const catMap = useMemo(() => new Map(categorias.map(c => [c.id!, c])), [categorias])
  const pgtoMap = useMemo(() => new Map(pagamentos.map(p => [p.contaFixaId, p])), [pagamentos])
  const contaMap = useMemo(() => new Map(contas.map(c => [c.id!, c])), [contas])
  const cartaoMap = useMemo(() => new Map(cartoes.map(c => [c.id!, c])), [cartoes])

  // Totais
  const totalMes = contasFixas.reduce((s, cf) => s + cf.valor, 0)
  const fixasPagas = contasFixas.filter(cf => pgtoMap.get(cf.id!)?.status === 'pago')
  const fixasPendentes = contasFixas.filter(cf => pgtoMap.get(cf.id!)?.status !== 'pago')
  const totalPago = fixasPagas.reduce((s, cf) => s + cf.valor, 0)
  const totalPendente = totalMes - totalPago
  const pctPago = totalMes > 0 ? (totalPago / totalMes) * 100 : 0

  // Próxima a vencer
  const isCurrentMonth = view.mes === today.getMonth() + 1 && view.ano === today.getFullYear()
  const proximaPendente = useMemo(() => {
    const hoje = today.getDate()
    return [...fixasPendentes]
      .map(cf => ({ cf, dias: cf.diaVencimento - (isCurrentMonth ? hoje : 0) }))
      .filter(x => x.dias >= 0)
      .sort((a, b) => a.dias - b.dias)[0] ?? null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixasPendentes, isCurrentMonth])

  // Ordenação: por dia do mês
  const pendentesSorted = [...fixasPendentes].sort((a, b) => a.diaVencimento - b.diaVencimento)
  const pagasSorted = [...fixasPagas].sort((a, b) => a.diaVencimento - b.diaVencimento)

  function shiftMes(delta: number) {
    const d = new Date(view.ano, view.mes - 1 + delta, 1)
    setView({ mes: d.getMonth() + 1, ano: d.getFullYear() })
  }

  const editing = editingId !== null ? contasFixas.find(cf => cf.id === editingId) ?? null : null

  return (
    <div style={{
      position: 'relative', minHeight: '100dvh', width: '100%',
      background: `linear-gradient(180deg, ${C.bgTop} 0%, ${C.bgMid} 35%, ${C.bgBottom} 100%)`,
    }}>
      {/* Halos */}
      <div aria-hidden style={{
        position: 'absolute', right: -80, top: -120,
        width: 340, height: 340, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(241,100,46,0.18), transparent 65%)',
        filter: 'blur(20px)', pointerEvents: 'none',
      }} />
      <div aria-hidden style={{
        position: 'absolute', left: -100, bottom: -80,
        width: 320, height: 320, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(212,160,23,0.16), transparent 60%)',
        filter: 'blur(28px)', pointerEvents: 'none',
      }} />

      <motion.div
        variants={PAGE} initial="hidden" animate="show"
        style={{
          position: 'relative',
          padding: '16px 18px',
          paddingTop: 'calc(20px + env(safe-area-inset-top))',
          paddingBottom: 'calc(100px + env(safe-area-inset-bottom))',
          display: 'flex', flexDirection: 'column',
          gap: 16,
        }}>

        {/* HEADER */}
        <motion.header variants={ITEM}
          style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h1 style={{
              fontFamily: "'Fraunces',Georgia,serif",
              fontSize: 30, fontWeight: 700,
              color: C.ink, letterSpacing: '-1px',
              margin: 0, lineHeight: 1,
            }}>Contas fixas</h1>
            <p style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 11.5, color: C.muted, margin: '4px 0 0', fontWeight: 500,
            }}>{contasFixas.length === 0
              ? 'Nada cadastrado ainda'
              : `${fixasPendentes.length} pendente${fixasPendentes.length === 1 ? '' : 's'} de ${contasFixas.length}`}
            </p>
          </div>
          <button onClick={() => setAdding(true)}
            aria-label="Nova conta fixa"
            style={{
              width: 44, height: 44, borderRadius: 14,
              background: `linear-gradient(135deg, ${C.orangeBri}, ${C.orange})`,
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 8px 22px rgba(196,85,59,0.42)',
            }}>
            <IconPlus size={20} stroke={2.6} color="#FFFFFF" />
          </button>
        </motion.header>

        {/* SELETOR DE MÊS + RESUMO */}
        {contasFixas.length > 0 && (
          <motion.section variants={ITEM}
            style={{
              background: C.glassStrong,
              backdropFilter: 'blur(20px)',
              border: `1px solid ${C.glassBorder}`,
              borderRadius: 22,
              padding: '16px 18px',
              boxShadow: C.glassShadow,
            }}>
            {/* Seletor de mês */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
              marginBottom: 14,
            }}>
              <button onClick={() => shiftMes(-1)}
                style={navBtn}>
                <IconChevronLeft size={16} stroke={2.2} color={C.ink} />
              </button>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <p style={{
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontSize: 10, fontWeight: 700, color: C.muted,
                  letterSpacing: '.16em', textTransform: 'uppercase', margin: 0,
                }}>Mês</p>
                <p style={{
                  fontFamily: "'Fraunces',Georgia,serif",
                  fontSize: 17, fontWeight: 700, color: C.ink,
                  letterSpacing: '-0.4px', margin: '2px 0 0',
                }}>{MESES_FULL[view.mes - 1]} {view.ano}</p>
              </div>
              <button onClick={() => shiftMes(1)}
                style={navBtn}>
                <IconChevronRight size={16} stroke={2.2} color={C.ink} />
              </button>
            </div>

            {/* Total + progresso */}
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
              <div>
                <p style={{
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontSize: 10, fontWeight: 700, color: C.muted,
                  letterSpacing: '.14em', textTransform: 'uppercase', margin: 0,
                }}>Total do mês</p>
                <p style={{
                  fontFamily: "'Fraunces',Georgia,serif",
                  fontSize: 28, fontWeight: 700, color: C.ink,
                  letterSpacing: '-0.7px', lineHeight: 1, margin: '4px 0 0',
                  fontVariantNumeric: 'tabular-nums',
                }}>{fmt(totalMes)}</p>
              </div>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '4px 10px', borderRadius: 999,
                background: pctPago === 100 ? 'rgba(30,125,90,0.14)' : 'rgba(212,160,23,0.16)',
                color: pctPago === 100 ? C.green : C.gold,
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontSize: 11, fontWeight: 700,
              }}>
                {pctPago === 100 ? <IconCircleCheck size={11} stroke={2.4} /> : <IconClock size={11} stroke={2.4} />}
                {pctPago.toFixed(0)}% pago
              </span>
            </div>

            <div style={{
              position: 'relative', height: 8, marginTop: 14,
              background: '#F5EEE3', borderRadius: 999, overflow: 'hidden',
            }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pctPago}%` }}
                transition={{ duration: 0.9, ease: [0.22, 0.6, 0.36, 1] }}
                style={{
                  height: '100%',
                  background: pctPago === 100
                    ? `linear-gradient(90deg, ${C.green}, #155F45)`
                    : `linear-gradient(90deg, ${C.gold}, ${C.green})`,
                  borderRadius: 999,
                }}
              />
            </div>

            <div style={{
              display: 'flex', justifyContent: 'space-between', marginTop: 10,
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 12, fontWeight: 600,
            }}>
              <span style={{ color: C.green }}>{fmt(totalPago)} pago</span>
              <span style={{ color: C.muted }}>{fmt(totalPendente)} pendente</span>
            </div>
          </motion.section>
        )}

        {/* PRÓXIMA A VENCER (só se mês corrente e tem pendente) */}
        {proximaPendente && isCurrentMonth && (
          <motion.section variants={ITEM}
            onClick={() => setEditingId(proximaPendente.cf.id!)}
            style={{
              background: `linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(255,231,214,0.65) 100%)`,
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(196,85,59,0.22)',
              borderRadius: 20,
              padding: '14px 16px',
              boxShadow: '0 1px 2px rgba(196,85,59,0.08), 0 12px 32px rgba(196,85,59,0.12)',
              cursor: 'pointer',
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 13 }}>⏰</span>
              <p style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontSize: 10.5, fontWeight: 700,
                color: C.orange, letterSpacing: '.14em', textTransform: 'uppercase',
                margin: 0,
              }}>Próxima a vencer</p>
            </div>
            <h3 style={{
              fontFamily: "'Fraunces',Georgia,serif",
              fontSize: 18, fontWeight: 700, color: C.ink,
              letterSpacing: '-0.4px', margin: '2px 0 4px',
            }}>{proximaPendente.cf.nome}</h3>
            <p style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 12, color: C.inkSoft, margin: '0 0 12px', fontWeight: 500,
            }}>
              {proximaPendente.dias === 0 ? 'Vence hoje' : proximaPendente.dias === 1 ? 'Vence amanhã' : `Vence em ${proximaPendente.dias} dias`}
              {' · '}
              <strong style={{ color: C.ink, fontWeight: 800 }}>{fmt(proximaPendente.cf.valor)}</strong>
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={async e => {
                  e.stopPropagation()
                  await marcarPago(proximaPendente.cf.id!, view.mes, view.ano, proximaPendente.cf.valor)
                  sounds.success(); haptic('medium')
                }}
                style={{
                  flex: 1, padding: '10px 14px',
                  background: C.green, color: '#FFFFFF', border: 'none',
                  borderRadius: 11, cursor: 'pointer',
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontSize: 12.5, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  boxShadow: '0 6px 16px rgba(30,125,90,0.32)',
                }}>
                <IconCheck size={14} stroke={2.4} /> Marcar como pago
              </button>
            </div>
          </motion.section>
        )}

        {/* EMPTY STATE */}
        {contasFixas.length === 0 && (
          <ContasFixasEmptyState onAdd={() => setAdding(true)} />
        )}

        {/* PENDENTES */}
        {pendentesSorted.length > 0 && (
          <motion.section variants={ITEM}>
            <SectionHead label="Pendentes" count={pendentesSorted.length}
              color={C.gold} />
            <div style={{
              marginTop: 8,
              background: C.glass,
              backdropFilter: 'blur(16px)',
              border: `1px solid ${C.glassBorder}`,
              borderRadius: 18,
              padding: '4px 14px',
              boxShadow: C.glassShadow,
            }}>
              {pendentesSorted.map((cf, i) => (
                <ContaFixaRow key={cf.id}
                  cf={cf}
                  cat={catMap.get(cf.categoriaId)}
                  conta={cf.contaId ? contaMap.get(cf.contaId) : undefined}
                  cartao={cf.cartaoId ? cartaoMap.get(cf.cartaoId) : undefined}
                  status="pendente"
                  isCurrentMonth={isCurrentMonth}
                  hoje={today.getDate()}
                  divider={i > 0}
                  onTap={() => setEditingId(cf.id!)}
                  onTogglePago={async () => {
                    await marcarPago(cf.id!, view.mes, view.ano, cf.valor)
                    sounds.success(); haptic('medium')
                  }}
                />
              ))}
            </div>
          </motion.section>
        )}

        {/* PAGAS */}
        {pagasSorted.length > 0 && (
          <motion.section variants={ITEM}>
            <SectionHead label="Pagas neste mês" count={pagasSorted.length}
              color={C.green} />
            <div style={{
              marginTop: 8,
              background: C.glass,
              backdropFilter: 'blur(16px)',
              border: `1px solid ${C.glassBorder}`,
              borderRadius: 18,
              padding: '4px 14px',
              boxShadow: C.glassShadow,
              opacity: 0.85,
            }}>
              {pagasSorted.map((cf, i) => (
                <ContaFixaRow key={cf.id}
                  cf={cf}
                  cat={catMap.get(cf.categoriaId)}
                  conta={cf.contaId ? contaMap.get(cf.contaId) : undefined}
                  cartao={cf.cartaoId ? cartaoMap.get(cf.cartaoId) : undefined}
                  status="pago"
                  isCurrentMonth={isCurrentMonth}
                  hoje={today.getDate()}
                  divider={i > 0}
                  onTap={() => setEditingId(cf.id!)}
                  onTogglePago={async () => {
                    await marcarPendente(cf.id!, view.mes, view.ano)
                    sounds.success(); haptic('light')
                  }}
                />
              ))}
            </div>
          </motion.section>
        )}
      </motion.div>

      {/* FORM (criar/editar) — bottom sheet padrão LegacyModalShell */}
      <ContaFixaForm
        open={adding || editingId !== null}
        editing={editing}
        mes={view.mes}
        ano={view.ano}
        onClose={() => { setAdding(false); setEditingId(null) }}
        onDelete={editing ? async () => {
          if (!confirm(`Excluir "${editing.nome}"?`)) return
          await deleteContaFixa(editing.id!)
          sounds.success(); haptic('heavy')
          setEditingId(null)
        } : undefined}
      />
    </div>
  )
}

// ─── Section head ──────────────────────────────────────────────────

function SectionHead({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 4px',
    }}>
      <h2 style={{
        fontFamily: "'Plus Jakarta Sans',sans-serif",
        fontSize: 11, fontWeight: 700, color: C.inkSoft,
        letterSpacing: '.16em', textTransform: 'uppercase',
        margin: 0,
      }}>{label}</h2>
      <span style={{
        padding: '2px 9px', borderRadius: 999,
        background: `${color}1f`, color,
        fontFamily: "'Plus Jakarta Sans',sans-serif",
        fontSize: 11, fontWeight: 700,
      }}>{count}</span>
    </div>
  )
}

// ─── Row ───────────────────────────────────────────────────────────

function ContaFixaRow({
  cf, cat, conta, cartao, status, isCurrentMonth, hoje, divider, onTap, onTogglePago,
}: {
  cf: ContaFixa
  cat?: { cor: string; nome: string }
  conta?: { nome: string; cor: string }
  cartao?: { nome: string; cor: string }
  status: 'pago' | 'pendente'
  isCurrentMonth: boolean
  hoje: number
  divider: boolean
  onTap: () => void
  onTogglePago: () => void
}) {
  const diasAteVencer = cf.diaVencimento - (isCurrentMonth ? hoje : 0)
  const isVencido = isCurrentMonth && diasAteVencer < 0 && status === 'pendente'
  const isHoje = isCurrentMonth && diasAteVencer === 0 && status === 'pendente'
  const isProximo = isCurrentMonth && diasAteVencer > 0 && diasAteVencer <= 3 && status === 'pendente'

  let badge: { text: string; bg: string; fg: string } | null = null
  if (status === 'pendente') {
    if (isVencido) badge = { text: `${Math.abs(diasAteVencer)}d atraso`, bg: 'rgba(196,85,59,0.13)', fg: C.orange }
    else if (isHoje) badge = { text: 'Hoje', bg: 'rgba(196,85,59,0.13)', fg: C.orange }
    else if (isProximo) badge = { text: `${diasAteVencer}d`, bg: 'rgba(212,160,23,0.16)', fg: C.gold }
    else if (isCurrentMonth) badge = { text: `Dia ${cf.diaVencimento}`, bg: 'rgba(155,123,106,0.1)', fg: C.muted }
    else badge = { text: `Dia ${cf.diaVencimento}`, bg: 'rgba(155,123,106,0.1)', fg: C.muted }
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '12px 0',
      borderTop: divider ? '1px dashed rgba(44,26,15,0.08)' : 'none',
      fontFamily: "'Plus Jakarta Sans',sans-serif",
    }}>
      {/* Checkbox visual de pago */}
      <button
        onClick={(e) => { e.stopPropagation(); onTogglePago() }}
        aria-label={status === 'pago' ? 'Marcar como pendente' : 'Marcar como pago'}
        style={{
          width: 32, height: 32, borderRadius: 10,
          background: status === 'pago'
            ? `linear-gradient(135deg, ${C.green}, #155F45)`
            : cat ? `${cat.cor}1f` : 'rgba(155,123,106,0.13)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          boxShadow: status === 'pago' ? '0 4px 12px rgba(30,125,90,0.32)' : 'none',
          transition: 'all .15s',
        }}>
        {status === 'pago'
          ? <IconCheck size={16} stroke={2.6} color="#FFFFFF" />
          : isVencido ? <IconAlertTriangle size={14} stroke={2.2} color={C.orange} />
          : <IconRepeat size={14} stroke={2} color={cat?.cor ?? C.muted} />}
      </button>

      {/* Info */}
      <button
        onClick={onTap}
        style={{
          flex: 1, minWidth: 0, background: 'transparent',
          border: 'none', cursor: 'pointer', textAlign: 'left',
          padding: 0,
        }}>
        <p style={{
          fontSize: 13, fontWeight: 600, color: C.ink, margin: 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          textDecoration: status === 'pago' ? 'line-through' : 'none',
          textDecorationColor: 'rgba(44,26,15,0.3)',
        }}>{cf.nome}</p>
        <p style={{
          fontSize: 11, color: C.muted, margin: '1px 0 0', fontWeight: 500,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          {cat?.nome && <span>{cat.nome}</span>}
          {(conta || cartao) && <span>·</span>}
          {conta && <span style={{ color: conta.cor, fontWeight: 600 }}>{conta.nome}</span>}
          {cartao && <span style={{ color: cartao.cor, fontWeight: 600 }}>{cartao.nome}</span>}
        </p>
      </button>

      {/* Valor + badge */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p style={{
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          fontSize: 13.5, fontWeight: 700, color: C.ink,
          letterSpacing: '-0.2px', margin: 0, whiteSpace: 'nowrap',
        }}>{fmt(cf.valor)}</p>
        {badge && (
          <span style={{
            display: 'inline-block', marginTop: 2,
            padding: '2px 7px', borderRadius: 6,
            background: badge.bg, color: badge.fg,
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 9.5, fontWeight: 700, letterSpacing: '.04em',
          }}>{badge.text}</span>
        )}
      </div>
    </div>
  )
}

// ─── Empty state ───────────────────────────────────────────────────

function ContasFixasEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <motion.section variants={ITEM}
      style={{
        background: C.glass,
        backdropFilter: 'blur(16px)',
        border: `1px solid ${C.glassBorder}`,
        borderRadius: 20,
        padding: '32px 24px',
        textAlign: 'center',
        boxShadow: C.glassShadow,
        marginTop: 8,
      }}>
      <div style={{
        width: 64, height: 64, borderRadius: 18, margin: '0 auto 14px',
        background: `linear-gradient(135deg, ${C.gold}, ${C.orange})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 22px rgba(212,160,23,0.42)',
      }}>
        <IconCalendarDue size={28} stroke={1.8} color="#FFFFFF" />
      </div>
      <p style={{
        fontFamily: "'Fraunces',Georgia,serif",
        fontSize: 20, fontWeight: 700, color: C.ink, margin: 0,
        letterSpacing: '-0.5px',
      }}>Nenhuma conta fixa cadastrada</p>
      <p style={{
        fontFamily: "'Plus Jakarta Sans',sans-serif",
        fontSize: 12.5, color: C.muted, margin: '8px 0 18px', fontWeight: 500,
        lineHeight: 1.5,
      }}>Aluguel, assinaturas, internet — registre uma vez e o app lembra todo mês.</p>
      <button onClick={onAdd}
        style={{
          padding: '12px 24px',
          background: `linear-gradient(135deg, ${C.orangeBri}, ${C.orange})`,
          color: '#FFFFFF', border: 'none', borderRadius: 12, cursor: 'pointer',
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          fontSize: 13, fontWeight: 700,
          boxShadow: '0 8px 22px rgba(196,85,59,0.42)',
        }}>
        Adicionar primeira
      </button>
    </motion.section>
  )
}

// ─── FORM (StackScreen content) ─────────────────────────────────────

function ContaFixaForm({ open, editing, mes: _mes, ano: _ano, onClose, onDelete }: {
  open: boolean
  editing: ContaFixa | null
  mes: number; ano: number
  onClose: () => void
  onDelete?: () => void
}) {
  const categorias = useCategorias('despesa')
  const contas = useContas()
  const cartoes = useCartoes()
  const [nome, setNome] = useState(editing?.nome ?? '')
  const [valor, setValor] = useState(editing?.valor.toString() ?? '')
  const [diaVencimento, setDiaVencimento] = useState(editing?.diaVencimento ?? 10)
  const [categoriaId, setCategoriaId] = useState<number | null>(editing?.categoriaId ?? null)
  const [paymentMethod, setPaymentMethod] = useState<'conta' | 'cartao'>(
    editing?.cartaoId ? 'cartao' : 'conta'
  )
  const [contaId, setContaId] = useState<number | null>(editing?.contaId ?? null)
  const [cartaoId, setCartaoId] = useState<number | null>(editing?.cartaoId ?? null)

  // Resetar form quando editing mudar
  useEffect(() => {
    setNome(editing?.nome ?? '')
    setValor(editing?.valor.toString() ?? '')
    setDiaVencimento(editing?.diaVencimento ?? 10)
    setCategoriaId(editing?.categoriaId ?? null)
    setPaymentMethod(editing?.cartaoId ? 'cartao' : 'conta')
    setContaId(editing?.contaId ?? null)
    setCartaoId(editing?.cartaoId ?? null)
  }, [editing])

  const handleSave = async () => {
    const valorNum = parseFloat(valor.replace(',', '.'))
    if (!nome.trim() || !valorNum || !categoriaId) return
    const data = {
      nome: nome.trim(),
      valor: valorNum,
      diaVencimento,
      categoriaId,
      contaId: paymentMethod === 'conta' ? contaId : null,
      cartaoId: paymentMethod === 'cartao' ? cartaoId ?? undefined : undefined,
      recorrencia: 'mensal',
      alertaDiasAntes: 3,
      ativo: true,
      updatedAt: Date.now(),
    } as Omit<ContaFixa, 'id' | 'syncId'>
    if (editing) await editContaFixa(editing.id!, data)
    else await addContaFixa(data)
    sounds.success(); haptic('medium')
    onClose()
  }

  const canSave = !!nome.trim() && parseFloat(valor.replace(',', '.')) > 0 && categoriaId !== null

  return (
    <LegacyModalShell open={open} onClose={onClose} maxWidth={560}
      header={
        <div style={{
          padding: '16px 22px', borderBottom: '1px solid rgba(44,26,15,0.08)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{
              fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700,
              color: C.ink, margin: 0, letterSpacing: '-0.4px',
            }}>{editing ? 'Editar conta fixa' : 'Nova conta fixa'}</h2>
            <p style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11.5, color: C.muted, margin: '2px 0 0',
            }}>{editing ? 'Atualize as informações' : 'Aluguel, internet, assinaturas…'}</p>
          </div>
          <button onClick={onClose} aria-label="Fechar" style={{
            background: 'rgba(255,255,255,0.7)', border: 'none', borderRadius: 10,
            width: 34, height: 34, cursor: 'pointer', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <IconX size={16} stroke={2} color={C.inkSoft} />
          </button>
        </div>
      }
      footer={
        <div style={{ padding: '14px 22px', display: 'flex', gap: 8 }}>
          {onDelete && (
            <button onClick={onDelete}
              style={{
                padding: '11px 16px',
                background: 'rgba(196,85,59,0.08)',
                color: C.orange,
                border: '1px solid rgba(196,85,59,0.25)',
                borderRadius: 12, cursor: 'pointer',
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontSize: 12.5, fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
              <IconTrash size={13} stroke={2.2} /> Excluir
            </button>
          )}
          <button onClick={onClose} style={{
            flex: onDelete ? undefined : 1,
            padding: '11px 18px',
            background: 'rgba(255,255,255,0.7)', color: C.inkSoft,
            border: '1px solid rgba(255,255,255,0.85)',
            borderRadius: 12, cursor: 'pointer',
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 12.5, fontWeight: 700,
          }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={!canSave}
            style={{
              flex: 1,
              padding: '11px 18px',
              background: canSave ? `linear-gradient(135deg, ${C.orangeBri}, ${C.orange})` : 'rgba(155,123,106,0.2)',
              color: canSave ? '#FFFFFF' : C.muted,
              border: 'none', borderRadius: 12,
              cursor: canSave ? 'pointer' : 'default',
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 13, fontWeight: 700,
              boxShadow: canSave ? '0 6px 16px rgba(196,85,59,0.36)' : 'none',
            }}>
            {editing ? 'Salvar' : 'Criar'}
          </button>
        </div>
      }
    >
    <div style={{ padding: '20px 18px' }}>
      {/* Nome */}
      <Field label="Nome">
        <input value={nome} onChange={e => setNome(e.target.value)}
          placeholder="ex: Aluguel, Internet…"
          style={input} autoFocus />
      </Field>

      {/* Valor */}
      <Field label="Valor mensal">
        <span style={{
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          fontSize: 14, fontWeight: 700, color: C.muted, marginRight: 6,
        }}>R$</span>
        <input value={valor} onChange={e => setValor(e.target.value)}
          inputMode="decimal" placeholder="0,00"
          style={input} />
      </Field>

      {/* Dia vencimento */}
      <Field label="Vencimento (dia do mês)">
        <input
          type="number" min={1} max={31}
          value={diaVencimento}
          onChange={e => setDiaVencimento(Math.max(1, Math.min(31, parseInt(e.target.value) || 1)))}
          style={input}
        />
      </Field>

      {/* Categoria */}
      <Field label="Categoria">
        <div style={{
          display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2,
          scrollbarWidth: 'none',
        }} className="cat-row">
          {categorias.map(c => {
            const active = c.id === categoriaId
            return (
              <button key={c.id}
                onClick={() => setCategoriaId(c.id!)}
                style={{
                  padding: '8px 12px', borderRadius: 999,
                  background: active ? c.cor : 'rgba(255,255,255,0.7)',
                  border: active ? 'none' : '1px solid rgba(255,255,255,0.85)',
                  color: active ? '#FFFFFF' : C.inkSoft,
                  cursor: 'pointer',
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontSize: 12, fontWeight: 700,
                  whiteSpace: 'nowrap', flexShrink: 0,
                  boxShadow: active ? `0 4px 12px ${c.cor}55` : 'none',
                }}>{c.nome}</button>
            )
          })}
          <style>{`.cat-row::-webkit-scrollbar { display: none; }`}</style>
        </div>
      </Field>

      {/* Forma de pagamento */}
      <Field label="Pagamento">
        <div style={{ display: 'flex', gap: 6, width: '100%' }}>
          <button onClick={() => setPaymentMethod('conta')}
            style={{
              flex: 1, padding: '10px 12px',
              background: paymentMethod === 'conta' ? C.purple : 'rgba(255,255,255,0.7)',
              color: paymentMethod === 'conta' ? '#FFFFFF' : C.inkSoft,
              border: paymentMethod === 'conta' ? 'none' : '1px solid rgba(255,255,255,0.85)',
              borderRadius: 11, cursor: 'pointer',
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 12, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            }}>
            <IconBuildingBank size={14} stroke={2.2} /> Conta
          </button>
          <button onClick={() => setPaymentMethod('cartao')}
            style={{
              flex: 1, padding: '10px 12px',
              background: paymentMethod === 'cartao' ? C.purple : 'rgba(255,255,255,0.7)',
              color: paymentMethod === 'cartao' ? '#FFFFFF' : C.inkSoft,
              border: paymentMethod === 'cartao' ? 'none' : '1px solid rgba(255,255,255,0.85)',
              borderRadius: 11, cursor: 'pointer',
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 12, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            }}>
            <IconCreditCard size={14} stroke={2.2} /> Cartão
          </button>
        </div>
      </Field>

      {/* Lista de conta ou cartão */}
      {paymentMethod === 'conta' && contas.length > 0 && (
        <Field label="Conta">
          <div style={{
            display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2,
            scrollbarWidth: 'none',
          }} className="cat-row">
            {contas.map(c => {
              const active = c.id === contaId
              return (
                <button key={c.id}
                  onClick={() => setContaId(c.id!)}
                  style={{
                    padding: '8px 12px', borderRadius: 999,
                    background: active ? c.cor : 'rgba(255,255,255,0.7)',
                    border: active ? 'none' : '1px solid rgba(255,255,255,0.85)',
                    color: active ? '#FFFFFF' : C.inkSoft,
                    cursor: 'pointer',
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                    fontSize: 12, fontWeight: 700,
                    whiteSpace: 'nowrap', flexShrink: 0,
                  }}>{c.nome}</button>
              )
            })}
          </div>
        </Field>
      )}
      {paymentMethod === 'cartao' && cartoes.length > 0 && (
        <Field label="Cartão">
          <div style={{
            display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2,
            scrollbarWidth: 'none',
          }} className="cat-row">
            {cartoes.map(c => {
              const active = c.id === cartaoId
              return (
                <button key={c.id}
                  onClick={() => setCartaoId(c.id!)}
                  style={{
                    padding: '8px 12px', borderRadius: 999,
                    background: active ? c.cor : 'rgba(255,255,255,0.7)',
                    border: active ? 'none' : '1px solid rgba(255,255,255,0.85)',
                    color: active ? '#FFFFFF' : C.inkSoft,
                    cursor: 'pointer',
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                    fontSize: 12, fontWeight: 700,
                    whiteSpace: 'nowrap', flexShrink: 0,
                  }}>{c.nome}</button>
              )
            })}
          </div>
        </Field>
      )}

    </div>
    </LegacyModalShell>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <p style={{
        fontFamily: "'Plus Jakarta Sans',sans-serif",
        fontSize: 10, fontWeight: 700,
        color: C.muted, letterSpacing: '.14em', textTransform: 'uppercase',
        margin: '0 0 6px',
      }}>{label}</p>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 0,
        background: C.glassStrong,
        backdropFilter: 'blur(14px)',
        border: `1px solid ${C.glassBorder}`,
        borderRadius: 12,
        padding: '10px 14px',
        boxShadow: C.glassShadow,
      }}>
        {children}
      </div>
    </div>
  )
}

const input: React.CSSProperties = {
  flex: 1, border: 'none', outline: 'none', background: 'transparent',
  fontFamily: "'Plus Jakarta Sans',sans-serif",
  fontSize: 14, fontWeight: 500, color: C.ink, minWidth: 0,
}

const navBtn: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 11,
  background: 'rgba(255,255,255,0.7)',
  backdropFilter: 'blur(14px)',
  border: '1px solid rgba(255,255,255,0.85)',
  cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

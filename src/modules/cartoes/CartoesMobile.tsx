// ─── Cartões mobile — lista de cartões + StackScreen pra fatura ─────
// Identidade peach gradient + glass. Cada cartão é uma row visual
// com mini-card preview, % do limite, e tap abre detalhe full-screen
// com fatura agrupada por categoria.

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  IconCreditCard, IconChevronRight, IconChevronLeft,
  IconReceipt2, IconCalendarTime,
  IconTrash, IconPencil,
} from '@tabler/icons-react'
import { db, type Cartao, type LancamentoCartao } from '@/db/schema'
import { useCartoes, useLancamentosCartao, useTotalFatura, useAllLancamentosAtivos, deleteCartao } from '@/db/hooks/useCartoes'
import { useCategorias } from '@/db/hooks/useCategorias'
import { fmt, mesAnoAtual, fmtDate } from '@/lib/format'
import { StackScreen } from '@/components/layout/StackScreen'
import { CartaoForm } from './CartaoForm'
import { sounds, haptic } from '@/lib/sounds'

// ─── Tokens (mesma identidade) ─────────────────────────────────────
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
  show: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
}
const ITEM = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 200, damping: 24 } },
}

// ─── Page ──────────────────────────────────────────────────────────

export function CartoesMobile() {
  const cartoes = useCartoes()
  const { mes, ano } = mesAnoAtual()
  const lancsAtivos = useAllLancamentosAtivos()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Cartao | null>(null)

  // Totais
  const todasLancsMes = useLiveQuery(
    () => db.lancamentosCartao.where('mes').equals(mes).and(l => l.ano === ano).toArray(),
    [mes, ano],
  ) ?? []
  const faturaTotal = todasLancsMes.reduce((s, l) => s + l.valor, 0)
  const limiteTotal = cartoes.reduce((s, c) => s + c.limite, 0)
  const usadoTotal = lancsAtivos.reduce((s, l) => s + l.valor, 0)

  const selectedCartao = selectedId !== null ? cartoes.find(c => c.id === selectedId) : null

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
        background: 'radial-gradient(circle, rgba(124,92,191,0.14), transparent 60%)',
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
        <motion.header variants={ITEM}>
          <h1 style={{
            fontFamily: "'Fraunces',Georgia,serif",
            fontSize: 30, fontWeight: 700,
            color: C.ink, letterSpacing: '-1px',
            margin: 0, lineHeight: 1,
          }}>Cartões</h1>
          <p style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 11.5, color: C.muted, margin: '4px 0 0', fontWeight: 500,
          }}>
            {cartoes.length > 0
              ? `${cartoes.length} ${cartoes.length === 1 ? 'cartão' : 'cartões'} ativos`
              : 'Nenhum cartão cadastrado'}
          </p>
        </motion.header>

        {/* RESUMO TOTAL (só se houver cartões) */}
        {cartoes.length > 0 && (
          <motion.section variants={ITEM}
            style={{
              background: C.glassStrong,
              backdropFilter: 'blur(20px)',
              border: `1px solid ${C.glassBorder}`,
              borderRadius: 22,
              padding: '18px 20px',
              boxShadow: C.glassShadow,
            }}>
            <p style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 10.5, fontWeight: 700, color: C.muted,
              letterSpacing: '.16em', textTransform: 'uppercase',
              margin: 0,
            }}>Fatura aberta · {mesNomeAno(mes, ano)}</p>
            <p style={{
              fontFamily: "'Fraunces',Georgia,serif",
              fontSize: 'clamp(34px, 10vw, 44px)', fontWeight: 700,
              color: C.ink, letterSpacing: '-1.2px', lineHeight: 1,
              margin: '6px 0 0',
              fontVariantNumeric: 'tabular-nums',
            }}>{fmt(faturaTotal)}</p>
            {limiteTotal > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{
                  position: 'relative', height: 8, background: '#F5EEE3',
                  borderRadius: 999, overflow: 'hidden',
                }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (usadoTotal / limiteTotal) * 100)}%` }}
                    transition={{ duration: 0.9, ease: [0.22, 0.6, 0.36, 1] }}
                    style={{
                      height: '100%',
                      background: usadoTotal / limiteTotal > 0.8
                        ? `linear-gradient(90deg, ${C.gold}, ${C.orange})`
                        : `linear-gradient(90deg, ${C.green}, ${C.gold})`,
                      borderRadius: 999,
                    }}
                  />
                </div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  marginTop: 8,
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontSize: 11.5, fontWeight: 600, color: C.inkSoft,
                }}>
                  <span>{fmt(usadoTotal)} usados</span>
                  <span style={{ color: C.muted }}>{fmt(limiteTotal)} limite</span>
                </div>
              </div>
            )}
          </motion.section>
        )}

        {/* LISTA DE CARTÕES ou EMPTY STATE */}
        {cartoes.length === 0
          ? <CartoesEmptyState onAdd={() => setFormOpen(true)} />
          : (
            <motion.section variants={ITEM}>
              <h2 style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontSize: 11, fontWeight: 700, color: C.inkSoft,
                letterSpacing: '.16em', textTransform: 'uppercase',
                margin: '0 0 8px', padding: '0 4px',
              }}>Seus cartões</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {cartoes.map(c => (
                  <CartaoCard key={c.id} cartao={c} mes={mes} ano={ano} lancsAtivos={lancsAtivos}
                    onClick={() => { haptic('light'); setSelectedId(c.id!) }} />
                ))}
              </div>
            </motion.section>
          )
        }
      </motion.div>

      {/* DETAIL StackScreen */}
      <StackScreen
        open={selectedCartao !== null}
        onClose={() => setSelectedId(null)}
        title={selectedCartao?.nome ?? 'Cartão'}
        eyebrow={selectedCartao?.bandeira}
        rightAction={
          selectedCartao && (
            <button onClick={() => { setEditing(selectedCartao); setFormOpen(true) }}
              style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'rgba(80,78,118,0.1)',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
              <IconPencil size={15} stroke={2.2} color={C.purple} />
            </button>
          )
        }
      >
        {selectedCartao && (
          <CartaoDetailMobile
            cartao={selectedCartao}
            onClose={() => setSelectedId(null)}
            onEdit={() => { setEditing(selectedCartao); setFormOpen(true) }}
            onDelete={async () => {
              if (!confirm(`Excluir o cartão "${selectedCartao.nome}"?`)) return
              await deleteCartao(selectedCartao.id!)
              sounds.success(); haptic('heavy')
              setSelectedId(null)
            }}
          />
        )}
      </StackScreen>

      {/* Form modal (criar/editar) — CartaoForm já é modal próprio */}
      <CartaoForm
        open={formOpen}
        cartao={editing ?? undefined}
        onClose={() => { setFormOpen(false); setEditing(null) }}
      />
    </div>
  )
}

// ─── Cartão card (preview na lista) ─────────────────────────────────

function CartaoCard({ cartao, mes, ano, lancsAtivos, onClick }: {
  cartao: Cartao; mes: number; ano: number
  lancsAtivos: LancamentoCartao[]
  onClick: () => void
}) {
  const fatura = useTotalFatura(cartao.id!, mes, ano)
  const usadoCartao = lancsAtivos.filter(l => l.cartaoId === cartao.id).reduce((s, l) => s + l.valor, 0)
  const pctLimite = cartao.limite > 0 ? (usadoCartao / cartao.limite) * 100 : 0
  const hoje = new Date().getDate()
  const diasFechamento = cartao.diaFechamento - hoje
  const diasVencimento = cartao.diaVencimento - hoje
  const fechaEm = diasFechamento < 0 ? `Já fechou` : diasFechamento === 0 ? 'Fecha hoje' : `Fecha em ${diasFechamento}d`
  const venceEm = diasVencimento < 0 ? '' : diasVencimento === 0 ? 'Vence hoje' : `Vence em ${diasVencimento}d`
  const alerta = pctLimite >= 80
  const proximoFechamento = diasFechamento >= 0 && diasFechamento <= 3

  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.985 }}
      style={{
        background: C.glassStrong,
        backdropFilter: 'blur(20px)',
        border: `1px solid ${alerta ? 'rgba(196,85,59,0.32)' : C.glassBorder}`,
        borderRadius: 20,
        padding: '16px 16px',
        cursor: 'pointer',
        textAlign: 'left',
        boxShadow: alerta
          ? '0 8px 28px rgba(196,85,59,0.18)'
          : C.glassShadow,
        position: 'relative',
        overflow: 'hidden',
      }}>
      {/* Linha colorida do cartão (lateral esquerda) */}
      <div aria-hidden style={{
        position: 'absolute', left: 0, top: 12, bottom: 12, width: 4,
        background: cartao.cor, borderRadius: 999,
      }} />

      <div style={{ paddingLeft: 10 }}>
        {/* Header: nome + bandeira */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{
              fontFamily: "'Fraunces',Georgia,serif",
              fontSize: 17, fontWeight: 700, color: C.ink,
              letterSpacing: '-0.3px', margin: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{cartao.nome}</p>
            <p style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 10.5, color: C.muted, margin: '2px 0 0',
              fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase',
            }}>{cartao.bandeira} {cartao.ultimosDigitos && `· ···${cartao.ultimosDigitos}`}</p>
          </div>
          <IconChevronRight size={16} stroke={2.2} color={C.muted} style={{ marginTop: 4, flexShrink: 0 }} />
        </div>

        {/* Fatura */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 10 }}>
          <span style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 22, fontWeight: 700, color: C.ink,
            letterSpacing: '-0.4px', fontVariantNumeric: 'tabular-nums',
          }}>{fmt(fatura)}</span>
          <span style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 11, color: C.muted, fontWeight: 600,
          }}>fatura</span>
        </div>

        {/* Barra de limite */}
        {cartao.limite > 0 && (
          <>
            <div style={{
              position: 'relative', height: 6, marginTop: 10,
              background: '#F5EEE3', borderRadius: 999, overflow: 'hidden',
            }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, pctLimite)}%` }}
                transition={{ duration: 0.8 }}
                style={{
                  height: '100%',
                  background: pctLimite >= 90
                    ? `linear-gradient(90deg, ${C.orangeBri}, ${C.orange})`
                    : pctLimite >= 80
                    ? `linear-gradient(90deg, ${C.gold}, ${C.orange})`
                    : `linear-gradient(90deg, ${C.green}, ${C.gold})`,
                  borderRadius: 999,
                }}
              />
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', marginTop: 6,
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 10.5, fontWeight: 600,
            }}>
              <span style={{ color: alerta ? C.orange : C.inkSoft }}>
                {pctLimite.toFixed(0)}% usado
              </span>
              <span style={{ color: C.muted }}>{fmt(cartao.limite - usadoCartao)} disponível</span>
            </div>
          </>
        )}

        {/* Footer: dias até fechamento/vencimento */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap',
        }}>
          <ChipMini icon={IconCalendarTime} text={fechaEm}
            tint={proximoFechamento ? 'warning' : 'neutral'} />
          {venceEm && <ChipMini icon={IconCalendarTime} text={venceEm} tint="neutral" />}
        </div>
      </div>
    </motion.button>
  )
}

function ChipMini({ icon: Icon, text, tint }: {
  icon: typeof IconCalendarTime; text: string; tint: 'warning' | 'neutral'
}) {
  const cor = tint === 'warning' ? C.orange : C.inkSoft
  const bg = tint === 'warning' ? 'rgba(196,85,59,0.1)' : 'rgba(155,123,106,0.1)'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 8px', borderRadius: 999,
      background: bg, color: cor,
      fontFamily: "'Plus Jakarta Sans',sans-serif",
      fontSize: 10.5, fontWeight: 700, letterSpacing: '.01em',
    }}>
      <Icon size={10} stroke={2.4} />
      {text}
    </span>
  )
}

function mesNomeAno(mes: number, ano: number): string {
  const d = new Date(ano, mes - 1, 1)
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

// ─── Empty state ───────────────────────────────────────────────────

function CartoesEmptyState({ onAdd }: { onAdd: () => void }) {
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
        background: `linear-gradient(135deg, ${C.purple}, #504E76)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 22px rgba(42,30,63,0.32)',
      }}>
        <IconCreditCard size={28} stroke={1.8} color="#FFFFFF" />
      </div>
      <p style={{
        fontFamily: "'Fraunces',Georgia,serif",
        fontSize: 20, fontWeight: 700, color: C.ink, margin: 0,
        letterSpacing: '-0.5px',
      }}>Nenhum cartão cadastrado</p>
      <p style={{
        fontFamily: "'Plus Jakarta Sans',sans-serif",
        fontSize: 12.5, color: C.muted, margin: '8px 0 18px', fontWeight: 500,
        lineHeight: 1.5,
      }}>Adicione seus cartões pra acompanhar faturas, limite e parcelamentos.</p>
      <button onClick={onAdd}
        style={{
          padding: '12px 24px',
          background: `linear-gradient(135deg, ${C.orangeBri}, ${C.orange})`,
          color: '#FFFFFF', border: 'none', borderRadius: 12, cursor: 'pointer',
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          fontSize: 13, fontWeight: 700,
          boxShadow: '0 8px 22px rgba(196,85,59,0.42)',
        }}>
        Adicionar cartão
      </button>
    </motion.section>
  )
}

// ─── DETAIL (StackScreen content) ──────────────────────────────────

function CartaoDetailMobile({ cartao, onClose, onDelete }: {
  cartao: Cartao; onClose: () => void; onEdit: () => void; onDelete: () => void
}) {
  const { mes: mesAtual, ano: anoAtual } = mesAnoAtual()
  const [mes, setMes] = useState(mesAtual)
  const [ano, setAno] = useState(anoAtual)
  const cats = useCategorias()
  const lancs = useLancamentosCartao(cartao.id!, mes, ano)
  const fatura = lancs.reduce((s, l) => s + l.valor, 0)

  // Agrupa por categoria
  const porCat = useMemo(() => {
    const map = new Map<number, { total: number; items: LancamentoCartao[] }>()
    lancs.forEach(l => {
      const cur = map.get(l.categoriaId) ?? { total: 0, items: [] }
      cur.total += l.valor
      cur.items.push(l)
      map.set(l.categoriaId, cur)
    })
    return Array.from(map.entries())
      .map(([catId, v]) => ({ catId, ...v, cat: cats.find(c => c.id === catId) }))
      .sort((a, b) => b.total - a.total)
  }, [lancs, cats])

  function shiftMes(delta: number) {
    const d = new Date(ano, mes - 1 + delta, 1)
    setMes(d.getMonth() + 1); setAno(d.getFullYear())
  }

  return (
    <div style={{
      padding: '20px 18px',
      background: `linear-gradient(180deg, ${C.bgTop} 0%, ${C.bgMid} 40%, ${C.bgBottom} 100%)`,
      minHeight: '100%',
    }}>
      {/* Card visual do cartão */}
      <div style={{
        background: `linear-gradient(135deg, ${cartao.cor} 0%, ${darken(cartao.cor)} 100%)`,
        borderRadius: 18,
        padding: '20px 22px',
        color: '#FFFFFF',
        boxShadow: `0 14px 32px ${cartao.cor}55`,
        marginBottom: 18,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div aria-hidden style={{
          position: 'absolute', right: -40, top: -50, width: 180, height: 180,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.18), transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative' }}>
          <p style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 10, fontWeight: 700,
            color: 'rgba(255,255,255,0.7)',
            letterSpacing: '.18em', textTransform: 'uppercase',
            margin: 0,
          }}>{cartao.bandeira}</p>
          <h2 style={{
            fontFamily: "'Fraunces',Georgia,serif",
            fontSize: 22, fontWeight: 700, margin: '4px 0 16px',
            letterSpacing: '-0.5px',
          }}>{cartao.nome}</h2>
          <p style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 11, fontWeight: 600,
            color: 'rgba(255,255,255,0.7)',
            letterSpacing: '.12em',
            margin: 0,
          }}>{cartao.ultimosDigitos ? `•••• •••• •••• ${cartao.ultimosDigitos}` : '•••• •••• •••• ••••'}</p>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
            marginTop: 14,
          }}>
            <div>
              <p style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontSize: 9, color: 'rgba(255,255,255,0.55)',
                letterSpacing: '.14em', textTransform: 'uppercase', margin: 0,
              }}>Fechamento</p>
              <p style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontSize: 13, fontWeight: 700, margin: '2px 0 0',
              }}>Dia {cartao.diaFechamento}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontSize: 9, color: 'rgba(255,255,255,0.55)',
                letterSpacing: '.14em', textTransform: 'uppercase', margin: 0,
              }}>Vencimento</p>
              <p style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontSize: 13, fontWeight: 700, margin: '2px 0 0',
              }}>Dia {cartao.diaVencimento}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Seletor de mês */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 10, marginBottom: 14,
      }}>
        <button onClick={() => shiftMes(-1)}
          style={{
            width: 36, height: 36, borderRadius: 11,
            background: C.glass, backdropFilter: 'blur(14px)',
            border: `1px solid ${C.glassBorder}`, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          <IconChevronLeft size={16} stroke={2.2} color={C.ink} />
        </button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <p style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 10, fontWeight: 700, color: C.muted,
            letterSpacing: '.16em', textTransform: 'uppercase',
            margin: 0,
          }}>Fatura</p>
          <p style={{
            fontFamily: "'Fraunces',Georgia,serif",
            fontSize: 17, fontWeight: 700, color: C.ink,
            letterSpacing: '-0.4px', margin: '2px 0 0',
            textTransform: 'capitalize',
          }}>{mesNomeAno(mes, ano)}</p>
        </div>
        <button onClick={() => shiftMes(1)}
          style={{
            width: 36, height: 36, borderRadius: 11,
            background: C.glass, backdropFilter: 'blur(14px)',
            border: `1px solid ${C.glassBorder}`, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          <IconChevronRight size={16} stroke={2.2} color={C.ink} />
        </button>
      </div>

      {/* Total fatura */}
      <div style={{
        background: C.glassStrong,
        backdropFilter: 'blur(16px)',
        border: `1px solid ${C.glassBorder}`,
        borderRadius: 18,
        padding: '18px 20px', marginBottom: 16,
        textAlign: 'center',
        boxShadow: C.glassShadow,
      }}>
        <p style={{
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          fontSize: 10.5, fontWeight: 700, color: C.muted,
          letterSpacing: '.16em', textTransform: 'uppercase', margin: 0,
        }}>Total da fatura</p>
        <p style={{
          fontFamily: "'Fraunces',Georgia,serif",
          fontSize: 'clamp(34px, 11vw, 44px)', fontWeight: 700,
          color: fatura > 0 ? C.orange : C.green,
          letterSpacing: '-1.2px', lineHeight: 1,
          margin: '6px 0 0', fontVariantNumeric: 'tabular-nums',
        }}>{fmt(fatura)}</p>
        <p style={{
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          fontSize: 11.5, color: C.muted, margin: '6px 0 0', fontWeight: 500,
        }}>{lancs.length} {lancs.length === 1 ? 'lançamento' : 'lançamentos'}</p>
      </div>

      {/* Lançamentos agrupados por categoria */}
      {porCat.length === 0 ? (
        <div style={{
          background: C.glass,
          backdropFilter: 'blur(14px)',
          border: `1px solid ${C.glassBorder}`,
          borderRadius: 16, padding: '24px 20px',
          textAlign: 'center', boxShadow: C.glassShadow,
        }}>
          <IconReceipt2 size={26} stroke={1.8} color={C.muted} style={{ marginBottom: 8 }} />
          <p style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 13, fontWeight: 600, color: C.inkSoft, margin: 0,
          }}>Sem lançamentos neste mês</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {porCat.map(grp => (
            <div key={grp.catId}
              style={{
                background: C.glass,
                backdropFilter: 'blur(16px)',
                border: `1px solid ${C.glassBorder}`,
                borderRadius: 18,
                padding: '4px 14px',
                boxShadow: C.glassShadow,
              }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 0 8px',
                borderBottom: '1px dashed rgba(44,26,15,0.08)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: grp.cat?.cor ?? C.muted }} />
                  <span style={{
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                    fontSize: 12.5, fontWeight: 700, color: C.ink,
                  }}>{grp.cat?.nome ?? 'Sem categoria'}</span>
                </div>
                <span style={{
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontSize: 13, fontWeight: 700, color: C.orange,
                  letterSpacing: '-0.2px',
                }}>{fmt(grp.total)}</span>
              </div>
              {grp.items.map((l, i) => (
                <div key={l.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: 10, padding: '10px 0',
                  borderTop: i > 0 ? '1px dashed rgba(44,26,15,0.06)' : 'none',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                      fontSize: 12.5, fontWeight: 600, color: C.ink, margin: 0,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{l.descricao}</p>
                    <p style={{
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                      fontSize: 10.5, color: C.muted, margin: '1px 0 0', fontWeight: 500,
                    }}>
                      {fmtDate(l.data)}
                      {l.totalParcelas > 1 && ` · ${l.parcelaAtual}/${l.totalParcelas}`}
                    </p>
                  </div>
                  <span style={{
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                    fontSize: 13, fontWeight: 700, color: C.ink,
                    whiteSpace: 'nowrap',
                  }}>{fmt(l.valor)}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Excluir */}
      <button onClick={onDelete}
        style={{
          marginTop: 20, padding: '12px 16px', width: '100%',
          background: 'rgba(196,85,59,0.08)',
          color: C.orange,
          border: '1px solid rgba(196,85,59,0.25)',
          borderRadius: 14, cursor: 'pointer',
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          fontSize: 13, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
        <IconTrash size={14} stroke={2.2} /> Excluir cartão
      </button>
    </div>
  )
}

// ─── Helper: escurece uma cor hex pra usar no gradient ─────────────
function darken(hex: string): string {
  // Conversão rápida hex → rgb → escurece 25%
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.replace('#', ''))
  if (!m) return hex
  const f = 0.65 // mantém 65% do brilho
  const r = Math.round(parseInt(m[1], 16) * f)
  const g = Math.round(parseInt(m[2], 16) * f)
  const b = Math.round(parseInt(m[3], 16) * f)
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`
}

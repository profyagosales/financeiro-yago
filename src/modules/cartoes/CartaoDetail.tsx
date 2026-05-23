import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  IconPlus, IconEdit, IconTrash, IconChevronLeft, IconChevronRight,
  IconDotsVertical, IconHistory,
} from '@tabler/icons-react'
import type { Cartao, LancamentoCartao, Categoria } from '@/db/schema'
import { db } from '@/db/schema'
import { useCategorias } from '@/db/hooks/useCategorias'
import {
  useLancamentosCartao, useTotalFatura, deleteLancamentoCartao, deleteLancamentoComParcelas,
} from '@/db/hooks/useCartoes'
import { fmt, mesAnoAtual } from '@/lib/format'
import { BankLogo } from '@/components/ui/BankLogo'
import { BandeiraLogo } from '@/components/ui/BandeiraLogo'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { Modal } from '@/components/ui/Modal'

type Tab = 'lancamentos' | 'categorias' | 'historico'

interface Props {
  cartao: Cartao
  onEdit: () => void
  onDelete: () => void
  onLancar: (mes: number, ano: number, lancamento?: LancamentoCartao) => void
}

export function CartaoDetail({ cartao, onEdit, onDelete, onLancar }: Props) {
  const atual = mesAnoAtual()
  const [mes, setMes] = useState(atual.mes)
  const [ano, setAno] = useState(atual.ano)
  const [tab, setTab] = useState<Tab>('lancamentos')

  useEffect(() => { setMes(atual.mes); setAno(atual.ano); setTab('lancamentos') }, [cartao.id])

  const lancs = useLancamentosCartao(cartao.id!, mes, ano)
  const faturaAtual = useTotalFatura(cartao.id!, mes, ano)
  const disponivel = Math.max(0, cartao.limite - faturaAtual)
  const pctUsado = cartao.limite > 0 ? Math.min(100, (faturaAtual / cartao.limite) * 100) : 0

  const isCurrentMonth = mes === atual.mes && ano === atual.ano
  const mesNome = new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', { month: 'long' })

  const prev = () => {
    if (mes === 1) { setMes(12); setAno(a => a - 1) }
    else setMes(m => m - 1)
  }
  const next = () => {
    if (mes === 12) { setMes(1); setAno(a => a + 1) }
    else setMes(m => m + 1)
  }

  const corBarra = pctUsado >= 90 ? '#C4553B' : pctUsado >= 70 ? '#D4A017' : cartao.cor

  return (
    <motion.div
      key={cartao.id}
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
      }}>

      {/* ─── LOCKED HEADER — editorial ─── */}
      <div style={{
        padding: '22px 28px',
        background: `linear-gradient(135deg, ${cartao.cor}10 0%, ${cartao.cor}03 100%)`,
        borderBottom: '1px solid #EDE6DC',
        flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 18,
      }}>
        <BankLogo logo={cartao.logo} nome={cartao.nome} cor={cartao.cor} size={64} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h2 style={{
              fontFamily: "'Fraunces',Georgia,serif",
              fontSize: 30, fontWeight: 700,
              color: '#2C1A0F', margin: 0,
              letterSpacing: '-0.9px', lineHeight: 1.05,
            }}>{cartao.nome}</h2>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 8,
              background: `${cartao.cor}14`,
              border: `1px solid ${cartao.cor}30`,
            }}>
              <BandeiraLogo bandeira={cartao.bandeira} size={26} variant="dark" />
            </span>
          </div>
          <p style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 500,
            color: '#7A5C4F', margin: '8px 0 0',
            display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          }}>
            <Meta label="Fecha dia" value={String(cartao.diaFechamento)} />
            <Dot />
            <Meta label="Vence dia" value={String(cartao.diaVencimento)} />
            <Dot />
            <Meta label="Limite" value={fmt(cartao.limite)} />
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={onEdit} title="Editar cartão" style={ICON_BTN}>
            <IconEdit size={14} stroke={1.8} color="#7A5C4F" />
          </button>
          <button onClick={onDelete} title="Excluir cartão" style={{ ...ICON_BTN, background: '#FAEAEA' }}>
            <IconTrash size={14} stroke={2} color="#C4553B" />
          </button>
        </div>
      </div>

      {/* ─── SCROLLABLE BODY ─── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '26px 28px 28px' }}>

        {/* HERO da fatura — tipografia editorial sem boxes */}
        <section style={{ marginBottom: 24 }}>
          <p style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700,
            color: '#D4A017', letterSpacing: '.18em', textTransform: 'uppercase', margin: 0,
          }}>Fatura de {mesNome}</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap', marginTop: 6 }}>
            <p style={{
              fontFamily: "'Fraunces',Georgia,serif", fontSize: 52, fontWeight: 700,
              color: faturaAtual > 0 ? '#2C1A0F' : '#9B7B6A',
              letterSpacing: '-2px', lineHeight: 1, margin: 0,
            }}>{fmt(faturaAtual)}</p>
            <p style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 600,
              color: '#7A5C4F', margin: 0,
            }}>
              <span style={{ color: '#1E7D5A', fontWeight: 700 }}>{fmt(disponivel)}</span> disponível
              {' '}<span style={{ color: '#D4C8BC' }}>·</span>{' '}
              <span style={{ color: corBarra, fontWeight: 700 }}>{pctUsado.toFixed(0)}%</span> do limite usado
            </p>
          </div>
          {/* Barra fina, elegante */}
          <div style={{ marginTop: 14, height: 4, borderRadius: 2, background: 'rgba(44,26,15,0.06)', overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pctUsado}%` }}
              transition={{ type: 'spring', stiffness: 80, damping: 22 }}
              style={{ height: '100%', borderRadius: 2, background: corBarra }}
            />
          </div>
        </section>

        {/* TABS underline + botão Lançar */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 18, borderBottom: '1px solid #EDE6DC' }}>
          <TabBtn active={tab === 'lancamentos'} onClick={() => setTab('lancamentos')}>Lançamentos</TabBtn>
          <TabBtn active={tab === 'categorias'} onClick={() => setTab('categorias')}>Categorias</TabBtn>
          <TabBtn active={tab === 'historico'} onClick={() => setTab('historico')}>Histórico</TabBtn>
          <div style={{ flex: 1 }} />
          <button onClick={() => onLancar(mes, ano)}
            style={{
              background: cartao.cor, color: '#FFFFFF', border: 'none',
              borderRadius: 10, padding: '8px 14px', cursor: 'pointer',
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', gap: 5,
              boxShadow: `0 3px 10px ${cartao.cor}40`,
              letterSpacing: '.02em',
              marginBottom: 8,
            }}>
            <IconPlus size={13} stroke={2.5} /> Lançar
          </button>
        </div>

        {/* Mês navegador minimalista (só em lançamentos/categorias) */}
        {tab !== 'historico' && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
            marginBottom: 18,
          }}>
            <button onClick={prev}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: 6, borderRadius: 8,
                color: '#9B7B6A',
                display: 'flex', alignItems: 'center',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#FBF8F3')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <IconChevronLeft size={16} stroke={2} />
            </button>
            <div style={{ textAlign: 'center', display: 'flex', alignItems: 'center', gap: 8 }}>
              <p style={{
                fontFamily: "'Fraunces',Georgia,serif", fontSize: 15, fontWeight: 700,
                color: '#2C1A0F', margin: 0, textTransform: 'capitalize', letterSpacing: '-0.3px',
              }}>{mesNome} {ano}</p>
              {isCurrentMonth && (
                <span style={{
                  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 700,
                  color: '#1E7D5A', background: 'rgba(58,133,128,0.14)',
                  padding: '2px 8px', borderRadius: 7,
                  letterSpacing: '.06em', textTransform: 'uppercase',
                }}>Atual</span>
              )}
            </div>
            <button onClick={next}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: 6, borderRadius: 8,
                color: '#9B7B6A',
                display: 'flex', alignItems: 'center',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#FBF8F3')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <IconChevronRight size={16} stroke={2} />
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {tab === 'lancamentos' && (
            <motion.div key="lancs" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>
              <LancamentosList
                lancs={lancs}
                cartaoCor={cartao.cor}
                onEdit={l => onLancar(mes, ano, l)}
                onLancar={() => onLancar(mes, ano)}
              />
            </motion.div>
          )}
          {tab === 'categorias' && (
            <motion.div key="cats" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>
              <CategoriasTab lancs={lancs} faturaTotal={faturaAtual} />
            </motion.div>
          )}
          {tab === 'historico' && (
            <motion.div key="hist" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>
              <HistoricoTab cartao={cartao} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

// ─── Lançamentos tab — rows editoriais com coluna de data ────────────
function LancamentosList({ lancs, cartaoCor, onEdit, onLancar }: {
  lancs: LancamentoCartao[]; cartaoCor: string;
  onEdit: (l: LancamentoCartao) => void
  onLancar: () => void
}) {
  if (lancs.length === 0) {
    return (
      <div style={{
        padding: '40px 24px', textAlign: 'center',
        background: '#FBF8F3', border: '1px dashed #EDE6DC', borderRadius: 14,
      }}>
        <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 16, fontWeight: 700, color: '#2C1A0F', margin: 0, letterSpacing: '-0.4px' }}>
          Nenhum lançamento nesta fatura
        </p>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#9B7B6A', margin: '6px 0 14px' }}>
          As despesas registradas neste mês aparecem aqui
        </p>
        <button onClick={onLancar}
          style={{
            background: 'transparent', color: cartaoCor, border: `1px solid ${cartaoCor}`,
            borderRadius: 10, padding: '8px 16px', cursor: 'pointer',
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', gap: 5,
          }}>
          <IconPlus size={13} stroke={2.4} /> Lançar primeira despesa
        </button>
      </div>
    )
  }

  // Ordena do mais recente pro mais antigo
  const sorted = [...lancs].sort((a, b) => (b.data ?? '').localeCompare(a.data ?? ''))

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {sorted.map((l, idx) => (
        <LancamentoRow key={l.id} lanc={l} onEdit={() => onEdit(l)} isLast={idx === sorted.length - 1} />
      ))}
    </div>
  )
}

function LancamentoRow({ lanc, onEdit, isLast }: { lanc: LancamentoCartao; onEdit: () => void; isLast: boolean }) {
  const [cat, setCat] = useState<Categoria | null>(null)
  const [openMenu, setOpenMenu] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<'this' | 'all' | null>(null)

  useEffect(() => {
    db.categorias.get(lanc.categoriaId).then(c => setCat(c ?? null))
  }, [lanc.categoriaId])

  const isParcelado = lanc.totalParcelas > 1
  const data = lanc.data ? new Date(lanc.data + 'T00:00:00') : null
  const dia = data ? String(data.getDate()).padStart(2, '0') : '—'
  const mesAbrev = data ? data.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '') : ''

  return (
    <>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '52px 1fr auto auto',
        gap: 14, alignItems: 'center',
        padding: '14px 8px',
        borderBottom: isLast ? 'none' : '1px solid #F5F0E8',
        transition: 'background .12s', borderRadius: 8,
      }}
        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#FBF8F3'}
        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
      >
        {/* Data column */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700, color: '#2C1A0F', margin: 0, letterSpacing: '-0.7px', lineHeight: 1 }}>{dia}</p>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 700, color: '#9B7B6A', letterSpacing: '.1em', textTransform: 'uppercase', margin: '2px 0 0' }}>{mesAbrev}</p>
        </div>

        {/* Categoria + descrição + chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          {cat ? (
            <CategoryIcon nome={cat.nome} cor={cat.cor} size={34} radius={10} />
          ) : (
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(122,92,79,0.12)' }}/>
          )}
          <div style={{ minWidth: 0 }}>
            <p style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 600,
              color: '#2C1A0F', margin: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{lanc.descricao || cat?.nome || 'Sem descrição'}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
              {cat && (
                <span style={{
                  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 600,
                  color: '#7A5C4F',
                }}>{cat.nome}</span>
              )}
              {isParcelado && (
                <>
                  <span style={{ color: '#D4C8BC', fontSize: 10 }}>·</span>
                  <span style={{
                    fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700,
                    color: '#A8442B',
                  }}>{lanc.parcelaAtual}/{lanc.totalParcelas}×</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Valor */}
        <span style={{
          fontFamily: "'Fraunces',Georgia,serif", fontSize: 16, fontWeight: 700,
          color: '#2C1A0F', letterSpacing: '-0.5px',
        }}>{fmt(lanc.valor)}</span>

        {/* Menu */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setOpenMenu(o => !o)} title="Opções"
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer', padding: 6,
              borderRadius: 6, display: 'flex', alignItems: 'center',
            }}>
            <IconDotsVertical size={15} stroke={1.8} color="#9B7B6A" />
          </button>
          {openMenu && (
            <>
              <div onClick={() => setOpenMenu(false)}
                style={{ position: 'fixed', inset: 0, zIndex: 90 }}/>
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 4,
                background: '#FFFFFF', border: '1px solid #EDE6DC',
                borderRadius: 10, boxShadow: '0 8px 24px rgba(28,10,5,0.18)',
                zIndex: 95, minWidth: 200, padding: 4,
                display: 'flex', flexDirection: 'column',
              }}>
                <MenuItem onClick={() => { setOpenMenu(false); onEdit() }}
                  icon={<IconEdit size={13} stroke={1.8} color="#7A5C4F" />} label="Editar"/>
                <MenuItem onClick={() => { setOpenMenu(false); setConfirmDelete('this') }}
                  icon={<IconTrash size={13} stroke={2} color="#C4553B" />}
                  label={isParcelado ? 'Excluir só esta parcela' : 'Excluir'} danger/>
                {isParcelado && (
                  <MenuItem onClick={() => { setOpenMenu(false); setConfirmDelete('all') }}
                    icon={<IconTrash size={13} stroke={2} color="#C4553B" />}
                    label="Excluir TODAS as parcelas" danger/>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <Modal
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        size="sm"
        title="Excluir lançamento?"
        subtitle={confirmDelete === 'all' && isParcelado
          ? `Todas as ${lanc.totalParcelas} parcelas serão removidas`
          : `"${lanc.descricao || cat?.nome || 'lançamento'}"`}
        icon={<IconTrash size={20} stroke={1.8} color="#C4553B" />}
      >
        <Modal.Body>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#7A5C4F', lineHeight: 1.5, margin: 0 }}>
            {confirmDelete === 'all'
              ? `Você está removendo TODAS as ${lanc.totalParcelas} parcelas. Esta ação não pode ser desfeita.`
              : 'Esta ação removerá apenas este lançamento da fatura.'}
          </p>
        </Modal.Body>
        <Modal.Footer>
          <button onClick={() => setConfirmDelete(null)}
            style={{ background: 'transparent', color: '#7A5C4F', border: '1.5px solid #EDE6DC', borderRadius: 12, padding: '11px 20px', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700 }}>
            Cancelar
          </button>
          <button onClick={async () => {
            if (confirmDelete === 'all' && lanc.id !== undefined) {
              await deleteLancamentoComParcelas(lanc.id)
            } else if (lanc.id !== undefined) {
              await deleteLancamentoCartao(lanc.id)
            }
            setConfirmDelete(null)
          }}
            style={{ background: 'linear-gradient(135deg, #D4643A, #C4553B)', color: '#FFFFFF', border: 'none', borderRadius: 12, padding: '11px 22px', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 7, boxShadow: '0 4px 16px rgba(196,85,59,0.35)' }}>
            <IconTrash size={15} stroke={2.4} /> Excluir
          </button>
        </Modal.Footer>
      </Modal>
    </>
  )
}

function MenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick}
      style={{
        background: 'transparent', border: 'none', cursor: 'pointer',
        padding: '9px 12px', borderRadius: 7,
        display: 'flex', alignItems: 'center', gap: 8,
        fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600,
        color: danger ? '#C4553B' : '#2C1A0F', textAlign: 'left',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = danger ? '#FAEAEA' : '#F5F0E8')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {icon}{label}
    </button>
  )
}

// ─── Categorias tab — stacked bar + ranking ────────────────────────────
function CategoriasTab({ lancs, faturaTotal }: { lancs: LancamentoCartao[]; faturaTotal: number }) {
  const categorias = useCategorias('despesa')
  const stats = useMemo(() => {
    const map = new Map<number, number>()
    lancs.forEach(l => map.set(l.categoriaId, (map.get(l.categoriaId) ?? 0) + l.valor))
    return Array.from(map.entries())
      .map(([catId, valor]) => {
        const c = categorias.find(cc => cc.id === catId)
        return { catId, valor, nome: c?.nome ?? '—', cor: c?.cor ?? '#7A5C4F' }
      })
      .sort((a, b) => b.valor - a.valor)
  }, [lancs, categorias])

  if (stats.length === 0) {
    return (
      <div style={{ padding: '40px 24px', textAlign: 'center', background: '#FBF8F3', border: '1px dashed #EDE6DC', borderRadius: 14 }}>
        <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 16, fontWeight: 700, color: '#2C1A0F', margin: 0, letterSpacing: '-0.4px' }}>
          Sem categorias pra agrupar
        </p>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#9B7B6A', margin: '6px 0 0' }}>
          Lance despesas pra ver a distribuição
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Stacked bar horizontal */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden',
          background: 'rgba(44,26,15,0.06)',
        }}>
          {stats.map(s => {
            const pct = faturaTotal > 0 ? (s.valor / faturaTotal) * 100 : 0
            return (
              <motion.div
                key={s.catId}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ type: 'spring', stiffness: 80, damping: 22 }}
                title={`${s.nome}: ${pct.toFixed(0)}%`}
                style={{ background: s.cor, height: '100%' }}
              />
            )
          })}
        </div>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#9B7B6A', margin: '8px 0 0', textAlign: 'right' }}>
          Total: <strong style={{ color: '#2C1A0F' }}>{fmt(faturaTotal)}</strong>
        </p>
      </div>

      {/* Ranking */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {stats.map((s, idx) => {
          const pct = faturaTotal > 0 ? (s.valor / faturaTotal) * 100 : 0
          return (
            <div key={s.catId}
              style={{
                display: 'grid', gridTemplateColumns: '28px 1fr auto auto', gap: 14, alignItems: 'center',
                padding: '12px 4px',
                borderBottom: idx === stats.length - 1 ? 'none' : '1px solid #F5F0E8',
              }}>
              <span style={{
                fontFamily: "'Fraunces',Georgia,serif", fontSize: 18, fontWeight: 700,
                color: idx === 0 ? s.cor : 'rgba(122,92,79,0.55)',
                letterSpacing: '-0.5px', textAlign: 'center',
              }}>{idx + 1}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: s.cor, flexShrink: 0 }}/>
                <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 600, color: '#2C1A0F' }}>
                  {s.nome}
                </span>
              </div>
              <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: '#7A5C4F', minWidth: 40, textAlign: 'right' }}>
                {pct.toFixed(0)}%
              </span>
              <span style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 14, fontWeight: 700, color: '#2C1A0F', minWidth: 90, textAlign: 'right', letterSpacing: '-0.4px' }}>
                {fmt(s.valor)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Histórico tab — colunas verticais elegantes ───────────────────────
function HistoricoTab({ cartao }: { cartao: Cartao }) {
  const todos = useLiveQuery(
    () => cartao.id !== undefined
      ? db.lancamentosCartao.where('cartaoId').equals(cartao.id).toArray()
      : Promise.resolve([]),
    [cartao.id],
  ) ?? []

  const byMesAno = useMemo(() => {
    const map = new Map<string, { mes: number; ano: number; total: number }>()
    todos.forEach(l => {
      const key = `${l.ano}-${String(l.mes).padStart(2, '0')}`
      const existing = map.get(key)
      if (existing) existing.total += l.valor
      else map.set(key, { mes: l.mes, ano: l.ano, total: l.valor })
    })
    return Array.from(map.entries())
      .map(([_key, v]) => v)
      .sort((a, b) => (a.ano - b.ano) || (a.mes - b.mes)) // ASC pra cronológico
      .slice(-12)
  }, [todos])

  const maxTotal = byMesAno.reduce((m, x) => Math.max(m, x.total), 0)
  const total12m = byMesAno.reduce((s, x) => s + x.total, 0)
  const media = byMesAno.length > 0 ? total12m / byMesAno.length : 0
  const atual = mesAnoAtual()

  if (byMesAno.length === 0) {
    return (
      <div style={{ padding: '40px 24px', textAlign: 'center', background: '#FBF8F3', border: '1px dashed #EDE6DC', borderRadius: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <IconHistory size={32} stroke={1.6} color="#9B7B6A" />
        <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 16, fontWeight: 700, color: '#2C1A0F', margin: 0, letterSpacing: '-0.4px' }}>
          Ainda sem histórico
        </p>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#9B7B6A', margin: 0 }}>
          As faturas anteriores aparecem aqui
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Stats compactos em linha */}
      <div style={{ display: 'flex', gap: 28, marginBottom: 22, alignItems: 'baseline' }}>
        <InlineStat label={`Média mensal (${byMesAno.length} meses)`} value={fmt(media)} cor="#7A5C4F" />
        <InlineStat label={`Total em ${byMesAno.length} ${byMesAno.length === 1 ? 'mês' : 'meses'}`} value={fmt(total12m)} cor="#2C1A0F" />
      </div>

      {/* Colunas verticais */}
      <div style={{
        display: 'grid', gridTemplateColumns: `repeat(${byMesAno.length}, 1fr)`, gap: 8,
        height: 180, alignItems: 'end',
        padding: '0 4px',
      }}>
        {byMesAno.map(item => {
          const pct = maxTotal > 0 ? (item.total / maxTotal) * 100 : 0
          const isAtual = item.mes === atual.mes && item.ano === atual.ano
          const mesAbrev = new Date(item.ano, item.mes - 1, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
          return (
            <div key={`${item.ano}-${item.mes}`}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: 6 }}>
              <span style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 700,
                color: isAtual ? cartao.cor : '#9B7B6A',
                letterSpacing: '.04em',
              }}>{fmt(item.total).replace('R$', '')}</span>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${pct}%` }}
                transition={{ type: 'spring', stiffness: 80, damping: 22, delay: 0.05 }}
                style={{
                  width: '100%',
                  minHeight: 4,
                  background: isAtual
                    ? `linear-gradient(180deg, ${cartao.cor}, ${cartao.cor}cc)`
                    : `linear-gradient(180deg, ${cartao.cor}55, ${cartao.cor}30)`,
                  borderRadius: '4px 4px 0 0',
                }}
              />
              <span style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700,
                color: isAtual ? cartao.cor : '#7A5C4F',
                letterSpacing: '.04em', textTransform: 'uppercase',
              }}>{mesAbrev}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── helpers ─────────────────────────────────────────────────────────
function Meta({ label, value }: { label: string; value: string }) {
  return (
    <span>
      <span style={{ color: '#9B7B6A' }}>{label} </span>
      <strong style={{ color: '#2C1A0F', fontWeight: 700 }}>{value}</strong>
    </span>
  )
}

function Dot() {
  return <span style={{ color: '#D4C8BC' }}>·</span>
}

function InlineStat({ label, value, cor }: { label: string; value: string; cor: string }) {
  return (
    <div>
      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 700, color: '#9B7B6A', letterSpacing: '.12em', textTransform: 'uppercase', margin: 0 }}>
        {label}
      </p>
      <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 18, fontWeight: 700, color: cor, margin: '4px 0 0', letterSpacing: '-0.5px' }}>
        {value}
      </p>
    </div>
  )
}

function TabBtn({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      style={{
        position: 'relative',
        background: 'transparent', border: 'none', cursor: 'pointer',
        padding: '10px 4px',
        marginRight: 18,
        fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13,
        fontWeight: active ? 700 : 500,
        color: active ? '#2C1A0F' : '#9B7B6A',
        letterSpacing: '.02em',
        transition: 'color .15s',
      }}>
      {children}
      {active && (
        <motion.div
          layoutId="cartao-tab-underline"
          style={{
            position: 'absolute', left: 0, right: 0, bottom: -1, height: 2,
            background: '#C4553B', borderRadius: 2,
          }}/>
      )}
    </button>
  )
}

const ICON_BTN: React.CSSProperties = {
  background: '#FFFFFF', border: '1px solid #EDE6DC',
  borderRadius: 9, width: 32, height: 32, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0, transition: 'background .15s',
}

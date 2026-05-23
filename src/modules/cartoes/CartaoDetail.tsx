import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  IconPlus, IconEdit, IconTrash, IconChevronLeft, IconChevronRight,
  IconDotsVertical, IconArrowUpRight, IconArrowDownRight, IconHistory,
} from '@tabler/icons-react'
import type { Cartao, LancamentoCartao, Categoria } from '@/db/schema'
import { db } from '@/db/schema'
import { useCategorias } from '@/db/hooks/useCategorias'
import {
  useLancamentosCartao, useTotalFatura, deleteLancamentoCartao, deleteLancamentoComParcelas,
} from '@/db/hooks/useCartoes'
import { fmt, mesAnoAtual } from '@/lib/format'
import { RealCardVisual } from '@/components/ui/RealCardVisual'
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

  // Stroke do donut do limite
  const ringR = 36
  const ringCirc = 2 * Math.PI * ringR
  const corStatus = pctUsado >= 90 ? '#C4553B' : pctUsado >= 70 ? '#D4A017' : cartao.cor

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
      {/* ─── LOCKED HEADER ─── */}
      <div style={{
        padding: '20px 22px',
        background: `linear-gradient(135deg, ${cartao.cor}14 0%, ${cartao.cor}04 100%)`,
        borderBottom: '1px solid #EDE6DC',
        flexShrink: 0,
        display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'center',
      }}>
        {/* Esquerda: cartão visual mini + nome */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, minWidth: 0 }}>
          <div style={{ width: 180, flexShrink: 0 }}>
            <RealCardVisual
              nome={cartao.nome}
              bandeira={cartao.bandeira}
              cor={cartao.cor}
              logo={cartao.logo}
              titular={cartao.titular}
              ultimosDigitos={cartao.ultimosDigitos}
              diaVencimento={cartao.diaVencimento}
              cartaoId={cartao.id ?? 0}
              width={180}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{
              fontFamily: "'Fraunces',Georgia,serif", fontSize: 24, fontWeight: 700,
              color: '#2C1A0F', margin: 0, letterSpacing: '-0.7px', lineHeight: 1.1,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{cartao.nome}</h2>
            <p style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600,
              color: cartao.cor, margin: '4px 0 0',
              letterSpacing: '.08em', textTransform: 'uppercase',
            }}>{cartao.bandeira}</p>
            <p style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11,
              color: '#9B7B6A', margin: '8px 0 0',
            }}>
              Fecha dia <strong style={{ color: '#2C1A0F' }}>{cartao.diaFechamento}</strong>
              {' · '}
              Vence dia <strong style={{ color: '#2C1A0F' }}>{cartao.diaVencimento}</strong>
            </p>
          </div>
        </div>

        {/* Direita: ações */}
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
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }}>

        {/* Stats trio */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 14, alignItems: 'stretch', marginBottom: 18 }}>
          <StatCard
            label="Fatura atual"
            value={fmt(faturaAtual)}
            sub={mesNome}
            cor={corStatus}
          />
          <StatCard
            label="Disponível"
            value={fmt(disponivel)}
            sub={`de ${fmt(cartao.limite)}`}
            cor="#1E7D5A"
          />
          {/* Donut % uso */}
          <div style={{
            background: '#FBF8F3', border: '1px solid #EDE6DC', borderRadius: 14,
            padding: '14px 18px',
            display: 'flex', alignItems: 'center', gap: 12,
            minWidth: 180,
          }}>
            <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
              <svg width="80" height="80" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r={ringR} fill="none" stroke="rgba(44,26,15,0.06)" strokeWidth="6"/>
                <motion.circle cx="40" cy="40" r={ringR} fill="none"
                  stroke={corStatus} strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={ringCirc}
                  initial={{ strokeDashoffset: ringCirc }}
                  animate={{ strokeDashoffset: ringCirc * (1 - pctUsado / 100) }}
                  transition={{ type: 'spring', stiffness: 80, damping: 22, delay: 0.1 }}
                  style={{ transform: 'rotate(-90deg)', transformOrigin: '40px 40px' }}
                />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                <span style={{
                  fontFamily: "'Fraunces',Georgia,serif", fontSize: 17, fontWeight: 700,
                  color: '#2C1A0F', letterSpacing: '-0.4px', lineHeight: 1,
                }}>{pctUsado.toFixed(0)}%</span>
                <span style={{
                  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 8, fontWeight: 700,
                  color: '#9B7B6A', letterSpacing: '.08em', textTransform: 'uppercase',
                  marginTop: 2,
                }}>usado</span>
              </div>
            </div>
            <div>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: '#7A5C4F', letterSpacing: '.12em', textTransform: 'uppercase', margin: 0 }}>
                Limite total
              </p>
              <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 18, fontWeight: 700, color: '#2C1A0F', margin: '4px 0 0', letterSpacing: '-0.5px' }}>
                {fmt(cartao.limite)}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 4, background: '#F5F0E8', padding: 4, borderRadius: 12 }}>
            <TabBtn active={tab === 'lancamentos'} onClick={() => setTab('lancamentos')}>Lançamentos</TabBtn>
            <TabBtn active={tab === 'categorias'} onClick={() => setTab('categorias')}>Categorias</TabBtn>
            <TabBtn active={tab === 'historico'} onClick={() => setTab('historico')}>Histórico</TabBtn>
          </div>
          <div style={{ flex: 1 }} />
          <button onClick={() => onLancar(mes, ano)}
            style={{
              background: cartao.cor, color: '#FFFFFF', border: 'none',
              borderRadius: 10, padding: '8px 14px', cursor: 'pointer',
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', gap: 5,
              boxShadow: `0 3px 10px ${cartao.cor}40`,
              letterSpacing: '.02em',
            }}>
            <IconPlus size={13} stroke={2.5} /> Lançar
          </button>
        </div>

        {/* Month navigator (somente em Lançamentos e Categorias) */}
        {tab !== 'historico' && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: '#FBF8F3', border: '1px solid #EDE6DC',
            borderRadius: 12, padding: '8px 14px', marginBottom: 12,
          }}>
            <button onClick={prev}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', color: '#7A5C4F' }}>
              <IconChevronLeft size={16} stroke={2} />
            </button>
            <div style={{ textAlign: 'center' }}>
              <p style={{
                fontFamily: "'Fraunces',Georgia,serif", fontSize: 14, fontWeight: 700,
                color: '#2C1A0F', margin: 0, textTransform: 'capitalize', letterSpacing: '-0.3px',
              }}>{mesNome} {ano}</p>
              {isCurrentMonth && (
                <span style={{
                  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 700,
                  color: '#1E7D5A', background: 'rgba(58,133,128,0.14)',
                  padding: '1px 8px', borderRadius: 8,
                  letterSpacing: '.06em', textTransform: 'uppercase',
                }}>Atual</span>
              )}
            </div>
            <button onClick={next}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', color: '#7A5C4F' }}>
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

// ─── Lançamentos tab ─────────────────────────────────────────────────
function LancamentosList({ lancs, cartaoCor, onEdit, onLancar }: {
  lancs: LancamentoCartao[]; cartaoCor: string;
  onEdit: (l: LancamentoCartao) => void
  onLancar: () => void
}) {
  if (lancs.length === 0) {
    return (
      <div style={{
        padding: '32px 24px', textAlign: 'center',
        background: '#FBF8F3', border: '1px dashed #EDE6DC', borderRadius: 14,
      }}>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#7A5C4F', margin: 0 }}>
          Nenhum lançamento nesta fatura
        </p>
        <button onClick={onLancar}
          style={{
            marginTop: 12,
            background: 'transparent', color: cartaoCor, border: `1px solid ${cartaoCor}`,
            borderRadius: 10, padding: '7px 14px', cursor: 'pointer',
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', gap: 5,
          }}>
          <IconPlus size={13} stroke={2.4} /> Lançar primeiro gasto
        </button>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {lancs.map(l => <LancamentoRow key={l.id} lanc={l} onEdit={() => onEdit(l)} />)}
    </div>
  )
}

function LancamentoRow({ lanc, onEdit }: { lanc: LancamentoCartao; onEdit: () => void }) {
  const [cat, setCat] = useState<Categoria | null>(null)
  const [openMenu, setOpenMenu] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<'this' | 'all' | null>(null)

  useEffect(() => {
    db.categorias.get(lanc.categoriaId).then(c => setCat(c ?? null))
  }, [lanc.categoriaId])

  const isParcelado = lanc.totalParcelas > 1

  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 4px', borderRadius: 10,
        transition: 'background .12s', position: 'relative',
      }}
        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#FBF8F3'}
        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
      >
        {cat ? (
          <CategoryIcon nome={cat.nome} cor={cat.cor} size={36} radius={10} />
        ) : (
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(122,92,79,0.12)' }}/>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 600,
            color: '#2C1A0F', margin: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{lanc.descricao || cat?.nome || 'Sem descrição'}</p>
          <div style={{ display: 'flex', gap: 6, marginTop: 3, alignItems: 'center', flexWrap: 'wrap' }}>
            {cat && (
              <span style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 700,
                color: cat.cor, background: `${cat.cor}18`,
                padding: '2px 7px', borderRadius: 6,
                letterSpacing: '.04em',
              }}>{cat.nome}</span>
            )}
            {isParcelado && (
              <span style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 700,
                color: '#A8442B', background: 'rgba(196,85,59,0.12)',
                padding: '2px 7px', borderRadius: 6,
              }}>{lanc.parcelaAtual}/{lanc.totalParcelas}×</span>
            )}
          </div>
        </div>
        <span style={{
          fontFamily: "'Fraunces',Georgia,serif", fontSize: 14, fontWeight: 700,
          color: '#2C1A0F', letterSpacing: '-0.4px', flexShrink: 0,
        }}>{fmt(lanc.valor)}</span>
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
                zIndex: 95, minWidth: 180, padding: 4,
                display: 'flex', flexDirection: 'column',
              }}>
                <MenuItem onClick={() => { setOpenMenu(false); onEdit() }}
                  icon={<IconEdit size={13} stroke={1.8} color="#7A5C4F" />} label="Editar"/>
                <MenuItem onClick={() => { setOpenMenu(false); setConfirmDelete('this') }}
                  icon={<IconTrash size={13} stroke={2} color="#C4553B" />} label={isParcelado ? 'Excluir só esta parcela' : 'Excluir'} danger/>
                {isParcelado && (
                  <MenuItem onClick={() => { setOpenMenu(false); setConfirmDelete('all') }}
                    icon={<IconTrash size={13} stroke={2} color="#C4553B" />} label="Excluir TODAS as parcelas" danger/>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Confirm delete */}
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
        padding: '8px 10px', borderRadius: 7,
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

// ─── Categorias tab ──────────────────────────────────────────────────
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
      <div style={{ padding: '32px 24px', textAlign: 'center', background: '#FBF8F3', border: '1px dashed #EDE6DC', borderRadius: 14 }}>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#7A5C4F', margin: 0 }}>
          Sem lançamentos pra agrupar nesta fatura
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {stats.map(s => {
        const pct = faturaTotal > 0 ? (s.valor / faturaTotal) * 100 : 0
        return (
          <div key={s.catId}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: s.cor }}/>
              <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, color: '#2C1A0F', flex: 1 }}>{s.nome}</span>
              <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: '#7A5C4F' }}>{pct.toFixed(0)}%</span>
              <span style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 13, fontWeight: 700, color: '#2C1A0F', minWidth: 80, textAlign: 'right', letterSpacing: '-0.4px' }}>{fmt(s.valor)}</span>
            </div>
            <div style={{ height: 5, borderRadius: 3, background: 'rgba(44,26,15,0.06)', overflow: 'hidden' }}>
              <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ type: 'spring', stiffness: 100, damping: 22 }}
                style={{ height: '100%', background: s.cor, borderRadius: 3 }}/>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Histórico tab ────────────────────────────────────────────────────
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
      .sort((a, b) => (b.ano - a.ano) || (b.mes - a.mes))
      .slice(0, 12)
  }, [todos])

  const maxTotal = byMesAno.reduce((m, x) => Math.max(m, x.total), 0)
  const atual = mesAnoAtual()

  if (byMesAno.length === 0) {
    return (
      <div style={{ padding: '32px 24px', textAlign: 'center', background: '#FBF8F3', border: '1px dashed #EDE6DC', borderRadius: 14 }}>
        <IconHistory size={28} stroke={1.6} color="#9B7B6A" />
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#7A5C4F', margin: '8px 0 0' }}>
          Ainda sem histórico de faturas
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {byMesAno.map(item => {
        const pct = maxTotal > 0 ? (item.total / maxTotal) * 100 : 0
        const isAtual = item.mes === atual.mes && item.ano === atual.ano
        const nomeMes = new Date(item.ano, item.mes - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
        return (
          <div key={`${item.ano}-${item.mes}`}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 4px' }}>
            <div style={{ width: 110, flexShrink: 0 }}>
              <p style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700,
                color: '#2C1A0F', margin: 0, textTransform: 'capitalize',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{nomeMes}</p>
              {isAtual && (
                <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 700, color: '#1E7D5A', margin: '2px 0 0', letterSpacing: '.04em', textTransform: 'uppercase' }}>Atual</p>
              )}
            </div>
            <div style={{ flex: 1, height: 22, background: 'rgba(44,26,15,0.04)', borderRadius: 6, overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ type: 'spring', stiffness: 100, damping: 22 }}
                style={{
                  height: '100%',
                  background: `linear-gradient(90deg, ${cartao.cor}, ${cartao.cor}dd)`,
                  borderRadius: 6,
                }}
              />
            </div>
            <span style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 13, fontWeight: 700, color: '#2C1A0F', minWidth: 90, textAlign: 'right', letterSpacing: '-0.4px' }}>
              {fmt(item.total)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── helpers ─────────────────────────────────────────────────────────
function StatCard({ label, value, sub, cor }: { label: string; value: string; sub?: string; cor: string }) {
  return (
    <div style={{
      background: '#FBF8F3', border: '1px solid #EDE6DC',
      borderRadius: 14, padding: '14px 18px',
      display: 'flex', flexDirection: 'column', gap: 4,
      borderLeft: `3px solid ${cor}`,
    }}>
      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: '#7A5C4F', letterSpacing: '.12em', textTransform: 'uppercase', margin: 0 }}>
        {label}
      </p>
      <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700, color: cor, margin: 0, letterSpacing: '-0.7px', lineHeight: 1 }}>
        {value}
      </p>
      {sub && (
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#7A5C4F', margin: 0 }}>
          {sub}
        </p>
      )}
    </div>
  )
}

function TabBtn({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      background: active ? '#FFFFFF' : 'transparent',
      color: active ? '#2C1A0F' : '#9B7B6A',
      border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer',
      fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12,
      fontWeight: active ? 700 : 500,
      boxShadow: active ? '0 1px 4px rgba(44,26,15,0.1)' : 'none',
      transition: 'all .15s',
    }}>{children}</button>
  )
}

const ICON_BTN: React.CSSProperties = {
  background: '#FFFFFF', border: '1px solid #EDE6DC',
  borderRadius: 9, width: 32, height: 32, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0, transition: 'background .15s',
}

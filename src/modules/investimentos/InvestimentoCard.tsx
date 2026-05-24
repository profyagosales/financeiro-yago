import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconEdit, IconTrash, IconRefresh, IconLock, IconLink, IconArrowUpRight, IconArrowDownRight, IconCoins, IconCash, IconShoppingCart } from '@tabler/icons-react'
import type { Investimento, Meta } from '@/db/schema'
import { fmt } from '@/lib/format'
import { TIPO_META, LIQUIDEZ_LABEL } from './constants'
import { useProventos, calcDY12m, calcProventosMes, aceitaProventos, isRendaVariavel } from '@/db/hooks/useInvestimentos'

interface Props {
  invest: Investimento
  meta?: Meta | null
  onEdit: () => void
  onDelete: () => void
  onProventos?: () => void
  onAportes?: () => void
}

export function InvestimentoCard({ invest, meta, onEdit, onDelete, onProventos, onAportes }: Props) {
  const [hover, setHover] = useState(false)
  const tipoMeta = TIPO_META.get(invest.tipo)
  const Icon = tipoMeta?.Icon
  const cor = invest.cor ?? tipoMeta?.cor ?? '#7A5C4F'

  const rendimento = invest.valorAtual - invest.valorAplicado
  const rendPct = invest.valorAplicado > 0 ? (rendimento / invest.valorAplicado) * 100 : 0
  const positivo = rendimento >= 0

  const isVar = isRendaVariavel(invest.tipo)
  const podeProventos = aceitaProventos(invest.tipo)
  const proventos = useProventos(podeProventos ? invest.id : undefined)
  const dy12m = podeProventos ? calcDY12m(proventos, invest.valorAtual) : 0
  const proventosMes = podeProventos ? calcProventosMes(proventos) : 0

  const dataAplicacao = new Date(invest.dataAplicacao + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })

  const dataVencimento = invest.dataVencimento
    ? new Date(invest.dataVencimento + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    : null

  // Linha de detalhes (varia por tipo)
  const detalhesLinha = isVar
    ? [
        invest.ticker,
        invest.quantidade ? `${invest.quantidade.toLocaleString('pt-BR')} ${invest.tipo === 'Cripto' ? 'unid.' : 'cotas'}` : null,
        invest.precoMedio ? `PM R$ ${invest.precoMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : null,
        invest.cotacaoAtual ? `Cot. R$ ${invest.cotacaoAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : null,
      ].filter(Boolean).join(' · ')
    : [
        invest.rentabilidadeAnual ? `${(invest.rentabilidadeAnual * 100).toFixed(2)}% a.a.` : null,
        invest.benchmark,
        invest.liquidez ? LIQUIDEZ_LABEL[invest.liquidez] : null,
      ].filter(Boolean).join(' · ')

  return (
    <motion.div
      layout
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      whileHover={{ y: -3, boxShadow: '0 12px 32px rgba(44,26,15,0.1), 0 2px 8px rgba(44,26,15,0.05)' }}
      transition={{ type: 'spring', stiffness: 240, damping: 26 }}
      style={{
        position: 'relative',
        background: '#FFFFFF',
        border: '1px solid #EDE6DC',
        borderLeft: `3px solid ${cor}`,
        borderRadius: 16,
        padding: '16px 20px',
        boxShadow: '0 1px 3px rgba(44,26,15,0.05), 0 2px 10px rgba(44,26,15,0.04)',
      }}>
      <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr auto auto', gap: 14, alignItems: 'center' }}>
        {/* Ícone do tipo */}
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: cor, display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {Icon && <Icon size={20} stroke={1.8} color="#FFFFFF" />}
        </div>

        {/* Nome + meta + sub */}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 700, color: '#2C1A0F' }}>{invest.nome}</span>
            <span style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 700,
              color: cor, background: `${cor}18`, padding: '2px 7px', borderRadius: 6,
              letterSpacing: '.06em', textTransform: 'uppercase',
            }}>{tipoMeta?.label ?? invest.tipo}</span>
            {!isVar && (
              invest.valorAtualSource === 'auto' ? (
                <span title="Modo automático: rentabilidade aplicada mensalmente" style={SOURCE_BADGE_AUTO}>
                  <IconRefresh size={10} stroke={2.4} /> auto
                </span>
              ) : (
                <span title="Modo manual: valor editado por você" style={SOURCE_BADGE_MANUAL}>
                  <IconLock size={10} stroke={2.4} /> manual
                </span>
              )
            )}
            {podeProventos && dy12m > 0 && (
              <span title="Dividend Yield 12 meses" style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 700,
                color: '#1E7D5A', background: 'rgba(58,133,128,0.14)', border: '1px solid rgba(58,133,128,0.3)',
                padding: '2px 6px', borderRadius: 6,
                display: 'inline-flex', alignItems: 'center', gap: 3, letterSpacing: '.04em',
              }}>
                <IconCoins size={10} stroke={2.4} /> DY {dy12m.toFixed(2)}% (12m)
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
            {invest.instituicao && (
              <span style={SUB_TXT}>{invest.instituicao}</span>
            )}
            {detalhesLinha && (
              <>
                {invest.instituicao && <Dot />}
                <span style={SUB_TXT}>{detalhesLinha}</span>
              </>
            )}
            {meta && (
              <>
                <Dot />
                <span style={{ ...SUB_TXT, color: '#A8442B', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <IconLink size={11} stroke={2} /> {meta.nome}
                </span>
              </>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
            <span style={{ ...SUB_TXT, color: '#9B7B6A' }}>Desde {dataAplicacao}</span>
            {dataVencimento && (
              <>
                <Dot />
                <span style={{ ...SUB_TXT, color: '#9B7B6A' }}>Vence {dataVencimento}</span>
              </>
            )}
            {podeProventos && proventosMes > 0 && (
              <>
                <Dot />
                <span style={{ ...SUB_TXT, color: '#1E7D5A', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <IconCash size={11} stroke={2.2} /> {fmt(proventosMes)} este mês
                </span>
              </>
            )}
          </div>
        </div>

        {/* Valores */}
        <div style={{ textAlign: 'right' }}>
          <p style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 18, fontWeight: 700,
            color: '#2C1A0F', letterSpacing: '-0.3px', margin: 0,
          }}>{fmt(invest.valorAtual)}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', marginTop: 2 }}>
            <span style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700,
              color: positivo ? '#3A8580' : '#C4553B',
              display: 'inline-flex', alignItems: 'center', gap: 2,
            }}>
              {positivo ? <IconArrowUpRight size={12} stroke={2.4} /> : <IconArrowDownRight size={12} stroke={2.4} />}
              {positivo ? '+' : ''}{rendPct.toFixed(2)}%
            </span>
            <span style={SUB_TXT}>aplicado {fmt(invest.valorAplicado)}</span>
          </div>
        </div>

        {/* Ações: Aportar (renda variável) + Proventos (FII/Ação/ETF) + edit/delete hover */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
          {isVar && onAportes && (
            <button onClick={onAportes} title="Registrar compra / ver aportes"
              style={{
                background: 'rgba(80,78,118,0.12)', color: '#504E76',
                border: '1px solid rgba(80,78,118,0.3)', borderRadius: 9,
                padding: '6px 10px', cursor: 'pointer',
                fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>
              <IconShoppingCart size={12} stroke={2.4} /> Aportar
            </button>
          )}
          {podeProventos && onProventos && (
            <button onClick={onProventos} title="Registrar/ver proventos"
              style={{
                background: 'rgba(58,133,128,0.12)', color: '#1E7D5A',
                border: '1px solid rgba(58,133,128,0.3)', borderRadius: 9,
                padding: '6px 10px', cursor: 'pointer',
                fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>
              <IconCoins size={12} stroke={2.4} /> Proventos
              {proventos.length > 0 && (
                <span style={{ background: 'rgba(30,125,90,0.18)', padding: '1px 5px', borderRadius: 4, fontSize: 9 }}>{proventos.length}</span>
              )}
            </button>
          )}
          <AnimatePresence>
            {hover && (
              <motion.div initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 6 }}
                transition={{ duration: 0.12 }}
                style={{ display: 'flex', gap: 6 }}>
                <button onClick={onEdit} title="Editar" style={ICON_BTN}>
                  <IconEdit size={14} stroke={1.8} color="#7A5C4F" />
                </button>
                <button onClick={onDelete} title="Excluir" style={{ ...ICON_BTN, background: '#FAEAEA' }}>
                  <IconTrash size={14} stroke={2} color="#C4553B" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

function Dot() {
  return <span style={{ width: 3, height: 3, borderRadius: 2, background: '#D4C8BC' }} />
}

const SUB_TXT: React.CSSProperties = {
  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 500, color: '#7A5C4F',
}

const ICON_BTN: React.CSSProperties = {
  background: '#F5F0E8', border: 'none', borderRadius: 9,
  width: 30, height: 30, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const SOURCE_BADGE_AUTO: React.CSSProperties = {
  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 700,
  color: '#A8730F', background: 'rgba(212,160,23,0.15)', border: '1px solid rgba(212,160,23,0.35)',
  padding: '2px 6px', borderRadius: 6,
  display: 'inline-flex', alignItems: 'center', gap: 3,
  letterSpacing: '.04em',
}

const SOURCE_BADGE_MANUAL: React.CSSProperties = {
  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 700,
  color: '#7A5C4F', background: '#F5F0E8', border: '1px solid #EDE6DC',
  padding: '2px 6px', borderRadius: 6,
  display: 'inline-flex', alignItems: 'center', gap: 3,
  letterSpacing: '.04em',
}

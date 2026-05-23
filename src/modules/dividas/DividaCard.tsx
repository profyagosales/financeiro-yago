import { motion } from 'framer-motion'
import { IconEdit, IconTrash, IconCheck, IconLink } from '@tabler/icons-react'
import type { Divida } from '@/db/schema'
import { fmt } from '@/lib/format'
import { TIPO_META } from './constants'

interface DividaComputed extends Divida {
  saldoDevedor: number
  parcelasRestantes: number
  progresso: number
  quitada: boolean
}

interface Props {
  divida: DividaComputed
  onEdit: () => void
  onDelete: () => void
}

export function DividaCard({ divida, onEdit, onDelete }: Props) {
  const tipoMeta = TIPO_META.get(divida.tipo)
  const Icon = tipoMeta?.Icon
  const cor = divida.cor ?? tipoMeta?.cor ?? '#C4553B'

  // Projeção de quitação
  let projecao: string | null = null
  if (divida.parcelasRestantes > 0 && divida.parcelasTotal > 0) {
    const hoje = new Date()
    const fim = new Date(hoje.getFullYear(), hoje.getMonth() + divida.parcelasRestantes, 1)
    projecao = fim.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
  }

  const dataInicio = new Date(divida.dataInicio + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <motion.div
      layout
      whileHover={{ y: -2, boxShadow: '0 12px 32px rgba(168,68,43,0.16), 0 2px 8px rgba(44,26,15,0.05)' }}
      transition={{ type: 'spring', stiffness: 240, damping: 26 }}
      style={{
        position: 'relative',
        background: '#FFFFFF',
        border: '1px solid #EDE6DC',
        borderLeft: `3px solid ${cor}`,
        borderRadius: 16,
        padding: '16px 20px',
        boxShadow: '0 1px 3px rgba(44,26,15,0.05), 0 2px 10px rgba(44,26,15,0.04)',
        opacity: divida.quitada ? 0.75 : 1,
      }}>
      <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr auto auto', gap: 14, alignItems: 'center' }}>
        {/* Ícone */}
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
            <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 700, color: '#2C1A0F' }}>{divida.nome}</span>
            <span style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 700,
              color: cor, background: `${cor}18`, padding: '2px 7px', borderRadius: 6,
              letterSpacing: '.06em', textTransform: 'uppercase',
            }}>{tipoMeta?.label ?? divida.tipo}</span>
            {divida.quitada && (
              <span style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 700,
                color: '#1E7D5A', background: 'rgba(58,133,128,0.18)', border: '1px solid rgba(58,133,128,0.35)',
                padding: '2px 7px', borderRadius: 6,
                letterSpacing: '.04em',
                display: 'inline-flex', alignItems: 'center', gap: 3,
              }}>
                <IconCheck size={10} stroke={2.4} /> Quitada
              </span>
            )}
            {divida.contaFixaId && (
              <span title="Vinculada a uma Conta Fixa — pagamentos sincronizam automaticamente" style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 700,
                color: '#A8730F', background: 'rgba(212,160,23,0.15)', border: '1px solid rgba(212,160,23,0.35)',
                padding: '2px 7px', borderRadius: 6,
                letterSpacing: '.04em',
                display: 'inline-flex', alignItems: 'center', gap: 3,
              }}>
                <IconLink size={10} stroke={2.4} /> sincronizada
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
            {divida.instituicao && (
              <span style={SUB_TXT}>{divida.instituicao}</span>
            )}
            {divida.jurosAnual && (
              <>
                {divida.instituicao && <Dot />}
                <span style={SUB_TXT}>{(divida.jurosAnual * 100).toFixed(2)}% a.a.</span>
              </>
            )}
            {divida.valorParcela > 0 && (
              <>
                <Dot />
                <span style={SUB_TXT}>Parcela {fmt(divida.valorParcela)} · dia {divida.diaVencimento}</span>
              </>
            )}
          </div>

          {/* Progress bar de parcelas */}
          {divida.parcelasTotal > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 600, color: '#7A5C4F' }}>
                  {divida.parcelasPagas}/{divida.parcelasTotal} parcelas pagas
                  {projecao && !divida.quitada && (
                    <span style={{ color: '#9B7B6A', marginLeft: 8 }}>· quita em {projecao}</span>
                  )}
                </span>
                <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: cor }}>
                  {divida.progresso.toFixed(0)}%
                </span>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: 'rgba(196,85,59,0.12)', overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, divida.progresso)}%` }}
                  transition={{ type: 'spring', stiffness: 100, damping: 22 }}
                  style={{ height: '100%', borderRadius: 3, background: cor }}
                />
              </div>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <span style={{ ...SUB_TXT, color: '#9B7B6A' }}>Início {dataInicio}</span>
          </div>
        </div>

        {/* Saldo devedor */}
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 700, color: '#9B7B6A', letterSpacing: '.1em', textTransform: 'uppercase', margin: 0 }}>
            Saldo devedor
          </p>
          <p style={{
            fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700,
            color: divida.quitada ? '#3A8580' : '#A8442B', letterSpacing: '-0.5px', margin: '2px 0 0',
          }}>{fmt(divida.saldoDevedor)}</p>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: '#9B7B6A', margin: '2px 0 0' }}>
            de {fmt(divida.valorTotal)}
          </p>
        </div>

        {/* Ações */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={onEdit} title="Editar" style={ICON_BTN}>
            <IconEdit size={14} stroke={1.8} color="#7A5C4F" />
          </button>
          <button onClick={onDelete} title="Excluir" style={{ ...ICON_BTN, background: '#FAEAEA' }}>
            <IconTrash size={14} stroke={2} color="#C4553B" />
          </button>
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

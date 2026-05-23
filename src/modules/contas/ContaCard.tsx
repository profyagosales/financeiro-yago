import { motion } from 'framer-motion'
import { IconEdit, IconTrash, IconPlus, IconHistory, IconArrowUpRight, IconArrowDownRight, IconMinus } from '@tabler/icons-react'
import type { Conta } from '@/db/schema'
import { fmt } from '@/lib/format'
import { BankLogo } from '@/components/ui/BankLogo'

interface Props {
  conta: Conta
  onEdit: () => void
  onLancar: () => void
  onHistorico: () => void
  onDelete: () => void
  // Métricas opcionais (caso a página queira passar)
  variacaoPct?: number | null
  ultimaMovimentacao?: string | null
  transacoesMes?: number
}

export function ContaCard({
  conta,
  onEdit, onLancar, onHistorico, onDelete,
  variacaoPct = null,
  ultimaMovimentacao = null,
  transacoesMes = 0,
}: Props) {
  const negativo = conta.saldoAtual < 0
  const zero = conta.saldoAtual === 0
  const corSaldo = negativo ? '#C4553B' : zero ? '#7A5C4F' : '#2C1A0F'

  return (
    <motion.div
      layout
      whileHover={{ y: -4, boxShadow: `0 16px 40px ${conta.cor}26, 0 4px 14px rgba(44,26,15,0.08)` }}
      transition={{ type: 'spring', stiffness: 240, damping: 26 }}
      style={{
        position: 'relative',
        background: '#FFFFFF',
        border: '1px solid #EDE6DC',
        borderTop: `4px solid ${conta.cor}`,
        borderRadius: 20,
        padding: '20px 22px',
        boxShadow: '0 1px 3px rgba(44,26,15,0.05), 0 4px 14px rgba(44,26,15,0.05)',
        display: 'flex', flexDirection: 'column', gap: 16,
        height: '100%',
      }}>
      {/* Header — logo + nome + tipo + ações */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <BankLogo logo={conta.logo} nome={conta.nome} cor={conta.cor} size={56} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontFamily: "'Fraunces',Georgia,serif", fontSize: 18, fontWeight: 700,
            color: '#2C1A0F', margin: 0, letterSpacing: '-0.4px',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{conta.nome}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <span style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700,
              color: conta.cor, background: `${conta.cor}18`,
              padding: '2px 8px', borderRadius: 6,
              letterSpacing: '.06em', textTransform: 'uppercase',
            }}>{conta.tipo}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={onEdit} title="Editar" style={ICON_BTN}>
            <IconEdit size={13} stroke={1.8} color="#7A5C4F" />
          </button>
          <button onClick={onDelete} title="Excluir" style={{ ...ICON_BTN, background: '#FAEAEA' }}>
            <IconTrash size={13} stroke={2} color="#C4553B" />
          </button>
        </div>
      </div>

      {/* Saldo — herói visual */}
      <div>
        <p style={{
          fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700,
          color: '#9B7B6A', letterSpacing: '.12em', textTransform: 'uppercase', margin: 0,
        }}>Saldo atual</p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
          <p style={{
            fontFamily: "'Fraunces',Georgia,serif", fontSize: 30, fontWeight: 700,
            color: corSaldo, letterSpacing: '-1.2px', lineHeight: 1, margin: 0,
          }}>{fmt(conta.saldoAtual)}</p>
          {variacaoPct !== null && variacaoPct !== undefined && Math.abs(variacaoPct) > 0.5 && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700,
              color: variacaoPct >= 0 ? '#3A8580' : '#C4553B',
              background: variacaoPct >= 0 ? 'rgba(58,133,128,0.12)' : 'rgba(196,85,59,0.12)',
              border: `1px solid ${variacaoPct >= 0 ? 'rgba(58,133,128,0.3)' : 'rgba(196,85,59,0.3)'}`,
              padding: '2px 8px', borderRadius: 16, letterSpacing: '.02em',
            }}>
              {variacaoPct >= 0 ? <IconArrowUpRight size={11} stroke={2.4} /> : <IconArrowDownRight size={11} stroke={2.4} />}
              {Math.abs(variacaoPct).toFixed(1)}%
            </span>
          )}
        </div>
        {/* Insights subtitle */}
        {(ultimaMovimentacao || transacoesMes > 0) && (
          <p style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#9B7B6A', margin: '8px 0 0',
          }}>
            {ultimaMovimentacao && <>Última: {ultimaMovimentacao}</>}
            {ultimaMovimentacao && transacoesMes > 0 && ' · '}
            {transacoesMes > 0 && <>{transacoesMes} {transacoesMes === 1 ? 'transação' : 'transações'} no mês</>}
          </p>
        )}
      </div>

      {/* Ações */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 'auto' }}>
        <button onClick={onLancar}
          style={{
            background: conta.cor, color: '#FFFFFF', border: 'none',
            borderRadius: 12, padding: '10px 12px', cursor: 'pointer',
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            letterSpacing: '.02em',
            boxShadow: `0 4px 14px ${conta.cor}40`,
            transition: 'all .15s',
          }}>
          <IconPlus size={14} stroke={2.5} /> Lançar
        </button>
        <button onClick={onHistorico}
          style={{
            background: '#FBF8F3', color: '#2C1A0F', border: '1px solid #EDE6DC',
            borderRadius: 12, padding: '10px 12px', cursor: 'pointer',
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            letterSpacing: '.02em',
          }}>
          <IconHistory size={13} stroke={2} /> Histórico
        </button>
      </div>
    </motion.div>
  )
}

const ICON_BTN: React.CSSProperties = {
  background: '#F5F0E8', border: 'none', borderRadius: 8,
  width: 28, height: 28, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0, transition: 'background .15s',
}

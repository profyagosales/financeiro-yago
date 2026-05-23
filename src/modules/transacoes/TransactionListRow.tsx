import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { IconArrowsExchange } from '@tabler/icons-react'
import type { Transacao, Conta, Categoria, Cartao } from '@/db/schema'
import { db } from '@/db/schema'
import { fmt } from '@/lib/format'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { BankLogo } from '@/components/ui/BankLogo'

interface Props {
  tx: Transacao
  active: boolean
  onClick: () => void
}

export function TransactionListRow({ tx, active, onClick }: Props) {
  const [cat, setCat] = useState<Categoria | null>(null)
  const [conta, setConta] = useState<Conta | null>(null)

  useEffect(() => {
    db.categorias.get(tx.categoriaId).then(c => setCat(c ?? null))
    db.contas.get(tx.contaId).then(c => setConta(c ?? null))
  }, [tx.categoriaId, tx.contaId])

  const isReceita = tx.tipo === 'receita'
  const isTransfer = !!tx.transferId
  const isPendente = tx.status === 'pendente'

  const sign = isReceita ? '+' : '−'
  const corValor = isReceita ? '#1E7D5A' : '#2C1A0F'

  // Determinar a cor da borda esquerda quando ativo
  const borderCor = cat?.cor ?? '#7A5C4F'

  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.99 }}
      style={{
        width: '100%',
        background: active ? `${borderCor}10` : 'transparent',
        border: 'none',
        borderLeft: active ? `3px solid ${borderCor}` : '3px solid transparent',
        borderRadius: 10,
        padding: '11px 12px 11px 9px',
        cursor: 'pointer',
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        gap: 12,
        alignItems: 'center',
        textAlign: 'left',
        transition: 'background .12s',
        opacity: isPendente ? 0.78 : 1,
      }}
      onMouseEnter={e => {
        if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(122,92,79,0.05)'
      }}
      onMouseLeave={e => {
        if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
      }}
    >
      {/* Ícone categoria ou transfer */}
      {isTransfer ? (
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: '#8B4BC8',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <IconArrowsExchange size={17} stroke={2} color="#FFFFFF" />
        </div>
      ) : cat ? (
        <CategoryIcon nome={cat.nome} cor={cat.cor} size={34} radius={10} />
      ) : (
        <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(122,92,79,0.12)' }}/>
      )}

      {/* Texto principal */}
      <div style={{ minWidth: 0 }}>
        <p style={{
          fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13,
          fontWeight: active ? 700 : 600,
          color: '#2C1A0F', margin: 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {tx.descricao || cat?.nome || 'Sem descrição'}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'nowrap', overflow: 'hidden' }}>
          {cat && (
            <span style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 600,
              color: '#7A5C4F',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{cat.nome}</span>
          )}
          {conta && (
            <>
              <span style={{ color: '#D4C8BC', fontSize: 9 }}>·</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
                <BankLogo logo={conta.logo} nome={conta.nome} cor={conta.cor} size={14} radiusRatio={0.28}/>
                <span style={{
                  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 600,
                  color: '#9B7B6A',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{conta.nome}</span>
              </span>
            </>
          )}
          {isPendente && (
            <span style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 700,
              color: '#A8730F', background: 'rgba(212,160,23,0.16)',
              padding: '1px 5px', borderRadius: 5,
              letterSpacing: '.04em',
              flexShrink: 0,
            }}>pendente</span>
          )}
        </div>
      </div>

      {/* Valor */}
      <span style={{
        fontFamily: "'Fraunces',Georgia,serif",
        fontSize: 14, fontWeight: 700,
        color: corValor,
        letterSpacing: '-0.4px', flexShrink: 0,
      }}>
        {sign}{fmt(tx.valor).replace(/^-/, '')}
      </span>
    </motion.button>
  )
}

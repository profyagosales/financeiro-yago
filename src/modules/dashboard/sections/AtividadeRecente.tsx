// ─── AtividadeRecente: últimas transações + insights rápidos ────────
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { IconChevronRight, IconArrowDownRight, IconArrowUpRight } from '@tabler/icons-react'
import { fmt, fmtDate } from '@/lib/format'
import { InsightChip } from '@/components/ui/InsightChip'
import type { Insight } from '../lib/insights'
import { useCategorias } from '@/db/hooks/useCategorias'

interface Tx {
  id?: number
  data: string
  valor: number
  tipo: string
  descricao: string
  categoriaId: number
  contaId: number
}

interface AtividadeRecenteProps {
  txs: Tx[]
  insights: Insight[]
}

export function AtividadeRecente({ txs, insights }: AtividadeRecenteProps) {
  const navigate = useNavigate()
  const categorias = useCategorias()
  const catMap = new Map(categorias.map(c => [c.id, c]))
  const top = txs.slice(0, 6)

  return (
    <section style={{
      background: '#FFFFFF',
      border: '1px solid #EDE6DC',
      borderRadius: 22,
      padding: '20px 22px',
      boxShadow: '0 1px 3px rgba(44,26,15,0.05), 0 4px 16px rgba(44,26,15,0.06)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <p style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 10, fontWeight: 700,
            color: '#7A5C4F', letterSpacing: '.14em', textTransform: 'uppercase', margin: 0,
          }}>Atividade recente</p>
          <h2 style={{
            fontFamily: "'Fraunces',Georgia,serif",
            fontSize: 22, fontWeight: 700, color: '#2C1A0F',
            letterSpacing: '-0.5px', margin: '2px 0 0',
          }}>Últimas movimentações</h2>
        </div>
        <button
          onClick={() => navigate('/transacoes')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '6px 10px', background: 'transparent', border: 'none', cursor: 'pointer',
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600, color: '#7A5C4F',
          }}>
          Ver tudo <IconChevronRight size={12} stroke={2.2} />
        </button>
      </div>

      {/* Lista de transações */}
      {top.length === 0 ? (
        <div style={{
          padding: '20px 16px', textAlign: 'center',
          background: '#FBF8F3', borderRadius: 12,
        }}>
          <p style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 600,
            color: '#7A5C4F', margin: 0,
          }}>Nenhuma transação ainda</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {top.map((tx, i) => {
            const cat = catMap.get(tx.categoriaId)
            const isRec = tx.tipo === 'receita'
            return (
              <motion.button
                key={tx.id ?? i}
                onClick={() => navigate('/transacoes')}
                initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                whileHover={{ x: 2 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 4px',
                  background: 'transparent', border: 'none',
                  borderBottom: i < top.length - 1 ? '1px dashed #F5EEE3' : 'none',
                  cursor: 'pointer', textAlign: 'left',
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                }}>
                {/* Categoria icon */}
                <div style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: cat ? `${cat.cor}22` : '#FBF8F3',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {isRec
                    ? <IconArrowUpRight size={16} stroke={2.2} color={cat?.cor ?? '#1E7D5A'} />
                    : <IconArrowDownRight size={16} stroke={2.2} color={cat?.cor ?? '#A8442B'} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: 13, fontWeight: 600, color: '#2C1A0F',
                    margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{tx.descricao || cat?.nome || 'Transação'}</p>
                  <p style={{ fontSize: 11, color: '#7A5C4F', margin: 0, fontWeight: 500 }}>
                    {fmtDate(tx.data)} {cat && `· ${cat.nome}`}
                  </p>
                </div>
                <span style={{
                  fontSize: 14, fontWeight: 700,
                  color: isRec ? '#1E7D5A' : '#A8442B',
                  letterSpacing: '-0.3px', whiteSpace: 'nowrap',
                }}>
                  {isRec ? '+' : '−'}{fmt(tx.valor).replace('-', '').replace('+', '')}
                </span>
              </motion.button>
            )
          })}
        </div>
      )}

      {/* Insights inline (até 3) */}
      {insights.length > 0 && (
        <>
          <div style={{
            margin: '14px 0 10px',
            paddingTop: 14,
            borderTop: '1px dashed #EDE6DC',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 10, fontWeight: 700,
              color: '#7A5C4F', letterSpacing: '.12em', textTransform: 'uppercase',
            }}>Insights rápidos</span>
            <div style={{ flex: 1, height: 1, background: 'transparent' }} />
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 8,
          }}>
            {insights.slice(0, 4).map(ins => (
              <InsightChip key={ins.id} icon={ins.icon} text={ins.text} tone={ins.tone} />
            ))}
          </div>
        </>
      )}
    </section>
  )
}

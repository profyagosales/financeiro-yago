// ─── MetasResumo: top 3 metas com barras de progresso ──────────────
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { IconChevronRight, IconTarget, IconTrophy } from '@tabler/icons-react'
import { fmt } from '@/lib/format'
import { ProgressBar } from '@/components/ui/ProgressBar'

interface MetaItem {
  id: number
  nome: string
  valorAtual: number
  valorAlvo: number
  pct: number
  cor: string
  icone: string
  tipo: string
}

interface MetasResumoProps {
  metas: MetaItem[]
}

export function MetasResumo({ metas }: MetasResumoProps) {
  const navigate = useNavigate()

  return (
    <section style={{
      background: '#FFFFFF',
      border: '1px solid #EDE6DC',
      borderRadius: 22,
      padding: '20px 22px',
      boxShadow: '0 1px 3px rgba(44,26,15,0.05), 0 4px 16px rgba(44,26,15,0.06)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <p style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 10, fontWeight: 700,
            color: '#9B7B6A', letterSpacing: '.14em', textTransform: 'uppercase', margin: 0,
          }}>Metas em andamento</p>
          <h2 style={{
            fontFamily: "'Fraunces',Georgia,serif",
            fontSize: 22, fontWeight: 700, color: '#2C1A0F',
            letterSpacing: '-0.5px', margin: '2px 0 0',
          }}>{metas.length === 0 ? 'Sem metas ativas' : 'Caminho até lá'}</h2>
        </div>
        <button
          onClick={() => navigate('/metas')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '6px 10px', background: 'transparent', border: 'none', cursor: 'pointer',
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600, color: '#7A5C4F',
          }}>
          Ver todas <IconChevronRight size={12} stroke={2.2} />
        </button>
      </div>

      {metas.length === 0 ? (
        <div style={{
          padding: '22px 16px', textAlign: 'center',
          background: 'rgba(212,160,23,0.06)', borderRadius: 14, border: '1px dashed rgba(212,160,23,0.3)',
        }}>
          <IconTarget size={28} stroke={1.6} color="#A8730F" />
          <p style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 600,
            color: '#7A5C4F', margin: '8px 0 4px',
          }}>Defina uma meta pra começar a economizar com propósito</p>
          <button onClick={() => navigate('/metas')}
            style={{
              marginTop: 8, padding: '8px 16px',
              background: '#D4A017', border: 'none', borderRadius: 10,
              color: '#2C1A0F', cursor: 'pointer',
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700,
            }}>Criar meta</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {metas.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => navigate('/metas')}
              style={{ cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: `${m.cor}22`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <IconTarget size={16} stroke={2} color={m.cor} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                    fontSize: 13, fontWeight: 700, color: '#2C1A0F',
                    margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{m.nome}</p>
                  <p style={{
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                    fontSize: 11, color: '#7A5C4F', margin: 0, fontWeight: 500,
                  }}>{fmt(m.valorAtual)} de {fmt(m.valorAlvo)}</p>
                </div>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontSize: 13, fontWeight: 700,
                  color: m.pct >= 75 ? '#1E7D5A' : m.pct >= 40 ? '#A8730F' : '#7A5C4F',
                }}>
                  {m.pct >= 95 && <IconTrophy size={13} stroke={2.4} />}
                  {m.pct.toFixed(0)}%
                </span>
              </div>
              <ProgressBar
                value={m.pct}
                color={m.cor}
                colorTo={m.cor}
                height={7}
                background="#F5EEE3"
              />
            </motion.div>
          ))}
        </div>
      )}
    </section>
  )
}

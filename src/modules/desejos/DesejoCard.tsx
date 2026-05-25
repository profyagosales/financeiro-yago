import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconEdit, IconTrash, IconExternalLink, IconShoppingCart, IconCircleMinus, IconRotateClockwise, IconCircleCheck } from '@tabler/icons-react'
import type { Desejo } from '@/db/schema'
import { fmt, fmtPct } from '@/lib/format'
import { desistirDesejo, reabrirDesejo } from '@/db/hooks/useDesejos'

interface Props {
  desejo: Desejo
  onEdit: () => void
  onComprar?: () => void
  onDelete: () => void
}

export function DesejoCard({ desejo, onEdit, onComprar, onDelete }: Props) {
  const [hover, setHover] = useState(false)
  const isAberto = desejo.status === 'aberto'
  const isComprado = desejo.status === 'comprado'
  const isDesistido = desejo.status === 'desistido'

  const economia = desejo.valorEstimado && desejo.valorMenorEncontrado && desejo.valorMenorEncontrado < desejo.valorEstimado
    ? desejo.valorEstimado - desejo.valorMenorEncontrado
    : null

  return (
    <motion.div
      layout
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(44,26,15,0.1), 0 2px 8px rgba(44,26,15,0.05)' }}
      transition={{ type: 'spring', stiffness: 240, damping: 26 }}
      style={{
        background: '#FFFFFF', border: '1px solid #EDE6DC',
        borderRadius: 16, padding: 14,
        boxShadow: '0 1px 3px rgba(44,26,15,0.05)',
        display: 'flex', flexDirection: 'column', gap: 8,
        opacity: isDesistido ? 0.55 : 1,
      }}>
      {/* Topo: nome + ações */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <p style={{
          fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700,
          color: '#2C1A0F', flex: 1, margin: 0, lineHeight: 1.3,
          textDecoration: isComprado ? 'line-through' : undefined,
          textDecorationColor: isComprado ? '#9B7B6A' : undefined,
        }}>
          {desejo.nome}
        </p>
      </div>

      {/* Descrição se houver */}
      {desejo.descricao && (
        <p style={{
          fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#7A5C4F',
          margin: 0, lineHeight: 1.4,
          overflow: 'hidden', textOverflow: 'ellipsis',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>{desejo.descricao}</p>
      )}

      {/* Valores */}
      {(desejo.valorEstimado || desejo.valorMenorEncontrado) && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          {desejo.valorEstimado && (
            <span style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 16, fontWeight: 700,
              color: '#2C1A0F', letterSpacing: '-0.3px',
            }}>{fmt(desejo.valorEstimado)}</span>
          )}
          {economia && (
            <span title={`Menor preço encontrado: ${fmt(desejo.valorMenorEncontrado!)}`} style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 700,
              color: '#1E7D5A', background: 'rgba(58,133,128,0.15)',
              border: '1px solid rgba(58,133,128,0.3)',
              padding: '2px 6px', borderRadius: 6,
              letterSpacing: '.04em',
            }}>
              {fmt(desejo.valorMenorEncontrado!)} (-{fmtPct((economia / desejo.valorEstimado!) * 100, 0)})
            </span>
          )}
        </div>
      )}

      {/* Link */}
      {desejo.link && (
        <a href={desejo.link} target="_blank" rel="noreferrer"
          style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600,
            color: '#3D7EB5', display: 'inline-flex', alignItems: 'center', gap: 4,
            textDecoration: 'none',
          }}>
          <IconExternalLink size={11} stroke={2} /> Ver produto
        </a>
      )}

      {/* Observações (collapse simples — só primeiras linhas) */}
      {desejo.observacoes && (
        <p style={{
          fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: '#7A5C4F',
          margin: 0, fontStyle: 'italic', lineHeight: 1.4,
          overflow: 'hidden', textOverflow: 'ellipsis',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>{desejo.observacoes}</p>
      )}

      {/* Badges de status */}
      {isComprado && desejo.dataCompra && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <IconCircleCheck size={12} stroke={2} color="#3A8580" />
          <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: '#3A8580', letterSpacing: '.04em' }}>
            Comprado em {new Date(desejo.dataCompra + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
          </span>
        </div>
      )}

      {/* Ações */}
      <div style={{ display: 'flex', gap: 4, marginTop: 'auto', paddingTop: 4, alignItems: 'center' }}>
        {/* Botão principal sempre visível */}
        {isAberto && onComprar && (
          <button onClick={onComprar} aria-label="Marcar como comprado" title="Marcar como comprado"
            style={{
              flex: 1, background: 'rgba(58,133,128,0.12)', color: '#1E7D5A',
              border: '1px solid rgba(58,133,128,0.3)', borderRadius: 8,
              padding: '7px 8px', cursor: 'pointer',
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            }}>
            <IconShoppingCart size={11} stroke={2.4} /> Comprei
          </button>
        )}
        {(isComprado || isDesistido) && (
          <button onClick={() => desejo.id !== undefined && reabrirDesejo(desejo.id)} aria-label="Reabrir" title="Reabrir"
            style={{ ...SMALL_BTN, flex: 1 }}>
            <IconRotateClockwise size={11} stroke={2} color="#7A5C4F" />
            <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: '#7A5C4F', marginLeft: 4 }}>Reabrir</span>
          </button>
        )}

        {/* Ações secundárias só no hover (limpa o card visualmente) */}
        <AnimatePresence>
          {hover && (
            <motion.div initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 6 }}
              transition={{ duration: 0.12 }}
              style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              {isAberto && (
                <button onClick={() => desejo.id !== undefined && desistirDesejo(desejo.id)} aria-label="Desistir" title="Desistir"
                  style={SMALL_BTN}>
                  <IconCircleMinus size={12} stroke={2} color="#9B7B6A" />
                </button>
              )}
              <button onClick={onEdit} aria-label="Editar" title="Editar" style={SMALL_BTN}>
                <IconEdit size={11} stroke={1.8} color="#7A5C4F" />
              </button>
              <button onClick={onDelete} aria-label="Excluir" title="Excluir" style={{ ...SMALL_BTN, background: '#FAEAEA' }}>
                <IconTrash size={11} stroke={2} color="#C4553B" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

const SMALL_BTN: React.CSSProperties = {
  background: '#F5F0E8', border: 'none', borderRadius: 8,
  // 40x40 atende touch target mínimo mobile (era 28)
  width: 40, height: 40, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
}

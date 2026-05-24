import { createElement, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconEdit, IconTrash, IconPlus, IconTrophy, IconLink, IconCalendarEvent } from '@tabler/icons-react'
import type { MetaComputed } from '@/db/hooks/useMetas'
import { fmt } from '@/lib/format'
import { getMetaIcon, META_TIPO_BY } from './constants'

interface Props {
  meta: MetaComputed
  onEdit: () => void
  onAporte: () => void
  onDelete: () => void
}

export function MetaCard({ meta, onEdit, onAporte, onDelete }: Props) {
  const [hover, setHover] = useState(false)
  const tipoMeta = META_TIPO_BY.get(meta.tipo ?? 'outros')
  const atingida = meta.progressoPct >= 100
  const falta = Math.max(0, meta.valorAlvo - meta.valorAtualTotal)
  const corBarra = atingida ? '#3A8580' : meta.cor

  // Render do ícone via createElement (evita rule react-hooks/static-components)
  const iconNode = useMemo(
    () => createElement(getMetaIcon(meta.icone), { size: 22, stroke: 1.8, color: '#FFFFFF' }),
    [meta.icone],
  )

  // Captura "agora" uma vez no mount via lazy initializer — Date.now() fora do render
  const [nowMs] = useState(() => Date.now())
  const diasRestantes = useMemo(() => {
    if (!meta.prazo) return null
    return Math.ceil((new Date(meta.prazo + 'T00:00:00').getTime() - nowMs) / 86400000)
  }, [meta.prazo, nowMs])
  const aporteMensal = diasRestantes && diasRestantes > 0 && falta > 0
    ? falta / Math.max(1, diasRestantes / 30)
    : null

  return (
    <motion.div
      layout
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      whileHover={{ y: -4, boxShadow: '0 10px 28px rgba(44,26,15,0.1), 0 2px 8px rgba(44,26,15,0.05)' }}
      transition={{ type: 'spring', stiffness: 240, damping: 26 }}
      style={{
        position: 'relative',
        background: '#FFFFFF', border: '1px solid #EDE6DC',
        borderRadius: 20, padding: '18px 20px',
        boxShadow: '0 1px 3px rgba(44,26,15,0.05), 0 2px 10px rgba(44,26,15,0.04)',
        display: 'flex', flexDirection: 'column', gap: 12,
        height: '100%',
      }}>
      {/* Topo */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: meta.cor, display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {iconNode}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 700, color: '#2C1A0F', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {meta.nome}
            </p>
            {atingida && (
              <span style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 700,
                color: '#1E7D5A', background: 'rgba(58,133,128,0.18)', border: '1px solid rgba(58,133,128,0.35)',
                padding: '2px 6px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 3, letterSpacing: '.04em',
              }}>
                <IconTrophy size={10} stroke={2.4} /> conquistada
              </span>
            )}
          </div>
          {tipoMeta && (
            <p style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700,
              color: meta.cor, margin: '2px 0 0', letterSpacing: '.06em', textTransform: 'uppercase',
            }}>{tipoMeta.label}</p>
          )}
        </div>
        <AnimatePresence>
          {hover && (
            <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.12 }}
              style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              <button onClick={onEdit} title="Editar" style={ICON_BTN}>
                <IconEdit size={12} stroke={1.8} color="#7A5C4F" />
              </button>
              <button onClick={onDelete} title="Excluir" style={{ ...ICON_BTN, background: '#FAEAEA' }}>
                <IconTrash size={12} stroke={2} color="#C4553B" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Progresso */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
          <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 22, fontWeight: 700, color: '#2C1A0F', letterSpacing: '-0.3px' }}>
            {fmt(meta.valorAtualTotal)}
          </span>
          <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#7A5C4F' }}>
            de {fmt(meta.valorAlvo)}
          </span>
        </div>
        <div style={{ background: '#F0EAE2', borderRadius: 4, height: 6, overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${meta.progressoPct}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 22 }}
            style={{ height: '100%', background: corBarra, borderRadius: 4 }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
          <span style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700,
            color: corBarra, letterSpacing: '.04em',
          }}>{meta.progressoPct.toFixed(0)}% concluído</span>
          {!atingida && (
            <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: '#7A5C4F' }}>
              faltam {fmt(falta)}
            </span>
          )}
        </div>
      </div>

      {/* Composição (aporte direto + investimentos) */}
      {(meta.valorInvestido > 0 || meta.investimentos.length > 0) && (
        <div style={{ background: '#FBF8F3', border: '1px solid #EDE6DC', borderRadius: 10, padding: '8px 10px' }}>
          <p style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 700,
            color: '#7A5C4F', letterSpacing: '.1em', textTransform: 'uppercase', margin: '0 0 6px',
          }}>Composição</p>
          {meta.valorAporteDireto > 0 && (
            <Row label="Aporte direto" valor={meta.valorAporteDireto} />
          )}
          {meta.investimentos.map(inv => (
            <Row
              key={inv.id}
              icon={<IconLink size={10} stroke={2.2} color="#7A5C4F" />}
              label={inv.nome}
              valor={inv.valorAtual}
            />
          ))}
        </div>
      )}

      {/* Prazo + aporte mensal sugerido */}
      {meta.prazo && !atingida && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: '#7A5C4F',
        }}>
          <IconCalendarEvent size={12} stroke={2} color="#9B7B6A" />
          {diasRestantes !== null && diasRestantes > 0
            ? <span>{diasRestantes} {diasRestantes === 1 ? 'dia' : 'dias'} restantes</span>
            : <span style={{ color: '#C4553B', fontWeight: 700 }}>Prazo vencido</span>}
          {aporteMensal && diasRestantes && diasRestantes > 0 && (
            <span style={{ color: '#7A5C4F' }}>· aporte sugerido {fmt(aporteMensal)}/mês</span>
          )}
        </div>
      )}

      {/* Botão de aporte */}
      {!atingida && (
        <button onClick={onAporte}
          style={{
            background: 'transparent', color: meta.cor, border: `1.5px solid ${meta.cor}`,
            borderRadius: 10, padding: '9px 12px', cursor: 'pointer',
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            marginTop: 'auto',
          }}>
          <IconPlus size={14} stroke={2.4} /> Registrar aporte
        </button>
      )}
    </motion.div>
  )
}

function Row({ label, valor, icon }: { label: string; valor: number; icon?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0' }}>
      {icon}
      <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#2C1A0F', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700, color: '#2C1A0F' }}>
        {fmt(valor)}
      </span>
    </div>
  )
}

const ICON_BTN: React.CSSProperties = {
  background: '#F5F0E8', border: 'none', borderRadius: 8,
  width: 28, height: 28, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0,
}

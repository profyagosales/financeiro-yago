// ─── Insights analíticos: cards detalhados gerados pela engine ─────
import { useState } from 'react'
import { motion } from 'framer-motion'
import { IconBulb, IconFilter } from '@tabler/icons-react'
import { SectionShell } from '../components/SectionShell'
import type { RelatoriosData } from '../lib/useRelatoriosData'

interface Props { d: RelatoriosData }

const CATEGORIAS_FILTRO = [
  { key: 'todas', label: 'Todas' },
  { key: 'tendencia', label: 'Tendências' },
  { key: 'comparativo', label: 'Comparativos' },
  { key: 'anomalia', label: 'Anomalias' },
  { key: 'sugestao', label: 'Sugestões' },
  { key: 'conquista', label: 'Conquistas' },
] as const

const TONE_STYLES = {
  positive: {
    bg: 'linear-gradient(135deg, rgba(58,133,128,0.08), rgba(30,125,90,0.03))',
    border: 'rgba(58,133,128,0.32)',
    iconBg: 'rgba(58,133,128,0.18)',
    iconColor: '#1E7D5A',
    titleColor: '#1E5944',
  },
  negative: {
    bg: 'linear-gradient(135deg, rgba(196,85,59,0.08), rgba(168,68,43,0.03))',
    border: 'rgba(196,85,59,0.3)',
    iconBg: 'rgba(196,85,59,0.18)',
    iconColor: '#A8442B',
    titleColor: '#8A3722',
  },
  neutral: {
    bg: 'linear-gradient(135deg, rgba(80,78,118,0.08), rgba(80,78,118,0.03))',
    border: 'rgba(80,78,118,0.26)',
    iconBg: 'rgba(80,78,118,0.16)',
    iconColor: '#3D3B5F',
    titleColor: '#3D3B5F',
  },
  highlight: {
    bg: 'linear-gradient(135deg, rgba(212,160,23,0.1), rgba(212,160,23,0.03))',
    border: 'rgba(212,160,23,0.32)',
    iconBg: 'rgba(212,160,23,0.2)',
    iconColor: '#A8730F',
    titleColor: '#6E4D08',
  },
} as const

export function SecInsights({ d }: Props) {
  const [filtro, setFiltro] = useState<(typeof CATEGORIAS_FILTRO)[number]['key']>('todas')
  const lista = filtro === 'todas' ? d.insights : d.insights.filter(i => i.categoria === filtro)

  return (
    <SectionShell
      id="insights"
      eyebrow="Inteligência financeira"
      title="Insights automáticos"
      description="Padrões detectados pela engine cruzando série temporal, comparativos e composição da carteira."
      icon={<IconBulb size={18} stroke={2} color="#A8730F" />}
      accent="#D4A017"
      action={(
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '5px 10px', borderRadius: 999,
          background: 'rgba(212,160,23,0.12)', border: '1px solid rgba(212,160,23,0.3)',
          fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: '#A8730F',
        }}>{d.insights.length} {d.insights.length === 1 ? 'insight' : 'insights'}</span>
      )}
    >
      {/* Filtros */}
      <div style={{
        display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap',
      }}>
        <IconFilter size={13} stroke={2.2} color="#7A5C4F" style={{ alignSelf: 'center', marginRight: 2 }} />
        {CATEGORIAS_FILTRO.map(f => {
          const count = f.key === 'todas'
            ? d.insights.length
            : d.insights.filter(i => i.categoria === f.key).length
          const active = filtro === f.key
          if (count === 0 && f.key !== 'todas') return null
          return (
            <button key={f.key} onClick={() => setFiltro(f.key)}
              style={{
                padding: '5px 11px', borderRadius: 999,
                background: active ? '#2C1A0F' : '#FBF8F3',
                border: active ? '1px solid #2C1A0F' : '1px solid #EDE6DC',
                color: active ? '#FFFFFF' : '#7A5C4F',
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontSize: 11.5, fontWeight: 700,
                cursor: 'pointer', whiteSpace: 'nowrap',
                transition: 'all .15s',
              }}>
              {f.label} {count > 0 && <span style={{ opacity: 0.6, marginLeft: 4 }}>{count}</span>}
            </button>
          )
        })}
      </div>

      {lista.length === 0 ? (
        <div style={{
          padding: '32px 20px', textAlign: 'center',
          background: '#FBF8F3', borderRadius: 14,
        }}>
          <p style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#9B7B6A',
            margin: 0, fontWeight: 500,
          }}>Nenhum insight nessa categoria.</p>
        </div>
      ) : (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12,
        }}>
          {lista.map((ins, i) => {
            const Icon = ins.icon
            const t = TONE_STYLES[ins.tone]
            return (
              <motion.div key={ins.id}
                initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                style={{
                  padding: '14px 16px', borderRadius: 14,
                  background: t.bg, border: `1px solid ${t.border}`,
                  display: 'flex', flexDirection: 'column', gap: 8,
                }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 9,
                    background: t.iconBg, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={16} stroke={2.2} color={t.iconColor} />
                  </div>
                  <h3 style={{
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                    fontSize: 13.5, fontWeight: 700, color: t.titleColor,
                    margin: 0, lineHeight: 1.3, letterSpacing: '-0.2px',
                  }}>{ins.title}</h3>
                </div>
                <p style={{
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontSize: 12.5, color: '#2C1A0F', margin: 0,
                  fontWeight: 500, lineHeight: 1.5, letterSpacing: '-0.1px',
                }}>{ins.body}</p>
                <span style={{
                  alignSelf: 'flex-start',
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontSize: 9.5, fontWeight: 700,
                  color: t.iconColor, letterSpacing: '.1em', textTransform: 'uppercase',
                  marginTop: 2, opacity: 0.8,
                }}>{ins.categoria}</span>
              </motion.div>
            )
          })}
        </div>
      )}
    </SectionShell>
  )
}

// ─── Metas: cards de progresso + projeção de quando atinge ─────────
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { IconTarget, IconTrophy, IconShieldCheck, IconClockHour4 } from '@tabler/icons-react'
import { SectionShell } from '../components/SectionShell'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { fmt } from '@/lib/format'
import type { RelatoriosData } from '../lib/useRelatoriosData'

interface Props { d: RelatoriosData }

export function SecMetas({ d }: Props) {
  const navigate = useNavigate()
  const reserva = d.reserva
  const metas = d.metasAtivas
  const taxaPoupancaMensal = Math.max(0, d.totais.receitasMensalMedia - d.totais.despesasMensalMedia)

  function mesesAteAtingir(faltam: number): number | null {
    if (faltam <= 0) return 0
    if (taxaPoupancaMensal <= 0) return null
    return Math.ceil(faltam / taxaPoupancaMensal)
  }

  return (
    <SectionShell
      id="metas"
      eyebrow="Metas"
      title="Progresso e projeção"
      description={`Com a média de poupança atual (${fmt(taxaPoupancaMensal)}/mês), aqui o tempo estimado pra cada meta.`}
      icon={<IconTarget size={18} stroke={2} color="#D4A017" />}
      accent="#D4A017"
      action={(
        <button onClick={() => navigate('/metas')}
          style={{
            padding: '6px 12px', background: '#FBF8F3', border: '1px solid #EDE6DC',
            borderRadius: 999, cursor: 'pointer',
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: '#7A5C4F',
          }}>Gerenciar</button>
      )}
    >
      {/* Reserva especial */}
      {reserva && (
        <div style={{
          padding: '14px 16px', marginBottom: 14,
          background: 'linear-gradient(135deg, rgba(58,133,128,0.08), rgba(58,133,128,0.02))',
          border: '1px solid rgba(58,133,128,0.25)', borderRadius: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(58,133,128,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <IconShieldCheck size={18} stroke={2} color="#1E7D5A" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontSize: 13.5, fontWeight: 700, color: '#2C1A0F', margin: 0,
              }}>Reserva de emergência</p>
              <p style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontSize: 11, color: '#7A5C4F', margin: 0, fontWeight: 500,
              }}>Cobre <strong>{d.reservaMeses.toFixed(1)} {d.reservaMeses === 1 ? 'mês' : 'meses'}</strong> de despesa</p>
            </div>
            <span style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 16, fontWeight: 700,
              color: d.reservaCobertura >= 100 ? '#1E7D5A' : '#A8730F',
            }}>{d.reservaCobertura.toFixed(0)}%</span>
          </div>
          <ProgressBar value={d.reservaCobertura} color="#3A8580" colorTo="#1E7D5A" marker={100} height={8} background="#F5EEE3" />
          <p style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 11.5, color: '#7A5C4F', margin: '6px 0 0', fontWeight: 500,
          }}>{fmt(reserva.valorAtualTotal)} de {fmt(reserva.valorAlvo)}</p>
        </div>
      )}

      {metas.length === 0 ? (
        <div style={{
          padding: '24px 20px', textAlign: 'center',
          background: 'rgba(212,160,23,0.06)', borderRadius: 14, border: '1px dashed rgba(212,160,23,0.28)',
        }}>
          <IconTarget size={32} stroke={1.6} color="#A8730F" />
          <p style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 600,
            color: '#7A5C4F', margin: '8px 0 0',
          }}>Sem metas ativas. Definir uma meta dá direção à economia.</p>
        </div>
      ) : (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12,
        }}>
          {metas.map((m, i) => {
            const falta = Math.max(0, m.valorAlvo - m.valorAtualTotal)
            const eta = mesesAteAtingir(falta)
            return (
              <motion.div key={m.id}
                initial={{ opacity: 0, y: 6 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                onClick={() => navigate('/metas')}
                style={{
                  padding: '14px 16px', borderRadius: 14, cursor: 'pointer',
                  background: '#FBF8F3', border: '1px solid #EDE6DC',
                  transition: 'all .15s',
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 9,
                    background: `${m.cor}22`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <IconTarget size={15} stroke={2} color={m.cor} />
                  </div>
                  <p style={{
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                    fontSize: 13, fontWeight: 700, color: '#2C1A0F',
                    margin: 0, flex: 1,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{m.nome}</p>
                  {m.progressoPct >= 95 && <IconTrophy size={15} stroke={2.4} color="#D4A017" />}
                </div>
                <ProgressBar value={m.progressoPct} color={m.cor} colorTo={m.cor} height={7} background="#F0E9DD" />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 8 }}>
                  <span style={{
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                    fontSize: 12, color: '#7A5C4F', fontWeight: 500,
                  }}>{fmt(m.valorAtualTotal)} / {fmt(m.valorAlvo)}</span>
                  <span style={{
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                    fontSize: 13, fontWeight: 700, color: m.cor,
                  }}>{m.progressoPct.toFixed(0)}%</span>
                </div>
                {eta !== null && eta > 0 && (
                  <div style={{
                    marginTop: 8, paddingTop: 8, borderTop: '1px dashed #EDE6DC',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                    <IconClockHour4 size={11} stroke={2.2} color="#7A5C4F" />
                    <span style={{
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                      fontSize: 11, color: '#7A5C4F', fontWeight: 600,
                    }}>
                      Estimativa: <strong style={{ color: '#2C1A0F' }}>{eta} {eta === 1 ? 'mês' : 'meses'}</strong> ({fmt(falta)} restantes)
                    </span>
                  </div>
                )}
                {eta === null && falta > 0 && (
                  <p style={{
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                    fontSize: 11, color: '#A8442B', margin: '8px 0 0', fontWeight: 600,
                  }}>Sem poupança disponível pra projetar prazo</p>
                )}
              </motion.div>
            )
          })}
        </div>
      )}
    </SectionShell>
  )
}

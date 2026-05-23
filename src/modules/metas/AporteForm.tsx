import { useState } from 'react'
import { motion } from 'framer-motion'
import { IconX, IconCheck, IconCurrencyReal, IconChartLine } from '@tabler/icons-react'
import type { Meta } from '@/db/schema'
import { aportarMeta } from '@/db/hooks/useMetas'

interface Props {
  meta: Meta
  onClose: () => void
  onOpenInvestimento: () => void
}

// Modal que oferece os 2 caminhos de aporte:
//   1. Aporte direto na meta (incrementa meta.valorAtual)
//   2. Vincular investimento real (abre InvestimentoForm com presetMetaId)
export function AporteForm({ meta, onClose, onOpenInvestimento }: Props) {
  const [valor, setValor] = useState('')
  const [path, setPath] = useState<'direto' | null>(null)

  const parseValor = (v: string) => parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0

  const handleAporte = async () => {
    const v = parseValor(valor)
    if (v <= 0 || !meta.id) return
    await aportarMeta(meta.id, v)
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(28,10,5,0.55)',
        backdropFilter: 'blur(8px)', zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 240, damping: 28 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: '#FFFFFF', borderRadius: 24,
          width: '100%', maxWidth: 520,
          boxShadow: '0 24px 64px rgba(28,10,5,0.4)',
        }}>
        <div style={{
          padding: '24px 28px', borderBottom: '1px solid #EDE6DC',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <h2 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700, color: '#2C1A0F', margin: 0, letterSpacing: '-0.5px' }}>
              Aportar em "{meta.nome}"
            </h2>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#9B7B6A', marginTop: 4 }}>
              Escolha como você quer adicionar dinheiro a esta meta
            </p>
          </div>
          <button onClick={onClose} style={{
            background: '#F5F0E8', border: 'none', borderRadius: 10,
            width: 32, height: 32, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <IconX size={16} stroke={2} color="#7A5C4F" />
          </button>
        </div>

        <div style={{ padding: '20px 28px' }}>
          {path === null ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Aporte direto */}
              <button onClick={() => setPath('direto')}
                style={PATH_BTN}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: 'linear-gradient(135deg, #D4643A, #C4553B)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <IconCurrencyReal size={22} stroke={1.8} color="#FFFFFF" />
                </div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 700, color: '#2C1A0F', margin: 0 }}>
                    Aporte direto
                  </p>
                  <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 500, color: '#7A5C4F', margin: '3px 0 0' }}>
                    Registra um valor diretamente no progresso da meta — simples e rápido.
                  </p>
                </div>
              </button>

              {/* Via investimento */}
              <button onClick={onOpenInvestimento}
                style={PATH_BTN}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: 'linear-gradient(135deg, #3A8580, #2C7470)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <IconChartLine size={22} stroke={1.8} color="#FFFFFF" />
                </div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 700, color: '#2C1A0F', margin: 0 }}>
                    Vincular novo investimento
                  </p>
                  <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 500, color: '#7A5C4F', margin: '3px 0 0' }}>
                    Cria um CDB, ação, cripto ou outro ativo vinculado a esta meta. Mais granular.
                  </p>
                </div>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <p style={{
                  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700,
                  color: '#7A5C4F', letterSpacing: '.1em', textTransform: 'uppercase', margin: 0,
                }}>Valor do aporte (R$)</p>
                <input
                  autoFocus
                  value={valor}
                  onChange={e => setValor(e.target.value)}
                  placeholder="0,00"
                  inputMode="decimal"
                  style={{
                    width: '100%', boxSizing: 'border-box', marginTop: 8,
                    background: '#FBF8F3', border: '1.5px solid #EDE6DC',
                    borderRadius: 12, padding: '14px 16px',
                    fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 22, fontWeight: 700,
                    color: '#2C1A0F', outline: 'none', letterSpacing: '-0.3px',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setPath(null)} style={SECONDARY_BTN}>Voltar</button>
                <button onClick={handleAporte} style={PRIMARY_BTN}>
                  <IconCheck size={16} stroke={2.5} /> Aportar
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

const PATH_BTN: React.CSSProperties = {
  background: '#FFFFFF', border: '1.5px solid #EDE6DC',
  borderRadius: 14, padding: '14px 16px', cursor: 'pointer',
  display: 'flex', alignItems: 'center', gap: 14,
  transition: 'all .15s',
}

const PRIMARY_BTN: React.CSSProperties = {
  background: 'linear-gradient(135deg, #D4643A, #C4553B)',
  color: '#FFFFFF', border: 'none', borderRadius: 12,
  padding: '11px 20px', cursor: 'pointer',
  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700,
  display: 'flex', alignItems: 'center', gap: 7,
  boxShadow: '0 4px 16px rgba(196,85,59,0.35)',
}

const SECONDARY_BTN: React.CSSProperties = {
  background: 'transparent', color: '#7A5C4F', border: '1.5px solid #EDE6DC',
  borderRadius: 12, padding: '11px 18px', cursor: 'pointer',
  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700,
}

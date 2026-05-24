import { useState } from 'react'
import { motion } from 'framer-motion'
import { IconX, IconCheck, IconShoppingCart, IconTrash, IconPlus } from '@tabler/icons-react'
import type { Investimento } from '@/db/schema'
import { useAportes, addAporte, deleteAporte, calcAportesStats } from '@/db/hooks/useInvestimentos'
import { fmt } from '@/lib/format'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'

interface Props {
  invest: Investimento
  onClose: () => void
}

export function AportesModal({ invest, onClose }: Props) {
  useBodyScrollLock(true)
  const aportes = useAportes(invest.id)
  const today = new Date().toISOString().split('T')[0]
  const stats = calcAportesStats(aportes)

  const [form, setForm] = useState({
    data: today,
    quantidade: '',
    precoUnitario: '',
    observacao: '',
  })

  const parseValor = (v: string) => parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0

  const handleAdd = async () => {
    const qtd = parseValor(form.quantidade)
    const preco = parseValor(form.precoUnitario)
    if (qtd <= 0 || preco <= 0 || !invest.id) return
    await addAporte({
      investimentoId: invest.id,
      data: form.data,
      quantidade: qtd,
      precoUnitario: preco,
      observacao: form.observacao || undefined,
    })
    setForm({ data: today, quantidade: '', precoUnitario: '', observacao: '' })
  }

  // Preview do novo PM caso este aporte seja confirmado
  const previewPM = (() => {
    const qtdNova = parseValor(form.quantidade)
    const precoNovo = parseValor(form.precoUnitario)
    if (qtdNova <= 0 || precoNovo <= 0) return null
    const qtdTotal = stats.quantidade + qtdNova
    const totalInvestido = stats.totalInvestido + (qtdNova * precoNovo)
    return qtdTotal > 0 ? totalInvestido / qtdTotal : 0
  })()

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
          width: '100%', maxWidth: 620, maxHeight: '90vh',
          overflowY: 'auto', boxShadow: '0 24px 64px rgba(28,10,5,0.4)',
        }}>
        {/* Header */}
        <div style={{
          padding: '22px 26px', borderBottom: '1px solid #EDE6DC',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          position: 'sticky', top: 0, background: '#FFFFFF', zIndex: 2,
        }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flex: 1 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(80,78,118,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <IconShoppingCart size={22} stroke={1.8} color="#504E76" />
            </div>
            <div>
              <h2 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700, color: '#2C1A0F', margin: 0, letterSpacing: '-0.5px' }}>
                Aportes
              </h2>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#9B7B6A', marginTop: 2 }}>
                {invest.nome}{invest.ticker ? ` · ${invest.ticker}` : ''}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: '#F5F0E8', border: 'none', borderRadius: 10,
            width: 32, height: 32, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <IconX size={16} stroke={2} color="#7A5C4F" />
          </button>
        </div>

        {/* KPIs derivados */}
        <div style={{ padding: '16px 26px', background: '#FBF8F3', borderBottom: '1px solid #EDE6DC', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <Kpi label="Quantidade total" value={stats.quantidade.toLocaleString('pt-BR')} sub={`${aportes.length} ${aportes.length === 1 ? 'compra' : 'compras'}`} cor="#504E76" />
          <Kpi label="Preço médio" value={fmt(stats.precoMedio)} sub="calculado dos aportes" cor="#3A8580" />
          <Kpi label="Total investido" value={fmt(stats.totalInvestido)} sub={invest.cotacaoAtual ? `posição: ${fmt(stats.quantidade * invest.cotacaoAtual)}` : 'sem cotação'} cor="#2C1A0F" />
        </div>

        {/* Form de novo aporte */}
        <div style={{ padding: '20px 26px', borderBottom: '1px solid #EDE6DC' }}>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: '#7A5C4F', letterSpacing: '.1em', textTransform: 'uppercase', margin: '0 0 12px' }}>Registrar nova compra</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
            <Field label="Data">
              <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} style={INPUT_STYLE} />
            </Field>
            <Field label="Quantidade">
              <input value={form.quantidade} onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))} placeholder="50" inputMode="decimal" style={INPUT_STYLE} />
            </Field>
            <Field label="Preço unit. (R$)">
              <input value={form.precoUnitario} onChange={e => setForm(f => ({ ...f, precoUnitario: e.target.value }))} placeholder="170,00" inputMode="decimal" style={INPUT_STYLE} />
            </Field>
          </div>

          <Field label="Observação (opcional)">
            <input value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} placeholder="Ex: oferta pública, IPO..." style={INPUT_STYLE} />
          </Field>

          {/* Preview do impacto no PM */}
          {previewPM !== null && (
            <div style={{ marginTop: 10, padding: '10px 12px', background: 'rgba(58,133,128,0.08)', border: '1px solid rgba(58,133,128,0.18)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600, color: '#1E7D5A' }}>
                Novo preço médio após este aporte
              </span>
              <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, fontWeight: 700, color: '#1E7D5A', letterSpacing: '-0.3px' }}>
                {fmt(previewPM)} {stats.precoMedio > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: previewPM > stats.precoMedio ? '#C4553B' : '#1E7D5A' }}>
                    ({previewPM > stats.precoMedio ? '+' : ''}{((previewPM - stats.precoMedio) / stats.precoMedio * 100).toFixed(2)}%)
                  </span>
                )}
              </span>
            </div>
          )}

          <button onClick={handleAdd} disabled={!form.quantidade || !form.precoUnitario}
            style={{
              marginTop: 12, width: '100%',
              background: (form.quantidade && form.precoUnitario) ? 'linear-gradient(135deg, #504E76, #3A3860)' : '#E8E0D5',
              color: (form.quantidade && form.precoUnitario) ? '#FFFFFF' : '#9B7B6A', border: 'none', borderRadius: 12,
              padding: '12px 0', cursor: (form.quantidade && form.precoUnitario) ? 'pointer' : 'not-allowed',
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              boxShadow: (form.quantidade && form.precoUnitario) ? '0 4px 16px rgba(80,78,118,0.3)' : 'none',
            }}>
            <IconPlus size={15} stroke={2.4} /> Registrar compra
          </button>
        </div>

        {/* Lista de aportes */}
        <div style={{ padding: '16px 26px 24px' }}>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: '#7A5C4F', letterSpacing: '.1em', textTransform: 'uppercase', margin: '0 0 10px' }}>
            Histórico {aportes.length > 0 && <span style={{ color: '#9B7B6A' }}>({aportes.length})</span>}
          </p>

          {aportes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#9B7B6A', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12 }}>
              Nenhum aporte registrado ainda.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {aportes.map(a => {
                const total = a.quantidade * a.precoUnitario
                return (
                  <div key={a.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', border: '1px solid #EDE6DC', borderRadius: 10, background: '#FFFFFF',
                  }}>
                    <div style={{ width: 36, textAlign: 'center', flexShrink: 0 }}>
                      <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 16, fontWeight: 700, color: '#2C1A0F', margin: 0, lineHeight: 1, letterSpacing: '-0.3px' }}>
                        {new Date(a.data + 'T00:00:00').getDate().toString().padStart(2, '0')}
                      </p>
                      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 700, color: '#9B7B6A', letterSpacing: '.06em', textTransform: 'uppercase', margin: '2px 0 0' }}>
                        {new Date(a.data + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                      </p>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, color: '#2C1A0F', margin: 0 }}>
                        {a.quantidade.toLocaleString('pt-BR')} × {fmt(a.precoUnitario)}
                      </p>
                      {a.observacao && (
                        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#9B7B6A', margin: '2px 0 0', fontStyle: 'italic' }}>{a.observacao}</p>
                      )}
                    </div>
                    <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 700, color: '#504E76', letterSpacing: '-0.3px' }}>
                      {fmt(total)}
                    </span>
                    <button onClick={() => a.id !== undefined && deleteAporte(a.id)} title="Remover aporte"
                      style={{ background: '#FAEAEA', border: 'none', borderRadius: 7, width: 26, height: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <IconTrash size={11} stroke={2} color="#C4553B" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 26px', borderTop: '1px solid #EDE6DC',
          display: 'flex', justifyContent: 'flex-end',
          position: 'sticky', bottom: 0, background: '#FFFFFF',
        }}>
          <button onClick={onClose}
            style={{
              background: 'transparent', color: '#7A5C4F', border: '1.5px solid #EDE6DC',
              borderRadius: 12, padding: '11px 24px', cursor: 'pointer',
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
            <IconCheck size={15} stroke={2.4} /> Fechar
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', marginBottom: 10 }}>
      <span style={{
        fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700,
        color: '#7A5C4F', letterSpacing: '.1em', textTransform: 'uppercase',
        display: 'block', marginBottom: 6,
      }}>{label}</span>
      {children}
    </label>
  )
}

function Kpi({ label, value, sub, cor }: { label: string; value: string; sub: string; cor: string }) {
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #EDE6DC', borderRadius: 12, padding: '10px 12px' }}>
      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 700, color: cor, letterSpacing: '.08em', textTransform: 'uppercase', margin: 0 }}>{label}</p>
      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 16, fontWeight: 700, color: cor, letterSpacing: '-0.3px', margin: '3px 0 1px' }}>{value}</p>
      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: '#9B7B6A', margin: 0 }}>{sub}</p>
    </div>
  )
}

const INPUT_STYLE: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: '#FBF8F3', border: '1.5px solid #EDE6DC',
  borderRadius: 10, padding: '10px 12px',
  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 500,
  color: '#2C1A0F', outline: 'none',
}

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { IconX, IconCheck, IconShoppingCart, IconTrash, IconPlus, IconCurrencyDollar, IconCurrencyReal, IconCloudDownload } from '@tabler/icons-react'
import type { Investimento } from '@/db/schema'
import { useAportes, addAporte, deleteAporte, calcAportesStats } from '@/db/hooks/useInvestimentos'
import { fetchCotacaoDolar, fetchCotacaoPorTipo } from '@/lib/cotacoes'
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

  const isCripto = invest.tipo === 'Cripto'

  // Modo de entrada: BRL direto, USD com câmbio, ou "investi X fiat, recebi Y unid"
  // Pra cripto, expor todos. Pra outros, só BRL.
  const [modo, setModo] = useState<'brl' | 'usd' | 'investido_brl' | 'investido_usd'>('brl')

  const [form, setForm] = useState({
    data: today,
    quantidade: '',
    precoUnitario: '',         // em BRL (campo unificado interno)
    valorInvestido: '',        // pro modo "investi X reais/dólares"
    cotacaoDolar: '',          // pro modo USD
    observacao: '',
  })

  const [fetchingFx, setFetchingFx] = useState(false)
  const [fetchingCotAtivo, setFetchingCotAtivo] = useState(false)

  const parseValor = (v: string) => parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0

  // Quando seleciona modo USD, busca cotação do dólar automaticamente
  useEffect(() => {
    if ((modo === 'usd' || modo === 'investido_usd') && !form.cotacaoDolar) {
      setFetchingFx(true)
      fetchCotacaoDolar().then(c => {
        if (c !== null) setForm(f => ({ ...f, cotacaoDolar: c.toFixed(4) }))
        setFetchingFx(false)
      })
    }
  }, [modo])

  // Computa quantidade e preço unitário em BRL conforme o modo
  function computeAporte(): { qtd: number; precoBRL: number } | null {
    const qtdInput = parseValor(form.quantidade)
    const precoInput = parseValor(form.precoUnitario)
    const investido = parseValor(form.valorInvestido)
    const fx = parseValor(form.cotacaoDolar)

    if (modo === 'brl') {
      if (qtdInput <= 0 || precoInput <= 0) return null
      return { qtd: qtdInput, precoBRL: precoInput }
    }
    if (modo === 'usd') {
      if (qtdInput <= 0 || precoInput <= 0 || fx <= 0) return null
      return { qtd: qtdInput, precoBRL: precoInput * fx }
    }
    if (modo === 'investido_brl') {
      // user investiu X reais e obteve Y unidades
      if (qtdInput <= 0 || investido <= 0) return null
      return { qtd: qtdInput, precoBRL: investido / qtdInput }
    }
    if (modo === 'investido_usd') {
      if (qtdInput <= 0 || investido <= 0 || fx <= 0) return null
      const investidoBRL = investido * fx
      return { qtd: qtdInput, precoBRL: investidoBRL / qtdInput }
    }
    return null
  }

  const preview = computeAporte()

  const handleAdd = async () => {
    if (!preview || !invest.id) return
    const observacao = (() => {
      if (modo === 'usd') return `Comprado a US$ ${parseValor(form.precoUnitario).toFixed(2)}/un · câmbio R$ ${parseValor(form.cotacaoDolar).toFixed(2)}${form.observacao ? ' · ' + form.observacao : ''}`
      if (modo === 'investido_brl') return `Investiu R$ ${parseValor(form.valorInvestido).toFixed(2)}${form.observacao ? ' · ' + form.observacao : ''}`
      if (modo === 'investido_usd') return `Investiu US$ ${parseValor(form.valorInvestido).toFixed(2)} · câmbio R$ ${parseValor(form.cotacaoDolar).toFixed(2)}${form.observacao ? ' · ' + form.observacao : ''}`
      return form.observacao || undefined
    })()
    await addAporte({
      investimentoId: invest.id,
      data: form.data,
      quantidade: preview.qtd,
      precoUnitario: preview.precoBRL,
      observacao,
    })
    setForm({ data: today, quantidade: '', precoUnitario: '', valorInvestido: '', cotacaoDolar: form.cotacaoDolar, observacao: '' })
  }

  // Sugestão de cotação atual quando user clica "puxar do mercado"
  const handleFetchCotAtivo = async () => {
    if (!invest.ticker) return
    setFetchingCotAtivo(true)
    const c = await fetchCotacaoPorTipo(invest.tipo, invest.ticker)
    setFetchingCotAtivo(false)
    if (c !== null) {
      // se modo USD, converte BRL → USD
      if (modo === 'usd') {
        const fx = parseValor(form.cotacaoDolar)
        if (fx > 0) setForm(f => ({ ...f, precoUnitario: (c / fx).toFixed(2) }))
      } else if (modo === 'brl') {
        setForm(f => ({ ...f, precoUnitario: c.toFixed(2) }))
      }
    }
  }

  // Preview do novo PM caso este aporte seja confirmado (sempre em BRL)
  const previewPM = (() => {
    if (!preview) return null
    const qtdTotal = stats.quantidade + preview.qtd
    const totalInvestido = stats.totalInvestido + (preview.qtd * preview.precoBRL)
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

          {/* Toggle de modo (só pra cripto que tem caso comum de USD) */}
          {isCripto && (
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: '#7A5C4F', letterSpacing: '.08em', textTransform: 'uppercase', margin: '0 0 6px' }}>Como você comprou?</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                <ModoBtn active={modo === 'brl'} onClick={() => setModo('brl')} icon={<IconCurrencyReal size={12} stroke={2.2} />}>Qtd + preço em R$</ModoBtn>
                <ModoBtn active={modo === 'usd'} onClick={() => setModo('usd')} icon={<IconCurrencyDollar size={12} stroke={2.2} />}>Qtd + preço em US$</ModoBtn>
                <ModoBtn active={modo === 'investido_brl'} onClick={() => setModo('investido_brl')} icon={<IconCurrencyReal size={12} stroke={2.2} />}>"Investi R$ X e recebi Y"</ModoBtn>
                <ModoBtn active={modo === 'investido_usd'} onClick={() => setModo('investido_usd')} icon={<IconCurrencyDollar size={12} stroke={2.2} />}>"Investi US$ X e recebi Y"</ModoBtn>
              </div>
            </div>
          )}

          {/* Cotação do dólar (modos USD) */}
          {(modo === 'usd' || modo === 'investido_usd') && (
            <Field label="Cotação do dólar no dia (R$/US$)">
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input value={form.cotacaoDolar} onChange={e => setForm(f => ({ ...f, cotacaoDolar: e.target.value }))} placeholder="5,40" inputMode="decimal" style={{ ...INPUT_STYLE, flex: 1 }} />
                <button onClick={async () => {
                    setFetchingFx(true)
                    const c = await fetchCotacaoDolar()
                    if (c !== null) setForm(f => ({ ...f, cotacaoDolar: c.toFixed(4) }))
                    setFetchingFx(false)
                  }}
                  disabled={fetchingFx}
                  title="Buscar cotação atual"
                  style={{ background: '#FBF8F3', border: '1.5px solid #EDE6DC', borderRadius: 10, padding: '0 12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: '#7A5C4F' }}>
                  <motion.span animate={fetchingFx ? { rotate: 360 } : { rotate: 0 }} transition={fetchingFx ? { repeat: Infinity, duration: 0.8 } : { duration: 0.2 }} style={{ display: 'inline-flex' }}>
                    <IconCloudDownload size={12} stroke={2} />
                  </motion.span>
                  {fetchingFx ? '...' : 'Auto'}
                </button>
              </div>
            </Field>
          )}

          {/* Modos "Quantidade + Preço" */}
          {(modo === 'brl' || modo === 'usd') && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <Field label="Data">
                <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} style={INPUT_STYLE} />
              </Field>
              <Field label="Quantidade">
                <input value={form.quantidade} onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))} placeholder={isCripto ? '0,00461' : '50'} inputMode="decimal" style={INPUT_STYLE} />
              </Field>
              <Field label={modo === 'usd' ? 'Preço unit. (US$)' : 'Preço unit. (R$)'}>
                <div style={{ display: 'flex', gap: 4 }}>
                  <input value={form.precoUnitario} onChange={e => setForm(f => ({ ...f, precoUnitario: e.target.value }))} placeholder="170,00" inputMode="decimal" style={{ ...INPUT_STYLE, flex: 1 }} />
                  {invest.ticker && (
                    <button onClick={handleFetchCotAtivo} disabled={fetchingCotAtivo}
                      title={`Buscar cotação atual de ${invest.ticker}`}
                      style={{ background: '#FBF8F3', border: '1.5px solid #EDE6DC', borderRadius: 10, padding: '0 8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                      <motion.span animate={fetchingCotAtivo ? { rotate: 360 } : { rotate: 0 }} transition={fetchingCotAtivo ? { repeat: Infinity, duration: 0.8 } : { duration: 0.2 }} style={{ display: 'inline-flex' }}>
                        <IconCloudDownload size={12} stroke={2} color="#7A5C4F" />
                      </motion.span>
                    </button>
                  )}
                </div>
              </Field>
            </div>
          )}

          {/* Modos "Investi X e recebi Y" */}
          {(modo === 'investido_brl' || modo === 'investido_usd') && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <Field label="Data">
                <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} style={INPUT_STYLE} />
              </Field>
              <Field label={modo === 'investido_brl' ? 'Investi (R$)' : 'Investi (US$)'}>
                <input value={form.valorInvestido} onChange={e => setForm(f => ({ ...f, valorInvestido: e.target.value }))} placeholder={modo === 'investido_usd' ? '300,00' : '1500,00'} inputMode="decimal" style={INPUT_STYLE} />
              </Field>
              <Field label={`Recebi (${isCripto ? 'unidades' : 'cotas'})`}>
                <input value={form.quantidade} onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))} placeholder="0,00461" inputMode="decimal" style={INPUT_STYLE} />
              </Field>
            </div>
          )}

          <Field label="Observação (opcional)">
            <input value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} placeholder="Ex: corretora, exchange, oferta..." style={INPUT_STYLE} />
          </Field>

          {/* Preview do impacto */}
          {preview && (
            <div style={{ marginTop: 10, padding: '12px 14px', background: 'rgba(58,133,128,0.08)', border: '1px solid rgba(58,133,128,0.18)', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600, color: '#1E7D5A' }}>
                  Total deste aporte (BRL)
                </span>
                <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, fontWeight: 700, color: '#1E7D5A', letterSpacing: '-0.3px' }}>
                  {fmt(preview.qtd * preview.precoBRL)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: '#7A5C4F' }}>
                  Preço médio efetivo
                </span>
                <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700, color: '#7A5C4F' }}>
                  {fmt(preview.precoBRL)}/{isCripto ? 'unid.' : 'cota'}
                </span>
              </div>
              {previewPM !== null && stats.precoMedio > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 6, borderTop: '1px dashed rgba(30,125,90,0.25)' }}>
                  <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600, color: '#1E7D5A' }}>
                    Novo PM da posição
                  </span>
                  <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, color: '#1E7D5A' }}>
                    {fmt(previewPM)} <span style={{ fontSize: 11, fontWeight: 600, color: previewPM > stats.precoMedio ? '#C4553B' : '#1E7D5A' }}>
                      ({previewPM > stats.precoMedio ? '+' : ''}{((previewPM - stats.precoMedio) / stats.precoMedio * 100).toFixed(2)}%)
                    </span>
                  </span>
                </div>
              )}
            </div>
          )}

          <button onClick={handleAdd} disabled={!preview}
            style={{
              marginTop: 12, width: '100%',
              background: preview ? 'linear-gradient(135deg, #504E76, #3A3860)' : '#E8E0D5',
              color: preview ? '#FFFFFF' : '#9B7B6A', border: 'none', borderRadius: 12,
              padding: '12px 0', cursor: preview ? 'pointer' : 'not-allowed',
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              boxShadow: preview ? '0 4px 16px rgba(80,78,118,0.3)' : 'none',
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

function ModoBtn({ children, active, onClick, icon }: { children: React.ReactNode; active: boolean; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button onClick={onClick}
      style={{
        background: active ? '#504E76' : '#FBF8F3',
        border: `1.5px solid ${active ? '#504E76' : '#EDE6DC'}`,
        borderRadius: 9, padding: '7px 10px', cursor: 'pointer',
        fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700,
        color: active ? '#FFFFFF' : '#7A5C4F',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-start', gap: 6,
        transition: 'all .15s', textAlign: 'left',
      }}>
      {icon} {children}
    </button>
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

import { useState } from 'react'
import { motion } from 'framer-motion'
import { LegacyModalShell } from '@/components/ui/LegacyModalShell'
import { IconX, IconCheck, IconShoppingBag, IconTrash, IconPlus, IconArrowUpRight, IconArrowDownRight, IconCloudDownload } from '@tabler/icons-react'
import type { Investimento } from '@/db/schema'
import { useMovimentacoesInvest, registrarVenda, registrarResgate, deleteMovimentacaoInvest, calcVendasStats, isRendaVariavel } from '@/db/hooks/useInvestimentos'
import { fetchCotacaoPorTipo } from '@/lib/cotacoes'
import { showErrorToast, sounds } from '@/lib/sounds'

interface Props {
  invest: Investimento
  onClose: () => void
}

export function VendasModal({ invest, onClose }: Props) {
  // body scroll lock agora é responsabilidade do LegacyModalShell
  const movs = useMovimentacoesInvest(invest.id)
  const today = new Date().toISOString().split('T')[0]
  const stats = calcVendasStats(movs)
  const isVar = isRendaVariavel(invest.tipo)
  const moeda = invest.moeda ?? 'BRL'
  const simbolo = moeda === 'USD' ? 'US$' : 'R$'

  const [form, setForm] = useState({
    data: today,
    quantidade: '',          // RV
    precoUnitario: '',       // RV
    valorResgate: '',        // RF
    custos: '',
    observacao: '',
  })

  const [fetchingCot, setFetchingCot] = useState(false)

  const parseValor = (v: string) => parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0

  const handleFetchCotacao = async () => {
    if (!invest.ticker) return
    setFetchingCot(true)
    const c = await fetchCotacaoPorTipo(invest.tipo, invest.ticker)
    setFetchingCot(false)
    if (c !== null) setForm(f => ({ ...f, precoUnitario: c.toFixed(2) }))
  }

  // Preview do resultado da operação
  const previewVenda = (() => {
    if (!isVar) return null
    const qtd = parseValor(form.quantidade)
    const preco = parseValor(form.precoUnitario)
    const custos = parseValor(form.custos)
    if (qtd <= 0 || preco <= 0) return null
    const valorBruto = qtd * preco
    const valorLiquido = valorBruto - custos
    const pm = invest.precoMedio ?? 0
    const custoEstoque = qtd * pm
    const resultado = valorLiquido - custoEstoque
    const pctResultado = custoEstoque > 0 ? (resultado / custoEstoque) * 100 : 0
    return { valorBruto, valorLiquido, custoEstoque, resultado, pctResultado, qtd }
  })()

  const previewResgate = (() => {
    if (isVar) return null
    const valorBruto = parseValor(form.valorResgate)
    const custos = parseValor(form.custos)
    if (valorBruto <= 0) return null
    const valorLiquido = valorBruto - custos
    const proporcao = invest.valorAtual > 0 ? valorBruto / invest.valorAtual : 0
    const custoProporcional = invest.valorAplicado * proporcao
    const resultado = valorLiquido - custoProporcional
    return { valorBruto, valorLiquido, custoProporcional, resultado, proporcao }
  })()

  const podeRegistrar = isVar ? !!previewVenda : !!previewResgate
  const qtdMaxima = invest.quantidade ?? 0

  const handleRegistrar = async () => {
    if (!invest.id) return
    const observacaoTrim = form.observacao.trim()
    try {
      if (isVar) {
        const qtd = parseValor(form.quantidade)
        const preco = parseValor(form.precoUnitario)
        if (qtd <= 0 || preco <= 0) return
        if (qtd > qtdMaxima) return  // não pode vender mais do que tem
        await registrarVenda({
          investimentoId: invest.id,
          data: form.data,
          quantidade: qtd,
          precoUnitario: preco,
          custos: parseValor(form.custos) || undefined,
          observacao: observacaoTrim || undefined,
        })
      } else {
        const valor = parseValor(form.valorResgate)
        if (valor <= 0) return
        if (valor > invest.valorAtual) return
        await registrarResgate({
          investimentoId: invest.id,
          data: form.data,
          valorResgate: valor,
          custos: parseValor(form.custos) || undefined,
          observacao: observacaoTrim || undefined,
        })
      }
      sounds.save()
      setForm({ data: today, quantidade: '', precoUnitario: '', valorResgate: '', custos: '', observacao: '' })
    } catch (e) {
      console.error('[VendasModal.handleRegistrar]', e)
      showErrorToast(e instanceof Error ? e.message : 'Erro ao registrar movimentação — tente de novo')
      sounds.error()
    }
  }

  return (
    <LegacyModalShell open onClose={onClose} maxWidth={620} zIndex={100}
      header={
        <div style={{
          padding: '16px 22px', borderBottom: '1px solid rgba(44,26,15,0.08)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
        }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1, minWidth: 0 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 11, background: 'rgba(168,68,43,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <IconShoppingBag size={19} stroke={1.8} color="#A8442B" />
            </div>
            <div style={{ minWidth: 0 }}>
              <h2 style={{
                fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700,
                color: '#2C1A0F', margin: 0, letterSpacing: '-0.4px',
              }}>{isVar ? 'Vendas' : 'Resgates'}</h2>
              <p style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11.5, color: '#7A5C4F', margin: '2px 0 0',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{invest.nome}{invest.ticker ? ` · ${invest.ticker}` : ''}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fechar" style={{
            background: 'rgba(255,255,255,0.7)', border: 'none', borderRadius: 10,
            width: 34, height: 34, cursor: 'pointer', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <IconX size={16} stroke={2} color="#7A5C4F" />
          </button>
        </div>
      }
      footer={
        <div style={{ padding: '14px 22px', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            background: 'linear-gradient(135deg, #F1642E, #C4553B)', color: '#FFFFFF',
            border: 'none', borderRadius: 12, padding: '11px 22px', cursor: 'pointer',
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', gap: 7,
            boxShadow: '0 8px 22px rgba(196,85,59,0.42)',
          }}>
            <IconCheck size={15} stroke={2.4} /> Fechar
          </button>
        </div>
      }
    >

        {/* KPIs */}
        {movs.length > 0 && (
          <div style={{ padding: '14px 26px', background: '#FBF8F3', borderBottom: '1px solid #EDE6DC', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10 }}>
            <MiniKpi label={isVar ? 'Vendido' : 'Resgatado'} value={isVar ? `${stats.qtdVendida.toLocaleString('pt-BR')}` : `${stats.totalVendas}`} sub={isVar ? `${stats.totalVendas} ${stats.totalVendas === 1 ? 'venda' : 'vendas'}` : 'resgates'} cor="#A8442B" />
            <MiniKpi label="Total recebido" value={`${simbolo} ${stats.totalRecebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} sub="líquido de custos" cor="#7A5C4F" />
            <MiniKpi label="Resultado realizado" value={`${stats.resultadoRealizado >= 0 ? '+' : ''}${simbolo} ${Math.abs(stats.resultadoRealizado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} sub={stats.resultadoRealizado >= 0 ? 'lucro' : 'prejuízo'} cor={stats.resultadoRealizado >= 0 ? '#1E7D5A' : '#C4553B'} />
          </div>
        )}

        {/* Form */}
        <div style={{ padding: '20px 26px', borderBottom: '1px solid #EDE6DC' }}>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: '#7A5C4F', letterSpacing: '.1em', textTransform: 'uppercase', margin: '0 0 12px' }}>
            {isVar ? 'Registrar venda' : 'Registrar resgate'}
          </p>

          {isVar ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10 }}>
              <Field label="Data">
                <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} style={INPUT_STYLE} />
              </Field>
              <Field label={`Quantidade (máx ${qtdMaxima})`}>
                <input value={form.quantidade} onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))} placeholder="ex: 30" inputMode="decimal" style={INPUT_STYLE} />
              </Field>
              <Field label={`Preço unit. (${simbolo})`}>
                <div style={{ display: 'flex', gap: 4 }}>
                  <input value={form.precoUnitario} onChange={e => setForm(f => ({ ...f, precoUnitario: e.target.value }))} placeholder="170,00" inputMode="decimal" style={{ ...INPUT_STYLE, flex: 1 }} />
                  {invest.ticker && (
                    <button onClick={handleFetchCotacao} disabled={fetchingCot}
                      title={`Cotação atual de ${invest.ticker}`}
                      style={{ background: '#FBF8F3', border: '1.5px solid #EDE6DC', borderRadius: 10, padding: '0 8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                      <motion.span animate={fetchingCot ? { rotate: 360 } : { rotate: 0 }} transition={fetchingCot ? { repeat: Infinity, duration: 0.8 } : { duration: 0.2 }} style={{ display: 'inline-flex' }}>
                        <IconCloudDownload size={12} stroke={2} color="#7A5C4F" />
                      </motion.span>
                    </button>
                  )}
                </div>
              </Field>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
              <Field label="Data">
                <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} style={INPUT_STYLE} />
              </Field>
              <Field label={`Valor do resgate (${simbolo}) — máx ${invest.valorAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}>
                <input value={form.valorResgate} onChange={e => setForm(f => ({ ...f, valorResgate: e.target.value }))} placeholder="0,00" inputMode="decimal" style={INPUT_STYLE} />
              </Field>
            </div>
          )}

          <Field label={`Custos da operação (${simbolo}, opcional)`}>
            <input value={form.custos} onChange={e => setForm(f => ({ ...f, custos: e.target.value }))} placeholder="Corretagem + emolumentos + IR retido" inputMode="decimal" style={INPUT_STYLE} />
          </Field>

          <Field label="Observação (opcional)">
            <input value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} placeholder="Ex: aproveitei a alta, precisei do dinheiro..." style={INPUT_STYLE} />
          </Field>

          {/* Preview do resultado */}
          {(previewVenda || previewResgate) && (
            <div style={{ marginTop: 10, padding: '12px 14px', background: 'rgba(168,68,43,0.07)', border: '1px solid rgba(168,68,43,0.18)', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {previewVenda && (
                <>
                  <Linha label="Valor bruto" valor={`${simbolo} ${previewVenda.valorBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                  <Linha label="Custos" valor={`-${simbolo} ${parseValor(form.custos).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} cor="#C4553B" />
                  <Linha label="Líquido" valor={`${simbolo} ${previewVenda.valorLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} bold />
                  <Linha label={`Custo do estoque (PM ${simbolo} ${(invest.precoMedio ?? 0).toFixed(2)})`} valor={`-${simbolo} ${previewVenda.custoEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 8, borderTop: '1px dashed rgba(168,68,43,0.3)' }}>
                    <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700, color: '#A8442B', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {previewVenda.resultado >= 0 ? <IconArrowUpRight size={13} stroke={2.5} /> : <IconArrowDownRight size={13} stroke={2.5} />}
                      Resultado
                    </span>
                    <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 16, fontWeight: 700, color: previewVenda.resultado >= 0 ? '#1E7D5A' : '#C4553B', letterSpacing: '-0.3px' }}>
                      {previewVenda.resultado >= 0 ? '+' : ''}{simbolo} {Math.abs(previewVenda.resultado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({previewVenda.pctResultado.toFixed(2)}%)
                    </span>
                  </div>
                </>
              )}
              {previewResgate && (
                <>
                  <Linha label="Valor resgatado" valor={`${simbolo} ${previewResgate.valorBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                  <Linha label="Custos" valor={`-${simbolo} ${parseValor(form.custos).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} cor="#C4553B" />
                  <Linha label="Líquido recebido" valor={`${simbolo} ${previewResgate.valorLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} bold />
                  <Linha label={`Custo proporcional (${(previewResgate.proporcao * 100).toFixed(1)}% da posição)`} valor={`-${simbolo} ${previewResgate.custoProporcional.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 8, borderTop: '1px dashed rgba(168,68,43,0.3)' }}>
                    <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700, color: '#A8442B' }}>
                      Rendimento neste resgate
                    </span>
                    <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 16, fontWeight: 700, color: previewResgate.resultado >= 0 ? '#1E7D5A' : '#C4553B', letterSpacing: '-0.3px' }}>
                      {previewResgate.resultado >= 0 ? '+' : ''}{simbolo} {Math.abs(previewResgate.resultado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Validação de máximo */}
          {isVar && parseValor(form.quantidade) > qtdMaxima && (
            <p style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(196,85,59,0.1)', borderRadius: 8, fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#C4553B', fontWeight: 600 }}>
              Você só tem {qtdMaxima} {invest.tipo === 'Cripto' ? 'unid.' : 'cotas'} em estoque.
            </p>
          )}
          {!isVar && parseValor(form.valorResgate) > invest.valorAtual && (
            <p style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(196,85,59,0.1)', borderRadius: 8, fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#C4553B', fontWeight: 600 }}>
              Valor maior que o disponível ({simbolo} {invest.valorAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).
            </p>
          )}

          <button onClick={handleRegistrar} disabled={!podeRegistrar}
            style={{
              marginTop: 12, width: '100%',
              background: podeRegistrar ? 'linear-gradient(135deg, #D4643A, #A8442B)' : '#E8E0D5',
              color: podeRegistrar ? '#FFFFFF' : '#9B7B6A', border: 'none', borderRadius: 12,
              padding: '12px 0', cursor: podeRegistrar ? 'pointer' : 'not-allowed',
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              boxShadow: podeRegistrar ? '0 4px 16px rgba(168,68,43,0.3)' : 'none',
            }}>
            <IconPlus size={15} stroke={2.4} /> Registrar {isVar ? 'venda' : 'resgate'}
          </button>
        </div>

        {/* Histórico */}
        <div style={{ padding: '16px 26px 24px' }}>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: '#7A5C4F', letterSpacing: '.1em', textTransform: 'uppercase', margin: '0 0 10px' }}>
            Histórico {movs.length > 0 && <span style={{ color: '#9B7B6A' }}>({movs.length})</span>}
          </p>

          {movs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#9B7B6A', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12 }}>
              Nenhuma {isVar ? 'venda' : 'resgate'} registrado ainda.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {movs.map(m => {
                const resultado = m.resultado ?? 0
                const valorPrincipal = m.tipo === 'venda'
                  ? (m.quantidade ?? 0) * (m.precoUnitario ?? 0)
                  : (m.valorResgate ?? 0)
                return (
                  <div key={m.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', border: '1px solid #EDE6DC', borderRadius: 10, background: '#FFFFFF',
                  }}>
                    <div style={{ width: 36, textAlign: 'center', flexShrink: 0 }}>
                      <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 16, fontWeight: 700, color: '#2C1A0F', margin: 0, lineHeight: 1, letterSpacing: '-0.3px' }}>
                        {new Date(m.data + 'T00:00:00').getDate().toString().padStart(2, '0')}
                      </p>
                      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 700, color: '#9B7B6A', letterSpacing: '.06em', textTransform: 'uppercase', margin: '2px 0 0' }}>
                        {new Date(m.data + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                      </p>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, color: '#2C1A0F', margin: 0 }}>
                        {m.tipo === 'venda'
                          ? `${(m.quantidade ?? 0).toLocaleString('pt-BR')} × ${simbolo} ${(m.precoUnitario ?? 0).toFixed(2)}`
                          : `${simbolo} ${(m.valorResgate ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} resgatado`
                        }
                      </p>
                      {m.observacao && (
                        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#9B7B6A', margin: '2px 0 0', fontStyle: 'italic' }}>{m.observacao}</p>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, color: '#2C1A0F', margin: 0 }}>
                        {simbolo} {valorPrincipal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700, color: resultado >= 0 ? '#1E7D5A' : '#C4553B', margin: '2px 0 0' }}>
                        {resultado >= 0 ? '+' : ''}{simbolo} {Math.abs(resultado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <button onClick={() => m.id !== undefined && deleteMovimentacaoInvest(m.id)} title="Remover"
                      style={{ background: '#FAEAEA', border: 'none', borderRadius: 7, width: 26, height: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <IconTrash size={11} stroke={2} color="#C4553B" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

    </LegacyModalShell>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', marginBottom: 10 }}>
      <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: '#7A5C4F', letterSpacing: '.1em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>{label}</span>
      {children}
    </label>
  )
}

function MiniKpi({ label, value, sub, cor }: { label: string; value: string; sub: string; cor: string }) {
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #EDE6DC', borderRadius: 12, padding: '10px 12px' }}>
      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 700, color: cor, letterSpacing: '.08em', textTransform: 'uppercase', margin: 0 }}>{label}</p>
      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 16, fontWeight: 700, color: cor, letterSpacing: '-0.3px', margin: '3px 0 1px' }}>{value}</p>
      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: '#9B7B6A', margin: 0 }}>{sub}</p>
    </div>
  )
}

function Linha({ label, valor, cor, bold }: { label: string; valor: string; cor?: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#7A5C4F', fontWeight: bold ? 700 : 500 }}>{label}</span>
      <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: bold ? 700 : 600, color: cor ?? '#2C1A0F' }}>{valor}</span>
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

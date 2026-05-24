import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { LegacyModalShell } from '@/components/ui/LegacyModalShell'
import { IconX, IconCheck, IconShoppingCart, IconTrash, IconPlus, IconCurrencyDollar, IconCurrencyReal, IconCloudDownload } from '@tabler/icons-react'
import type { Investimento } from '@/db/schema'
import { useAportes, addAporte, deleteAporte, calcAportesStats, useDolar } from '@/db/hooks/useInvestimentos'
import { fetchCotacaoDolar, fetchCotacaoPorTipo } from '@/lib/cotacoes'
import { todayISO } from '@/lib/format'
import { showErrorToast, sounds } from '@/lib/sounds'
import { useSavingGuard } from '@/hooks/useSavingGuard'
// useBodyScrollLock removido — LegacyModalShell já cuida disso

interface Props {
  invest: Investimento
  onClose: () => void
}

export function AportesModal({ invest, onClose }: Props) {
  // body scroll lock agora é responsabilidade do LegacyModalShell
  const aportes = useAportes(invest.id)
  const today = todayISO()
  const stats = calcAportesStats(aportes)
  const dolarCache = useDolar()

  const isCripto = invest.tipo === 'Cripto'
  // Moeda em que TUDO é armazenado pra esse ativo (precoUnitario, custos,
  // cotacaoAtual, precoMedio, valorAplicado, valorAtual). Conversão pra
  // BRL acontece UMA vez em totalCarteiraBRL.
  const moedaAtivo: 'BRL' | 'USD' = invest.moeda ?? 'BRL'
  const simbolo = moedaAtivo === 'USD' ? 'US$' : 'R$'
  const simboloOposto = moedaAtivo === 'USD' ? 'R$' : 'US$'

  // Modo de entrada (UI):
  //   'nativo'         → user digita preço já na moeda do ativo
  //   'fx'             → user digita preço na moeda oposta + cotação do dólar
  //   'investido_nativo' → "investi X na moeda do ativo e recebi Y unidades"
  //   'investido_fx'   → "investi X na moeda oposta + câmbio"
  // Toggle de modo só faz sentido pra cripto (caso comum de comprar em USD
  // mas pagar em BRL na exchange). Pra outros, sempre 'nativo'.
  const [modo, setModo] = useState<'nativo' | 'fx' | 'investido_nativo' | 'investido_fx'>('nativo')

  const [form, setForm] = useState({
    data: today,
    quantidade: '',
    precoUnitario: '',         // SEMPRE na moeda escolhida pelo modo (input puro do user)
    valorInvestido: '',        // pro modo "investi X reais/dólares"
    cotacaoDolar: dolarCache > 0 ? dolarCache.toFixed(4) : '',  // pro modo fx
    custos: '',                // SEMPRE na moeda do ativo (input puro)
    observacao: '',
  })

  const [fetchingFx, setFetchingFx] = useState(false)
  const [fetchingCotAtivo, setFetchingCotAtivo] = useState(false)

  const parseValor = (v: string) => parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0

  // Quando seleciona modo fx, busca cotação do dólar automaticamente
  // (setFetchingFx no callback async, fora do render — OK pra react-hooks)
  useEffect(() => {
    if ((modo === 'fx' || modo === 'investido_fx') && !form.cotacaoDolar) {
      let alive = true
      // Defer pra micro-task pra evitar sync setState no body do effect
      void Promise.resolve().then(() => {
        if (!alive) return
        setFetchingFx(true)
        fetchCotacaoDolar().then(c => {
          if (!alive) return
          if (c !== null) setForm(f => ({ ...f, cotacaoDolar: c.toFixed(4) }))
          setFetchingFx(false)
        })
      })
      return () => { alive = false }
    }
  }, [modo, form.cotacaoDolar])

  // Converte um valor da moeda OPOSTA pra moeda do ativo usando cotação USD/BRL
  // moedaAtivo=BRL  → input em USD, multiplica pelo dólar
  // moedaAtivo=USD  → input em BRL, divide pelo dólar
  function fxParaMoedaAtivo(valorOposto: number, fx: number): number {
    if (fx <= 0) return 0
    return moedaAtivo === 'USD' ? valorOposto / fx : valorOposto * fx
  }

  // Computa quantidade + preço unitário NA MOEDA DO ATIVO (regra única
  // do refactor: aporte.precoUnitario sempre na moeda do ativo).
  function computeAporte(): { qtd: number; precoMoedaAtivo: number } | null {
    const qtdInput = parseValor(form.quantidade)
    const precoInput = parseValor(form.precoUnitario)
    const investido = parseValor(form.valorInvestido)
    const fx = parseValor(form.cotacaoDolar)

    if (modo === 'nativo') {
      if (qtdInput <= 0 || precoInput <= 0) return null
      return { qtd: qtdInput, precoMoedaAtivo: precoInput }
    }
    if (modo === 'fx') {
      // precoInput está na moeda OPOSTA — converter pra moeda do ativo
      if (qtdInput <= 0 || precoInput <= 0 || fx <= 0) return null
      return { qtd: qtdInput, precoMoedaAtivo: fxParaMoedaAtivo(precoInput, fx) }
    }
    if (modo === 'investido_nativo') {
      // user investiu X na moeda do ativo e obteve Y unidades
      if (qtdInput <= 0 || investido <= 0) return null
      return { qtd: qtdInput, precoMoedaAtivo: investido / qtdInput }
    }
    if (modo === 'investido_fx') {
      // user investiu X na moeda OPOSTA (cotada via câmbio)
      if (qtdInput <= 0 || investido <= 0 || fx <= 0) return null
      const investidoMoedaAtivo = fxParaMoedaAtivo(investido, fx)
      return { qtd: qtdInput, precoMoedaAtivo: investidoMoedaAtivo / qtdInput }
    }
    return null
  }

  const preview = computeAporte()

  const { saving, runSaving } = useSavingGuard()

  const handleAdd = () => runSaving(async () => {
    if (!preview || !invest.id) return
    const observacaoTrim = form.observacao.trim()
    const observacao = (() => {
      if (modo === 'fx') return `Comprado a ${simboloOposto} ${parseValor(form.precoUnitario).toFixed(2)}/un · câmbio R$ ${parseValor(form.cotacaoDolar).toFixed(2)}${observacaoTrim ? ' · ' + observacaoTrim : ''}`
      if (modo === 'investido_nativo') return `Investiu ${simbolo} ${parseValor(form.valorInvestido).toFixed(2)}${observacaoTrim ? ' · ' + observacaoTrim : ''}`
      if (modo === 'investido_fx') return `Investiu ${simboloOposto} ${parseValor(form.valorInvestido).toFixed(2)} · câmbio R$ ${parseValor(form.cotacaoDolar).toFixed(2)}${observacaoTrim ? ' · ' + observacaoTrim : ''}`
      return observacaoTrim || undefined
    })()
    // Custos: input do user é sempre na moeda do ativo
    const custosMoedaAtivo = parseValor(form.custos) || undefined

    try {
      await addAporte({
        investimentoId: invest.id,
        data: form.data,
        quantidade: preview.qtd,
        precoUnitario: preview.precoMoedaAtivo,
        custos: custosMoedaAtivo,
        observacao,
      })
      sounds.save()
      setForm({ data: today, quantidade: '', precoUnitario: '', valorInvestido: '', cotacaoDolar: form.cotacaoDolar, custos: '', observacao: '' })
    } catch (e) {
      console.error('[AportesModal.handleAdd]', e)
      showErrorToast(e instanceof Error ? e.message : 'Erro ao adicionar aporte — tente de novo')
      sounds.error()
    }
  })

  // Sugestão de cotação atual quando user clica "puxar do mercado".
  // A cotação vem na moeda do ativo (CoinGecko aceita vs_currencies=usd).
  // Se o modo de entrada é 'fx' (preço na moeda oposta), converte.
  const handleFetchCotAtivo = async () => {
    if (!invest.ticker) return
    setFetchingCotAtivo(true)
    const c = await fetchCotacaoPorTipo(invest.tipo, invest.ticker, moedaAtivo)
    setFetchingCotAtivo(false)
    if (c === null) return
    if (modo === 'nativo') {
      // preço no input é na moeda do ativo — preenche direto
      setForm(f => ({ ...f, precoUnitario: c.toFixed(moedaAtivo === 'USD' ? 4 : 2) }))
    } else if (modo === 'fx') {
      // preço no input é na moeda OPOSTA — converte
      const fx = parseValor(form.cotacaoDolar)
      if (fx <= 0) return
      const precoOposto = moedaAtivo === 'USD' ? c * fx : c / fx
      setForm(f => ({ ...f, precoUnitario: precoOposto.toFixed(2) }))
    }
  }

  // Preview do novo PM caso este aporte seja confirmado (na moeda do ativo)
  const previewPM = (() => {
    if (!preview) return null
    const qtdTotal = stats.quantidade + preview.qtd
    const totalInvestido = stats.totalInvestido + (preview.qtd * preview.precoMoedaAtivo)
    return qtdTotal > 0 ? totalInvestido / qtdTotal : 0
  })()

  return (
    <LegacyModalShell open onClose={onClose} maxWidth={620} zIndex={100}
      header={
        <div style={{
          padding: '16px 22px', borderBottom: '1px solid rgba(44,26,15,0.08)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
        }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1, minWidth: 0 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 11, background: 'rgba(80,78,118,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <IconShoppingCart size={19} stroke={1.8} color="#504E76" />
            </div>
            <div style={{ minWidth: 0 }}>
              <h2 style={{
                fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700,
                color: '#2C1A0F', margin: 0, letterSpacing: '-0.4px',
              }}>Aportes</h2>
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

        {/* KPIs derivados — valores na moeda do ativo */}
        <div style={{ padding: '16px 26px', background: '#FBF8F3', borderBottom: '1px solid #EDE6DC', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 12 }}>
          <Kpi label="Quantidade total" value={stats.quantidade.toLocaleString('pt-BR')} sub={`${aportes.length} ${aportes.length === 1 ? 'compra' : 'compras'}`} cor="#504E76" />
          <Kpi label="Preço médio" value={`${simbolo} ${stats.precoMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: moedaAtivo === 'USD' ? 4 : 2 })}`} sub="calculado dos aportes" cor="#3A8580" />
          <Kpi label="Total investido" value={`${simbolo} ${stats.totalInvestido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} sub={invest.cotacaoAtual ? `posição: ${simbolo} ${(stats.quantidade * invest.cotacaoAtual).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'sem cotação'} cor="#2C1A0F" />
        </div>

        {/* Form de novo aporte */}
        <div style={{ padding: '20px 26px', borderBottom: '1px solid #EDE6DC' }}>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: '#7A5C4F', letterSpacing: '.1em', textTransform: 'uppercase', margin: '0 0 12px' }}>Registrar nova compra</p>

          {/* Toggle de modo (só pra cripto que tem caso comum de comprar
              em moeda diferente da moeda do ativo — ex: cripto USD pago
              em BRL no PIX da exchange brasileira). */}
          {isCripto && (
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: '#7A5C4F', letterSpacing: '.08em', textTransform: 'uppercase', margin: '0 0 6px' }}>Como você comprou?</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                <ModoBtn active={modo === 'nativo'} onClick={() => setModo('nativo')} icon={moedaAtivo === 'USD' ? <IconCurrencyDollar size={12} stroke={2.2} /> : <IconCurrencyReal size={12} stroke={2.2} />}>Qtd + preço em {simbolo}</ModoBtn>
                <ModoBtn active={modo === 'fx'} onClick={() => setModo('fx')} icon={moedaAtivo === 'USD' ? <IconCurrencyReal size={12} stroke={2.2} /> : <IconCurrencyDollar size={12} stroke={2.2} />}>Qtd + preço em {simboloOposto}</ModoBtn>
                <ModoBtn active={modo === 'investido_nativo'} onClick={() => setModo('investido_nativo')} icon={moedaAtivo === 'USD' ? <IconCurrencyDollar size={12} stroke={2.2} /> : <IconCurrencyReal size={12} stroke={2.2} />}>"Investi {simbolo} X e recebi Y"</ModoBtn>
                <ModoBtn active={modo === 'investido_fx'} onClick={() => setModo('investido_fx')} icon={moedaAtivo === 'USD' ? <IconCurrencyReal size={12} stroke={2.2} /> : <IconCurrencyDollar size={12} stroke={2.2} />}>"Investi {simboloOposto} X e recebi Y"</ModoBtn>
              </div>
            </div>
          )}

          {/* Cotação do dólar (modos fx) */}
          {(modo === 'fx' || modo === 'investido_fx') && (
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
          {(modo === 'nativo' || modo === 'fx') && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10 }}>
              <Field label="Data">
                <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} style={INPUT_STYLE} />
              </Field>
              <Field label="Quantidade">
                <input value={form.quantidade} onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))} placeholder={isCripto ? '0,00461' : '50'} inputMode="decimal" style={INPUT_STYLE} />
              </Field>
              <Field label={`Preço unit. (${modo === 'fx' ? simboloOposto : simbolo})`}>
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
          {(modo === 'investido_nativo' || modo === 'investido_fx') && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10 }}>
              <Field label="Data">
                <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} style={INPUT_STYLE} />
              </Field>
              <Field label={`Investi (${modo === 'investido_fx' ? simboloOposto : simbolo})`}>
                <input value={form.valorInvestido} onChange={e => setForm(f => ({ ...f, valorInvestido: e.target.value }))} placeholder={modo === 'investido_fx' ? '300,00' : '1500,00'} inputMode="decimal" style={INPUT_STYLE} />
              </Field>
              <Field label={`Recebi (${isCripto ? 'unidades' : 'cotas'})`}>
                <input value={form.quantidade} onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))} placeholder="0,00461" inputMode="decimal" style={INPUT_STYLE} />
              </Field>
            </div>
          )}

          <Field label={`Custos da operação (${simbolo}, opcional)`}>
            <input value={form.custos} onChange={e => setForm(f => ({ ...f, custos: e.target.value }))}
              placeholder="Corretagem + emolumentos + IOF"
              inputMode="decimal" style={INPUT_STYLE} />
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#7A5C4F', margin: '6px 0 0', lineHeight: 1.4 }}>
              Padrão BR: custos entram no preço médio (afeta IR depois).
            </p>
          </Field>

          <Field label="Observação (opcional)">
            <input value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} placeholder="Ex: corretora, exchange, oferta..." style={INPUT_STYLE} />
          </Field>

          {/* Preview do impacto — na moeda do ativo */}
          {preview && (
            <div style={{ marginTop: 10, padding: '12px 14px', background: 'rgba(58,133,128,0.08)', border: '1px solid rgba(58,133,128,0.18)', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600, color: '#1E7D5A' }}>
                  Total deste aporte ({moedaAtivo})
                </span>
                <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, fontWeight: 700, color: '#1E7D5A', letterSpacing: '-0.3px' }}>
                  {simbolo} {(preview.qtd * preview.precoMoedaAtivo).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: '#7A5C4F' }}>
                  Preço médio efetivo
                </span>
                <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700, color: '#7A5C4F' }}>
                  {simbolo} {preview.precoMoedaAtivo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: moedaAtivo === 'USD' ? 6 : 2 })}/{isCripto ? 'unid.' : 'cota'}
                </span>
              </div>
              {previewPM !== null && stats.precoMedio > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 6, borderTop: '1px dashed rgba(30,125,90,0.25)' }}>
                  <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600, color: '#1E7D5A' }}>
                    Novo PM da posição
                  </span>
                  <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, color: '#1E7D5A' }}>
                    {simbolo} {previewPM.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: moedaAtivo === 'USD' ? 6 : 2 })} <span style={{ fontSize: 11, fontWeight: 600, color: previewPM > stats.precoMedio ? '#C4553B' : '#1E7D5A' }}>
                      ({previewPM > stats.precoMedio ? '+' : ''}{((previewPM - stats.precoMedio) / stats.precoMedio * 100).toFixed(2)}%)
                    </span>
                  </span>
                </div>
              )}
            </div>
          )}

          <button onClick={handleAdd} disabled={!preview || saving}
            style={{
              marginTop: 12, width: '100%',
              background: (preview && !saving) ? 'linear-gradient(135deg, #504E76, #3A3860)' : '#E8E0D5',
              color: (preview && !saving) ? '#FFFFFF' : '#9B7B6A', border: 'none', borderRadius: 12,
              padding: '12px 0', cursor: (preview && !saving) ? 'pointer' : 'not-allowed',
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
            Histórico {aportes.length > 0 && <span style={{ color: '#7A5C4F' }}>({aportes.length})</span>}
          </p>

          {aportes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#7A5C4F', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12 }}>
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
                      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 700, color: '#7A5C4F', letterSpacing: '.06em', textTransform: 'uppercase', margin: '2px 0 0' }}>
                        {new Date(a.data + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                      </p>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, color: '#2C1A0F', margin: 0 }}>
                        {a.quantidade.toLocaleString('pt-BR')} × {simbolo} {a.precoUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: moedaAtivo === 'USD' ? 6 : 2 })}
                      </p>
                      {a.observacao && (
                        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#7A5C4F', margin: '2px 0 0', fontStyle: 'italic' }}>{a.observacao}</p>
                      )}
                    </div>
                    <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 700, color: '#504E76', letterSpacing: '-0.3px' }}>
                      {simbolo} {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <button onClick={() => a.id !== undefined && deleteAporte(a.id)} aria-label="Remover aporte" title="Remover aporte"
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
      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: '#7A5C4F', margin: 0 }}>{sub}</p>
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

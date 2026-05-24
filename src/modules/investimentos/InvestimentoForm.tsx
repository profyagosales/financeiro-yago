import { useState, useEffect, useMemo } from 'react'
import { LegacyModalShell } from '@/components/ui/LegacyModalShell'
import { IconX, IconCheck, IconRefresh, IconLock, IconBuildingBank, IconPlus, IconInfoCircle, IconTrendingUp, IconCurrencyDollar, IconCurrencyReal } from '@tabler/icons-react'
import type { Investimento, InvestimentoTipo, InvestimentoLiquidez, TipoRendimento } from '@/db/schema'
import { addInvestimento, editInvestimento, isRendaVariavel, isRendaFixa, addAporte, useAportes } from '@/db/hooks/useInvestimentos'
import { useTaxasBenchmark, calcTaxaEfetiva } from '@/db/hooks/useAppConfig'
import { useMetas } from '@/db/hooks/useMetas'
import { useContas } from '@/db/hooks/useContas'
import { TIPOS, LIQUIDEZ_OPTIONS, TIPO_META } from './constants'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { fmt } from '@/lib/format'

interface Props {
  invest?: Investimento | null
  presetMetaId?: number
  onClose: () => void
}

export function InvestimentoForm({ invest, presetMetaId, onClose }: Props) {
  // body scroll lock agora é responsabilidade do LegacyModalShell
  const metas = useMetas()
  const contas = useContas()
  const today = new Date().toISOString().split('T')[0]
  const isEditing = !!invest

  // Determinar se a instituição salva corresponde a uma conta cadastrada
  const initialInstFromConta = useMemo(() => {
    if (!invest?.instituicao) return null
    return contas.find(c => c.nome.toLowerCase() === invest.instituicao!.toLowerCase()) ?? null
  }, [invest?.instituicao, contas])

  const [instMode, setInstMode] = useState<'conta' | 'outra' | null>(() => {
    if (!invest?.instituicao) return null
    return initialInstFromConta ? 'conta' : 'outra'
  })

  // Aportes já registrados (modo edição)
  const aportes = useAportes(invest?.id)
  const taxas = useTaxasBenchmark()

  const [form, setForm] = useState({
    nome: invest?.nome ?? '',
    tipo: invest?.tipo ?? 'CDB' as InvestimentoTipo,
    instituicaoConta: initialInstFromConta?.id ? String(initialInstFromConta.id) : '',
    instituicaoOutra: (invest?.instituicao && !initialInstFromConta) ? invest.instituicao : '',
    ticker: invest?.ticker ?? '',
    valorAplicado: invest?.valorAplicado ? String(invest.valorAplicado) : '',
    valorAtual: invest?.valorAtual ? String(invest.valorAtual) : '',
    valorAtualSource: invest?.valorAtualSource ?? 'auto' as 'auto' | 'manual',
    // Renda fixa — modalidade de rendimento
    tipoRendimento: (invest?.tipoRendimento ?? 'pos_cdi') as TipoRendimento,
    rentabilidadeAnual: invest?.rentabilidadeAnual ? String((invest.rentabilidadeAnual * 100).toFixed(2)) : '',
    percentualIndexador: invest?.percentualIndexador ? String((invest.percentualIndexador * 100).toFixed(0)) : '100',
    taxaAdicional: invest?.taxaAdicional ? String((invest.taxaAdicional * 100).toFixed(2)) : '',
    liquidez: invest?.liquidez ?? '' as InvestimentoLiquidez | '',
    // Renda variável — PRIMEIRO aporte (apenas na criação) e cotação
    primeiroAporteData: today,
    primeiroAporteQtd: '',
    primeiroAportePreco: '',
    cotacaoAtual: invest?.cotacaoAtual ? String(invest.cotacaoAtual) : '',
    moeda: (invest?.moeda ?? 'BRL') as 'BRL' | 'USD',
    // Datas (renda fixa)
    dataAplicacao: invest?.dataAplicacao ?? today,
    dataVencimento: invest?.dataVencimento ?? '',
    metaId: invest?.metaId !== undefined
      ? String(invest.metaId)
      : (presetMetaId !== undefined ? String(presetMetaId) : ''),
  })

  const tipoMeta = TIPO_META.get(form.tipo)
  const isVar = isRendaVariavel(form.tipo)
  const isFix = isRendaFixa(form.tipo)
  const parseValor = (v: string) => parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0

  // Quando muda valor aplicado e ainda não tem valor atual setado, espelha (renda fixa)
  useEffect(() => {
    if (isVar) return
    if (!isEditing && form.valorAplicado && !form.valorAtual) {
      setForm(f => ({ ...f, valorAtual: f.valorAplicado }))
    }
  }, [form.valorAplicado, isVar])

  // Resolver instituição final (conta selecionada OU texto livre)
  const resolveInstituicao = (): string | undefined => {
    if (instMode === 'conta' && form.instituicaoConta) {
      const c = contas.find(x => String(x.id) === form.instituicaoConta)
      return c?.nome
    }
    if (instMode === 'outra' && form.instituicaoOutra) {
      return form.instituicaoOutra.trim()
    }
    return undefined
  }

  const handleSave = async () => {
    if (!form.nome) return
    // Renda variável (criação): precisa do primeiro aporte
    if (isVar && !isEditing && (!form.primeiroAporteQtd || !form.primeiroAportePreco)) return
    // Renda fixa: precisa de valor aplicado
    if (!isVar && !form.valorAplicado) return

    if (isVar) {
      // Cotação informada (ou usa preço do primeiro aporte como fallback)
      const cot = parseValor(form.cotacaoAtual)
      const qtdNova = parseValor(form.primeiroAporteQtd)
      const precoNovo = parseValor(form.primeiroAportePreco)

      if (isEditing && invest?.id) {
        // Edição: só atualiza dados gerais + cotação (aportes ficam no AportesModal)
        await editInvestimento(invest.id, {
          nome: form.nome,
          tipo: form.tipo,
          instituicao: resolveInstituicao(),
          ticker: form.ticker ? form.ticker.toUpperCase() : undefined,
          cotacaoAtual: cot > 0 ? cot : undefined,
          moeda: form.moeda,
          metaId: form.metaId ? parseInt(form.metaId) : undefined,
          cor: tipoMeta?.cor ?? '#3A8580',
        })
        // Se cotação mudou, recalcula valorAtual
        if (cot > 0 && invest.quantidade) {
          await editInvestimento(invest.id, {
            valorAtual: Math.round(invest.quantidade * cot * 100) / 100,
          })
        }
      } else {
        // Criação: cria investimento + primeiro aporte. recalcInvestimentoFromAportes faz o resto.
        const initialValor = qtdNova * precoNovo
        const valorAtualInicial = cot > 0 ? qtdNova * cot : initialValor
        const id = await addInvestimento({
          nome: form.nome,
          tipo: form.tipo,
          instituicao: resolveInstituicao(),
          ticker: form.ticker ? form.ticker.toUpperCase() : undefined,
          valorAplicado: initialValor,
          valorAtual: valorAtualInicial,
          valorAtualSource: 'manual',
          quantidade: qtdNova,
          precoMedio: precoNovo,
          cotacaoAtual: cot > 0 ? cot : undefined,
          moeda: form.moeda,
          dataAplicacao: form.primeiroAporteData,
          metaId: form.metaId ? parseInt(form.metaId) : undefined,
          cor: tipoMeta?.cor ?? '#3A8580',
          ativo: true,
        })
        await addAporte({
          investimentoId: id as number,
          data: form.primeiroAporteData,
          quantidade: qtdNova,
          precoUnitario: precoNovo,
          observacao: 'Aporte inicial',
        })
      }
    } else {
      // Renda fixa: usa tipoRendimento para calcular taxa efetiva
      const tipoRend = form.tipoRendimento
      const pctIdx = form.percentualIndexador ? parseValor(form.percentualIndexador) / 100 : undefined
      const taxaAdd = form.taxaAdicional ? parseValor(form.taxaAdicional) / 100 : undefined
      const rentManual = form.rentabilidadeAnual ? parseValor(form.rentabilidadeAnual) / 100 : undefined

      // Calcula a taxa efetiva pra armazenar
      const tempInv = {
        tipoRendimento: tipoRend,
        rentabilidadeAnual: rentManual,
        percentualIndexador: pctIdx,
        taxaAdicional: taxaAdd,
      }
      const taxaEfetiva = calcTaxaEfetiva(tempInv, taxas)

      const data = {
        nome: form.nome,
        tipo: form.tipo,
        instituicao: resolveInstituicao(),
        valorAplicado: parseValor(form.valorAplicado),
        valorAtual: parseValor(form.valorAtual || form.valorAplicado),
        valorAtualSource: form.valorAtualSource,
        tipoRendimento: tipoRend,
        rentabilidadeAnual: tipoRend === 'prefixado' ? rentManual : (taxaEfetiva > 0 ? taxaEfetiva : undefined),
        percentualIndexador: (tipoRend === 'pos_cdi' || tipoRend === 'pos_selic') ? pctIdx : undefined,
        taxaAdicional: tipoRend === 'ipca_mais' ? taxaAdd : undefined,
        liquidez: form.liquidez || undefined,
        dataAplicacao: form.dataAplicacao,
        dataVencimento: form.dataVencimento || undefined,
        metaId: form.metaId ? parseInt(form.metaId) : undefined,
        cor: tipoMeta?.cor ?? '#3A8580',
        ativo: true,
      }
      if (isEditing && invest?.id) {
        await editInvestimento(invest.id, data)
      } else {
        await addInvestimento(data)
      }
    }
    onClose()
  }

  const formValid = form.nome && (
    isVar
      ? (isEditing ? true : (form.primeiroAporteQtd && form.primeiroAportePreco))
      : form.valorAplicado
  )

  return (
    <LegacyModalShell open onClose={onClose} maxWidth={640} zIndex={100}
      header={
        <div style={{
          padding: '18px 22px', borderBottom: '1px solid rgba(44,26,15,0.08)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
        }}>
          <h2 style={{
            fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700,
            color: '#2C1A0F', margin: 0, letterSpacing: '-0.5px', flex: 1, minWidth: 0,
          }}>{isEditing ? 'Editar investimento' : 'Novo investimento'}</h2>
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
        <div style={{ padding: '14px 22px', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={SECONDARY_BTN}>Cancelar</button>
          <button onClick={handleSave} disabled={!formValid}
            style={{ ...PRIMARY_BTN, opacity: formValid ? 1 : 0.5, cursor: formValid ? 'pointer' : 'not-allowed' }}>
            <IconCheck size={16} stroke={2.5} />
            {isEditing ? 'Salvar' : 'Adicionar'}
          </button>
        </div>
      }
    >
        {/* Body */}
        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Nome */}
          <Field label="Nome">
            <input
              value={form.nome}
              onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              placeholder={isVar ? 'Ex: Banco do Brasil ON' : 'Ex: CDB Inter Liquidez Diária'}
              style={INPUT_STYLE}
            />
          </Field>

          {/* Tipo */}
          <Field label="Tipo de investimento">
            <div className="inv-tipo-grid" style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8,
            }}>
              {TIPOS.map(t => {
                const Icon = t.Icon
                const active = form.tipo === t.value
                return (
                  <button key={t.value}
                    onClick={() => setForm(f => ({ ...f, tipo: t.value }))}
                    style={{
                      background: active ? t.cor : '#FBF8F3',
                      border: `1.5px solid ${active ? t.cor : '#EDE6DC'}`,
                      borderRadius: 12, padding: '10px 8px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6,
                      transition: 'all .15s',
                      minWidth: 0,
                    }}>
                    <Icon size={16} stroke={1.8} color={active ? '#FFFFFF' : t.cor} style={{ flexShrink: 0 }} />
                    <span style={{
                      fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11.5, fontWeight: 600,
                      color: active ? '#FFFFFF' : '#2C1A0F',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      minWidth: 0,
                    }}>{t.label}</span>
                  </button>
                )
              })}
            </div>
            <style>{`
              @media (max-width: 480px) {
                .inv-tipo-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
              }
            `}</style>
          </Field>

          {/* Instituição: dropdown (conta cadastrada) ou outra (input livre) */}
          <Field label="Instituição (opcional)">
            <div style={{ display: 'flex', gap: 6, marginBottom: instMode ? 10 : 0 }}>
              <button onClick={() => setInstMode(instMode === 'conta' ? null : 'conta')}
                style={{
                  ...PILL_BTN,
                  background: instMode === 'conta' ? '#3D7EB5' : '#F5F0E8',
                  color: instMode === 'conta' ? '#FFFFFF' : '#7A5C4F',
                  border: `1.5px solid ${instMode === 'conta' ? '#3D7EB5' : '#EDE6DC'}`,
                }}>
                <IconBuildingBank size={13} stroke={2} /> Conta cadastrada
              </button>
              <button onClick={() => setInstMode(instMode === 'outra' ? null : 'outra')}
                style={{
                  ...PILL_BTN,
                  background: instMode === 'outra' ? '#7A5C4F' : '#F5F0E8',
                  color: instMode === 'outra' ? '#FFFFFF' : '#7A5C4F',
                  border: `1.5px solid ${instMode === 'outra' ? '#7A5C4F' : '#EDE6DC'}`,
                }}>
                <IconPlus size={13} stroke={2} /> Outra (corretora, etc)
              </button>
            </div>

            {instMode === 'conta' && (
              contas.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {contas.map(c => (
                    <button key={c.id}
                      onClick={() => setForm(f => ({ ...f, instituicaoConta: String(c.id) }))}
                      style={{
                        padding: '7px 14px', borderRadius: 20,
                        border: form.instituicaoConta === String(c.id) ? `2px solid ${c.cor}` : '1.5px solid #E8E0D5',
                        background: form.instituicaoConta === String(c.id) ? `${c.cor}18` : 'white',
                        fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600,
                        color: form.instituicaoConta === String(c.id) ? c.cor : '#7A5C4F',
                        cursor: 'pointer', transition: 'all .15s',
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                      }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.cor }} />{c.nome}
                    </button>
                  ))}
                </div>
              ) : (
                <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#9B7B6A', padding: '10px 14px', background: '#FAF6F0', borderRadius: 10, border: '1px dashed #E8E0D5', margin: 0 }}>
                  Nenhuma conta cadastrada. Use "Outra" para digitar livre ou cadastre uma conta primeiro.
                </p>
              )
            )}

            {instMode === 'outra' && (
              <input
                value={form.instituicaoOutra}
                onChange={e => setForm(f => ({ ...f, instituicaoOutra: e.target.value }))}
                placeholder="Ex: XP, Rico, Clear, Avenue, Binance..."
                style={INPUT_STYLE}
              />
            )}
          </Field>

          {/* ─── CAMPOS POR TIPO ──────────────────────────────────── */}
          {isVar ? (
            <>
              {/* Renda variável: moeda + ticker + cotação */}
              <div style={{ background: 'rgba(80,78,118,0.06)', border: '1px solid rgba(80,78,118,0.15)', borderRadius: 12, padding: '14px 16px' }}>

                {/* Toggle Moeda */}
                <Field label="Moeda do ativo">
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setForm(f => ({ ...f, moeda: 'BRL' }))}
                      style={{ flex: 1, padding: '8px 12px', borderRadius: 9, cursor: 'pointer', border: `1.5px solid ${form.moeda === 'BRL' ? '#3A8580' : '#EDE6DC'}`, background: form.moeda === 'BRL' ? '#3A8580' : '#FBF8F3', color: form.moeda === 'BRL' ? '#FFFFFF' : '#7A5C4F', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <IconCurrencyReal size={14} stroke={2.2} /> Brasil (BRL)
                    </button>
                    <button onClick={() => setForm(f => ({ ...f, moeda: 'USD' }))}
                      style={{ flex: 1, padding: '8px 12px', borderRadius: 9, cursor: 'pointer', border: `1.5px solid ${form.moeda === 'USD' ? '#3A8580' : '#EDE6DC'}`, background: form.moeda === 'USD' ? '#3A8580' : '#FBF8F3', color: form.moeda === 'USD' ? '#FFFFFF' : '#7A5C4F', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <IconCurrencyDollar size={14} stroke={2.2} /> Exterior (USD)
                    </button>
                  </div>
                </Field>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Field label="Ticker (opcional)">
                    <input
                      value={form.ticker}
                      onChange={e => setForm(f => ({ ...f, ticker: e.target.value.toUpperCase() }))}
                      placeholder={
                        form.tipo === 'Cripto' ? 'BTC' :
                        form.moeda === 'USD' ? 'AAPL' :
                        form.tipo === 'FII' ? 'HGLG11' :
                        form.tipo === 'Ação' ? 'PETR4' : 'TICKER'
                      }
                      style={{ ...INPUT_STYLE, textTransform: 'uppercase' }}
                    />
                  </Field>
                  <Field label={`Cotação atual (${form.moeda === 'USD' ? 'US$' : 'R$'})`}>
                    <input
                      value={form.cotacaoAtual}
                      onChange={e => setForm(f => ({ ...f, cotacaoAtual: e.target.value }))}
                      placeholder="28,90" inputMode="decimal"
                      style={INPUT_STYLE}
                    />
                  </Field>
                </div>
                <p style={{ ...HELP_STYLE, marginBottom: 0 }}>
                  {form.moeda === 'USD'
                    ? 'Ativo no exterior: valores armazenados em USD, conversão pra BRL feita automaticamente.'
                    : 'Atualize a cotação manualmente quando quiser refletir o valor de mercado.'}
                </p>
              </div>

              {/* MODO CRIAÇÃO: primeiro aporte */}
              {!isEditing && (
                <div style={{ background: '#FBF8F3', border: '1px solid #EDE6DC', borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{ ...LABEL_STYLE, color: '#2C1A0F', margin: 0 }}>Primeiro aporte</span>
                    <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 600, color: '#9B7B6A' }}>(compra inicial)</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                    <Field label="Data">
                      <input type="date" value={form.primeiroAporteData}
                        onChange={e => setForm(f => ({ ...f, primeiroAporteData: e.target.value }))}
                        style={INPUT_STYLE} />
                    </Field>
                    <Field label="Quantidade">
                      <input value={form.primeiroAporteQtd}
                        onChange={e => setForm(f => ({ ...f, primeiroAporteQtd: e.target.value }))}
                        placeholder="100" inputMode="decimal"
                        style={INPUT_STYLE} />
                    </Field>
                    <Field label="Preço unitário (R$)">
                      <input value={form.primeiroAportePreco}
                        onChange={e => setForm(f => ({ ...f, primeiroAportePreco: e.target.value }))}
                        placeholder="25,40" inputMode="decimal"
                        style={INPUT_STYLE} />
                    </Field>
                  </div>
                  {form.primeiroAporteQtd && form.primeiroAportePreco && (
                    <div style={{ marginTop: 10, padding: '8px 12px', background: '#FFFFFF', borderRadius: 8, border: '1px solid #EDE6DC', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600, color: '#7A5C4F' }}>Total investido neste aporte</span>
                      <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 16, fontWeight: 700, color: '#2C1A0F', letterSpacing: '-0.3px' }}>
                        {fmt(parseValor(form.primeiroAporteQtd) * parseValor(form.primeiroAportePreco))}
                      </span>
                    </div>
                  )}
                  <p style={{ ...HELP_STYLE, marginTop: 10, marginBottom: 0, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                    <IconInfoCircle size={13} stroke={2} color="#9B7B6A" style={{ marginTop: 1, flexShrink: 0 }}/>
                    Depois você pode registrar novos aportes pelo botão <strong style={{ color: '#7A5C4F' }}>"Aportar"</strong> no card. Preço médio e quantidade total são calculados automaticamente.
                  </p>
                </div>
              )}

              {/* MODO EDIÇÃO: resumo da posição read-only */}
              {isEditing && invest && (
                <div style={{ background: '#FBF8F3', border: '1px solid #EDE6DC', borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ ...LABEL_STYLE, color: '#2C1A0F', margin: 0 }}>Posição atual</span>
                    <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: '#9B7B6A' }}>
                      {aportes.length} {aportes.length === 1 ? 'aporte' : 'aportes'}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                    <Mini label="Quantidade" value={(invest.quantidade ?? 0).toLocaleString('pt-BR')} />
                    <Mini label="Preço médio" value={fmt(invest.precoMedio ?? 0)} />
                    <Mini label="Investido" value={fmt(invest.valorAplicado)} />
                  </div>
                  <p style={{ ...HELP_STYLE, marginTop: 10, marginBottom: 0, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                    <IconInfoCircle size={13} stroke={2} color="#9B7B6A" style={{ marginTop: 1, flexShrink: 0 }} />
                    Quantidade e preço médio são calculados a partir dos aportes. Gerencie pelo botão <strong style={{ color: '#7A5C4F' }}>"Aportar"</strong> no card.
                  </p>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Renda fixa / poupança: valor aplicado + valor atual + rentabilidade */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="Valor aplicado (R$)">
                  <input
                    value={form.valorAplicado}
                    onChange={e => setForm(f => ({ ...f, valorAplicado: e.target.value }))}
                    placeholder="0,00" inputMode="decimal"
                    style={INPUT_STYLE}
                  />
                </Field>
                <Field label="Data aplicação">
                  <input type="date"
                    value={form.dataAplicacao}
                    onChange={e => setForm(f => ({ ...f, dataAplicacao: e.target.value }))}
                    style={INPUT_STYLE} />
                </Field>
              </div>

              {/* Valor atual + modo */}
              <Field label="Valor atual">
                <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
                  <input
                    value={form.valorAtual}
                    onChange={e => setForm(f => ({
                      ...f, valorAtual: e.target.value,
                      valorAtualSource: 'manual',
                    }))}
                    placeholder="0,00" inputMode="decimal"
                    style={{ ...INPUT_STYLE, flex: 1 }}
                  />
                  <button
                    onClick={() => setForm(f => ({
                      ...f,
                      valorAtualSource: f.valorAtualSource === 'auto' ? 'manual' : 'auto',
                    }))}
                    title={form.valorAtualSource === 'auto'
                      ? 'Modo automático: app aplica a rentabilidade mensalmente'
                      : 'Modo manual: você atualiza quando quiser'}
                    style={{
                      background: form.valorAtualSource === 'auto' ? '#D4A017' : '#F5F0E8',
                      border: `1.5px solid ${form.valorAtualSource === 'auto' ? '#D4A017' : '#EDE6DC'}`,
                      borderRadius: 10, padding: '0 14px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6,
                      fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700,
                      color: form.valorAtualSource === 'auto' ? '#FFFFFF' : '#7A5C4F',
                      letterSpacing: '.04em',
                    }}>
                    {form.valorAtualSource === 'auto'
                      ? (<><IconRefresh size={13} stroke={2.2} />AUTO</>)
                      : (<><IconLock size={13} stroke={2.2} />MANUAL</>)}
                  </button>
                </div>
                <p style={HELP_STYLE}>
                  {form.valorAtualSource === 'auto'
                    ? 'O app aplica a rentabilidade anual proporcional ao mês automaticamente.'
                    : 'Modo manual: o valor não é atualizado automaticamente — você ajusta quando quiser.'}
                </p>
              </Field>

              {/* Rendimento (renda fixa) — modalidade adaptativa */}
              {isFix && (
                <>
                  <Field label="Como esse investimento rende?">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 10 }}>
                      <ModalidadeBtn active={form.tipoRendimento === 'pos_cdi'} onClick={() => setForm(f => ({ ...f, tipoRendimento: 'pos_cdi' }))}>
                        % CDI
                      </ModalidadeBtn>
                      <ModalidadeBtn active={form.tipoRendimento === 'pos_selic'} onClick={() => setForm(f => ({ ...f, tipoRendimento: 'pos_selic' }))}>
                        % Selic
                      </ModalidadeBtn>
                      <ModalidadeBtn active={form.tipoRendimento === 'prefixado'} onClick={() => setForm(f => ({ ...f, tipoRendimento: 'prefixado' }))}>
                        Prefixado
                      </ModalidadeBtn>
                      <ModalidadeBtn active={form.tipoRendimento === 'ipca_mais'} onClick={() => setForm(f => ({ ...f, tipoRendimento: 'ipca_mais' }))}>
                        IPCA + X%
                      </ModalidadeBtn>
                      <ModalidadeBtn active={form.tipoRendimento === 'prefixado_ipca'} onClick={() => setForm(f => ({ ...f, tipoRendimento: 'prefixado_ipca' }))}>
                        IPCA (cheio)
                      </ModalidadeBtn>
                    </div>

                    {/* Campos do modo selecionado */}
                    {(form.tipoRendimento === 'pos_cdi' || form.tipoRendimento === 'pos_selic') && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          value={form.percentualIndexador}
                          onChange={e => setForm(f => ({ ...f, percentualIndexador: e.target.value }))}
                          placeholder="102"
                          inputMode="decimal"
                          style={{ ...INPUT_STYLE, width: 90, textAlign: 'right' }}
                        />
                        <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 600, color: '#7A5C4F' }}>
                          % do {form.tipoRendimento === 'pos_cdi' ? 'CDI' : 'Selic'}
                          {' '}
                          ({((form.tipoRendimento === 'pos_cdi' ? taxas.cdi : taxas.selic) * 100).toFixed(2)}% a.a.)
                        </span>
                      </div>
                    )}

                    {form.tipoRendimento === 'prefixado' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          value={form.rentabilidadeAnual}
                          onChange={e => setForm(f => ({ ...f, rentabilidadeAnual: e.target.value }))}
                          placeholder="12,5"
                          inputMode="decimal"
                          style={{ ...INPUT_STYLE, width: 110, textAlign: 'right' }}
                        />
                        <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 600, color: '#7A5C4F' }}>
                          % a.a. fixo (não muda)
                        </span>
                      </div>
                    )}

                    {form.tipoRendimento === 'ipca_mais' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 600, color: '#7A5C4F' }}>
                          IPCA ({(taxas.ipca * 100).toFixed(2)}% a.a.) +
                        </span>
                        <input
                          value={form.taxaAdicional}
                          onChange={e => setForm(f => ({ ...f, taxaAdicional: e.target.value }))}
                          placeholder="5,45"
                          inputMode="decimal"
                          style={{ ...INPUT_STYLE, width: 90, textAlign: 'right' }}
                        />
                        <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 600, color: '#7A5C4F' }}>
                          % a.a.
                        </span>
                      </div>
                    )}

                    {form.tipoRendimento === 'prefixado_ipca' && (
                      <p style={{ ...HELP_STYLE, marginBottom: 0 }}>
                        Rende exatamente a inflação (IPCA). Taxa atual: {(taxas.ipca * 100).toFixed(2)}% a.a.
                      </p>
                    )}

                    {/* Preview da taxa efetiva */}
                    <TaxaEfetivaPreview
                      tipoRendimento={form.tipoRendimento}
                      percentualIndexador={form.percentualIndexador ? parseValor(form.percentualIndexador) / 100 : undefined}
                      taxaAdicional={form.taxaAdicional ? parseValor(form.taxaAdicional) / 100 : undefined}
                      rentabilidadeAnual={form.rentabilidadeAnual ? parseValor(form.rentabilidadeAnual) / 100 : undefined}
                      taxas={taxas}
                    />
                  </Field>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <Field label="Liquidez">
                      <select
                        value={form.liquidez}
                        onChange={e => setForm(f => ({ ...f, liquidez: e.target.value as InvestimentoLiquidez }))}
                        style={INPUT_STYLE}>
                        <option value="">— Não definida —</option>
                        {LIQUIDEZ_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </Field>
                    <Field label="Vencimento (opcional)">
                      <input type="date"
                        value={form.dataVencimento}
                        onChange={e => setForm(f => ({ ...f, dataVencimento: e.target.value }))}
                        style={INPUT_STYLE} />
                    </Field>
                  </div>
                </>
              )}
            </>
          )}

          {/* Meta vinculada */}
          <Field label="Vincular a uma meta (opcional)">
            <select
              value={form.metaId}
              onChange={e => setForm(f => ({ ...f, metaId: e.target.value }))}
              style={INPUT_STYLE}>
              <option value="">— Sem vínculo —</option>
              {metas.map(m => (
                <option key={m.id} value={m.id}>
                  {m.nome}{m.tipo === 'reserva_emergencia' ? ' (Reserva de Emergência)' : ''}
                </option>
              ))}
            </select>
          </Field>
        </div>
    </LegacyModalShell>
  )
}

// ─── Subcomponentes auxiliares ─────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={LABEL_STYLE}>{label}</span>
      {children}
    </label>
  )
}

function ModalidadeBtn({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      style={{
        background: active ? '#3A8580' : '#FBF8F3',
        border: `1.5px solid ${active ? '#3A8580' : '#EDE6DC'}`,
        borderRadius: 10, padding: '8px 10px', cursor: 'pointer',
        fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700,
        color: active ? '#FFFFFF' : '#7A5C4F',
        textAlign: 'center', transition: 'all .15s',
      }}>
      {children}
    </button>
  )
}

function TaxaEfetivaPreview({ tipoRendimento, percentualIndexador, taxaAdicional, rentabilidadeAnual, taxas }: {
  tipoRendimento: TipoRendimento
  percentualIndexador?: number
  taxaAdicional?: number
  rentabilidadeAnual?: number
  taxas: { cdi: number; selic: number; ipca: number; atualizadoEm: number }
}) {
  const taxa = calcTaxaEfetiva({ tipoRendimento, percentualIndexador, taxaAdicional, rentabilidadeAnual }, taxas)
  if (taxa <= 0) return null
  const mensal = Math.pow(1 + taxa, 1 / 12) - 1
  return (
    <div style={{
      marginTop: 12, padding: '10px 14px',
      background: 'rgba(58,133,128,0.08)', border: '1px solid rgba(58,133,128,0.18)',
      borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12,
    }}>
      <div>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: '#1E7D5A', letterSpacing: '.08em', textTransform: 'uppercase', margin: 0, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <IconTrendingUp size={12} stroke={2.4} />Taxa efetiva
        </p>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#9B7B6A', margin: '3px 0 0' }}>
          R$ 1.000 viraria <strong style={{ color: '#1E7D5A' }}>{(1000 * Math.pow(1 + taxa, 1)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong> em 12 meses
        </p>
      </div>
      <div style={{ textAlign: 'right' }}>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 18, fontWeight: 700, color: '#1E7D5A', letterSpacing: '-0.3px', margin: 0 }}>
          {(taxa * 100).toFixed(2)}% <span style={{ fontSize: 11, fontWeight: 600, color: '#7A5C4F' }}>a.a.</span>
        </p>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: '#9B7B6A', margin: '2px 0 0' }}>
          ~{(mensal * 100).toFixed(2)}% ao mês
        </p>
      </div>
    </div>
  )
}

function Mini({ label, value, cor = '#2C1A0F' }: { label: string; value: string; cor?: string }) {
  return (
    <div>
      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 700, color: '#9B7B6A', letterSpacing: '.08em', textTransform: 'uppercase', margin: 0 }}>{label}</p>
      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, color: cor, letterSpacing: '-0.3px', margin: '2px 0 0' }}>{value}</p>
    </div>
  )
}

const LABEL_STYLE: React.CSSProperties = {
  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700,
  color: '#7A5C4F', letterSpacing: '.1em', textTransform: 'uppercase',
  display: 'block', marginBottom: 6,
}

const HELP_STYLE: React.CSSProperties = {
  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#9B7B6A',
  margin: '6px 0 0', lineHeight: 1.4,
}

const INPUT_STYLE: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: '#FBF8F3', border: '1.5px solid #EDE6DC',
  borderRadius: 10, padding: '10px 12px',
  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 500,
  color: '#2C1A0F', outline: 'none',
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

const PILL_BTN: React.CSSProperties = {
  padding: '7px 12px', borderRadius: 9, cursor: 'pointer',
  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700,
  display: 'inline-flex', alignItems: 'center', gap: 5,
  letterSpacing: '.02em', transition: 'all .15s',
}

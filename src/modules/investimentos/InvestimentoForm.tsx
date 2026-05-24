import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { IconX, IconCheck, IconRefresh, IconLock, IconBuildingBank, IconPlus, IconInfoCircle } from '@tabler/icons-react'
import type { Investimento, InvestimentoTipo, InvestimentoBenchmark, InvestimentoLiquidez } from '@/db/schema'
import { addInvestimento, editInvestimento, isRendaVariavel, isRendaFixa, addAporte, useAportes } from '@/db/hooks/useInvestimentos'
import { useMetas } from '@/db/hooks/useMetas'
import { useContas } from '@/db/hooks/useContas'
import { TIPOS, BENCHMARKS, LIQUIDEZ_OPTIONS, TIPO_META } from './constants'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { fmt } from '@/lib/format'

interface Props {
  invest?: Investimento | null
  presetMetaId?: number
  onClose: () => void
}

export function InvestimentoForm({ invest, presetMetaId, onClose }: Props) {
  useBodyScrollLock(true)
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

  const [form, setForm] = useState({
    nome: invest?.nome ?? '',
    tipo: invest?.tipo ?? 'CDB' as InvestimentoTipo,
    instituicaoConta: initialInstFromConta?.id ? String(initialInstFromConta.id) : '',
    instituicaoOutra: (invest?.instituicao && !initialInstFromConta) ? invest.instituicao : '',
    ticker: invest?.ticker ?? '',
    valorAplicado: invest?.valorAplicado ? String(invest.valorAplicado) : '',
    valorAtual: invest?.valorAtual ? String(invest.valorAtual) : '',
    valorAtualSource: invest?.valorAtualSource ?? 'auto' as 'auto' | 'manual',
    // Renda fixa
    rentabilidadeAnual: invest?.rentabilidadeAnual ? String(invest.rentabilidadeAnual * 100) : '',
    benchmark: invest?.benchmark ?? '' as InvestimentoBenchmark | '',
    liquidez: invest?.liquidez ?? '' as InvestimentoLiquidez | '',
    // Renda variável — PRIMEIRO aporte (apenas na criação) e cotação
    primeiroAporteData: today,
    primeiroAporteQtd: '',
    primeiroAportePreco: '',
    cotacaoAtual: invest?.cotacaoAtual ? String(invest.cotacaoAtual) : '',
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
      // Renda fixa: comportamento clássico
      const data = {
        nome: form.nome,
        tipo: form.tipo,
        instituicao: resolveInstituicao(),
        valorAplicado: parseValor(form.valorAplicado),
        valorAtual: parseValor(form.valorAtual || form.valorAplicado),
        valorAtualSource: form.valorAtualSource,
        rentabilidadeAnual: form.rentabilidadeAnual ? parseValor(form.rentabilidadeAnual) / 100 : undefined,
        benchmark: form.benchmark || undefined,
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
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(28,10,5,0.55)',
        backdropFilter: 'blur(8px)', zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 240, damping: 28 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: '#FFFFFF', borderRadius: 24,
          width: '100%', maxWidth: 640, maxHeight: '90vh',
          overflowY: 'auto', boxShadow: '0 24px 64px rgba(28,10,5,0.4)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '24px 28px', borderBottom: '1px solid #EDE6DC',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          position: 'sticky', top: 0, background: '#FFFFFF', zIndex: 2,
        }}>
          <div>
            <h2 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 24, fontWeight: 700, color: '#2C1A0F', margin: 0, letterSpacing: '-0.6px' }}>
              {isEditing ? 'Editar investimento' : 'Novo investimento'}
            </h2>
          </div>
          <button onClick={onClose} style={{
            background: '#F5F0E8', border: 'none', borderRadius: 10,
            width: 32, height: 32, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <IconX size={16} stroke={2} color="#7A5C4F" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {TIPOS.map(t => {
                const Icon = t.Icon
                const active = form.tipo === t.value
                return (
                  <button key={t.value}
                    onClick={() => setForm(f => ({ ...f, tipo: t.value }))}
                    style={{
                      background: active ? t.cor : '#FBF8F3',
                      border: `1.5px solid ${active ? t.cor : '#EDE6DC'}`,
                      borderRadius: 12, padding: '10px 12px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 8,
                      transition: 'all .15s',
                    }}>
                    <Icon size={18} stroke={1.8} color={active ? '#FFFFFF' : t.cor} />
                    <span style={{
                      fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600,
                      color: active ? '#FFFFFF' : '#2C1A0F',
                    }}>{t.label}</span>
                  </button>
                )
              })}
            </div>
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
              {/* Renda variável: ticker + cotação + (criação: primeiro aporte / edição: resumo) */}
              <div style={{ background: 'rgba(80,78,118,0.06)', border: '1px solid rgba(80,78,118,0.15)', borderRadius: 12, padding: '14px 16px' }}>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Field label="Ticker (opcional)">
                    <input
                      value={form.ticker}
                      onChange={e => setForm(f => ({ ...f, ticker: e.target.value.toUpperCase() }))}
                      placeholder={form.tipo === 'FII' ? 'HGLG11' : form.tipo === 'Ação' ? 'PETR4' : form.tipo === 'Cripto' ? 'BTC' : 'TICKER'}
                      style={{ ...INPUT_STYLE, textTransform: 'uppercase' }}
                    />
                  </Field>
                  <Field label="Cotação atual (R$)">
                    <input
                      value={form.cotacaoAtual}
                      onChange={e => setForm(f => ({ ...f, cotacaoAtual: e.target.value }))}
                      placeholder="28,90" inputMode="decimal"
                      style={INPUT_STYLE}
                    />
                  </Field>
                </div>
                <p style={{ ...HELP_STYLE, marginBottom: 0 }}>
                  Atualize a cotação manualmente quando quiser refletir o valor de mercado.
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

              {/* Rentabilidade (só faz sentido para renda fixa com taxa fixa) */}
              {isFix && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <Field label="Rentabilidade anual (%)">
                      <input
                        value={form.rentabilidadeAnual}
                        onChange={e => setForm(f => ({ ...f, rentabilidadeAnual: e.target.value }))}
                        placeholder="12,5" inputMode="decimal"
                        style={INPUT_STYLE}
                      />
                    </Field>
                    <Field label="Benchmark">
                      <select
                        value={form.benchmark}
                        onChange={e => setForm(f => ({ ...f, benchmark: e.target.value as InvestimentoBenchmark }))}
                        style={INPUT_STYLE}>
                        <option value="">— Selecione —</option>
                        {BENCHMARKS.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </Field>
                  </div>

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

        {/* Footer */}
        <div style={{
          padding: '16px 28px', borderTop: '1px solid #EDE6DC',
          display: 'flex', justifyContent: 'flex-end', gap: 10,
          position: 'sticky', bottom: 0, background: '#FFFFFF',
        }}>
          <button onClick={onClose} style={SECONDARY_BTN}>Cancelar</button>
          <button onClick={handleSave} disabled={!formValid}
            style={{
              ...PRIMARY_BTN,
              opacity: formValid ? 1 : 0.5,
              cursor: formValid ? 'pointer' : 'not-allowed',
            }}>
            <IconCheck size={16} stroke={2.5} />
            {isEditing ? 'Salvar alterações' : 'Adicionar investimento'}
          </button>
        </div>
      </motion.div>
    </motion.div>
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

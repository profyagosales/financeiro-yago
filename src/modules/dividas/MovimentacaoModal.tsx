import { useState } from 'react'
import { LegacyModalShell } from '@/components/ui/LegacyModalShell'
import { IconX, IconCheck, IconTrash, IconCash, IconDiscount, IconCircleCheck, IconAdjustments } from '@tabler/icons-react'
import type { Divida, MovimentacaoTipo } from '@/db/schema'
import { useMovimentacoes, addMovimentacao, deleteMovimentacao, MOVIMENTACAO_LABEL, MOVIMENTACAO_COR, calcMovimentacoesTotais } from '@/db/hooks/useDividas'
import { fmt, todayISO } from '@/lib/format'
import { showErrorToast, sounds } from '@/lib/sounds'
import { useSavingGuard } from '@/hooks/useSavingGuard'

interface Props {
  // Recebe o computed para ter acesso a saldoDevedor, etc.
  divida: Divida & { saldoDevedor: number; valorTotalEfetivo: number; parcelasRestantes: number; quitada: boolean }
  onClose: () => void
}

type Tab = 'amortizacao' | 'desconto' | 'quitacao' | 'ajuste'

const TABS: { value: Tab; label: string; icon: typeof IconCash; cor: string; descricao: string }[] = [
  { value: 'amortizacao', label: 'Amortizar', icon: IconCash, cor: '#3A8580', descricao: 'Pagamento extra que abate o principal' },
  { value: 'desconto',    label: 'Desconto',  icon: IconDiscount, cor: '#D4A017', descricao: 'Banco perdoou parte do saldo (sem desembolso)' },
  { value: 'quitacao',    label: 'Quitar',    icon: IconCircleCheck, cor: '#1E7D5A', descricao: 'Pagamento final para liquidar a dívida' },
  { value: 'ajuste',      label: 'Ajuste',    icon: IconAdjustments, cor: '#7A5C4F', descricao: 'Juros adicionais cobrados ou correção manual' },
]

export function MovimentacaoModal({ divida, onClose }: Props) {
  // body scroll lock agora é responsabilidade do LegacyModalShell
  const movs = useMovimentacoes(divida.id)
  const today = todayISO()

  const [tab, setTab] = useState<Tab>('amortizacao')

  // Form unificado (campos relevantes mudam por tab)
  const [form, setForm] = useState({
    data: today,
    valor: '',
    descontoValor: '',
    reduzParcelas: '',
    observacao: '',
  })

  const parseValor = (v: string) => parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0

  const totais = calcMovimentacoesTotais(movs)
  const valorQuitacaoSugerido = divida.saldoDevedor

  const { saving, runSaving } = useSavingGuard()

  const handleAdd = () => runSaving(async () => {
    if (!divida.id) return
    const valor = parseValor(form.valor)
    const descontoVal = parseValor(form.descontoValor)
    const observacaoTrim = form.observacao.trim()

    try {
      if (tab === 'amortizacao') {
        if (valor <= 0) return
        await addMovimentacao({
          dividaId: divida.id,
          data: form.data,
          tipo: 'amortizacao',
          valor,
          reduzParcelas: form.reduzParcelas ? parseInt(form.reduzParcelas) : undefined,
          observacao: observacaoTrim || undefined,
        })
      } else if (tab === 'desconto') {
        if (valor <= 0) return
        await addMovimentacao({
          dividaId: divida.id,
          data: form.data,
          tipo: 'desconto',
          valor,
          observacao: observacaoTrim || undefined,
        })
      } else if (tab === 'quitacao') {
        if (valor <= 0) return
        // Quitação: registra valor pago + opcionalmente um desconto separado
        await addMovimentacao({
          dividaId: divida.id,
          data: form.data,
          tipo: 'quitacao',
          valor,
          observacao: observacaoTrim || `Quitação total`,
        })
        if (descontoVal > 0) {
          await addMovimentacao({
            dividaId: divida.id,
            data: form.data,
            tipo: 'desconto',
            valor: descontoVal,
            observacao: 'Desconto na quitação',
          })
        }
      } else if (tab === 'ajuste') {
        if (valor === 0) return
        await addMovimentacao({
          dividaId: divida.id,
          data: form.data,
          tipo: 'ajuste',
          valor, // pode ser negativo (correção a favor) ou positivo (juros cobrados)
          observacao: observacaoTrim || undefined,
        })
      }
      sounds.save()
      setForm({ data: today, valor: '', descontoValor: '', reduzParcelas: '', observacao: '' })
    } catch (e) {
      console.error('[MovimentacaoModal.handleAdd]', e)
      showErrorToast(e instanceof Error ? e.message : 'Erro ao registrar movimentação — tente de novo')
      sounds.error()
    }
  })

  const currentTab = TABS.find(t => t.value === tab)!

  return (
    <LegacyModalShell open onClose={onClose} maxWidth={640} zIndex={100}
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
              <IconCash size={19} stroke={1.8} color="#A8442B" />
            </div>
            <div style={{ minWidth: 0 }}>
              <h2 style={{
                fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700,
                color: '#2C1A0F', margin: 0, letterSpacing: '-0.4px',
              }}>Movimentar dívida</h2>
              <p style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11.5, color: '#7A5C4F', margin: '2px 0 0',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{divida.nome} · saldo {fmt(divida.saldoDevedor)}</p>
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
            <IconCheck size={14} stroke={2.4} /> Fechar
          </button>
        </div>
      }
    >

        {/* Resumo de movimentações já feitas */}
        {movs.length > 0 && (
          <div style={{ padding: '14px 26px', background: '#FBF8F3', borderBottom: '1px solid #EDE6DC', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10 }}>
            <MiniKpi label="Amortizado" value={fmt(totais.amortizado)} cor="#3A8580" />
            <MiniKpi label="Descontos" value={fmt(totais.descontos)} cor="#A8730F" />
            <MiniKpi label="Adiantado" value={`${totais.parcelasAdiantadas} ${totais.parcelasAdiantadas === 1 ? 'parcela' : 'parcelas'}`} cor="#504E76" />
          </div>
        )}

        {/* Tabs */}
        <div style={{ padding: '16px 26px 0', borderBottom: '1px solid #EDE6DC' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {TABS.map(t => {
              const TIcon = t.icon
              const active = tab === t.value
              return (
                <button key={t.value} onClick={() => setTab(t.value)}
                  style={{
                    flex: 1, padding: '10px 8px', cursor: 'pointer',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: active ? `2.5px solid ${t.cor}` : '2.5px solid transparent',
                    fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700,
                    color: active ? t.cor : '#9B7B6A',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    transition: 'all .15s',
                  }}>
                  <TIcon size={14} stroke={2.2} /> {t.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Form (varia por tab) */}
        <div style={{ padding: '20px 26px', borderBottom: '1px solid #EDE6DC' }}>
          <div style={{
            padding: '10px 12px', background: `${currentTab.cor}10`, borderRadius: 10,
            border: `1px solid ${currentTab.cor}30`, marginBottom: 16,
            display: 'flex', alignItems: 'flex-start', gap: 8,
          }}>
            <currentTab.icon size={14} stroke={2} color={currentTab.cor} style={{ marginTop: 2, flexShrink: 0 }} />
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: currentTab.cor, lineHeight: 1.4, margin: 0 }}>
              <strong>{MOVIMENTACAO_LABEL[currentTab.value as MovimentacaoTipo]}</strong> — {currentTab.descricao}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 10 }}>
            <Field label="Data">
              <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} style={INPUT_STYLE} />
            </Field>
            <Field label={
              tab === 'amortizacao' ? 'Valor amortizado (R$)' :
              tab === 'desconto' ? 'Desconto recebido (R$)' :
              tab === 'quitacao' ? 'Valor pago (R$)' :
              'Ajuste (R$, neg. = redução)'
            }>
              <input value={form.valor}
                onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
                placeholder={tab === 'quitacao' ? fmt(valorQuitacaoSugerido) : '0,00'}
                inputMode="decimal"
                style={INPUT_STYLE} />
            </Field>
          </div>

          {/* Campos específicos por tab */}
          {tab === 'amortizacao' && (
            <Field label="Adiantar quantas parcelas finais? (opcional)">
              <input value={form.reduzParcelas}
                onChange={e => setForm(f => ({ ...f, reduzParcelas: e.target.value }))}
                placeholder={`Máx: ${divida.parcelasRestantes}`}
                inputMode="numeric"
                style={INPUT_STYLE} />
              <p style={{ ...HELP_STYLE, marginBottom: 0 }}>
                Se você optar por reduzir o prazo (manter parcela), informe quantas das últimas parcelas serão "puladas".
                Se optar por reduzir a parcela (manter prazo), deixe em branco.
              </p>
            </Field>
          )}

          {tab === 'quitacao' && (
            <Field label="Desconto recebido nesta quitação (R$, opcional)">
              <input value={form.descontoValor}
                onChange={e => setForm(f => ({ ...f, descontoValor: e.target.value }))}
                placeholder="0,00"
                inputMode="decimal"
                style={INPUT_STYLE} />
              <p style={{ ...HELP_STYLE, marginBottom: 0 }}>
                Saldo atual: <strong>{fmt(divida.saldoDevedor)}</strong>.
                Se você pagar menos que isso, registre a diferença aqui como desconto.
              </p>
            </Field>
          )}

          <Field label="Observação (opcional)">
            <input value={form.observacao}
              onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))}
              placeholder="Ex: 13º salário, negociação, restituição IR..."
              style={INPUT_STYLE} />
          </Field>

          <button onClick={handleAdd} disabled={!form.valor || saving}
            style={{
              marginTop: 12, width: '100%',
              background: (form.valor && !saving) ? `linear-gradient(135deg, ${currentTab.cor}, ${currentTab.cor}cc)` : '#E8E0D5',
              color: (form.valor && !saving) ? '#FFFFFF' : '#9B7B6A', border: 'none', borderRadius: 12,
              padding: '12px 0', cursor: (form.valor && !saving) ? 'pointer' : 'not-allowed',
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              boxShadow: form.valor ? `0 4px 16px ${currentTab.cor}50` : 'none',
            }}>
            <IconCheck size={15} stroke={2.4} /> Registrar {currentTab.label.toLowerCase()}
          </button>
        </div>

        {/* Histórico de movimentações */}
        <div style={{ padding: '16px 26px 24px' }}>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: '#7A5C4F', letterSpacing: '.1em', textTransform: 'uppercase', margin: '0 0 10px' }}>
            Histórico {movs.length > 0 && <span style={{ color: '#7A5C4F' }}>({movs.length})</span>}
          </p>

          {movs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#7A5C4F', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12 }}>
              Nenhuma movimentação registrada ainda.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {movs.map(m => {
                const cor = MOVIMENTACAO_COR[m.tipo]
                return (
                  <div key={m.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', border: '1px solid #EDE6DC', borderRadius: 10, background: '#FFFFFF',
                  }}>
                    <div style={{ width: 36, textAlign: 'center', flexShrink: 0 }}>
                      <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 16, fontWeight: 700, color: '#2C1A0F', margin: 0, lineHeight: 1, letterSpacing: '-0.3px' }}>
                        {new Date(m.data + 'T00:00:00').getDate().toString().padStart(2, '0')}
                      </p>
                      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 700, color: '#7A5C4F', letterSpacing: '.06em', textTransform: 'uppercase', margin: '2px 0 0' }}>
                        {new Date(m.data + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                      </p>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: 5,
                        background: `${cor}18`, color: cor,
                        fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700,
                        letterSpacing: '.04em',
                      }}>{MOVIMENTACAO_LABEL[m.tipo]}</span>
                      {m.reduzParcelas && m.reduzParcelas > 0 && (
                        <span style={{ marginLeft: 6, fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: '#504E76', fontWeight: 700 }}>
                          -{m.reduzParcelas} parcela{m.reduzParcelas !== 1 ? 's' : ''}
                        </span>
                      )}
                      {m.observacao && (
                        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#7A5C4F', margin: '3px 0 0' }}>{m.observacao}</p>
                      )}
                    </div>
                    <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 700, color: cor, letterSpacing: '-0.3px' }}>
                      {m.tipo === 'ajuste' && m.valor < 0 ? '' : '-'}{fmt(Math.abs(m.valor))}
                    </span>
                    <button onClick={() => m.id !== undefined && deleteMovimentacao(m.id)} title="Remover"
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

function MiniKpi({ label, value, cor }: { label: string; value: string; cor: string }) {
  return (
    <div>
      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 700, color: cor, letterSpacing: '.08em', textTransform: 'uppercase', margin: 0 }}>{label}</p>
      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 700, color: cor, letterSpacing: '-0.3px', margin: '2px 0 0' }}>{value}</p>
    </div>
  )
}

const HELP_STYLE: React.CSSProperties = {
  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#7A5C4F',
  margin: '6px 0 0', lineHeight: 1.4,
}

const INPUT_STYLE: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: '#FBF8F3', border: '1.5px solid #EDE6DC',
  borderRadius: 10, padding: '10px 12px',
  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 500,
  color: '#2C1A0F', outline: 'none',
}

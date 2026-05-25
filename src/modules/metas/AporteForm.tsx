import { useState } from 'react'
import { LegacyModalShell } from '@/components/ui/LegacyModalShell'
import { IconX, IconCheck, IconCurrencyReal, IconChartLine } from '@tabler/icons-react'
import type { Meta } from '@/db/schema'
import { aportarMeta } from '@/db/hooks/useMetas'
import { useContas } from '@/db/hooks/useContas'
import { BankLogo } from '@/components/ui/BankLogo'
import { showErrorToast, sounds } from '@/lib/sounds'
import { useSavingGuard } from '@/hooks/useSavingGuard'

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
  const [contaOrigemId, setContaOrigemId] = useState<number | null>(null)
  const contas = useContas()

  const parseValor = (v: string) => parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0
  const v = parseValor(valor)
  const canSubmit = v > 0 && !!meta.id

  const { saving, runSaving } = useSavingGuard()

  const handleAporte = () => runSaving(async () => {
    if (!canSubmit || !meta.id) return
    try {
      await aportarMeta(meta.id, v, contaOrigemId ? { contaOrigemId } : undefined)
      sounds.save()
      onClose()
    } catch (e) {
      console.error('[AporteForm.handleAporte]', e)
      showErrorToast(e instanceof Error ? e.message : 'Erro ao aportar — tente de novo')
      sounds.error()
    }
  })

  return (
    <LegacyModalShell open onClose={onClose} maxWidth={520} zIndex={100}
      header={
        <div style={{
          padding: '16px 22px', borderBottom: '1px solid rgba(44,26,15,0.08)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{
              fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700,
              color: '#2C1A0F', margin: 0, letterSpacing: '-0.4px',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>Aportar em "{meta.nome}"</h2>
            <p style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11.5, color: '#7A5C4F', margin: '2px 0 0',
            }}>Escolha como adicionar dinheiro à meta</p>
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
    >

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
                <p style={FIELD_LABEL}>Valor do aporte (R$)</p>
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

              {/* Conta origem (opcional). Se selecionada, debita o saldo
                  com uma Transacao automática — patrimônio mantém-se
                  consistente. Se omitida, só incrementa valorAtual da meta
                  (modo legado, útil pra registrar aporte feito fora). */}
              <div>
                <p style={FIELD_LABEL}>De qual conta sai o dinheiro? (opcional)</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  <button onClick={() => setContaOrigemId(null)}
                    style={{
                      padding: '7px 12px', borderRadius: 22,
                      border: `1.5px solid ${contaOrigemId === null ? '#2C1A0F' : '#EDE6DC'}`,
                      background: contaOrigemId === null ? '#2C1A0F' : '#FFFFFF',
                      color: contaOrigemId === null ? '#FFFFFF' : '#7A5C4F',
                      cursor: 'pointer',
                      fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700,
                    }}>Só registrar na meta</button>
                  {contas.map(c => {
                    const active = contaOrigemId === c.id
                    return (
                      <button key={c.id} onClick={() => setContaOrigemId(c.id ?? null)}
                        style={{
                          padding: '5px 12px 5px 5px', borderRadius: 22,
                          border: `1.5px solid ${active ? c.cor : '#EDE6DC'}`,
                          background: active ? c.cor : '#FFFFFF',
                          color: active ? '#FFFFFF' : '#2C1A0F',
                          cursor: 'pointer',
                          fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700,
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                        }}>
                        <BankLogo logo={c.logo} nome={c.nome} cor={c.cor} size={22} radiusRatio={0.28} />
                        {c.nome}
                      </button>
                    )
                  })}
                </div>
                {contaOrigemId && (
                  <p style={{
                    fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#7A5C4F',
                    margin: '8px 0 0', lineHeight: 1.5,
                  }}>O saldo da conta será debitado em R$ {valor || '0,00'} via transação automática.</p>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setPath(null)} disabled={saving} style={SECONDARY_BTN}>Voltar</button>
                <button onClick={handleAporte}
                  disabled={!canSubmit || saving}
                  style={{ ...PRIMARY_BTN, opacity: (canSubmit && !saving) ? 1 : 0.5, cursor: (canSubmit && !saving) ? 'pointer' : 'not-allowed' }}>
                  <IconCheck size={16} stroke={2.5} /> {saving ? 'Aportando…' : 'Aportar'}
                </button>
              </div>
            </div>
          )}
        </div>
    </LegacyModalShell>
  )
}

const FIELD_LABEL: React.CSSProperties = {
  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700,
  color: '#7A5C4F', letterSpacing: '.1em', textTransform: 'uppercase', margin: 0,
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

import { useState } from 'react'
import { LegacyModalShell } from '@/components/ui/LegacyModalShell'
import { IconX, IconCheck, IconCoins, IconTrash, IconPlus } from '@tabler/icons-react'
import type { Investimento, ProventoTipo } from '@/db/schema'
import { useProventos, addProvento, deleteProvento, calcDY12m, calcProventosMes } from '@/db/hooks/useInvestimentos'
import { fmt, todayISO } from '@/lib/format'
import { showErrorToast, sounds } from '@/lib/sounds'

interface Props {
  invest: Investimento
  onClose: () => void
}

const TIPOS_PROVENTO: { value: ProventoTipo; label: string; cor: string }[] = [
  { value: 'dividendo', label: 'Dividendo', cor: '#3A8580' },
  { value: 'jcp', label: 'JCP', cor: '#504E76' },
  { value: 'aluguel', label: 'Aluguel (FII)', cor: '#A8730F' },
  { value: 'rendimento', label: 'Rendimento', cor: '#7A5C4F' },
  { value: 'bonificacao', label: 'Bonificação', cor: '#3D7EB5' },
  { value: 'outros', label: 'Outros', cor: '#9B7B6A' },
]

export function ProventosModal({ invest, onClose }: Props) {
  // body scroll lock agora é responsabilidade do LegacyModalShell
  const proventos = useProventos(invest.id)
  const today = todayISO()

  const [form, setForm] = useState({
    data: today,
    valor: '',
    tipo: (invest.tipo === 'FII' ? 'aluguel' : 'dividendo') as ProventoTipo,
    observacao: '',
  })

  const parseValor = (v: string) => parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0

  const handleAdd = async () => {
    const valor = parseValor(form.valor)
    if (!valor || !invest.id) return
    const observacaoTrim = form.observacao.trim()
    try {
      await addProvento({
        investimentoId: invest.id,
        data: form.data,
        valor,
        tipo: form.tipo,
        observacao: observacaoTrim || undefined,
      })
      sounds.save()
      setForm({ data: today, valor: '', tipo: form.tipo, observacao: '' })
    } catch (e) {
      console.error('[ProventosModal.handleAdd]', e)
      showErrorToast(e instanceof Error ? e.message : 'Erro ao registrar provento — tente de novo')
      sounds.error()
    }
  }

  const totalRecebido = proventos.reduce((s, p) => s + p.valor, 0)
  const dy12m = calcDY12m(proventos, invest.valorAtual)
  const mesAtual = calcProventosMes(proventos)

  return (
    <LegacyModalShell open onClose={onClose} maxWidth={600} zIndex={100}
      header={
        <div style={{
          padding: '16px 22px', borderBottom: '1px solid rgba(44,26,15,0.08)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
        }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1, minWidth: 0 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 11, background: 'rgba(58,133,128,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <IconCoins size={19} stroke={1.8} color="#1E7D5A" />
            </div>
            <div style={{ minWidth: 0 }}>
              <h2 style={{
                fontFamily: "'Fraunces',Georgia,serif", fontSize: 20, fontWeight: 700,
                color: '#2C1A0F', margin: 0, letterSpacing: '-0.4px',
              }}>Proventos</h2>
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
        <div style={{ padding: '16px 26px', background: '#FBF8F3', borderBottom: '1px solid #EDE6DC', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 12 }}>
          <Kpi label="Total recebido" value={fmt(totalRecebido)} sub={`${proventos.length} ${proventos.length === 1 ? 'registro' : 'registros'}`} cor="#1E7D5A" />
          <Kpi label="DY 12 meses" value={`${dy12m.toFixed(2)}%`} sub="sobre valor atual" cor="#3A8580" />
          <Kpi label="Este mês" value={fmt(mesAtual)} sub={mesAtual > 0 ? 'recebido' : 'nada ainda'} cor="#A8730F" />
        </div>

        {/* Form de novo provento */}
        <div style={{ padding: '20px 26px', borderBottom: '1px solid #EDE6DC' }}>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: '#7A5C4F', letterSpacing: '.1em', textTransform: 'uppercase', margin: '0 0 12px' }}>Registrar novo</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 10 }}>
            <Field label="Data">
              <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} style={INPUT_STYLE} />
            </Field>
            <Field label="Valor (R$)">
              <input value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} placeholder="0,00" inputMode="decimal" style={INPUT_STYLE} />
            </Field>
          </div>

          <Field label="Tipo">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {TIPOS_PROVENTO.map(t => {
                const active = form.tipo === t.value
                return (
                  <button key={t.value} onClick={() => setForm(f => ({ ...f, tipo: t.value }))}
                    style={{
                      padding: '7px 12px', borderRadius: 20,
                      border: active ? `2px solid ${t.cor}` : '1.5px solid #E8E0D5',
                      background: active ? `${t.cor}18` : 'white',
                      fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700,
                      color: active ? t.cor : '#7A5C4F',
                      cursor: 'pointer', transition: 'all .15s',
                    }}>
                    {t.label}
                  </button>
                )
              })}
            </div>
          </Field>

          <Field label="Observação (opcional)">
            <input value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} placeholder="Ex: 0,16/cota" style={INPUT_STYLE} />
          </Field>

          <button onClick={handleAdd} disabled={!form.valor}
            style={{
              marginTop: 12, width: '100%',
              background: form.valor ? 'linear-gradient(135deg, #3A8580, #2C7470)' : '#E8E0D5',
              color: form.valor ? '#FFFFFF' : '#9B7B6A', border: 'none', borderRadius: 12,
              padding: '12px 0', cursor: form.valor ? 'pointer' : 'not-allowed',
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              boxShadow: form.valor ? '0 4px 16px rgba(58,133,128,0.3)' : 'none',
            }}>
            <IconPlus size={15} stroke={2.4} /> Adicionar provento
          </button>
        </div>

        {/* Lista de proventos registrados */}
        <div style={{ padding: '16px 26px 24px' }}>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700, color: '#7A5C4F', letterSpacing: '.1em', textTransform: 'uppercase', margin: '0 0 10px' }}>
            Histórico {proventos.length > 0 && <span style={{ color: '#7A5C4F' }}>({proventos.length})</span>}
          </p>

          {proventos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#7A5C4F', fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12 }}>
              Nenhum provento registrado ainda.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {proventos.map(p => {
                const tipoInfo = TIPOS_PROVENTO.find(t => t.value === p.tipo)
                return (
                  <div key={p.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', border: '1px solid #EDE6DC', borderRadius: 10, background: '#FFFFFF',
                  }}>
                    <div style={{ width: 36, textAlign: 'center', flexShrink: 0 }}>
                      <p style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 16, fontWeight: 700, color: '#2C1A0F', margin: 0, lineHeight: 1, letterSpacing: '-0.3px' }}>
                        {new Date(p.data + 'T00:00:00').getDate().toString().padStart(2, '0')}
                      </p>
                      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 700, color: '#7A5C4F', letterSpacing: '.06em', textTransform: 'uppercase', margin: '2px 0 0' }}>
                        {new Date(p.data + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                      </p>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: 5,
                        background: `${tipoInfo?.cor ?? '#9B7B6A'}18`,
                        color: tipoInfo?.cor ?? '#9B7B6A',
                        fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700,
                        letterSpacing: '.04em',
                      }}>{tipoInfo?.label ?? p.tipo}</span>
                      {p.observacao && (
                        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#7A5C4F', margin: '4px 0 0' }}>{p.observacao}</p>
                      )}
                    </div>
                    <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 700, color: '#1E7D5A', letterSpacing: '-0.3px' }}>
                      +{fmt(p.valor)}
                    </span>
                    <button onClick={() => p.id !== undefined && deleteProvento(p.id)} title="Remover"
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

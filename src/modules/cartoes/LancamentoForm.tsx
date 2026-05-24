import { useState } from 'react'
import { IconCheck, IconReceipt, IconMinus, IconPlus } from '@tabler/icons-react'
import type { LancamentoCartao, Cartao } from '@/db/schema'
import {
  addLancamentoCartao, editLancamentoCartao,
} from '@/db/hooks/useCartoes'
import { useCategorias } from '@/db/hooks/useCategorias'
import { Modal } from '@/components/ui/Modal'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { todayISO } from '@/lib/format'
import { showErrorToast, sounds } from '@/lib/sounds'
import { useSavingGuard } from '@/hooks/useSavingGuard'

interface Props {
  open: boolean
  cartao: Cartao
  lancamento?: LancamentoCartao | null   // se presente, edit mode
  mes: number
  ano: number
  onClose: () => void
}

function initialLancamentoForm(lancamento?: LancamentoCartao | null) {
  return {
    valor: lancamento?.valor !== undefined ? String(lancamento.valor) : '',
    descricao: lancamento?.descricao ?? '',
    categoriaId: lancamento?.categoriaId ? String(lancamento.categoriaId) : '',
    totalParcelas: lancamento?.totalParcelas ?? 1,
    data: lancamento?.data ?? todayISO(),
  }
}

export function LancamentoForm({ open, cartao, lancamento, mes, ano, onClose }: Props) {
  const categorias = useCategorias('despesa')
  const isEditing = !!lancamento

  // Em edit mode: valor é só desta parcela; descricao + categoria editáveis
  // Em add mode: valor total + nº parcelas
  const [form, setForm] = useState(() => initialLancamentoForm(lancamento))
  // Derived state: reseta quando lançamento/open mudam (sem useEffect)
  const [prevKey, setPrevKey] = useState<string>(`${open}-${lancamento?.id ?? 'new'}`)
  const currentKey = `${open}-${lancamento?.id ?? 'new'}`
  if (prevKey !== currentKey) {
    setPrevKey(currentKey)
    if (open) setForm(initialLancamentoForm(lancamento))
  }

  const parseValor = (v: string) => parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0

  const { saving, runSaving } = useSavingGuard()

  const handleSave = () => runSaving(async () => {
    const descricaoTrim = form.descricao.trim()
    if (!form.valor || !form.categoriaId) return
    const valor = parseValor(form.valor)
    if (valor <= 0) return

    try {
      if (isEditing && lancamento?.id !== undefined) {
        // Edit: atualiza só esta parcela
        await editLancamentoCartao(lancamento.id, {
          valor,
          descricao: descricaoTrim,
          categoriaId: parseInt(form.categoriaId),
          data: form.data,
        })
      } else {
        if (cartao.id === undefined) return
        await addLancamentoCartao({
          cartaoId: cartao.id,
          descricao: descricaoTrim,
          valor,
          data: form.data,
          categoriaId: parseInt(form.categoriaId),
          totalParcelas: form.totalParcelas,
          mes, ano,
        })
      }
      sounds.save()
      onClose()
    } catch (e) {
      console.error('[LancamentoForm.handleSave]', e)
      showErrorToast(e instanceof Error ? e.message : 'Erro ao salvar lançamento — tente de novo')
      sounds.error()
    }
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEditing ? 'Editar lançamento' : 'Nova despesa no cartão'}
      subtitle={isEditing
        ? `${cartao.nome}${lancamento && lancamento.totalParcelas > 1 ? ` · parcela ${lancamento.parcelaAtual}/${lancamento.totalParcelas}` : ''}`
        : `Cartão ${cartao.nome}`}
      icon={<IconReceipt size={22} stroke={1.8} color="#7A5C4F" />}
    >
      <Modal.Body>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Valor + parcelas */}
          <Field label={isEditing ? 'Valor desta parcela (R$)' : 'Valor total (R$)'}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
              <input
                autoFocus
                value={form.valor}
                onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
                placeholder="0,00" inputMode="decimal"
                style={{
                  ...INPUT_STYLE, flex: 1,
                  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: '-0.3px',
                }}
              />
              {!isEditing && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  background: '#FBF8F3', border: '1.5px solid #EDE6DC',
                  borderRadius: 10, padding: '4px 6px',
                }}>
                  <button
                    onClick={() => setForm(f => ({ ...f, totalParcelas: Math.max(1, f.totalParcelas - 1) }))}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, color: '#7A5C4F' }}>
                    <IconMinus size={14} stroke={2.4} />
                  </button>
                  <span style={{
                    fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 700,
                    color: '#2C1A0F', minWidth: 28, textAlign: 'center',
                  }}>{form.totalParcelas}x</span>
                  <button
                    onClick={() => setForm(f => ({ ...f, totalParcelas: Math.min(24, f.totalParcelas + 1) }))}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, color: '#7A5C4F' }}>
                    <IconPlus size={14} stroke={2.4} />
                  </button>
                </div>
              )}
            </div>
            {!isEditing && form.totalParcelas > 1 && form.valor && (
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#7A5C4F', margin: '6px 0 0' }}>
                {form.totalParcelas}x de R$ {(parseValor(form.valor) / form.totalParcelas).toFixed(2).replace('.', ',')}
              </p>
            )}
            {isEditing && lancamento && lancamento.totalParcelas > 1 && (
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#A8730F', margin: '6px 0 0', background: 'rgba(212,160,23,0.1)', padding: '6px 10px', borderRadius: 6 }}>
                Editar valor afeta apenas a parcela {lancamento.parcelaAtual}/{lancamento.totalParcelas}. Pra alterar todas, exclua e relance.
              </p>
            )}
          </Field>

          {/* Descrição */}
          <Field label="Descrição">
            <input
              value={form.descricao}
              onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
              placeholder="Ex: Mercado, Netflix..."
              style={INPUT_STYLE}
            />
          </Field>

          {/* Data */}
          <Field label="Data da compra">
            <input
              type="date"
              value={form.data}
              onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
              style={INPUT_STYLE}
            />
          </Field>

          {/* Categoria */}
          <Field label="Categoria">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 8 }}>
              {categorias.map(c => {
                const active = form.categoriaId === String(c.id)
                return (
                  <button key={c.id}
                    onClick={() => setForm(f => ({ ...f, categoriaId: String(c.id) }))}
                    style={{
                      background: active ? `${c.cor}18` : '#FBF8F3',
                      border: `1.5px solid ${active ? c.cor : '#EDE6DC'}`,
                      borderRadius: 12, padding: '10px 6px', cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                      transition: 'all .15s',
                    }}>
                    <CategoryIcon nome={c.nome} cor={c.cor} size={32} radius={9} />
                    <span style={{
                      fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700,
                      color: active ? c.cor : '#2C1A0F', textAlign: 'center',
                    }}>{c.nome}</span>
                  </button>
                )
              })}
            </div>
          </Field>
        </div>
      </Modal.Body>

      <Modal.Footer>
        <button onClick={onClose} disabled={saving} style={SECONDARY_BTN}>Cancelar</button>
        <button onClick={handleSave}
          disabled={!form.valor || !form.categoriaId || saving}
          style={{
            ...PRIMARY_BTN,
            opacity: (!form.valor || !form.categoriaId || saving) ? 0.5 : 1,
            cursor: (!form.valor || !form.categoriaId || saving) ? 'not-allowed' : 'pointer',
          }}>
          <IconCheck size={16} stroke={2.5} />
          {isEditing ? 'Salvar alterações' : 'Lançar na fatura'}
        </button>
      </Modal.Footer>
    </Modal>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{
        fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700,
        color: '#7A5C4F', letterSpacing: '.12em', textTransform: 'uppercase',
        display: 'block', marginBottom: 8,
      }}>{label}</span>
      {children}
    </label>
  )
}

const INPUT_STYLE: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: '#FBF8F3', border: '1.5px solid #EDE6DC',
  borderRadius: 10, padding: '11px 14px',
  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 500,
  color: '#2C1A0F', outline: 'none',
}

const PRIMARY_BTN: React.CSSProperties = {
  background: 'linear-gradient(135deg, #D4643A, #C4553B)',
  color: '#FFFFFF', border: 'none', borderRadius: 12,
  padding: '11px 22px',
  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700,
  display: 'inline-flex', alignItems: 'center', gap: 7,
  boxShadow: '0 4px 16px rgba(196,85,59,0.35)',
}

const SECONDARY_BTN: React.CSSProperties = {
  background: 'transparent', color: '#7A5C4F', border: '1.5px solid #EDE6DC',
  borderRadius: 12, padding: '11px 20px', cursor: 'pointer',
  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700,
}

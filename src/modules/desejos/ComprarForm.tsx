import { useState } from 'react'
import { LegacyModalShell } from '@/components/ui/LegacyModalShell'
import { IconX, IconCheck, IconShoppingCart } from '@tabler/icons-react'
import type { Desejo } from '@/db/schema'
import { db } from '@/db/schema'
import { useContas } from '@/db/hooks/useContas'
import { useCategorias } from '@/db/hooks/useCategorias'
import { useCartoes } from '@/db/hooks/useCartoes'
import { marcarComoComprado } from '@/db/hooks/useDesejos'
import { fmt, todayISO } from '@/lib/format'
import { showErrorToast, sounds } from '@/lib/sounds'
import { useSavingGuard } from '@/hooks/useSavingGuard'

interface Props {
  desejo: Desejo
  onClose: () => void
}

// Marca um desejo como comprado e cria a transação correspondente.
export function ComprarForm({ desejo, onClose }: Props) {
  // body scroll lock agora é responsabilidade do LegacyModalShell
  const today = todayISO()
  const contas = useContas()
  const cartoes = useCartoes()
  const categorias = useCategorias('despesa')

  const valorPadrao = desejo.valorMenorEncontrado ?? desejo.valorEstimado ?? 0

  const [form, setForm] = useState({
    valor: valorPadrao ? String(valorPadrao) : '',
    data: today,
    contaId: contas[0]?.id ? String(contas[0].id) : '',
    cartaoId: '',
    categoriaId: desejo.categoriaId ? String(desejo.categoriaId) : '',
    descricao: desejo.nome,
    metodo: 'conta' as 'conta' | 'cartao',
  })

  const parseValor = (v: string) => parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0

  const valorParsed = parseValor(form.valor)
  const contaIdNum = form.metodo === 'conta' ? parseInt(form.contaId) : 0
  const cartaoIdNum = form.metodo === 'cartao' ? parseInt(form.cartaoId) : 0
  // categoriaId fallback: parseInt('') é NaN; ternário antes caía em 0 (FK
  // inválida). Agora retorna undefined se vazio, OU primeira categoria
  // 'despesa' como fallback (evita orfã).
  const categoriaIdNum = form.categoriaId ? parseInt(form.categoriaId) : undefined
  const canComprar = !!desejo.id && valorParsed > 0
    && (form.metodo === 'conta' ? !!contaIdNum : !!cartaoIdNum)

  const { saving, runSaving } = useSavingGuard()

  const handleComprar = () => runSaving(async () => {
    if (!canComprar) return
    const valor = valorParsed
    const descricaoTrim = form.descricao.trim()
    if (!descricaoTrim) return

    try {
      // Fallback de categoria: se vazio, busca uma categoria de despesa
      // existente como default (evita FK órfã com categoriaId=0)
      let catId = categoriaIdNum
      if (!catId) {
        const cat = await db.categorias.where('tipo').equals('despesa').first()
        catId = cat?.id ?? 1
      }
      const txId = (await db.transacoes.add({
        data: form.data,
        valor,
        tipo: 'despesa',
        contaId: contaIdNum,
        categoriaId: catId,
        descricao: descricaoTrim,
        notas: `Compra registrada da lista de desejos`,
        status: 'efetivada',
        updatedAt: Date.now(),
      })) as number

      // Atualiza saldo da conta se for via conta
      if (form.metodo === 'conta' && contaIdNum) {
        const conta = await db.contas.get(contaIdNum)
        if (conta) {
          await db.contas.update(contaIdNum, {
            saldoAtual: conta.saldoAtual - valor,
            updatedAt: Date.now(),
          })
        }
      }

      // Se for cartão, cria lançamento no cartão
      if (form.metodo === 'cartao' && form.cartaoId) {
        const cartaoIdLocal = parseInt(form.cartaoId)
        const d = new Date(form.data + 'T00:00:00')
        await db.lancamentosCartao.add({
          cartaoId: cartaoIdLocal,
          descricao: descricaoTrim,
          valor,
          data: form.data,
          categoriaId: catId,
          parcelaAtual: 1,
          totalParcelas: 1,
          mes: d.getMonth() + 1,
          ano: d.getFullYear(),
        })
      }

      // Marca desejo como comprado
      await marcarComoComprado(desejo.id, txId, valor)
      sounds.save()
      onClose()
    } catch (e) {
      console.error('[ComprarForm.handleComprar]', e)
      showErrorToast(e instanceof Error ? e.message : 'Erro ao registrar compra — tente de novo')
      sounds.error()
    }
  })

  return (
    <LegacyModalShell open onClose={onClose} maxWidth={560} zIndex={100}
      header={
        <div style={{
          padding: '14px 22px', borderBottom: '1px solid rgba(44,26,15,0.08)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 11,
              background: 'linear-gradient(135deg, #3A8580, #2C7470)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <IconShoppingCart size={19} stroke={1.8} color="#FFFFFF" />
            </div>
            <div style={{ minWidth: 0 }}>
              <h2 style={{
                fontFamily: "'Fraunces',Georgia,serif", fontSize: 18, fontWeight: 700,
                color: '#2C1A0F', margin: 0, letterSpacing: '-0.4px',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>Comprei "{desejo.nome}"</h2>
              <p style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#7A5C4F', margin: '2px 0 0',
              }}>Vamos registrar como transação</p>
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
        <div style={{ padding: '14px 22px', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} disabled={saving} style={SECONDARY_BTN}>Cancelar</button>
          <button onClick={handleComprar} disabled={!canComprar || saving}
            style={{ ...PRIMARY_BTN, opacity: (canComprar && !saving) ? 1 : 0.5, cursor: (canComprar && !saving) ? 'pointer' : 'not-allowed' }}>
            <IconCheck size={16} stroke={2.5} /> {saving ? 'Registrando…' : 'Registrar'}
          </button>
        </div>
      }
    >

        {/* Body */}
        <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Valor + Data */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14 }}>
            <Field label="Valor pago (R$)">
              <input
                autoFocus
                value={form.valor}
                onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
                placeholder="0,00" inputMode="decimal"
                style={{ ...INPUT_STYLE, fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 18, fontWeight: 700 }}
              />
              {desejo.valorEstimado && parseValor(form.valor) > 0 && parseValor(form.valor) < desejo.valorEstimado && (
                <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: '#3A8580', margin: '4px 0 0', fontWeight: 700 }}>
                  Economia de {fmt(desejo.valorEstimado - parseValor(form.valor))} vs estimado
                </p>
              )}
            </Field>
            <Field label="Data da compra">
              <input
                type="date"
                value={form.data}
                onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
                style={INPUT_STYLE}
              />
            </Field>
          </div>

          {/* Método de pagamento */}
          <Field label="Como pagou?">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 8 }}>
              <button onClick={() => setForm(f => ({ ...f, metodo: 'conta' }))}
                style={{
                  background: form.metodo === 'conta' ? '#3A8580' : '#FBF8F3',
                  color: form.metodo === 'conta' ? '#FFFFFF' : '#7A5C4F',
                  border: `1.5px solid ${form.metodo === 'conta' ? '#3A8580' : '#EDE6DC'}`,
                  borderRadius: 10, padding: '10px 12px',
                  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', textAlign: 'left',
                }}>
                Conta (débito / pix)
              </button>
              <button onClick={() => setForm(f => ({ ...f, metodo: 'cartao' }))}
                disabled={cartoes.length === 0}
                style={{
                  background: form.metodo === 'cartao' ? '#3A8580' : '#FBF8F3',
                  color: form.metodo === 'cartao' ? '#FFFFFF' : '#7A5C4F',
                  border: `1.5px solid ${form.metodo === 'cartao' ? '#3A8580' : '#EDE6DC'}`,
                  borderRadius: 10, padding: '10px 12px',
                  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700,
                  cursor: cartoes.length === 0 ? 'not-allowed' : 'pointer', textAlign: 'left',
                  opacity: cartoes.length === 0 ? 0.4 : 1,
                }}>
                Cartão de crédito
              </button>
            </div>
            {form.metodo === 'conta' ? (
              <select
                value={form.contaId}
                onChange={e => setForm(f => ({ ...f, contaId: e.target.value }))}
                style={INPUT_STYLE}>
                <option value="">— Selecione a conta —</option>
                {contas.map(c => <option key={c.id} value={c.id}>{c.nome} · {fmt(c.saldoAtual)}</option>)}
              </select>
            ) : (
              <select
                value={form.cartaoId}
                onChange={e => setForm(f => ({ ...f, cartaoId: e.target.value }))}
                style={INPUT_STYLE}>
                <option value="">— Selecione o cartão —</option>
                {cartoes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            )}
          </Field>

          {/* Categoria */}
          <Field label="Categoria">
            <select
              value={form.categoriaId}
              onChange={e => setForm(f => ({ ...f, categoriaId: e.target.value }))}
              style={INPUT_STYLE}>
              <option value="">— Sem categoria —</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </Field>

          {/* Descrição */}
          <Field label="Descrição da transação">
            <input
              value={form.descricao}
              onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
              style={INPUT_STYLE}
            />
          </Field>
        </div>
    </LegacyModalShell>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{
        fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700,
        color: '#7A5C4F', letterSpacing: '.1em', textTransform: 'uppercase',
        display: 'block', marginBottom: 6,
      }}>{label}</span>
      {children}
    </label>
  )
}

const INPUT_STYLE: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: '#FBF8F3', border: '1.5px solid #EDE6DC',
  borderRadius: 10, padding: '10px 12px',
  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 500,
  color: '#2C1A0F', outline: 'none',
}

const PRIMARY_BTN: React.CSSProperties = {
  background: 'linear-gradient(135deg, #3A8580, #2C7470)',
  color: '#FFFFFF', border: 'none', borderRadius: 12,
  padding: '11px 20px', cursor: 'pointer',
  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700,
  display: 'flex', alignItems: 'center', gap: 7,
  boxShadow: '0 4px 16px rgba(58,133,128,0.35)',
}

const SECONDARY_BTN: React.CSSProperties = {
  background: 'transparent', color: '#7A5C4F', border: '1.5px solid #EDE6DC',
  borderRadius: 12, padding: '11px 18px', cursor: 'pointer',
  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700,
}

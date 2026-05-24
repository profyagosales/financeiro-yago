import { useState } from 'react'
import { motion } from 'framer-motion'
import { IconX, IconCheck, IconInfoCircle } from '@tabler/icons-react'
import type { Divida, DividaTipo } from '@/db/schema'
import { addDivida, editDivida } from '@/db/hooks/useDividas'
import { useCategorias } from '@/db/hooks/useCategorias'
import { TIPOS, TIPO_META } from './constants'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'

interface Props {
  divida?: Divida | null
  onClose: () => void
}

export function DividaForm({ divida, onClose }: Props) {
  useBodyScrollLock(true)
  const categorias = useCategorias('despesa')
  const today = new Date().toISOString().split('T')[0]
  const isEditing = !!divida

  // Default: categoria "Empréstimos & Dívidas" se existir
  const catEmprestimos = categorias.find(c =>
    c.nome.toLowerCase().includes('empréstimo') ||
    c.nome.toLowerCase().includes('dívida'),
  )

  const [form, setForm] = useState({
    nome: divida?.nome ?? '',
    tipo: divida?.tipo ?? 'Empréstimo' as DividaTipo,
    instituicao: divida?.instituicao ?? '',
    valorTotal: divida?.valorTotal ? String(divida.valorTotal) : '',
    valorParcela: divida?.valorParcela ? String(divida.valorParcela) : '',
    parcelasTotal: divida?.parcelasTotal ? String(divida.parcelasTotal) : '',
    parcelasPagas: divida?.parcelasPagas !== undefined ? String(divida.parcelasPagas) : '0',
    jurosAnual: divida?.jurosAnual ? String(divida.jurosAnual * 100) : '',
    categoriaId: divida?.categoriaId ? String(divida.categoriaId) : (catEmprestimos ? String(catEmprestimos.id) : ''),
    dataInicio: divida?.dataInicio ?? today,
    diaVencimento: divida?.diaVencimento ? String(divida.diaVencimento) : '10',
  })

  const tipoMeta = TIPO_META.get(form.tipo)
  const parseValor = (v: string) => parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0
  const parseInt0 = (v: string) => parseInt(v) || 0

  const handleSave = async () => {
    if (!form.nome || !form.valorTotal || !form.valorParcela) return
    const parcelasTotalN = parseInt0(form.parcelasTotal)
    const parcelasPagasN = parseInt0(form.parcelasPagas)
    const valorParcelaN = parseValor(form.valorParcela)
    const valorPagoCalculado = parcelasPagasN * valorParcelaN

    const data = {
      nome: form.nome,
      tipo: form.tipo,
      instituicao: form.instituicao || undefined,
      valorTotal: parseValor(form.valorTotal),
      valorPago: valorPagoCalculado,
      valorParcela: valorParcelaN,
      parcelasTotal: parcelasTotalN,
      parcelasPagas: parcelasPagasN,
      jurosAnual: form.jurosAnual ? parseValor(form.jurosAnual) / 100 : undefined,
      dataInicio: form.dataInicio,
      diaVencimento: parseInt0(form.diaVencimento) || 10,
      categoriaId: form.categoriaId ? parseInt(form.categoriaId) : undefined,
      cor: tipoMeta?.cor ?? '#C4553B',
      ativo: true,
    }

    if (isEditing && divida?.id) {
      await editDivida(divida.id, data)
    } else {
      await addDivida(data)
    }
    onClose()
  }

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
          padding: '24px 28px', borderBottom: '1px solid #EDE6DC',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          position: 'sticky', top: 0, background: '#FFFFFF', zIndex: 2,
        }}>
          <div>
            <h2 style={{ fontFamily: "'Fraunces',Georgia,serif", fontSize: 24, fontWeight: 700, color: '#2C1A0F', margin: 0, letterSpacing: '-0.6px' }}>
              {isEditing ? 'Editar dívida' : 'Nova dívida'}
            </h2>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#9B7B6A', marginTop: 4 }}>
              {isEditing ? 'Atualize as informações da dívida' : 'Cadastre um empréstimo, financiamento ou similar'}
            </p>
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

          {/* Aviso de auto-criação */}
          {!isEditing && (
            <div style={{
              background: '#FBF1EE', border: '1px solid rgba(196,85,59,0.18)',
              borderRadius: 12, padding: '12px 14px',
              display: 'flex', gap: 10, alignItems: 'flex-start',
            }}>
              <IconInfoCircle size={18} stroke={2} color="#C4553B" />
              <div>
                <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 700, color: '#A8442B', margin: 0 }}>
                  Conta Fixa criada automaticamente
                </p>
                <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#7A5C4F', margin: '3px 0 0', lineHeight: 1.5 }}>
                  Ao salvar, criamos uma Conta Fixa mensal com o valor da parcela. Quando você marcar como paga em "Contas Fixas", a dívida atualiza sozinha (parcelas pagas + saldo devedor).
                </p>
              </div>
            </div>
          )}

          {/* Nome + Instituição */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14 }}>
            <Field label="Nome">
              <input
                value={form.nome}
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Empréstimo BB"
                style={INPUT_STYLE}
              />
            </Field>
            <Field label="Instituição (opcional)">
              <input
                value={form.instituicao}
                onChange={e => setForm(f => ({ ...f, instituicao: e.target.value }))}
                placeholder="Ex: Banco do Brasil"
                style={INPUT_STYLE}
              />
            </Field>
          </div>

          {/* Tipo */}
          <Field label="Tipo de dívida">
            <div className="div-tipo-grid" style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8,
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
              @media (max-width: 540px) {
                .div-tipo-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
              }
            `}</style>
          </Field>

          {/* Valores principais */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14 }}>
            <Field label="Valor total da dívida (R$)">
              <input
                value={form.valorTotal}
                onChange={e => setForm(f => ({ ...f, valorTotal: e.target.value }))}
                placeholder="0,00" inputMode="decimal"
                style={INPUT_STYLE}
              />
            </Field>
            <Field label="Valor da parcela (R$)">
              <input
                value={form.valorParcela}
                onChange={e => setForm(f => ({ ...f, valorParcela: e.target.value }))}
                placeholder="0,00" inputMode="decimal"
                style={INPUT_STYLE}
              />
            </Field>
          </div>

          {/* Parcelas */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 14 }}>
            <Field label="Parcelas total">
              <input
                value={form.parcelasTotal}
                onChange={e => setForm(f => ({ ...f, parcelasTotal: e.target.value }))}
                placeholder="0" inputMode="numeric"
                style={INPUT_STYLE}
              />
            </Field>
            <Field label="Parcelas já pagas">
              <input
                value={form.parcelasPagas}
                onChange={e => setForm(f => ({ ...f, parcelasPagas: e.target.value }))}
                placeholder="0" inputMode="numeric"
                style={INPUT_STYLE}
              />
            </Field>
            <Field label="Juros anual (%)">
              <input
                value={form.jurosAnual}
                onChange={e => setForm(f => ({ ...f, jurosAnual: e.target.value }))}
                placeholder="18,5" inputMode="decimal"
                style={INPUT_STYLE}
              />
            </Field>
          </div>

          {/* Data início + Dia vencimento + Categoria */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 14 }}>
            <Field label="Data início">
              <input type="date"
                value={form.dataInicio}
                onChange={e => setForm(f => ({ ...f, dataInicio: e.target.value }))}
                style={INPUT_STYLE} />
            </Field>
            <Field label="Dia vencimento (1-31)">
              <input
                value={form.diaVencimento}
                onChange={e => setForm(f => ({ ...f, diaVencimento: e.target.value.replace(/[^\d]/g, '').slice(0, 2) }))}
                placeholder="10" inputMode="numeric"
                style={INPUT_STYLE}
              />
            </Field>
            <Field label="Categoria da Conta Fixa">
              <select
                value={form.categoriaId}
                onChange={e => setForm(f => ({ ...f, categoriaId: e.target.value }))}
                style={INPUT_STYLE}>
                <option value="">— Sem categoria —</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </Field>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 28px', borderTop: '1px solid #EDE6DC',
          display: 'flex', justifyContent: 'flex-end', gap: 10,
          position: 'sticky', bottom: 0, background: '#FFFFFF',
        }}>
          <button onClick={onClose} style={SECONDARY_BTN}>Cancelar</button>
          <button onClick={handleSave} style={PRIMARY_BTN}>
            <IconCheck size={16} stroke={2.5} />
            {isEditing ? 'Salvar alterações' : 'Adicionar dívida'}
          </button>
        </div>
      </motion.div>
    </motion.div>
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

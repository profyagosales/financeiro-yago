import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { IconX, IconCheck, IconRefresh, IconLock } from '@tabler/icons-react'
import type { Investimento, InvestimentoTipo, InvestimentoBenchmark, InvestimentoLiquidez } from '@/db/schema'
import { addInvestimento, editInvestimento } from '@/db/hooks/useInvestimentos'
import { useMetas } from '@/db/hooks/useMetas'
import { TIPOS, BENCHMARKS, LIQUIDEZ_OPTIONS, TIPO_META } from './constants'

interface Props {
  invest?: Investimento | null
  presetMetaId?: number
  onClose: () => void
}

export function InvestimentoForm({ invest, presetMetaId, onClose }: Props) {
  const metas = useMetas()
  const today = new Date().toISOString().split('T')[0]
  const isEditing = !!invest

  const [form, setForm] = useState({
    nome: invest?.nome ?? '',
    tipo: invest?.tipo ?? 'CDB' as InvestimentoTipo,
    instituicao: invest?.instituicao ?? '',
    valorAplicado: invest?.valorAplicado ? String(invest.valorAplicado) : '',
    valorAtual: invest?.valorAtual ? String(invest.valorAtual) : '',
    valorAtualSource: invest?.valorAtualSource ?? 'auto' as 'auto' | 'manual',
    rentabilidadeAnual: invest?.rentabilidadeAnual ? String(invest.rentabilidadeAnual * 100) : '',
    benchmark: invest?.benchmark ?? '' as InvestimentoBenchmark | '',
    liquidez: invest?.liquidez ?? '' as InvestimentoLiquidez | '',
    dataAplicacao: invest?.dataAplicacao ?? today,
    dataVencimento: invest?.dataVencimento ?? '',
    metaId: invest?.metaId !== undefined
      ? String(invest.metaId)
      : (presetMetaId !== undefined ? String(presetMetaId) : ''),
  })

  // Quando valor aplicado muda e ainda não tem valor atual setado, espelha
  useEffect(() => {
    if (!isEditing && form.valorAplicado && !form.valorAtual) {
      setForm(f => ({ ...f, valorAtual: f.valorAplicado }))
    }
  }, [form.valorAplicado])

  const tipoMeta = TIPO_META.get(form.tipo)

  const parseValor = (v: string) => parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0

  const handleSave = async () => {
    if (!form.nome || !form.valorAplicado) return
    const data = {
      nome: form.nome,
      tipo: form.tipo,
      instituicao: form.instituicao || undefined,
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
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 240, damping: 28 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: '#FFFFFF', borderRadius: 24,
          width: '100%', maxWidth: 620, maxHeight: '90vh',
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
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#9B7B6A', marginTop: 4 }}>
              {isEditing ? 'Atualize as informações do ativo' : 'Cadastre uma nova aplicação financeira'}
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

          {/* Nome */}
          <Field label="Nome">
            <input
              value={form.nome}
              onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              placeholder="Ex: CDB Inter Liquidez Diária"
              style={INPUT_STYLE}
            />
          </Field>

          {/* Tipo — seletor visual */}
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

          {/* Instituição + Valores */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Instituição (opcional)">
              <input
                value={form.instituicao}
                onChange={e => setForm(f => ({ ...f, instituicao: e.target.value }))}
                placeholder="Ex: Banco Inter, Binance"
                style={INPUT_STYLE}
              />
            </Field>
            <Field label="Valor aplicado (R$)">
              <input
                value={form.valorAplicado}
                onChange={e => setForm(f => ({ ...f, valorAplicado: e.target.value }))}
                placeholder="0,00" inputMode="decimal"
                style={INPUT_STYLE}
              />
            </Field>
          </div>

          {/* Valor atual + modo */}
          <Field label="Valor atual">
            <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
              <input
                value={form.valorAtual}
                onChange={e => setForm(f => ({
                  ...f, valorAtual: e.target.value,
                  // Editar manualmente força modo manual
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
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#9B7B6A', margin: '6px 0 0', lineHeight: 1.4 }}>
              {form.valorAtualSource === 'auto'
                ? 'O app aplica a rentabilidade anual proporcional ao mês automaticamente.'
                : 'Modo manual: o valor não é atualizado automaticamente — você ajusta quando quiser.'}
            </p>
          </Field>

          {/* Rentabilidade + Benchmark */}
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

          {/* Liquidez + Datas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <Field label="Liquidez">
              <select
                value={form.liquidez}
                onChange={e => setForm(f => ({ ...f, liquidez: e.target.value as InvestimentoLiquidez }))}
                style={INPUT_STYLE}>
                <option value="">— Não definida —</option>
                {LIQUIDEZ_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Data aplicação">
              <input type="date"
                value={form.dataAplicacao}
                onChange={e => setForm(f => ({ ...f, dataAplicacao: e.target.value }))}
                style={INPUT_STYLE} />
            </Field>
            <Field label="Vencimento (opc.)">
              <input type="date"
                value={form.dataVencimento}
                onChange={e => setForm(f => ({ ...f, dataVencimento: e.target.value }))}
                style={INPUT_STYLE} />
            </Field>
          </div>

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
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#9B7B6A', margin: '6px 0 0', lineHeight: 1.4 }}>
              Quando vinculado, este investimento conta como aporte para a meta escolhida.
            </p>
          </Field>
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

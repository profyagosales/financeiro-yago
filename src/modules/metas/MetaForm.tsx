import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { IconX, IconCheck, IconCalculator, IconLock } from '@tabler/icons-react'
import type { Meta, MetaTipo } from '@/db/schema'
import { addMeta, editMeta, calcularAlvoReserva, useMetas } from '@/db/hooks/useMetas'
import { fmt } from '@/lib/format'
import { META_TIPOS, META_ICONS, META_CORES, COBERTURA_OPTIONS, getMetaIcon } from './constants'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'

interface Props {
  meta?: Meta | null
  presetTipo?: MetaTipo
  onClose: () => void
}

export function MetaForm({ meta, presetTipo, onClose }: Props) {
  useBodyScrollLock(true)
  const metas = useMetas()
  const isEditing = !!meta

  const [form, setForm] = useState({
    nome: meta?.nome ?? '',
    tipo: meta?.tipo ?? presetTipo ?? 'compra' as MetaTipo,
    valorAlvo: meta?.valorAlvo ? String(meta.valorAlvo) : '',
    valorAtual: meta?.valorAtual !== undefined ? String(meta.valorAtual) : '0',
    prazo: meta?.prazo ?? '',
    cor: meta?.cor ?? '#C4553B',
    icone: meta?.icone ?? 'target',
    mesesCobertura: (meta?.mesesCobertura ?? 6) as 3 | 6 | 12,
    alvoAutoCalculado: meta?.alvoAutoCalculado ?? true,
  })

  const [calculoAlvo, setCalculoAlvo] = useState<number | null>(null)

  // Quando muda meses ou auto-toggle, recalcula o alvo da reserva
  useEffect(() => {
    if (form.tipo === 'reserva_emergencia' && form.alvoAutoCalculado) {
      calcularAlvoReserva(form.mesesCobertura).then(v => {
        setCalculoAlvo(v)
        setForm(f => ({ ...f, valorAlvo: String(v) }))
      })
    }
  }, [form.tipo, form.mesesCobertura, form.alvoAutoCalculado])

  // Bloqueia criação de uma segunda reserva
  const jaTemReserva = metas.some(m => m.tipo === 'reserva_emergencia' && m.id !== meta?.id)

  const parseValor = (v: string) => parseFloat(String(v).replace(/\./g, '').replace(',', '.')) || 0

  const handleSave = async () => {
    if (!form.nome || !form.valorAlvo) return
    const data = {
      nome: form.nome,
      tipo: form.tipo,
      valorAlvo: parseValor(form.valorAlvo),
      valorAtual: parseValor(form.valorAtual),
      prazo: form.prazo || undefined,
      cor: form.cor,
      icone: form.icone,
      mesesCobertura: form.tipo === 'reserva_emergencia' ? form.mesesCobertura : undefined,
      alvoAutoCalculado: form.tipo === 'reserva_emergencia' ? form.alvoAutoCalculado : undefined,
      ativo: true,
    }
    if (isEditing && meta?.id) {
      await editMeta(meta.id, data)
    } else {
      await addMeta(data)
    }
    onClose()
  }

  const tipoMeta = META_TIPOS.find(t => t.value === form.tipo)
  const isReserva = form.tipo === 'reserva_emergencia'

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
              {isEditing ? 'Editar meta' : 'Nova meta'}
            </h2>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#9B7B6A', marginTop: 4 }}>
              Defina um objetivo financeiro e acompanhe seu progresso
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

          {/* Tipo selector */}
          <Field label="Tipo de meta">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {META_TIPOS.map(t => {
                const Icon = t.Icon
                const active = form.tipo === t.value
                const blocked = t.value === 'reserva_emergencia' && jaTemReserva && !isEditing
                return (
                  <button key={t.value}
                    onClick={() => !blocked && setForm(f => ({ ...f, tipo: t.value, cor: t.cor }))}
                    disabled={blocked}
                    title={blocked ? 'Você já tem uma reserva de emergência cadastrada' : t.descricao}
                    style={{
                      background: active ? t.cor : '#FBF8F3',
                      border: `1.5px solid ${active ? t.cor : '#EDE6DC'}`,
                      borderRadius: 12, padding: '12px 14px',
                      cursor: blocked ? 'not-allowed' : 'pointer',
                      opacity: blocked ? 0.4 : 1,
                      display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
                      transition: 'all .15s',
                    }}>
                    <Icon size={20} stroke={1.8} color={active ? '#FFFFFF' : t.cor} />
                    <div style={{ minWidth: 0 }}>
                      <p style={{
                        fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700,
                        color: active ? '#FFFFFF' : '#2C1A0F', margin: 0,
                      }}>{t.label}</p>
                      <p style={{
                        fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 500,
                        color: active ? 'rgba(255,255,255,0.8)' : '#7A5C4F', margin: '2px 0 0',
                      }}>{t.descricao}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </Field>

          {/* Nome */}
          <Field label="Nome da meta">
            <input
              value={form.nome}
              onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              placeholder={isReserva ? 'Ex: Minha reserva' : 'Ex: Viagem ao Japão'}
              style={INPUT_STYLE}
            />
          </Field>

          {/* ── Reserva de Emergência: campos exclusivos ── */}
          {isReserva && (
            <Field label="Cobertura (meses de despesas)">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {COBERTURA_OPTIONS.map(opt => {
                  const active = form.mesesCobertura === opt.value
                  return (
                    <button key={opt.value}
                      onClick={() => setForm(f => ({ ...f, mesesCobertura: opt.value }))}
                      style={{
                        background: active ? '#3A8580' : '#FBF8F3',
                        border: `1.5px solid ${active ? '#3A8580' : '#EDE6DC'}`,
                        borderRadius: 12, padding: '10px 8px', cursor: 'pointer',
                        textAlign: 'center', transition: 'all .15s',
                      }}>
                      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 18, fontWeight: 700, color: active ? '#FFFFFF' : '#2C1A0F', margin: 0, letterSpacing: '-0.3px' }}>{opt.label}</p>
                      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 9, fontWeight: 600, color: active ? 'rgba(255,255,255,0.85)' : '#7A5C4F', margin: '2px 0 0', letterSpacing: '.04em', textTransform: 'uppercase' }}>{opt.descricao}</p>
                    </button>
                  )
                })}
              </div>
            </Field>
          )}

          {/* Valor alvo */}
          <Field label={isReserva ? 'Valor alvo' : 'Valor alvo (R$)'}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={form.valorAlvo}
                onChange={e => setForm(f => ({ ...f, valorAlvo: e.target.value, alvoAutoCalculado: false }))}
                placeholder="0,00" inputMode="decimal"
                disabled={isReserva && form.alvoAutoCalculado}
                style={{ ...INPUT_STYLE, flex: 1, opacity: (isReserva && form.alvoAutoCalculado) ? 0.65 : 1 }}
              />
              {isReserva && (
                <button
                  onClick={() => setForm(f => ({ ...f, alvoAutoCalculado: !f.alvoAutoCalculado }))}
                  style={{
                    background: form.alvoAutoCalculado ? '#3A8580' : '#F5F0E8',
                    border: `1.5px solid ${form.alvoAutoCalculado ? '#3A8580' : '#EDE6DC'}`,
                    borderRadius: 10, padding: '0 14px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                    fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 700,
                    color: form.alvoAutoCalculado ? '#FFFFFF' : '#7A5C4F',
                    letterSpacing: '.04em',
                  }}>
                  {form.alvoAutoCalculado
                    ? (<><IconCalculator size={13} stroke={2.2} />AUTO</>)
                    : (<><IconLock size={13} stroke={2.2} />MANUAL</>)}
                </button>
              )}
            </div>
            {isReserva && form.alvoAutoCalculado && (
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: '#7A5C4F', margin: '6px 0 0', lineHeight: 1.4 }}>
                Calculamos com base na média das suas despesas dos últimos 6 meses × {form.mesesCobertura} meses de cobertura.
                {calculoAlvo !== null && calculoAlvo > 0 && (
                  <> Alvo atual: <strong style={{ color: '#3A8580' }}>{fmt(calculoAlvo)}</strong>.</>
                )}
              </p>
            )}
          </Field>

          {/* Já tenho + Prazo */}
          {!isReserva && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Já tenho (aporte direto)">
                <input
                  value={form.valorAtual}
                  onChange={e => setForm(f => ({ ...f, valorAtual: e.target.value }))}
                  placeholder="0,00" inputMode="decimal"
                  style={INPUT_STYLE}
                />
              </Field>
              <Field label="Prazo (opcional)">
                <input
                  type="date"
                  value={form.prazo}
                  onChange={e => setForm(f => ({ ...f, prazo: e.target.value }))}
                  style={INPUT_STYLE}
                />
              </Field>
            </div>
          )}

          {/* Ícone — Tabler icons grid */}
          <Field label="Ícone">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 6 }}>
              {META_ICONS.map(({ key, Icon, label }) => {
                const active = form.icone === key
                return (
                  <button key={key} onClick={() => setForm(f => ({ ...f, icone: key }))}
                    title={label}
                    style={{
                      background: active ? form.cor : '#FBF8F3',
                      border: `1.5px solid ${active ? form.cor : '#EDE6DC'}`,
                      borderRadius: 10, width: '100%', aspectRatio: '1',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all .15s',
                    }}>
                    <Icon size={18} stroke={1.8} color={active ? '#FFFFFF' : '#7A5C4F'} />
                  </button>
                )
              })}
            </div>
          </Field>

          {/* Cor */}
          <Field label="Cor">
            <div style={{ display: 'flex', gap: 8 }}>
              {META_CORES.map(c => (
                <button key={c}
                  onClick={() => setForm(f => ({ ...f, cor: c }))}
                  style={{
                    width: 36, height: 36, borderRadius: '50%', background: c,
                    border: form.cor === c ? '3px solid #2C1A0F' : '2px solid transparent',
                    cursor: 'pointer', transition: 'all .15s',
                  }}/>
              ))}
            </div>
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
            {isEditing ? 'Salvar alterações' : 'Criar meta'}
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

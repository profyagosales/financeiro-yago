import { useState } from 'react'
import { motion } from 'framer-motion'
import { IconX, IconCheck, IconLink, IconNote } from '@tabler/icons-react'
import type { Desejo, DesejoPrioridade } from '@/db/schema'
import { addDesejo, editDesejo } from '@/db/hooks/useDesejos'
import { useCategorias } from '@/db/hooks/useCategorias'
import { PRIORIDADES } from './constants'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'

interface Props {
  desejo?: Desejo | null
  presetPrioridade?: DesejoPrioridade
  onClose: () => void
}

export function DesejoForm({ desejo, presetPrioridade, onClose }: Props) {
  useBodyScrollLock(true)
  const categorias = useCategorias('despesa')
  const today = new Date().toISOString().split('T')[0]
  const isEditing = !!desejo

  const [form, setForm] = useState({
    nome: desejo?.nome ?? '',
    descricao: desejo?.descricao ?? '',
    prioridade: desejo?.prioridade ?? presetPrioridade ?? 'media' as DesejoPrioridade,
    valorEstimado: desejo?.valorEstimado ? String(desejo.valorEstimado) : '',
    valorMenorEncontrado: desejo?.valorMenorEncontrado ? String(desejo.valorMenorEncontrado) : '',
    link: desejo?.link ?? '',
    observacoes: desejo?.observacoes ?? '',
    categoriaId: desejo?.categoriaId ? String(desejo.categoriaId) : '',
  })

  const parseValor = (v: string) => parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0

  const handleSave = async () => {
    if (!form.nome) return
    const data = {
      nome: form.nome,
      descricao: form.descricao || undefined,
      prioridade: form.prioridade,
      valorEstimado: form.valorEstimado ? parseValor(form.valorEstimado) : undefined,
      valorMenorEncontrado: form.valorMenorEncontrado ? parseValor(form.valorMenorEncontrado) : undefined,
      link: form.link || undefined,
      observacoes: form.observacoes || undefined,
      categoriaId: form.categoriaId ? parseInt(form.categoriaId) : undefined,
      status: 'aberto' as const,
      dataDesejo: desejo?.dataDesejo ?? today,
    }

    if (isEditing && desejo?.id) {
      await editDesejo(desejo.id, data)
    } else {
      await addDesejo(data)
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
              {isEditing ? 'Editar desejo' : 'Novo desejo'}
            </h2>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#9B7B6A', marginTop: 4 }}>
              Adicione algo que você quer ou precisa comprar
            </p>
          </div>
          <button onClick={onClose} style={CLOSE_BTN}>
            <IconX size={16} stroke={2} color="#7A5C4F" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Nome */}
          <Field label="O que você quer?">
            <input
              autoFocus
              value={form.nome}
              onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              placeholder="Ex: Ração do Milo, TV 52'', Protetor solar"
              style={INPUT_STYLE}
            />
          </Field>

          {/* Prioridade */}
          <Field label="Prioridade">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
              {PRIORIDADES.map(p => {
                const Icon = p.Icon
                const active = form.prioridade === p.value
                return (
                  <button key={p.value}
                    onClick={() => setForm(f => ({ ...f, prioridade: p.value }))}
                    title={p.descricao}
                    style={{
                      background: active ? p.cor : p.corLight,
                      border: `1.5px solid ${active ? p.cor : 'transparent'}`,
                      borderRadius: 10, padding: '10px 6px',
                      cursor: 'pointer', textAlign: 'center',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                      transition: 'all .15s',
                    }}>
                    <Icon size={16} stroke={1.8} color={active ? '#FFFFFF' : p.cor} />
                    <span style={{
                      fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 700,
                      color: active ? '#FFFFFF' : p.cor, letterSpacing: '.02em',
                    }}>{p.short}</span>
                  </button>
                )
              })}
            </div>
          </Field>

          {/* Valor estimado + menor encontrado */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Valor estimado (R$)">
              <input
                value={form.valorEstimado}
                onChange={e => setForm(f => ({ ...f, valorEstimado: e.target.value }))}
                placeholder="0,00" inputMode="decimal"
                style={INPUT_STYLE}
              />
            </Field>
            <Field label="Menor preço encontrado">
              <input
                value={form.valorMenorEncontrado}
                onChange={e => setForm(f => ({ ...f, valorMenorEncontrado: e.target.value }))}
                placeholder="0,00" inputMode="decimal"
                style={INPUT_STYLE}
              />
            </Field>
          </div>

          {/* Categoria */}
          <Field label="Categoria (ao comprar)">
            <select
              value={form.categoriaId}
              onChange={e => setForm(f => ({ ...f, categoriaId: e.target.value }))}
              style={INPUT_STYLE}>
              <option value="">— Sem categoria —</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </Field>

          {/* Link */}
          <Field label="Link do produto (opcional)">
            <div style={{ position: 'relative' }}>
              <IconLink size={14} stroke={2} color="#9B7B6A"
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}/>
              <input
                value={form.link}
                onChange={e => setForm(f => ({ ...f, link: e.target.value }))}
                placeholder="https://..."
                style={{ ...INPUT_STYLE, paddingLeft: 34 }}
              />
            </div>
          </Field>

          {/* Observações */}
          <Field label="Observações (opcional)">
            <div style={{ position: 'relative' }}>
              <IconNote size={14} stroke={2} color="#9B7B6A"
                style={{ position: 'absolute', left: 12, top: 14, pointerEvents: 'none' }}/>
              <textarea
                value={form.observacoes}
                onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                placeholder="Modelo, cor, onde encontrar mais barato..."
                rows={3}
                style={{ ...INPUT_STYLE, paddingLeft: 34, paddingTop: 12, resize: 'vertical', fontFamily: "'Plus Jakarta Sans',sans-serif" }}
              />
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
            {isEditing ? 'Salvar alterações' : 'Adicionar desejo'}
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

const CLOSE_BTN: React.CSSProperties = {
  background: '#F5F0E8', border: 'none', borderRadius: 10,
  width: 32, height: 32, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
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

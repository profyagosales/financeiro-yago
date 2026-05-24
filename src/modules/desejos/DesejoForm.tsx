import { useState } from 'react'
import { IconX, IconCheck, IconLink, IconNote, IconTrash, IconShoppingCart } from '@tabler/icons-react'
import type { Desejo, DesejoPrioridade } from '@/db/schema'
import { addDesejo, editDesejo } from '@/db/hooks/useDesejos'
import { useCategorias } from '@/db/hooks/useCategorias'
import { todayISO } from '@/lib/format'
import { showErrorToast, sounds } from '@/lib/sounds'
import { PRIORIDADES } from './constants'
import { LegacyModalShell } from '@/components/ui/LegacyModalShell'

interface Props {
  desejo?: Desejo | null
  presetPrioridade?: DesejoPrioridade
  onClose: () => void
  /** Quando definida + modo edit, exibe botão "Excluir" no rodapé.
   *  Desktop usa botão próprio no DesejoCard e não passa essa prop. */
  onDelete?: () => void
  /** Quando definida + modo edit + desejo aberto, exibe botão "Comprar" no rodapé.
   *  Desktop usa botão próprio no DesejoCard e não passa essa prop. */
  onComprar?: () => void
}

export function DesejoForm({ desejo, presetPrioridade, onClose, onDelete, onComprar }: Props) {
  // body scroll lock agora é responsabilidade do LegacyModalShell
  const categorias = useCategorias('despesa')
  const today = todayISO()
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
  const canSave = !!form.nome.trim()

  const handleSave = async () => {
    const nomeTrim = form.nome.trim()
    const descricaoTrim = form.descricao.trim()
    const linkTrim = form.link.trim()
    const observacoesTrim = form.observacoes.trim()
    if (!nomeTrim) return
    const data = {
      nome: nomeTrim,
      descricao: descricaoTrim || undefined,
      prioridade: form.prioridade,
      valorEstimado: form.valorEstimado ? parseValor(form.valorEstimado) : undefined,
      valorMenorEncontrado: form.valorMenorEncontrado ? parseValor(form.valorMenorEncontrado) : undefined,
      link: linkTrim || undefined,
      observacoes: observacoesTrim || undefined,
      categoriaId: form.categoriaId ? parseInt(form.categoriaId) : undefined,
      status: 'aberto' as const,
      dataDesejo: desejo?.dataDesejo ?? today,
    }

    try {
      if (isEditing && desejo?.id) {
        await editDesejo(desejo.id, data)
      } else {
        await addDesejo(data)
      }
      sounds.save()
      onClose()
    } catch (e) {
      console.error('[DesejoForm.handleSave]', e)
      showErrorToast(e instanceof Error ? e.message : 'Erro ao salvar desejo — tente de novo')
      sounds.error()
    }
  }

  return (
    <LegacyModalShell open onClose={onClose} maxWidth={620} zIndex={100}
      header={
        <div style={{
          padding: '18px 22px', borderBottom: '1px solid rgba(44,26,15,0.08)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{
              fontFamily: "'Fraunces',Georgia,serif", fontSize: 22, fontWeight: 700,
              color: '#2C1A0F', margin: 0, letterSpacing: '-0.5px',
            }}>{isEditing ? 'Editar desejo' : 'Novo desejo'}</h2>
            <p style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#7A5C4F', margin: '2px 0 0',
            }}>Adicione algo que você quer ou precisa comprar</p>
          </div>
          <button onClick={onClose} aria-label="Fechar" style={CLOSE_BTN}>
            <IconX size={16} stroke={2} color="#7A5C4F" />
          </button>
        </div>
      }
      footer={
        <div style={{
          padding: '14px 22px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          gap: 10, flexWrap: 'wrap',
        }}>
          {/* Lado esquerdo: ações secundárias (delete + comprar) só em modo edit */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {isEditing && onDelete && (
              <button onClick={onDelete} style={DANGER_GHOST_BTN}>
                <IconTrash size={15} stroke={2.2} /> Excluir
              </button>
            )}
            {isEditing && onComprar && desejo?.status === 'aberto' && (
              <button onClick={onComprar} style={SUCCESS_BTN}>
                <IconShoppingCart size={15} stroke={2.2} /> Comprei
              </button>
            )}
          </div>

          {/* Lado direito: ações primárias */}
          <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
            <button onClick={onClose} style={SECONDARY_BTN}>Cancelar</button>
            <button onClick={handleSave} disabled={!canSave}
              style={{ ...PRIMARY_BTN, opacity: canSave ? 1 : 0.5, cursor: canSave ? 'pointer' : 'not-allowed' }}>
              <IconCheck size={16} stroke={2.5} />
              {isEditing ? 'Salvar' : 'Adicionar'}
            </button>
          </div>
        </div>
      }
    >
        {/* Body */}
        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>

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

const CLOSE_BTN: React.CSSProperties = {
  background: '#F5F0E8', border: 'none', borderRadius: 10,
  width: 32, height: 32, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const PRIMARY_BTN: React.CSSProperties = {
  background: 'linear-gradient(135deg, #F1642E, #C4553B)',
  color: '#FFFFFF', border: 'none', borderRadius: 12,
  padding: '11px 20px', cursor: 'pointer',
  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700,
  display: 'flex', alignItems: 'center', gap: 7,
  boxShadow: '0 8px 22px rgba(196,85,59,0.42)',
}

const SECONDARY_BTN: React.CSSProperties = {
  background: 'transparent', color: '#7A5C4F', border: '1.5px solid #EDE6DC',
  borderRadius: 12, padding: '11px 18px', cursor: 'pointer',
  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700,
}

const DANGER_GHOST_BTN: React.CSSProperties = {
  background: 'rgba(196,85,59,0.08)', color: '#C4553B',
  border: '1.5px solid rgba(196,85,59,0.25)', borderRadius: 12,
  padding: '11px 14px', cursor: 'pointer',
  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700,
  display: 'inline-flex', alignItems: 'center', gap: 6,
}

const SUCCESS_BTN: React.CSSProperties = {
  background: 'linear-gradient(135deg, #3A8580, #2C7470)', color: '#FFFFFF',
  border: 'none', borderRadius: 12,
  padding: '11px 16px', cursor: 'pointer',
  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700,
  display: 'inline-flex', alignItems: 'center', gap: 7,
  boxShadow: '0 4px 16px rgba(58,133,128,0.35)',
}

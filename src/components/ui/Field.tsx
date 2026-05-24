// ─── Field ──────────────────────────────────────────────────────────
// Wrapper de form field com label semântico + htmlFor automático (A11Y).
//
// Cumpre WCAG 4.1.2 (Name, Role, Value): toda input precisa de label
// programaticamente associado. Hoje muitos forms usam <span> visual
// como "FieldLabel" — sem associação programática, screen reader anuncia
// "edit text, blank" sem dizer o que é o campo.
//
// Uso:
//   <Field label="Email" helper="A gente nunca envia spam">
//     <input type="email" ... />
//   </Field>
//
// Como funciona:
//   - useId() gera um id estável (SSR-safe)
//   - Clona o único child injetando id={generatedId}
//   - <label htmlFor={id}> aponta pro mesmo id
//   - aria-describedby liga helper text e error pro input
//
// Migração: forms existentes podem ser migrados gradualmente trocando
// `<FieldLabel>` local por este `<Field>`. O child precisa ser um único
// input/select/textarea que ACEITA `id` como prop.

import { cloneElement, isValidElement, useId, type ReactElement } from 'react'

interface Props {
  label: string
  /** Texto auxiliar abaixo do input (dica, formato esperado) */
  helper?: string
  /** Mensagem de erro (sobrepõe helper visualmente, dispara aria-invalid) */
  error?: string
  /** Marca campo como obrigatório (asterisco visual + aria-required) */
  required?: boolean
  /** Estilo no label */
  labelStyle?: React.CSSProperties
  /** Estilo no container do Field */
  style?: React.CSSProperties
  /** Único filho — input/select/textarea */
  children: ReactElement<{ id?: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean | 'true' | 'false'; 'aria-required'?: boolean | 'true' | 'false' }>
}

const DEFAULT_LABEL_STYLE: React.CSSProperties = {
  fontFamily: "'Plus Jakarta Sans',sans-serif",
  fontSize: 10,
  fontWeight: 700,
  color: '#7A5C4F',
  letterSpacing: '.1em',
  textTransform: 'uppercase',
  display: 'block',
  marginBottom: 6,
}

export function Field({ label, helper, error, required, labelStyle, style, children }: Props) {
  const id = useId()
  const helperId = helper || error ? `${id}-helper` : undefined

  // Clona o único child injetando id + aria-* pros screen readers
  const enhancedChild = isValidElement(children)
    ? cloneElement(children, {
        id,
        'aria-describedby': helperId,
        ...(error ? { 'aria-invalid': 'true' as const } : {}),
        ...(required ? { 'aria-required': 'true' as const } : {}),
      })
    : children

  return (
    <div style={style}>
      <label htmlFor={id} style={{ ...DEFAULT_LABEL_STYLE, ...labelStyle }}>
        {label}
        {required && <span aria-hidden style={{ color: '#C4553B', marginLeft: 4 }}>*</span>}
      </label>
      {enhancedChild}
      {(helper || error) && (
        <p id={helperId}
          role={error ? 'alert' : undefined}
          style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 11,
            color: error ? '#A8442B' : '#7A5C4F',
            margin: '6px 0 0',
            lineHeight: 1.4,
          }}>
          {error || helper}
        </p>
      )}
    </div>
  )
}

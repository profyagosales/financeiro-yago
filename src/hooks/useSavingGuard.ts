// ─── useSavingGuard ────────────────────────────────────────────────
// Hook utilitário pra evitar double-submit em forms async.
//
// Forma idiomática evita boilerplate por form (try/finally + setSaving):
//
//   const { saving, runSaving } = useSavingGuard()
//   const handleSave = () => runSaving(async () => {
//     // ... save logic — qualquer throw cai no catch automaticamente
//   })
//   <button disabled={!canSave || saving}>Salvar</button>
//
// O runSaving:
//   - retorna early se já saving (single in-flight enforced)
//   - seta saving true, executa fn, no finally seta false
//   - re-throws errors pra caller poder catch se quiser

import { useCallback, useRef, useState } from 'react'

export function useSavingGuard(): {
  saving: boolean
  /** Executa fn com guard. Se já estiver salvando, ignora e retorna. */
  runSaving: <T>(fn: () => Promise<T>) => Promise<T | undefined>
} {
  const [saving, setSaving] = useState(false)
  // Ref espelho pra checar mesmo se setState ainda não rerenderizou
  const savingRef = useRef(false)

  const runSaving = useCallback(async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
    if (savingRef.current) return undefined
    savingRef.current = true
    setSaving(true)
    try {
      return await fn()
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }, [])

  return { saving, runSaving }
}

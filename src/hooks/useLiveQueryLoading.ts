// ─── useLiveQueryLoading ───────────────────────────────────────────
// Wrapper sobre `useLiveQuery` que DISTINGUE loading de empty.
//
// Problema: `useLiveQuery(() => q) ?? []` colapsa undefined (loading)
// e [] (empty) num único valor. Resultado: lista pisca "vazia" durante
// o primeiro fetch, depois pula pra preenchida — péssimo perceived perf.
//
// Solução: este hook retorna `{ data, loading }`. Loading=true só na
// primeiríssima resolução; após qualquer resultado (mesmo []), vira false.
// Reativo a deps via `deps` igual ao useLiveQuery.
//
// Uso:
//   const { data: txs, loading } = useLiveQueryLoading(
//     () => db.transacoes.where('contaId').equals(id).toArray(),
//     [id],
//   )
//   if (loading) return <SkeletonRows count={5} />
//   if (txs.length === 0) return <EmptyState ... />
//   return <List items={txs} />

import { useLiveQuery } from 'dexie-react-hooks'
import { useRef } from 'react'

export function useLiveQueryLoading<T>(
  query: () => Promise<T> | T,
  deps: unknown[] = [],
  initialValue?: T,
): { data: T; loading: boolean } {
  const result = useLiveQuery(query, deps, initialValue)
  // Uma vez que tenha resolvido (mesmo array vazio), nunca mais "loading=true"
  // pra essas deps específicas. Ref armazena o estado entre renders sem
  // dispara re-render (perfeito pra esse caso).
  const everResolved = useRef(false)
  if (result !== undefined) everResolved.current = true
  return {
    data: (result ?? initialValue ?? ([] as unknown as T)),
    loading: !everResolved.current && result === undefined,
  }
}

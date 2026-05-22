import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../schema'

export function useCategorias(tipo?: 'receita' | 'despesa') {
  return useLiveQuery(
    async () => {
      const cats = tipo
        ? await db.categorias.where('tipo').equals(tipo).toArray()
        : await db.categorias.toArray()
      return cats.sort((a, b) => a.ordem - b.ordem)
    },
    [tipo]
  ) ?? []
}

import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../schema'

export function useCategorias(tipo?: 'receita' | 'despesa') {
  return useLiveQuery(
    () => tipo ? db.categorias.where('tipo').equals(tipo).sortBy('ordem') : db.categorias.orderBy('ordem').toArray(),
    [tipo]
  ) ?? []
}

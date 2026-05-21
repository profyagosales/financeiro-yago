import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../schema'

export function useAnexos(transacaoId: number) {
  return useLiveQuery(() => db.anexos.where('transacaoId').equals(transacaoId).toArray(), [transacaoId]) ?? []
}

export async function addAnexo(transacaoId: number, file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      const dados = e.target?.result as string
      await db.anexos.add({
        transacaoId, tipo: file.type, nomeArquivo: file.name,
        dados, tamanho: file.size, criadoEm: new Date().toISOString(),
      })
      resolve()
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export async function deleteAnexo(id: number) {
  return db.anexos.delete(id)
}

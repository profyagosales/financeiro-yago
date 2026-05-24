// ─── useAnexos: hooks + helpers de anexos ───────────────────────────
// Cada anexo tem:
//   - storagePath (sincronizado via sync engine)
//   - dados (base64 local, cache; NÃO sincroniza — vide config.skipFields)
// No device atual, dados está populado pra preview instantâneo.
// Em outro device pós-pull, dados vem vazio → resolvemos via signed URL.

import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { db, type Anexo } from '../schema'
import { uploadAnexo, getAnexoUrl, deleteAnexoFromStorage } from '@/lib/storage'

export function useAnexos(transacaoId: number) {
  return useLiveQuery(() => db.anexos.where('transacaoId').equals(transacaoId).toArray(), [transacaoId]) ?? []
}

// Adiciona anexo: upload pro Storage primeiro. Se sucesso, NÃO duplica
// o blob localmente — guarda só metadata. Se Storage falhar (offline),
// fallback pra base64 local que sincroniza depois via SyncEngine quando
// a conexão voltar.
//
// Antes guardava base64 SEMPRE + storagePath = duplicidade 2x (memória
// no IndexedDB + blob no Storage). Arquivo de 5MB ocupava 10MB total.
export async function addAnexo(transacaoId: number, file: File): Promise<void> {
  const storagePath = await uploadAnexo(file).catch(() => null)

  // Storage falhou (offline / sem credencial): cacheia base64 localmente
  // pra não perder o arquivo. Próximo sync sobe pro Storage.
  if (!storagePath) {
    const dados = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = e => resolve(e.target?.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
    await db.anexos.add({
      transacaoId,
      tipo: file.type,
      nomeArquivo: file.name,
      dados,
      tamanho: file.size,
      criadoEm: new Date().toISOString(),
      updatedAt: Date.now(),
    })
    return
  }

  // Path feliz: só metadata, blob fica no Storage. useAnexoSrc resolve
  // signed URL on-demand.
  await db.anexos.add({
    transacaoId,
    tipo: file.type,
    nomeArquivo: file.name,
    storagePath,
    tamanho: file.size,
    criadoEm: new Date().toISOString(),
    updatedAt: Date.now(),
  })
}

export async function deleteAnexo(id: number) {
  const anexo = await db.anexos.get(id)
  if (anexo?.storagePath) {
    void deleteAnexoFromStorage(anexo.storagePath)
  }
  return db.anexos.delete(id)
}

// Resolve a URL exibível: usa `dados` (data URL base64) se existir,
// senão busca signed URL do Storage. Retorna null se nenhum disponível.
export function useAnexoSrc(anexo: Anexo): string | null {
  // src remoto (signed URL do Storage) — só vai pra state se precisar fetch async
  const [remoteSrc, setRemoteSrc] = useState<string | null>(null)

  // Derived state: reseta remoteSrc se o anexo mudar (sem setState no effect)
  const [prevKey, setPrevKey] = useState<string>(`${anexo.dados ?? ''}|${anexo.storagePath ?? ''}`)
  const currentKey = `${anexo.dados ?? ''}|${anexo.storagePath ?? ''}`
  if (prevKey !== currentKey) {
    setPrevKey(currentKey)
    setRemoteSrc(null)
  }

  useEffect(() => {
    // Só faz fetch async quando NÃO tem dados embed e tem storagePath
    if (anexo.dados || !anexo.storagePath) return
    let alive = true
    void getAnexoUrl(anexo.storagePath).then(url => {
      if (alive) setRemoteSrc(url)
    })
    return () => { alive = false }
  }, [anexo.dados, anexo.storagePath])

  // Derived: prioriza dados embed; senão usa o resolvido async
  return anexo.dados ?? remoteSrc
}

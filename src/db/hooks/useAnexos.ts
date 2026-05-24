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

// Adiciona anexo: upload pro Storage + salva no Dexie (dados base64 + storagePath)
export async function addAnexo(transacaoId: number, file: File): Promise<void> {
  // 1. Upload pro Storage (assíncrono, mas rápido)
  const storagePath = await uploadAnexo(file)

  // 2. Lê base64 pra cache local
  const dados = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target?.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  // 3. Persiste no Dexie
  await db.anexos.add({
    transacaoId,
    tipo: file.type,
    nomeArquivo: file.name,
    dados,
    storagePath: storagePath ?? undefined,
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
  const [src, setSrc] = useState<string | null>(anexo.dados ?? null)

  useEffect(() => {
    let alive = true
    if (anexo.dados) {
      setSrc(anexo.dados)
      return
    }
    if (anexo.storagePath) {
      void getAnexoUrl(anexo.storagePath).then(url => {
        if (alive) setSrc(url)
      })
    } else {
      setSrc(null)
    }
    return () => { alive = false }
  }, [anexo.dados, anexo.storagePath])

  return src
}

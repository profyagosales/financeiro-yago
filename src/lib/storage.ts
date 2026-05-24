// ─── Supabase Storage: bucket 'anexos' (privado) ────────────────────
// Path = {userId}/{uuid}.{ext}
// URL = signed URL (expira em 1h) — busca on-demand pra <img> / <iframe>

import { supabase, getUserId } from '@/lib/supabase'

const BUCKET = 'anexos'
const SIGNED_TTL = 60 * 60   // 1 hora

// Cache em memória: storagePath → { url, expiresAt }
const urlCache = new Map<string, { url: string; expiresAt: number }>()

function extFromName(name: string, mime: string): string {
  const fromName = name.includes('.') ? name.split('.').pop() : ''
  if (fromName) return fromName
  // Fallback pelo MIME
  if (mime.startsWith('image/')) return mime.split('/')[1] ?? 'bin'
  if (mime === 'application/pdf') return 'pdf'
  return 'bin'
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// Faz upload de um File pro bucket. Retorna o path (relativo ao bucket).
export async function uploadAnexo(file: File): Promise<string | null> {
  const userId = await getUserId()
  if (!userId) return null
  const ext = extFromName(file.name, file.type)
  const path = `${userId}/${randomId()}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || 'application/octet-stream',
  })
  if (error) {
    console.warn('[storage upload]', error.message)
    return null
  }
  return path
}

// Faz upload de um data-URL (base64). Usado quando anexo já estava local.
export async function uploadAnexoDataUrl(dataUrl: string, fileName: string, mime: string): Promise<string | null> {
  const blob = await (await fetch(dataUrl)).blob()
  const file = new File([blob], fileName, { type: mime })
  return uploadAnexo(file)
}

// Pega signed URL (com cache). Retorna null se path inválido.
export async function getAnexoUrl(storagePath: string): Promise<string | null> {
  const cached = urlCache.get(storagePath)
  if (cached && cached.expiresAt > Date.now() + 30_000) return cached.url

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_TTL)
  if (error || !data) {
    console.warn('[storage signed url]', error?.message)
    return null
  }
  urlCache.set(storagePath, {
    url: data.signedUrl,
    expiresAt: Date.now() + SIGNED_TTL * 1000,
  })
  return data.signedUrl
}

// Baixa um arquivo do Storage e retorna Blob (pra download).
export async function downloadAnexo(storagePath: string): Promise<Blob | null> {
  const { data, error } = await supabase.storage.from(BUCKET).download(storagePath)
  if (error || !data) {
    console.warn('[storage download]', error?.message)
    return null
  }
  return data
}

// Apaga arquivo do Storage.
export async function deleteAnexoFromStorage(storagePath: string): Promise<boolean> {
  const { error } = await supabase.storage.from(BUCKET).remove([storagePath])
  if (error) {
    console.warn('[storage delete]', error.message)
    return false
  }
  urlCache.delete(storagePath)
  return true
}

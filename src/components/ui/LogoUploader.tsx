import { useState, useRef, useCallback } from 'react'
import { IconUpload, IconTrash, IconClipboard, IconLoader2 } from '@tabler/icons-react'
import { BankLogo } from './BankLogo'

// ─── LogoUploader ─────────────────────────────────────────────────────
//
// Componente para upload de logo de banco/conta com:
//  - Drag & drop
//  - Click to upload
//  - Paste do clipboard (Ctrl+V)
//  - Preview imediato
//  - Validação de tamanho (max ~500KB recomendado)
//  - Compressão automática (resize pra 256x256 max)
//  - Fallback: mostra BankLogo com iniciais quando vazio
//
// R12j: refatorado pra ser ROBUSTO em PWA Safari standalone:
// - createImageBitmap() em vez de new Image() (suporta HEIC do iPhone,
//   PNG, JPG, WebP de forma uniforme — sem onload/onerror que falham
//   silenciosamente em Safari)
// - try/catch em CADA step com setError() visível
// - Loading state durante processamento (era invisível antes — user
//   selecionava foto e "nada acontecia")
// - Console.log em cada step pra debug

interface LogoUploaderProps {
  logo?: string                          // base64 atual
  nome: string                           // pra fallback de iniciais
  cor: string                            // pra fallback de gradient
  onChange: (logo: string | undefined) => void
}

const MAX_DIM = 256        // resize máximo
const MAX_BYTES = 500_000  // alerta acima disso

export function LogoUploader({ logo, nome, cor, onChange }: LogoUploaderProps) {
  const [dragOver, setDragOver] = useState(false)
  const [pasteHover, setPasteHover] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const processFile = useCallback(async (file: File) => {
    console.log('[LogoUploader] processFile started:', file.name, file.type, file.size)
    setError(null)
    setProcessing(true)
    try {
      // Aceita "image/*" + HEIC (mime varia: image/heic, image/heif)
      const isImage = file.type.startsWith('image/')
                   || /\.(heic|heif|jpe?g|png|webp|gif|svg)$/i.test(file.name)
      if (!isImage) {
        setError('Apenas imagens são aceitas')
        return
      }
      if (file.size === 0) {
        setError('Arquivo vazio')
        return
      }
      if (file.size > 15_000_000) {
        setError('Imagem muito grande (>15MB)')
        return
      }

      // Decode + resize via createImageBitmap (suporta HEIC em Safari moderno)
      let bitmap: ImageBitmap | null = null
      try {
        bitmap = await createImageBitmap(file)
        console.log('[LogoUploader] bitmap created:', bitmap.width, 'x', bitmap.height)
      } catch (bitmapErr) {
        console.warn('[LogoUploader] createImageBitmap falhou, tentando fallback img tag:', bitmapErr)
        // Fallback: FileReader + Image() pra browsers velhos
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = e => resolve(e.target?.result as string)
          reader.onerror = () => reject(new Error('FileReader falhou'))
          reader.readAsDataURL(file)
        })
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const i = new Image()
          i.onload = () => resolve(i)
          i.onerror = () => reject(new Error('Image decode falhou — formato pode não ser suportado (HEIC?)'))
          // Timeout: 8s pra decode
          setTimeout(() => reject(new Error('Timeout no decode da imagem')), 8000)
          i.src = dataUrl
        })
        // cast pra ter mesma interface: { width, height } + drawable
        bitmap = img as unknown as ImageBitmap
      }

      const srcW = bitmap.width
      const srcH = bitmap.height
      if (!srcW || !srcH) {
        setError('Imagem inválida (dimensões zero)')
        return
      }

      const ratio = Math.min(1, MAX_DIM / Math.max(srcW, srcH))
      const w = Math.round(srcW * ratio)
      const h = Math.round(srcH * ratio)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        setError('Canvas não disponível no navegador')
        return
      }
      ctx.drawImage(bitmap as CanvasImageSource, 0, 0, w, h)
      console.log('[LogoUploader] redimensionada pra', w, 'x', h)

      // Tenta PNG primeiro, JPEG se grande demais
      let out = canvas.toDataURL('image/png', 0.9)
      if (out.length > MAX_BYTES * 1.5) {
        out = canvas.toDataURL('image/jpeg', 0.85)
        console.log('[LogoUploader] PNG grande, usando JPEG:', out.length, 'bytes')
      } else {
        console.log('[LogoUploader] PNG:', out.length, 'bytes')
      }

      if (!out || out === 'data:,') {
        setError('Falha ao gerar imagem final')
        return
      }

      onChange(out)
      console.log('[LogoUploader] ✓ logo salva com sucesso')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('[LogoUploader] erro processando arquivo:', e)
      setError(`Erro: ${msg}`)
    } finally {
      setProcessing(false)
    }
  }, [onChange])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    setPasteHover(false)
    const items = e.clipboardData?.items
    if (!items) return
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) processFile(file)
        return
      }
    }
  }

  return (
    <div>
      <div
        tabIndex={0}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onPaste={handlePaste}
        onFocus={() => setPasteHover(true)}
        onBlur={() => setPasteHover(false)}
        onClick={() => inputRef.current?.click()}
        style={{
          background: dragOver ? '#FBEEEA' : '#FBF8F3',
          border: `2px dashed ${dragOver ? '#C4553B' : pasteHover ? '#3A8580' : '#D4C8BC'}`,
          borderRadius: 14, padding: '16px 14px',
          cursor: 'pointer', outline: 'none',
          display: 'flex', alignItems: 'center', gap: 14,
          transition: 'all .15s',
        }}
      >
        <BankLogo logo={logo} nome={nome || 'NA'} cor={cor} size={56} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700,
            color: '#2C1A0F', margin: 0,
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            {processing ? (
              <IconLoader2 size={14} stroke={2} color="#7A5C4F" style={{ animation: 'fy-spin 1s linear infinite' }} />
            ) : (
              <IconUpload size={14} stroke={2} color="#7A5C4F" />
            )}
            {processing ? 'Processando…' : logo ? 'Trocar logo' : 'Adicionar logo do banco'}
            <style>{`@keyframes fy-spin{to{transform:rotate(360deg)}}`}</style>
          </p>
          <p style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 500,
            color: '#7A5C4F', margin: '4px 0 0', lineHeight: 1.4,
          }}>
            Arraste, clique pra escolher ou cole (Ctrl+V) uma imagem.
            {!logo && ' Sem logo? Usamos as iniciais com a cor escolhida.'}
          </p>
        </div>

        {logo && (
          <button
            onClick={e => { e.stopPropagation(); onChange(undefined) }}
            title="Remover logo"
            style={{
              background: '#FAEAEA', border: 'none', borderRadius: 10,
              width: 34, height: 34, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
            <IconTrash size={14} stroke={2} color="#C4553B" />
          </button>
        )}

        <input ref={inputRef} type="file" accept="image/*"
          onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = '' }}
          style={{ display: 'none' }}/>
      </div>

      {pasteHover && (
        <p style={{
          fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, fontWeight: 600,
          color: '#3A8580', margin: '6px 0 0',
          display: 'inline-flex', alignItems: 'center', gap: 4,
        }}>
          <IconClipboard size={11} stroke={2} /> Pronto para colar (Ctrl+V)
        </p>
      )}

      {error && (
        <p style={{
          fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, fontWeight: 600,
          color: '#C4553B', margin: '6px 0 0',
        }}>{error}</p>
      )}
    </div>
  )
}

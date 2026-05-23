import { useState, useRef, useCallback } from 'react'
import { IconUpload, IconTrash, IconClipboard } from '@tabler/icons-react'
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
  const inputRef = useRef<HTMLInputElement | null>(null)

  const processFile = useCallback(async (file: File) => {
    setError(null)
    if (!file.type.startsWith('image/')) {
      setError('Apenas imagens são aceitas')
      return
    }
    // Lê o arquivo
    const reader = new FileReader()
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string
      // Resize via canvas pra reduzir tamanho
      const img = new Image()
      img.onload = () => {
        const ratio = Math.min(1, MAX_DIM / Math.max(img.width, img.height))
        const w = Math.round(img.width * ratio)
        const h = Math.round(img.height * ratio)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) { onChange(dataUrl); return }
        ctx.drawImage(img, 0, 0, w, h)
        const out = canvas.toDataURL('image/png', 0.9)
        if (out.length > MAX_BYTES * 1.5) {
          // try jpeg
          const jpg = canvas.toDataURL('image/jpeg', 0.85)
          onChange(jpg)
        } else {
          onChange(out)
        }
      }
      img.onerror = () => onChange(dataUrl)
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
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
            <IconUpload size={14} stroke={2} color="#7A5C4F" />
            {logo ? 'Trocar logo' : 'Adicionar logo do banco'}
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

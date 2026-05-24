import { useState, useEffect } from 'react'

// Tipo oficial do BeforeInstallPromptEvent (não está nos lib.dom.d.ts)
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function usePWAInstall() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  useEffect(() => {
    const h = (e: Event) => { e.preventDefault(); setPrompt(e as BeforeInstallPromptEvent) }
    window.addEventListener('beforeinstallprompt', h)
    window.addEventListener('appinstalled', () => setInstalled(true))
    return () => window.removeEventListener('beforeinstallprompt', h)
  }, [])
  const install = async () => {
    if (!prompt) return
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setPrompt(null)
  }
  return { canInstall: !!prompt && !installed, install }
}

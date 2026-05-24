// ─── IOSInstallBanner ──────────────────────────────────────────────
// iOS Safari (mesmo a partir de 16.4) NÃO dispara `beforeinstallprompt`,
// então `usePWAInstall().canInstall` retorna false e o PWABanner padrão
// nunca aparece. Usuários iOS ficam sem saber que podem instalar.
//
// Este banner detecta iOS Safari standalone-NOT-instalado e mostra
// instruções visuais: "Compartilhar (ícone) → Adicionar à Tela de Início".
//
// Visível apenas em:
//   - iOS Safari (não Chrome iOS, não Firefox iOS — Apple bloqueia push lá)
//   - NÃO instalado como PWA (display-mode != standalone)
//   - Usuário não dismissou nos últimos 7 dias
//   - Fora de /configuracoes (já tem seção própria lá)

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import { IconShare3, IconX, IconSquarePlus } from '@tabler/icons-react'
import { detectarPlataforma } from '@/lib/notifications'

const STORAGE_KEY = 'fy-ios-install-banner-dismissed-at'
const REAPPEAR_AFTER_MS = 7 * 24 * 60 * 60 * 1000

function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false
  // iOS Safari específico (navigator.standalone)
  const nav = window.navigator as Navigator & { standalone?: boolean }
  if (nav.standalone === true) return true
  // Padrão (Chromium, etc)
  return window.matchMedia?.('(display-mode: standalone)').matches ?? false
}

function isDismissed(): boolean {
  try {
    const ts = localStorage.getItem(STORAGE_KEY)
    if (!ts) return false
    const t = parseInt(ts, 10)
    if (isNaN(t)) return false
    return Date.now() - t < REAPPEAR_AFTER_MS
  } catch { return false }
}

export function IOSInstallBanner() {
  const location = useLocation()
  // Lazy init — sem effects, sem flash
  const [dismissed, setDismissed] = useState(() => isDismissed())

  const plataforma = typeof window !== 'undefined' ? detectarPlataforma() : 'desconhecida'
  const standalone = isStandalonePWA()
  const ehConfiguracoes = location.pathname === '/configuracoes'

  const visivel = plataforma === 'ios-safari' && !standalone && !dismissed && !ehConfiguracoes

  const handleDismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, String(Date.now())) } catch { /* noop */ }
    setDismissed(true)
  }

  return (
    <AnimatePresence>
      {visivel && (
        <motion.div
          initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          role="region" aria-label="Instruções pra instalar como app"
          style={{
            position: 'fixed', bottom: 90, left: 16, right: 16,
            zIndex: 180, maxWidth: 420, marginLeft: 'auto', marginRight: 'auto',
            background: 'linear-gradient(135deg, #2C1A0F 0%, #1A0F09 100%)',
            borderRadius: 16,
            padding: '14px 16px',
            display: 'flex', alignItems: 'flex-start', gap: 12,
            boxShadow: '0 12px 32px rgba(28,10,5,0.5)',
          }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(196,85,59,0.25)', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <IconShare3 size={18} stroke={2} color="#FFFFFF" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 13, fontWeight: 700, color: '#FAF6F0', margin: 0,
            }}>
              Instale na tela inicial
            </p>
            <p style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 11.5, color: '#D4B5A3', margin: '4px 0 0', lineHeight: 1.4,
            }}>
              Toque em{' '}
              <IconShare3 size={12} stroke={2.4} style={{ display: 'inline', verticalAlign: '-2px', color: '#7AC4FF' }} />
              {' '}<strong style={{ color: '#FFFFFF' }}>Compartilhar</strong> e depois{' '}
              <IconSquarePlus size={12} stroke={2.4} style={{ display: 'inline', verticalAlign: '-2px' }} />
              {' '}<strong style={{ color: '#FFFFFF' }}>Adicionar à Tela de Início</strong>.
            </p>
          </div>
          <button onClick={handleDismiss}
            title="Fechar (volta em 7 dias)"
            aria-label="Fechar banner de instalação"
            style={{
              background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8,
              // 40x40 atende WCAG touch target mínimo
              width: 40, height: 40, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, color: '#7A5C4F',
            }}>
            <IconX size={16} stroke={2} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

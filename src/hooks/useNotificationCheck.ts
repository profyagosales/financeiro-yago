import { useEffect } from 'react'
import { useAppPreferences } from '@/db/hooks/useAppConfig'
import { verificarPendencias, getPermissaoEstado } from '@/lib/notifications'

// ─── Verifica pendências ao abrir o app + a cada 1h ──────────────────
// Só roda se permissão concedida. Dispara notificações locais e atualiza
// o badge do ícone do PWA.
//
// Usa as preferências do user pra decidir o que verificar.

export function useNotificationCheck() {
  const prefs = useAppPreferences()

  useEffect(() => {
    if (getPermissaoEstado() !== 'granted') return

    const checar = () => {
      verificarPendencias({
        contasFixasVencendo: prefs.notifContasFixas !== false,
        faturasFechando: prefs.notifFaturas !== false,
        orcamentoEstourado: prefs.notifOrcamento !== false,
        metaAtingida: prefs.notifMeta !== false,
      })
    }

    // Roda 5s após o boot (espera o IndexedDB hidratar)
    const boot = setTimeout(checar, 5000)
    // E depois a cada 1h enquanto o app estiver aberto
    const interval = setInterval(checar, 60 * 60 * 1000)

    // Quando o app volta a ficar visível (PWA reabriu, tab voltou pro foco),
    // verifica de novo (pode ter passado horas/dias)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') checar()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      clearTimeout(boot)
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [prefs.notifContasFixas, prefs.notifFaturas, prefs.notifOrcamento, prefs.notifMeta])
}

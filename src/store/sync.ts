// ─── Sync store (Zustand) ───────────────────────────────────────────
// Estado consumido pelo SyncIndicator e por outras telas que querem
// mostrar "última sincronização" ou desabilitar ações enquanto sincroniza.

import { create } from 'zustand'
import type { SyncStatus } from '@/lib/sync/types'

interface SyncStoreState {
  status: SyncStatus
  lastSyncAt: number | null
  pendingPush: number
  errorMessage: string | null

  setStatus: (s: SyncStatus) => void
  setLastSyncAt: (t: number) => void
  setPendingPush: (n: number) => void
  setError: (msg: string | null) => void
  reset: () => void
}

export const useSyncStore = create<SyncStoreState>(set => ({
  status: 'idle',
  lastSyncAt: null,
  pendingPush: 0,
  errorMessage: null,

  setStatus: s => set({ status: s }),
  setLastSyncAt: t => set({ lastSyncAt: t }),
  setPendingPush: n => set({ pendingPush: n }),
  setError: msg => set({ errorMessage: msg, status: msg ? 'error' : 'idle' }),
  reset: () => set({ status: 'idle', lastSyncAt: null, pendingPush: 0, errorMessage: null }),
}))

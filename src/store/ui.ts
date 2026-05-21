import { create } from 'zustand'

interface UIStore {
  fabOpen: boolean
  fabDefaultContaId: number | null
  openFab: (contaId?: number) => void
  closeFab: () => void
}

export const useUIStore = create<UIStore>(set => ({
  fabOpen: false,
  fabDefaultContaId: null,
  openFab: (contaId) => set({ fabOpen: true, fabDefaultContaId: contaId ?? null }),
  closeFab: () => set({ fabOpen: false, fabDefaultContaId: null }),
}))

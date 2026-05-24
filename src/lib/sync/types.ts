// ─── Sync engine — tipos compartilhados ─────────────────────────────

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline'

export interface SyncState {
  status: SyncStatus
  lastSyncAt: number | null
  pendingPush: number      // contagem de registros aguardando push
  errorMessage: string | null
}

// Dirty record marcado pra enviar (debounced)
export interface DirtyEntry {
  tableName: string
  localId: number
  operation: 'upsert' | 'delete'
  enqueuedAt: number
}

// Resultado de uma sync iteration
export interface SyncResult {
  pushed: number
  pulled: number
  errors: string[]
}

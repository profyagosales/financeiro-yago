// ─── Sync engine: orquestrador push + pull + realtime ──────────────
// Lifecycle:
//   1. initSyncEngine() — chamado uma vez no boot, após auth + PIN ok
//   2. Carrega mappings do IndexedDB
//   3. Pull inicial (full=false se já tem lastPull, full=true se primeira vez)
//   4. Push inicial (envia dirty)
//   5. Subscribe a realtime
//   6. Setup interval (30s) pra pull periódico
//   7. Dexie hooks chamam triggerSync() (debounced) em qualquer write local
//
// online/offline: ouve window events, marca status offline e não dispara
// requests quando offline.

import { loadMappingsFromDB } from './mapping'
import { pushAll } from './push'
import { pullAll } from './pull'
import { subscribeRealtime, unsubscribeRealtime } from './realtime'
import { useSyncStore } from '@/store/sync'
import { supabase } from '@/lib/supabase'
import { db } from '@/db/schema'

let initialized = false
let pullInterval: ReturnType<typeof setInterval> | null = null
let pushDebounce: ReturnType<typeof setTimeout> | null = null
let pullDebounce: ReturnType<typeof setTimeout> | null = null
let syncInFlight = false
// Bug histórico: se triggerPush() era chamado durante pull em andamento,
// o syncInFlight=true fazia retorno imediato → push perdido. Agora setamos
// pendingPush=true e re-rodamos um ciclo skipPull após o pull terminar.
let pendingPush = false
// Cap defensivo: se algo entra em loop (push gera dirty que dispara push de
// novo), abre janela de breathing de 5s antes de re-tentar. Sem isso, bug
// não-tratado vira spinning infinito.
let consecutiveCycles = 0
const MAX_CYCLES_BEFORE_BACKOFF = 3

// SINALIZAÇÃO PRO setupSyncHooks: durante pull, hooks de updating recebem
// writes que vêm do remoto (não são writes locais). Esses NÃO devem
// disparar triggerPush — senão pull do device A → write em B → push de B
// → pull em A vira loop perpétuo entre 2 devices.
//
// Esta flag é setada pelo pull antes de chamar dexie.update() e zerada no
// finally. O hook updating em setupSyncHooks lê esta flag.
let _pullingFlag = false
export function isPulling(): boolean { return _pullingFlag }
export function setPulling(v: boolean) { _pullingFlag = v }

const PUSH_DEBOUNCE_MS = 800       // após write local, espera 800ms antes de push
const PULL_DEBOUNCE_MS = 300       // realtime → debounce curto
const PULL_INTERVAL_MS = 30_000    // pull periódico de fallback

function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}

function setStatus(status: 'idle' | 'syncing' | 'error' | 'offline', error?: string) {
  const store = useSyncStore.getState()
  if (error) {
    store.setError(error)
  } else {
    store.setStatus(status)
    if (status === 'idle') store.setError(null)
  }
}

// Executa um ciclo completo push → pull. Marca status, evita reentrância.
async function syncCycle(opts: { full?: boolean; skipPush?: boolean; skipPull?: boolean } = {}) {
  if (syncInFlight) {
    // Se um cycle de push está pedindo enquanto outro roda, marca pra rodar depois
    if (!opts.skipPush) pendingPush = true
    return
  }
  if (!isOnline()) {
    setStatus('offline')
    consecutiveCycles = 0  // R10 fix: reset cap counter em early-return
    return
  }

  // Precisa de session ativa
  const { data } = await supabase.auth.getSession()
  if (!data.session) {
    consecutiveCycles = 0  // R10 fix
    return
  }

  syncInFlight = true
  setStatus('syncing')
  try {
    if (!opts.skipPush) {
      const pushRes = await pushAll()
      if (pushRes.errors > 0) {
        console.warn('[sync] push errors:', pushRes.errors)
      }
    }
    if (!opts.skipPull) {
      const pullRes = await pullAll({ full: opts.full })
      if (pullRes.errors > 0) {
        console.warn('[sync] pull errors:', pullRes.errors)
      }
    }
    useSyncStore.getState().setLastSyncAt(Date.now())
    setStatus('idle')
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.warn('[sync] cycle error:', msg)
    setStatus('error', msg)
  } finally {
    syncInFlight = false
    // Cap pra evitar spinning: depois de 3 ciclos consecutivos drena com pausa
    if (pendingPush) {
      pendingPush = false
      consecutiveCycles += 1
      if (consecutiveCycles >= MAX_CYCLES_BEFORE_BACKOFF) {
        console.warn('[sync] 3+ ciclos consecutivos — backoff 5s')
        consecutiveCycles = 0
        setTimeout(() => { void syncCycle({ skipPull: true }) }, 5000)
      } else {
        void syncCycle({ skipPull: true })
      }
    } else {
      consecutiveCycles = 0
    }
  }
}

// Trigger debounced push (chamado pelos Dexie hooks após write local)
export function triggerPush() {
  if (pushDebounce) clearTimeout(pushDebounce)
  pushDebounce = setTimeout(() => { void syncCycle({ skipPull: true }) }, PUSH_DEBOUNCE_MS)
}

// Trigger debounced pull (chamado pelo realtime listener)
export function triggerPull() {
  if (pullDebounce) clearTimeout(pullDebounce)
  pullDebounce = setTimeout(() => { void syncCycle({ skipPush: true }) }, PULL_DEBOUNCE_MS)
}

// Force full sync (ex: botão "Sincronizar agora")
export async function syncNow(opts: { full?: boolean } = {}) {
  await syncCycle(opts)
}

export async function initSyncEngine() {
  if (initialized) return
  initialized = true

  try {
    // 1. Carrega mappings persistidos
    await loadMappingsFromDB()

    // 2. Detecta primeira vez (se nenhum mapping existe) → full pull
    const mappingsCount = await db.syncMappings.count()
    const isFirstSync = mappingsCount === 0

    // 3. Ciclo inicial
    await syncCycle({ full: isFirstSync })

    // 4. Subscribe realtime
    await subscribeRealtime(() => triggerPull())

    // 5. Pull periódico (fallback caso realtime caia)
    if (pullInterval) clearInterval(pullInterval)
    pullInterval = setInterval(() => {
      if (isOnline()) void syncCycle({ skipPush: true })
    }, PULL_INTERVAL_MS)

    // 6. Reage a online/offline
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        setStatus('idle')
        void syncCycle()
      })
      window.addEventListener('offline', () => setStatus('offline'))
    }
  } catch (e) {
    console.warn('[sync init] error:', e)
    setStatus('error', e instanceof Error ? e.message : String(e))
  }
}

export async function shutdownSyncEngine() {
  if (!initialized) return
  initialized = false
  if (pullInterval) { clearInterval(pullInterval); pullInterval = null }
  if (pushDebounce) { clearTimeout(pushDebounce); pushDebounce = null }
  if (pullDebounce) { clearTimeout(pullDebounce); pullDebounce = null }
  await unsubscribeRealtime()
  useSyncStore.getState().reset()
}

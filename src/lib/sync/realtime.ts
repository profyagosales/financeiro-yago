// ─── Realtime: subscribe a mudanças remotas via WebSocket ───────────
// Quando outro device altera dados, recebemos um evento aqui e
// disparamos pull pra trazer pro local imediatamente.

import { supabase, getUserId } from '@/lib/supabase'
import { TABLES } from './config'
import type { RealtimeChannel } from '@supabase/supabase-js'

let channel: RealtimeChannel | null = null
let onChangeCallback: (() => void) | null = null

// Subscribe a INSERT/UPDATE/DELETE de TODAS as tabelas remotas filtradas
// por user_id. Quando algo muda, chama o callback (geralmente trigger pull).
export async function subscribeRealtime(onChange: () => void) {
  const userId = await getUserId()
  if (!userId) return

  // Já tem canal? Reusa
  if (channel) {
    onChangeCallback = onChange
    return
  }

  onChangeCallback = onChange
  channel = supabase.channel(`sync:${userId}`)

  for (const tableName of Object.keys(TABLES)) {
    const config = TABLES[tableName]
    channel.on(
      'postgres_changes' as never,
      {
        event: '*',
        schema: 'public',
        table: config.remoteTable,
        filter: `user_id=eq.${userId}`,
      },
      () => {
        // Não conseguimos confiar 100% no payload (FKs vêm como uuid e
        // precisariam de remap). Mais simples: dispara pull incremental.
        onChangeCallback?.()
      },
    )
  }

  channel.subscribe(status => {
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      console.warn('[sync realtime]', status)
    }
  })
}

export async function unsubscribeRealtime() {
  if (channel) {
    await supabase.removeChannel(channel)
    channel = null
    onChangeCallback = null
  }
}

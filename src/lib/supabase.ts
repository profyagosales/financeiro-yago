// ─── Cliente Supabase ────────────────────────────────────────────────
// Singleton do cliente Supabase usado em todo o app.
//
// Configuração (em ordem de prioridade):
//   1. Variáveis de ambiente (.env.local):
//      VITE_SUPABASE_URL       — https://abcde.supabase.co
//      VITE_SUPABASE_ANON_KEY  — anon/public key (segura pra expor no client)
//   2. Fallback hardcoded abaixo (projeto existente do app)
//
// O cliente é configurado pra:
//   - persistir sessão no localStorage (auto-renova token)
//   - detectar sessão entre tabs
//   - realtime habilitado pra subscriptions
//   - PKCE flow (mais seguro pra SPA)

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Projeto Supabase (anon key — segura pra expor)
const FALLBACK_URL = 'https://ynidumrinncdqdukvpfa.supabase.co'
const FALLBACK_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InluaWR1bXJpbm5jZHFkdWt2cGZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMDc3NTksImV4cCI6MjA5NDg4Mzc1OX0.hiCG7BARS5Gw5aoVWS8oMpi6nJcjbdTvlW0_ga116uM'

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || FALLBACK_URL
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || FALLBACK_ANON

export const supabaseEnabled = !!SUPABASE_URL && !!SUPABASE_ANON_KEY

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storageKey: 'fy-supabase-auth',
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
  global: {
    headers: { 'x-app': 'financeiro-yago' },
  },
})

// ─── Helpers ──────────────────────────────────────────────────────────
export async function getUser() {
  const { data } = await supabase.auth.getUser()
  return data.user
}

export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}

export async function getUserId(): Promise<string | null> {
  const session = await getSession()
  return session?.user?.id ?? null
}

// ─── Convenção de nomes nas tabelas ──────────────────────────────────
//
// Cada tabela tem:
//   id              uuid PRIMARY KEY (gerado client-side via crypto.randomUUID)
//   user_id         uuid REFERENCES auth.users (preenchido por trigger)
//   local_id        integer (id do IndexedDB pra mapear)
//   updated_at      timestamptz (LWW conflict resolution)
//   deleted         boolean DEFAULT false (soft delete pra sync)
//   ... colunas específicas da entidade
//
// RLS policies:
//   SELECT/INSERT/UPDATE/DELETE WHERE user_id = auth.uid()

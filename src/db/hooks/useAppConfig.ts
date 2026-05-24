import { useLiveQuery } from 'dexie-react-hooks'
import { db, type TaxasBenchmark, TAXAS_BENCHMARK_DEFAULT } from '../schema'

const KEY_TAXAS = 'taxas_benchmark'
const KEY_BRAPI = 'brapi_token'
const KEY_PROFILE = 'user_profile'
const KEY_PREFS = 'app_preferences'

// ─── Taxas de benchmark (CDI, Selic, IPCA) ───────────────────────────
// Persistidas no IndexedDB. Usadas para cálculo de rendimento de
// renda fixa pós-fixada (% do CDI/Selic) e híbrida (IPCA+X%).
//
// Como o app é offline-first e não consulta APIs externas, o usuário
// é responsável por manter essas taxas atualizadas em Configurações.

export function useTaxasBenchmark(): TaxasBenchmark {
  const row = useLiveQuery(() => db.appConfig.where('key').equals(KEY_TAXAS).first(), [])
  if (row?.value) return row.value as TaxasBenchmark
  return TAXAS_BENCHMARK_DEFAULT
}

export async function getTaxasBenchmark(): Promise<TaxasBenchmark> {
  const row = await db.appConfig.where('key').equals(KEY_TAXAS).first()
  if (row?.value) return row.value as TaxasBenchmark
  return TAXAS_BENCHMARK_DEFAULT
}

export async function setTaxasBenchmark(taxas: Partial<TaxasBenchmark>) {
  const atual = await getTaxasBenchmark()
  const novo: TaxasBenchmark = { ...atual, ...taxas, atualizadoEm: Date.now() }
  const existing = await db.appConfig.where('key').equals(KEY_TAXAS).first()
  if (existing?.id) {
    await db.appConfig.update(existing.id, { value: novo, updatedAt: Date.now() })
  } else {
    await db.appConfig.add({ key: KEY_TAXAS, value: novo, updatedAt: Date.now() })
  }
  return novo
}

// ─── Token do Brapi (cotações B3) ────────────────────────────────────
// Brapi exige autenticação no plano free desde 2024.
// User pega o token gratuito em https://brapi.dev (1000 req/dia).

export function useBrapiToken(): string {
  const row = useLiveQuery(() => db.appConfig.where('key').equals(KEY_BRAPI).first(), [])
  return (row?.value as string) ?? ''
}

export async function getBrapiToken(): Promise<string> {
  const row = await db.appConfig.where('key').equals(KEY_BRAPI).first()
  return (row?.value as string) ?? ''
}

export async function setBrapiToken(token: string) {
  const existing = await db.appConfig.where('key').equals(KEY_BRAPI).first()
  const value = token.trim()
  if (existing?.id) {
    await db.appConfig.update(existing.id, { value, updatedAt: Date.now() })
  } else {
    await db.appConfig.add({ key: KEY_BRAPI, value, updatedAt: Date.now() })
  }
}

// ─── Perfil financeiro (renda + meta de economia + identidade) ───────
// Nota: "taxa de economia" é o savings rate = % da renda não consumida no mês.
// NÃO confundir com Caderneta de Poupança — esse % pode ir pra qualquer
// investimento (CDB, Tesouro, ações, reserva, etc).
export interface UserProfile {
  displayName?: string              // Como prefere ser chamado
  rendaMensal?: number              // R$ líquida
  metaEconomiaPct?: number          // 0.20 = 20%
  /** @deprecated nome antigo — use metaEconomiaPct. Mantido só pra ler dados legados. */
  metaPoupancaPct?: number
}

// Hook helper: retorna nome pra saudação. Sem fallback automático
// pro email (era confuso quando email não bate com nome real).
export function useDisplayName(): string {
  const profile = useUserProfile()
  return profile.displayName?.trim() ?? ''
}

export function useUserProfile(): UserProfile {
  const row = useLiveQuery(() => db.appConfig.where('key').equals(KEY_PROFILE).first(), [])
  const profile = (row?.value as UserProfile) ?? {}
  // Backwards compat: dados antigos têm metaPoupancaPct. Expõe sempre via metaEconomiaPct.
  return {
    ...profile,
    metaEconomiaPct: profile.metaEconomiaPct ?? profile.metaPoupancaPct,
  }
}

export async function setUserProfile(profile: Partial<UserProfile>) {
  const existing = await db.appConfig.where('key').equals(KEY_PROFILE).first()
  const atual = (existing?.value as UserProfile) ?? {}
  const value: UserProfile = { ...atual, ...profile }
  if (existing?.id) {
    await db.appConfig.update(existing.id, { value, updatedAt: Date.now() })
  } else {
    await db.appConfig.add({ key: KEY_PROFILE, value, updatedAt: Date.now() })
  }
}

// ─── Preferências do app ─────────────────────────────────────────────
export interface AppPreferences {
  autoLockMin?: number              // 0 = nunca, 1/5/15/30 = minutos
  soundEnabled?: boolean            // default true
  reducedMotion?: boolean           // default false
  // ── Notificações locais (verificação no app, sem servidor) ─────
  notifContasFixas?: boolean
  notifFaturas?: boolean
  notifOrcamento?: boolean
  notifMeta?: boolean
  // ── Push em background (Edge Function via cron) ───────────────
  // Cada toggle controla um tipo de push enviado pelo servidor.
  // Tudo default true — user só desliga explicitamente.
  pushMorningBrief?: boolean       // 08:00 BRT — contas vencendo + saldo
  pushDailyPulse?: boolean         // 13:00 BRT seg-sex — gasto vs orçamento diário
  pushEveningRecap?: boolean       // 20:00 BRT — recap do dia
  pushWeeklyRecap?: boolean        // Domingo 19:00 BRT — resumo semanal
  pushMonthlyRecap?: boolean       // Dia 1 09:00 BRT — fechamento mensal
  pushAlertsCheck?: boolean        // A cada 3h — alertas inteligentes
}

export const PREFS_DEFAULT: AppPreferences = {
  autoLockMin: 0,
  soundEnabled: true,
  reducedMotion: false,
  notifContasFixas: true,
  notifFaturas: true,
  notifOrcamento: true,
  notifMeta: true,
  pushMorningBrief: true,
  pushDailyPulse: true,
  pushEveningRecap: true,
  pushWeeklyRecap: true,
  pushMonthlyRecap: true,
  pushAlertsCheck: true,
}

export function useAppPreferences(): AppPreferences {
  const row = useLiveQuery(() => db.appConfig.where('key').equals(KEY_PREFS).first(), [])
  return { ...PREFS_DEFAULT, ...((row?.value as AppPreferences) ?? {}) }
}

export async function setAppPreferences(prefs: Partial<AppPreferences>) {
  const existing = await db.appConfig.where('key').equals(KEY_PREFS).first()
  const atual = (existing?.value as AppPreferences) ?? PREFS_DEFAULT
  const value: AppPreferences = { ...atual, ...prefs }
  if (existing?.id) {
    await db.appConfig.update(existing.id, { value, updatedAt: Date.now() })
  } else {
    await db.appConfig.add({ key: KEY_PREFS, value, updatedAt: Date.now() })
  }
  // Bridge: o módulo legacy lib/sounds.ts lê fy-sound em localStorage.
  // Espelha aqui pra que toggles na config sejam respeitados imediatamente.
  if (prefs.soundEnabled !== undefined) {
    try { localStorage.setItem('fy-sound', prefs.soundEnabled ? 'on' : 'off') } catch { /* noop */ }
  }
}

// ─── Cálculo da taxa efetiva anual de um investimento ─────────────────
// Recebe campos do Investimento + taxas atuais → retorna taxa anual decimal.
export function calcTaxaEfetiva(
  inv: {
    tipoRendimento?: import('../schema').TipoRendimento
    rentabilidadeAnual?: number
    percentualIndexador?: number
    taxaAdicional?: number
  },
  taxas: TaxasBenchmark,
): number {
  switch (inv.tipoRendimento) {
    case 'pos_cdi':
      return (inv.percentualIndexador ?? 1) * taxas.cdi
    case 'pos_selic':
      return (inv.percentualIndexador ?? 1) * taxas.selic
    case 'ipca_mais':
      // IPCA + X% (composto): (1+IPCA)(1+X) - 1
      return (1 + taxas.ipca) * (1 + (inv.taxaAdicional ?? 0)) - 1
    case 'prefixado_ipca':
      return taxas.ipca
    case 'prefixado':
    default:
      return inv.rentabilidadeAnual ?? 0
  }
}

// Descrição textual da taxa (pra exibir no card)
export function descreverRendimento(
  inv: {
    tipoRendimento?: import('../schema').TipoRendimento
    rentabilidadeAnual?: number
    percentualIndexador?: number
    taxaAdicional?: number
  },
): string | null {
  switch (inv.tipoRendimento) {
    case 'pos_cdi':
      return inv.percentualIndexador ? `${(inv.percentualIndexador * 100).toFixed(0)}% CDI` : null
    case 'pos_selic':
      return inv.percentualIndexador ? `${(inv.percentualIndexador * 100).toFixed(0)}% Selic` : null
    case 'ipca_mais':
      return inv.taxaAdicional ? `IPCA + ${(inv.taxaAdicional * 100).toFixed(2)}%` : 'IPCA+'
    case 'prefixado_ipca':
      return 'IPCA'
    case 'prefixado':
      return inv.rentabilidadeAnual ? `${(inv.rentabilidadeAnual * 100).toFixed(2)}% a.a. fixo` : null
    default:
      return inv.rentabilidadeAnual ? `${(inv.rentabilidadeAnual * 100).toFixed(2)}% a.a.` : null
  }
}

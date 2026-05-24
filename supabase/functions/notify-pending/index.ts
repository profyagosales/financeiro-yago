// ─── Edge Function: notify-pending (multi-kind dispatcher) ──────────
// Autenticação em DUAS dimensões (verify_jwt: false porque queremos
// aceitar tanto o cron via x-cron-secret quanto o user via JWT):
//
//   1. Cron jobs (pg_cron / chamadas server-to-server): exigem
//      x-cron-secret válido (env CRON_SECRET).
//   2. test-push do client logado: exige Authorization Bearer com JWT
//      do user. Valida via sb.auth.getUser(jwt). SÓ envia push pra
//      esse user (não pra todos).
//
// CORS restringido pra origem oficial.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'
import webpush from 'npm:web-push@3.6.7'

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY      = Deno.env.get('SUPABASE_ANON_KEY')!
const VAPID_PUBLIC  = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:vinicius.yago@gmail.com'
const PUBLIC_URL    = Deno.env.get('PUBLIC_APP_URL') ?? 'https://financeiro-yago.vercel.app'

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)
const sbAdmin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

const ALLOWED_ORIGINS = [
  'https://financeiro-yago.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
]
function corsHeaders(origin: string | null): Record<string, string> {
  const ok = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': ok,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  }
}
function jsonResp(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...corsHeaders(origin) },
  })
}

interface PushSub { id: string; user_id: string; endpoint: string; p256dh: string; auth: string }
interface PushPrefs {
  push_morning_brief?: boolean
  push_daily_pulse?: boolean
  push_evening_recap?: boolean
  push_weekly_recap?: boolean
  push_monthly_recap?: boolean
  push_alerts_check?: boolean
}
interface Payload {
  title: string
  body: string
  url?: string
  tag?: string
  image?: string
  badge?: string
  icon?: string
  actions?: Array<{ action: string; title: string }>
  actionsUrls?: Record<string, string>
  requireInteraction?: boolean
  vibrate?: number[]
}

function fmt(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}
function fmtFull(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function delta(cur: number, prev: number): number {
  if (prev === 0) return cur === 0 ? 0 : 100
  return ((cur - prev) / Math.abs(prev)) * 100
}
function brtNow(): Date {
  const d = new Date()
  d.setHours(d.getHours() - 3)
  return d
}
function pad2(n: number) { return String(n).padStart(2, '0') }
function isoDate(d: Date) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` }
function startOfMonth(d: Date) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-01` }
function endOfMonth(d: Date) {
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  return `${last.getFullYear()}-${pad2(last.getMonth() + 1)}-${pad2(last.getDate())}`
}

async function sendPush(sub: PushSub, payload: Payload): Promise<boolean> {
  payload.icon = payload.icon ?? `${PUBLIC_URL}/notification-icon.png`
  payload.badge = payload.badge ?? `${PUBLIC_URL}/brand/notification-badge.svg`
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
    )
    return true
  } catch (e) {
    const err = e as { statusCode?: number; body?: string; message?: string }
    console.warn('[push fail]', err.statusCode, err.body ?? err.message)
    if (err.statusCode === 404 || err.statusCode === 410) {
      await sbAdmin.from('push_subscriptions').delete().eq('id', sub.id)
    }
    return false
  }
}

async function getUserPrefs(userId: string): Promise<PushPrefs> {
  const { data } = await sbAdmin.from('app_config')
    .select('value').eq('user_id', userId).eq('key', 'app_preferences').maybeSingle()
  return (data?.value ?? {}) as PushPrefs
}
function shouldSend(prefs: PushPrefs, kind: string): boolean {
  const k = `push_${kind.replace(/-/g, '_')}` as keyof PushPrefs
  return prefs[k] !== false
}

async function contasFixasVencendo(userId: string, baseDate: Date, daysAhead = 3) {
  const { data: fixas } = await sbAdmin.from('contas_fixas')
    .select('id, nome, valor, dia_vencimento, ativo')
    .eq('user_id', userId).eq('ativo', true).eq('deleted', false)
  if (!fixas) return []
  const mes = baseDate.getMonth() + 1
  const ano = baseDate.getFullYear()
  const dia = baseDate.getDate()
  const { data: pags } = await sbAdmin.from('pagamentos_fixos')
    .select('conta_fixa_id, status')
    .eq('user_id', userId).eq('mes', mes).eq('ano', ano).eq('deleted', false)
  const pagas = new Set((pags ?? []).filter(p => p.status === 'pago').map(p => p.conta_fixa_id))
  const out: Array<{ cf: { id: string; nome: string; valor: number; dia_vencimento: number }; dias: number }> = []
  for (const cf of fixas) {
    if (pagas.has(cf.id)) continue
    const diasAteVencer = cf.dia_vencimento - dia
    if (diasAteVencer >= 0 && diasAteVencer <= daysAhead) out.push({ cf, dias: diasAteVencer })
  }
  return out
}

async function sumPeriod(userId: string, start: string, end: string) {
  const { data } = await sbAdmin.from('transacoes')
    .select('tipo, valor, transfer_id')
    .eq('user_id', userId).eq('deleted', false)
    .gte('data', start).lte('data', end)
  if (!data) return { receitas: 0, despesas: 0, count: 0, saldo: 0 }
  let receitas = 0, despesas = 0
  for (const t of data) {
    if (t.transfer_id) continue
    if (t.tipo === 'receita') receitas += t.valor
    else if (t.tipo === 'despesa') despesas += t.valor
  }
  return { receitas, despesas, count: data.length, saldo: receitas - despesas }
}

async function topCategoria(userId: string, start: string, end: string) {
  const { data: txs } = await sbAdmin.from('transacoes')
    .select('categoria_id, valor, transfer_id')
    .eq('user_id', userId).eq('deleted', false).eq('tipo', 'despesa')
    .gte('data', start).lte('data', end)
  if (!txs || txs.length === 0) return null
  const totals = new Map<string, number>()
  txs.forEach(t => { if (!t.transfer_id) totals.set(t.categoria_id, (totals.get(t.categoria_id) ?? 0) + t.valor) })
  const sorted = Array.from(totals.entries()).sort((a, b) => b[1] - a[1])
  if (sorted.length === 0) return null
  const [catId, valor] = sorted[0]
  const { data: cat } = await sbAdmin.from('categorias').select('nome').eq('id', catId).maybeSingle()
  return { nome: cat?.nome ?? 'Categoria', valor }
}

async function saldoEmContas(userId: string): Promise<number> {
  const { data } = await sbAdmin.from('contas')
    .select('saldo_atual').eq('user_id', userId).eq('ativo', true).eq('deleted', false)
  return (data ?? []).reduce((s, c) => s + c.saldo_atual, 0)
}

async function handleMorningBrief(userId: string): Promise<Payload[]> {
  const base = brtNow()
  const aVencer = await contasFixasVencendo(userId, base, 3)
  const saldoContas = await saldoEmContas(userId)
  const totalAVencer = aVencer.reduce((s, x) => s + x.cf.valor, 0)
  if (aVencer.length === 0 && saldoContas > 0) {
    return [{ title: 'Bom dia! Tudo em dia', body: `Nenhuma conta a vencer nos próximos 3 dias. Saldo: ${fmt(saldoContas)}`, tag: 'morning-brief', url: `${PUBLIC_URL}/` }]
  }
  if (aVencer.length === 0) return []
  const hoje = aVencer.filter(x => x.dias === 0)
  const proximos = aVencer.filter(x => x.dias > 0)
  let title = 'Bom dia, financeiro do dia'
  let body = ''
  if (hoje.length > 0) {
    title = `${hoje.length} ${hoje.length === 1 ? 'conta vence HOJE' : 'contas vencem HOJE'}`
    body = hoje.length === 1 ? `${hoje[0].cf.nome} — ${fmtFull(hoje[0].cf.valor)}` : `Total hoje: ${fmt(hoje.reduce((s, x) => s + x.cf.valor, 0))}`
    if (proximos.length > 0) body += `\n+ ${proximos.length} ${proximos.length === 1 ? 'em até 3 dias' : 'nos próximos 3 dias'}`
  } else {
    body = `${aVencer.length} ${aVencer.length === 1 ? 'conta' : 'contas'} totalizando ${fmt(totalAVencer)} nos próximos 3 dias`
  }
  return [{ title, body, tag: 'morning-brief', url: `${PUBLIC_URL}/contas-fixas`, actions: [{ action: 'view', title: 'Ver detalhes' }], actionsUrls: { view: `${PUBLIC_URL}/contas-fixas` }, requireInteraction: hoje.length > 0 }]
}

async function handleDailyPulse(userId: string): Promise<Payload[]> {
  const base = brtNow()
  const hojeIso = isoDate(base)
  const mes = base.getMonth() + 1
  const ano = base.getFullYear()
  const diaMes = base.getDate()
  const diasMes = new Date(ano, mes, 0).getDate()
  const hoje = await sumPeriod(userId, hojeIso, hojeIso)
  const mesAtual = await sumPeriod(userId, startOfMonth(base), endOfMonth(base))
  const m3StartDt = new Date(ano, mes - 4, 1)
  const m3EndDt = new Date(ano, mes - 1, 0)
  const m3 = await sumPeriod(userId, isoDate(m3StartDt), isoDate(m3EndDt))
  const receitaEsperada = mesAtual.receitas > 0 ? mesAtual.receitas : m3.receitas / 3
  if (receitaEsperada === 0) return []
  const diasRest = Math.max(1, diasMes - diaMes + 1)
  const orcamentoDiario = Math.max(0, (receitaEsperada - mesAtual.despesas) / diasRest)
  if (hoje.despesas === 0 && orcamentoDiario > 0) {
    return [{ title: 'Pulse do dia', body: `Você pode gastar até ${fmt(orcamentoDiario)} hoje sem comprometer o mês`, tag: 'daily-pulse', url: `${PUBLIC_URL}/` }]
  }
  const ratio = orcamentoDiario > 0 ? hoje.despesas / orcamentoDiario : 1
  const title = ratio >= 1.2 ? 'Atenção: gasto acima do diário' : 'Pulse do dia'
  const restanteHoje = Math.max(0, orcamentoDiario - hoje.despesas)
  const body = `Gastou ${fmt(hoje.despesas)} hoje · ${restanteHoje > 0 ? `pode gastar +${fmt(restanteHoje)}` : `${fmt(hoje.despesas - orcamentoDiario)} acima do diário`}`
  return [{ title, body, tag: 'daily-pulse', url: `${PUBLIC_URL}/relatorios` }]
}

async function handleEveningRecap(userId: string): Promise<Payload[]> {
  const base = brtNow()
  const hojeIso = isoDate(base)
  const ontemDt = new Date(base.getTime() - 86400_000)
  const ontemIso = isoDate(ontemDt)
  const hoje = await sumPeriod(userId, hojeIso, hojeIso)
  const ontem = await sumPeriod(userId, ontemIso, ontemIso)
  const topCat = await topCategoria(userId, hojeIso, hojeIso)
  if (hoje.count === 0) return []
  const d = delta(hoje.despesas, ontem.despesas)
  const direction = d > 0 ? '↑' : d < 0 ? '↓' : '='
  let body = `Gastou ${fmt(hoje.despesas)} em ${hoje.count} ${hoje.count === 1 ? 'transação' : 'transações'}`
  if (ontem.despesas > 0 && Math.abs(d) >= 5) body += ` · ${direction} ${Math.abs(d).toFixed(0)}% vs ontem`
  if (topCat) body += `\nMaior gasto: ${topCat.nome} (${fmt(topCat.valor)})`
  return [{ title: 'Recap do dia', body, tag: 'evening-recap', url: `${PUBLIC_URL}/transacoes` }]
}

async function handleWeeklyRecap(userId: string): Promise<Payload[]> {
  const base = brtNow()
  const dow = base.getDay()
  const lastSundayDt = new Date(base.getTime() - dow * 86400_000)
  const lastMondayDt = new Date(lastSundayDt.getTime() - 6 * 86400_000)
  const semanaPassadaStart = isoDate(lastMondayDt)
  const semanaPassadaEnd = isoDate(lastSundayDt)
  const prevSundayDt = new Date(lastMondayDt.getTime() - 1 * 86400_000)
  const prevMondayDt = new Date(prevSundayDt.getTime() - 6 * 86400_000)
  const sem = await sumPeriod(userId, semanaPassadaStart, semanaPassadaEnd)
  const prev = await sumPeriod(userId, isoDate(prevMondayDt), isoDate(prevSundayDt))
  const topCat = await topCategoria(userId, semanaPassadaStart, semanaPassadaEnd)
  if (sem.count === 0) return []
  const d = delta(sem.despesas, prev.despesas)
  const direction = d > 0 ? '↑' : d < 0 ? '↓' : '='
  const saldo = sem.saldo
  let body = `Recebeu ${fmt(sem.receitas)} · Gastou ${fmt(sem.despesas)} · Saldo ${fmt(saldo)}`
  if (prev.despesas > 0 && Math.abs(d) >= 5) body += `\nDespesas ${direction} ${Math.abs(d).toFixed(0)}% vs semana anterior`
  if (topCat) body += `\nTop categoria: ${topCat.nome} (${fmt(topCat.valor)})`
  return [{ title: 'Resumo da semana', body, tag: 'weekly-recap', url: `${PUBLIC_URL}/relatorios` }]
}

async function handleMonthlyRecap(userId: string): Promise<Payload[]> {
  const base = brtNow()
  const ultimoMesDt = new Date(base.getFullYear(), base.getMonth() - 1, 15)
  const mesNome = ultimoMesDt.toLocaleDateString('pt-BR', { month: 'long' })
  const m2Dt = new Date(base.getFullYear(), base.getMonth() - 2, 15)
  const mes = await sumPeriod(userId, startOfMonth(ultimoMesDt), endOfMonth(ultimoMesDt))
  const m2 = await sumPeriod(userId, startOfMonth(m2Dt), endOfMonth(m2Dt))
  const topCat = await topCategoria(userId, startOfMonth(ultimoMesDt), endOfMonth(ultimoMesDt))
  if (mes.count === 0) return []
  const saldo = mes.saldo
  const taxa = mes.receitas > 0 ? (saldo / mes.receitas) * 100 : 0
  const d = delta(mes.despesas, m2.despesas)
  const direction = d > 0 ? '↑' : '↓'
  let body = `${fmt(mes.receitas)} entrou, ${fmt(mes.despesas)} saiu (taxa de economia ${taxa.toFixed(0)}%)`
  if (m2.despesas > 0 && Math.abs(d) >= 5) body += `\nDespesas ${direction} ${Math.abs(d).toFixed(0)}% vs mês anterior`
  if (topCat) body += `\nMaior categoria: ${topCat.nome} (${fmt(topCat.valor)})`
  return [{ title: `Fechamento de ${mesNome.charAt(0).toUpperCase() + mesNome.slice(1)}`, body, tag: 'monthly-recap', url: `${PUBLIC_URL}/relatorios`, requireInteraction: true }]
}

async function handleAlertsCheck(userId: string): Promise<Payload[]> {
  const out: Payload[] = []
  const base = brtNow()
  const mes = base.getMonth() + 1
  const ano = base.getFullYear()
  const { data: cartoes } = await sbAdmin.from('cartoes').select('id, nome, limite, ativo').eq('user_id', userId).eq('ativo', true).eq('deleted', false)
  if (cartoes) {
    for (const c of cartoes) {
      const { data: lancs } = await sbAdmin.from('lancamentos_cartao').select('valor').eq('user_id', userId).eq('cartao_id', c.id).eq('mes', mes).eq('ano', ano).eq('deleted', false)
      const usado = (lancs ?? []).reduce((s, l) => s + l.valor, 0)
      const pct = c.limite > 0 ? (usado / c.limite) * 100 : 0
      if (pct >= 80) {
        out.push({ title: `${c.nome}: ${pct.toFixed(0)}% do limite`, body: `Disponível: ${fmt(c.limite - usado)} de ${fmt(c.limite)}`, tag: `alert-cartao-${c.id}`, url: `${PUBLIC_URL}/cartoes`, requireInteraction: pct >= 95 })
      }
    }
  }
  const { data: metas } = await sbAdmin.from('metas').select('id, nome, valor_alvo, valor_atual').eq('user_id', userId).eq('ativo', true).eq('deleted', false)
  if (metas) {
    for (const m of metas) {
      if (m.valor_alvo > 0 && m.valor_atual >= m.valor_alvo) {
        out.push({ title: `Meta atingida: ${m.nome}!`, body: `Você bateu ${fmt(m.valor_atual)} de ${fmt(m.valor_alvo)}`, tag: `alert-meta-${m.id}`, url: `${PUBLIC_URL}/metas`, requireInteraction: true })
      }
    }
  }
  const saldoContas = await saldoEmContas(userId)
  const mesData = await sumPeriod(userId, startOfMonth(base), endOfMonth(base))
  const { data: fixas } = await sbAdmin.from('contas_fixas').select('id, valor, dia_vencimento, ativo').eq('user_id', userId).eq('ativo', true).eq('deleted', false)
  const { data: pagsM } = await sbAdmin.from('pagamentos_fixos').select('conta_fixa_id, status').eq('user_id', userId).eq('mes', mes).eq('ano', ano).eq('deleted', false)
  const pagas = new Set((pagsM ?? []).filter(p => p.status === 'pago').map(p => p.conta_fixa_id))
  const fixasPend = (fixas ?? []).filter(cf => !pagas.has(cf.id)).reduce((s, cf) => s + cf.valor, 0)
  const saldoPrevisto = saldoContas + (mesData.receitas - mesData.despesas) - fixasPend
  if (saldoPrevisto < 0 && saldoContas > 0) {
    out.push({ title: 'Saldo previsto negativo', body: `Fim do mês previsto: ${fmt(saldoPrevisto)}. Reveja gastos ou antecipe receita.`, tag: 'alert-saldo-neg', url: `${PUBLIC_URL}/relatorios`, requireInteraction: true })
  }
  return out
}

async function handleTestPush(_userId: string): Promise<Payload[]> {
  const base = brtNow()
  const ts = base.toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return [{
    title: 'Push em background funciona',
    body: `Notificação de teste enviada às ${ts} (BRT). O push real chega no iPhone, Mac e Android mesmo com o app fechado.`,
    tag: 'test-push',
    url: `${PUBLIC_URL}/configuracoes`,
    actions: [{ action: 'open', title: 'Abrir app' }, { action: 'settings', title: 'Configurar' }],
    actionsUrls: { open: `${PUBLIC_URL}/`, settings: `${PUBLIC_URL}/configuracoes` },
    requireInteraction: false,
  }]
}

const HANDLERS: Record<string, (uid: string) => Promise<Payload[]>> = {
  'test-push':     handleTestPush,
  'morning-brief': handleMorningBrief,
  'daily-pulse':   handleDailyPulse,
  'evening-recap': handleEveningRecap,
  'weekly-recap':  handleWeeklyRecap,
  'monthly-recap': handleMonthlyRecap,
  'alerts-check':  handleAlertsCheck,
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin')

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) })
  }

  const url = new URL(req.url)
  const kind = url.searchParams.get('kind') ?? 'morning-brief'
  const handler = HANDLERS[kind]
  if (!handler) {
    return jsonResp({ error: `unknown kind: ${kind}`, available: Object.keys(HANDLERS) }, 400, origin)
  }

  // Autenticação:
  //   1. Cron (server-to-server): exige x-cron-secret válido.
  //   2. test-push do client: exige JWT válido; envia só pro user dono do JWT.
  const cronSecret = Deno.env.get('CRON_SECRET')
  const providedCron = req.headers.get('x-cron-secret')
  const isCronAuthed = !!cronSecret && providedCron === cronSecret

  let authedUserId: string | null = null
  if (!isCronAuthed) {
    if (kind !== 'test-push') {
      return jsonResp({ error: 'forbidden: cron-only kind' }, 403, origin)
    }
    const authHeader = req.headers.get('authorization') ?? ''
    if (!authHeader.startsWith('Bearer ')) {
      return jsonResp({ error: 'unauthorized: missing Bearer token' }, 401, origin)
    }
    const jwt = authHeader.slice(7)
    const sbUser = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${jwt}` } },
    })
    const { data: userData, error: userErr } = await sbUser.auth.getUser()
    if (userErr || !userData?.user) {
      return jsonResp({ error: 'unauthorized: invalid JWT' }, 401, origin)
    }
    authedUserId = userData.user.id
  }

  const subsQuery = sbAdmin.from('push_subscriptions').select('*')
  if (authedUserId) subsQuery.eq('user_id', authedUserId)
  const { data: subs, error: subsErr } = await subsQuery
  if (subsErr) return jsonResp({ error: subsErr.message }, 500, origin)

  const userIds = Array.from(new Set((subs ?? []).map(s => s.user_id)))
  let sent = 0
  const perUser: Record<string, number> = {}

  for (const uid of userIds) {
    const prefs = await getUserPrefs(uid)
    if (!shouldSend(prefs, kind)) { perUser[uid] = -1; continue }
    const userSubs = (subs ?? []).filter(s => s.user_id === uid)
    if (userSubs.length === 0) continue
    let payloads: Payload[] = []
    try {
      payloads = await handler(uid)
    } catch (e) {
      console.warn(`[${kind}] handler error for user ${uid}:`, e)
      perUser[uid] = -2
      continue
    }
    let userSent = 0
    for (const payload of payloads) {
      for (const sub of userSubs) {
        const ok = await sendPush(sub, payload)
        if (ok) userSent += 1
      }
    }
    perUser[uid] = userSent
    sent += userSent
  }

  return jsonResp({ ok: true, kind, users: userIds.length, sent, perUser, at: new Date().toISOString() }, 200, origin)
})

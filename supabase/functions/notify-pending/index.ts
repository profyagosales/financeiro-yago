// ─── Edge Function: notify-pending (multi-kind dispatcher) ──────────
// Roda via pg_cron em vários horários. Aceita ?kind=... pra escolher
// qual lógica executar.
//
// Tipos suportados:
//   morning-brief   (08:00 BRT diário)     contas vencendo + saldo previsto
//   daily-pulse     (13:00 BRT seg-sex)    gasto até agora vs orçamento diário
//   evening-recap   (20:00 BRT diário)     resumo do dia + top categoria
//   weekly-recap    (dom 19:00 BRT)        resumo da semana + comparativo
//   monthly-recap   (dia 1 09:00 BRT)      fechamento mês anterior + forecast
//   alerts-check    (a cada 3h)            cartão alto, spike, meta, saldo neg
//
// VAPID secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
// Cron secret:   CRON_SECRET (header x-cron-secret)
// Auth ao Supabase: SUPABASE_SERVICE_ROLE_KEY (auto)

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'
import webpush from 'npm:web-push@3.6.7'

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC  = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:vinicius.yago@gmail.com'
const PUBLIC_URL    = Deno.env.get('PUBLIC_APP_URL') ?? 'https://financeiro-yago.vercel.app'

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)
const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

// ─── Types ────────────────────────────────────────────────────────
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

// ─── Format helpers ────────────────────────────────────────────────
function fmt(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}
function fmtFull(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function pct(n: number): string {
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(0)}%`
}
function delta(cur: number, prev: number): number {
  if (prev === 0) return cur === 0 ? 0 : 100
  return ((cur - prev) / Math.abs(prev)) * 100
}

// ─── Date helpers (timezone BRT = UTC-3) ───────────────────────────
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

// ─── Send push (com cleanup de subs inválidas) ─────────────────────
async function sendPush(sub: PushSub, payload: Payload): Promise<boolean> {
  // Defaults
  payload.icon = payload.icon ?? `${PUBLIC_URL}/icon-192.svg`
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
      await sb.from('push_subscriptions').delete().eq('id', sub.id)
    }
    return false
  }
}

// ─── Get user prefs (lê app_config / key=app_preferences) ──────────
// O app salva localmente em IndexedDB e sincroniza pro Supabase via sync engine.
// As keys camelCase no app viram snake_case na conversão automática do sync.
//   pushMorningBrief → push_morning_brief
async function getUserPrefs(userId: string): Promise<PushPrefs> {
  const { data } = await sb.from('app_config')
    .select('value').eq('user_id', userId).eq('key', 'app_preferences').maybeSingle()
  return (data?.value ?? {}) as PushPrefs
}

function shouldSend(prefs: PushPrefs, kind: string): boolean {
  // Default ON: só desliga se explicitamente false
  const k = `push_${kind.replace(/-/g, '_')}` as keyof PushPrefs
  return prefs[k] !== false
}

// ─── Conta fixa queries ─────────────────────────────────────────────
async function contasFixasVencendo(userId: string, baseDate: Date, daysAhead = 3) {
  const { data: fixas } = await sb.from('contas_fixas')
    .select('id, nome, valor, dia_vencimento, ativo')
    .eq('user_id', userId).eq('ativo', true).eq('deleted', false)
  if (!fixas) return []
  const mes = baseDate.getMonth() + 1
  const ano = baseDate.getFullYear()
  const dia = baseDate.getDate()
  const { data: pags } = await sb.from('pagamentos_fixos')
    .select('conta_fixa_id, status')
    .eq('user_id', userId).eq('mes', mes).eq('ano', ano).eq('deleted', false)
  const pagas = new Set((pags ?? []).filter(p => p.status === 'pago').map(p => p.conta_fixa_id))
  const out: Array<{ cf: { id: string; nome: string; valor: number; dia_vencimento: number }; dias: number }> = []
  for (const cf of fixas) {
    if (pagas.has(cf.id)) continue
    const diasAteVencer = cf.dia_vencimento - dia
    if (diasAteVencer >= 0 && diasAteVencer <= daysAhead) {
      out.push({ cf, dias: diasAteVencer })
    }
  }
  return out
}

// ─── Sums por período ──────────────────────────────────────────────
async function sumPeriod(userId: string, start: string, end: string) {
  const { data } = await sb.from('transacoes')
    .select('tipo, valor')
    .eq('user_id', userId).eq('deleted', false)
    .gte('data', start).lte('data', end)
  if (!data) return { receitas: 0, despesas: 0, count: 0 }
  let receitas = 0, despesas = 0
  for (const t of data) {
    if (t.tipo === 'receita') receitas += t.valor
    else if (t.tipo === 'despesa') despesas += t.valor
  }
  return { receitas, despesas, count: data.length, saldo: receitas - despesas }
}

async function topCategoria(userId: string, start: string, end: string) {
  const { data: txs } = await sb.from('transacoes')
    .select('categoria_id, valor')
    .eq('user_id', userId).eq('deleted', false).eq('tipo', 'despesa')
    .gte('data', start).lte('data', end)
  if (!txs || txs.length === 0) return null
  const totals = new Map<string, number>()
  txs.forEach(t => totals.set(t.categoria_id, (totals.get(t.categoria_id) ?? 0) + t.valor))
  const sorted = Array.from(totals.entries()).sort((a, b) => b[1] - a[1])
  if (sorted.length === 0) return null
  const [catId, valor] = sorted[0]
  const { data: cat } = await sb.from('categorias').select('nome').eq('id', catId).maybeSingle()
  return { nome: cat?.nome ?? 'Categoria', valor }
}

async function saldoEmContas(userId: string): Promise<number> {
  const { data } = await sb.from('contas')
    .select('saldo_atual').eq('user_id', userId).eq('ativo', true).eq('deleted', false)
  return (data ?? []).reduce((s, c) => s + c.saldo_atual, 0)
}

// ─── Handlers (1 por tipo de notificação) ──────────────────────────
async function handleMorningBrief(userId: string): Promise<Payload[]> {
  const base = brtNow()
  const aVencer = await contasFixasVencendo(userId, base, 3)
  const saldoContas = await saldoEmContas(userId)
  const totalAVencer = aVencer.reduce((s, x) => s + x.cf.valor, 0)

  if (aVencer.length === 0 && saldoContas > 0) {
    return [{
      title: '☀️ Bom dia! Tudo em dia',
      body: `Nenhuma conta a vencer nos próximos 3 dias. Saldo: ${fmt(saldoContas)}`,
      tag: 'morning-brief',
      url: `${PUBLIC_URL}/`,
    }]
  }
  if (aVencer.length === 0) return []

  const hoje = aVencer.filter(x => x.dias === 0)
  const proximos = aVencer.filter(x => x.dias > 0)

  let title = '☀️ Bom dia, financeiro do dia'
  let body = ''
  if (hoje.length > 0) {
    title = `⚠️ ${hoje.length} ${hoje.length === 1 ? 'conta vence HOJE' : 'contas vencem HOJE'}`
    body = hoje.length === 1
      ? `${hoje[0].cf.nome} — ${fmtFull(hoje[0].cf.valor)}`
      : `Total hoje: ${fmt(hoje.reduce((s, x) => s + x.cf.valor, 0))}`
    if (proximos.length > 0) body += `\n+ ${proximos.length} ${proximos.length === 1 ? 'em até 3 dias' : 'nos próximos 3 dias'}`
  } else {
    body = `${aVencer.length} ${aVencer.length === 1 ? 'conta' : 'contas'} totalizando ${fmt(totalAVencer)} nos próximos 3 dias`
  }

  return [{
    title, body,
    tag: 'morning-brief',
    url: `${PUBLIC_URL}/contas-fixas`,
    actions: [{ action: 'view', title: 'Ver detalhes' }],
    actionsUrls: { view: `${PUBLIC_URL}/contas-fixas` },
    requireInteraction: hoje.length > 0,
  }]
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
  // Receita esperada do mês (média dos últimos 3 meses)
  const m3StartDt = new Date(ano, mes - 4, 1)
  const m3EndDt = new Date(ano, mes - 1, 0)
  const m3 = await sumPeriod(userId, isoDate(m3StartDt), isoDate(m3EndDt))
  const receitaEsperada = mesAtual.receitas > 0 ? mesAtual.receitas : m3.receitas / 3

  if (receitaEsperada === 0) return []

  // Orçamento diário: (receita esperada - despesas já feitas) / dias restantes
  const diasRest = Math.max(1, diasMes - diaMes + 1)
  const orcamentoDiario = Math.max(0, (receitaEsperada - mesAtual.despesas) / diasRest)

  if (hoje.despesas === 0 && orcamentoDiario > 0) {
    return [{
      title: '🍽️ Pulse do dia',
      body: `Você pode gastar até ${fmt(orcamentoDiario)} hoje sem comprometer o mês`,
      tag: 'daily-pulse',
      url: `${PUBLIC_URL}/`,
    }]
  }

  const ratio = orcamentoDiario > 0 ? hoje.despesas / orcamentoDiario : 1
  let emoji = '✅'
  let title = '🍽️ Pulse do dia'

  if (ratio >= 1.2) {
    emoji = '🔴'
    title = '🔴 Atenção: gasto acima do diário'
  } else if (ratio >= 0.8) {
    emoji = '🟡'
    title = '🟡 Pulse do dia'
  } else {
    emoji = '🟢'
    title = '🟢 Pulse do dia'
  }

  const restanteHoje = Math.max(0, orcamentoDiario - hoje.despesas)
  const body = `Gastou ${fmt(hoje.despesas)} hoje · ${emoji} ${restanteHoje > 0 ? `pode gastar +${fmt(restanteHoje)}` : `${fmt(hoje.despesas - orcamentoDiario)} acima do diário`}`

  return [{
    title, body,
    tag: 'daily-pulse',
    url: `${PUBLIC_URL}/relatorios`,
  }]
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
  if (ontem.despesas > 0 && Math.abs(d) >= 5) {
    body += ` · ${direction} ${Math.abs(d).toFixed(0)}% vs ontem`
  }
  if (topCat) {
    body += `\nMaior gasto: ${topCat.nome} (${fmt(topCat.valor)})`
  }

  return [{
    title: '🌙 Recap do dia',
    body,
    tag: 'evening-recap',
    url: `${PUBLIC_URL}/transacoes`,
  }]
}

async function handleWeeklyRecap(userId: string): Promise<Payload[]> {
  const base = brtNow()
  // Última semana (segunda a domingo)
  const dow = base.getDay()                       // 0=Dom, 6=Sáb
  const lastSundayDt = new Date(base.getTime() - dow * 86400_000)
  const lastMondayDt = new Date(lastSundayDt.getTime() - 6 * 86400_000)
  const semanaPassadaStart = isoDate(lastMondayDt)
  const semanaPassadaEnd = isoDate(lastSundayDt)
  // Semana anterior (pra comparar)
  const prevSundayDt = new Date(lastMondayDt.getTime() - 1 * 86400_000)
  const prevMondayDt = new Date(prevSundayDt.getTime() - 6 * 86400_000)
  const prevStart = isoDate(prevMondayDt)
  const prevEnd = isoDate(prevSundayDt)

  const sem = await sumPeriod(userId, semanaPassadaStart, semanaPassadaEnd)
  const prev = await sumPeriod(userId, prevStart, prevEnd)
  const topCat = await topCategoria(userId, semanaPassadaStart, semanaPassadaEnd)

  if (sem.count === 0) return []

  const d = delta(sem.despesas, prev.despesas)
  const direction = d > 0 ? '↑' : d < 0 ? '↓' : '='
  const saldo = sem.saldo ?? sem.receitas - sem.despesas
  const saldoEmoji = saldo >= 0 ? '🟢' : '🔴'

  let body = `📥 ${fmt(sem.receitas)} · 📤 ${fmt(sem.despesas)} · ${saldoEmoji} ${fmt(saldo)}`
  if (prev.despesas > 0 && Math.abs(d) >= 5) {
    body += `\nDespesas ${direction} ${Math.abs(d).toFixed(0)}% vs semana anterior`
  }
  if (topCat) {
    body += `\nTop categoria: ${topCat.nome} (${fmt(topCat.valor)})`
  }

  return [{
    title: '📊 Resumo da semana',
    body,
    tag: 'weekly-recap',
    url: `${PUBLIC_URL}/relatorios`,
  }]
}

async function handleMonthlyRecap(userId: string): Promise<Payload[]> {
  const base = brtNow()
  const ultimoMesDt = new Date(base.getFullYear(), base.getMonth() - 1, 15)
  const mesStart = startOfMonth(ultimoMesDt)
  const mesEnd = endOfMonth(ultimoMesDt)
  const mesNome = ultimoMesDt.toLocaleDateString('pt-BR', { month: 'long' })

  // Comparativo com mês -2
  const m2Dt = new Date(base.getFullYear(), base.getMonth() - 2, 15)
  const m2Start = startOfMonth(m2Dt)
  const m2End = endOfMonth(m2Dt)

  const mes = await sumPeriod(userId, mesStart, mesEnd)
  const m2 = await sumPeriod(userId, m2Start, m2End)
  const topCat = await topCategoria(userId, mesStart, mesEnd)

  if (mes.count === 0) return []

  const saldo = mes.saldo ?? mes.receitas - mes.despesas
  const taxa = mes.receitas > 0 ? (saldo / mes.receitas) * 100 : 0
  const d = delta(mes.despesas, m2.despesas)
  const direction = d > 0 ? '↑' : '↓'
  const taxaEmoji = taxa >= 20 ? '🌟' : taxa >= 10 ? '✅' : taxa >= 0 ? '⚠️' : '🔴'

  let body = `${fmt(mes.receitas)} entrou, ${fmt(mes.despesas)} saiu (${taxaEmoji} taxa de poupança ${taxa.toFixed(0)}%)`
  if (m2.despesas > 0 && Math.abs(d) >= 5) {
    body += `\nDespesas ${direction} ${Math.abs(d).toFixed(0)}% vs mês anterior`
  }
  if (topCat) {
    body += `\nMaior categoria: ${topCat.nome} (${fmt(topCat.valor)})`
  }

  return [{
    title: `📅 Fechamento de ${mesNome.charAt(0).toUpperCase() + mesNome.slice(1)}`,
    body,
    tag: 'monthly-recap',
    url: `${PUBLIC_URL}/relatorios`,
    requireInteraction: true,
  }]
}

async function handleAlertsCheck(userId: string): Promise<Payload[]> {
  const out: Payload[] = []
  const base = brtNow()
  const mes = base.getMonth() + 1
  const ano = base.getFullYear()

  // 1. Cartão > 80% do limite
  const { data: cartoes } = await sb.from('cartoes')
    .select('id, nome, limite, ativo').eq('user_id', userId).eq('ativo', true).eq('deleted', false)
  if (cartoes) {
    for (const c of cartoes) {
      const { data: lancs } = await sb.from('lancamentos_cartao')
        .select('valor').eq('user_id', userId).eq('cartao_id', c.id)
        .eq('mes', mes).eq('ano', ano).eq('deleted', false)
      const usado = (lancs ?? []).reduce((s, l) => s + l.valor, 0)
      const pct = c.limite > 0 ? (usado / c.limite) * 100 : 0
      if (pct >= 80) {
        out.push({
          title: pct >= 95 ? `🔥 ${c.nome}: ${pct.toFixed(0)}% do limite` : `⚠️ ${c.nome}: ${pct.toFixed(0)}% do limite`,
          body: `Disponível: ${fmt(c.limite - usado)} de ${fmt(c.limite)}`,
          tag: `alert-cartao-${c.id}`,
          url: `${PUBLIC_URL}/cartoes`,
          requireInteraction: pct >= 95,
        })
      }
    }
  }

  // 2. Meta atingida (>=100%)
  const { data: metas } = await sb.from('metas')
    .select('id, nome, valor_alvo, valor_atual').eq('user_id', userId).eq('ativo', true).eq('deleted', false)
  if (metas) {
    for (const m of metas) {
      if (m.valor_alvo > 0 && m.valor_atual >= m.valor_alvo) {
        // Verifica se já foi notificada (pelo timestamp)
        out.push({
          title: `🎯 Meta atingida: ${m.nome}!`,
          body: `Você bateu ${fmt(m.valor_atual)} de ${fmt(m.valor_alvo)}`,
          tag: `alert-meta-${m.id}`,
          url: `${PUBLIC_URL}/metas`,
          requireInteraction: true,
        })
      }
    }
  }

  // 3. Saldo negativo previsto
  const saldoContas = await saldoEmContas(userId)
  const mesData = await sumPeriod(userId, startOfMonth(base), endOfMonth(base))
  const diasRest = Math.max(0, endOfMonth(base).split('-')[2].length > 0
    ? parseInt(endOfMonth(base).split('-')[2]) - base.getDate() : 0)
  const { data: fixas } = await sb.from('contas_fixas')
    .select('valor, dia_vencimento, ativo').eq('user_id', userId).eq('ativo', true).eq('deleted', false)
  const { data: pagsM } = await sb.from('pagamentos_fixos')
    .select('conta_fixa_id, status').eq('user_id', userId).eq('mes', mes).eq('ano', ano).eq('deleted', false)
  const pagas = new Set((pagsM ?? []).filter(p => p.status === 'pago').map(p => p.conta_fixa_id))
  const fixasPend = (fixas ?? []).filter(cf => cf.dia_vencimento >= base.getDate() && !pagas.has((cf as { id?: string }).id ?? ''))
    .reduce((s, cf) => s + cf.valor, 0)
  const saldoPrevisto = saldoContas + (mesData.receitas - mesData.despesas) - fixasPend
  if (saldoPrevisto < 0 && saldoContas > 0) {
    out.push({
      title: '🔴 Saldo previsto negativo',
      body: `Fim do mês previsto: ${fmt(saldoPrevisto)}. Reveja gastos ou antecipe receita.`,
      tag: 'alert-saldo-neg',
      url: `${PUBLIC_URL}/relatorios`,
      requireInteraction: true,
    })
  }

  return out
}

// ─── Test push (validação visual — sempre envia uma notif rica) ────
async function handleTestPush(_userId: string): Promise<Payload[]> {
  const base = brtNow()
  const ts = base.toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return [{
    title: '✨ Push em background funciona',
    body: `Notificação de teste enviada às ${ts} (BRT). O push real chega no iPhone, Mac e Android mesmo com o app fechado.`,
    tag: 'test-push',
    url: `${PUBLIC_URL}/configuracoes`,
    actions: [
      { action: 'open', title: 'Abrir app' },
      { action: 'settings', title: 'Configurar' },
    ],
    actionsUrls: {
      open: `${PUBLIC_URL}/`,
      settings: `${PUBLIC_URL}/configuracoes`,
    },
    requireInteraction: false,
  }]
}

// ─── Dispatcher ────────────────────────────────────────────────────
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
  // Auth
  const cronToken = Deno.env.get('CRON_SECRET')
  if (cronToken && req.headers.get('x-cron-secret') !== cronToken) {
    return new Response('forbidden', { status: 403 })
  }

  const url = new URL(req.url)
  const kind = url.searchParams.get('kind') ?? 'morning-brief'
  const handler = HANDLERS[kind]
  if (!handler) {
    return new Response(JSON.stringify({ error: `unknown kind: ${kind}`, available: Object.keys(HANDLERS) }), { status: 400 })
  }

  // Lista users com subs ativas
  const { data: subs, error: subsErr } = await sb.from('push_subscriptions').select('*')
  if (subsErr) return new Response(JSON.stringify({ error: subsErr.message }), { status: 500 })

  const userIds = Array.from(new Set((subs ?? []).map(s => s.user_id)))
  let sent = 0
  const perUser: Record<string, number> = {}

  for (const uid of userIds) {
    // Pref check
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

  return new Response(JSON.stringify({
    ok: true, kind, users: userIds.length, sent, perUser,
    at: new Date().toISOString(),
  }), { headers: { 'content-type': 'application/json' } })
})

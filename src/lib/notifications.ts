// ─── Notificações locais ─────────────────────────────────────────────
// Estratégia: ao abrir o app, verifica pendências e dispara notificações
// via Notification API (foreground) ou serviceWorker.showNotification
// (mais consistente em iOS PWA).
//
// Não usa push real (que exigiria servidor + VAPID). Cobre o caso mais
// comum: lembrar de contas vencendo, faturas fechando, orçamentos estourados.
//
// Plataformas suportadas:
//   iOS 16.4+ (apenas em PWA instalado via 'Add to Home Screen')
//   macOS 13+ Safari 16.1+
//   Chrome / Edge / Firefox em desktop e Android
//
// Badge API (número no ícone): iOS 16.4+, macOS Sonoma, Chrome 81+.

import { db } from '@/db/schema'
import { fmt } from '@/lib/format'

export type PermissaoEstado = 'default' | 'granted' | 'denied' | 'unsupported'

export function getPermissaoEstado(): PermissaoEstado {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  return Notification.permission as PermissaoEstado
}

export async function pedirPermissao(): Promise<PermissaoEstado> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  const result = await Notification.requestPermission()
  return result as PermissaoEstado
}

// ─── Notificação base ────────────────────────────────────────────────
// Tenta usar service worker (mais robusto em PWA), cai pra Notification
// direta se SW não disponível.
async function dispararNotificacao(opts: {
  titulo: string
  body: string
  tag?: string                 // tags com mesmo valor substituem (evita duplicar)
  url?: string                 // rota a abrir ao clicar (default '/')
  silent?: boolean
}) {
  if (getPermissaoEstado() !== 'granted') return false
  const data = { url: opts.url ?? '/' }
  const options: NotificationOptions = {
    body: opts.body,
    icon: '/icon-192.svg',
    badge: '/favicon.svg',
    tag: opts.tag,
    silent: opts.silent,
    data,
  }
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready
      await reg.showNotification(opts.titulo, options)
      return true
    }
    new Notification(opts.titulo, options)
    return true
  } catch {
    return false
  }
}

// ─── Badge no ícone do app ───────────────────────────────────────────
export async function setBadge(count: number) {
  try {
    const nav = navigator as Navigator & { setAppBadge?: (n: number) => Promise<void>; clearAppBadge?: () => Promise<void> }
    if (count > 0 && nav.setAppBadge) await nav.setAppBadge(count)
    else if (nav.clearAppBadge) await nav.clearAppBadge()
  } catch { /* não suportado */ }
}

// ─── Preferências de notificação ─────────────────────────────────────
export interface NotificationPrefs {
  contasFixasVencendo: boolean    // 3 dias antes + no dia
  faturasFechando: boolean        // 3 dias antes do fechamento
  orcamentoEstourado: boolean     // quando categoria passa do limite
  metaAtingida: boolean           // quando meta chega a 100%
}

export const NOTIF_PREFS_DEFAULT: NotificationPrefs = {
  contasFixasVencendo: true,
  faturasFechando: true,
  orcamentoEstourado: true,
  metaAtingida: true,
}

// ─── Lógica de detecção e disparo ────────────────────────────────────
// Roda no boot do app + a cada hora enquanto está aberto.
// Verifica pendências e dispara notificações + atualiza badge.

const TAG_FIXA = (id: number, dia: number) => `fixa-${id}-${dia}`
const TAG_ORC = (catId: number) => `orc-${catId}`
const TAG_META = (id: number) => `meta-${id}`
const TAG_FATURA = (cartaoId: number) => `fatura-${cartaoId}`

export async function verificarPendencias(prefs: NotificationPrefs = NOTIF_PREFS_DEFAULT): Promise<{ total: number; notificadas: number }> {
  const hoje = new Date()
  const hojeStr = hoje.toISOString().split('T')[0]
  const mes = hoje.getMonth() + 1
  const ano = hoje.getFullYear()
  let totalPendencias = 0
  let notificadas = 0

  // ─── 1. Contas fixas vencendo nos próximos 3 dias ───────────────
  if (prefs.contasFixasVencendo) {
    const fixas = await db.contasFixas.filter(c => c.ativo).toArray()
    const pagamentos = await db.pagamentosFixos.where('[mes+ano]').equals([mes, ano]).toArray()
    const pagasIds = new Set(pagamentos.filter(p => p.status === 'pago').map(p => p.contaFixaId))

    for (const cf of fixas) {
      if (cf.id === undefined || pagasIds.has(cf.id)) continue
      const diasAteVencer = cf.diaVencimento - hoje.getDate()
      if (diasAteVencer >= 0 && diasAteVencer <= 3) {
        totalPendencias += 1
        const ok = await dispararNotificacao({
          titulo: diasAteVencer === 0 ? `${cf.nome} vence hoje` : `${cf.nome} vence em ${diasAteVencer} dia${diasAteVencer > 1 ? 's' : ''}`,
          body: `${fmt(cf.valor)} · dia ${cf.diaVencimento}`,
          tag: TAG_FIXA(cf.id, hoje.getDate()),
          url: '/contas-fixas',
        })
        if (ok) notificadas += 1
      } else if (diasAteVencer < 0) {
        totalPendencias += 1  // já vencida, conta no badge mas não notifica de novo
      }
    }
  }

  // ─── 2. Faturas de cartão fechando ──────────────────────────────
  if (prefs.faturasFechando) {
    const cartoes = await db.cartoes.filter(c => c.ativo).toArray()
    for (const card of cartoes) {
      if (card.id === undefined) continue
      const diasAteFechar = card.diaFechamento - hoje.getDate()
      if (diasAteFechar > 0 && diasAteFechar <= 3) {
        // Soma lançamentos do mês corrente
        const lancs = await db.lancamentosCartao.where('[cartaoId+mes+ano]').equals([card.id, mes, ano]).toArray()
        const fatura = lancs.reduce((s, l) => s + l.valor, 0)
        if (fatura > 0) {
          const ok = await dispararNotificacao({
            titulo: `Fatura ${card.nome} fecha em ${diasAteFechar} dia${diasAteFechar > 1 ? 's' : ''}`,
            body: `Total parcial: ${fmt(fatura)}`,
            tag: TAG_FATURA(card.id),
            url: '/cartoes',
          })
          if (ok) notificadas += 1
        }
      }
    }
  }

  // ─── 3. Orçamentos estourados ───────────────────────────────────
  if (prefs.orcamentoEstourado) {
    const orcamentos = await db.orcamentos.toArray()
    const txs = await db.transacoes
      .where('data').aboveOrEqual(`${ano}-${String(mes).padStart(2, '0')}-01`)
      .toArray()
    const gastosPorCat = new Map<number, number>()
    txs.filter(t => t.tipo === 'despesa').forEach(t => {
      gastosPorCat.set(t.categoriaId, (gastosPorCat.get(t.categoriaId) ?? 0) + t.valor)
    })
    const cats = await db.categorias.toArray()
    const catMap = new Map(cats.map(c => [c.id, c.nome]))

    for (const o of orcamentos) {
      const gasto = gastosPorCat.get(o.categoriaId) ?? 0
      if (gasto > o.valorLimite) {
        totalPendencias += 1
        const excesso = gasto - o.valorLimite
        const ok = await dispararNotificacao({
          titulo: `Orçamento de ${catMap.get(o.categoriaId) ?? 'categoria'} estourou`,
          body: `Gastou ${fmt(gasto)} de ${fmt(o.valorLimite)} (+${fmt(excesso)})`,
          tag: o.id !== undefined ? TAG_ORC(o.id) : undefined,
          url: '/metas',
        })
        if (ok) notificadas += 1
      }
    }
  }

  // ─── 4. Metas atingidas ─────────────────────────────────────────
  if (prefs.metaAtingida) {
    const metas = await db.metas.filter(m => m.ativo).toArray()
    const invests = await db.investimentos.filter(i => i.ativo && i.metaId !== undefined).toArray()
    for (const m of metas) {
      const valorInvest = invests.filter(i => i.metaId === m.id).reduce((s, i) => s + i.valorAtual, 0)
      const valorTotal = (m.valorAtual ?? 0) + valorInvest
      if (m.valorAlvo > 0 && valorTotal >= m.valorAlvo) {
        const ok = await dispararNotificacao({
          titulo: `🎯 Meta atingida: ${m.nome}`,
          body: `Você alcançou ${fmt(valorTotal)} de ${fmt(m.valorAlvo)}!`,
          tag: m.id !== undefined ? TAG_META(m.id) : undefined,
          url: '/metas',
        })
        if (ok) notificadas += 1
      }
    }
  }

  await setBadge(totalPendencias)
  return { total: totalPendencias, notificadas }
}

// ─── Notificação de teste ────────────────────────────────────────────
export async function notificarTeste(): Promise<boolean> {
  return await dispararNotificacao({
    titulo: 'Financeiro do Yago',
    body: 'Notificações funcionando! Você vai receber lembretes de contas, faturas e orçamentos.',
    tag: 'teste',
    url: '/',
  })
}

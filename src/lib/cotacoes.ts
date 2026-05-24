// ─── Client de cotações de mercado ───────────────────────────────────
// Cripto: CoinGecko (gratuito, sem auth, CORS liberado, retorna BRL)
// Ações/FIIs/ETFs BR: Brapi.dev (gratuito, sem auth, CORS liberado)
// Câmbio USD/BRL: Brapi também (ticker USDBRL=X)
//
// Cache simples em memória com TTL pra evitar rate limit.

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 min
const cache = new Map<string, { value: number; ts: number }>()

function getCached(key: string): number | null {
  const hit = cache.get(key)
  if (!hit) return null
  if (Date.now() - hit.ts > CACHE_TTL_MS) {
    cache.delete(key)
    return null
  }
  return hit.value
}

function setCached(key: string, value: number) {
  cache.set(key, { value, ts: Date.now() })
}

// ─── CRIPTO ───────────────────────────────────────────────────────────
// Mapeamento de tickers/símbolos comuns pra IDs CoinGecko.
// IDs completas: https://api.coingecko.com/api/v3/coins/list
export const CRIPTO_TICKER_TO_ID: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  USDT: 'tether',
  USDC: 'usd-coin',
  BNB: 'binancecoin',
  SOL: 'solana',
  XRP: 'ripple',
  ADA: 'cardano',
  DOGE: 'dogecoin',
  TRX: 'tron',
  AVAX: 'avalanche-2',
  DOT: 'polkadot',
  LINK: 'chainlink',
  MATIC: 'matic-network',
  POL: 'matic-network',  // novo nome do MATIC
  LTC: 'litecoin',
  SHIB: 'shiba-inu',
  ATOM: 'cosmos',
  XLM: 'stellar',
  UNI: 'uniswap',
  ETC: 'ethereum-classic',
  XMR: 'monero',
  HBAR: 'hedera-hashgraph',
  ALGO: 'algorand',
  FIL: 'filecoin',
  NEAR: 'near',
  APT: 'aptos',
  ARB: 'arbitrum',
  OP: 'optimism',
}

export function getCriptoIdFromTicker(ticker: string): string | null {
  const upper = ticker.trim().toUpperCase()
  return CRIPTO_TICKER_TO_ID[upper] ?? null
}

/**
 * Busca cotação de uma cripto em BRL via CoinGecko.
 * @param ticker  Símbolo (BTC, ETH, etc) ou ID CoinGecko (bitcoin, ethereum)
 * @returns       Cotação em BRL, ou null em caso de erro/cripto desconhecida
 */
export async function fetchCotacaoCripto(ticker: string): Promise<number | null> {
  const upper = ticker.trim().toUpperCase()
  // Aceita tanto ticker (BTC) quanto ID CoinGecko (bitcoin, ethereum)
  const id = CRIPTO_TICKER_TO_ID[upper] ?? ticker.trim().toLowerCase()
  const cacheKey = `cripto:${id}`
  const cached = getCached(cacheKey)
  if (cached !== null) return cached

  try {
    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=brl`)
    if (!res.ok) return null
    const json = await res.json() as Record<string, { brl?: number }>
    const value = json[id]?.brl
    if (typeof value !== 'number') return null
    setCached(cacheKey, value)
    return value
  } catch {
    return null
  }
}

// ─── AÇÕES / FIIS / ETFS — Brapi.dev ─────────────────────────────────
// Brapi exige token (free 1000 req/dia em brapi.dev). Token é resolvido
// dinamicamente via getBrapiToken() do useAppConfig pra não criar
// dependência circular import.

let _brapiTokenGetter: (() => Promise<string>) | null = null
export function registerBrapiTokenGetter(fn: () => Promise<string>) {
  _brapiTokenGetter = fn
}

async function getBrapiTokenSafe(): Promise<string> {
  try {
    if (_brapiTokenGetter) return await _brapiTokenGetter()
  } catch { /* noop */ }
  return ''
}

/**
 * Busca cotação de ativo da B3 em BRL.
 * @param ticker  Símbolo do ativo (PETR4, HGLG11, BOVA11, etc)
 * @returns       Cotação em BRL, ou null se erro/sem token
 */
export async function fetchCotacaoAtivoBR(ticker: string): Promise<number | null> {
  const upper = ticker.trim().toUpperCase()
  if (!upper) return null
  const cacheKey = `b3:${upper}`
  const cached = getCached(cacheKey)
  if (cached !== null) return cached

  const token = await getBrapiTokenSafe()
  if (!token) return null  // sem token, Brapi retorna 401

  try {
    const res = await fetch(`https://brapi.dev/api/quote/${upper}?range=1d&interval=1d&token=${encodeURIComponent(token)}`)
    if (!res.ok) return null
    const json = await res.json() as { results?: Array<{ regularMarketPrice?: number }> }
    const value = json.results?.[0]?.regularMarketPrice
    if (typeof value !== 'number') return null
    setCached(cacheKey, value)
    return value
  } catch {
    return null
  }
}

// ─── Câmbio USD/BRL ──────────────────────────────────────────────────
/**
 * Busca cotação do dólar comercial em BRL via Brapi.
 * Tenta Brapi (com token) primeiro; se falhar, faz fallback em AwesomeAPI
 * (gratuita, sem token, CORS aberto).
 * @returns Cotação USD→BRL, ou null
 */
export async function fetchCotacaoDolar(): Promise<number | null> {
  const cacheKey = 'fx:usdbrl'
  const cached = getCached(cacheKey)
  if (cached !== null) return cached

  // 1. Tenta Brapi (se houver token)
  const token = await getBrapiTokenSafe()
  if (token) {
    try {
      const res = await fetch(`https://brapi.dev/api/v2/currency?currency=USD-BRL&token=${encodeURIComponent(token)}`)
      if (res.ok) {
        const json = await res.json() as { currency?: Array<{ bidPrice?: string | number }> }
        const raw = json.currency?.[0]?.bidPrice
        const value = typeof raw === 'string' ? parseFloat(raw) : raw
        if (typeof value === 'number' && !isNaN(value)) {
          setCached(cacheKey, value)
          return value
        }
      }
    } catch { /* tenta fallback */ }
  }

  // 2. Fallback: AwesomeAPI (gratuita, sem auth, CORS ok)
  try {
    const res = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL')
    if (!res.ok) return null
    const json = await res.json() as Record<string, { bid?: string }>
    const raw = json.USDBRL?.bid
    const value = raw ? parseFloat(raw) : null
    if (value === null || isNaN(value)) return null
    setCached(cacheKey, value)
    return value
  } catch {
    return null
  }
}

// ─── Roteador genérico por tipo de investimento ──────────────────────
import type { InvestimentoTipo } from '@/db/schema'

/**
 * Busca a cotação atual de um ativo baseado em tipo + ticker.
 * Retorna null se tipo não tem API ou ticker é inválido.
 */
export async function fetchCotacaoPorTipo(tipo: InvestimentoTipo, ticker: string | undefined): Promise<number | null> {
  if (!ticker || !ticker.trim()) return null
  if (tipo === 'Cripto') return fetchCotacaoCripto(ticker)
  if (tipo === 'Ação' || tipo === 'FII' || tipo === 'ETF') return fetchCotacaoAtivoBR(ticker)
  return null
}

// Limpa cache (útil pra forçar refetch — chamado por "Atualizar tudo")
export function clearCotacoesCache() {
  cache.clear()
}

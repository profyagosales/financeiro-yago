// ─── Config das tabelas que sincronizam ──────────────────────────────
// Define ordem topológica (dependências de FK) + nomes locais ↔ remotos +
// campos FK pra remapear (local_id ↔ uuid).

import { db } from '@/db/schema'
import type { Table } from 'dexie'

export interface TableConfig {
  // Nome da tabela no Dexie (Snake/camel já como está no app)
  localTable: string
  // Nome equivalente no Supabase (snake_case)
  remoteTable: string
  // Acesso ao Table object do Dexie
  dexie: () => Table
  // Lista de campos que são FKs pra outras tabelas locais
  // Mapeia: nome do campo local → nome da tabela local
  fks: Record<string, string>
  // Skip de campos que NÃO devem ir pro Supabase (ex: syncId legado)
  skipFields?: string[]
  // Coluna(s) de conflito pro upsert. Default: 'id' (PK). Use quando a
  // tabela tem unique secondary que DEVE ser respeitado no merge.
  // Ex: app_config tem unique (user_id, key) — segundo device cria mesma
  // key local e o upsert por 'id' falha com 23505 sem isso.
  onConflictColumn?: string
}

// (Doc histórico — substituído por SYNC_TABLES_ORDERED no final do arquivo,
// que é o que push/pull realmente usam. Mantido só pra ler ordem topológica
// rapidamente em revisões.)

export const TABLES: Record<string, TableConfig> = {
  categorias: {
    localTable: 'categorias',
    remoteTable: 'categorias',
    dexie: () => db.categorias,
    fks: {},
  },
  contas: {
    localTable: 'contas',
    remoteTable: 'contas',
    dexie: () => db.contas,
    fks: {},
  },
  cartoes: {
    localTable: 'cartoes',
    remoteTable: 'cartoes',
    dexie: () => db.cartoes,
    fks: {},
  },
  metas: {
    localTable: 'metas',
    remoteTable: 'metas',
    dexie: () => db.metas,
    fks: {},
  },
  appConfig: {
    localTable: 'appConfig',
    remoteTable: 'app_config',
    dexie: () => db.appConfig,
    fks: {},
    // unique (user_id, key) — vários devices criam mesma key (ex: 'app_preferences')
    // localmente. Sem isso, segundo device falha com 23505 toda vez.
    onConflictColumn: 'user_id,key',
  },
  transacoes: {
    localTable: 'transacoes',
    remoteTable: 'transacoes',
    dexie: () => db.transacoes,
    fks: { contaId: 'contas', categoriaId: 'categorias' },
  },
  lancamentosCartao: {
    localTable: 'lancamentosCartao',
    remoteTable: 'lancamentos_cartao',
    dexie: () => db.lancamentosCartao,
    fks: { cartaoId: 'cartoes', categoriaId: 'categorias', parcelaPaiId: 'lancamentosCartao' },
  },
  contasFixas: {
    localTable: 'contasFixas',
    remoteTable: 'contas_fixas',
    dexie: () => db.contasFixas,
    fks: { categoriaId: 'categorias', contaId: 'contas', cartaoId: 'cartoes' },
  },
  pagamentosFixos: {
    localTable: 'pagamentosFixos',
    remoteTable: 'pagamentos_fixos',
    dexie: () => db.pagamentosFixos,
    fks: { contaFixaId: 'contasFixas' },
  },
  orcamentos: {
    localTable: 'orcamentos',
    remoteTable: 'orcamentos',
    dexie: () => db.orcamentos,
    fks: { categoriaId: 'categorias' },
  },
  investimentos: {
    localTable: 'investimentos',
    remoteTable: 'investimentos',
    dexie: () => db.investimentos,
    fks: { metaId: 'metas' },
  },
  investimentosAportes: {
    localTable: 'investimentosAportes',
    remoteTable: 'investimentos_aportes',
    dexie: () => db.investimentosAportes,
    fks: { investimentoId: 'investimentos' },
  },
  investimentosProventos: {
    localTable: 'investimentosProventos',
    remoteTable: 'investimentos_proventos',
    dexie: () => db.investimentosProventos,
    fks: { investimentoId: 'investimentos' },
  },
  investimentosMovimentacoes: {
    localTable: 'investimentosMovimentacoes',
    remoteTable: 'investimentos_movimentacoes',
    dexie: () => db.investimentosMovimentacoes,
    fks: { investimentoId: 'investimentos' },
  },
  dividas: {
    localTable: 'dividas',
    remoteTable: 'dividas',
    dexie: () => db.dividas,
    fks: { contaFixaId: 'contasFixas', categoriaId: 'categorias' },
  },
  dividasMovimentacoes: {
    localTable: 'dividasMovimentacoes',
    remoteTable: 'dividas_movimentacoes',
    dexie: () => db.dividasMovimentacoes,
    fks: { dividaId: 'dividas' },
  },
  desejos: {
    localTable: 'desejos',
    remoteTable: 'desejos',
    dexie: () => db.desejos,
    fks: { categoriaId: 'categorias', transacaoId: 'transacoes' },
  },
  anexos: {
    localTable: 'anexos',
    remoteTable: 'anexos',
    dexie: () => db.anexos,
    fks: { transacaoId: 'transacoes' },
    // 'dados' (blob base64) é grande demais — vai pro Storage na Fase 4
    skipFields: ['dados'],
  },
}

// Ordem final filtrada (só tabelas que realmente existem no TABLES map).
//
// R12f: appConfig REMOVIDO do sync. Histórico:
// - R9 tentou usar pra cross-device cache de lastDolar → bug crítico
//   (unique constraint &key violation em pull → corrompia optimisticOps)
// - R12b moveu lastDolar pra localStorage; appConfig ficou sem uso real
// - Sync continuava enviando rows legacy lastDolar com id=null → 400
//   "null value in column id" repetidamente
// - Solução: tirar appConfig do sync inteiro. Local-only.
// Migration R12 limpa rows legacy. Se você precisar de prefs cross-device
// no futuro, use estrutura diferente (talvez tabela própria com schema
// alinhado, ou Storage Supabase pra JSON pequeno).
export const SYNC_TABLES_ORDERED: string[] = [
  'categorias', 'contas', 'cartoes', 'metas',
  'orcamentos', 'transacoes', 'lancamentosCartao', 'contasFixas', 'investimentos',
  'pagamentosFixos', 'investimentosAportes', 'investimentosProventos', 'investimentosMovimentacoes', 'dividas',
  'desejos',
  'dividasMovimentacoes', 'anexos',
]

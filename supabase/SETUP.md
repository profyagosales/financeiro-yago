# Supabase — Financeiro do Yago

## ✅ Status: configurado e pronto

Backend rodando em **São Paulo (sa-east-1)**.

| Item | Status |
|---|---|
| Projeto Supabase | ✅ `ynidumrinncdqdukvpfa` (São Paulo) |
| 19 tabelas + RLS owner-only | ✅ Todas com `(select auth.uid()) = user_id` |
| Triggers automáticos | ✅ `set_user_id` + `set_updated_at` (search_path locked) |
| Índices em FKs | ✅ Todos cobertos |
| Bucket `anexos` | ✅ Privado, 10 MB max, image+pdf only |
| Storage RLS policies | ✅ 4 policies (select/insert/update/delete) por dono |
| Security advisor | ✅ Zero warnings |

## Tabelas

```
contas                       investimentos                 desejos
categorias                   investimentos_aportes         orcamentos
transacoes                   investimentos_proventos       app_config
cartoes                      investimentos_movimentacoes   anexos
lancamentos_cartao           dividas                       push_subscriptions
contas_fixas                 dividas_movimentacoes
pagamentos_fixos             metas
```

Cada tabela tem:
- `id uuid` (gerado client-side via `crypto.randomUUID`)
- `user_id uuid` (preenchido por trigger)
- `local_id integer` (mapeia pro id do IndexedDB)
- `updated_at timestamptz` (LWW conflict resolution)
- `deleted boolean` (soft delete pra sync)
- RLS: `(select auth.uid()) = user_id` (perf-optimized)

## Variáveis de ambiente

Defaults em `src/lib/supabase.ts`:
- URL: `https://ynidumrinncdqdukvpfa.supabase.co`
- Anon key: hardcoded fallback (válida até 2096)

Pra usar projeto próprio, defina `.env.local`:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Migrações aplicadas (via MCP)

| Versão | Nome |
|---|---|
| 20260521000201 | create_financeiro_yago_schema (legacy) |
| 20260524021617 | drop_legacy_tables |
| 20260524021733 | schema_initial_v2 (19 tabelas + RLS) |
| 20260524021754 | storage_anexos_bucket |
| 20260524021917 | harden_trigger_functions |
| 20260524022035 | perf_rls_select_and_fk_indexes |

## Próximas fases (a implementar no client)

- **Fase 2**: Auth UI (tela login email + PIN, store de sessão)
- **Fase 3**: Sync engine (push debounced, pull periódico, realtime)
- **Fase 4**: Storage de anexos (mover blob IndexedDB → Storage upload)
- **Fase 5**: Edge Function `notify-pending` com cron diário (Web Push real)

## Auth setup (verificar no painel)

Email magic link já vem habilitado por padrão. Confira em:
**Authentication → Providers → Email** → deve estar ✅

Em **URL Configuration**, adicione URLs de redirect:
- `http://localhost:5173` (dev)
- URL de produção (Vercel)

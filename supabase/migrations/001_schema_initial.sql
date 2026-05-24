-- ═══════════════════════════════════════════════════════════════════
-- Financeiro do Yago — Schema inicial (Supabase)
-- ═══════════════════════════════════════════════════════════════════
--
-- Rode este SQL no painel do Supabase em SQL Editor → New query.
-- Cria todas as tabelas necessárias + RLS (cada user só vê seus dados).
--
-- Convenção:
--   - id        : uuid (gerado client-side com crypto.randomUUID)
--   - user_id   : uuid REFERENCES auth.users (preenchido por trigger)
--   - updated_at: timestamptz (LWW conflict resolution)
--   - deleted   : boolean (soft delete pra sync funcionar)
--
-- ═══════════════════════════════════════════════════════════════════

-- ─── Função reutilizável: preenche user_id no INSERT ────────────────
create or replace function set_user_id()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;
  return new;
end;
$$;

-- ─── Função reutilizável: atualiza updated_at ──────────────────────
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ═══ Tabela: contas ═══
create table if not exists public.contas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users on delete cascade,
  local_id    integer,
  nome        text not null,
  tipo        text not null,
  saldo_atual numeric default 0,
  cor         text,
  logo        text,
  ativo       boolean default true,
  deleted     boolean default false,
  updated_at  timestamptz default now(),
  created_at  timestamptz default now()
);

create index if not exists idx_contas_user on public.contas(user_id);
create index if not exists idx_contas_updated on public.contas(user_id, updated_at desc);

create trigger contas_set_user before insert on public.contas
  for each row execute function set_user_id();
create trigger contas_set_updated before update on public.contas
  for each row execute function set_updated_at();

alter table public.contas enable row level security;
create policy "contas_owner" on public.contas
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ═══ Tabela: categorias ═══
create table if not exists public.categorias (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users on delete cascade,
  local_id   integer,
  nome       text not null,
  tipo       text not null,
  cor        text,
  icone      text,
  deleted    boolean default false,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

create index if not exists idx_categorias_user on public.categorias(user_id);

create trigger categorias_set_user before insert on public.categorias
  for each row execute function set_user_id();
create trigger categorias_set_updated before update on public.categorias
  for each row execute function set_updated_at();

alter table public.categorias enable row level security;
create policy "categorias_owner" on public.categorias
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ═══ Tabela: transacoes ═══
create table if not exists public.transacoes (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users on delete cascade,
  local_id       integer,
  data           date not null,
  valor          numeric not null,
  tipo           text not null,
  conta_id       uuid references public.contas on delete set null,
  categoria_id   uuid references public.categorias on delete set null,
  descricao      text,
  status         text default 'confirmado',
  recorrencia    text default 'unica',
  transfer_id    text,
  tags           text[],
  notas          text,
  deleted        boolean default false,
  updated_at     timestamptz default now(),
  created_at     timestamptz default now()
);

create index if not exists idx_transacoes_user on public.transacoes(user_id);
create index if not exists idx_transacoes_data on public.transacoes(user_id, data desc);

create trigger transacoes_set_user before insert on public.transacoes
  for each row execute function set_user_id();
create trigger transacoes_set_updated before update on public.transacoes
  for each row execute function set_updated_at();

alter table public.transacoes enable row level security;
create policy "transacoes_owner" on public.transacoes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ═══ Tabela: cartoes ═══
create table if not exists public.cartoes (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users on delete cascade,
  local_id        integer,
  nome            text not null,
  bandeira        text,
  limite          numeric default 0,
  dia_fechamento  integer,
  dia_vencimento  integer,
  cor             text,
  logo            text,
  ativo           boolean default true,
  deleted         boolean default false,
  updated_at      timestamptz default now(),
  created_at      timestamptz default now()
);

create index if not exists idx_cartoes_user on public.cartoes(user_id);

create trigger cartoes_set_user before insert on public.cartoes
  for each row execute function set_user_id();
create trigger cartoes_set_updated before update on public.cartoes
  for each row execute function set_updated_at();

alter table public.cartoes enable row level security;
create policy "cartoes_owner" on public.cartoes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ═══ Tabela: lancamentos_cartao ═══
create table if not exists public.lancamentos_cartao (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users on delete cascade,
  local_id        integer,
  cartao_id       uuid references public.cartoes on delete cascade,
  descricao       text,
  valor           numeric not null,
  data            date not null,
  categoria_id    uuid references public.categorias on delete set null,
  parcela_atual   integer default 1,
  total_parcelas  integer default 1,
  parcela_pai_id  uuid,
  mes             integer,
  ano             integer,
  deleted         boolean default false,
  updated_at      timestamptz default now(),
  created_at      timestamptz default now()
);

create index if not exists idx_lanc_user on public.lancamentos_cartao(user_id);
create index if not exists idx_lanc_cartao_periodo on public.lancamentos_cartao(cartao_id, ano, mes);

create trigger lanc_set_user before insert on public.lancamentos_cartao
  for each row execute function set_user_id();
create trigger lanc_set_updated before update on public.lancamentos_cartao
  for each row execute function set_updated_at();

alter table public.lancamentos_cartao enable row level security;
create policy "lanc_owner" on public.lancamentos_cartao
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ═══ Tabela: contas_fixas ═══
create table if not exists public.contas_fixas (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users on delete cascade,
  local_id          integer,
  nome              text not null,
  valor             numeric not null,
  dia_vencimento    integer,
  categoria_id      uuid references public.categorias on delete set null,
  conta_id          uuid references public.contas on delete set null,
  cartao_id         uuid references public.cartoes on delete set null,
  recorrencia       text default 'mensal',
  alerta_dias_antes integer default 3,
  ativo             boolean default true,
  deleted           boolean default false,
  updated_at        timestamptz default now(),
  created_at        timestamptz default now()
);

create index if not exists idx_fixas_user on public.contas_fixas(user_id);

create trigger fixas_set_user before insert on public.contas_fixas
  for each row execute function set_user_id();
create trigger fixas_set_updated before update on public.contas_fixas
  for each row execute function set_updated_at();

alter table public.contas_fixas enable row level security;
create policy "fixas_owner" on public.contas_fixas
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ═══ Tabela: pagamentos_fixos ═══
create table if not exists public.pagamentos_fixos (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users on delete cascade,
  local_id        integer,
  conta_fixa_id   uuid references public.contas_fixas on delete cascade,
  mes             integer,
  ano             integer,
  status          text default 'pendente',
  data_pagamento  date,
  valor           numeric,
  deleted         boolean default false,
  updated_at      timestamptz default now(),
  created_at      timestamptz default now()
);

create index if not exists idx_pagfix_user on public.pagamentos_fixos(user_id);
create index if not exists idx_pagfix_periodo on public.pagamentos_fixos(conta_fixa_id, ano, mes);

create trigger pagfix_set_user before insert on public.pagamentos_fixos
  for each row execute function set_user_id();
create trigger pagfix_set_updated before update on public.pagamentos_fixos
  for each row execute function set_updated_at();

alter table public.pagamentos_fixos enable row level security;
create policy "pagfix_owner" on public.pagamentos_fixos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ═══ Tabela: metas ═══
create table if not exists public.metas (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users on delete cascade,
  local_id            integer,
  nome                text not null,
  tipo                text,
  valor_alvo          numeric not null,
  valor_atual         numeric default 0,
  prazo               date,
  cor                 text,
  icone               text,
  meses_cobertura     integer,
  alvo_auto_calculado boolean,
  ativo               boolean default true,
  deleted             boolean default false,
  updated_at          timestamptz default now(),
  created_at          timestamptz default now()
);

create index if not exists idx_metas_user on public.metas(user_id);

create trigger metas_set_user before insert on public.metas
  for each row execute function set_user_id();
create trigger metas_set_updated before update on public.metas
  for each row execute function set_updated_at();

alter table public.metas enable row level security;
create policy "metas_owner" on public.metas
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ═══ Tabela: orcamentos ═══
create table if not exists public.orcamentos (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users on delete cascade,
  local_id      integer,
  categoria_id  uuid references public.categorias on delete cascade,
  valor_limite  numeric not null,
  periodo       text default 'mensal',
  rollover      boolean default false,
  deleted       boolean default false,
  updated_at    timestamptz default now(),
  created_at    timestamptz default now()
);

create index if not exists idx_orc_user on public.orcamentos(user_id);

create trigger orc_set_user before insert on public.orcamentos
  for each row execute function set_user_id();
create trigger orc_set_updated before update on public.orcamentos
  for each row execute function set_updated_at();

alter table public.orcamentos enable row level security;
create policy "orc_owner" on public.orcamentos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ═══ Tabela: investimentos ═══
create table if not exists public.investimentos (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid references auth.users on delete cascade,
  local_id                 integer,
  nome                     text not null,
  tipo                     text not null,
  instituicao              text,
  valor_aplicado           numeric default 0,
  valor_atual              numeric default 0,
  valor_atual_source       text default 'manual',
  rentabilidade_anual      numeric,
  benchmark                text,
  liquidez                 text,
  data_aplicacao           date,
  data_vencimento          date,
  meta_id                  uuid references public.metas on delete set null,
  cor                      text,
  icone                    text,
  ultima_atualizacao_auto  bigint,
  tipo_rendimento          text,
  percentual_indexador     numeric,
  taxa_adicional           numeric,
  quantidade               numeric,
  preco_medio              numeric,
  cotacao_atual            numeric,
  ticker                   text,
  moeda                    text default 'BRL',
  ativo                    boolean default true,
  deleted                  boolean default false,
  updated_at               timestamptz default now(),
  created_at               timestamptz default now()
);

create index if not exists idx_invest_user on public.investimentos(user_id);

create trigger invest_set_user before insert on public.investimentos
  for each row execute function set_user_id();
create trigger invest_set_updated before update on public.investimentos
  for each row execute function set_updated_at();

alter table public.investimentos enable row level security;
create policy "invest_owner" on public.investimentos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ═══ Tabela: investimentos_aportes ═══
create table if not exists public.investimentos_aportes (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users on delete cascade,
  local_id          integer,
  investimento_id   uuid references public.investimentos on delete cascade,
  data              date not null,
  quantidade        numeric not null,
  preco_unitario    numeric not null,
  custos            numeric,
  observacao        text,
  deleted           boolean default false,
  updated_at        timestamptz default now(),
  created_at        timestamptz default now()
);

create index if not exists idx_aport_user on public.investimentos_aportes(user_id);

create trigger aport_set_user before insert on public.investimentos_aportes
  for each row execute function set_user_id();
create trigger aport_set_updated before update on public.investimentos_aportes
  for each row execute function set_updated_at();

alter table public.investimentos_aportes enable row level security;
create policy "aport_owner" on public.investimentos_aportes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ═══ Tabela: investimentos_proventos ═══
create table if not exists public.investimentos_proventos (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users on delete cascade,
  local_id          integer,
  investimento_id   uuid references public.investimentos on delete cascade,
  data              date not null,
  valor             numeric not null,
  tipo              text not null,
  observacao        text,
  deleted           boolean default false,
  updated_at        timestamptz default now(),
  created_at        timestamptz default now()
);

create index if not exists idx_prov_user on public.investimentos_proventos(user_id);

create trigger prov_set_user before insert on public.investimentos_proventos
  for each row execute function set_user_id();
create trigger prov_set_updated before update on public.investimentos_proventos
  for each row execute function set_updated_at();

alter table public.investimentos_proventos enable row level security;
create policy "prov_owner" on public.investimentos_proventos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ═══ Tabela: investimentos_movimentacoes (vendas/resgates) ═══
create table if not exists public.investimentos_movimentacoes (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users on delete cascade,
  local_id          integer,
  investimento_id   uuid references public.investimentos on delete cascade,
  data              date not null,
  tipo              text not null,
  quantidade        numeric,
  preco_unitario    numeric,
  valor_resgate     numeric,
  custos            numeric,
  pm_na_data        numeric,
  resultado         numeric,
  observacao        text,
  deleted           boolean default false,
  updated_at        timestamptz default now(),
  created_at        timestamptz default now()
);

create index if not exists idx_invmov_user on public.investimentos_movimentacoes(user_id);

create trigger invmov_set_user before insert on public.investimentos_movimentacoes
  for each row execute function set_user_id();
create trigger invmov_set_updated before update on public.investimentos_movimentacoes
  for each row execute function set_updated_at();

alter table public.investimentos_movimentacoes enable row level security;
create policy "invmov_owner" on public.investimentos_movimentacoes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ═══ Tabela: dividas ═══
create table if not exists public.dividas (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users on delete cascade,
  local_id          integer,
  nome              text not null,
  tipo              text not null,
  instituicao       text,
  valor_total       numeric not null,
  valor_pago        numeric default 0,
  valor_parcela     numeric,
  parcelas_total    integer,
  parcelas_pagas    integer default 0,
  juros_anual       numeric,
  data_inicio       date,
  dia_vencimento    integer,
  conta_fixa_id     uuid references public.contas_fixas on delete set null,
  categoria_id      uuid references public.categorias on delete set null,
  cor               text,
  ativo             boolean default true,
  deleted           boolean default false,
  updated_at        timestamptz default now(),
  created_at        timestamptz default now()
);

create index if not exists idx_dividas_user on public.dividas(user_id);

create trigger dividas_set_user before insert on public.dividas
  for each row execute function set_user_id();
create trigger dividas_set_updated before update on public.dividas
  for each row execute function set_updated_at();

alter table public.dividas enable row level security;
create policy "dividas_owner" on public.dividas
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ═══ Tabela: dividas_movimentacoes ═══
create table if not exists public.dividas_movimentacoes (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users on delete cascade,
  local_id        integer,
  divida_id       uuid references public.dividas on delete cascade,
  data            date not null,
  tipo            text not null,
  valor           numeric not null,
  reduz_parcelas  integer,
  observacao      text,
  deleted         boolean default false,
  updated_at      timestamptz default now(),
  created_at      timestamptz default now()
);

create index if not exists idx_dividmov_user on public.dividas_movimentacoes(user_id);

create trigger dividmov_set_user before insert on public.dividas_movimentacoes
  for each row execute function set_user_id();
create trigger dividmov_set_updated before update on public.dividas_movimentacoes
  for each row execute function set_updated_at();

alter table public.dividas_movimentacoes enable row level security;
create policy "dividmov_owner" on public.dividas_movimentacoes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ═══ Tabela: desejos ═══
create table if not exists public.desejos (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid references auth.users on delete cascade,
  local_id                 integer,
  nome                     text not null,
  descricao                text,
  prioridade               text default 'media',
  valor_estimado           numeric,
  valor_menor_encontrado   numeric,
  link                     text,
  observacoes              text,
  categoria_id             uuid references public.categorias on delete set null,
  status                   text default 'aberto',
  data_desejo              date,
  data_compra              date,
  transacao_id             uuid references public.transacoes on delete set null,
  deleted                  boolean default false,
  updated_at               timestamptz default now(),
  created_at               timestamptz default now()
);

create index if not exists idx_desejos_user on public.desejos(user_id);

create trigger desejos_set_user before insert on public.desejos
  for each row execute function set_user_id();
create trigger desejos_set_updated before update on public.desejos
  for each row execute function set_updated_at();

alter table public.desejos enable row level security;
create policy "desejos_owner" on public.desejos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ═══ Tabela: app_config (key-value preferências) ═══
create table if not exists public.app_config (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users on delete cascade,
  key         text not null,
  value       jsonb,
  updated_at  timestamptz default now(),
  created_at  timestamptz default now(),
  unique (user_id, key)
);

create index if not exists idx_config_user on public.app_config(user_id);

create trigger config_set_user before insert on public.app_config
  for each row execute function set_user_id();
create trigger config_set_updated before update on public.app_config
  for each row execute function set_updated_at();

alter table public.app_config enable row level security;
create policy "config_owner" on public.app_config
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ═══ Tabela: anexos (metadados — arquivos vão pro Storage) ═══
create table if not exists public.anexos (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users on delete cascade,
  local_id        integer,
  transacao_id    uuid references public.transacoes on delete cascade,
  tipo            text,
  nome_arquivo    text,
  storage_path    text,    -- caminho no bucket Supabase Storage
  tamanho         integer,
  criado_em       timestamptz default now(),
  deleted         boolean default false,
  updated_at      timestamptz default now()
);

create index if not exists idx_anexos_user on public.anexos(user_id);
create index if not exists idx_anexos_tx on public.anexos(transacao_id);

create trigger anexos_set_user before insert on public.anexos
  for each row execute function set_user_id();
create trigger anexos_set_updated before update on public.anexos
  for each row execute function set_updated_at();

alter table public.anexos enable row level security;
create policy "anexos_owner" on public.anexos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ═══ Tabela: push_subscriptions (notificações reais) ═══
create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users on delete cascade,
  endpoint    text not null,
  p256dh      text not null,
  auth        text not null,
  device_name text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique (user_id, endpoint)
);

create index if not exists idx_pushsub_user on public.push_subscriptions(user_id);

create trigger pushsub_set_user before insert on public.push_subscriptions
  for each row execute function set_user_id();
create trigger pushsub_set_updated before update on public.push_subscriptions
  for each row execute function set_updated_at();

alter table public.push_subscriptions enable row level security;
create policy "pushsub_owner" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ═══ Storage: bucket pra anexos ═══
-- Rode separadamente em SQL Editor após criar o bucket no painel:
--
-- insert into storage.buckets (id, name, public) values ('anexos', 'anexos', false);
--
-- create policy "anexos_owner_select" on storage.objects
--   for select using (bucket_id = 'anexos' and auth.uid()::text = (storage.foldername(name))[1]);
--
-- create policy "anexos_owner_insert" on storage.objects
--   for insert with check (bucket_id = 'anexos' and auth.uid()::text = (storage.foldername(name))[1]);
--
-- create policy "anexos_owner_delete" on storage.objects
--   for delete using (bucket_id = 'anexos' and auth.uid()::text = (storage.foldername(name))[1]);


-- ═══ Done ═══
-- Verifique no painel: Tables → todas devem aparecer com RLS habilitado (🔒)

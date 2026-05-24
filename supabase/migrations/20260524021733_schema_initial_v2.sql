-- ─────────────────────────────────────────────────────────────────────
-- Financeiro do Yago — Schema completo (snapshot 2026-05-24)
-- ─────────────────────────────────────────────────────────────────────
-- Gerado via dump do banco production em ynidumrinncdqdukvpfa.
-- 19 tabelas, todas com RLS owner-only ((select auth.uid()) = user_id).
-- Triggers automáticos por tabela:
--   set_user_id (BEFORE INSERT) — auth.uid() default, SECURITY DEFINER
--   set_updated_at (BEFORE UPDATE) — refresh updated_at se NULL ou igual
--
-- Idempotente: usa CREATE * IF NOT EXISTS / DO $$ blocks.
-- Pode ser reaplicado sem erros sobre schema já existente.
-- ─────────────────────────────────────────────────────────────────────

-- ── EXTENSÕES NECESSÁRIAS ────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;       -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pg_cron;        -- agenda notify-pending diariamente
CREATE EXTENSION IF NOT EXISTS pg_net;         -- supabase_functions.http_request

-- ── FUNCTIONS DE TRIGGER ─────────────────────────────────────────────
-- search_path lock: previne search_path injection (CVE-2018-1058 padrão).
-- SECURITY DEFINER em set_user_id pra acesso a auth.uid() em RLS context.

CREATE OR REPLACE FUNCTION public.set_user_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
begin
  if new.user_id is null then new.user_id := auth.uid(); end if;
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
begin
  if new.updated_at is null or new.updated_at = old.updated_at then
    new.updated_at := now();
  end if;
  return new;
end;
$$;

-- ── TABELAS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.categorias (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  local_id integer,
  nome text NOT NULL,
  tipo text NOT NULL,
  cor text,
  icone text,
  deleted boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  ordem integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.contas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  local_id integer,
  nome text NOT NULL,
  tipo text NOT NULL,
  saldo_atual numeric DEFAULT 0,
  cor text,
  logo text,
  ativo boolean DEFAULT true,
  deleted boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  saldo_inicial numeric DEFAULT 0,
  icone text,
  cheque_especial_limite numeric
);

CREATE TABLE IF NOT EXISTS public.cartoes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  local_id integer,
  nome text NOT NULL,
  bandeira text,
  limite numeric DEFAULT 0,
  dia_fechamento integer,
  dia_vencimento integer,
  cor text,
  logo text,
  ativo boolean DEFAULT true,
  deleted boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  titular text,
  ultimos_digitos text
);

CREATE TABLE IF NOT EXISTS public.metas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  local_id integer,
  nome text NOT NULL,
  tipo text,
  valor_alvo numeric NOT NULL,
  valor_atual numeric DEFAULT 0,
  prazo date,
  cor text,
  icone text,
  meses_cobertura integer,
  alvo_auto_calculado boolean,
  ativo boolean DEFAULT true,
  deleted boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.app_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  key text NOT NULL,
  value jsonb,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  local_id integer
);

CREATE TABLE IF NOT EXISTS public.orcamentos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  local_id integer,
  categoria_id uuid,
  valor_limite numeric NOT NULL,
  periodo text DEFAULT 'mensal'::text,
  rollover boolean DEFAULT false,
  deleted boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  inicio date,
  fim date
);

CREATE TABLE IF NOT EXISTS public.transacoes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  local_id integer,
  data date NOT NULL,
  valor numeric NOT NULL,
  tipo text NOT NULL,
  conta_id uuid,
  categoria_id uuid,
  descricao text,
  status text DEFAULT 'efetivada'::text,    -- canônico (era 'confirmado' legado)
  recorrencia text DEFAULT 'unica'::text,
  transfer_id text,
  tags text[],
  notas text,
  deleted boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lancamentos_cartao (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  local_id integer,
  cartao_id uuid,
  descricao text,
  valor numeric NOT NULL,
  data date NOT NULL,
  categoria_id uuid,
  parcela_atual integer DEFAULT 1,
  total_parcelas integer DEFAULT 1,
  parcela_pai_id uuid,
  mes integer,
  ano integer,
  deleted boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contas_fixas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  local_id integer,
  nome text NOT NULL,
  valor numeric NOT NULL,
  dia_vencimento integer,
  categoria_id uuid,
  conta_id uuid,
  cartao_id uuid,
  recorrencia text DEFAULT 'mensal'::text,
  alerta_dias_antes integer DEFAULT 3,
  ativo boolean DEFAULT true,
  deleted boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.investimentos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  local_id integer,
  nome text NOT NULL,
  tipo text NOT NULL,
  instituicao text,
  valor_aplicado numeric DEFAULT 0,
  valor_atual numeric DEFAULT 0,
  valor_atual_source text DEFAULT 'manual'::text,
  rentabilidade_anual numeric,
  benchmark text,
  liquidez text,
  data_aplicacao date,
  data_vencimento date,
  meta_id uuid,
  cor text,
  icone text,
  ultima_atualizacao_auto bigint,
  tipo_rendimento text,
  percentual_indexador numeric,
  taxa_adicional numeric,
  quantidade numeric,
  preco_medio numeric,
  cotacao_atual numeric,
  ticker text,
  moeda text DEFAULT 'BRL'::text,
  ativo boolean DEFAULT true,
  deleted boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pagamentos_fixos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  local_id integer,
  conta_fixa_id uuid,
  mes integer,
  ano integer,
  status text DEFAULT 'pendente'::text,
  data_pagamento date,
  valor numeric,
  deleted boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.investimentos_aportes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  local_id integer,
  investimento_id uuid,
  data date NOT NULL,
  quantidade numeric NOT NULL,
  preco_unitario numeric NOT NULL,
  custos numeric,
  observacao text,
  deleted boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.investimentos_proventos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  local_id integer,
  investimento_id uuid,
  data date NOT NULL,
  valor numeric NOT NULL,
  tipo text NOT NULL,
  observacao text,
  deleted boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.investimentos_movimentacoes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  local_id integer,
  investimento_id uuid,
  data date NOT NULL,
  tipo text NOT NULL,
  quantidade numeric,
  preco_unitario numeric,
  valor_resgate numeric,
  valor_aplicado_consumido numeric,  -- snapshot pra restaurar valorAplicado no delete (R4)
  custos numeric,
  pm_na_data numeric,
  resultado numeric,
  observacao text,
  deleted boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dividas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  local_id integer,
  nome text NOT NULL,
  tipo text NOT NULL,
  instituicao text,
  valor_total numeric NOT NULL,
  valor_pago numeric DEFAULT 0,
  valor_parcela numeric,
  parcelas_total integer,
  parcelas_pagas integer DEFAULT 0,
  juros_anual numeric,
  data_inicio date,
  dia_vencimento integer,
  conta_fixa_id uuid,
  categoria_id uuid,
  cor text,
  ativo boolean DEFAULT true,
  deleted boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.desejos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  local_id integer,
  nome text NOT NULL,
  descricao text,
  prioridade text DEFAULT 'media'::text,
  valor_estimado numeric,
  valor_menor_encontrado numeric,
  link text,
  observacoes text,
  categoria_id uuid,
  status text DEFAULT 'aberto'::text,
  data_desejo date,
  data_compra date,
  transacao_id uuid,
  deleted boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  cor text,
  icone text,
  imagem text
);

CREATE TABLE IF NOT EXISTS public.dividas_movimentacoes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  local_id integer,
  divida_id uuid,
  data date NOT NULL,
  tipo text NOT NULL,
  valor numeric NOT NULL,
  reduz_parcelas integer,
  observacao text,
  deleted boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.anexos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  local_id integer,
  transacao_id uuid,
  tipo text,
  nome_arquivo text,
  storage_path text,
  tamanho integer,
  criado_em timestamptz DEFAULT now(),
  deleted boolean DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  device_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ── PRIMARY KEYS ────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.categorias                ADD CONSTRAINT categorias_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.contas                    ADD CONSTRAINT contas_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.cartoes                   ADD CONSTRAINT cartoes_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.metas                     ADD CONSTRAINT metas_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.app_config                ADD CONSTRAINT app_config_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.app_config                ADD CONSTRAINT app_config_user_id_key_key UNIQUE (user_id, key);
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.orcamentos                ADD CONSTRAINT orcamentos_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.transacoes                ADD CONSTRAINT transacoes_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.lancamentos_cartao        ADD CONSTRAINT lancamentos_cartao_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.contas_fixas              ADD CONSTRAINT contas_fixas_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.investimentos             ADD CONSTRAINT investimentos_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.pagamentos_fixos          ADD CONSTRAINT pagamentos_fixos_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.investimentos_aportes     ADD CONSTRAINT investimentos_aportes_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.investimentos_proventos   ADD CONSTRAINT investimentos_proventos_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.investimentos_movimentacoes ADD CONSTRAINT investimentos_movimentacoes_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.dividas                   ADD CONSTRAINT dividas_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.desejos                   ADD CONSTRAINT desejos_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.dividas_movimentacoes     ADD CONSTRAINT dividas_movimentacoes_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.anexos                    ADD CONSTRAINT anexos_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.push_subscriptions        ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.push_subscriptions        ADD CONSTRAINT push_subscriptions_user_id_endpoint_key UNIQUE (user_id, endpoint);
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL; END $$;

-- ── FOREIGN KEYS ────────────────────────────────────────────────────
-- user_id FKs cascateiam DELETE quando o usuário é apagado.
-- FKs entre entidades: ON DELETE CASCADE pros filhos de aporte/provento/lanc/etc.
--                      ON DELETE SET NULL pra refs "opcionais" (categoria_id, conta_id em contas_fixas, etc).

DO $$ BEGIN
  ALTER TABLE public.categorias                ADD CONSTRAINT categorias_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.contas                    ADD CONSTRAINT contas_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.cartoes                   ADD CONSTRAINT cartoes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.metas                     ADD CONSTRAINT metas_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.app_config                ADD CONSTRAINT app_config_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.orcamentos                ADD CONSTRAINT orcamentos_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.orcamentos                ADD CONSTRAINT orcamentos_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.transacoes                ADD CONSTRAINT transacoes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.transacoes                ADD CONSTRAINT transacoes_conta_id_fkey FOREIGN KEY (conta_id) REFERENCES public.contas(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.transacoes                ADD CONSTRAINT transacoes_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.lancamentos_cartao        ADD CONSTRAINT lancamentos_cartao_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.lancamentos_cartao        ADD CONSTRAINT lancamentos_cartao_cartao_id_fkey FOREIGN KEY (cartao_id) REFERENCES public.cartoes(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.lancamentos_cartao        ADD CONSTRAINT lancamentos_cartao_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.contas_fixas              ADD CONSTRAINT contas_fixas_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.contas_fixas              ADD CONSTRAINT contas_fixas_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.contas_fixas              ADD CONSTRAINT contas_fixas_conta_id_fkey FOREIGN KEY (conta_id) REFERENCES public.contas(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.contas_fixas              ADD CONSTRAINT contas_fixas_cartao_id_fkey FOREIGN KEY (cartao_id) REFERENCES public.cartoes(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.investimentos             ADD CONSTRAINT investimentos_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.investimentos             ADD CONSTRAINT investimentos_meta_id_fkey FOREIGN KEY (meta_id) REFERENCES public.metas(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.pagamentos_fixos          ADD CONSTRAINT pagamentos_fixos_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.pagamentos_fixos          ADD CONSTRAINT pagamentos_fixos_conta_fixa_id_fkey FOREIGN KEY (conta_fixa_id) REFERENCES public.contas_fixas(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.investimentos_aportes     ADD CONSTRAINT investimentos_aportes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.investimentos_aportes     ADD CONSTRAINT investimentos_aportes_investimento_id_fkey FOREIGN KEY (investimento_id) REFERENCES public.investimentos(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.investimentos_proventos   ADD CONSTRAINT investimentos_proventos_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.investimentos_proventos   ADD CONSTRAINT investimentos_proventos_investimento_id_fkey FOREIGN KEY (investimento_id) REFERENCES public.investimentos(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.investimentos_movimentacoes ADD CONSTRAINT investimentos_movimentacoes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.investimentos_movimentacoes ADD CONSTRAINT investimentos_movimentacoes_investimento_id_fkey FOREIGN KEY (investimento_id) REFERENCES public.investimentos(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.dividas                   ADD CONSTRAINT dividas_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.dividas                   ADD CONSTRAINT dividas_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.dividas                   ADD CONSTRAINT dividas_conta_fixa_id_fkey FOREIGN KEY (conta_fixa_id) REFERENCES public.contas_fixas(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.dividas_movimentacoes     ADD CONSTRAINT dividas_movimentacoes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.dividas_movimentacoes     ADD CONSTRAINT dividas_movimentacoes_divida_id_fkey FOREIGN KEY (divida_id) REFERENCES public.dividas(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.desejos                   ADD CONSTRAINT desejos_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.desejos                   ADD CONSTRAINT desejos_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.desejos                   ADD CONSTRAINT desejos_transacao_id_fkey FOREIGN KEY (transacao_id) REFERENCES public.transacoes(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.anexos                    ADD CONSTRAINT anexos_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.anexos                    ADD CONSTRAINT anexos_transacao_id_fkey FOREIGN KEY (transacao_id) REFERENCES public.transacoes(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.push_subscriptions        ADD CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── INDEXES ─────────────────────────────────────────────────────────
-- (user_id + secondary lookups + (user_id, updated_at DESC) pra paginação rápida)
CREATE INDEX IF NOT EXISTS idx_categorias_user            ON public.categorias(user_id);
CREATE INDEX IF NOT EXISTS idx_contas_user                ON public.contas(user_id);
CREATE INDEX IF NOT EXISTS idx_contas_updated             ON public.contas(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_cartoes_user               ON public.cartoes(user_id);
CREATE INDEX IF NOT EXISTS idx_metas_user                 ON public.metas(user_id);
CREATE INDEX IF NOT EXISTS idx_config_user                ON public.app_config(user_id);
CREATE INDEX IF NOT EXISTS idx_orc_user                   ON public.orcamentos(user_id);
CREATE INDEX IF NOT EXISTS idx_orc_categoria              ON public.orcamentos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_user            ON public.transacoes(user_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_conta           ON public.transacoes(conta_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_categoria       ON public.transacoes(categoria_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_data            ON public.transacoes(user_id, data DESC);
CREATE INDEX IF NOT EXISTS idx_lanc_user                  ON public.lancamentos_cartao(user_id);
CREATE INDEX IF NOT EXISTS idx_lanc_cartao_periodo        ON public.lancamentos_cartao(cartao_id, ano, mes);
CREATE INDEX IF NOT EXISTS idx_lanc_categoria             ON public.lancamentos_cartao(categoria_id);
CREATE INDEX IF NOT EXISTS idx_fixas_user                 ON public.contas_fixas(user_id);
CREATE INDEX IF NOT EXISTS idx_fixas_categoria            ON public.contas_fixas(categoria_id);
CREATE INDEX IF NOT EXISTS idx_fixas_conta                ON public.contas_fixas(conta_id);
CREATE INDEX IF NOT EXISTS idx_fixas_cartao               ON public.contas_fixas(cartao_id);
CREATE INDEX IF NOT EXISTS idx_invest_user                ON public.investimentos(user_id);
CREATE INDEX IF NOT EXISTS idx_invest_meta                ON public.investimentos(meta_id);
CREATE INDEX IF NOT EXISTS idx_pagfix_user                ON public.pagamentos_fixos(user_id);
CREATE INDEX IF NOT EXISTS idx_pagfix_periodo             ON public.pagamentos_fixos(conta_fixa_id, ano, mes);
CREATE INDEX IF NOT EXISTS idx_aport_user                 ON public.investimentos_aportes(user_id);
CREATE INDEX IF NOT EXISTS idx_aport_investimento         ON public.investimentos_aportes(investimento_id);
CREATE INDEX IF NOT EXISTS idx_prov_user                  ON public.investimentos_proventos(user_id);
CREATE INDEX IF NOT EXISTS idx_prov_investimento          ON public.investimentos_proventos(investimento_id);
CREATE INDEX IF NOT EXISTS idx_invmov_user                ON public.investimentos_movimentacoes(user_id);
CREATE INDEX IF NOT EXISTS idx_invmov_investimento        ON public.investimentos_movimentacoes(investimento_id);
CREATE INDEX IF NOT EXISTS idx_dividas_user               ON public.dividas(user_id);
CREATE INDEX IF NOT EXISTS idx_dividas_categoria          ON public.dividas(categoria_id);
CREATE INDEX IF NOT EXISTS idx_dividas_conta_fixa         ON public.dividas(conta_fixa_id);
CREATE INDEX IF NOT EXISTS idx_dividmov_user              ON public.dividas_movimentacoes(user_id);
CREATE INDEX IF NOT EXISTS idx_dividmov_divida            ON public.dividas_movimentacoes(divida_id);
CREATE INDEX IF NOT EXISTS idx_desejos_user               ON public.desejos(user_id);
CREATE INDEX IF NOT EXISTS idx_desejos_categoria          ON public.desejos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_desejos_transacao          ON public.desejos(transacao_id);
CREATE INDEX IF NOT EXISTS idx_anexos_user                ON public.anexos(user_id);
CREATE INDEX IF NOT EXISTS idx_anexos_tx                  ON public.anexos(transacao_id);
CREATE INDEX IF NOT EXISTS idx_pushsub_user               ON public.push_subscriptions(user_id);

-- ── ROW LEVEL SECURITY ──────────────────────────────────────────────
-- Toda tabela: owner-only via (select auth.uid()) = user_id.
-- O `(select ...)` é otimizado (subplan único por query, não 1× por linha).

ALTER TABLE public.categorias                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cartoes                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metas                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_config                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orcamentos                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transacoes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lancamentos_cartao        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_fixas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investimentos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagamentos_fixos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investimentos_aportes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investimentos_proventos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investimentos_movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dividas                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dividas_movimentacoes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.desejos                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anexos                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions        ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY categorias_owner   ON public.categorias                FOR ALL TO public USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY contas_owner       ON public.contas                    FOR ALL TO public USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY cartoes_owner      ON public.cartoes                   FOR ALL TO public USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY metas_owner        ON public.metas                     FOR ALL TO public USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY config_owner       ON public.app_config                FOR ALL TO public USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY orc_owner          ON public.orcamentos                FOR ALL TO public USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY transacoes_owner   ON public.transacoes                FOR ALL TO public USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY lanc_owner         ON public.lancamentos_cartao        FOR ALL TO public USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY fixas_owner        ON public.contas_fixas              FOR ALL TO public USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY invest_owner       ON public.investimentos             FOR ALL TO public USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY pagfix_owner       ON public.pagamentos_fixos          FOR ALL TO public USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY aport_owner        ON public.investimentos_aportes     FOR ALL TO public USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY prov_owner         ON public.investimentos_proventos   FOR ALL TO public USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY invmov_owner       ON public.investimentos_movimentacoes FOR ALL TO public USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY dividas_owner      ON public.dividas                   FOR ALL TO public USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY dividmov_owner     ON public.dividas_movimentacoes     FOR ALL TO public USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY desejos_owner      ON public.desejos                   FOR ALL TO public USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY anexos_owner       ON public.anexos                    FOR ALL TO public USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY pushsub_owner      ON public.push_subscriptions        FOR ALL TO public USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── TRIGGERS POR TABELA ─────────────────────────────────────────────
-- set_user (INSERT) → injeta auth.uid() em user_id
-- set_updated (UPDATE) → refresh updated_at se NULL ou inalterado

DO $$ BEGIN CREATE TRIGGER categorias_set_user  BEFORE INSERT ON public.categorias                FOR EACH ROW EXECUTE FUNCTION public.set_user_id(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER categorias_set_updated BEFORE UPDATE ON public.categorias              FOR EACH ROW EXECUTE FUNCTION public.set_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER contas_set_user      BEFORE INSERT ON public.contas                    FOR EACH ROW EXECUTE FUNCTION public.set_user_id(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER contas_set_updated   BEFORE UPDATE ON public.contas                    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER cartoes_set_user     BEFORE INSERT ON public.cartoes                   FOR EACH ROW EXECUTE FUNCTION public.set_user_id(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER cartoes_set_updated  BEFORE UPDATE ON public.cartoes                   FOR EACH ROW EXECUTE FUNCTION public.set_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER metas_set_user       BEFORE INSERT ON public.metas                     FOR EACH ROW EXECUTE FUNCTION public.set_user_id(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER metas_set_updated    BEFORE UPDATE ON public.metas                     FOR EACH ROW EXECUTE FUNCTION public.set_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER config_set_user      BEFORE INSERT ON public.app_config                FOR EACH ROW EXECUTE FUNCTION public.set_user_id(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER config_set_updated   BEFORE UPDATE ON public.app_config                FOR EACH ROW EXECUTE FUNCTION public.set_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER orc_set_user         BEFORE INSERT ON public.orcamentos                FOR EACH ROW EXECUTE FUNCTION public.set_user_id(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER orc_set_updated      BEFORE UPDATE ON public.orcamentos                FOR EACH ROW EXECUTE FUNCTION public.set_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER transacoes_set_user    BEFORE INSERT ON public.transacoes              FOR EACH ROW EXECUTE FUNCTION public.set_user_id(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER transacoes_set_updated BEFORE UPDATE ON public.transacoes              FOR EACH ROW EXECUTE FUNCTION public.set_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER lanc_set_user        BEFORE INSERT ON public.lancamentos_cartao        FOR EACH ROW EXECUTE FUNCTION public.set_user_id(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER lanc_set_updated     BEFORE UPDATE ON public.lancamentos_cartao        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER fixas_set_user       BEFORE INSERT ON public.contas_fixas              FOR EACH ROW EXECUTE FUNCTION public.set_user_id(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER fixas_set_updated    BEFORE UPDATE ON public.contas_fixas              FOR EACH ROW EXECUTE FUNCTION public.set_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER invest_set_user      BEFORE INSERT ON public.investimentos             FOR EACH ROW EXECUTE FUNCTION public.set_user_id(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER invest_set_updated   BEFORE UPDATE ON public.investimentos             FOR EACH ROW EXECUTE FUNCTION public.set_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER pagfix_set_user      BEFORE INSERT ON public.pagamentos_fixos          FOR EACH ROW EXECUTE FUNCTION public.set_user_id(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER pagfix_set_updated   BEFORE UPDATE ON public.pagamentos_fixos          FOR EACH ROW EXECUTE FUNCTION public.set_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER aport_set_user       BEFORE INSERT ON public.investimentos_aportes     FOR EACH ROW EXECUTE FUNCTION public.set_user_id(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER aport_set_updated    BEFORE UPDATE ON public.investimentos_aportes     FOR EACH ROW EXECUTE FUNCTION public.set_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER prov_set_user        BEFORE INSERT ON public.investimentos_proventos   FOR EACH ROW EXECUTE FUNCTION public.set_user_id(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER prov_set_updated     BEFORE UPDATE ON public.investimentos_proventos   FOR EACH ROW EXECUTE FUNCTION public.set_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER invmov_set_user      BEFORE INSERT ON public.investimentos_movimentacoes FOR EACH ROW EXECUTE FUNCTION public.set_user_id(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER invmov_set_updated   BEFORE UPDATE ON public.investimentos_movimentacoes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER dividas_set_user     BEFORE INSERT ON public.dividas                   FOR EACH ROW EXECUTE FUNCTION public.set_user_id(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER dividas_set_updated  BEFORE UPDATE ON public.dividas                   FOR EACH ROW EXECUTE FUNCTION public.set_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER dividmov_set_user    BEFORE INSERT ON public.dividas_movimentacoes     FOR EACH ROW EXECUTE FUNCTION public.set_user_id(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER dividmov_set_updated BEFORE UPDATE ON public.dividas_movimentacoes     FOR EACH ROW EXECUTE FUNCTION public.set_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER desejos_set_user     BEFORE INSERT ON public.desejos                   FOR EACH ROW EXECUTE FUNCTION public.set_user_id(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER desejos_set_updated  BEFORE UPDATE ON public.desejos                   FOR EACH ROW EXECUTE FUNCTION public.set_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER anexos_set_user      BEFORE INSERT ON public.anexos                    FOR EACH ROW EXECUTE FUNCTION public.set_user_id(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER anexos_set_updated   BEFORE UPDATE ON public.anexos                    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER pushsub_set_user     BEFORE INSERT ON public.push_subscriptions        FOR EACH ROW EXECUTE FUNCTION public.set_user_id(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER pushsub_set_updated  BEFORE UPDATE ON public.push_subscriptions        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── REALTIME (publication padrão do Supabase) ───────────────────────
-- Adicione manualmente no painel se quiser realtime em tabelas específicas:
--   ALTER PUBLICATION supabase_realtime ADD TABLE public.transacoes, public.contas, ...;
-- O app já trata isso defensivamente — sem realtime, o pull periódico (30s) cobre.

-- ── FIM ─────────────────────────────────────────────────────────────
-- Schema dump idempotente. Pode ser executado N vezes sem efeito além
-- da primeira. Combine com edge functions em supabase/functions/ pra
-- recriar o ambiente todo from scratch.

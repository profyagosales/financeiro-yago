# Setup Supabase — Financeiro do Yago

Guia passo a passo pra ativar sync entre dispositivos + push notifications real.

## 1️⃣ Verificar projeto existente

O app já tem um projeto Supabase configurado em hardcoded fallback:
- URL: `https://ynidumrinncdqdukvpfa.supabase.co`
- Acesse https://supabase.com/dashboard, faça login com a conta que criou esse projeto

**Se não tem acesso ou quer criar novo projeto:**
1. https://supabase.com → Sign in com GitHub/Email
2. New project → escolha região **São Paulo** → defina password do DB
3. Aguarde ~2 min até finalizar setup

## 2️⃣ Rodar schema SQL

1. No painel: **SQL Editor** → **New query**
2. Cole o conteúdo de `supabase/migrations/001_schema_initial.sql`
3. Run

Verifique em **Table Editor**: 15+ tabelas devem aparecer, todas com ícone 🔒 (RLS habilitado).

## 3️⃣ Criar bucket de Storage pros anexos

1. **Storage** → **New bucket**
2. Nome: `anexos`
3. Public: **NÃO** marcar (deve ser privado)
4. Create

Depois rode no SQL Editor:

```sql
create policy "anexos_owner_select" on storage.objects
  for select using (
    bucket_id = 'anexos' and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "anexos_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'anexos' and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "anexos_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'anexos' and auth.uid()::text = (storage.foldername(name))[1]
  );
```

## 4️⃣ Configurar Auth (Email Magic Link)

1. **Authentication** → **Providers** → **Email** → habilitar
2. **Email Templates** → personalizar se quiser
3. **URL Configuration**:
   - Site URL: URL de produção do app (Vercel)
   - Redirect URLs: adicione `http://localhost:5173` (dev) e a URL de produção

## 5️⃣ Variáveis de ambiente (opcional)

Se quiser usar projeto diferente do hardcoded, crie `.env.local` na raiz:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-aqui
```

Pegue em **Settings → API** do painel.

## 6️⃣ Edge Function pra push notifications (Fase 5)

Será criada nas próximas iterações. Por enquanto, faltam só os passos 1-5.

## ✅ Como verificar que tá OK

Depois de rodar o SQL:
- Painel → Tables: deve ter `contas`, `transacoes`, `cartoes`, etc — todas com 🔒
- Painel → Storage → Buckets: `anexos` deve existir
- Painel → Authentication → Providers → Email: deve estar habilitado

Quando os 3 estiverem ✓, me avisa que eu sigo pra Fase 2 (auth + tela de login).

-- ============================================================
-- Scherbius Analytics — Supabase Schema
-- Ausführen im Supabase SQL Editor (supabase.com → SQL Editor)
-- ============================================================

-- ============================================================
-- 1. PROFILES TABLE
-- Wird automatisch bei Registrierung befüllt (via Trigger unten)
-- ============================================================
create table if not exists public.profiles (
  id           uuid references auth.users on delete cascade primary key,
  full_name    text,
  email        text,
  mode         text default 'retail',      -- 'retail' | 'institutional'
  created_at   timestamptz default now()
);

-- ============================================================
-- 2. SUBSCRIPTIONS TABLE
-- ============================================================
create table if not exists public.subscriptions (
  id                       uuid default gen_random_uuid() primary key,
  user_id                  uuid references auth.users on delete cascade not null,
  stripe_customer_id       text,
  stripe_subscription_id   text,
  status                   text default 'trialing',   -- trialing | active | canceled | past_due | incomplete
  plan                     text default 'retail',     -- 'retail' | 'institutional'
  trial_ends_at            timestamptz,
  current_period_end       timestamptz,
  created_at               timestamptz default now(),
  updated_at               timestamptz default now()
);

-- ============================================================
-- 3. ROW LEVEL SECURITY
-- Jeder User sieht nur seine eigenen Daten
-- ============================================================
alter table public.profiles     enable row level security;
alter table public.subscriptions enable row level security;

-- Profiles: read + write only own row
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Subscriptions: read + write only own rows
create policy "Users can view own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can update own subscription"
  on public.subscriptions for update
  using (auth.uid() = user_id);

-- Service role (Edge Functions / webhook) can do everything
create policy "Service role full access to subscriptions"
  on public.subscriptions for all
  using (auth.role() = 'service_role');

-- ============================================================
-- 4. TRIGGER: Auto-create profile + trial subscription on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  plan_val text;
begin
  -- Read plan from metadata (set during signUp call)
  plan_val := coalesce(new.raw_user_meta_data->>'plan', 'trial');

  -- Insert profile
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do nothing;

  -- Insert trial subscription (if plan = 'trial')
  if plan_val = 'trial' then
    insert into public.subscriptions (user_id, status, plan, trial_ends_at)
    values (
      new.id,
      'trialing',
      'retail',
      now() + interval '14 days'
    );
  end if;

  return new;
end;
$$;

-- Drop existing trigger if any, then recreate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- 5. STORAGE — Portfolio Updates bucket
-- Im Supabase Dashboard: Storage → New Bucket → "portfolio-updates"
-- Private bucket (nicht public)
-- Danach diese RLS-Policy für den Bucket anlegen:
-- ============================================================

-- RLS-Policy für Storage (im SQL Editor ausführen NACHDEM der Bucket erstellt wurde):
/*
create policy "Authenticated users can read portfolio updates"
  on storage.objects for select
  using (
    bucket_id = 'portfolio-updates'
    and auth.role() = 'authenticated'
  );
*/

-- ============================================================
-- SETUP-CHECKLISTE
-- ============================================================
-- [ ] 1. Supabase Projekt erstellen → supabase.com → New project
-- [ ] 2. SQL Editor → dieses Script ausführen
-- [ ] 3. Settings → API → Project URL + anon key → in js/config.js eintragen
-- [ ] 4. Authentication → Email confirmations: optional deaktivieren für schnellen Test
-- [ ] 5. Storage → New Bucket "portfolio-updates" (private)
--         Storage → Policies → oben auskommentierte Policy einkommentieren + ausführen
-- [ ] 6. PDFs in den Bucket hochladen
-- [ ] 7. Stripe Payment Link + Customer Portal URL → in js/config.js eintragen
-- [ ] 8. Stripe Webhook → URL: https://<project-id>.supabase.co/functions/v1/stripe-webhook
--         Events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted
-- [ ] 9. Webhook Secret → in Supabase → Edge Functions → stripe-webhook → Secrets: STRIPE_WEBHOOK_SECRET
-- [10] 10. Supabase Service Role Key → Edge Functions Secrets: SUPABASE_SERVICE_ROLE_KEY

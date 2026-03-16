-- Scherbius Analytics — Page View Tracking
-- Run once in Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS public.page_views (
  id         bigserial PRIMARY KEY,
  page       text NOT NULL,
  referrer   text,
  session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Allow anonymous inserts (tracking)
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_insert_anon" ON public.page_views
  FOR INSERT TO anon WITH CHECK (true);

-- Only service_role can read (used by report script)
CREATE POLICY "allow_select_service" ON public.page_views
  FOR SELECT TO service_role USING (true);

-- Index für Datum-Filter im Report
CREATE INDEX IF NOT EXISTS page_views_created_at_idx ON public.page_views (created_at DESC);

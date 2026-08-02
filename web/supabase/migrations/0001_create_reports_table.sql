-- Run this once in the Supabase SQL Editor (Database -> SQL Editor).
-- Idempotent: safe to re-run.

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  patient_user_id text not null,
  report_text text not null,
  extracted jsonb not null,
  classification jsonb not null,
  interaction jsonb not null,
  evidence jsonb not null,
  risk_score jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists reports_patient_user_id_created_at_idx
  on reports (patient_user_id, created_at desc);

-- RLS is enabled with NO permissive policies for the anon/authenticated
-- roles. This is intentional: the app never queries Supabase from the
-- browser, only from trusted Next.js server code using the
-- service_role key (which bypasses RLS by design). If the anon/public
-- key ever leaked, this table would still expose zero rows, since RLS
-- defaults to deny when no policy grants access. Per-patient isolation
-- is enforced in application code (every query filters by
-- patient_user_id = the Clerk user id from auth()) — this RLS setup is
-- defense in depth, not the primary guarantee.
alter table reports enable row level security;

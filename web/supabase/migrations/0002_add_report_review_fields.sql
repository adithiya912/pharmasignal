-- Run this once in the Supabase SQL Editor (Database -> SQL Editor).
-- Idempotent: safe to re-run. Adds the fields the doctor report-detail
-- page needs for Approve/Reject/Comment — additive only, no existing
-- column touched.

alter table reports
  add column if not exists doctor_notes text,
  add column if not exists review_status text not null default 'pending'
    check (review_status in ('pending', 'approved', 'rejected')),
  add column if not exists reviewed_at timestamptz;

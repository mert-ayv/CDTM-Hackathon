alter table medications
  add column if not exists type text,
  add column if not exists form text,
  add column if not exists active_ingredient text,
  add column if not exists strength text,
  add column if not exists instructions text,
  add column if not exists start_date timestamptz,
  add column if not exists end_date timestamptz,
  add column if not exists active boolean not null default true,
  add column if not exists notes text,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists medications_user_active_idx
  on medications (user_id, active);

alter table treatment_applications
  add column if not exists side text check (side in ('front', 'back')),
  add column if not exists reason text,
  add column if not exists itchiness_before numeric,
  add column if not exists itchiness_after numeric,
  add column if not exists dryness_before numeric,
  add column if not exists dryness_after numeric,
  add column if not exists redness_before numeric,
  add column if not exists redness_after numeric,
  add column if not exists effectiveness numeric,
  add column if not exists side_effects text[],
  add column if not exists updated_at timestamptz not null default now();

create index if not exists treatment_applications_medication_applied_at_idx
  on treatment_applications (medication_id, applied_at desc);

create index if not exists treatment_applications_body_region_idx
  on treatment_applications (body_region_id, applied_at desc);

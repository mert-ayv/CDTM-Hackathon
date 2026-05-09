create table if not exists schema_migrations (
  version text primary key,
  applied_at timestamptz not null default now()
);

create table if not exists diary_entries (
  id text primary key,
  user_id text not null,
  occurred_at timestamptz not null,
  food jsonb,
  sport jsonb,
  stress jsonb,
  stress_level numeric,
  sleep jsonb,
  active_rashes jsonb,
  habits text[],
  life_changes text[],
  notes text,
  created_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create index if not exists diary_entries_user_occurred_at_idx
  on diary_entries (user_id, occurred_at desc);

create table if not exists food_images (
  id text primary key,
  user_id text not null,
  entry_id text references diary_entries(id) on delete cascade,
  food_item_name text,
  source text not null check (source in ('upload', 'url')),
  storage_url text,
  data_uri text,
  original_filename text,
  mime_type text,
  linked_barcode text,
  open_food_facts_product jsonb,
  analysis_status text not null default 'not_requested',
  analysis_error text,
  notes text,
  created_at timestamptz not null
);

create index if not exists food_images_user_created_at_idx
  on food_images (user_id, created_at desc);

create table if not exists rash_photos (
  id text primary key,
  user_id text not null,
  taken_at timestamptz not null,
  body_region_id text,
  side text check (side in ('front', 'back')),
  storage_url text,
  storage_type text not null default 'metadata_only',
  local_file_name text,
  original_filename text,
  mime_type text,
  file_size_bytes integer,
  user_severity_score numeric,
  user_intensity integer,
  itchiness numeric,
  dryness numeric,
  redness numeric,
  pain numeric,
  swelling numeric,
  notes text,
  ai_analysis_status text not null default 'pending',
  ai_severity_score numeric,
  ai_confidence numeric,
  ai_summary text,
  ai_findings text[],
  ai_analysis jsonb,
  ai_analysis_error text,
  analyzed_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create index if not exists rash_photos_user_taken_at_idx
  on rash_photos (user_id, taken_at desc);

create index if not exists rash_photos_body_region_idx
  on rash_photos (body_region_id, taken_at desc);

create table if not exists skin_observations (
  id text primary key,
  user_id text not null,
  observed_at timestamptz not null,
  body_region_id text not null,
  side text not null check (side in ('front', 'back')),
  intensity integer not null,
  itchiness numeric,
  dryness numeric,
  redness numeric,
  scorrad_total numeric,
  notes text,
  created_at timestamptz not null
);

create index if not exists skin_observations_user_observed_at_idx
  on skin_observations (user_id, observed_at desc);

create table if not exists environment_snapshots (
  id text primary key,
  user_id text,
  captured_at timestamptz not null,
  latitude numeric,
  longitude numeric,
  weather jsonb,
  pollen jsonb,
  source text not null,
  created_at timestamptz not null default now()
);

create index if not exists environment_snapshots_user_captured_at_idx
  on environment_snapshots (user_id, captured_at desc);

create table if not exists context_events (
  id text primary key,
  user_id text not null,
  occurred_at timestamptz not null,
  type text not null,
  label text not null,
  notes text,
  created_at timestamptz not null
);

create index if not exists context_events_user_occurred_at_idx
  on context_events (user_id, occurred_at desc);

create table if not exists medications (
  id text primary key,
  user_id text not null,
  name text not null,
  dosage text,
  schedule text,
  prescribed_by text,
  created_at timestamptz not null
);

create index if not exists medications_user_created_at_idx
  on medications (user_id, created_at desc);

create table if not exists treatment_applications (
  id text primary key,
  user_id text not null,
  medication_id text references medications(id) on delete set null,
  applied_at timestamptz not null,
  body_region_id text,
  amount text,
  notes text,
  created_at timestamptz not null
);

create index if not exists treatment_applications_user_applied_at_idx
  on treatment_applications (user_id, applied_at desc);

create table if not exists flare_forecasts (
  id text primary key,
  user_id text not null,
  horizon_hours integer not null,
  generated_at timestamptz not null,
  risk text not null,
  confidence numeric not null,
  reasons text[] not null default '{}',
  model_version text,
  raw_features jsonb
);

create index if not exists flare_forecasts_user_generated_at_idx
  on flare_forecasts (user_id, generated_at desc);

create table if not exists trigger_candidates (
  id text primary key,
  user_id text not null,
  factor text not null,
  category text not null,
  confidence numeric not null,
  explanation text not null,
  evidence jsonb,
  generated_at timestamptz not null default now()
);

create index if not exists trigger_candidates_user_generated_at_idx
  on trigger_candidates (user_id, generated_at desc);

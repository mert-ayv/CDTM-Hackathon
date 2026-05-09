alter table environment_snapshots
  add column if not exists provider text,
  add column if not exists source_url text,
  add column if not exists linked_diary_entry_id text references diary_entries(id) on delete set null,
  add column if not exists symptom_context jsonb,
  add column if not exists notes text,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists environment_snapshots_symptom_context_idx
  on environment_snapshots using gin (symptom_context);

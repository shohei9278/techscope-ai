-- Spaced repetition fields for non-article learning resources.
alter table if exists public.resource_learning_records
  add column if not exists comprehension_level integer check (comprehension_level between 1 and 5),
  add column if not exists next_review_at timestamptz,
  add column if not exists review_count integer not null default 0;

create index if not exists resource_learning_records_review_idx
  on public.resource_learning_records (user_id, next_review_at);

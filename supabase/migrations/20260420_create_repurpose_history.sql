create table if not exists public.repurpose_history (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null,
  source_input text not null,
  voice_profile text not null,
  outputs jsonb not null
);

alter table public.repurpose_history enable row level security;

create policy "Users can insert own repurpose history"
  on public.repurpose_history
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can select own repurpose history"
  on public.repurpose_history
  for select
  to authenticated
  using (auth.uid() = user_id);

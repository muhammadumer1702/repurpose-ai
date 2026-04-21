create table if not exists public.user_voices (
  user_id uuid primary key references auth.users(id) on delete cascade,
  voice_samples jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.set_user_voices_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_voices_updated_at_trigger on public.user_voices;
create trigger user_voices_updated_at_trigger
before update on public.user_voices
for each row
execute function public.set_user_voices_updated_at();

alter table public.user_voices enable row level security;

drop policy if exists "Users can read own voice profile" on public.user_voices;
create policy "Users can read own voice profile"
  on public.user_voices
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own voice profile" on public.user_voices;
create policy "Users can insert own voice profile"
  on public.user_voices
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own voice profile" on public.user_voices;
create policy "Users can update own voice profile"
  on public.user_voices
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

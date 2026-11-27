begin;
create table if not exists public.fenix_exercise_illustrations (
  owner uuid not null references auth.users(id) on delete cascade,
  exercise_key text not null check (exercise_key ~ '^[a-z0-9-]{1,80}$'),
  webp_base64 text not null check (length(webp_base64) between 16 and 100000),
  primary key (owner, exercise_key)
);
alter table public.fenix_exercise_illustrations enable row level security;
revoke all on public.fenix_exercise_illustrations from anon, authenticated;
grant select on public.fenix_exercise_illustrations to authenticated;
drop policy if exists "Owner reads exercise illustrations" on public.fenix_exercise_illustrations;
create policy "Owner reads exercise illustrations" on public.fenix_exercise_illustrations
  for select to authenticated using (owner = (select auth.uid()));
commit;

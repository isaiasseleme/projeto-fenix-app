begin;

create table public.fenix_records (
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('session', 'plan', 'measure')),
  entry text not null check (length(entry) between 1 and 80),
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 65536),
  primary key (owner, kind, entry)
);

alter table public.fenix_records enable row level security;
revoke all on public.fenix_records from anon, authenticated;
grant select, insert, update, delete on public.fenix_records to authenticated;
create policy "Own Fenix records" on public.fenix_records
  for all to authenticated
  using (owner = (select auth.uid()))
  with check (owner = (select auth.uid()));

commit;

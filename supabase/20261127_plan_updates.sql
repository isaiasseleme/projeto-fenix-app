begin;

create or replace function public.save_fenix_changes(p_changes jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  change jsonb;
  rows_written integer;
  account_id uuid := auth.uid();
begin
  if account_id is null or p_changes is null or jsonb_typeof(p_changes) <> 'array'
      or jsonb_array_length(p_changes) not between 1 and 2 then
    raise exception 'Invalid change set' using errcode = '22023';
  end if;

  for change in
    select value from jsonb_array_elements(p_changes)
    order by value->>'kind', value->>'entry'
  loop
    if change->>'kind' not in ('plan', 'session') then
      raise exception 'Invalid record type' using errcode = '22023';
    end if;

    if change->'expected' = 'null'::jsonb then
      insert into public.fenix_records (owner, kind, entry, payload)
      values (account_id, change->>'kind', change->>'entry', change->'payload')
      on conflict (owner, kind, entry) do nothing;
    else
      update public.fenix_records
      set payload = change->'payload'
      where owner = account_id and kind = change->>'kind' and entry = change->>'entry'
        and payload = change->'expected';
    end if;

    get diagnostics rows_written = row_count;
    if rows_written <> 1 then
      raise exception 'Fenix record changed' using errcode = '40001';
    end if;
  end loop;
end;
$$;

revoke all on function public.save_fenix_changes(jsonb) from public, anon;
grant execute on function public.save_fenix_changes(jsonb) to authenticated;

commit;

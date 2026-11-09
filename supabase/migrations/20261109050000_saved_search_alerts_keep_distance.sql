-- Kayıtlı arama bildirimi: yakınlık filtresi (near + distances) korunur; web ve mobil aynı params şemasını yazar.
create or replace function makinasal_private.saved_search_alerts()
returns integer language plpgsql security definer set search_path = ''
as $$
declare r record; n integer; v_sent integer := 0; v_now timestamptz := now(); p jsonb;
begin
  for r in
    select id, user_id, params, coalesce(last_notified_at, created_at) as since
    from public.saved_searches
    where notify and params is not null
  loop
    p := r.params - 'page' - 'since' - 'sort';
    if not (p ? 'distances') then p := p - 'near'; end if;
    begin
      n := (public.search_listings(p || jsonb_build_object('since', r.since), true)->>'total')::int;
    exception when others then n := 0;
    end;
    if n > 0 then
      insert into public.notifications(user_id, kind, title, body, url)
      values (r.user_id, 'saved_search',
              'Kayıtlı aramana uyan ' || n || ' yeni ilan',
              coalesce(nullif(r.params->>'q', ''), 'Kayıtlı aramalarına göz at'),
              '/kayitli-aramalar');
      v_sent := v_sent + 1;
    end if;
    update public.saved_searches set last_notified_at = v_now where id = r.id;
  end loop;
  return v_sent;
end $$;
revoke all on function makinasal_private.saved_search_alerts() from public, anon, authenticated;

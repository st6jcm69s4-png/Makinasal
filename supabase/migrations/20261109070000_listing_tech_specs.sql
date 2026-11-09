-- Makineye özel teknik alanlar ve bakım beyanı: listings.tech (jsonb) + aramada aralık / seçim filtreleri.
alter table public.listings add column if not exists tech jsonb;

create or replace function makinasal_private.valid_tech(t jsonb)
returns boolean language sql immutable set search_path = ''
as $$
  select t is null or (
    jsonb_typeof(t) = 'object'
    and octet_length(t::text) <= 3000
    and (select count(*) from jsonb_object_keys(t)) <= 25
    and not exists (
      select 1 from jsonb_each(t) e
      where e.key !~ '^[a-z_]{2,30}$'
         or not (
           (jsonb_typeof(e.value) = 'number' and (e.value::text)::numeric between 0 and 10000000)
           or (jsonb_typeof(e.value) = 'string' and char_length(e.value #>> '{}') between 1 and 60)
         )
    )
  )
$$;
revoke all on function makinasal_private.valid_tech(jsonb) from public, anon, authenticated;

alter table public.listings drop constraint if exists listings_tech_check;
alter table public.listings add constraint listings_tech_check check (makinasal_private.valid_tech(tech));
create index if not exists listings_tech_gin on public.listings using gin (tech jsonb_path_ops);

-- search_listings: p->'tech' = { anahtar: {min,max} | "değer" }
do $do$
declare d text;
begin
  d := pg_get_functiondef('public.search_listings(jsonb,boolean)'::regprocedure);
  if position('p->''tech''' in d) = 0 then
    d := replace(d, 'and (nullif(p->>''since'','''') is null',
      'and (jsonb_typeof(p->''tech'') is distinct from ''object'' or not exists (
         select 1 from jsonb_each(p->''tech'') tf
         where not (
           case when jsonb_typeof(tf.value) = ''object'' then
             jsonb_typeof(l.tech->tf.key) = ''number''
             and (jsonb_typeof(tf.value->''min'') is distinct from ''number'' or (l.tech->>tf.key)::numeric >= (tf.value->>''min'')::numeric)
             and (jsonb_typeof(tf.value->''max'') is distinct from ''number'' or (l.tech->>tf.key)::numeric <= (tf.value->>''max'')::numeric)
           else coalesce(l.tech->>tf.key = tf.value #>> ''{}'', false) end)))
 and (nullif(p->>''since'','''') is null');
    if position('p->''tech''' in d) = 0 then raise exception 'search_listings: since anchor not found'; end if;
    execute d;
  end if;
end $do$;

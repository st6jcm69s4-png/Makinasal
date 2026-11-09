-- Arama: kelime sırası önemsiz ("JCB 3CX" = "3CX JCB"), eş anlamlılar ("kepçe" = "beko loder"),
-- küçük yazım hataları (pg_trgm word_similarity) ve parça numarasında boşluk/tire farkı.

-- Eş anlamlıları ortak bir köke çevirir (hem ilan metnine hem aramaya uygulanır).
create or replace function public.search_norm(v text)
returns text language sql immutable parallel safe set search_path = ''
as $$
  select regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
         regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
         regexp_replace(regexp_replace(
           ' ' || public.search_fold(coalesce(v, '')) || ' ',
           '\m(beko ?loder|backhoe( loader)?|kazici yukleyici|kepce)\M', 'bekoloder', 'g'),
           '\m(excavator|ekskavator|ekskavatoru|paletli kazici)\M', 'ekskavator', 'g'),
           '\m(fork ?lift|clark)\M', 'forklift', 'g'),
           '\m(telehandler|teleskobik)\M', 'teleskopik', 'g'),
           '\m(buldozer|bulldozer)\M', 'dozer', 'g'),
           '\m(grader)\M', 'greyder', 'g'),
           '\m(roller|compactor|kompaktor)\M', 'silindir', 'g'),
           '\m(tipper|damperli)\M', 'damper', 'g'),
           '\m(crane|vinci)\M', 'vinc', 'g'),
           '\m(generator|jenarator)\M', 'jenerator', 'g'),
           '\m(compressor|kompressor)\M', 'kompresor', 'g'),
           '\s+', ' ', 'g')
$$;

-- Her kelime ilan metninde (sırası önemsiz) geçmeli; parça numaralarında boşluk/tire yok sayılır;
-- 4+ harfli kelimelerde küçük yazım hatası tolere edilir.
create or replace function public.search_match(hay text, q text)
returns boolean language sql immutable parallel safe set search_path = ''
as $$
  with h as (
    select public.search_norm(hay) as t, regexp_replace(public.search_norm(hay), '[^a-z0-9]', '', 'g') as c
  ), qq as (
    select btrim(public.search_norm(q)) as t, regexp_replace(public.search_norm(q), '[^a-z0-9]', '', 'g') as c
  ), toks as (
    select tok from qq, unnest(regexp_split_to_array(qq.t, '\s+')) as tok where tok <> '' limit 8
  )
  select
    (length((select c from qq)) >= 3 and (select c from h) like '%' || (select c from qq) || '%')
    or coalesce((
      select bool_and(
        (select t from h) like '%' || replace(replace(replace(tok, '\', '\\'), '%', '\%'), '_', '\_') || '%' escape '\'
        or (length(regexp_replace(tok, '[^a-z0-9]', '', 'g')) >= 3 and (select c from h) like '%' || regexp_replace(tok, '[^a-z0-9]', '', 'g') || '%')
        or (length(tok) >= 4 and extensions.word_similarity(tok, (select t from h)) >= 0.6)
      ) from toks), true)
$$;

-- search_listings içindeki metin koşulunu yeni eşleştiriciyle değiştir.
do $do$
declare d text; a int; b int;
begin
  d := pg_get_functiondef('public.search_listings(jsonb,boolean)'::regprocedure);
  if position('public.search_match(' in d) = 0 then
    a := position('and (a.q='''' or' in d);
    b := position(E'\n ), page_rows as (' in d);
    if a = 0 or b = 0 or b < a then raise exception 'search_listings: q anchor not found'; end if;
    d := substring(d from 1 for a - 1)
      || 'and (a.q='''' or public.search_match(coalesce(l.brand,'''')||'' ''||coalesce(l.model,'''')||'' ''||l.title||'' ''||coalesce(l.spec,'''')||'' ''||coalesce(l.compat,'''')||'' ''||coalesce(l.category,''''), a.q))'
      || substring(d from b);
    execute d;
  end if;
end $do$;

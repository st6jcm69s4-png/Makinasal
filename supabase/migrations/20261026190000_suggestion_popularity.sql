-- Arama önerilerini popülerliğe göre sıralamak için sayaçlar.
-- Bir üye aynı öneriyi günde en fazla bir kez sayar (sıralamayı şişirmeyi önler).
create table public.suggestion_hits(
 id text primary key check(length(id) between 3 and 120),
 hits bigint not null default 0 check(hits>=0)
);
create table public.suggestion_hit_log(
 user_id uuid not null, id text not null check(length(id) between 3 and 120), day date not null default current_date,
 primary key(user_id,id,day)
);
alter table public.suggestion_hits enable row level security;
alter table public.suggestion_hit_log enable row level security;
revoke all on public.suggestion_hits, public.suggestion_hit_log from anon, authenticated;

create function public.hit_suggestion(p_id text) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then return; end if;
 if p_id is null or p_id !~ '^(section|group|category|part|brand):.{1,100}$' then return; end if;
 insert into public.suggestion_hit_log(user_id,id) values (auth.uid(),p_id) on conflict do nothing;
 if not found then return; end if;
 insert into public.suggestion_hits(id,hits) values (p_id,1)
 on conflict (id) do update set hits=public.suggestion_hits.hits+1;
end $$;

create function public.suggestion_ranks() returns table(id text,hits bigint) language sql stable security definer set search_path='' as $$
 select h.id,h.hits from public.suggestion_hits h order by h.hits desc limit 500
$$;

revoke execute on function public.hit_suggestion(text), public.suggestion_ranks() from public, anon, authenticated;
grant execute on function public.hit_suggestion(text) to authenticated;
grant execute on function public.suggestion_ranks() to anon, authenticated;

create schema if not exists makinasal_moderation;
revoke all on schema makinasal_moderation from public,anon,authenticated;
create or replace function makinasal_moderation.contains_profanity(p_text text) returns boolean
language plpgsql immutable security invoker set search_path='' as $fn$
declare v text; tokens text[]; token text; joined text; i int; j int;
pattern constant text := '^(?:(?:amk|aq|amina[kq]o[ydu][a-z]*|aminakoyim|aminakoyayim|siktir[a-z]*|siker[a-z]*|sikey[a-z]*|sikik[a-z]*|sikmis[a-z]*|sikmek[a-z]*|sikicem[a-z]*|sik|oruspu[a-z]*|orospu[a-z]*|pic(?:ler[a-z]*|lik[a-z]*|in|sin)?|yarrak[a-z]*|yarak[a-z]*|gavat[a-z]*|ibne[a-z]*|fuck[a-z]*|motherfuck[a-z]*|shit(?:ty|head|s)?|bitch(?:es|ing)?|asshole[a-z]*|cunt[a-z]*|dickhead[a-z]*|bastard[a-z]*|whore[a-z]*|nigg(?:er|a)[a-z]*|faggot[a-z]*))$';
begin
 v:=lower(normalize(coalesce(p_text,''),NFKD));
 v:=regexp_replace(v,U&'[\0300-\036f\200b-\200f\202a-\202e\2060-\206f\feff]','','g');
 v:=translate(v,'013457@$','oieastas');
 -- Keep dotless i distinct, so harmless Turkish sık / sıkıştırma are not matched as sik.
 v:=regexp_replace(v,'(.)\1{2,}','\1\1','g');
 tokens:=regexp_split_to_array(v,'[^a-zı]+');
 foreach token in array tokens loop if token ~ pattern then return true; end if;end loop;
 for i in 1..coalesce(array_length(tokens,1),0) loop
  joined:='';
  for j in i..least(array_length(tokens,1),i+13) loop
   exit when length(tokens[j])=0 or length(tokens[j])>2;
   joined:=joined||tokens[j];
   if j>i and joined ~ pattern then return true;end if;
  end loop;
 end loop;
 return false;
end $fn$;
revoke all on function makinasal_moderation.contains_profanity(text) from public,anon,authenticated;
create or replace function makinasal_moderation.guard_message() returns trigger
language plpgsql security definer set search_path='' as $fn$
begin
 if makinasal_moderation.contains_profanity(new.body) then
  raise exception using errcode='23514',message='MESSAGE_PROFANITY: Küfür veya hakaret içeren mesaj gönderilemez. Lütfen mesajını düzenle.';
 end if;
 return new;
end $fn$;
revoke all on function makinasal_moderation.guard_message() from public,anon,authenticated;
create trigger reject_message_profanity before insert or update of body on public.messages for each row execute function makinasal_moderation.guard_message();
create trigger reject_quote_message_profanity before insert or update of body on public.market_quote_messages for each row execute function makinasal_moderation.guard_message();

create or replace function makinasal_moderation.contains_profanity(p_text text) returns boolean
language plpgsql immutable security invoker set search_path='' as $fn$
declare v text; tokens text[]; token text; joined text; i int; j int;
pattern constant text := '^(?:(?:amk|aq|am[ıi]na[kq]o[ydu][a-zı]*|am[ıi]nakoyim|am[ıi]nakoyayim|siktir[a-zı]*|siker[a-zı]*|sikey[a-zı]*|sikik[a-zı]*|sikmis[a-zı]*|sikmek[a-zı]*|sikicem[a-zı]*|sik|oruspu[a-zı]*|orospu[a-zı]*|pic(?:ler[a-zı]*|lik[a-zı]*|in|sin)?|yarrak[a-zı]*|yarak[a-zı]*|gavat[a-zı]*|ibne[a-zı]*|fuck[a-zı]*|motherfuck[a-zı]*|shit(?:ty|head|s)?|bitch(?:es|ing)?|asshole[a-zı]*|cunt[a-zı]*|dickhead[a-zı]*|bastard[a-zı]*|whore[a-zı]*|serefsiz[a-zı]*|pezevenk[a-zı]*|haysiyetsiz[a-zı]*|gerizekal[iaı][a-zı]*|salak(?:lar[a-zı]*|sin|sın)?|o[cç]|nigg(?:er|a)[a-zı]*|faggot[a-zı]*))$';
begin
 v:=lower(normalize(coalesce(p_text,''),NFKD));
 v:=regexp_replace(v,U&'[\0300-\036f\200b-\200f\202a-\202e\2060-\206f\feff]','','g');
 v:=translate(v,'013457@$','oieastas');
 -- Keep dotless i distinct, so harmless Turkish sık / sıkıştırma are not matched as sik.
 v:=regexp_replace(v,'(.)\1{2,}','\1\1','g');
 tokens:=regexp_split_to_array(v,'[^a-zı]+');
 if array_to_string(tokens,' ') ~ '(?:^| )am[ıi]na ko[yq][a-zı]*(?:$| )' then return true;end if;
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

-- Küfür listesine eklemeler (lib/profanity.ts ve mobile/lib/profanity.ts ile aynı).
do $do$
declare d text; extra constant text :=
 '|aptal[a-zı]*|dangalak[a-zı]*|h[ıi]yar(?:lar[a-zı]*|s[ıi]n)?|yavsak[a-zı]*|dalyarak[a-zı]*|yarra[mk][a-zı]*|gotveren[a-zı]*|gotlek[a-zı]*|kahpe[a-zı]*|pust(?:lar[a-zı]*)?|kaltak[a-zı]*|surtuk[a-zı]*|kevase[a-zı]*|amc[ıi]k[a-zı]*|tasak[a-zı]*|s[ıi]ll[ıi]k[a-zı]*|durzu[a-zı]*|hoduk[a-zı]*|angut[a-zı]*|embesil[a-zı]*|mankafa[a-zı]*|ahmak[a-zı]*|beyinsiz[a-zı]*';
begin
 select pg_get_functiondef('makinasal_moderation.contains_profanity(text)'::regprocedure) into d;
 if position('|nigg(?:er|a)' in d) = 0 then raise exception 'beklenen biçim yok'; end if;
 if position('|dangalak' in d) > 0 then return; end if;
 d := replace(d, '|nigg(?:er|a)', extra || '|nigg(?:er|a)');
 execute d;
end $do$;

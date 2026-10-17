-- Match the existing province catalog spelling; preserve all district records.
do $fix$ declare definition text; begin
select pg_get_functiondef('public.valid_profile_region(text,text)'::regprocedure) into definition;
execute replace(definition, '"Hakkari":', '"Hakkâri":');
end $fix$;

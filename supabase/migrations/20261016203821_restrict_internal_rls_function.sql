-- Applied to the hosted Makinasal project via the Supabase connector.
-- The internal event trigger runs as the database owner, never as an API client.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

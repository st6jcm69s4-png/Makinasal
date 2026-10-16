-- Listings are withdrawn with status = 'removed'. Hard deletion cascades into
-- threads, deals and reviews, allowing sellers to erase transaction history.
-- Only administrative roles may permanently purge a listing.
revoke delete on table public.listings from public, anon, authenticated;

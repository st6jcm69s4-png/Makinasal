-- Preserve participants' access to removed posts and their private negotiation history.
create policy posts_quote_history on public.market_posts for select to authenticated using(exists(select 1 from public.market_quotes q where q.post_id=market_posts.id and q.bidder_id=(select auth.uid())));

-- Arama fonksiyonu (çağıranın yetkisiyle çalışır) premium alanlarını okuyabilsin.
grant select (premium_plan, premium_until) on public.profiles to anon, authenticated;

# Makinasal: çalışma kuralları

- Kullanıcı yazılımcı değildir: Türkçe, adım adım, PowerShell komutlarıyla anlat.
- Tasarım işinden önce `PRODUCT.md` ve `DESIGN.md` okunur; renk ve ölçüler `mobile/lib/theme.ts` içinden alınır.
- `.claude/skills/` altındaki Expo ve Supabase kuralları geçerlidir (kaynaklar: `.claude/skills/KAYNAKLAR.md`). Bir kural projede kurulu olmayan paket isterse önce kullanıcıya kurulum adımı verilir.
- Mobil: `mobile/` (Expo SDK 58, expo-router). Web: kök dizin (Next.js). Veritabanı: Supabase; her şema değişikliği `supabase/migrations/` altına da yazılır.
- Her gönderimden sonra GitHub Actions "Application checks" sonucu kontrol edilir.
- Sırlar (service_role, API anahtarları, Expo token) asla depoya ya da sohbete yazılmaz. Yönetici yetkisi yalnızca `app_metadata.role = 'admin'`.
- Mavi ve turuncu kullanılmaz. Yeni metinler için çeviri: mobil `mobile/lib/search-i18n.ts`, web `lib/i18n/en.json` ve `de.json`.
- `npx expo install --check` çalıştırılmaz. Yeni paket gerekiyorsa tek tek, kullanıcının bilgisayarında kurulur.

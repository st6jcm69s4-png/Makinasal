# Bu klasördeki kural dosyalarının kaynağı

Claude bu projede çalışırken bu kuralları kendiliğinden yükler. Hepsi resmi, MIT lisanslı depolardan değiştirilmeden kopyalandı (9 Kasım 2026). Expo deposundaki deneysel eklenti (expo-experiments) ve depo içi test kuralı (expo-skill-eval) alınmadı.

| Klasör | Kaynak | Sürüm | Lisans |
|---|---|---|---|
| eas-app-stores, eas-hosting, eas-observe, eas-simulator, eas-update, eas-update-insights, eas-workflows, expo-animation, expo-app-clip, expo-brownfield, expo-data-fetching, expo-design-system, expo-dev-client, expo-dom, expo-examples, expo-module, expo-native-ui, expo-overview, expo-project-structure, expo-router, expo-ui, expo-upgrade, expo-web-to-native (resmi Expo eklentisinin tamamı: plugins/expo/skills; lisans: LICENSE-expo) | https://github.com/expo/skills (Expo, 650 Industries) | a9e5bd3 | MIT |
| supabase, supabase-postgres-best-practices | https://github.com/supabase/agent-skills (Supabase) | c9be0e9 | MIT |

Güncellemek için: ilgili depodan aynı klasörü yeniden kopyala ve bu tablodaki sürümü değiştir.

Not: Expo kuralları en yeni Expo sürümünü ve bazı paketleri (Reanimated, @expo/ui) varsayar. Projede kurulu olmayan bir paketi önerirse önce kurulum gerekir (bkz. PRODUCT.md / DESIGN.md).

Projeyle ilgisi: en çok kullanılacaklar expo-design-system, expo-native-ui, expo-animation, expo-router, expo-data-fetching, expo-upgrade (SDK güncellemesi), eas-app-stores / eas-update / eas-workflows (yayın aşaması). expo-app-clip, expo-brownfield, expo-module, expo-dom, expo-web-to-native bu proje için şimdilik gerekmez ama zararsızdır.
İki kuralda küçük yardımcı betik var (expo-ui/scripts/list-components.js yalnızca yerel paketi okur; eas-workflows/scripts/fetch.js Expo belgelerini indirir). Kendiliğinden çalışmazlar.

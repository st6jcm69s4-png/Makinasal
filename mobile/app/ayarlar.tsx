import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../components/LText';
import { router } from 'expo-router';
import { Btn, Chip, common } from '../components/ui';
import { Icon, type IconName } from '../components/Icon';
import { useLang } from '../lib/lang';
import { useApp } from '../lib/AppContext';
import { supabase } from '../lib/supabase';
import { openWeb } from '../lib/web';
import { loadTheme, saveTheme, type ThemeChoice } from '../lib/themePref';
import { PALETTES, activePalette, color, font, radius, savePalette, shadow, themeSupportsChoice, type PaletteId } from '../lib/theme';
import { tr } from '../lib/i18n';

/** Ayar satırı: yumuşak ikon, kalın yazı ve sağda küçük ayraç. */
function Row({ icon, title, onPress, last }: { icon: IconName; title: string; onPress: () => void; last?: boolean }) {
  return (
    <Pressable style={({ pressed }) => [r.row, !last && r.sep, pressed && { opacity: 0.8 }]} onPress={onPress} accessibilityRole="button">
      <View style={r.icon}><Icon name={icon} size={19} color={color.tealText} /></View>
      <Text style={r.title}>{title}</Text>
      <Icon name="chevron-right" size={18} color={color.muted} />
    </Pressable>
  );
}
const r = StyleSheet.create({
  group: { backgroundColor: color.surface, borderRadius: radius + 4, paddingHorizontal: 12, ...shadow },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 58, paddingVertical: 8 },
  sep: { borderBottomWidth: 1, borderBottomColor: color.line },
  icon: { width: 38, height: 38, borderRadius: 12, backgroundColor: color.tealSoft, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, color: color.ink, fontFamily: font.semi, fontSize: 16 },
  head: { fontFamily: font.bold, fontSize: 18, color: color.ink, marginTop: 8, marginBottom: 4, marginHorizontal: 4 },
  pal: { flex: 1, gap: 10, padding: 12, borderRadius: radius, borderWidth: 1, borderColor: color.line, backgroundColor: color.bg },
  swatches: { flexDirection: 'row', gap: 4 },
  sw: { flex: 1, height: 28, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(0,0,0,0.12)' },
  palT: { color: color.ink, fontFamily: font.semi, fontSize: 15 },
});

export default function Settings() {
  const { session } = useApp();
  const { lang, setLang } = useLang();
  const [admin, setAdmin] = useState(false);
  const [theme, setTheme] = useState<ThemeChoice>('system');
  useEffect(() => { void loadTheme().then(setTheme); }, []);
  const pickTheme = (c: ThemeChoice) => { setTheme(c); void saveTheme(c); };
  const [palette, setPalette] = useState<PaletteId>(activePalette);
  const pickPalette = (id: PaletteId) => {
    if (id === palette) return;
    if (!savePalette(id)) { Alert.alert(tr('Renk teması'), tr('Seçim kaydedilemedi. Tekrar dene.')); return; }
    setPalette(id);
    // Not: DevSettings.reload() Expo Go'da yerel modülleri kaybettiriyor (ExpoAsset hatası),
    // mağaza sürümünde ise hiç çalışmıyor. Bu yüzden kullanıcıdan uygulamayı yeniden açmasını istiyoruz.
    Alert.alert(tr('Renk teması'), tr('Yeni renkler için uygulamayı tamamen kapatıp yeniden aç.'));
  };
  useEffect(() => {
    if (!session) { setAdmin(false); return; }
    void supabase.auth.getUser().then(({ data }) => setAdmin(data.user?.app_metadata?.role === 'admin'));
  }, [session]);
  return (
    <ScrollView style={common.screen} contentContainerStyle={{ padding: 12, gap: 10 }}>
      <View style={common.card}>
        <Text style={common.h2}>Dil</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Chip title="Türkçe" on={lang === 'tr'} onPress={() => setLang('tr')} />
          <Chip title="English" on={lang === 'en'} onPress={() => setLang('en')} />
          <Chip title="Deutsch" on={lang === 'de'} onPress={() => setLang('de')} />
        </View>
        <Text style={common.meta}>Uygulama seçtiğin dilde görünür. İlanlar ve mesajlar, yazıldıkları dilde gösterilir.</Text>
      </View>
      {themeSupportsChoice ? (
        <View style={common.card}>
          <Text style={common.h2}>Görünüm</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Chip title="Sistem" on={theme === 'system'} onPress={() => pickTheme('system')} />
            <Chip title="Açık tema" on={theme === 'light'} onPress={() => pickTheme('light')} />
            <Chip title="Koyu tema" on={theme === 'dark'} onPress={() => pickTheme('dark')} />
          </View>
        </View>
      ) : null}
      <View style={common.card}>
        <Text style={common.h2}>Renk teması</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {(Object.keys(PALETTES) as PaletteId[]).map((id) => {
            const p = PALETTES[id];
            const on = palette === id;
            return (
              <Pressable key={id} style={[r.pal, on && { borderColor: color.teal, borderWidth: 2 }]} onPress={() => pickPalette(id)} accessibilityRole="button" accessibilityState={{ selected: on }}>
                <View style={r.swatches}>
                  {[p.light.navy, p.light.accent, p.light.bg, p.dark.bg].map((c, i) => <View key={i} style={[r.sw, { backgroundColor: c }]} />)}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={r.palT}>{p.name}</Text>
                  {on ? <Icon name="check-circle" size={16} color={color.tealText} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
        <Text style={common.meta}>Açık ve koyu görünüm her renk temasında ayrıca çalışır.</Text>
      </View>
      <Text style={r.head}>Hesap</Text>
      {session ? (
        <View style={r.group}>
          <Row icon="user" title="Profilimi düzenle" onPress={() => router.push('/profil-duzenle')} />
          <Row icon="lock" title="Hesap güvenliği ve doğrulama" onPress={() => router.push('/hesap-dogrula')} />
          <Row icon="credit-card" title="Ödemelerim" onPress={() => router.push('/odemelerim')} />
          <Row icon="bell" title="Bildirimler" onPress={() => router.push('/bildirimler')} last />
        </View>
      ) : <View style={common.card}><Text style={common.meta}>Hesap ayarları için Hesabım sekmesinden giriş yap.</Text></View>}
      <Text style={r.head}>Bilgi</Text>
      <View style={r.group}>
        <Row icon="award" title="Üyelik ve ilan hakları" onPress={() => router.push('/premium')} />
        <Row icon="shield" title="Güven sistemi" onPress={() => router.push('/guven')} />
        <Row icon="help-circle" title="Yardım merkezi" onPress={() => router.push('/destek')} />
        <Row icon="file-text" title="Hukuki bilgiler" onPress={() => router.push('/hukuki' as never)} last />
      </View>
      <View style={[common.card, { gap: 8 }]}>
        <Text style={common.h2}>Şirketler için</Text>
        <Text style={common.meta}>CSV/XML dosyasıyla toplu ilan aktarımı bilgisayarda web sitesinden yapılır.</Text>
        <Btn ghost title="Toplu ilan aktarımını web'de aç" onPress={() => openWeb('/toplu-ilan')} />
      </View>
      {admin ? <Btn title="Yönetim" onPress={() => router.push('/yonetim')} /> : null}
    </ScrollView>
  );
}

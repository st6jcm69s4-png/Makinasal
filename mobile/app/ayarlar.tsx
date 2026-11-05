import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../components/LText';
import { router } from 'expo-router';
import { Btn, Chip, common } from '../components/ui';
import { Icon, type IconName } from '../components/Icon';
import { useLang } from '../lib/lang';
import { useApp } from '../lib/AppContext';
import { supabase } from '../lib/supabase';
import { openWeb } from '../lib/web';
import { loadTheme, saveTheme, type ThemeChoice } from '../lib/themePref';
import { color, font, radius, shadow, themeSupportsChoice } from '../lib/theme';

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
});

export default function Settings() {
  const { session } = useApp();
  const { lang, setLang } = useLang();
  const [admin, setAdmin] = useState(false);
  const [theme, setTheme] = useState<ThemeChoice>('system');
  useEffect(() => { void loadTheme().then(setTheme); }, []);
  const pickTheme = (c: ThemeChoice) => { setTheme(c); void saveTheme(c); };
  useEffect(() => {
    if (!session) { setAdmin(false); return; }
    void supabase.auth.getUser().then(({ data }) => setAdmin(data.user?.app_metadata?.role === 'admin'));
  }, [session]);
  return (
    <ScrollView style={common.screen} contentContainerStyle={{ padding: 12, gap: 10 }}>
      <View style={common.card}>
        <Text style={common.h2}>Dil / Language / Sprache</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Chip title="Türkçe" on={lang === 'tr'} onPress={() => setLang('tr')} />
          <Chip title="English" on={lang === 'en'} onPress={() => setLang('en')} />
          <Chip title="Deutsch" on={lang === 'de'} onPress={() => setLang('de')} />
        </View>
        <Text style={common.meta}>Dil tercihin bu telefonda saklanır. İlanlar ve mesajlar yazıldıkları dilde kalır.</Text>
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

import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../components/LText';
import { router } from 'expo-router';
import { Btn, common } from '../components/ui';
import { Icon, type IconName } from '../components/Icon';
import { useLang } from '../lib/lang';
import { useApp } from '../lib/AppContext';
import { supabase } from '../lib/supabase';
import { openWeb } from '../lib/web';
import { loadTheme, saveTheme, type ThemeChoice } from '../lib/themePref';
import { PALETTES, activePalette, color, font, radius, savePalette, shadow, themeSupportsChoice, type PaletteId } from '../lib/theme';
import { tr } from '../lib/i18n';
import { restartApp } from '../lib/restart';

/** Ayar satırı (iPhone Ayarlar düzeni): renkli kare simge, ince ara çizgi, basınca gri satır. */
function Row({ icon, title, onPress, last }: { icon: IconName; title: string; onPress: () => void; last?: boolean }) {
  return (
    <Pressable style={({ pressed }) => [r.row, pressed && { backgroundColor: color.plate }]} onPress={onPress} accessibilityRole="button">
      <View style={r.icon}><Icon name={icon} size={17} color="#FFFFFF" /></View>
      <View style={[r.rowMain, !last && r.sep]}>
        <Text style={r.title}>{title}</Text>
        <View style={{ opacity: 0.55 }}><Icon name="chevron-right" size={18} color={color.muted} /></View>
      </View>
    </Pressable>
  );
}
/** Eşit genişlikte seçenekler: seçili olan dolu vurgu renginde. */
function Segment<T extends string>({ items, value, onChange }: { items: { id: T; label: string; icon?: IconName }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={r.seg} accessibilityRole="radiogroup">
      {items.map((it) => {
        const on = it.id === value;
        return (
          <Pressable key={it.id} style={({ pressed }) => [r.segItem, on && r.segOn, pressed && !on && { opacity: 0.7 }]} onPress={() => onChange(it.id)} accessibilityRole="radio" accessibilityState={{ selected: on }}>
            {it.icon ? <Icon name={it.icon} size={15} color={on ? color.ink : color.muted} /> : null}
            <Text style={[r.segT, on && { color: color.ink, fontFamily: font.semi }]} numberOfLines={1}>{it.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
const r = StyleSheet.create({
  group: { backgroundColor: color.surface, borderRadius: 14, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: 16, minHeight: 48 },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, paddingRight: 14 },
  sep: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.line },
  icon: { width: 30, height: 30, borderRadius: 7, backgroundColor: color.teal, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  title: { flex: 1, color: color.ink, fontSize: 16.5 },
  // Bölüm başlığı: küçük, soluk (iPhone Ayarlar)
  head: { fontSize: 13, color: color.muted, marginTop: 10, marginBottom: -4, marginHorizontal: 16 },
  box: { backgroundColor: color.surface, borderRadius: 14, padding: 12, gap: 10 },
  note: { color: color.muted, fontSize: 13, lineHeight: 18, marginHorizontal: 16 },
  // iPhone bölümlü seçicisi: gri zemin, seçili parça beyaz ve hafif gölgeli
  seg: { flexDirection: 'row', padding: 2, borderRadius: 9, backgroundColor: color.plate },
  segItem: { flex: 1, minHeight: 38, borderRadius: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 4 },
  segOn: { backgroundColor: color.surface, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  segT: { color: color.ink, fontFamily: font.medium, fontSize: 14 },
  pal: { flex: 1, gap: 10, padding: 12, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: color.line, backgroundColor: color.bg },
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
    Alert.alert(tr('Renk teması'), tr('Yeni renkler için uygulama yeniden başlatılacak.'), [
      { text: tr('Sonra'), style: 'cancel' },
      { text: tr('Yeniden başlat'), onPress: () => { void restartApp().then((ok) => { if (!ok) Alert.alert(tr('Renk teması'), tr('Yeni renkler için uygulamayı tamamen kapatıp yeniden aç.')); }); } },
    ]);
  };
  useEffect(() => {
    if (!session) { setAdmin(false); return; }
    void supabase.auth.getUser().then(({ data }) => setAdmin(data.user?.app_metadata?.role === 'admin'));
  }, [session]);
  return (
    <ScrollView style={common.screen} contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}>
      <Text style={[r.head, { marginTop: 0 }]}>Dil</Text>
      <View style={r.box}>
        <Segment value={lang} onChange={setLang} items={[{ id: 'tr', label: 'Türkçe' }, { id: 'en', label: 'English' }, { id: 'de', label: 'Deutsch' }]} />
      </View>
      <Text style={r.note}>Uygulama seçtiğin dilde görünür. İlanlar ve mesajlar, yazıldıkları dilde gösterilir.</Text>

      {themeSupportsChoice ? (
        <>
          <Text style={r.head}>Görünüm</Text>
          <View style={r.box}>
            <Segment value={theme} onChange={pickTheme} items={[{ id: 'system', label: 'Sistem', icon: 'smartphone' }, { id: 'light', label: 'Açık tema', icon: 'sun' }, { id: 'dark', label: 'Koyu tema', icon: 'moon' }]} />
          </View>
          <Text style={r.note}>Sistem seçiliyken telefonunun ayarı izlenir.</Text>
        </>
      ) : null}

      <Text style={r.head}>Renk teması</Text>
      <View style={[r.box, { flexDirection: 'row' }]}>
        {(Object.keys(PALETTES) as PaletteId[]).map((id) => {
          const p = PALETTES[id];
          const on = palette === id;
          return (
            <Pressable key={id} style={[r.pal, on && { borderColor: color.teal, borderWidth: 2 }]} onPress={() => pickPalette(id)} accessibilityRole="radio" accessibilityState={{ selected: on }}>
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
      <Text style={r.note}>Açık ve koyu görünüm her renk temasında ayrıca çalışır.</Text>

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
        <Row icon="book-open" title="Kullanım rehberi" onPress={() => router.push('/rehber' as never)} />
        <Row icon="help-circle" title="Yardım merkezi" onPress={() => router.push('/destek')} />
        <Row icon="file-text" title="Hukuki bilgiler" onPress={() => router.push('/hukuki' as never)} last />
      </View>
      <Text style={r.head}>Şirketler için</Text>
      <View style={r.group}>
        <Row icon="upload" title="Toplu ilan aktarımını web'de aç" onPress={() => openWeb('/toplu-ilan')} last />
      </View>
      <Text style={r.note}>CSV/XML dosyasıyla toplu ilan aktarımı bilgisayarda web sitesinden yapılır.</Text>
      {admin ? <Btn title="Yönetim" onPress={() => router.push('/yonetim')} /> : null}
    </ScrollView>
  );
}

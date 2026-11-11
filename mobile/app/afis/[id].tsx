import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { PlainText, Text } from '../../components/LText';
import { qrMatrix } from '../../lib/qr';
import { SITE_URL } from '../../lib/supabase';
import { tr } from '../../lib/i18n';
import { useLang } from '../../lib/lang';
import { font } from '../../lib/theme';

/**
 * "Satılık" afişi: sahadaki makinenin üstüne asılır; QR kodu okutan ilan sayfasına gider.
 * Afiş her temada beyaz zemin, siyah yazıdır (yazıcı ve QR okuyucu için).
 * Yazdırmak için ekran görüntüsü alınır.
 */
const INK = '#111111';
const PAPER = '#FFFFFF';

function Qr({ value, size }: { value: string; size: number }) {
  const m = useMemo(() => qrMatrix(value), [value]);
  if (!m) return null;
  const n = m.length;
  const cell = Math.floor(size / (n + 8));
  const pad = Math.floor((size - cell * n) / 2);
  return (
    <View style={{ width: size, height: size, backgroundColor: PAPER, padding: pad }} accessibilityRole="image" accessibilityLabel={tr('İlanın QR kodu')}>
      {m.map((row, r) => {
        // Yan yana koyu kareleri tek parça çiz (daha az öğe, kareler arasında çizgi kalmaz)
        const runs: { start: number; len: number }[] = [];
        for (let c = 0; c < n; c++) if (row[c]) { const last = runs[runs.length - 1]; if (last && last.start + last.len === c) last.len++; else runs.push({ start: c, len: 1 }); }
        return (
          <View key={r} style={{ height: cell, width: cell * n }}>
            {runs.map((u) => <View key={u.start} style={{ position: 'absolute', left: u.start * cell, width: u.len * cell, top: 0, height: cell + 0.5, backgroundColor: INK }} />)}
          </View>
        );
      })}
    </View>
  );
}

export default function PosterScreen() {
  const { id, title, price, city } = useLocalSearchParams<{ id: string; title?: string; price?: string; city?: string }>();
  useLang();
  const url = SITE_URL ? `${SITE_URL.replace(/\/$/, '')}/ilanlar/${id}` : '';
  return (
    <ScrollView style={{ flex: 1, backgroundColor: PAPER }} contentContainerStyle={s.page}>
      <Stack.Screen options={{ title: tr('Satılık afişi') }} />
      <View style={s.band}><PlainText style={s.bandT}>{tr('SATILIK')}</PlainText></View>
      {title ? <PlainText style={s.title} numberOfLines={3}>{title}</PlainText> : null}
      {price ? <PlainText style={s.price}>{price}</PlainText> : null}
      {city ? <PlainText style={s.city}>{city}</PlainText> : null}
      {url ? (
        <>
          <Qr value={url} size={260} />
          <PlainText style={s.scan}>{tr('Fotoğraflar ve bilgiler için kodu telefonunun kamerasıyla okut')}</PlainText>
        </>
      ) : <Text style={s.scan}>Site adresi ayarlı olmadığı için QR kodu üretilemedi.</Text>}
      <PlainText style={s.brand}>MAKİNASAL</PlainText>
      <Text style={s.hint}>Yazdırmak için bu ekranın görüntüsünü al ve A4 kâğıda bas.</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40, gap: 12 },
  band: { alignSelf: 'stretch', backgroundColor: INK, paddingVertical: 12, alignItems: 'center', borderRadius: 6 },
  bandT: { color: PAPER, fontFamily: font.bold, fontSize: 46, letterSpacing: 6 },
  title: { color: INK, fontFamily: font.bold, fontSize: 26, lineHeight: 31, textAlign: 'center' },
  price: { color: INK, fontFamily: font.bold, fontSize: 36 },
  city: { color: INK, fontFamily: font.semi, fontSize: 18 },
  scan: { color: INK, fontSize: 15, lineHeight: 21, textAlign: 'center', maxWidth: 300 },
  brand: { color: INK, fontFamily: font.bold, fontSize: 20, letterSpacing: 3, marginTop: 6 },
  hint: { color: '#555555', fontSize: 12.5, textAlign: 'center', marginTop: 8 },
});

import { ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Btn, common } from '../components/ui';

const ITEMS: [string, string][] = [
  ['Hesabıma giremiyorum', 'Giriş ekranındaki "Şifremi unuttum" seçeneğini kullan. Onay e-postasını spam klasöründe de kontrol et.'],
  ['Fotoğraflarım yüklenmedi', 'İlan duraklatılmış olarak saklanır. İlanlarım bölümünde Düzenle\'ye bas, eksik fotoğrafları ekle ve kaydet.'],
  ['Şüpheli ilan veya ödeme isteği', 'İlan detayındaki "İlanı şikayet et" düğmesini kullan. Ürünü görmeden kapora gönderme. Makinasal şu anda ödeme veya emanet para kabul etmez.'],
  ['İlan nasıl kaldırılır?', 'İlanlarım bölümünden "İlanı kaldır" seçeneğini kullan. İşlem ve değerlendirme geçmişi korunur.'],
  ['Ücret var mı?', 'Başlangıç döneminde ilan vermek ücretsizdir. Premium ekranında üyelik sınırlarını inceleyebilirsin.'],
];
export default function Help() {
  return (
    <ScrollView style={common.screen} contentContainerStyle={{ padding: 12, gap: 10 }}>
      {ITEMS.map(([t, d]) => <View key={t} style={common.card}><Text style={common.h2}>{t}</Text><Text>{d}</Text></View>)}
      <Btn ghost title="Üyelik ve ilan hakları" onPress={() => router.push('/premium')} />
      <Btn ghost title="Güven sistemi" onPress={() => router.push('/guven')} />
      <Btn ghost title="Hukuki bilgiler" onPress={() => router.push('/hukuki' as never)} />
    </ScrollView>
  );
}

import { ScrollView, View } from 'react-native';
import { Text } from '../components/LText';
import { common } from '../components/ui';

const LEVELS: [string, string, string][] = [
  ['Çok güvenilir', '#1b7f3b', '4,5 üzeri puan ve en az 10 onaylı işlem'],
  ['Güvenilir', '#1b7f3b', '4,0 üzeri puan'],
  ['Orta güven', '#b36b00', '4,0 altı puan'],
  ['Yeni üye', '#666', '3 işlemden az, puan henüz oluşmadı'],
  ['Riskli', '#b00020', '2 veya daha fazla doğrulanmış şikayet ya da 3+ işlemde 3 altı puan'],
];
export default function Trust() {
  return (
    <ScrollView style={common.screen} contentContainerStyle={{ padding: 12, gap: 10 }}>
      <Text>Her üyenin alıcı ve satıcı olarak ayrı puanı olur. Puan yalnızca iki tarafın da işlemi onayladığı görüşmelerden sonra verilebilir.</Text>
      <View style={common.card}>
        <Text style={common.h2}>Seviyeler</Text>
        <Text style={common.meta}>Eşikler başlangıç için belirlendi, kullanımla ayarlanacak.</Text>
        {LEVELS.map(([n, c, d]) => <Text key={n} style={{ marginTop: 6 }}><Text style={{ color: c, fontWeight: '700' }}>{n}</Text> · {d}</Text>)}
      </View>
      <View style={common.card}>
        <Text style={common.h2}>Güvenli alışveriş</Text>
        <Text>• Ürünü görmeden kapora, ön ödeme, havale veya EFT gönderme.</Text>
        <Text>• Mesajlarda IBAN ve dış bağlantı paylaşımı engellenir.</Text>
        <Text>• Şüpheli ilanı ilan sayfasından şikayet et.</Text>
      </View>
    </ScrollView>
  );
}

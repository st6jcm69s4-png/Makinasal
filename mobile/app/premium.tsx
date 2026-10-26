import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Btn, common } from '../components/ui';
import { useApp } from '../lib/AppContext';
import { LIMITS } from '../lib/data';
import { supabase } from '../lib/supabase';

export default function Premium() {
  const { session } = useApp();
  const [prem, setPrem] = useState(false);
  useEffect(() => {
    if (!session) return;
    void supabase.from('profiles').select('is_premium').eq('id', session.user.id).maybeSingle().then((r) => setPrem(!!(r.data as { is_premium?: boolean } | null)?.is_premium));
  }, [session]);
  const l = prem ? LIMITS.prem : LIMITS.free;
  return (
    <ScrollView style={common.screen} contentContainerStyle={{ padding: 12, gap: 10 }}>
      <Text style={common.meta}>Başlangıç döneminde ilan vermek ücretsiz. Sürpriz ücret veya satış komisyonu alınmaz.</Text>
      <View style={common.card}>
        <Text style={common.h2}>{prem ? 'Premium hesabın' : 'Ücretsiz hesap'}</Text>
        <Text>• Aynı anda {l.listings} yayında veya duraklatılmış ilan</Text>
        <Text>• İlan başına {l.photos} fotoğraf</Text>
        <Text>• Mesajlaşma, favoriler ve kayıtlı aramalar</Text>
        <Text>• Karşılıklı onaylanan satışlardan sonra değerlendirme</Text>
      </View>
      <Btn title="İlan ver" onPress={() => router.push('/ilan-ver')} />
      <Text style={common.meta}>Şu anda kart bilgisi veya ödeme almıyoruz. Ücretli paketler açılırsa fiyat ve koşullar satın alma öncesinde açıkça gösterilecek. Güven puanı ve doğrulama rozetleri satın alınamaz.</Text>
    </ScrollView>
  );
}

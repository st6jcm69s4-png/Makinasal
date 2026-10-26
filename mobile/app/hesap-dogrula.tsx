import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from '../components/LText';
import { Btn, common } from '../components/ui';
import { useApp } from '../lib/AppContext';
import { supabase } from '../lib/supabase';
import { openWeb } from '../lib/web';

export default function Verify() {
  const { session } = useApp();
  const [phone, setPhone] = useState<{ confirmed: boolean; number: string } | null>(null);
  const [email, setEmail] = useState<boolean | null>(null);
  useEffect(() => {
    if (!session) return;
    void supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      setEmail(!!u?.email_confirmed_at);
      setPhone({ confirmed: !!u?.phone_confirmed_at && !!u.phone, number: u?.phone ?? '' });
    });
  }, [session]);
  if (!session) return <Text style={common.empty}>Önce giriş yap.</Text>;
  return (
    <ScrollView style={common.screen} contentContainerStyle={{ padding: 12, gap: 10 }}>
      <Text>E-posta ve telefonunun sana ait olduğunu doğrula.</Text>
      <View style={common.card}>
        <Text style={common.h2}>E-posta</Text>
        <Text>{session.user.email}</Text>
        <Text style={{ fontWeight: '700' }}>{email == null ? 'Kontrol ediliyor…' : email ? 'Doğrulandı' : 'Onay bekleniyor'}</Text>
      </View>
      <View style={common.card}>
        <Text style={common.h2}>Telefon</Text>
        <Text style={{ fontWeight: '700' }}>{phone == null ? 'Kontrol ediliyor…' : phone.confirmed ? 'Doğrulandı' : 'SMS doğrulaması gerekli'}</Text>
        {phone?.confirmed ? <Text>{phone.number}</Text> : <Text style={common.meta}>SMS doğrulaması web sitesinden yapılır; hizmet açıldığında oradaki adımları izle.</Text>}
        {phone && !phone.confirmed ? <Btn title="Web'de doğrula" onPress={() => openWeb('/hesap-dogrula')} /> : null}
      </View>
    </ScrollView>
  );
}

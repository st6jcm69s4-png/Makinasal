import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from '../components/LText';
import { router } from 'expo-router';
import { Btn, Chip, common } from '../components/ui';
import { useLang } from '../lib/lang';
import { useApp } from '../lib/AppContext';
import { supabase } from '../lib/supabase';
import { openWeb } from '../lib/web';

export default function Settings() {
  const { session } = useApp();
  const { lang, setLang } = useLang();
  const [admin, setAdmin] = useState(false);
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
      <View style={[common.card, { gap: 8 }]}>
        <Text style={common.h2}>Hesap</Text>
        {session ? (
          <>
            <Btn ghost title="Profilimi düzenle" onPress={() => router.push('/profil-duzenle')} />
            <Btn ghost title="Hesap güvenliği ve doğrulama" onPress={() => router.push('/hesap-dogrula')} />
            <Btn ghost title="Ödemelerim" onPress={() => router.push('/odemelerim')} />
            <Btn ghost title="Bildirimler" onPress={() => router.push('/bildirimler')} />
          </>
        ) : <Text style={common.meta}>Hesap ayarları için Hesabım sekmesinden giriş yap.</Text>}
      </View>
      <View style={[common.card, { gap: 8 }]}>
        <Text style={common.h2}>Bilgi</Text>
        <Btn ghost title="Üyelik ve ilan hakları" onPress={() => router.push('/premium')} />
        <Btn ghost title="Güven sistemi" onPress={() => router.push('/guven')} />
        <Btn ghost title="Yardım merkezi" onPress={() => router.push('/destek')} />
        <Btn ghost title="Hukuki bilgiler" onPress={() => router.push('/hukuki' as never)} />
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

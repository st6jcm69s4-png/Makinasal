import { ScrollView, Text } from 'react-native';
import { Btn, common } from '../../components/ui';
import { openWeb } from '../../lib/web';

const PAGES: [string, string][] = [['KVKK aydınlatma', 'kvkk'], ['Kullanım koşulları', 'kullanim'], ['Çerez politikası', 'cerez'], ['Satış ve ödeme bilgileri', 'satis']];
export default function Legal() {
  return (
    <ScrollView style={common.screen} contentContainerStyle={{ padding: 12, gap: 10 }}>
      <Text style={common.meta}>Hukuki metinler tek kaynaktan, web sitesinden yayınlanır; güncel hâli tarayıcında açılır.</Text>
      {PAGES.map(([t, slug]) => <Btn key={slug} ghost title={t} onPress={() => openWeb('/hukuki/' + slug)} />)}
    </ScrollView>
  );
}

import { router } from 'expo-router';
import type { IconName } from '../components/Icon';
import { supabase } from './supabase';
import { saveTheme } from './themePref';
import { themeSupportsChoice } from './theme';
import { foldSearch } from './suggest';

export type Lang = 'tr' | 'en' | 'de';
export type FeatureCtx = { setLang: (l: Lang) => void; signedIn: boolean };
export type Feature = {
  id: string; title: string; sub: string; icon: IconName;
  /** Türkçe, İngilizce ve Almanca anahtar kelimeler (yazım/aksan farkı önemsenmez). */
  words: string;
  /** true ise sonuca dokununca sayfa açılmaz, bir ayar uygulanır. */
  action?: boolean;
  needsLogin?: boolean; needsGuest?: boolean; androidHidden?: boolean;
  run: (c: FeatureCtx) => string | void | Promise<string | void>;
};

const open = (path: string) => () => { router.replace(path as never); };
const tab = (path: string) => () => { router.navigate(path as never); };
const net = (kind: string) => () => { router.navigate({ pathname: '/is-agi', params: { kind } } as never); };

export const FEATURES: Feature[] = [
  // Görünüm ve dil (anında uygulanır)
  { id: 'theme-dark', title: 'Koyu tema', sub: 'Uygulamayı koyu görünüme al', icon: 'moon', androidHidden: true, action: true, words: 'dark mod mode karanlık gece siyah koyu dunkel dunkler modus nachtmodus tema theme görünüm', run: async () => { await saveTheme('dark'); return 'Koyu tema açıldı.'; } },
  { id: 'theme-light', title: 'Açık tema', sub: 'Uygulamayı açık görünüme al', icon: 'sun', androidHidden: true, action: true, words: 'light mod mode aydınlık gündüz beyaz açık hell heller modus tagmodus tema theme görünüm', run: async () => { await saveTheme('light'); return 'Açık tema açıldı.'; } },
  { id: 'theme-system', title: 'Sistem görünümü', sub: 'Telefonun ayarını izle', icon: 'smartphone', androidHidden: true, action: true, words: 'sistem otomatik system automatic automatisch tema theme görünüm', run: async () => { await saveTheme('system'); return 'Görünüm telefonun ayarını izliyor.'; } },
  { id: 'palette', title: 'Renk teması', sub: 'Petrol yeşili veya bordo', icon: 'droplet', words: 'renk tema bordo petrol yeşil kırmızı palet color theme farbe design', run: open('/ayarlar') },
  { id: 'lang-tr', title: 'Türkçe', sub: 'Uygulama dilini Türkçe yap', icon: 'globe', action: true, words: 'dil language sprache türkçe turkish turkce türkisch', run: (c) => { c.setLang('tr'); return 'Dil: Türkçe'; } },
  { id: 'lang-en', title: 'English', sub: 'Uygulama dilini İngilizce yap', icon: 'globe', action: true, words: 'dil language sprache ingilizce english englisch', run: (c) => { c.setLang('en'); return 'Dil: English'; } },
  { id: 'lang-de', title: 'Deutsch', sub: 'Uygulama dilini Almanca yap', icon: 'globe', action: true, words: 'dil language sprache almanca german deutsch', run: (c) => { c.setLang('de'); return 'Dil: Deutsch'; } },
  // Hesap
  { id: 'settings', title: 'Ayarlar', sub: 'Dil, görünüm ve hesap', icon: 'sliders', words: 'ayarlar settings einstellungen tercih', run: open('/ayarlar') },
  { id: 'pw-change', title: 'Şifreyi değiştir', sub: 'Yeni şifre belirle', icon: 'lock', needsLogin: true, words: 'şifre sifre parola password passwort kennwort değiştir change ändern', run: open('/sifre-degistir') },
  { id: 'pw-forgot', title: 'Şifremi unuttum', sub: 'E-postaya kod gönder', icon: 'lock', needsGuest: true, words: 'şifre sifre unuttum parola password forgot vergessen reset sıfırla', run: open('/sifremi-unuttum') },
  { id: 'profile', title: 'Profilimi düzenle', sub: 'Ad, telefon ve konum', icon: 'user', needsLogin: true, words: 'profil profile profilim adım isim telefon numara konum şehir il bilgilerim', run: open('/profil-duzenle') },
  { id: 'verify', title: 'Hesap güvenliği ve doğrulama', sub: 'E-posta ve telefon doğrulama', icon: 'shield', needsLogin: true, words: 'güvenlik doğrulama sms kod e-posta telefon verify security sicherheit bestätigung', run: open('/hesap-dogrula') },
  { id: 'notifications', title: 'Bildirimler', sub: 'Yeni mesaj ve fiyat değişiklikleri', icon: 'bell', needsLogin: true, words: 'bildirim bildirimler notifications benachrichtigungen uyarı', run: open('/bildirimler') },
  { id: 'payments', title: 'Ödemelerim', sub: 'Gönderdiğin ve aldığın ödemeler', icon: 'credit-card', needsLogin: true, words: 'ödeme ödemelerim fatura payment payments zahlungen kart', run: open('/odemelerim') },
  { id: 'rights', title: 'Veri haklarım', sub: 'Verilerini indir veya sil', icon: 'file-text', needsLogin: true, words: 'veri kişisel kvkk hesabı sil silme indir data privacy delete account löschen daten datenschutz haklarım', run: open('/haklarim') },
  { id: 'login', title: 'Giriş yap', sub: 'Hesabına gir', icon: 'log-in', needsGuest: true, words: 'giriş login sign in anmelden oturum aç', run: tab('/hesap') },
  { id: 'signup', title: 'Üye ol', sub: 'Ücretsiz hesap oluştur', icon: 'user-plus', needsGuest: true, words: 'üye kayıt ol hesap oluştur register sign up registrieren', run: open('/kayit') },
  { id: 'logout', title: 'Çıkış yap', sub: 'Oturumu kapat', icon: 'log-out', needsLogin: true, action: true, words: 'çıkış oturumu kapat logout sign out abmelden', run: async () => { await supabase.auth.signOut(); return 'Çıkış yapıldı.'; } },
  { id: 'referral', title: 'Davet et, ilan hakkı kazan', sub: 'Davet kodunu paylaş', icon: 'gift', needsLogin: true, words: 'davet kod referans arkadaş invite referral einladen hak kazan', run: tab('/hesap') },
  // İlan ve alışveriş
  { id: 'sale', title: 'Satılık ilanlar', sub: 'Makine, kamyon ve parça', icon: 'truck', words: 'satılık ilan makine kamyon ara listings for sale inserate kaufen', run: tab('/ilanlar') },
  { id: 'post', title: 'İlan ver', sub: 'Makine veya parça sat', icon: 'plus-circle', words: 'ilan ver sat satış ekle yayınla post sell listing verkaufen inserieren', run: open('/ilan-ver') },
  { id: 'mine', title: 'İlanlarım', sub: 'Verdiğin ilanlar', icon: 'list', needsLogin: true, words: 'ilanlarım benim ilanlarım my listings meine inserate', run: open('/ilanlarim') },
  { id: 'favs', title: 'Favoriler', sub: 'Beğendiğin ilanlar', icon: 'heart', words: 'favori favoriler beğen favorites favoriten merkliste', run: tab('/favoriler') },
  { id: 'messages', title: 'Mesajlar', sub: 'Alıcı ve satıcı yazışmaları', icon: 'message-square', words: 'mesaj mesajlar yazışma sohbet messages chat nachrichten', run: tab('/mesajlar') },
  { id: 'saved', title: 'Kayıtlı aramalar', sub: 'Kaydettiğin aramalar', icon: 'bookmark', needsLogin: true, words: 'kayıtlı arama saved searches gespeicherte suchen', run: open('/kayitli-aramalar') },
  { id: 'compare', title: 'Karşılaştır', sub: 'İlanları yan yana gör', icon: 'columns', words: 'karşılaştır karşılaştırma compare vergleichen', run: open('/karsilastir') },
  { id: 'parts', title: 'Yedek parça', sub: 'Numaraya göre ara', icon: 'settings', words: 'yedek parça lastik filtre pompa spare parts tyres ersatzteile reifen', run: open('/yedek-parca') },
  { id: 'map', title: 'İl haritası', sub: 'İllere göre ilan dağılımı', icon: 'map', words: 'harita il şehir map province karte', run: open('/harita') },
  { id: 'premium', title: 'Premium tarifeler', sub: 'Üstte görün, daha çok iş bul', icon: 'award', words: 'premium üyelik abonelik tarife paket fiyat limit hak reklamsız membership subscription plan abo mitgliedschaft', run: open('/premium') },
  { id: 'assistant', title: 'Yapay zeka asistanı', sub: 'Profilini ve ilanlarını güçlendir', icon: 'cpu', words: 'yapay zeka asistan ai öneri yardım chatgpt claude bot assistant ki assistent', run: open('/asistan') },
  // İş ağı
  { id: 'rent', title: 'Kiralık makineler', sub: 'Günlük, aylık', icon: 'key', words: 'kiralık kira kiralama rent rental mieten vermietung', run: net('rental_machine') },
  { id: 'operators', title: 'Operatör ve ustalar', sub: 'Şoför, usta, operatör', icon: 'user-check', words: 'operatör usta şoför eleman personel operator driver fahrer mitarbeiter', run: net('rental_operator') },
  { id: 'jobs', title: 'İş talepleri', sub: 'Teklif ver, işi al', icon: 'clipboard', words: 'iş talep teklif hafriyat job jobs auftrag aufträge angebot', run: net('job') },
  { id: 'part-req', title: 'Parça talepleri', sub: 'Aradığın parçayı yaz', icon: 'search', words: 'parça talep arıyorum aranıyor part request teileanfrage', run: net('part_request') },
  { id: 'firms', title: 'Şirketler ve filolar', sub: 'Hizmet bölgesine göre', icon: 'briefcase', words: 'şirket firma filo company firms firmen flotte', run: net('firma') },
  { id: 'tow', title: 'Çekici bul', sub: 'En yakın, puanlı', icon: 'life-buoy', words: 'çekici yol yardım kurtarma tow towing abschleppdienst pannenhilfe', run: open('/cekici') },
  { id: 'net-account', title: 'İş ağı hesabım', sub: 'Tekliflerin ve işlerin', icon: 'briefcase', needsLogin: true, words: 'iş ağı hesabım teklif tekliflerim work network angebote', run: open('/ag/hesabim') },
  { id: 'inventory', title: 'Makinelerim', sub: 'Makine ve araçların', icon: 'package', needsLogin: true, words: 'makinelerim makine parkı envanter makinelerim araçlarım filo inventory fleet fuhrpark', run: open('/ag/envanter') },
  { id: 'firm-profile', title: 'Firma profilim', sub: 'Şirket vitrinin', icon: 'briefcase', needsLogin: true, words: 'firma şirket profil vitrin company profile firmenprofil', run: open('/ag/firma-kaydi') },
  // Bilgi
  { id: 'trust', title: 'Güvenli işlem rehberi', sub: 'Dolandırıcılığa karşı ipuçları', icon: 'shield', words: 'güven güvenli dolandırıcı kapora sahte scam fraud safe trading betrug sicher', run: open('/guven') },
  { id: 'help', title: 'Yardım merkezi', sub: 'Sık sorulanlar ve iletişim', icon: 'help-circle', words: 'yardım destek iletişim sss help support contact hilfe kontakt', run: open('/destek') },
  { id: 'legal', title: 'Hukuki bilgiler', sub: 'KVKK, kullanım koşulları, çerezler', icon: 'file-text', words: 'hukuki kvkk gizlilik koşullar sözleşme çerez legal privacy terms cookies datenschutz agb impressum', run: open('/hukuki') },
];

/** Aranan metne göre uygun özellikleri sıralar; boş aramada hızlı seçenekleri döndürür. */
export function findFeatures(query: string, ctx: { signedIn: boolean; androidThemeHidden: boolean }, limit = 12): Feature[] {
  const ok = (f: Feature) => !(f.needsLogin && !ctx.signedIn) && !(f.needsGuest && ctx.signedIn) && !(f.androidHidden && ctx.androidThemeHidden);
  const pool = FEATURES.filter(ok);
  const q = foldSearch(query.trim());
  if (!q) return ['theme-dark', 'lang-de', 'post', 'favs', 'settings', 'help'].map((id) => pool.find((f) => f.id === id)).filter(Boolean) as Feature[];
  const tokens = q.split(/\s+/).filter(Boolean);
  const scored: { f: Feature; s: number }[] = [];
  for (const f of pool) {
    const title = foldSearch(f.title), hay = foldSearch(`${f.title} ${f.sub} ${f.words}`);
    if (!tokens.every((t) => hay.includes(t))) continue;
    let s = 0;
    if (title === q) s += 10;
    if (title.startsWith(q)) s += 6;
    else if (title.includes(q)) s += 4;
    for (const t of tokens) { if (title.includes(t)) s += 2; else if (foldSearch(f.words).split(/\s+/).some((w) => w.startsWith(t))) s += 1; }
    scored.push({ f, s });
  }
  return scored.sort((a, b) => b.s - a.s).slice(0, limit).map((x) => x.f);
}
export const androidThemeHidden = !themeSupportsChoice;

import { SwipeTabs } from '../../../components/SwipeTabs';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTabScrollTop } from '../../../lib/scrollTop';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { PlainText, Text, TextInput } from '../../../components/LText';
import { router, useFocusEffect } from 'expo-router';
import { Icon, type IconName } from '../../../components/Icon';
import { Btn, Chip, Field, Label } from '../../../components/ui';
import { Captcha } from '../../../components/Captcha';
import { fetchProviders, TURNSTILE_SITE_KEY } from '../../../lib/auth';
import { PhoneField, emptyPhone, phoneToE164, type PhoneValue } from '../../../components/PhoneField';
import { Avatar } from '../../../components/kit';
import { Group, type Item } from '../../../components/Rows';
import { color, font, radius, shadow } from '../../../lib/theme';
import { displayName, initials } from '../../../lib/person';
import { ReferralBox } from '../../../components/ReferralBox';
import { useApp } from '../../../lib/AppContext';
import { configured, supabase } from '../../../lib/supabase';
import { SocialAuth } from '../../../components/SocialAuth';
import { confirmSignOut } from '../../../lib/signOut';
import { tr } from '../../../lib/i18n';

function Member() {
  const scroller = useRef<never>(null);
  useTabScrollTop('hesap', scroller);
  const { session, favs } = useApp();
  const uid = session?.user.id ?? '';
  const [profile, setProfile] = useState<{ full_name: string | null; city: string | null; is_store: boolean; store_name: string | null } | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const [unread, setUnread] = useState(0);
  const [notif, setNotif] = useState(0);
  useFocusEffect(useCallback(() => {
    if (!uid) return;
    let alive = true;
    void (async () => {
      const [p, l, u, n] = await Promise.all([
        supabase.from('profiles').select('full_name,city,is_store,store_name').eq('id', uid).maybeSingle(),
        supabase.from('listings').select('id', { count: 'exact', head: true }).eq('seller_id', uid).eq('status', 'active'),
        supabase.rpc('unread_counts'),
        supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', uid).is('read_at', null),
      ]);
      if (!alive) return;
      setProfile((p.data as typeof profile) ?? null);
      setActive(l.error ? null : l.count ?? 0);
      setUnread(u.error || !Array.isArray(u.data) ? 0 : (u.data as { n: number | string }[]).reduce((a, r) => a + Number(r.n), 0));
      setNotif(n.error ? 0 : n.count ?? 0);
    })();
    return () => { alive = false; };
  }, [uid]));

  const name = displayName(session, profile?.full_name);
  const isAdmin = (session?.user.app_metadata as { role?: string } | undefined)?.role === 'admin';
  const go = (path: string) => () => router.push(path as never);
  return (
    <ScrollView ref={scroller} style={{ backgroundColor: color.bg }} contentContainerStyle={s.body} contentInsetAdjustmentBehavior="automatic">
      {/* Ayarlar uygulamasındaki Apple hesabı satırı gibi: büyük avatar, ad, alt satır */}
      <View style={s.group}>
        <Pressable onPress={go('/profil-duzenle')} style={({ pressed }) => [s.profile, pressed && { backgroundColor: color.plate }]} accessibilityRole="button" accessibilityLabel={`${name}, ${tr('Profili düzenle')}`}>
          <Avatar name={name} size={60} tone="accent" />
          <View style={{ flex: 1, gap: 2 }}>
            <PlainText style={s.name} numberOfLines={1}>{name}</PlainText>
            <Text style={s.sub} numberOfLines={1}>{[profile?.is_store ? (profile.store_name || 'Mağaza') : 'Bireysel üye', profile?.city].filter(Boolean).join(' · ')}</Text>
            <Text style={s.sub2}>Profil, iletişim ve güvenlik</Text>
          </View>
          <View style={{ opacity: 0.55 }}><Icon name="chevron-right" size={18} color={color.muted} /></View>
        </Pressable>
        <View style={s.stats}>
          {([['Yayında ilan', active ?? '–', '/ilanlarim'], ['Favori', favs.size, '/favoriler'], ['Yeni mesaj', unread, '/mesajlar']] as const).map(([l, v, to], i) => (
            <Pressable key={l} onPress={go(to)} style={({ pressed }) => [s.stat, i > 0 && s.statLine, pressed && { backgroundColor: color.plate }]} accessibilityRole="button" accessibilityLabel={`${tr(l)}: ${v}`}>
              <PlainText style={s.statNum}>{String(v)}</PlainText>
              <Text style={s.statLabel} numberOfLines={1}>{l}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <Group title="İlanlarım ve takip" items={[
        { icon: 'list', tint: 'accent', label: 'İlanlarım', value: active ? `${active} ${tr('yayında')}` : undefined, go: go('/ilanlarim') },
        { icon: 'message-square', tint: 'green', label: 'Mesajlar', badge: unread || undefined, go: () => router.push('/mesajlar') },
        { icon: 'bell', tint: 'red', label: 'Bildirimler', badge: notif || undefined, go: go('/bildirimler') },
        { icon: 'heart', tint: 'red', label: 'Favorilerim', value: String(favs.size), go: () => router.push('/favoriler') },
        { icon: 'bookmark', tint: 'purple', label: 'Kayıtlı aramalar', go: go('/kayitli-aramalar') },
        { icon: 'repeat', tint: 'gray', label: 'Karşılaştırma', go: go('/karsilastir') },
      ]} />
      <Group title="Premium" items={[
        { icon: 'award', tint: 'gold', label: 'Premium tarifeler', sub: 'Üstte görün, daha çok iş bul', go: go('/premium') },
        { icon: 'cpu', tint: 'purple', label: 'Yapay zeka asistanı', sub: 'Profilini ve ilanlarını güçlendir', go: go('/asistan') },
      ]} />
      <Group title="İş ağı" items={[
        { icon: 'briefcase', tint: 'ink', label: 'İş ağı hesabım', sub: 'Taleplerim, tekliflerim', go: go('/ag/hesabim') },
        { icon: 'home', tint: 'ink', label: 'Firma profilim', go: go('/ag/firma-kaydi') },
        { icon: 'truck', tint: 'ink', label: 'Makinelerim ve araçlarım', go: go('/ag/envanter') },
      ]} />
      <Group title="Hesap" items={[
        { icon: 'user', tint: 'gray', label: 'Profili düzenle', go: go('/profil-duzenle') },
        { icon: 'credit-card', tint: 'green', label: 'Ödemelerim', go: go('/odemelerim') },
        { icon: 'shield', tint: 'gray', label: 'Hesap güvenliği', go: go('/hesap-dogrula') },
        { icon: 'lock', tint: 'gray', label: 'Şifreyi değiştir', go: go('/sifre-degistir') },
        ...(isAdmin ? [{ icon: 'sliders' as IconName, tint: 'ink' as const, label: 'Yönetim', go: go('/yonetim') }] : []),
      ]} />
      <Group title="Keşfet ve destek" items={[
        { icon: 'tool', tint: 'accent', label: 'Yedek parça', go: go('/yedek-parca') },
        { icon: 'life-buoy', tint: 'red', label: 'Çekici bul', sub: 'En yakın çekiciler, puanlarıyla', go: go('/cekici') },
        { icon: 'map', tint: 'green', label: 'İllere göre ilanlar', go: go('/harita') },
        { icon: 'book-open', tint: 'gold', label: 'Kullanım rehberi', sub: 'Her bölüm adım adım', go: go('/rehber') },
        { icon: 'file-text', tint: 'gray', label: 'Hukuki bilgiler ve veri haklarım', go: go('/hukuki') },
        { icon: 'settings', tint: 'gray', label: 'Ayarlar ve yardım', go: go('/ayarlar') },
      ]} />
      <View style={{ gap: 7 }}>
        <Text style={s.groupTitle}>Davet et</Text>
        <ReferralBox />
      </View>
      <Group items={[{ label: 'Çıkış yap', destructive: true, go: () => void confirmSignOut() }]} />
    </ScrollView>
  );
}

function AccountScreen() {
  const { session } = useApp();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState<PhoneValue>(emptyPhone);
  const [via, setVia] = useState<'email' | 'phone'>('email');
  const [phoneOk, setPhoneOk] = useState(false);
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [capKey, setCapKey] = useState(0);
  useEffect(() => { void fetchProviders().then((p) => setPhoneOk(p.phone)); }, []);

  async function signIn() {
    if (!configured) { setMsg('Uygulama ayarları eksik (.env dosyası).'); return; }
    setBusy(true); setMsg('');
    if (TURNSTILE_SITE_KEY && !token) { setBusy(false); setMsg('Önce güvenlik doğrulamasını tamamla.'); return; }
    const opts = token ? { captchaToken: token } : undefined;
    let error;
    if (via === 'phone') {
      const p = phoneToE164(phone);
      if (!p) { setBusy(false); setMsg('Geçerli bir telefon numarası gir.'); return; }
      ({ error } = await supabase.auth.signInWithPassword({ phone: p, password, options: opts }));
    } else {
      ({ error } = await supabase.auth.signInWithPassword({ email: email.trim(), password, options: opts }));
    }
    setBusy(false);
    if (error) {
      const m = error.message.toLowerCase();
      setMsg(m.includes('captcha') ? 'Güvenlik doğrulaması tamamlanamadı. Kutuyu yenileyip tekrar dene.' : m.includes('confirm') ? 'Hesabın henüz doğrulanmamış. E-postandaki bağlantıyı aç.' : 'Giriş yapılamadı. Bilgilerini kontrol et.');
      setToken(null); setCapKey((k) => k + 1);
    }
  }

  if (session) return <Member />;
  return (
    <ScrollView style={{ backgroundColor: color.bg }} contentContainerStyle={s.body} keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="automatic">
      <View style={[s.group, s.profile]}>
        <View style={s.avatar}><Icon name="user" size={28} color={color.tealInk} /></View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.name}>Giriş yap</Text>
          <Text style={s.sub}>İlan ver, mesajlaş, teklif al.</Text>
        </View>
      </View>
      <View style={{ gap: 22 }}>
        <View style={{ gap: 12 }}>
          {phoneOk ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Chip title="E-posta" on={via === 'email'} onPress={() => setVia('email')} />
              <Chip title="Telefon" on={via === 'phone'} onPress={() => setVia('phone')} />
            </View>
          ) : null}
          {via === 'phone'
            ? <PhoneField label="Cep telefonu" value={phone} onChange={setPhone} />
            : <Field label="E-posta" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" value={email} onChangeText={setEmail} />}
          <Field label="Şifre" secureTextEntry autoCapitalize="none" autoCorrect={false} value={password} onChangeText={setPassword} />
          {TURNSTILE_SITE_KEY ? <Captcha key={capKey} onToken={setToken} /> : null}
          <Pressable onPress={() => router.push('/sifremi-unuttum' as never)} hitSlop={8} accessibilityRole="button" style={{ alignSelf: 'flex-end' }}><Text style={{ color: color.tealText, fontWeight: '600' }}>Şifremi unuttum</Text></Pressable>
          {msg ? <Text style={s.err}>{msg}</Text> : null}
          <Btn title={busy ? 'Giriş yapılıyor…' : 'Giriş yap'} disabled={busy} onPress={() => void signIn()} />
          <Btn ghost title="Kayıt ol" onPress={() => router.push('/kayit' as never)} />
          <SocialAuth />
        </View>
        <View style={{ gap: 6 }}>
          <Text style={s.groupTitle}>Misafir olarak</Text>
          <View style={s.guestCard}>
            <View style={s.guestCol}>
              <Text style={s.guestH}>Yapabilirsin</Text>
              {['İlanları ve kategorileri gezmek', 'Yedek parça ve çekici aramak', 'İş ağı ilanlarına ve firmalara bakmak', 'İllere göre ilanları görmek'].map((t) => <View key={t} style={s.guestRow}><Icon name="check" size={15} color={color.good} /><Text style={s.guestT}>{t}</Text></View>)}
            </View>
            <View style={[s.guestCol, { borderLeftWidth: 1, borderLeftColor: color.line }]}>
              <Text style={s.guestH}>Giriş gerekir</Text>
              {['İlan vermek', 'Mesaj ve teklif', 'Favori ve kayıtlı arama', 'Telefon numarasını görmek'].map((t) => <View key={t} style={s.guestRow}><Icon name="lock" size={14} color={color.muted} /><Text style={[s.guestT, { color: color.muted }]}>{t}</Text></View>)}
            </View>
          </View>
        </View>
        <Group title="Giriş yapmadan" items={[
          { icon: 'tool', tint: 'accent', label: 'Yedek parça ara', go: () => router.push('/yedek-parca') },
          { icon: 'map', tint: 'green', label: 'İllere göre ilanlar', go: () => router.push('/harita') },
          { icon: 'life-buoy', tint: 'gray', label: 'Yardım ve hukuki bilgiler', go: () => router.push('/destek') },
        ]} />
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { padding: 20, gap: 12, flexGrow: 1, backgroundColor: color.bg },
  h: { fontSize: 22, fontWeight: '700' },
  input: { padding: 12, backgroundColor: color.surface, borderRadius: 12, borderWidth: 1, borderColor: color.line },
  btn: { backgroundColor: color.accent, padding: 14, borderRadius: 12, alignItems: 'center' },
  btnText: { color: color.accentInk, fontWeight: '600' },
  btnGhost: { borderWidth: 1, borderColor: color.accent, padding: 14, borderRadius: 12, alignItems: 'center' },
  btnGhostText: { color: color.accentText, fontWeight: '600' },
  err: { color: color.bad },
  note: { color: color.muted },
  guestCard: { flexDirection: 'row', backgroundColor: color.surface, borderRadius: radius + 4, ...shadow },
  guestCol: { flex: 1, padding: 12, gap: 8 },
  guestH: { fontFamily: font.bold, fontSize: 15, color: color.ink },
  guestRow: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  guestT: { flex: 1, fontSize: 13.5, color: color.ink, lineHeight: 17 },
  group: { backgroundColor: color.surface, borderRadius: 14, overflow: 'hidden' },
  groupTitle: { fontSize: 13, color: color.muted, marginLeft: 16 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: color.teal, alignItems: 'center', justifyContent: 'center' },
  name: { color: color.ink, fontFamily: font.semi, fontSize: 21, lineHeight: 26 },
  sub: { color: color.ink, fontSize: 14.5 },
  sub2: { color: color.muted, fontSize: 13 },
  stats: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.line },
  stat: { flex: 1, paddingVertical: 11, alignItems: 'center', gap: 1 },
  statLine: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: color.line },
  statNum: { color: color.ink, fontFamily: font.semi, fontSize: 20 },
  statLabel: { color: color.muted, fontSize: 12.5 },
  body: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40, gap: 24 },
  outTextOld: { color: color.tealInk, fontFamily: font.bold, fontSize: 16 },
});

/** Sağa/sola kaydırarak komşu sekmeye geçilir (bkz. components/SwipeTabs.tsx). */
export default function Account() {
  return <SwipeTabs route="hesap"><AccountScreen /></SwipeTabs>;
}

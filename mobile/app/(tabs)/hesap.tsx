import { useCallback, useRef, useState } from 'react';
import { useTabScrollTop } from '../../lib/scrollTop';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { PlainText, Text, TextInput } from '../../components/LText';
import { router, useFocusEffect } from 'expo-router';
import { Icon, type IconName } from '../../components/Icon';
import { Btn, Field, Hatch, Label } from '../../components/ui';
import { Avatar } from '../../components/kit';
import { Group, type Item } from '../../components/Rows';
import { color, font, radius } from '../../lib/theme';
import { displayName, initials } from '../../lib/person';
import { ReferralBox } from '../../components/ReferralBox';
import { useApp } from '../../lib/AppContext';
import { configured, supabase, SITE_URL } from '../../lib/supabase';
import { SocialAuth } from '../../components/SocialAuth';
import { openWeb } from '../../lib/web';

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
  const stats: [string, string | number][] = [['Yayında ilan', active ?? '–'], ['Favori', favs.size], ['Yeni mesaj', unread]];
  return (
    <ScrollView ref={scroller} style={{ backgroundColor: color.bg }} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={s.head}>
        <Avatar name={name} size={56} tone="accent" />
        <View style={{ flex: 1, gap: 2 }}>
          <PlainText style={s.name} numberOfLines={1}>{name}</PlainText>
          <Text style={s.sub}>{[profile?.is_store ? (profile.store_name || 'Mağaza') : 'Bireysel üye', profile?.city].filter(Boolean).join(' · ')}</Text>
        </View>
        <Pressable onPress={go('/profil-duzenle')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Profili düzenle"><Icon name="edit-2" size={19} color="#fff" /></Pressable>
      </View>
      <View style={s.stats}>
        {stats.map(([l, v], i) => (
          <View key={l} style={[s.stat, i > 0 && { borderLeftWidth: 1, borderLeftColor: color.navy2 }]}>
            <PlainText style={s.statNum}>{String(v)}</PlainText>
            <Label style={{ color: color.onNavy }}>{l}</Label>
          </View>
        ))}
      </View>
      <Hatch height={7} />
      <View style={s.body}>
        <Pressable style={({ pressed }) => [s.cta, pressed && { opacity: 0.85 }]} onPress={go('/ilan-ver')} accessibilityRole="button">
          <Icon name="plus" size={20} color="#fff" /><Text style={s.ctaText}>İlan ver</Text>
        </Pressable>
        <Group title="İlanlarım ve takip" items={[
          { icon: 'list', label: 'İlanlarım', sub: active ? `${active} yayında` : undefined, go: go('/ilanlarim') },
          { icon: 'message-square', label: 'Mesajlar', badge: unread || undefined, go: () => router.navigate('/mesajlar') },
          { icon: 'bell', label: 'Bildirimler', badge: notif || undefined, go: go('/bildirimler') },
          { icon: 'heart', label: 'Favorilerim', sub: `${favs.size} ilan`, go: () => router.navigate('/favoriler') },
          { icon: 'bookmark', label: 'Kayıtlı aramalar', go: go('/kayitli-aramalar') },
          { icon: 'repeat', label: 'Karşılaştırma', go: go('/karsilastir') },
        ]} />
        <Group title="İş ağı" items={[
          { icon: 'briefcase', label: 'İş ağı hesabım', sub: 'Taleplerim, tekliflerim', go: go('/ag/hesabim') },
          { icon: 'home', label: 'Firma profilim', go: go('/ag/firma-kaydi') },
          { icon: 'truck', label: 'Envanterim', go: go('/ag/envanter') },
        ]} />
        <Group title="Hesap" items={[
          { icon: 'user', label: 'Profili düzenle', go: go('/profil-duzenle') },
          { icon: 'credit-card', label: 'Ödemelerim', go: go('/odemelerim') },
          { icon: 'award', label: 'Üyelik ve ilan hakları', go: go('/premium') },
          { icon: 'shield', label: 'Hesap güvenliği', go: go('/hesap-dogrula') },
          ...(isAdmin ? [{ icon: 'sliders' as IconName, label: 'Yönetim', go: go('/yonetim') }] : []),
        ]} />
        <Group title="Keşfet ve destek" items={[
          { icon: 'tool', label: 'Yedek parça', go: go('/yedek-parca') },
          { icon: 'life-buoy', label: 'Çekici bul', sub: 'En yakın çekiciler, puanlarıyla', go: go('/cekici') },
          { icon: 'map', label: 'İl haritası', go: go('/harita') },
          { icon: 'file-text', label: 'Hukuki bilgiler ve veri haklarım', go: go('/hukuki') },
          { icon: 'settings', label: 'Ayarlar ve yardım', go: go('/ayarlar') },
        ]} />
        <View style={{ gap: 6 }}>
          <Label style={{ marginLeft: 2 }}>Davet et</Label>
          <ReferralBox />
        </View>
        <Pressable style={s.out} onPress={() => void supabase.auth.signOut()} accessibilityRole="button">
          <Icon name="log-out" size={18} color={color.accent} /><Text style={s.outText}>Çıkış yap</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

export default function Account() {
  const { session } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function signIn() {
    if (!configured) { setMsg('Uygulama ayarları eksik (.env dosyası).'); return; }
    setBusy(true); setMsg('');
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setMsg('Giriş yapılamadı. E-posta veya şifreyi kontrol et.');
  }

  async function forgot() {
    const mail = email.trim();
    if (!mail) { setMsg('Önce e-posta adresini yaz, sonra "Şifremi unuttum"a bas.'); return; }
    setBusy(true); setMsg('');
    const { error } = await supabase.auth.resetPasswordForEmail(mail, { redirectTo: `${SITE_URL.replace(/\/$/, '')}/auth/callback?next=/sifre-yenile` });
    setBusy(false);
    if (error) { setMsg('Şifre sıfırlama bağlantısı buradan gönderilemedi. Web sitesinden dene.'); openWeb('/giris'); }
    else setMsg('Bu e-posta ile bir hesap varsa şifre sıfırlama bağlantısı gönderildi. Gelen kutunu ve spam klasörünü kontrol et.');
  }

  if (session) return <Member />;
  return (
    <ScrollView style={{ backgroundColor: color.bg }} contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
      <View style={s.head}>
        <View style={s.avatar}><Icon name="user" size={26} color="#fff" /></View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.name}>Giriş yap</Text>
          <Text style={s.sub}>İlan ver, mesajlaş, teklif al.</Text>
        </View>
      </View>
      <Hatch height={7} />
      <View style={s.body}>
        <View style={{ gap: 12 }}>
          <Field label="E-posta" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
          <Field label="Şifre" secureTextEntry value={password} onChangeText={setPassword} />
          <Pressable onPress={() => void forgot()} hitSlop={8} accessibilityRole="button" style={{ alignSelf: 'flex-end' }}><Text style={{ color: color.accent, fontWeight: '600' }}>Şifremi unuttum</Text></Pressable>
          {msg ? <Text style={s.err}>{msg}</Text> : null}
          <Btn title={busy ? 'Giriş yapılıyor…' : 'Giriş yap'} disabled={busy} onPress={() => void signIn()} />
          <Btn ghost title="Kayıt ol" onPress={() => router.push('/kayit' as never)} />
          <SocialAuth />
        </View>
        <View style={{ gap: 6 }}>
          <Label style={{ marginLeft: 2 }}>Misafir olarak</Label>
          <View style={s.guestCard}>
            <View style={s.guestCol}>
              <Text style={s.guestH}>Yapabilirsin</Text>
              {['İlanları ve kategorileri gezmek', 'Yedek parça ve çekici aramak', 'İş ağı ilanlarına ve firmalara bakmak', 'İl haritasını görmek'].map((t) => <View key={t} style={s.guestRow}><Icon name="check" size={15} color={color.good} /><Text style={s.guestT}>{t}</Text></View>)}
            </View>
            <View style={[s.guestCol, { borderLeftWidth: 1, borderLeftColor: color.line }]}>
              <Text style={s.guestH}>Giriş gerekir</Text>
              {['İlan vermek', 'Mesaj ve teklif', 'Favori ve kayıtlı arama', 'Telefon numarasını görmek'].map((t) => <View key={t} style={s.guestRow}><Icon name="lock" size={14} color={color.muted} /><Text style={[s.guestT, { color: color.muted }]}>{t}</Text></View>)}
            </View>
          </View>
        </View>
        <Group title="Giriş yapmadan" items={[
          { icon: 'tool', label: 'Yedek parça ara', go: () => router.push('/yedek-parca') },
          { icon: 'map', label: 'İl haritası', go: () => router.push('/harita') },
          { icon: 'life-buoy', label: 'Yardım ve hukuki bilgiler', go: () => router.push('/destek') },
        ]} />
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { padding: 20, gap: 12, flexGrow: 1, backgroundColor: '#F6F5F3' },
  h: { fontSize: 22, fontWeight: '700' },
  input: { padding: 12, backgroundColor: '#fff', borderRadius: 4, borderWidth: 1, borderColor: '#DDD9DC' },
  btn: { backgroundColor: '#800020', padding: 14, borderRadius: 4, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
  btnGhost: { borderWidth: 1, borderColor: '#800020', padding: 14, borderRadius: 4, alignItems: 'center' },
  btnGhostText: { color: '#800020', fontWeight: '600' },
  err: { color: '#9C2626' },
  note: { color: '#66616A' },
  guestCard: { flexDirection: 'row', backgroundColor: color.surface, borderWidth: 1, borderColor: color.line, borderRadius: radius },
  guestCol: { flex: 1, padding: 12, gap: 8 },
  guestH: { fontFamily: font.bold, fontSize: 15, color: color.ink },
  guestRow: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  guestT: { flex: 1, fontSize: 13.5, color: color.ink, lineHeight: 17 },
  head: { backgroundColor: color.navy, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  avatar: { width: 56, height: 56, borderRadius: radius, backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontFamily: font.bold, fontSize: 24, letterSpacing: 1 },
  name: { color: '#fff', fontFamily: font.labelBold, fontSize: 28, letterSpacing: 0.4 },
  sub: { color: color.onNavy, fontSize: 14 },
  stats: { flexDirection: 'row', backgroundColor: color.navy, borderTopWidth: 1, borderTopColor: color.navy2 },
  stat: { flex: 1, paddingVertical: 10, paddingHorizontal: 14, gap: 1 },
  statNum: { color: '#fff', fontFamily: font.bold, fontSize: 24 },
  body: { padding: 12, gap: 18 },
  cta: { backgroundColor: color.accent, borderRadius: radius, minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  group: { backgroundColor: color.surface, borderWidth: 1, borderColor: color.line, borderRadius: radius },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 12, minHeight: 50 },
  rowLine: { borderBottomWidth: 1, borderBottomColor: color.line },
  rowLabel: { fontSize: 16, color: color.ink, fontWeight: '500' },
  rowSub: { fontSize: 13, color: color.muted },
  badge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  out: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: color.accent, borderRadius: radius, minHeight: 48 },
  outText: { color: color.accent, fontWeight: '600', fontSize: 16 },
});

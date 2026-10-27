import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native';
import { router, useGlobalSearchParams, usePathname } from 'expo-router';
import { useApp } from '../lib/AppContext';
import { PlainText, Text } from './LText';
import { Icon, type IconName } from './Icon';
import { Btn } from './ui';
import { Hatch } from './ui';
import { openWeb } from '../lib/web';
import { color, font, radius } from '../lib/theme';

type App = ReturnType<typeof useApp>;
/** Giriş bittikten sonra kullanıcının başlattığı işi sürdüren işlev; güncel (girişli) uygulama durumunu alır. */
type Retry = (app: App) => void;
type Ctx = { askLogin: (reason?: string, retry?: Retry) => void; notify: (title: string, err: string, retry?: Retry) => void };
const LoginCtx = createContext<Ctx>({ askLogin: () => {}, notify: () => {} });
/** Misafir giriş gerektiren bir işleme dokununca alt panel açar: giriş yap, kayıt ol ya da gezmeye devam et. */
export const useLoginPrompt = () => useContext(LoginCtx);

export function LoginPromptProvider({ children }: { children: ReactNode }) {
  const [reason, setReason] = useState<string | null>(null);
  const app = useApp();
  const appRef = useRef(app); appRef.current = app;
  const path = usePathname();
  const params = useGlobalSearchParams();
  const where = useRef(''); // misafirin giriş panelini açtığı ekran
  where.current = (() => {
    const q = Object.entries(params).filter(([, v]) => typeof v === 'string' && v && !path.includes(v)).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
    return q ? `${path}?${q}` : path;
  })();
  const pending = useRef<{ to: string; retry?: Retry; at: number } | null>(null);
  const askLogin = useCallback((r?: string, retry?: Retry) => {
    pending.current = { to: where.current, retry, at: Date.now() };
    setReason(r ?? 'Bu işlem için giriş yapman gerekir.');
  }, []);
  const close = () => setReason(null);
  // Hata metni giriş gerektiriyorsa panel, değilse normal uyarı gösterilir.
  const notify = useCallback((title: string, err: string, retry?: Retry) => { if (/giriş/i.test(err)) askLogin(err, retry); else Alert.alert(title, err); }, [askLogin]);
  // Giriş tamamlanınca: kullanıcıyı başladığı ekrana geri götür ve yarım kalan işi sürdür (10 dakika içinde).
  const signedIn = !!app.session;
  useEffect(() => {
    const p = pending.current;
    if (!signedIn || !p) return;
    pending.current = null;
    if (Date.now() - p.at > 10 * 60 * 1000) return;
    const t = setTimeout(() => {
      if (p.to && p.to !== '/hesap') router.navigate(p.to as never);
      if (p.retry) setTimeout(() => p.retry?.(appRef.current), 450);
    }, 250);
    return () => clearTimeout(t);
  }, [signedIn]);
  const value = useMemo(() => ({ askLogin, notify }), [askLogin, notify]);
  return (
    <LoginCtx.Provider value={value}>
      {children}
      <Modal visible={reason !== null} transparent animationType="slide" onRequestClose={close}>
        <View style={s.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityRole="button" accessibilityLabel="Kapat" />
          <View style={s.sheet}>
            <Hatch height={6} />
            <View style={s.body}>
              <View style={s.icon}><Icon name="lock" size={24} color="#fff" /></View>
              <PlainText style={s.title}>GİRİŞ YAP</PlainText>
              <Text style={s.text}>{reason}</Text>
              <Btn title="Giriş yap" onPress={() => { close(); router.navigate('/hesap'); }} />
              <Btn ghost title="Kayıt ol (web sitesi)" onPress={() => { close(); openWeb('/giris'); }} />
              <Pressable onPress={close} hitSlop={10} accessibilityRole="button" style={{ alignItems: 'center', paddingVertical: 8 }}><Text style={s.skip}>Şimdilik gezmeye devam et</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </LoginCtx.Provider>
  );
}

/** Misafirin giriş gerektiren bir ekrana geldiğinde gördüğü boş durum. */
export function GuestGate({ text, icon = 'lock' }: { text: string; icon?: IconName }) {
  return (
    <View style={g.wrap}>
      <View style={s.icon}><Icon name={icon} size={24} color="#fff" /></View>
      <Text style={g.text}>{text}</Text>
      <View style={{ alignSelf: 'stretch', gap: 8 }}>
        <Btn title="Giriş yap" onPress={() => router.navigate('/hesap')} />
        <Btn ghost title="Kayıt ol (web sitesi)" onPress={() => openWeb('/giris')} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: color.bg, borderTopLeftRadius: radius, borderTopRightRadius: radius, overflow: 'hidden' },
  body: { padding: 20, gap: 12, paddingBottom: 28 },
  icon: { width: 48, height: 48, borderRadius: radius, backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: font.labelBold, fontSize: 28, color: color.ink, letterSpacing: 0.6 },
  text: { color: color.muted, fontSize: 16, lineHeight: 22 },
  skip: { color: color.muted, fontWeight: '600' },
});
const g = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24, backgroundColor: color.bg },
  text: { textAlign: 'center', color: color.ink, fontSize: 17, lineHeight: 23 },
});

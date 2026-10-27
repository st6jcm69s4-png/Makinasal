import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { PlainText, Text } from './LText';
import { Icon, type IconName } from './Icon';
import { Btn } from './ui';
import { Hatch } from './ui';
import { openWeb } from '../lib/web';
import { color, font, radius } from '../lib/theme';

type Ctx = { askLogin: (reason?: string) => void; notify: (title: string, err: string) => void };
const LoginCtx = createContext<Ctx>({ askLogin: () => {}, notify: () => {} });
/** Misafir giriş gerektiren bir işleme dokununca alt panel açar: giriş yap, kayıt ol ya da gezmeye devam et. */
export const useLoginPrompt = () => useContext(LoginCtx);

export function LoginPromptProvider({ children }: { children: ReactNode }) {
  const [reason, setReason] = useState<string | null>(null);
  const askLogin = useCallback((r?: string) => setReason(r ?? 'Bu işlem için giriş yapman gerekir.'), []);
  const close = () => setReason(null);
  // Hata metni giriş gerektiriyorsa panel, değilse normal uyarı gösterilir.
  const notify = useCallback((title: string, err: string) => { if (/giriş/i.test(err)) askLogin(err); else Alert.alert(title, err); }, [askLogin]);
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

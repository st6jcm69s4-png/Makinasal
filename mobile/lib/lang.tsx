import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Modal, Pressable, Text as RNText, View } from 'react-native';
import { applyLang, detectLang, LANGS, type Lang } from './i18n';
import { color } from './theme';
import { useApp } from './AppContext';

const KEY = 'mk-language';
const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; chosen: boolean | null }>({ lang: 'tr', setLang: () => {}, chosen: true });
export const useLang = () => useContext(Ctx);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, set] = useState<Lang>('tr');
  const [chosen, setChosen] = useState<boolean | null>(null);
  useEffect(() => {
    void AsyncStorage.getItem(KEY).then((v) => {
      const saved = v === 'en' || v === 'de' || v === 'tr';
      const l: Lang = saved ? (v as Lang) : detectLang();
      if (l !== 'tr') { applyLang(l); set(l); }
      setChosen(saved);
    }).catch(() => setChosen(true));
  }, []);
  const setLang = useCallback((l: Lang) => {
    applyLang(l); set(l); setChosen(true);
    void AsyncStorage.setItem(KEY, l).catch(() => {});
  }, []);
  const value = useMemo(() => ({ lang, setLang, chosen }), [lang, setLang, chosen]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Hesap doğrulanıp ilk kez giriş yapılınca, dil henüz seçilmemişse dil ekranını gösterir. Türkçe en üstte ve ayrı renktedir. */
export function LanguageGate() {
  const { session } = useApp();
  const { lang, setLang, chosen } = useLang();
  if (!session || chosen !== false) return null;
  return (
    <Modal visible animationType="fade" statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: color.navy, justifyContent: 'center', padding: 24, gap: 12 }}>
        <RNText style={{ color: '#fff', fontSize: 28, fontWeight: '700', textAlign: 'center' }}>MAKİNASAL</RNText>
        <RNText style={{ color: color.onNavy, textAlign: 'center', marginBottom: 12 }}>Dilini seç · Choose your language · Sprache wählen</RNText>
        {LANGS.map((x) => {
          const tr = x.code === 'tr';
          return (
            <Pressable key={x.code} onPress={() => setLang(x.code)} accessibilityRole="button" style={{ backgroundColor: tr ? color.accent : 'transparent', borderWidth: 1, borderColor: tr ? color.accent : color.onNavy, borderRadius: 4, padding: 16, alignItems: 'center', opacity: x.code === lang || tr ? 1 : 0.95 }}>
              <RNText style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>{x.label}</RNText>
            </Pressable>
          );
        })}
        <RNText style={{ color: color.onNavy, textAlign: 'center', fontSize: 12, marginTop: 12 }}>Ayarlar'dan değiştirebilirsin · Change anytime in Settings · Jederzeit in den Einstellungen änderbar</RNText>
      </View>
    </Modal>
  );
}

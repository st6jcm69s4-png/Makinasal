import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { applyLang, type Lang } from './i18n';

const KEY = 'mk-language';
const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: 'tr', setLang: () => {} });
export const useLang = () => useContext(Ctx);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, set] = useState<Lang>('tr');
  useEffect(() => {
    void AsyncStorage.getItem(KEY).then((v) => { if (v === 'en') { applyLang('en'); set('en'); } }).catch(() => {});
  }, []);
  const setLang = useCallback((l: Lang) => {
    applyLang(l); set(l);
    void AsyncStorage.setItem(KEY, l).catch(() => {});
  }, []);
  const value = useMemo(() => ({ lang, setLang }), [lang, setLang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

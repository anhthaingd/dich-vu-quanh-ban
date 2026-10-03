import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type PropsWithChildren } from 'react';
import { Platform } from 'react-native';
import { createTranslator } from '../../lib/i18n';
import { LocaleState } from '../../lib/i18n/locale-state';
import { localeStorage } from '../../lib/i18n/locale-storage';
const Context = createContext<LocaleState | null>(null);
export function LocaleProvider({ manager, children }: PropsWithChildren<{ manager?: LocaleState }>) {
  const [value] = useState(() => manager ?? new LocaleState(localeStorage));
  useEffect(() => { void value.restore(); }, [value]);
  return <Context.Provider value={value}><DocumentLanguage />{children}</Context.Provider>;
}
export function useLocale() {
  const manager = useContext(Context);
  if (!manager) throw new Error('LocaleProvider is required');
  const state = useSyncExternalStore(manager.subscribe, manager.getSnapshot, manager.getSnapshot);
  const t = useMemo(() => createTranslator(state.locale), [state.locale]);
  return { ...state, t, selectLocale: manager.select };
}
function DocumentLanguage() {
  const { locale } = useLocale();
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') document.documentElement.lang = locale;
  }, [locale]);
  return null;
}

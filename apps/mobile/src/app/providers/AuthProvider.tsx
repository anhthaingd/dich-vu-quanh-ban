import { createContext, useContext, useEffect, useSyncExternalStore, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';
import { AuthSession } from '../../features/auth/state/auth-session';
const Context = createContext<AuthSession | null>(null);
export function AuthProvider({ manager, children }: PropsWithChildren<{ manager: AuthSession }>) {
  useEffect(() => {
    void manager.restore();
    const listener = AppState.addEventListener('change', state => { if (state === 'active') void manager.verify(); });
    return () => listener.remove();
  }, [manager]);
  return <Context.Provider value={manager}>{children}</Context.Provider>;
}
export function useAuth() {
  const manager = useContext(Context);
  if (!manager) throw new Error('Account screens require AuthProvider');
  return { manager, state: useSyncExternalStore(manager.subscribe, manager.getSnapshot, manager.getSnapshot) };
}

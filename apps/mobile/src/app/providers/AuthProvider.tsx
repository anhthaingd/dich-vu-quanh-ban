import {sessionReady,sessionOperation} from '../../features/jobs/state/session-ready';
import { createContext, useContext, useEffect, useSyncExternalStore, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';
import { useLocaleManager } from './LocaleProvider';
import * as Crypto from 'expo-crypto';
import {ApiError} from '../../lib/http/api-error';
import type {Locale} from '../../lib/i18n';
import { AuthSession } from '../../features/auth/state/auth-session';
const Context = createContext<AuthSession | null>(null);
export function AuthProvider({ manager, children }: PropsWithChildren<{ manager: AuthSession }>) {
  const locale = useLocaleManager();
  useEffect(() => {
    let pending:{owner:string;language:Locale;version:number;key:string}|null=null;
    const update = () => { const user = manager.getSnapshot().user; locale?.bindAccount(user?.id ?? null, user?.locale, async language => {
      if(!user)throw new Error('STALE_OWNER');
      await sessionReady(manager,user.id);
      const current = manager.getSnapshot().user; if (!current || current.id !== user?.id) throw new Error('STALE_OWNER');
      const task=pending?.owner===current.id&&pending.language===language?pending:{owner:current.id,language,version:current.version,key:Crypto.randomUUID()};pending=task;
      try { await sessionOperation(manager,current.id,()=>manager.editProfile(current.id, {expected_version:task.version,locale:task.language}, task.key));pending=null;const visible=manager.getSnapshot().user;if(!visible||visible.id!==task.owner)throw new Error('STALE_OWNER');return visible.locale; }
      catch(error) { if(error instanceof ApiError&&!['NETWORK','TIMEOUT','INVALID_RESPONSE'].includes(error.code)){pending=null;if(error.code==='VERSION_CONFLICT')await manager.loadProfile(current.id);}throw error; }
    }); };
    update(); const unsubscribe = manager.subscribe(update); return unsubscribe;
  }, [manager, locale]);
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

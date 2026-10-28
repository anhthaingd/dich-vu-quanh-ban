import { randomUUID } from 'expo-crypto';
import { ApiError, type ApiErrorCode } from '../../../lib/http/api-error';
import type { AuthSession } from '../../auth/state/auth-session';
import type { ProfileEdit } from '../api/accounts-api';
type State = { name: string; currentName: string; version: number; loading: boolean; saving: boolean; loaded: boolean; error: ApiErrorCode | null; saved: boolean; pending: boolean; conflict: boolean };
export class ProfileEditor {
  private state: State = { name: '', currentName: '', version: 0, loading: false, saving: false, loaded: false, error: null, saved: false, pending: false, conflict: false };
  private attempt: { input: ProfileEdit; key: string } | null = null;
  private readonly listeners = new Set<() => void>();
  constructor(private readonly auth: AuthSession, private readonly owner: string) {}
  getSnapshot = () => this.state;
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  private update(next: Partial<State>) { this.state = { ...this.state, ...next }; this.listeners.forEach(fn => fn()); }
  setName = (name: string) => { if (!this.state.saving && !this.state.loading && !this.attempt) this.update({ name, error: null, saved: false }); };
  load = async () => {
    if (this.state.loading || this.state.saving || this.attempt) return;
    this.update({ loading: true, error: null, saved: false });
    try {
      const me = await this.auth.loadProfile(this.owner);
      this.update({ name: this.state.loaded ? this.state.name : me.display_name, currentName: me.display_name, version: me.version, loaded: true, conflict: false });
    } catch (error) { this.update({ error: error instanceof ApiError ? error.code : 'NETWORK' }); }
    finally { this.update({ loading: false }); }
  };
  save = async () => {
    if (!this.state.loaded || this.state.saving || this.state.loading || this.state.conflict) return;
    const name = this.state.name.trim();
    if (!name || name.length > 100 || Array.from(name).some(c => c.charCodeAt(0) < 32)) { this.update({ error: 'VALIDATION' }); return; }
    // Locale changes share the account version. Rebase only when the observed
    // server name still matches our baseline; another name must remain a conflict.
    // An uncertain retry keeps its original payload and key in this.attempt.
    const current = this.auth.getSnapshot().user;
    const version = current?.id === this.owner && current.display_name === this.state.currentName
      ? Math.max(current.version, this.state.version) : this.state.version;
    this.attempt ??= { input: { expected_version: version, display_name: name }, key: randomUUID() };
    this.update({ saving: true, saved: false, error: null, pending: true });
    try {
      const me = await this.auth.editProfile(this.owner, this.attempt.input, this.attempt.key);
      this.attempt = null;
      this.update({ name: me.display_name, currentName: me.display_name, version: me.version, saved: true, pending: false });
    } catch (error) {
      const code = error instanceof ApiError ? error.code : 'NETWORK';
      // Only definitive rejection permits a new operation. Unknown/network
      // outcomes retain the payload and key, including after a failed retry.
      if (['VERSION_CONFLICT','IDEMPOTENCY_MISMATCH','VALIDATION','UNAUTHENTICATED','FORBIDDEN','BUSY'].includes(code)) this.attempt = null;
      this.update({ error: code, pending: !!this.attempt, conflict: code === 'VERSION_CONFLICT' || code === 'IDEMPOTENCY_MISMATCH' });
    } finally { this.update({ saving: false }); }
  };
}

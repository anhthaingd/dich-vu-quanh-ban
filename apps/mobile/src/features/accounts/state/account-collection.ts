import { randomUUID } from 'expo-crypto';
import { ApiError, type ApiErrorCode } from '../../../lib/http/api-error';
import type { Page } from '../models';
type State<T> = { items: T[]; next: string | null; loaded: boolean; busy: boolean; pending: boolean; error: ApiErrorCode | null; saved: boolean };
// Shared list/retry mechanics; domain inputs stay in their own screen/API.
export class AccountCollection<T extends { id: string }> {
  private state: State<T> = { items: [], next: null, loaded: false, busy: false, pending: false, error: null, saved: false };
  private attempt: { key: string; work: (key: string) => Promise<unknown> } | null = null;
  private readonly listeners = new Set<() => void>();
  constructor(private readonly fetchPage: (cursor?: string) => Promise<Page<T>>) {}
  getSnapshot = () => this.state;
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  private update(next: Partial<State<T>>) { this.state = { ...this.state, ...next }; this.listeners.forEach(fn => fn()); }
  private async read(more: boolean) {
    const page = await this.fetchPage(more ? this.state.next ?? undefined : undefined);
    const items = more ? [...this.state.items] : [];
    for (const item of page.items) { const i = items.findIndex(x => x.id === item.id); if (i < 0) items.push(item); else items[i] = item; }
    this.update({ items, next: page.next_cursor, loaded: true });
  }
  load = async (more = false, findId?: string) => {
    if (this.state.busy || this.attempt || (more && !this.state.next)) return;
    this.update({ busy: true, error: null });
    try {
      await this.read(more);
      while (findId && !this.state.items.some(x => x.id === findId) && this.state.next) await this.read(true);
    }
    catch (e) { this.update({ error: e instanceof ApiError ? e.code : 'NETWORK' }); }
    finally { this.update({ busy: false }); }
  };
  perform = async (work?: (key: string) => Promise<unknown>): Promise<boolean> => {
    if (this.state.busy) return false;
    if (!this.attempt && work) this.attempt = { key: randomUUID(), work };
    if (!this.attempt) return false;
    this.update({ busy: true, error: null, saved: false, pending: true });
    let committed = false;
    try {
      await this.attempt.work(this.attempt.key);
      this.attempt = null; committed = true;
      this.update({ saved: true, pending: false });
      // A failed reload is a read error, never a reason to resend a mutation.
      await this.read(false);
    } catch (e) {
      const code = e instanceof ApiError ? e.code : 'NETWORK';
      if (['VERSION_CONFLICT','IDEMPOTENCY_MISMATCH','VALIDATION','UNAUTHENTICATED','FORBIDDEN','NOT_FOUND','BUSY'].includes(code)) this.attempt = null;
      this.update({ error: code, pending: !!this.attempt });
    } finally { this.update({ busy: false }); }
    return committed;
  };
}

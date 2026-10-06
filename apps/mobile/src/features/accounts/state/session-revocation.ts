import { randomUUID } from 'expo-crypto';
import { ApiError, type ApiErrorCode } from '../../../lib/http/api-error';
import type { LoginSession, Page } from '../models';

type State = {
  phase: 'idle' | 'preparing' | 'confirm' | 'running' | 'failed' | 'done';
  total: number; completed: number; error: ApiErrorCode | null;
};
// A client batch over the existing per-family API, not an atomic bulk endpoint.
// Freeze the target set before confirmation; retry only the unconfirmed item.
export class SessionRevocation {
  private state: State = { phase: 'idle', total: 0, completed: 0, error: null };
  private targets: { id: string; key: string }[] = [];
  private readonly listeners = new Set<() => void>();
  constructor(
    private readonly list: (cursor?: string) => Promise<Page<LoginSession>>,
    private readonly revoke: (id: string, key: string) => Promise<unknown>,
  ) {}
  getSnapshot = () => this.state;
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  private update(next: Partial<State>) { this.state = { ...this.state, ...next }; this.listeners.forEach(fn => fn()); }
  prepare = async () => {
    if (!['idle', 'done'].includes(this.state.phase)) return;
    this.targets = [];
    this.update({ phase: 'preparing', total: 0, completed: 0, error: null });
    try {
      const sessions = new Map<string, LoginSession>();
      const cursors = new Set<string>();
      let cursor: string | undefined;
      do {
        const page = await this.list(cursor);
        for (const item of page.items) sessions.set(item.id, item);
        cursor = page.next_cursor ?? undefined;
        if (cursor && cursors.has(cursor)) throw new ApiError('INVALID_RESPONSE');
        if (cursor) cursors.add(cursor);
      } while (cursor);
      // Refuse an incomplete/invalid snapshot rather than risk the current login.
      if ([...sessions.values()].filter(x => x.is_current && x.state === 'active').length !== 1) throw new ApiError('INVALID_RESPONSE');
      this.targets = [...sessions.values()].filter(x => !x.is_current && x.state === 'active').map(x => ({ id: x.id, key: randomUUID() }));
      this.update({ phase: this.targets.length ? 'confirm' : 'done', total: this.targets.length });
    } catch (error) { this.update({ phase: 'idle', error: error instanceof ApiError ? error.code : 'NETWORK' }); }
  };
  cancel = () => {
    if (this.state.phase !== 'confirm') return;
    this.targets = []; this.update({ phase: 'idle', total: 0, error: null });
  };
  run = async () => {
    if (!['confirm', 'failed'].includes(this.state.phase)) return;
    this.update({ phase: 'running', error: null });
    try {
      while (this.state.completed < this.targets.length) {
        const target = this.targets[this.state.completed]!;
        await this.revoke(target.id, target.key);
        this.update({ completed: this.state.completed + 1 });
      }
      this.update({ phase: 'done' });
    } catch (error) { this.update({ phase: 'failed', error: error instanceof ApiError ? error.code : 'NETWORK' }); }
  };
}

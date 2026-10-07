import type { PartnersApi } from '../../partners/api/partners-api';
import type { PartnerCard, SearchInput } from '../../partners/models';
import { ApiError, type ApiErrorCode } from '../../../lib/http/api-error';
type State = {
  criteria: SearchInput | null;
  items: PartnerCard[];
  next: string | null;
  busy: boolean;
  error: ApiErrorCode | null;
  searched: boolean;
};
export class PartnerSearch {
  private state: State = {
    criteria: null,
    items: [],
    next: null,
    busy: false,
    error: null,
    searched: false
  };
  private listeners = new Set<() => void>();
  private request: AbortController | null = null;
  private query: SearchInput | null = null;
  private cursors = new Set<string>();
  constructor(private api: PartnersApi) {}
  getSnapshot = () => this.state;
  subscribe = (f: () => void) => {
    this.listeners.add(f);
    return () => {
      this.listeners.delete(f);
    };
  };
  private update(s: Partial<State>) {
    this.state = { ...this.state, ...s };
    this.listeners.forEach((f) => f());
  }
  cancel = () => {
    this.request?.abort();
    this.request = null;
    this.update({ busy: false });
  };
  reset = () => { this.cancel(); this.query = null; this.cursors.clear(); this.update({ criteria: null, items: [], next: null, error: null, searched: false }); };
  search = (query: SearchInput) => {
    this.query = { ...query };
    this.update({ criteria: { ...query } });
    this.cursors.clear();
    return this.load(false);
  };
  more = () =>
    this.state.next && !this.state.busy ? this.load(true) : Promise.resolve();
  retry = () => this.load(false);
  private async load(more: boolean) {
    if (!this.query) return;
    this.cancel();
    const controller = new AbortController();
    this.request = controller;
    this.update({
      busy: true,
      error: null,
      ...(!more ? { items: [], next: null, searched: false } : {})
    });
    try {
      const page = await this.api.search(
        this.query,
        more ? (this.state.next ?? undefined) : undefined,
        controller.signal
      );
      if (this.request !== controller) return;
      if (more && page.next_cursor && this.cursors.has(page.next_cursor))
        throw new ApiError('INVALID_RESPONSE');
      if (!more) this.cursors.clear();
      if (page.next_cursor) this.cursors.add(page.next_cursor);
      const items = new Map(
        (more ? this.state.items : []).map((p) => [p.id, p])
      );
      page.items.forEach((p) => items.set(p.id, p));
      this.update({
        items: [...items.values()],
        next: page.next_cursor,
        searched: true
      });
    } catch (e) {
      if (this.request === controller)
        this.update({ error: e instanceof ApiError ? e.code : 'NETWORK' });
    } finally {
      if (this.request === controller) this.update({ busy: false });
    }
  }
}

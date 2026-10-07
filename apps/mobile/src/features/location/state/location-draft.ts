import { ApiError, type ApiErrorCode } from '../../../lib/http/api-error';
import type { Locale } from '../../../lib/i18n';
import type { LocationsApi } from '../api/locations-api';
import { validPoint, type LocationValue, type Point, type Suggestion } from '../models';
type Snapshot = { query: string; value: LocationValue | null; items: Suggestion[]; busy: boolean; searched: boolean; approximate: boolean; error: ApiErrorCode | null };
// Every user intent has a generation. Even transports ignoring abort cannot replace a newer choice.
export class LocationDraft {
  private snapshot: Snapshot;
  private listeners = new Set<() => void>();
  private controller?: AbortController;
  private generation = 0;
  private retryAt = 0;
  constructor(private readonly api: LocationsApi, initial: LocationValue | null = null) {
    this.snapshot = { query: '', value: initial, items: [], busy: false, searched: false, approximate: false, error: null };
  }
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private update(patch: Partial<Snapshot>) { this.snapshot = { ...this.snapshot, ...patch }; this.listeners.forEach(f => f()); }
  cancel = () => { this.generation++; this.controller?.abort(); this.update({ busy: false }); };
  query = (query: string) => { this.cancel(); this.update({ query, value: null, items: [], searched: false, approximate: false, error: null }); };
  describe = (text: string) => { if (this.snapshot.value) { this.cancel(); this.update({ value: { ...this.snapshot.value, text } }); } };
  choose = (item: Suggestion | LocationValue) => {
    this.cancel(); this.update({ value: { text: item.text, point: item.point, source: 'source' in item ? item.source : 'search' }, items: [], searched: false, approximate: 'precision' in item && item.precision === 'approximate', error: null });
  };
  search = async (action: 'autocomplete' | 'geocode', locale: Locale) => {
    this.cancel(); const query = this.snapshot.query.trim();
    if (query.length < 3) return;
    if (Date.now() < this.retryAt) { this.update({ error: 'RATE_LIMITED' }); return; }
    const version = this.generation, controller = this.controller = new AbortController();
    this.update({ busy: true, error: null });
    try { const items = await this.api.search(action, query, locale, controller.signal); if (version === this.generation) this.update({ items, searched: true }); }
    catch (e) { this.fail(e, version); }
    finally { if (version === this.generation) this.update({ busy: false }); }
  };
  pin = async (point: Point, locale: Locale, source: 'map' | 'gps' | 'manual' = 'map') => {
    if (!validPoint(point)) return;
    this.cancel(); const version = this.generation, controller = this.controller = new AbortController();
    this.update({ value: { text: '', point, source }, items: [], searched: false, approximate: true, error: null, busy: source !== 'manual' });
    if (source === 'manual') return;
    if (Date.now() < this.retryAt) { this.update({ error: 'RATE_LIMITED', busy: false }); return; }
    try { const result = await this.api.reverse(point, locale, controller.signal); if (version === this.generation && result) this.update({ value: { text: result.text, point, source } }); }
    catch (e) { this.fail(e, version); }
    finally { if (version === this.generation) this.update({ busy: false }); }
  };
  private fail(e: unknown, version: number) { if (version === this.generation) { if (e instanceof ApiError && e.code === 'RATE_LIMITED') this.retryAt = Date.now() + (e.retryAfter ?? 60) * 1000; this.update({ error: e instanceof ApiError ? e.code : 'NETWORK' }); } }
}

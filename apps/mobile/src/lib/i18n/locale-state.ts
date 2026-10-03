import { isLocale, type Locale } from './index';
import type { LocaleStorage } from './locale-storage';
type Snapshot = { locale: Locale; ready: boolean; busy: boolean; error: 'READ_FAILED' | 'WRITE_FAILED' | null };
export class LocaleState {
  private snapshot: Snapshot = { locale: 'vi', ready: false, busy: false, error: null };
  private readonly listeners = new Set<() => void>();
  private restoration?: Promise<void>;
  constructor(private readonly storage: LocaleStorage) {}
  getSnapshot = () => this.snapshot;
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  private update(values: Partial<Snapshot>) { this.snapshot = { ...this.snapshot, ...values }; this.listeners.forEach(fn => fn()); }
  restore = () => this.restoration ??= this.read();
  private async read() {
    try {
      const saved = await this.storage.read();
      this.update({ locale: isLocale(saved) ? saved : 'vi' });
    } catch { this.update({ error: 'READ_FAILED' }); }
    finally { this.update({ ready: true }); }
  }
  select = async (locale: Locale) => {
    // Ignore overlapping taps; wait for hydration before permitting any writes.
    if (!this.snapshot.ready || this.snapshot.busy) return;
    this.update({ busy: true, error: null });
    try {
      await this.storage.write(locale);
      this.update({ locale });
    } catch { this.update({ error: 'WRITE_FAILED' }); }
    finally { this.update({ busy: false }); }
  };
}

import { isLocale, type Locale } from './index';
import type { LocaleStorage } from './locale-storage';
type Snapshot = { locale: Locale; ready: boolean; busy: boolean; error: 'READ_FAILED' | 'WRITE_FAILED' | null };
export class LocaleState {
  private snapshot: Snapshot = { locale: 'vi', ready: false, busy: false, error: null };
  private readonly listeners = new Set<() => void>();
  private guest: Locale = 'vi';
  private owner: string | null = null;
  private generation = 0;
  private saveAccount?: (locale: Locale) => Promise<Locale>;
  bindAccount(owner: string | null, locale?: Locale, save?: (locale: Locale) => Promise<Locale>) {
    if (this.owner !== owner) { this.generation++; this.update({ busy: false, error: null }); }
    this.owner = owner; this.saveAccount = save;
    this.update({ locale: owner && locale ? locale : this.guest });
  }
  private restoration?: Promise<void>;
  constructor(private readonly storage: LocaleStorage) {}
  getSnapshot = () => this.snapshot;
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  private update(values: Partial<Snapshot>) { this.snapshot = { ...this.snapshot, ...values }; this.listeners.forEach(fn => fn()); }
  restore = () => this.restoration ??= this.read();
  private async read() {
    try {
      const saved = await this.storage.read();
      this.guest = isLocale(saved) ? saved : 'vi';
      if (!this.owner) this.update({ locale: this.guest });
    } catch { this.update({ error: 'READ_FAILED' }); }
    finally { this.update({ ready: true }); }
  }
  select = async (locale: Locale) => {
    // Ignore overlapping taps; wait for hydration before permitting any writes.
    if (!this.snapshot.ready || this.snapshot.busy) return;
    const generation = this.generation, owner = this.owner, save = this.saveAccount;
    this.update({ busy: true, error: null });
    try {
      if (owner) {
        if (!save) throw new Error('ACCOUNT_LOCALE_UNAVAILABLE');
        const saved = await save(locale);
        if (generation === this.generation) this.update({ locale: saved });
      } else {
        await this.storage.write(locale); this.guest = locale;
        if (generation === this.generation) this.update({ locale });
      }
    } catch { if (generation === this.generation) this.update({ error: 'WRITE_FAILED' }); }
    finally { if (generation === this.generation) this.update({ busy: false }); }
  };
}

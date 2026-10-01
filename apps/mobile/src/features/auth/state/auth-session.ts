import { ApiError } from '../../../lib/http/api-error';
import type { AuthApi, Credentials, Me, Registration, Session, TokenStorage } from '../models/auth.types';
type Snapshot = { phase: 'loading' | 'anonymous' | 'authenticated' | 'restore-error'; user: Me | null; busy: boolean; error: string | null };
export class AuthSession {
  private session: Session | null = null;
  private snapshot: Snapshot = { phase: 'loading', user: null, busy: false, error: null };
  private readonly listeners = new Set<() => void>();
  constructor(private readonly api: AuthApi, private readonly storage: TokenStorage) {}
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private update(values: Partial<Snapshot>) { this.snapshot = { ...this.snapshot, ...values }; this.listeners.forEach(fn => fn()); }
  // One account operation at a time prevents double submit and a late refresh
  // resurrecting a session after logout. Tokens never enter React state.
  private async run(work: () => Promise<void>) {
    if (this.snapshot.busy) return;
    this.update({ busy: true, error: null });
    try { await work(); }
    catch (error) {
      const code = error instanceof ApiError ? error.code : undefined;
      this.update({ error: code === 'UNAUTHENTICATED' ? 'Không thể xác thực. Kiểm tra thông tin hoặc đăng nhập lại.'
        : code === 'RATE_LIMITED' ? 'Thao tác quá nhiều lần. Vui lòng chờ một phút rồi thử lại.'
        : code === 'VALIDATION' ? 'Không thể thực hiện với thông tin này. Kiểm tra lại hoặc đăng nhập.'
        : 'Không thể kết nối hoặc lưu phiên an toàn. Vui lòng thử lại.' });
    } finally { this.update({ busy: false }); }
  }
  private async accept(session: Session) {
    try { await this.storage.write(session.refresh_token); }
    catch (error) {
      // If secure persistence fails, don't display a successful login.
      try { await this.api.logout(session.access_token); } catch { /* server expiry remains the fallback */ }
      throw error;
    }
    this.session = session;
    this.update({ phase: 'authenticated', user: session.user });
  }
  private async forget() {
    this.session = null;
    this.update({ phase: 'anonymous', user: null });
    await this.storage.clear();
  }
  restore = () => this.run(async () => {
    this.update({ phase: 'loading' });
    try {
      const token = await this.storage.read();
      if (!token) { this.update({ phase: 'anonymous', user: null }); return; }
      await this.accept(await this.api.refresh(token));
    } catch (error) {
      if (error instanceof ApiError && error.code === 'UNAUTHENTICATED') { await this.forget(); return; }
      this.update({ phase: 'restore-error', user: null }); throw error;
    }
  });
  login = (input: Credentials) => this.run(async () => { await this.accept(await this.api.login(input)); });
  register = (input: Registration) => this.run(async () => { await this.accept(await this.api.register(input)); });
  private async rotate() {
    if (!this.session) return;
    try { await this.accept(await this.api.refresh(this.session.refresh_token)); }
    catch (error) { if (error instanceof ApiError && error.code === 'UNAUTHENTICATED') await this.forget(); throw error; }
  }
  verify = () => {
    // iOS keyboard/autofill can foreground the app during a form interaction.
    // An anonymous foreground check must not acquire the submit lock.
    const session = this.session;
    if (!session) return Promise.resolve();
    return this.run(async () => {
      if (Date.parse(session.expires_at) <= Date.now()) await this.rotate();
      try { this.update({ user: await this.api.me(this.session!.access_token) }); }
      catch (error) {
        if (!(error instanceof ApiError) || error.code !== 'UNAUTHENTICATED') throw error;
        await this.rotate();
        try { this.update({ user: await this.api.me(this.session!.access_token) }); }
        catch (retryError) { if (retryError instanceof ApiError && retryError.code === 'UNAUTHENTICATED') await this.forget(); throw retryError; }
      }
    });
  };
  logout = () => this.run(async () => {
    if (!this.session) return;
    try {
      if (Date.parse(this.session.expires_at) <= Date.now()) await this.rotate();
      await this.api.logout(this.session!.access_token);
    } catch (error) {
      // Already revoked/expired means no authenticated server session remains.
      // A network failure keeps the session and offers retry; don't claim
      // server-side logout while offline.
      if (!(error instanceof ApiError) || error.code !== 'UNAUTHENTICATED') throw error;
    }
    await this.forget();
  });
}

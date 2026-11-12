export interface Me {
  verification_policy?: 'phone' | 'email_lab';
  id: string; version: number; display_name: string; phone_verified: boolean; email_verified: boolean;
  locale: 'vi' | 'en' | 'ja'; partner_ids: string[]; admin_permissions: string[]; status: string;
}
export interface Session { access_token: string; refresh_token: string; expires_at: string; user: Me }
export interface Credentials { email: string; password: string }
export interface Registration extends Credentials { display_name: string }
export interface AuthApi {
  login(input: Credentials): Promise<Session>;
  register(input: Registration): Promise<Session>;
  refresh(token: string): Promise<Session>;
  me(token: string): Promise<Me>;
  logout(token: string): Promise<void>;
}
export interface TokenStorage {
  read(): Promise<string | null>; write(token: string): Promise<void>; clear(): Promise<void>;
  // Web: several tabs share one stored refresh token. Refresh tokens are single use and a replay revokes the
  // whole login, so a rotation reads the newest stored token inside a cross-tab lock (B00-33).
  readonly shared?: boolean;
  exclusive?<T>(work: () => Promise<T>): Promise<T>;
}

export function hasServiceVerification(user:Me|null|undefined):boolean {
  return (user?.verification_policy==='email_lab'?user.email_verified:user?.phone_verified)===true;
}

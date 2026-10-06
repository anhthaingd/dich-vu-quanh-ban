export interface Me {
  id: string; version: number; display_name: string; phone_verified: boolean; email_verified: boolean;
  locale: 'vi'; partner_ids: string[]; admin_permissions: string[]; status: string;
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
export interface TokenStorage { read(): Promise<string | null>; write(token: string): Promise<void>; clear(): Promise<void> }

import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import type { Pool, PoolClient } from 'pg';
import { hashPassword, verifyPassword } from './password.js';
import { uuid } from '../../logging/sanitize.js';

const digest = (token: string) => createHash('sha256').update(token).digest('hex');
const issuer = 'dvqb-api', audience = 'dvqb-mobile';
type User = { id: string; display_name: string; status: string; locale: 'vi'; version: number };
export class AuthService {
  private readonly key: Uint8Array;
  private readonly changes = new Set<()=>Promise<void>>();
  onAccessChange(fn:()=>Promise<void>){this.changes.add(fn);return ()=>{this.changes.delete(fn);};}
  async accessChanged(){await Promise.all([...this.changes].map(fn=>fn()));}
  constructor(private readonly pool: Pool, secret: string) { this.key = new TextEncoder().encode(secret); }

  private async me(user: User, db: Pool | PoolClient) {
    const { rows: [flags] } = await db.query(`SELECT
      EXISTS(SELECT 1 FROM identities WHERE user_id=$1 AND provider='phone' AND verified_at IS NOT NULL) AS phone_verified,
      EXISTS(SELECT 1 FROM identities WHERE user_id=$1 AND provider='email' AND verified_at IS NOT NULL) AS email_verified,
      ARRAY(SELECT m.partner_id FROM memberships m JOIN partners p ON p.id=m.partner_id
        WHERE m.user_id=$1 AND m.active AND p.archived_at IS NULL ORDER BY m.partner_id) AS partner_ids`, [user.id]);
    const grants=await db.query('SELECT permission FROM admin_grants WHERE user_id=$1 AND revoked_at IS NULL ORDER BY permission',[user.id]);
    return { ...user, ...flags, admin_permissions: grants.rows.map(r=>r.permission as string) };
  }
  private async issue(db: PoolClient, user: User, family = randomUUID(), expiry = new Date(Date.now() + 30 * 86400000)) {
    const refresh = randomBytes(32).toString('hex');
    const { rows: [session] } = await db.query('INSERT INTO sessions(user_id,refresh_hash,family_id,expires_at,last_seen_at) VALUES($1,$2,$3,$4,now()) RETURNING id', [user.id,digest(refresh),family,expiry]);
    const expires = Math.min(Math.floor(Date.now() / 1000) + 900, Math.floor(expiry.getTime() / 1000));
    const access = await new SignJWT({ sid: session.id }).setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(user.id).setIssuer(issuer).setAudience(audience).setIssuedAt().setExpirationTime(expires).sign(this.key);
    return { access_token: access, refresh_token: refresh, expires_at: new Date(expires * 1000).toISOString(), user: await this.me(user, db) };
  }
  private async transaction<T>(work: (db: PoolClient) => Promise<T>) {
    const db = await this.pool.connect();
    try { await db.query('BEGIN'); const result = await work(db); await db.query('COMMIT'); return result; }
    catch (error) { await db.query('ROLLBACK'); throw error; }
    finally { db.release(); }
  }
  async register(email: string, password: string, name: string) {
    const hash = await hashPassword(password);
    try {
      return await this.transaction(async db => {
        const { rows: [user] } = await db.query<User>('INSERT INTO users(display_name) VALUES($1) RETURNING id,display_name,status,locale,version', [name]);
        await db.query("INSERT INTO identities(user_id,provider,subject,password_hash) VALUES($1,'email',$2,$3)", [user.id,email,hash]);
        return this.issue(db, user);
      });
    } catch (error) {
      if ((error as { code?: string }).code === '23505') throw new BadRequestException();
      throw error;
    }
  }
  async login(email: string, password: string) {
    const { rows: [identity] } = await this.pool.query('SELECT user_id,password_hash FROM identities WHERE provider=$1 AND subject=$2', ['email',email]);
    const valid = await verifyPassword(password, identity?.password_hash ?? null);
    if (!identity || !valid) throw new UnauthorizedException();
    return this.transaction(async db => {
      const { rows: [user] } = await db.query<User>('SELECT id,display_name,status,locale,version FROM users WHERE id=$1 FOR UPDATE', [identity.user_id]);
      if (!user || user.status !== 'active') throw new UnauthorizedException();
      return this.issue(db, user);
    });
  }
  async refresh(token: string) {
    const result = await this.transaction(async db => {
      const hash = digest(token);
      const { rows: [owner] } = await db.query('SELECT user_id FROM sessions WHERE refresh_hash=$1', [hash]);
      if (!owner) return null;
      // All rotations for this user serialize, then reread the session. A
      // replay of the old token revokes its entire family, including a racing
      // rotation. Commit that revocation before returning 401.
      const { rows: [user] } = await db.query<User>('SELECT id,display_name,status,locale,version FROM users WHERE id=$1 FOR UPDATE', [owner.user_id]);
      const { rows: [session] } = await db.query('SELECT * FROM sessions WHERE refresh_hash=$1', [hash]);
      if (session.revoked_at || session.expires_at <= new Date() || user.status !== 'active') {
        await db.query('UPDATE sessions SET revoked_at=COALESCE(revoked_at,now()) WHERE family_id=$1', [session.family_id]);
        return null;
      }
      await db.query('UPDATE sessions SET revoked_at=now() WHERE id=$1', [session.id]);
      return this.issue(db, user, session.family_id, session.expires_at);
    });
    await this.accessChanged();
    if (!result) throw new UnauthorizedException();
    return result;
  }
  async authenticate(header: string | undefined, db: Pool | PoolClient = this.pool) {
    if (!header?.startsWith('Bearer ') || header.length > 4096) throw new UnauthorizedException();
    let claims;
    try {
      claims = (await jwtVerify(header.slice(7), this.key, { algorithms: ['HS256'], issuer, audience, requiredClaims: ['sub','sid','exp','iat'] })).payload;
    } catch { throw new UnauthorizedException(); }
    if (typeof claims.sid !== 'string' || !uuid.test(claims.sid) || !claims.sub || !uuid.test(claims.sub)) throw new UnauthorizedException();
    const { rows: [user] } = await db.query<User>(`UPDATE sessions s SET last_seen_at=clock_timestamp() FROM users u
      WHERE s.user_id=u.id AND s.id=$1 AND u.id=$2 AND s.revoked_at IS NULL AND s.expires_at>clock_timestamp() AND u.status='active' RETURNING u.id,u.display_name,u.status,u.locale,u.version`, [claims.sid,claims.sub]);
    if (!user) throw new UnauthorizedException();
    return { user: await this.me(user, db), sessionId: claims.sid, expiresAt: Number(claims.exp)*1000 };
  }
  async logout(header: string | undefined) {
    const { sessionId, user } = await this.authenticate(header);
    await this.transaction(async db => {
      await db.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [user.id]);
      await db.query('UPDATE sessions SET revoked_at=COALESCE(revoked_at,now()) WHERE family_id=(SELECT family_id FROM sessions WHERE id=$1)', [sessionId]);
    });
    await this.accessChanged();
    return { id: sessionId, version: 1, state: 'revoked' };
  }
}

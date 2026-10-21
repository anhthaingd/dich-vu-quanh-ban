import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ServiceUnavailableException, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import type { Pool, PoolClient } from 'pg';

export type LocalMessagesConfig = { secret: string; mailpit: string; smsDirectory: string; contacts: string[] };
export type LocalMessage = { contact: string; subject: string; text: string };
export class MessageSecrets {
 private readonly key: Buffer;
 constructor(secret: string) { this.key = createHash('sha256').update(secret).digest(); }
 hash(value: string) { return createHmac('sha256', this.key).update(value).digest('hex'); }
 encrypt(value: string) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', this.key, iv);
  const data = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64');
 }
 decrypt(value: string) {
  const raw = Buffer.from(value, 'base64'), cipher = createDecipheriv('aes-256-gcm', this.key, raw.subarray(0,12));
  cipher.setAuthTag(raw.subarray(12,28));
  return Buffer.concat([cipher.update(raw.subarray(28)), cipher.final()]).toString('utf8');
 }
}
export class LocalMessages implements OnModuleInit, OnModuleDestroy {
 readonly secrets: MessageSecrets;
 private timer?: ReturnType<typeof setInterval>;
 private running?: Promise<void>;
 constructor(private readonly pool: Pool, private readonly settings?: LocalMessagesConfig,
  private readonly transport?: (id: string, message: LocalMessage) => Promise<void>) {
  this.secrets = new MessageSecrets(settings?.secret ?? randomBytes(32).toString('hex'));
 }
 requireConfigured() { if (!this.settings) throw new ServiceUnavailableException(); }
 requireContact(contact: string) {
  if (!this.settings || !this.settings.contacts.includes(contact)) throw new ServiceUnavailableException();
 }
 async queue(db: PoolClient, kind: 'challenge'|'invitation', id: string, message: LocalMessage, expiry: Date) {
  this.requireContact(message.contact);
  await db.query(`INSERT INTO local_deliveries(${kind}_id,payload_cipher,expires_at) VALUES($1,$2,$3)`,
   [id,this.secrets.encrypt(JSON.stringify(message)),expiry]);
 }
 onModuleInit() {
  if (this.settings) { this.timer=setInterval(()=>{ void this.drain(); },1000); this.timer.unref(); }
 }
 async onModuleDestroy() { clearInterval(this.timer); await this.running; }
 drain(): Promise<void> {
  if (!this.settings) return Promise.resolve();
  if (!this.running) this.running=this.deliver().catch(()=>{ /* durable queue remains for next tick */ }).finally(()=>{this.running=undefined;});
  return this.running;
 }
 private async deliver() {
  const db=await this.pool.connect();
  try {
   await db.query('BEGIN');
   // Locked through delivery: competing workers cannot send the same row at once.
   const d=(await db.query(`SELECT * FROM local_deliveries WHERE payload_cipher IS NOT NULL
    AND next_attempt_at<=clock_timestamp() ORDER BY created_at,id LIMIT 1 FOR UPDATE SKIP LOCKED`)).rows[0];
   if (!d) { await db.query('COMMIT'); return; }
   const live=d.challenge_id
    ? (await db.query('SELECT 1 FROM auth_challenges WHERE id=$1 AND consumed_at IS NULL AND invalidated_at IS NULL AND attempts<5 AND expires_at>clock_timestamp()',[d.challenge_id])).rowCount
    : (await db.query("SELECT 1 FROM member_invitations WHERE id=$1 AND status='pending' AND expires_at>clock_timestamp()",[d.invitation_id])).rowCount;
   if (!live || d.expires_at<=new Date() || d.attempts>=3) {
    await db.query("UPDATE local_deliveries SET payload_cipher=NULL,state=CASE WHEN state='submitted' THEN state ELSE 'failed' END WHERE id=$1",[d.id]);
   } else {
    const message:LocalMessage=JSON.parse(this.secrets.decrypt(d.payload_cipher));
    try {
     if (this.transport) await this.transport(d.id,message);
     else if (message.contact.startsWith('+')) {
      await mkdir(this.settings!.smsDirectory,{recursive:true,mode:0o700});
      await writeFile(join(this.settings!.smsDirectory,d.id+'.json'),JSON.stringify({label:'SMS mô phỏng — DEMO local/test',...message}),{mode:0o600});
     } else {
      const response=await fetch(this.settings!.mailpit+'/api/v1/send',{method:'POST',signal:AbortSignal.timeout(5000),
       headers:{'Content-Type':'application/json'},body:JSON.stringify({From:{Email:'demo@example.test',Name:'Dịch vụ quanh bạn — DEMO'},To:[{Email:message.contact}],Subject:message.subject,Text:message.text})});
      if (!response.ok) throw new Error('LOCAL_DELIVERY_FAILED');
     }
     await db.query("UPDATE local_deliveries SET state='submitted',payload_cipher=NULL,attempts=attempts+1 WHERE id=$1",[d.id]);
    } catch {
     // A timeout may have delivered. Same delivery ID on retry; tokens are single use.
     await db.query("UPDATE local_deliveries SET state='unknown',attempts=attempts+1,next_attempt_at=clock_timestamp()+interval '10 seconds' WHERE id=$1",[d.id]);
    }
   }
   await db.query('COMMIT');
  } catch(error) { await db.query('ROLLBACK'); throw error; } finally {db.release();}
 }
}

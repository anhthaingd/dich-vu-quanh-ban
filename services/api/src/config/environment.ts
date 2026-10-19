import type {LocalMessagesConfig} from '../integrations/local-messages.js';
export interface Config { admin?:{secret:string}; realtimeEnabled?:boolean; localMessages?:LocalMessagesConfig; databaseUrl: string; cursorSecret: string; authSecret?: string; port: number; host: string; corsOrigin?: string; geoapifyKey?: string; localAssets?: { directory:string; origin:string } }
export function config(env = process.env): Config {
  if (!env.DATABASE_URL || !env.CURSOR_SECRET || env.CURSOR_SECRET.length < 32) {
    throw new Error('DATABASE_URL and CURSOR_SECRET (at least 32 characters) are required');
  }
  const url = new URL(env.DATABASE_URL);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('Invalid database protocol');
  const port = Number(env.PORT ?? 3100);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
  if (env.AUTH_SECRET && env.AUTH_SECRET.length < 32) throw new Error('AUTH_SECRET must have at least 32 characters');
  let localAssets:Config['localAssets'];
  if(env.LOCAL_ASSET_DIRECTORY){
    if(env.NODE_ENV==='production'||!env.LOCAL_ASSET_ORIGIN)throw new Error('Local assets require a non-production origin');
    const origin=new URL(env.LOCAL_ASSET_ORIGIN);
    if(!['http:','https:'].includes(origin.protocol)||origin.pathname!=='/'||origin.search||origin.username||origin.password)throw new Error('Invalid local asset origin');
    localAssets={directory:env.LOCAL_ASSET_DIRECTORY,origin:origin.origin};
  }
  let localMessages:Config['localMessages'];
  if(env.LOCAL_MESSAGES==='1'){
    if(!['development','test'].includes(env.NODE_ENV??'') || !['localhost','127.0.0.1','[::1]'].includes(url.hostname) || !['/dvqb_p1_demo','/dvqb_test'].includes(url.pathname) || (env.LOCAL_MESSAGES_SECRET?.length??0)<32 || !env.LOCAL_SMS_DIRECTORY || !env.LOCAL_MESSAGE_CONTACTS) throw new Error('Local messages require isolated dvqb_p1_demo/dvqb_test, secret and explicit DEMO contacts');
    const mailpit=new URL(env.LOCAL_MAILPIT_URL??'http://127.0.0.1:8025');
    if(mailpit.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(mailpit.hostname)||mailpit.username||mailpit.password||mailpit.pathname!=='/'||mailpit.search||mailpit.hash)throw new Error('Mailpit must be loopback only');
    localMessages={secret:env.LOCAL_MESSAGES_SECRET!,mailpit:mailpit.origin,smsDirectory:env.LOCAL_SMS_DIRECTORY,contacts:env.LOCAL_MESSAGE_CONTACTS.split(',').map(x=>x.trim().toLowerCase())};
  }
  let admin:Config['admin'];
  if(env.ADMIN_LOCAL_SECRET){
    if(!['development','test'].includes(env.NODE_ENV??'')||!['localhost','127.0.0.1','[::1]'].includes(url.hostname)||!['/dvqb_p1_demo','/dvqb_test'].includes(url.pathname)||env.ADMIN_LOCAL_SECRET.length<32)throw new Error('Admin pilot requires isolated local/test database and a separate secret');
    admin={secret:env.ADMIN_LOCAL_SECRET};
  }
  return { admin, realtimeEnabled:env.REALTIME_ENABLED==='1', localMessages, localAssets, databaseUrl: env.DATABASE_URL, cursorSecret: env.CURSOR_SECRET, authSecret: env.AUTH_SECRET || undefined, port, host: env.HOST ?? '127.0.0.1', geoapifyKey: env.GEOAPIFY_API_KEY?.trim() || undefined, corsOrigin: env.CORS_ORIGIN };
}

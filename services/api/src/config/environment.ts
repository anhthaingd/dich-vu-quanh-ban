import { S3Assets } from '../integrations/cloud.js';
import type {LocalMessagesConfig} from '../integrations/local-messages.js';
export interface Config { labRealtime?:boolean; verificationPolicy?:'phone'|'email_lab'; resend?:{from:string;apiKey:string}; databaseCaFile?:string; trustProxy?:boolean; proxyMode?:'alb'|'cloudfront-alb'; pilotEmails?:string[]; sesFrom?:string; pilotPhones?:string[]; smsEnabled?:boolean; finance?:{secret:string;mode?:'lab-test'}; calls?:import('../integrations/livekit/livekit.adapter.js').CallsConfig; push?:{accessToken?:string}; admin?:{secret:string}; realtimeEnabled?:boolean; localMessages?:LocalMessagesConfig; databaseUrl: string; cursorSecret: string; authSecret?: string; port: number; host: string; corsOrigin?: string; geoapifyKey?: string; localAssets?: { directory:string; origin:string; store?:import('../integrations/cloud.js').AssetStore } }
export function config(env = process.env): Config {
  // Never accept arbitrary hop counts or trust forwarding headers in local mode.
  if (env.CLOUD_PROXY_MODE !== undefined && (env.CLOUD_PILOT !== '1' || !['alb','cloudfront-alb'].includes(env.CLOUD_PROXY_MODE))) {
    throw new Error('Cloud proxy mode requires CLOUD_PILOT and an explicitly supported path');
  }
  const proxyMode: Config['proxyMode'] = env.CLOUD_PILOT === '1'
    ? (env.CLOUD_PROXY_MODE === 'cloudfront-alb' ? 'cloudfront-alb' : 'alb') : undefined;
  if (!env.DATABASE_URL || !env.CURSOR_SECRET || env.CURSOR_SECRET.length < 32) {
    throw new Error('DATABASE_URL and CURSOR_SECRET (at least 32 characters) are required');
  }
  const url = new URL(env.DATABASE_URL);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('Invalid database protocol');
  // Explicit owner-approved operational seed on the existing development DB.
  // Never enables a production/remote DB or connection-string host overrides.
  const operationalLocal = env.LOCAL_OPERATIONAL_DATA === '1' && env.NODE_ENV === 'development'
    && url.pathname === '/dvqb_local' && !url.search
    && ['localhost','127.0.0.1','[::1]'].includes(url.hostname)
    && ['localhost','127.0.0.1','::1'].includes(env.HOST ?? '127.0.0.1');
  if(env.LOCAL_OPERATIONAL_DATA === '1' && !operationalLocal) throw new Error('Operational seed requires development dvqb_local and loopback API/database');
  const localDatabase = operationalLocal || ['/dvqb_p1_demo','/dvqb_test'].includes(url.pathname);
  if(env.LAB_EMAIL_VERIFICATION !== undefined && !['0','1'].includes(env.LAB_EMAIL_VERIFICATION)) throw new Error('Invalid lab email verification setting');
  const labEmail = env.LAB_EMAIL_VERIFICATION === '1';
  if(labEmail && !(env.CLOUD_PILOT === '1' && proxyMode === 'cloudfront-alb') &&
    !(['development','test'].includes(env.NODE_ENV ?? '') && localDatabase && !url.search && ['localhost','127.0.0.1','[::1]'].includes(url.hostname))) throw new Error('Email eligibility requires the reviewed lab or isolated local/test database');
  if(env.EMAIL_PROVIDER !== undefined && !['ses','resend'].includes(env.EMAIL_PROVIDER)) throw new Error('Invalid email provider');
  if(env.EMAIL_PROVIDER === 'resend' && env.CLOUD_PILOT !== '1') throw new Error('Resend requires reviewed cloud configuration');
  let resend:Config['resend'];
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
    if(!['development','test'].includes(env.NODE_ENV??'') || !['localhost','127.0.0.1','[::1]'].includes(url.hostname) || !localDatabase || (env.LOCAL_MESSAGES_SECRET?.length??0)<32 || !env.LOCAL_SMS_DIRECTORY || !env.LOCAL_MESSAGE_CONTACTS) throw new Error('Local messages require an explicitly enabled local database, secret and explicit DEMO contacts');
    const mailpit=new URL(env.LOCAL_MAILPIT_URL??'http://127.0.0.1:8025');
    if(mailpit.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(mailpit.hostname)||mailpit.username||mailpit.password||mailpit.pathname!=='/'||mailpit.search||mailpit.hash)throw new Error('Mailpit must be loopback only');
    localMessages={secret:env.LOCAL_MESSAGES_SECRET!,mailpit:mailpit.origin,smsDirectory:env.LOCAL_SMS_DIRECTORY,contacts:env.LOCAL_MESSAGE_CONTACTS.split(',').map(x=>x.trim().toLowerCase())};
  }
  let admin:Config['admin'];
  if(env.ADMIN_LOCAL_SECRET){
    if(!['development','test'].includes(env.NODE_ENV??'')||!['localhost','127.0.0.1','[::1]'].includes(url.hostname)||!localDatabase||env.ADMIN_LOCAL_SECRET.length<32)throw new Error('Admin pilot requires isolated local/test database and a separate secret');
    admin={secret:env.ADMIN_LOCAL_SECRET};
  }
  const localP2=()=>{if(!['development','test'].includes(env.NODE_ENV??'')||!['localhost','127.0.0.1','[::1]'].includes(url.hostname)||!localDatabase)throw new Error('P2 pilots require isolated local/test database');};
  const cloudLab=env.CLOUD_PILOT==='1'&&proxyMode==='cloudfront-alb';
  const labRealtime=env.LAB_REALTIME_SINGLETON==='1';
  if(env.LAB_REALTIME_SINGLETON!==undefined&&!['0','1'].includes(env.LAB_REALTIME_SINGLETON))throw new Error('Invalid lab singleton setting');
  if(labRealtime&&(!cloudLab||env.REALTIME_ENABLED!=='1'))throw new Error('Singleton realtime requires reviewed cloud lab');
  let finance:Config['finance'],calls:Config['calls'];
  if(env.LAB_FINANCE_TEST!==undefined&&!['0','1'].includes(env.LAB_FINANCE_TEST))throw new Error('Invalid lab finance setting');
  if(env.FINANCE_TEST_SECRET&&env.LAB_FINANCE_TEST!=='1')throw new Error('Test finance key requires explicit lab mode');
  if(env.LAB_FINANCE_TEST==='1'){
    if(!cloudLab||env.FINANCE_LOCAL_SECRET||(env.FINANCE_TEST_SECRET?.length??0)<32||[env.AUTH_SECRET,env.CURSOR_SECRET,env.MESSAGE_SECRET,env.ADMIN_SECRET].includes(env.FINANCE_TEST_SECRET))throw new Error('Test finance requires cloud lab and an independent persistent secret');
    finance={secret:env.FINANCE_TEST_SECRET!,mode:'lab-test'};
  }
  if(env.FINANCE_LOCAL_SECRET){localP2();if(env.FINANCE_LOCAL_SECRET.length<32)throw new Error('Finance local secret must have at least 32 characters');finance={secret:env.FINANCE_LOCAL_SECRET};}
  if(env.LIVEKIT_URL||env.LIVEKIT_API_KEY||env.LIVEKIT_API_SECRET){
    if(env.LIVEKIT_MODE==='cloud'){
      if(!cloudLab||!labRealtime)throw new Error('Cloud calls require the singleton lab');
      const media=new URL(env.LIVEKIT_URL??'');
      if(media.protocol!=='wss:'||!/^([a-z0-9-]+)\.livekit\.cloud$/.test(media.hostname)||media.port||media.username||media.password||media.pathname!=='/'||media.search||media.hash||!env.LIVEKIT_API_KEY||(env.LIVEKIT_API_SECRET?.length??0)<32||!/^dvqb-lab-[0-9]{12}-[a-z0-9-]{3,12}-call-$/.test(env.LIVEKIT_ROOM_PREFIX??''))throw new Error('Invalid cloud LiveKit configuration');
      calls={url:media.origin,apiKey:env.LIVEKIT_API_KEY,apiSecret:env.LIVEKIT_API_SECRET!,mode:'cloud',roomPrefix:env.LIVEKIT_ROOM_PREFIX};
    }else{
    if(env.LIVEKIT_MODE&&env.LIVEKIT_MODE!=='local')throw new Error('Invalid LiveKit mode');
    localP2();const media=new URL(env.LIVEKIT_URL??'');
    if(!['ws:','wss:'].includes(media.protocol)||!['localhost','127.0.0.1','[::1]'].includes(media.hostname)||media.username||media.password||media.pathname!=='/'||media.search||media.hash||!env.LIVEKIT_API_KEY||!env.LIVEKIT_API_SECRET)throw new Error('LiveKit pilot requires loopback URL and explicit local credentials');
    calls={url:media.origin,apiKey:env.LIVEKIT_API_KEY,apiSecret:env.LIVEKIT_API_SECRET};
    }
  }
  if(env.EXPO_PUSH_ENABLED==='1'&&!cloudLab&&!['test','development'].includes(env.NODE_ENV??''))throw new Error('Expo push pilot requires local/test mode');
  if(cloudLab&&env.EXPO_PUSH_ENABLED==='1'&&(!labRealtime||!env.EXPO_ACCESS_TOKEN?.trim()))throw new Error('Cloud push requires singleton lab and Expo access token');
  let pilotEmails:string[]|undefined;
  let pilotPhones:string[]=[];
  if(env.CLOUD_PILOT==='1'){
    if(env.NODE_ENV!=='production'||!env.DATABASE_CA_FILE||!env.AUTH_SECRET||env.AUTH_SECRET===env.CURSOR_SECRET)throw new Error('Cloud pilot requires production, verified database TLS and independent secrets');
    if(env.LOCAL_ASSET_DIRECTORY||env.LOCAL_MESSAGES||env.ADMIN_LOCAL_SECRET||env.FINANCE_LOCAL_SECRET||(env.EXPO_PUSH_ENABLED==='1'&&!cloudLab)||(env.REALTIME_ENABLED==='1'&&!labRealtime))throw new Error('Local adapters and single-process realtime cannot be enabled in cloud pilot');
    const secureOrigin=(value:string|undefined)=>{const u=new URL(value??'');if(u.protocol!=='https:'||u.pathname!=='/'||u.search||u.hash||u.username||u.password)throw new Error('Cloud origin must be HTTPS');return u.origin;};
    const origin=secureOrigin(env.PUBLIC_API_ORIGIN);
    if(!env.CORS_ORIGIN)throw new Error('Cloud CORS allowlist required');
    env.CORS_ORIGIN.split(',').forEach(x=>secureOrigin(x.trim()));
    pilotEmails=env.PILOT_EMAILS?.split(',').map(x=>x.trim().toLowerCase());
    if(!pilotEmails?.length||pilotEmails.some(x=>! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x)))throw new Error('Explicit pilot email allowlist required');
    const sender=env.EMAIL_PROVIDER==='resend'?env.EMAIL_FROM:env.SES_FROM;
    if(!env.ASSET_BUCKET||!sender||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sender))throw new Error('Cloud bucket and email sender required');
    if(env.EMAIL_PROVIDER==='resend'){
      if(!/^re_[A-Za-z0-9_-]+$/.test(env.RESEND_API_KEY??''))throw new Error('Resend API key required');
      resend={from:sender,apiKey:env.RESEND_API_KEY!};
    }
    const secrets=[env.AUTH_SECRET,env.CURSOR_SECRET,env.MESSAGE_SECRET,env.ADMIN_SECRET];
    if(secrets.some(x=>!x||x.length<32)||new Set(secrets).size!==4)throw new Error('Independent cloud secrets required');
    localAssets={directory:'',origin,store:new S3Assets(env.ASSET_BUCKET)};
    pilotPhones=env.PILOT_PHONES?env.PILOT_PHONES.split(',').map(x=>x.trim()):[];
    if(pilotPhones.some(x=>!/^\+[1-9][0-9]{7,14}$/.test(x))||(env.SMS_ENABLED==='1'&&!pilotPhones.length))throw new Error('SMS requires explicit E164 phone allowlist');
    localMessages={secret:env.MESSAGE_SECRET!,mailpit:'',smsDirectory:'',contacts:[...pilotEmails,...(env.SMS_ENABLED==='1'?pilotPhones:[])]};
    admin={secret:env.ADMIN_SECRET!};
  } else if(env.NODE_ENV==='production')throw new Error('Production requires reviewed CLOUD_PILOT configuration');
  return {labRealtime,verificationPolicy:labEmail?'email_lab':'phone',resend,proxyMode,pilotPhones,smsEnabled:env.CLOUD_PILOT==='1'&&env.SMS_ENABLED==='1', databaseCaFile:env.DATABASE_CA_FILE,trustProxy:env.CLOUD_PILOT==='1',pilotEmails,sesFrom:env.CLOUD_PILOT==='1'?env.SES_FROM:undefined,finance,calls,push:env.EXPO_PUSH_ENABLED==='1'?{accessToken:env.EXPO_ACCESS_TOKEN}:undefined,admin, realtimeEnabled:env.REALTIME_ENABLED==='1', localMessages, localAssets, databaseUrl: env.DATABASE_URL, cursorSecret: env.CURSOR_SECRET, authSecret: env.AUTH_SECRET || undefined, port, host: env.HOST ?? '127.0.0.1', geoapifyKey: env.GEOAPIFY_API_KEY?.trim() || undefined, corsOrigin: env.CORS_ORIGIN };
}

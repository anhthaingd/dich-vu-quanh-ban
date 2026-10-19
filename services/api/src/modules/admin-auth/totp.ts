import {createHmac,timingSafeEqual} from 'node:crypto';
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function base32(bytes:Buffer){let bits=0,value=0,out='';for(const b of bytes){value=(value<<8)|b;bits+=8;while(bits>=5){out+=alphabet[(value>>>(bits-5))&31];bits-=5;}}if(bits)out+=alphabet[(value<<(5-bits))&31];return out;}
export function decode32(text:string){let bits=0,value=0;const out:number[]=[];for(const c of text){const n=alphabet.indexOf(c);if(n<0)throw Error('Invalid base32');value=(value<<5)|n;bits+=5;if(bits>=8){out.push((value>>>(bits-8))&255);bits-=8;}}return Buffer.from(out);}
export function totp(key:Buffer,counter:number,digits=6){const b=Buffer.alloc(8);b.writeBigUInt64BE(BigInt(counter));const h=createHmac('sha1',key).update(b).digest(),offset=h[19]&15;return String((h.readUInt32BE(offset)&0x7fffffff)%10**digits).padStart(digits,'0');}
export function matchCounter(key:Buffer,code:string,time=Date.now(),last=-1){if(!/^\d{6}$/.test(code))return null;const current=Math.floor(time/30000);for(const c of [current,current-1,current+1])if(c>=0&&c>last&&timingSafeEqual(Buffer.from(code),Buffer.from(totp(key,c))))return c;return null;}

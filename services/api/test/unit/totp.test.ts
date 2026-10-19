import {test} from 'node:test';
import assert from 'node:assert/strict';
import {totp,base32,decode32,matchCounter} from '../../src/modules/admin-auth/totp.js';
test('TOTP matches RFC 6238 vectors and rejects replay, malformed input and clock drift',()=>{
 const key=Buffer.from('12345678901234567890');
 for(const [time,code] of [[59,'94287082'],[1111111109,'07081804'],[1111111111,'14050471'],[1234567890,'89005924'],[2000000000,'69279037'],[20000000000,'65353130']] as const)assert.equal(totp(key,Math.floor(time/30),8),code);
 assert.deepEqual(decode32(base32(key)),key);
 const code=totp(key,100);assert.equal(matchCounter(key,code,3000000,99),100);
 assert.equal(matchCounter(key,code,3000000,100),null);
 assert.equal(matchCounter(key,code,3100000,99),null);
 assert.equal(matchCounter(key,'123',3000000,0),null);
});

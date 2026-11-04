import {test} from 'node:test';
import assert from 'node:assert/strict';
import {operationalRuntime} from '../review/start-operational-api.mjs';
const local={NODE_ENV:'development',HOST:'127.0.0.1',PORT:'3110',DATABASE_URL:'postgres://local:local@127.0.0.1:55432/dvqb_local'};
test('operational runtime pins the existing local database and explicitly toggles local media',()=>{
 const parent={DATABASE_URL:'postgres://remote/production',LIVEKIT_URL:'wss://remote',LIVEKIT_API_SECRET:'PRIVATE_CANARY'};
 const off=operationalRuntime(local,parent,false);assert.equal(off.env.DATABASE_URL,local.DATABASE_URL);assert.equal(off.env.LIVEKIT_URL,undefined);assert.equal(off.env.LIVEKIT_API_SECRET,undefined);
 const on=operationalRuntime(local,parent,true);assert.equal(on.env.LIVEKIT_URL,'ws://127.0.0.1:7880');assert.equal(on.port,3110);
 for(const change of [{NODE_ENV:'production'},{HOST:'0.0.0.0'},{PORT:'invalid'},{DATABASE_URL:'postgres://localhost/dvqb_test'},{DATABASE_URL:'postgres://remote/dvqb_local'}])assert.throws(()=>operationalRuntime({...local,...change},parent,true));
});

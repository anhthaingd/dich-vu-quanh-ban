import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { checkChange, snapshot, parseReport, scopeDiagnostics } from '../sdd/core.mjs';
import { recordEvidence, recipesFor } from '../sdd/run.mjs';
import nodeReporter from '../sdd/node-reporter.mjs';

const hash = text => createHash('sha256').update(text).digest('hex');
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'sdd-test-'));
  t.after(() => rm(root, {recursive:true,force:true}));
  const put = async (path, value) => {
    await mkdir(join(root,path,'..'), {recursive:true});
    await writeFile(join(root,path), typeof value === 'string' ? value : JSON.stringify(value));
  };
  const base = 'docs/ke-hoach-trien-khai/sdd/';
  await put('spec.json', {id:'QA-080',requirement:'MAP-02',operation:'searchPartners'});
  await put('src/map.ts', 'export const pin = null;');
  await put('test/map.test.ts', "test('private pin is hidden', () => {});");
  const sources = {version:1,sources:[{id:'qa',path:'spec.json',pointer:'',expected:{id:'QA-080',operation:'searchPartners'},sha256:hash(await readFile(join(root,'spec.json')))}],domains:[{id:'map',paths:['src/','test/']}]};
  const trace = {version:1,criteria:[{id:'AC-1',requirement:'MAP-02',sources:['qa'],code:['src/map.ts'],tests:[{suite:'mobile',file:'test/map.test.ts',name:'private pin is hidden'}]}]};
  const change = {version:1,id:'SAMPLE',type:'implementation',objective:'Check public pins',decision:'Approved in test fixture',baseCommit:'a'.repeat(40),sources:['qa'],criteria:['AC-1'],domains:['map'],scope:['src/','test/'],fingerprintPaths:['src/','test/'],outOfScope:['native']};
  const save = async () => {await put(base+'source-map.json',sources);await put(base+'traceability.json',trace);await put(base+'changes/SAMPLE.json',change);};
  await save();
  const report = {success:true,numFailedTests:0,numPendingTests:0,testResults:[{name:join(root,'test/map.test.ts'),assertionResults:[{fullName:'private pin is hidden',status:'passed'}]}]};
  const evidence = async () => {
    const prepared = await checkChange(root,'SAMPLE','prepare');
    assert.equal(prepared.exitCode,0,JSON.stringify(prepared.diagnostics));
    await put('test-results/sdd/SAMPLE/mobile.json',report);
    await put('test-results/sdd/SAMPLE/evidence.json',{version:1,change:'SAMPLE',snapshot:await snapshot(root,prepared.bundle),environment:{node:process.version,platform:process.platform},runs:[{suite:'mobile',command:['npm','test'],startedAt:'2026-10-13T00:00:00Z',finishedAt:'2026-10-13T00:00:01Z',exitCode:0,report:'test-results/sdd/SAMPLE/mobile.json',sha256:hash(JSON.stringify(report))}]});
  };
  return {root,put,sources,trace,change,save,report,evidence};
}
test('prepare accepts mapped work but verify refuses missing evidence; genuine named results pass', async t => {
  const f=await fixture(t);
  assert.equal((await checkChange(f.root,'SAMPLE','prepare')).exitCode,0);
  assert.equal((await checkChange(f.root,'SAMPLE','verify')).exitCode,1);
  await f.evidence();
  assert.equal((await checkChange(f.root,'SAMPLE','verify')).exitCode,0);
});
for (const [name,mutate,code] of [
  ['missing source',f=>{f.sources.sources[0].path='missing.json';},'SOURCE'],
  ['invalid pointer',f=>{f.sources.sources[0].pointer='/absent';},'SOURCE'],
  ['wrong QA ID',f=>{f.sources.sources[0].expected.id='QA-999';},'SOURCE'],
  ['wrong operation',f=>{f.sources.sources[0].expected.operation='wrong';},'SOURCE'],
  ['duplicate ID',f=>{f.sources.sources.push({...f.sources.sources[0]});},'SCHEMA'],
  ['no criteria',f=>{f.change.criteria=[];},'SCHEMA'],
  ['unknown criterion',f=>{f.change.criteria=['missing'];},'TRACE'],
  ['missing test',f=>{f.trace.criteria[0].tests=[];},'SCHEMA'],
  ['renamed test',f=>{f.trace.criteria[0].tests[0].name='absent';},'TEST'],
  ['unknown suite',f=>{f.trace.criteria[0].tests[0].suite='shell';},'SCHEMA'],
  ['source outside packet',f=>{f.trace.criteria[0].sources=['missing'];},'TRACE'],
  ['requirement absent in linked source',f=>{f.trace.criteria[0].requirement='NOT-APPROVED';},'TRACE'],
  ['code outside scope',f=>{f.change.scope=['test/'];},'SCOPE'],
]) test(name+' fails closed',async t=>{
  const f=await fixture(t);mutate(f);await f.save();
  const r=await checkChange(f.root,'SAMPLE','prepare');
  assert.notEqual(r.exitCode,0);assert.ok(r.diagnostics.some(d=>d.code===code),JSON.stringify(r.diagnostics));
});
test('source edits require review; no hash is silently refreshed',async t=>{
  const f=await fixture(t);await f.put('spec.json',{id:'QA-080',operation:'changed'});
  const r=await checkChange(f.root,'SAMPLE','prepare');assert.equal(r.exitCode,1);
  assert.ok(r.diagnostics.some(d=>d.code==='SOURCE_CHANGED'));
});
test('stale code, including new files, invalidates evidence',async t=>{
  const f=await fixture(t);await f.evidence();await f.put('src/new.ts','new code');
  const r=await checkChange(f.root,'SAMPLE','verify');assert.equal(r.exitCode,1);
  assert.ok(r.diagnostics.some(d=>d.code==='STALE_EVIDENCE'));
});
for(const status of ['failed','pending','todo','skipped']) test('a '+status+' assertion cannot be called passed',async t=>{
  const f=await fixture(t);f.report.testResults[0].assertionResults[0].status=status;await f.evidence();
  assert.equal((await checkChange(f.root,'SAMPLE','verify')).exitCode,1);
});
test('report tampering, omitted assertion and nonzero exit cannot pass',async t=>{
  const f=await fixture(t);await f.evidence();await f.put('test-results/sdd/SAMPLE/mobile.json',{});
  assert.equal((await checkChange(f.root,'SAMPLE','verify')).exitCode,1);
  f.report.testResults[0].assertionResults=[];await f.evidence();
  assert.equal((await checkChange(f.root,'SAMPLE','verify')).exitCode,1);
  f.report.testResults[0].assertionResults=[{fullName:'private pin is hidden',status:'passed'}];await f.evidence();
  const path='test-results/sdd/SAMPLE/evidence.json',e=JSON.parse(await readFile(join(f.root,path)));e.runs[0].exitCode=1;await f.put(path,e);
  assert.equal((await checkChange(f.root,'SAMPLE','verify')).exitCode,1);
});
test('bad JSON and invalid CLI input are input errors, never success',async t=>{
  const f=await fixture(t);await f.put('docs/ke-hoach-trien-khai/sdd/source-map.json','{');
  assert.equal((await checkChange(f.root,'SAMPLE','prepare')).exitCode,2);
  for(const args of [[],['--change','../../etc/passwd'],['--change','SAMPLE','--phase','done']]){
    const r=spawnSync(process.execPath,['scripts/sdd/check.mjs',...args],{encoding:'utf8'});assert.equal(r.status,2);
  }
});
test('path escape and symlink escape are refused before reading',async t=>{
  const f=await fixture(t);f.sources.sources[0].path='../escape.json';await f.save();
  assert.notEqual((await checkChange(f.root,'SAMPLE','prepare')).exitCode,0);
  await symlink('/etc/hosts',join(f.root,'link'));f.sources.sources[0].path='link';await f.save();
  assert.notEqual((await checkChange(f.root,'SAMPLE','prepare')).exitCode,0);
});
test('parsers preserve actual test identity and reject bad or skipped reports',()=>{
  const node=[{type:'test:pass',data:{name:'privacy',file:'/repo/test.ts',details:{}}}];
  assert.equal(parseReport('api',node,'/repo')[0].name,'privacy');
  const web={errors:[],suites:[{file:'test.spec.mjs',specs:[{title:'privacy',tests:[{expectedStatus:'passed',results:[{status:'passed'}]}]}]}]};
  assert.equal(parseReport('web',web,'/repo')[0].status,'passed');
  assert.throws(()=>parseReport('mobile',{},'/repo'));
});
test('recorder binds raw reports to the pre-run snapshot and rejects edits during a run',async t=>{
  const f=await fixture(t),prepared=await checkChange(f.root,'SAMPLE','prepare'),before=await snapshot(f.root,prepared.bundle);
  await f.put('test-results/sdd/SAMPLE/mobile.json',f.report);
  const runs=[{suite:'mobile',command:['npm','test'],startedAt:'2026-10-13T00:00:00Z',finishedAt:'2026-10-13T00:00:01Z',exitCode:0,report:'test-results/sdd/SAMPLE/mobile.json'}];
  await recordEvidence(f.root,prepared.bundle,before,runs);
  assert.equal((await checkChange(f.root,'SAMPLE','verify')).exitCode,0);
  await f.put('src/map.ts','changed while testing');
  await assert.rejects(recordEvidence(f.root,prepared.bundle,before,runs),/đổi/);
});
test('recipes are allowlisted and node reporter preserves fail and skip without trusting logs',async()=>{
  assert.throws(()=>recipesFor('/repo','arbitrary'),/chưa có/);
  assert.deepEqual(recipesFor('/repo','SDD-01-MAP-02').map(r=>r.suite),['mobile','api','build','web']);
  const web=recipesFor('/repo','SDD-01-MAP-02').find(r=>r.suite==='web');
  assert.equal(web.env?.PLAYWRIGHT_JSON_OUTPUT_FILE,web.report,'Console output must not be used as a JSON report');
  assert.equal(web.stdoutReport,undefined);
  async function* events(){yield {type:'test:diagnostic',data:{message:'pass'}};yield {type:'test:pass',data:{name:'skip',file:'/x',skip:true}};yield {type:'test:fail',data:{name:'bad',file:'/x'}};}
  let text='';for await(const chunk of nodeReporter(events()))text+=chunk;
  const report=JSON.parse(text);assert.equal(report.length,2);assert.equal(report[0].data.skip,true);assert.equal(report[1].type,'test:fail');
});
test('changed managed files outside a packet fail; unrelated files remain explicitly unverified',async t=>{
  const f=await fixture(t),r=await checkChange(f.root,'SAMPLE','prepare');
  r.bundle.change.scope=['src/map.ts','test/'];
  const rows=scopeDiagnostics(r.bundle,['src/new.ts','notes.md','spec.json']);
  assert.ok(rows.some(d=>d.code==='SCOPE' && d.level==='error'));
  assert.ok(rows.some(d=>d.code==='CLASSIFICATION'));
  assert.ok(rows.some(d=>d.code==='OUTSIDE_SCOPE' && d.message.includes('notes.md')));
});
test('command arguments can repeat; a malformed or duplicate result still cannot pass',async t=>{
  const f=await fixture(t);await f.evidence();
  const path='test-results/sdd/SAMPLE/evidence.json',e=JSON.parse(await readFile(join(f.root,path)));e.runs[0].command=['node','test','test'];await f.put(path,e);
  assert.equal((await checkChange(f.root,'SAMPLE','verify')).exitCode,0);
  e.runs.push(e.runs[0]);await f.put(path,e);assert.equal((await checkChange(f.root,'SAMPLE','verify')).exitCode,1);
});

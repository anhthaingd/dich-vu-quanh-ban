import {test} from 'node:test';
import assert from 'node:assert/strict';
import {inventoryDiagnostics, routeInventory,testInventory} from '../sdd/project.mjs';
import {namedTests,parseReport,scopeDiagnostics} from '../sdd/core.mjs';

const fixture=()=>({
  inventory:{version:1,files:[{path:'src/a.ts',kind:'product'}],criteria:['AC'],qa:[{id:'QA-1',status:'partial',criteria:['AC'],reason:'Only one branch checked'}],operations:[{id:'getA',method:'GET',path:'/a',status:'implemented',criteria:['AC'],reason:'Local only'}],routes:[{method:'GET',path:'/a',file:'src/a.ts'}]},
  actual:{files:['src/a.ts'],criteria:['AC'],selectedCriteria:['AC'],qa:['QA-1'],operations:[{id:'getA',method:'GET',path:'/a'}],routes:[{method:'GET',path:'/a',file:'src/a.ts'}]},
});
test('project inventory accounts for all files, QA, operations, routes and required criteria',()=>{
  const f=fixture();assert.deepEqual(inventoryDiagnostics(f.inventory,f.actual),[]);
});
for(const [label,mutate] of [
  ['new file',f=>f.actual.files.push('src/new.ts')],
  ['deleted file',f=>f.actual.files=[]],
  ['new QA',f=>f.actual.qa.push('QA-2')],
  ['new API operation',f=>f.actual.operations.push({id:'postA',method:'POST',path:'/a'})],
  ['contract route changed',f=>f.actual.operations[0].path='/b'],
  ['unregistered controller',f=>f.actual.routes.push({method:'POST',path:'/a',file:'src/a.ts'})],
  ['criterion removed from packet',f=>f.actual.selectedCriteria=[]],
  ['criterion removed from trace',f=>f.actual.criteria=[]],
  ['QA references missing criterion',f=>f.inventory.qa[0].criteria=['MISSING']],
  ['silent pending without explanation',f=>f.inventory.qa[0].reason=''],
  ['duplicate file',f=>f.inventory.files.push(f.inventory.files[0])],
]) test(label+' cannot silently become green',()=>{const f=fixture();mutate(f);assert.ok(inventoryDiagnostics(f.inventory,f.actual).length>0);});
test('Nest route discovery preserves controller/method path and excludes comments',()=>{
  const source="// @Get('fake')\n@Controller('assets') export class Assets { @Put(':id/upload') put(){} @Get(':id') get(){} }";
  assert.deepEqual(routeInventory(source,'a.ts'),[{method:'PUT',path:'/assets/{id}/upload',file:'a.ts'},{method:'GET',path:'/assets/{id}',file:'a.ts'}]);
});
test('Nest action routes expand the actual whitelist, including imported input constants',()=>{
  const code="@Controller('x') class A { @Post(':id/:action') change(action){ if(!actions.includes(action))throw Error(); } }";
  assert.deepEqual(routeInventory(code,'x.ts',"export const actions=['send','confirm'] as const;" ).map(r=>r.path),['/x/{id}/send','/x/{id}/confirm']);
  assert.throws(()=>routeInventory(code,'x.ts'),/whitelist/);
});
test('literal nested test names preserve ancestry and disabled groups cannot prepare',()=>{
  assert.deepEqual(namedTests("describe('outer',()=>{it('works',()=>{});});describe.skip('off',()=>{test('fake',()=>{});});",'a.ts'),['outer works']);
});
test('foreign workspace report paths use producer root without basename matching',()=>{
  const report={success:true,numFailedTests:0,testResults:[{name:'/home/runner/repo/apps/mobile/a.test.ts',assertionResults:[{fullName:'works',status:'passed'}]}]};
  assert.equal(parseReport('mobile',report,'/home/runner/repo')[0].file,'apps/mobile/a.test.ts');
});
test('all classified canonical specs require spec-change even when not a selected QA source',()=>{
  const bundle={change:{type:'implementation',scope:['docs/']},sources:[],domains:[{paths:['docs/']}],inventory:{files:[{path:'docs/spec.sql',kind:'spec'}]}};
  assert.ok(scopeDiagnostics(bundle,['docs/spec.sql']).some(d=>d.code==='CLASSIFICATION'));
});
test('nested test files are scheduled rather than silently omitted',()=>{
  const tests=testInventory(['services/api/test/integration/new/a.test.ts','scripts/test/new/a.test.mjs','tests/e2e/web/nested/a.spec.mjs']);
  assert.equal(tests.api.length,1);assert.equal(tests.tooling.length,1);assert.equal(tests.web.length,1);
});
test('implementation status and route contracts cannot disagree without an explicit exception',()=>{
  const f=fixture();f.inventory.operations[0].status='specified-not-implemented';
  assert.ok(inventoryDiagnostics(f.inventory,f.actual).length>0);
  f.inventory.operations[0].status='implemented';f.inventory.routes[0].path='/unknown';f.actual.routes[0].path='/unknown';
  assert.ok(inventoryDiagnostics(f.inventory,f.actual).length>0);
});

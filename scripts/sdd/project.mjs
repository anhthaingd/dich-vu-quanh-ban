import {execFileSync} from 'node:child_process';
import {readFileSync, existsSync} from 'node:fs';
import {resolve} from 'node:path';
import ts from 'typescript';

// Local IDE files are not product inputs. Tracked files are NEVER excluded.
const localOnly=p=>p.startsWith('apps/mobile/.idea/');
export const REQUIRED_STEPS=['lint','typecheck','tooling','mobile','mobile-coverage','api','api-coverage','build','web','load','prototype','storybook'];
export function testInventory(files) {
  return {
    mobile:files.filter(p=>p.startsWith('apps/mobile/') && /\.test\.tsx?$/.test(p)),
    api:files.filter(p=>/^services\/api\/test\/(unit|integration)\/.+\.test\.ts$/.test(p)),
    web:files.filter(p=>/^tests\/e2e\/web\/.+\.spec\.mjs$/.test(p)),
    tooling:files.filter(p=>/^scripts\/(test|diagnostics)\/.+\.test\.mjs$/.test(p)),
  };
}
export function repoFiles(root) {
  const git=args=>execFileSync('git',['-C',root,...args],{encoding:'utf8'}).split('\0').filter(Boolean);
  return [...new Set([...git(['ls-files','-z']),...git(['ls-files','--others','--exclude-standard','-z']).filter(p=>!localOnly(p))])].sort();
}
export function operationInventory(api) {
  return Object.entries(api.paths).flatMap(([path,methods])=>Object.entries(methods).filter(([,v])=>v.operationId).map(([method,v])=>({id:v.operationId,method:method.toUpperCase(),path})));
}
export function routeInventory(content,file,inputContent='') {
  const ast=ts.createSourceFile(file,content,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS),rows=[];
  const inputAst=ts.createSourceFile('input.ts',inputContent,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
  const arrays=new Map();
  const unwrap=n=>n && (ts.isAsExpression(n)||ts.isParenthesizedExpression(n))?unwrap(n.expression):n;
  function constants(node) {
    if(ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      const v=unwrap(node.initializer);
      if(v && ts.isArrayLiteralExpression(v) && v.elements.every(ts.isStringLiteralLike)) arrays.set(node.name.text,v.elements.map(e=>e.text));
    }
    ts.forEachChild(node,constants);
  }
  constants(ast);constants(inputAst);
  const decorators=node=>ts.canHaveDecorators(node)?ts.getDecorators(node)??[]:[];
  const call=d=>ts.isCallExpression(d.expression) && ts.isIdentifier(d.expression.expression)?d.expression:null;
  const argument=c=>c.arguments.length===0?'':ts.isStringLiteralLike(c.arguments[0])?c.arguments[0].text:null;
  function walk(node) {
    if(ts.isClassDeclaration(node)) {
      const controller=decorators(node).map(call).find(c=>c?.expression.text==='Controller');
      if(controller) {
        const base=argument(controller);if(base===null) throw Error(`${file}: dynamic Controller path needs explicit review`);
        for(const member of node.members) for(const d of decorators(member)) {
          const c=call(d);if(!c || !['Get','Post','Put','Patch','Delete','Options','Head','All'].includes(c.expression.text)) continue;
          const part=argument(c);if(part===null) throw Error(`${file}: dynamic route needs explicit review`);
          const route=('/'+base+'/'+part).replace(/\/{2,}/g,'/').replace(/\/$/,'').replace(/:([A-Za-z0-9_]+)/g,'{$1}')||'/';
          let actions;
          if(route.includes('{action}')) {
            function find(node) {
              if(ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text==='includes' && ts.isIdentifier(unwrap(node.arguments[0])) && unwrap(node.arguments[0]).text==='action') {
                const v=unwrap(node.expression.expression);
                if(ts.isArrayLiteralExpression(v) && v.elements.every(ts.isStringLiteralLike)) actions=v.elements.map(e=>e.text);
                else if(ts.isIdentifier(v)) actions=arrays.get(v.text);
              }
              ts.forEachChild(node,find);
            }
            find(member);
            if(!actions?.length) throw Error(`${file}: action whitelist chưa đọc được, cần review`);
          }
          for(const routePath of actions?actions.map(a=>route.replace('{action}',a)):[route]) rows.push({method:c.expression.text.toUpperCase(),path:routePath,file});
        }
      }
    }
    ts.forEachChild(node,walk);
  }
  walk(ast);return rows;
}
export function discoverRoutes(root,files) {
  return files.filter(p=>p.startsWith('services/api/src/') && p.endsWith('.controller.ts')).flatMap(p=>{
    const input=resolve(root,p.replace('.controller.ts','.input.ts'));
    return routeInventory(readFileSync(resolve(root,p),'utf8'),p,existsSync(input)?readFileSync(input,'utf8'):'');
  });
}
export function inventoryDiagnostics(inventory,actual) {
  const errors=[],fail=message=>errors.push({level:'error',code:'INVENTORY',message});
  const compare=(label,expected,found)=>{
    if(new Set(expected).size!==expected.length) fail(`${label}: duplicate inventory entry`);
    for(const id of found) if(!expected.includes(id)) fail(`${label}: chưa đăng ký ${id}`);
    for(const id of expected) if(!found.includes(id)) fail(`${label}: thiếu ${id}`);
  };
  if(inventory.version!==1) fail('Inventory version không hợp lệ');
  compare('files',inventory.files.map(f=>f.path),actual.files);
  for(const f of inventory.files) if(!['product','test','tooling','infra','prototype','spec','documentation','reference','placeholder','compatibility'].includes(f.kind)) fail(`${f.path}: kind không hợp lệ`);
  if(actual.tests) {
    compare('required steps',inventory.requiredSteps,REQUIRED_STEPS);
    for(const suite of Object.keys(actual.tests)) compare('test files '+suite,inventory.tests[suite],actual.tests[suite]);
  }
  compare('criteria registry',inventory.criteria,actual.criteria);
  compare('criteria packet',inventory.criteria,actual.selectedCriteria);
  compare('QA',inventory.qa.map(q=>q.id),actual.qa);
  const opKey=o=>`${o.method} ${o.path} ${o.id}`;
  compare('operations',inventory.operations.map(opKey),actual.operations.map(opKey));
  const routeKey=r=>`${r.method} ${r.path} ${r.file}`;
  compare('controllers',inventory.routes.map(routeKey),actual.routes.map(routeKey));
  const matches=(a,b)=>a.path===b.path && a.method===b.method;
  for(const operation of inventory.operations) {
    const implemented=actual.routes.some(r=>matches(r,operation));
    if((operation.status==='implemented')!==implemented) fail(`${operation.id}: status không khớp controller`);
  }
  for(const route of actual.routes) if(!actual.operations.some(o=>matches(o,route)) && !(inventory.contractGaps??[]).some(e=>matches(e,route) && e.file===route.file && e.reason?.trim())) fail(`${route.method} ${route.path}: route không có contract hoặc ngoại lệ đã review`);
  for(const gap of inventory.contractGaps??[]) if(!actual.routes.some(r=>matches(r,gap) && r.file===gap.file) || actual.operations.some(o=>matches(o,gap))) fail(`${gap.path}: ngoại lệ không còn đúng`);
  for(const item of [...inventory.qa,...inventory.operations]) {
    if(!['partial','unmapped','implemented','specified-not-implemented'].includes(item.status) || !item.reason?.trim()) fail(`${item.id}: thiếu trạng thái/giới hạn`);
    if(!Array.isArray(item.criteria) || item.criteria.some(c=>!inventory.criteria.includes(c))) fail(`${item.id}: criterion không tồn tại`);
    if(item.status==='partial' && !item.criteria?.length) fail(`${item.id}: partial cần tiêu chí thực tế`);
  }
  return errors;
}
export function checkProject(root,bundle) {
  const read=p=>JSON.parse(readFileSync(resolve(root,p),'utf8'));
  const inventory=read('docs/ke-hoach-trien-khai/sdd/project-inventory.json');
  const files=repoFiles(root),trace=read('docs/ke-hoach-trien-khai/sdd/traceability.json');
  const actual={files,tests:testInventory(files),criteria:trace.criteria.map(c=>c.id),selectedCriteria:bundle.change.criteria,
    qa:read('docs/technical-design/qa-cases.json').map(q=>q.id),operations:operationInventory(read('docs/technical-design/openapi.json')),
    routes:discoverRoutes(root,files)};
  return {inventory,diagnostics:inventoryDiagnostics(inventory,actual)};
}

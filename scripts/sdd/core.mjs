import { readFileSync, readdirSync, realpathSync, statSync, existsSync, lstatSync, readlinkSync } from 'node:fs';
import { resolve, relative, isAbsolute, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import {repoFiles, checkProject} from './project.mjs';

export const DATA = 'docs/ke-hoach-trien-khai/sdd/';
export const sha256 = value => createHash('sha256').update(value).digest('hex');
const nonempty = x => typeof x === 'string' && x.trim().length > 0;
const list = x => Array.isArray(x) && x.length > 0 && x.every(nonempty) && new Set(x).size === x.length;
const covers = (paths, file) => paths.some(p => file === p || (p.endsWith('/') && file.startsWith(p)));
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
function demand(ok, message) { if (!ok) throw Error(message); }
export function safePath(root, path) {
  demand(nonempty(path) && !isAbsolute(path) && !path.split(/[\\/]/).includes('..'), `Đường dẫn không hợp lệ: ${path}`);
  const result=resolve(root,path), real=realpathSync(result), base=realpathSync(root);
  demand(real === base || real.startsWith(base+sep), `Đường dẫn ra ngoài repo: ${path}`);
  return result;
}
const json = (root,path) => JSON.parse(readFileSync(safePath(root,path),'utf8'));
function index(rows,label) {
  demand(Array.isArray(rows) && rows.length>0, `${label}: danh sách rỗng`);
  const map=new Map();
  for(const row of rows) { demand(row && nonempty(row.id) && !map.has(row.id), `${label}: ID thiếu/trùng`);map.set(row.id,row); }
  return map;
}
function git(root,args) { return execFileSync('git',['-C',root,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim(); }
function gitHead(root) { try{return git(root,['rev-parse','HEAD']);}catch{return null;} }
function filesUnder(root,path) {
  const full=safePath(root,path);
  if(!statSync(full).isDirectory()) return [path.replaceAll('\\','/')];
  return readdirSync(full,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(entry=>{
    demand(!entry.isSymbolicLink(),`Không băm symlink: ${path}/${entry.name}`);
    return filesUnder(root,path.replace(/\/$/,'')+'/'+entry.name);
  });
}
export async function snapshot(root,bundle) {
  if(bundle.change.profile==='project') {
    const files=repoFiles(root);
    return {head:gitHead(root),sha256:sha256(JSON.stringify(files.map(p=>{
      const full=resolve(root,p);
      return [p,sha256(lstatSync(full).isSymbolicLink()?'symlink:'+readlinkSync(full):readFileSync(full))];
    })))};
  }
  const paths=[...bundle.change.fingerprintPaths, DATA+'source-map.json',DATA+'traceability.json',DATA+`changes/${bundle.change.id}.json`,...bundle.sources.map(s=>s.path)];
  // The checker and its recipes are part of the evidence interpretation.
  if(existsSync(resolve(root,'scripts/sdd'))) paths.push('scripts/sdd/');
  const files=[...new Set(paths.flatMap(p=>filesUnder(root,p)))].sort();
  demand(!files.some(p=>p.startsWith('test-results/')), 'Không băm artifact bằng chứng vào chính nó');
  return {head:gitHead(root),sha256:sha256(JSON.stringify(files.map(p=>[p,sha256(readFileSync(safePath(root,p)))])))};
}
function pointer(value,path) {
  demand(typeof path==='string' && (path==='' || path.startsWith('/')), 'JSON Pointer không hợp lệ');
  for(const raw of path===''?[]:path.slice(1).split('/')) {
    demand(!/~(?![01])/u.test(raw),'JSON Pointer escape sai');
    const key=raw.replaceAll('~1','/').replaceAll('~0','~');
    demand(value!==null && typeof value==='object' && Object.hasOwn(value,key),`Không tìm thấy JSON Pointer ${path}`);
    value=value[key];
  }
  return value;
}
function matchesExpected(value,expected) {
  return Object.entries(expected).every(([k,v])=>value && Object.hasOwn(value,k) && same(value[k],v));
}
export function namedTests(content,file) {
  const source=ts.createSourceFile(file,content,ts.ScriptTarget.Latest,true,file.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  const names=[];
  function visit(node,ancestors=[]) {
    if(ts.isCallExpression(node)) {
      const expression=node.expression;
      if(ts.isPropertyAccessExpression(expression) && ts.isIdentifier(expression.expression) && ['describe','test','it'].includes(expression.expression.text) && ['skip','only','todo'].includes(expression.name.text)) return;
      if(ts.isIdentifier(expression) && node.arguments[0] && ts.isStringLiteralLike(node.arguments[0])) {
        if(['test','it'].includes(expression.text)) names.push([...ancestors,node.arguments[0].text].join(' '));
        if(expression.text==='describe') {
          for(const arg of node.arguments.slice(1)) visit(arg,[...ancestors,node.arguments[0].text]);
          return;
        }
      }
    }
    ts.forEachChild(node,child=>visit(child,ancestors));
  }
  visit(source);return names;
}
function fileName(root,file,web=false) {
  demand(nonempty(file),'Report thiếu tên file');
  if(isAbsolute(file)) return relative(root,file).split(sep).join('/');
  return web && !file.startsWith('tests/') ? 'tests/e2e/web/'+file : file;
}
export function parseReport(suite,report,root) {
  const rows=[];
  if(suite==='mobile') {
    demand(report?.success===true && report.numFailedTests===0 && Array.isArray(report.testResults),'Jest report không thành công hoặc không hợp lệ');
    for(const file of report.testResults) {
      demand(Array.isArray(file.assertionResults),'Jest thiếu assertionResults');
      for(const a of file.assertionResults) rows.push({file:fileName(root,file.name),name:a.fullName,status:a.status});
    }
  } else if(suite==='api' || suite==='tooling') {
    demand(Array.isArray(report),'Node report không hợp lệ');
    for(const event of report) {
      if(!['test:pass','test:fail'].includes(event.type)) continue;
      const d=event.data;
      demand(d && nonempty(d.name),'Node report thiếu tên test');
      demand(event.type!=='test:fail','Node report có test thất bại');
      rows.push({file:fileName(root,d.file),name:d.name,status:d.skip || d.todo ? 'skipped':'passed'});
    }
  } else if(suite==='web') {
    demand(Array.isArray(report?.suites) && Array.isArray(report.errors) && report.errors.length===0,'Playwright report không hợp lệ/có lỗi');
    function walk(suite) {
      for(const spec of suite.specs??[]) for(const test of spec.tests??[]) {
        const passed=test.expectedStatus==='passed' && test.results?.length>0 && test.results.every(r=>r.status==='passed');
        rows.push({file:fileName(root,spec.file??suite.file,true),name:spec.title,status:passed?'passed':'failed'});
      }
      for(const child of suite.suites??[]) walk(child);
    }
    report.suites.forEach(walk);
  } else throw Error(`Suite không được hỗ trợ: ${suite}`);
  demand(rows.length>0,'Report không có kết quả test');
  return rows;
}

export function scopeDiagnostics(bundle,changed) {
  const {change,domains,sources}=bundle,managed=domains.flatMap(d=>d.paths),rows=[];
  for(const path of changed.filter(p=>covers(managed,p) && !covers(change.scope,p))) rows.push({level:'error',code:'SCOPE',message:`${path}: thay đổi trong miền quản lý nhưng ngoài gói`});
  const specPaths=[...new Set([...sources.map(s=>s.path),...(bundle.inventory?.files??[]).filter(f=>f.kind==='spec').map(f=>f.path)])];
  if(change.type==='implementation') for(const path of specPaths.filter(p=>changed.includes(p))) rows.push({level:'error',code:'CLASSIFICATION',message:`${path}: nguồn spec đổi nhưng gói ghi implementation; kiểm quyết định thay đổi spec`});
  const outside=changed.filter(p=>!covers(managed,p));
  if(outside.length) rows.push({level:'warning',code:'OUTSIDE_SCOPE',message:`${outside.length} file ngoài miền mẫu, không chứng nhận: ${outside.slice(0,10).join(', ')}`});
  return rows;
}

export async function checkChange(root,id,phase) {
  const diagnostics=[],warn=(code,message)=>diagnostics.push({level:'warning',code,message}),fail=(code,message)=>diagnostics.push({level:'error',code,message});
  const result=()=>({exitCode:diagnostics.some(d=>d.level==='error')?1:0,diagnostics,bundle});
  let bundle;
  try {
    demand(/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(id??'') && ['prepare','verify'].includes(phase),'Cần --change ID và --phase prepare|verify');
    const sourceMap=json(root,DATA+'source-map.json'),trace=json(root,DATA+'traceability.json'),change=json(root,DATA+`changes/${id}.json`);
    let sourceIndex,criterionIndex,domainIndex;
    try {
      demand(sourceMap.version===1 && trace.version===1 && change.version===1,'Chỉ hỗ trợ version 1');
      sourceIndex=index(sourceMap.sources,'sources');criterionIndex=index(trace.criteria,'criteria');domainIndex=index(sourceMap.domains,'domains');
      demand(change.id===id && ['implementation','spec-change'].includes(change.type),'Change ID/type không hợp lệ');
      demand(nonempty(change.objective) && nonempty(change.decision) && /^[a-f0-9]{40}$/.test(change.baseCommit),'Thiếu mục tiêu, căn cứ hoặc commit nền');
      for(const key of ['sources','criteria','domains','scope','fingerprintPaths','outOfScope']) demand(list(change[key]),`Change thiếu/sai ${key}`);
      for(const s of sourceMap.sources) demand(nonempty(s.path) && /^[a-f0-9]{64}$/.test(s.sha256) && (nonempty(s.heading) !== (typeof s.pointer==='string')) && (s.heading || (s.expected && Object.keys(s.expected).length>0)),`Source ${s.id} thiếu path/hash/selector/expected`);
      for(const d of sourceMap.domains) demand(list(d.paths),`Domain ${d.id} thiếu paths`);
      for(const c of trace.criteria) {
        demand(nonempty(c.requirement) && list(c.sources) && list(c.code) && Array.isArray(c.tests) && c.tests.length>0,`Criterion ${c.id} thiếu requirement/sources/code/tests`);
        for(const t of c.tests) demand(['api','mobile','web','tooling'].includes(t.suite) && nonempty(t.file) && nonempty(t.name),`Criterion ${c.id} test sai suite/file/name`);
      }
    }catch(e){fail('SCHEMA',e.message);return result();}
    const sources=change.sources.map(s=>sourceIndex.get(s)),criteria=change.criteria.map(c=>criterionIndex.get(c)),domains=change.domains.map(d=>domainIndex.get(d));
    if([...sources,...criteria,...domains].some(v=>!v)) {fail('TRACE','Gói tham chiếu source/criterion/domain không tồn tại');return result();}
    bundle={change,sources,criteria,domains};
    if(change.profile==='project') {
      const project=checkProject(root,bundle);bundle.inventory=project.inventory;diagnostics.push(...project.diagnostics);
    }
    const resolvedSources=new Map();
    for(const s of sources) {
      try {
        const text=readFileSync(safePath(root,s.path),'utf8');
        if(sha256(text)!==s.sha256) fail('SOURCE_CHANGED',`${s.id}: ${s.path} đã đổi; đọc lại nguồn trước khi cập nhật dấu băm`);
        if(s.heading) demand(text.split(/\r?\n/).includes(s.heading),`${s.id}: không tìm thấy heading ${s.heading}`);
        else {
          const value=pointer(JSON.parse(text),s.pointer);
          demand(matchesExpected(value,s.expected),`${s.id}: giá trị ID/contract tại ${s.pointer} không khớp`);
          resolvedSources.set(s.id,value);
        }
      }catch(e){fail('SOURCE',`${s.id}: ${e.message}`);}
    }
    for(const c of criteria) {
      if(!c.sources.every(s=>change.sources.includes(s))) fail('TRACE',`${c.id}: nguồn không nằm trong gói`);
      for(const requirement of c.requirement.split(';').map(r=>r.trim())) if(!c.sources.some(s=>typeof resolvedSources.get(s)?.requirement==='string' && resolvedSources.get(s).requirement.split(';').map(r=>r.trim()).includes(requirement))) fail('TRACE',`${c.id}: mã yêu cầu ${requirement} không có trong trường requirement của nguồn QA liên kết`);
      for(const path of [...c.code,...c.tests.map(t=>t.file)]) {
        try {safePath(root,path);}catch(e){fail('TRACE',`${c.id}: ${e.message}`);}
        if(!covers(change.scope,path)) fail('SCOPE',`${c.id}: ${path} nằm ngoài scope`);
        if(!covers(change.fingerprintPaths,path)) fail('SCOPE',`${c.id}: ${path} chưa nằm trong tập băm bằng chứng`);
      }
      for(const t of c.tests) {
        try {demand(namedTests(readFileSync(safePath(root,t.file),'utf8'),t.file).filter(n=>n===t.name).length===1,`Không tìm thấy duy nhất test đang bật ${t.name} trong ${t.file}`);}
        catch(e){fail('TEST',`${c.id}: ${e.message}`);}
      }
    }
    if(gitHead(root)) {
      git(root,['merge-base','--is-ancestor',change.baseCommit,'HEAD']);
      const changed=[...new Set([...git(root,['diff','--name-only',change.baseCommit,'--']).split('\n'),...git(root,['ls-files','--others','--exclude-standard']).split('\n')].filter(Boolean))];
      diagnostics.push(...scopeDiagnostics(bundle,changed));
    } else if(change.profile==='project') fail('NO_GIT','Chế độ toàn dự án bắt buộc có Git HEAD và commit nền');
    else warn('NO_GIT','Không có Git: chỉ dùng cho fixture; không chứng nhận commit nền');
    // Validate fingerprint inputs even when evidence has not yet been recorded.
    const current=await snapshot(root,bundle);
    if(phase==='verify' && result().exitCode===0) {
      const artifact=`test-results/sdd/${id}/evidence.json`;
      if(!existsSync(resolve(root,artifact))) {fail('EVIDENCE',`${artifact}: chưa có bằng chứng; chạy sdd:run`);return result();}
      try {
        const evidence=json(root,artifact);
        demand(evidence.version===1 && evidence.change===id && nonempty(evidence.environment?.node) && nonempty(evidence.environment?.platform) && Array.isArray(evidence.runs),'Evidence sai cấu trúc');
        if(!same(evidence.snapshot,current)) fail('STALE_EVIDENCE','Code/config/nguồn hoặc commit đã đổi; chạy lại test liên quan');
        for(const suite of bundle.inventory?.requiredSteps??[...new Set(criteria.flatMap(c=>c.tests.map(t=>t.suite)))]) {
          const runs=evidence.runs.filter(r=>r.suite===suite);
          demand(runs.length===1,`${suite}: cần đúng một kết quả chạy`);
          const run=runs[0];
          demand(run.exitCode===0 && Array.isArray(run.command) && run.command.length>0 && run.command.every(nonempty) && Number.isFinite(Date.parse(run.startedAt)) && Number.isFinite(Date.parse(run.finishedAt)) && Date.parse(run.finishedAt)>=Date.parse(run.startedAt),`${suite}: lỗi/thiếu thông tin lần chạy`);
          demand(nonempty(run.report) && run.report.startsWith(`test-results/sdd/${id}/`),`${suite}: report ngoài thư mục bằng chứng`);
          const raw=readFileSync(safePath(root,run.report),'utf8');
          demand(sha256(raw)===run.sha256,`${suite}: report đã đổi hoặc thiếu hash`);
          if(!['mobile','api','web','tooling'].includes(suite)) continue;
          const rows=parseReport(suite,JSON.parse(raw),evidence.environment.root??root);
          if(bundle.inventory) demand(rows.every(r=>r.status==='passed'),`${suite}: bộ toàn dự án có test skip/todo/fail`);
          if(bundle.inventory) for(const file of bundle.inventory.tests[suite]) demand(rows.some(r=>r.file===file && r.status==='passed'),`${suite}: chưa chạy file ${file}`);
          for(const c of criteria) for(const test of c.tests.filter(t=>t.suite===suite)) {
            const matches=rows.filter(r=>r.name===test.name && r.file===test.file);
            if(matches.length!==1 || matches[0].status!=='passed') fail('RESULT',`${c.id}: ${test.file} :: ${test.name} thiếu/trùng/fail/skip`);
          }
        }
      }catch(e){fail('EVIDENCE',e.message);}
    }
    return result();
  }catch(e){fail('INPUT',e.message);return {...result(),exitCode:2};}
}

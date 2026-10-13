import { mkdir, writeFile, readFile, rm, open } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { checkChange, snapshot, sha256, safePath } from './core.mjs';
import { argumentsFor, printResult } from './check.mjs';
import {repoFiles, testInventory} from './project.mjs';

export function recipesFor(root,id) {
  if(id==='SDD-PROJECT') return projectRecipes(root,id);
  if(id!=='SDD-01-MAP-02') throw Error(`Gói ${id} chưa có recipe được review; không thực thi lệnh từ JSON`);
  const dest=resolve(root,`test-results/sdd/${id}`);
  return [
    {suite:'mobile',cwd:root,command:['npm','exec','-w','apps/mobile','--','jest','--runInBand','--json','--outputFile',dest+'/mobile.json','--runTestsByPath','src/features/search/components/results-map-model.test.ts','src/features/search/components/SearchResultsMap.test.tsx','src/features/search/state/partner-search.test.ts'],report:dest+'/mobile.json'},
    {suite:'api',cwd:resolve(root,'services/api'),command:[process.execPath,'--import','tsx','--test','--test-name-pattern=map pins|management, distance results|equal-distance','--test-reporter='+resolve(root,'scripts/sdd/node-reporter.mjs'),'--test-reporter-destination='+dest+'/api.json','test/integration/partners.test.ts'],report:dest+'/api.json'},
    {suite:'build',cwd:root,command:['npm','run','build','-w','services/api']},
    {suite:'web',cwd:root,command:['npm','exec','--','playwright','test','--config','tests/e2e/web/playwright.config.mjs','search-map.spec.mjs','--reporter=json'],report:dest+'/web.json',env:{PLAYWRIGHT_JSON_OUTPUT_FILE:dest+'/web.json'}},
  ];
}
function projectRecipes(root,id) {
  const dest=resolve(root,`test-results/sdd/${id}`),files=testInventory(repoFiles(root));
  const npm=(suite,...args)=>({suite,cwd:root,command:['npm',...args]});
  const node=(suite,...args)=>({suite,cwd:root,command:[process.execPath,...args]});
  return [
    npm('lint','run','lint'),npm('typecheck','run','typecheck'),
    {...node('tooling','--test','--test-reporter='+resolve(root,'scripts/sdd/node-reporter.mjs'),'--test-reporter-destination='+dest+'/tooling.json',...files.tooling),report:dest+'/tooling.json'},
    {...npm('mobile','exec','-w','apps/mobile','--','jest','--runInBand','--coverage','--json','--outputFile',dest+'/mobile.json'),report:dest+'/mobile.json'},
    {...node('mobile-coverage','../../scripts/test/coverage-gate.mjs','src','../../coverage/mobile/coverage-final.json'),cwd:resolve(root,'apps/mobile')},
    {suite:'api',cwd:resolve(root,'services/api'),command:['npm','exec','--','c8','--all','--src','src','--include','src/**/*.ts','--reporter=text','--reporter=json','--reporter=json-summary','--reporter=lcov','--reporter=html','--reports-dir','../../coverage/api',process.execPath,'--import','tsx','--test','--test-concurrency=1','--test-reporter='+resolve(root,'scripts/sdd/node-reporter.mjs'),'--test-reporter-destination='+dest+'/api.json','--test-reporter=junit','--test-reporter-destination='+resolve(root,'test-results/api/junit.xml'),...files.api.map(p=>p.replace('services/api/',''))],report:dest+'/api.json'},
    {...node('api-coverage','../../scripts/test/coverage-gate.mjs','src','../../coverage/api/coverage-final.json'),cwd:resolve(root,'services/api')},
    npm('build','run','build'),
    {...npm('web','exec','--','playwright','test','--config','tests/e2e/web/playwright.config.mjs'),report:dest+'/web.json',copyReport:resolve(root,'test-results/web/results.json')},
    node('load','tests/performance/catalog.mjs'),
    npm('prototype','--prefix','ui-ux/prototype','run','build'),
    npm('storybook','--prefix','ui-ux/prototype','run','build-storybook'),
  ];
}
export async function recordEvidence(root,bundle,before,runs) {
  if(JSON.stringify(before)!==JSON.stringify(await snapshot(root,bundle))) throw Error('Nguồn/code đã đổi trong lúc test; cần chạy lại');
  const saved=[];
  for(const run of runs) saved.push({...run,sha256:sha256(await readFile(safePath(root,run.report)))});
  const evidence={version:1,change:bundle.change.id,snapshot:before,environment:{node:process.version,platform:process.platform,root},runs:saved};
  await writeFile(resolve(root,`test-results/sdd/${bundle.change.id}/evidence.json`),JSON.stringify(evidence,null,2)+'\n');
}
function execute(recipe) {
  return new Promise(resolveResult=>{
    execFile(recipe.command[0],recipe.command.slice(1),{cwd:recipe.cwd,env:{...process.env,CI:'1',NODE_ENV:'test',EXPO_NO_TELEMETRY:'1',...recipe.env},timeout:300000,maxBuffer:16*1024*1024},(error,stdout,stderr)=>resolveResult({exitCode:error ? (Number.isInteger(error.code)?error.code:2):0,stdout,stderr}));
  });
}
export async function runChange(root,id) {
  const recipes=recipesFor(root,id),prepared=await checkChange(root,id,'prepare');
  printResult(prepared,'prepare');if(prepared.exitCode) return prepared.exitCode;
  const directory=resolve(root,`test-results/sdd/${id}`);
  await mkdir(directory,{recursive:true});
  await mkdir(resolve(root,'test-results/api'),{recursive:true});
  // Exclusive lock prevents two runs mixing reports. A crashed run leaves a visible lock.
  const lock=await open(directory+'/run.lock','wx');
  try {
    await rm(directory+'/evidence.json',{force:true});
    const before=await snapshot(root,prepared.bundle),runs=[];
    for(const recipe of recipes) {
      if(recipe.report) await rm(recipe.report,{force:true});
      const startedAt=new Date().toISOString();console.log(`SDD chạy ${recipe.suite}...`);
      const result=await execute(recipe),finishedAt=new Date().toISOString();
      await writeFile(directory+`/${recipe.suite}.log`,result.stdout+'\n'+result.stderr);
      if(result.exitCode!==0) {console.error(`${recipe.suite}: thất bại (${result.exitCode}); xem ${directory}/${recipe.suite}.log`);return 1;}
      if(recipe.copyReport) await writeFile(recipe.report,await readFile(recipe.copyReport));
      runs.push({suite:recipe.suite,command:recipe.command,startedAt,finishedAt,exitCode:result.exitCode,report:`test-results/sdd/${id}/${recipe.suite}.${recipe.report?'json':'log'}`});
    }
    await recordEvidence(root,prepared.bundle,before,runs);
    const verified=await checkChange(root,id,'verify');printResult(verified,'verify');return verified.exitCode;
  } finally {await lock.close();await rm(directory+'/run.lock',{force:true});}
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
  try {const {id}=argumentsFor(process.argv.slice(2),true);process.exitCode=await runChange(fileURLToPath(new URL('../../',import.meta.url)),id);}
  catch(e){console.error(e.message);process.exitCode=2;}
}

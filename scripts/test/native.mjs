import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
const platform = process.argv[2];
const run = (cmd,args) => spawnSync(cmd,args,{encoding:'utf8'});
const missing=[];
if (!['android','ios'].includes(platform)) missing.push('platform must be android or ios');
if (run('maestro',['--version']).status !== 0) missing.push('Maestro CLI');
if (!process.env.APP_ID || !/^[a-zA-Z][\w.]+$/.test(process.env.APP_ID)) missing.push('APP_ID');
if (!process.env.APP_BINARY || !existsSync(process.env.APP_BINARY)) missing.push('APP_BINARY dev build');
if (platform==='android' && !/\tdevice\b/.test(run('adb',['devices']).stdout ?? '')) missing.push('Android SDK/device');
if (platform==='ios' && !/Booted/.test(run('xcrun',['simctl','list','devices','booted']).stdout ?? '')) missing.push('iOS simulator');
mkdirSync('test-results/native',{recursive:true});
if (missing.length) {
  const result={status:'BLOCKED',platform,missing}; writeFileSync('test-results/native/preflight.json',JSON.stringify(result,null,2)); console.log(result); process.exitCode=2;
} else {
  const installed = platform==='android' ? run('adb',['install','-r',process.env.APP_BINARY]) : run('xcrun',['simctl','install','booted',process.env.APP_BINARY]);
  if (installed.status!==0) { console.error('Native app installation failed'); process.exitCode=1; }
  else {
    const result=run('maestro',['test','-e',`APP_ID=${process.env.APP_ID}`,'--format','junit','--output','test-results/native/junit.xml','tests/e2e/native/catalog.yaml']);
    process.stdout.write(result.stdout ?? ''); process.stderr.write(result.stderr ?? ''); process.exitCode=result.status ?? 1;
  }
}

import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../../',import.meta.url));
const patchDirectory=resolve(root,'patches/react-native-screens-4.26.0');
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');

// Backport upstream #4413 to Expo's pinned 4.26.0. No network at install time.
export async function applyScreensPatch(projectRoot=root) {
 let packagePath;
 try {packagePath=createRequire(resolve(projectRoot,'apps/mobile/package.json')).resolve('react-native-screens/package.json');}
 catch(error){if(error.code==='MODULE_NOT_FOUND')return 'not-installed';throw error;}
 const pkg=JSON.parse(await readFile(packagePath,'utf8'));
 const manifest=JSON.parse(await readFile(resolve(patchDirectory,'manifest.json'),'utf8'));
 if(pkg.version!==manifest.version)throw Error(`Review NATIVE-05 patch before changing react-native-screens ${pkg.version}`);
 const pending=[];
 // Validate every original/replacement before modifying any installed file.
 for(const entry of manifest.files){
  const target=resolve(dirname(packagePath),entry.path);
  const [current,replacement]=await Promise.all([readFile(target),readFile(resolve(patchDirectory,entry.replacement))]);
  if(digest(replacement)!==entry.after)throw Error(`NATIVE-05 replacement changed: ${entry.replacement}`);
  const hash=digest(current);
  if(hash!==entry.before&&hash!==entry.after)throw Error(`NATIVE-05 unrecognized dependency source: ${entry.path}`);
  if(hash!==entry.after)pending.push({target,replacement});
 }
 for(const {target,replacement} of pending)await writeFile(target,replacement);
 return pending.length?'applied':'already-applied';
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 applyScreensPatch().then(status=>console.log(`NATIVE-05 screens patch: ${status}`)).catch(error=>{console.error(error.message);process.exitCode=1;});
}

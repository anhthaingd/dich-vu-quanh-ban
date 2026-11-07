import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {applyScreensPatch} from '../install/screens-patch.mjs';

test('screens backport is repeatable, rejects changed dependencies and permits API-only installs',async()=>{
 const root=await mkdtemp(join(tmpdir(),'dvqb-screens-patch-'));
 const patch=new URL('../../patches/react-native-screens-4.26.0/',import.meta.url);
 const manifest=JSON.parse(await readFile(new URL('manifest.json',patch),'utf8'));
 const packageRoot=join(root,'node_modules/react-native-screens');
 try{
  assert.equal(await applyScreensPatch(root),'not-installed');
  await mkdir(packageRoot,{recursive:true});
  const packageFile=join(packageRoot,'package.json');
  await writeFile(packageFile,JSON.stringify({name:'react-native-screens',version:manifest.version}));
  for(const f of manifest.files){const p=join(packageRoot,f.path);await mkdir(dirname(p),{recursive:true});await writeFile(p,await readFile(new URL(f.replacement,patch)));}
  assert.equal(await applyScreensPatch(root),'already-applied');
  assert.equal(await applyScreensPatch(root),'already-applied');
  const target=join(packageRoot,manifest.files.at(-1).path);
  await writeFile(target,'unreviewed source');
  await assert.rejects(applyScreensPatch(root),/unrecognized dependency source/);
  assert.equal(await readFile(target,'utf8'),'unreviewed source');
  await writeFile(packageFile,JSON.stringify({name:'react-native-screens',version:'4.28.0'}));
  await assert.rejects(applyScreensPatch(root),/Review NATIVE-05 patch/);
 }finally{await rm(root,{recursive:true,force:true});}
});

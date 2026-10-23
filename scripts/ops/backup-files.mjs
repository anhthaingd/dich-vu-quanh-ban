import {lstat,readdir,readFile,mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
const digest=data=>createHash('sha256').update(data).digest('hex');
// A bundle contains only regular files under explicit assets/keys directories.
export async function fileManifest(root){
 const result=[];
 for(const group of ['assets','keys']){
  const dir=join(root,group);if(!(await lstat(dir)).isDirectory()||(await lstat(dir)).isSymbolicLink())throw Error('Unsafe bundle directory');
  for(const name of (await readdir(dir)).sort()){
   if(!/^[a-zA-Z0-9_.-]+$/.test(name)||name==='.'||name==='..')throw Error('Unsafe bundle filename');
   const file=join(dir,name),stat=await lstat(file);if(!stat.isFile()||stat.isSymbolicLink())throw Error('Bundle must contain regular files only');
   if((stat.mode&0o077)!==0)throw Error('Private bundle file permissions must be 0600');
   const bytes=await readFile(file);result.push({path:group+'/'+name,bytes:bytes.length,sha256:digest(bytes)});
  }
 }
 return result;
}
export async function restoreFiles(source,target,manifest){
 const actual=await fileManifest(source);if(JSON.stringify(actual)!==JSON.stringify(manifest))throw Error('Backup file integrity mismatch');
 await mkdir(target,{mode:0o700});
 for(const group of ['assets','keys'])await mkdir(join(target,group),{mode:0o700});
 for(const item of actual)await writeFile(join(target,item.path),await readFile(join(source,item.path)),{mode:0o600,flag:'wx'});
 if(JSON.stringify(await fileManifest(target))!==JSON.stringify(manifest))throw Error('Restored file integrity mismatch');
}

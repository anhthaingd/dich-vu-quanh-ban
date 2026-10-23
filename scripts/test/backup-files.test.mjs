import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm,symlink,chmod} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileManifest,restoreFiles} from '../ops/backup-files.mjs';
test('private bundle preserves assets and keys and rejects tampering, symlinks and loose modes',async()=>{
 const root=await mkdtemp(join(tmpdir(),'dvqb-backup-test-'));
 try{const source=join(root,'source');await mkdir(source);for(const group of ['assets','keys'])await mkdir(join(source,group));
 await writeFile(join(source,'assets/demo.png'),'DEMO encrypted bytes',{mode:0o600});await writeFile(join(source,'keys/admin.key'),'DEMO key',{mode:0o600});const manifest=await fileManifest(source);
 await restoreFiles(source,join(root,'restored'),manifest);assert.deepEqual(await fileManifest(join(root,'restored')),manifest);
 await writeFile(join(source,'assets/demo.png'),'tampered');await assert.rejects(restoreFiles(source,join(root,'bad'),manifest),/integrity/);
 await symlink(join(source,'keys/admin.key'),join(source,'assets/link'));await assert.rejects(fileManifest(source),/regular/);await rm(join(source,'assets/link'));
 await chmod(join(source,'keys/admin.key'),0o644);await assert.rejects(fileManifest(source),/permissions/);
 }finally{await rm(root,{recursive:true,force:true});}
});

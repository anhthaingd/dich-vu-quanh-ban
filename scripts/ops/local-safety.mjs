export function localTestDatabase(value){
 const u=new URL(value);
 if(!['postgres:','postgresql:'].includes(u.protocol)||!['localhost','127.0.0.1','[::1]'].includes(u.hostname)||u.pathname!=='/dvqb_test'||u.search||u.hash)throw new Error('Restore drill requires loopback dvqb_test only');
 return u;
}
export function drillSchema(value){if(!/^drill_[a-f0-9]{32}_(source|restored)$/.test(value))throw new Error('Not a disposable drill schema');return value;}
export function remapDump(sql,source,target){drillSchema(source);drillSchema(target);if(source===target)throw new Error('Restore must use a different schema');if(!sql.includes(`CREATE SCHEMA ${source};`))throw new Error('Expected isolated schema dump');return sql.replaceAll(source,target);}

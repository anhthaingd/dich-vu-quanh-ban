import ts from 'typescript';
import {readFile,writeFile,access} from 'node:fs/promises';
import {screens,roles,flows,commonNotes} from './screen-catalog.mjs';
const keys=new Set(screens.map(s=>s.key));if(keys.size!==screens.length)throw Error('Duplicate screen keys');for(const s of screens){await access(s.source);for(const b of s.buttons)if(b[2]&&!keys.has(b[2]))throw Error('Missing screen link: '+s.key+' -> '+b[2]);}
const base='docs/ke-hoach-trien-khai/bao-cao';
// Preserve the dated seed snapshot; rebuilding this document does not query/reset a DB.
const previous=JSON.parse(await readFile(base+'/B00-14-man-hinh-data.json','utf8'));
const evidence=JSON.parse(await readFile(base+'/bang-chung/B00-14-native.json','utf8'));
const lookup=new Map(evidence.entries.map(e=>[e.platform+':'+e.key,e]));
if(lookup.size!==screens.length*2)throw Error('Evidence ledger must cover each item on both platforms');
const data={date:evidence.date,database:evidence.database,roles,flows,commonNotes,
 verification:{...previous.verification,meaning:'Historical seed/API snapshot at checkedAt; not a new database count or full native UX approval.'},
 nativeEvidence:{date:evidence.date,source:'bang-chung/B00-14-native.json',report:'B00-14-bao-cao-man-hinh.md',meaning:evidence.meaning,issues:evidence.issues},
 screens:screens.map((s,index)=>{const captures=Object.fromEntries(['android','ios'].map(p=>{const entry=lookup.get(p+':'+s.key);if(!entry)throw Error('Missing evidence: '+p+':'+s.key);return[p,entry];}));return {...s,index,
 branch:/declined|withdrawn|stopped|rescheduled|assigned|admin_completed/.test(s.key),
 evidence:captures,images:Object.fromEntries(Object.entries(captures).map(([p,e])=>[p,e.image||null])),webCaptures:(evidence.web??[]).filter(e=>e.key===s.key)};})};
for(const s of data.screens)for(const path of Object.values(s.images))if(path)await access(base+'/'+path);
const navigation=ts.createSourceFile('routes.ts',await readFile('apps/mobile/src/app/navigation/routes.ts','utf8'),ts.ScriptTarget.Latest,true);
const declaration=navigation.statements.find(n=>ts.isTypeAliasDeclaration(n)&&n.name.text==='RootStackParamList');if(!declaration||!ts.isTypeLiteralNode(declaration.type))throw Error('Navigation registry not found');
data.registeredRoutes=Object.fromEntries(declaration.type.members.map(n=>{const name=n.name.getText(navigation).replaceAll("'",'');const items=data.screens.filter(s=>s.route.split(/[^A-Za-z]+/).includes(name)).map(s=>s.key);if(!items.length)throw Error('Unreported native route: '+name);return[name,items];}));
const template=await readFile('scripts/review/report-template.html','utf8');
await writeFile(base+'/B00-14-man-hinh-data.json',JSON.stringify(data,null,2));
await writeFile(base+'/B00-14-bao-cao-man-hinh.html',template.replace('/*REPORT_DATA*/',JSON.stringify(data).replaceAll('<','\\u003c')));
const current=(s,p)=>['captured','captured-with-issue'].includes(s.evidence[p].status)&&!!s.images[p];
console.log(JSON.stringify({screens:data.screens.length,currentBoth:data.screens.filter(s=>current(s,'android')&&current(s,'ios')).length,coverage:evidence.coverage,web:evidence.web?.length??0}));

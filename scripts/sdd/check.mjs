import { fileURLToPath } from 'node:url';
import { checkChange } from './core.mjs';

export function argumentsFor(args,run=false) {
  const values={};
  for(let i=0;i<args.length;i+=2) {
    if(!['--change',...(run?[]:['--phase'])].includes(args[i]) || !args[i+1] || values[args[i]]) throw Error('Cú pháp: --change ID'+(run?'':' --phase prepare|verify'));
    values[args[i]]=args[i+1];
  }
  if(!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(values['--change']??'') || (!run && !['prepare','verify'].includes(values['--phase']))) throw Error('Thiếu/sai --change hoặc --phase');
  return {id:values['--change'],phase:values['--phase']};
}
export function printResult(result,phase) {
  for(const d of result.diagnostics) console.log(`${d.level==='error'?'LỖI':'LƯU Ý'} [${d.code}] ${d.message}`);
  console.log(`SDD ${phase}: ${result.exitCode===0?'ĐẠT':'CHƯA ĐẠT'}${phase==='prepare'?' — kiểm nguồn và liên kết, chưa chứng minh hành vi':''}`);
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
  try {
    const {id,phase}=argumentsFor(process.argv.slice(2));
    const root=fileURLToPath(new URL('../../',import.meta.url));
    const result=await checkChange(root,id,phase);printResult(result,phase);process.exitCode=result.exitCode;
  }catch(e){console.error(e.message);process.exitCode=2;}
}

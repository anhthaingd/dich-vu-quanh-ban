// Preserve runner events, not console text that happens to contain "pass".
export default async function* nodeReporter(events) {
  const results=[];
  for await(const event of events) if(['test:pass','test:fail'].includes(event.type)) {
    const {name,file,skip,todo,details,nesting}=event.data;
    results.push({type:event.type,data:{name,file,skip,todo,nesting,details:{type:details?.type}}});
  }
  yield JSON.stringify(results,null,2);
}

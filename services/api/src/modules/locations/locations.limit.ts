// Pilot single-process limits. Restart resets counters; not a production billing cap.
export class LocationLimit {
  private actors=new Map<string,{count:number;reset:number}>();
  private second={count:0,reset:0};private day={count:0,reset:0};
  constructor(private readonly clock=Date.now,private readonly daily=1000) {}
  take(actor:string):number {
    const now=this.clock();
    for(const [k,v] of this.actors)if(v.reset<=now)this.actors.delete(k);
    if(this.second.reset<=now)this.second={count:0,reset:now+1000};
    if(this.day.reset<=now)this.day={count:0,reset:now+86400000};
    const own=this.actors.get(actor)??{count:0,reset:now+60000};
    const waits=[this.second.count>=4?this.second.reset:0,this.day.count>=this.daily?this.day.reset:0,own.count>=30?own.reset:0];
    if(!this.actors.has(actor)&&this.actors.size>=10000)return 60;
    const reset=Math.max(...waits);if(reset>now)return Math.max(1,Math.ceil((reset-now)/1000));
    own.count++;this.second.count++;this.day.count++;this.actors.set(actor,own);return 0;
  }
}

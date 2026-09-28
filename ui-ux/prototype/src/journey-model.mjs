export const START_POINTS = 80000;
export const totals = invoice => {
  const total = invoice.labor + invoice.materials;
  const cash = total - invoice.used;
  return {total, cash, fee: Math.floor(invoice.labor / 10), reward: total ? Math.floor(invoice.labor * cash / (50 * total)) : 0};
};
export const complete = j => Boolean(j.invoice?.paid && j.invoice?.received);
export function transition(job, event, value) {
  const i = job.invoice;
  if (event === 'accept' && job.status === 'pending') return {...job, status:'accepted'};
  if (event === 'decline' && job.status === 'pending') return {...job, status:'declined'};
  if (event === 'invoice' && job.status === 'accepted' && (!i || (!i.locked && i.revision)))
    return {...job, invoice:{labor:200000,materials:100000,used:0,version:(i?.version||0)+1,locked:false,paid:false,received:false,revision:false}};
  if (event === 'points' && i && !i.locked && !i.revision && Number.isSafeInteger(value) && value >= 0 && value <= totals(i).total) return {...job,invoice:{...i,used:value}};
  if (event === 'revise' && i && !i.locked && !i.revision && value?.trim()) return {...job,invoice:{...i,revision:true,reason:value,used:0}};
  if (event === 'lock' && i && !i.locked && !i.revision) return {...job,invoice:{...i,locked:true}};
  if (event === 'paid' && i?.locked && !i.paid) return {...job,invoice:{...i,paid:true}};
  if (event === 'received' && i?.locked && !i.received) return {...job,invoice:{...i,received:true}};
  if (event === 'review' && complete(job) && !job.review && value?.stars >= 1 && value?.stars <= 5) return {...job,review:value};
  return job;
}

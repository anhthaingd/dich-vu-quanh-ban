import { NotFoundException } from '@nestjs/common';
import type { PoolClient } from 'pg';
import type { Resource } from '../../common/events/event.store.js';
import { conversationAccess } from '../chat/chat.store.js';
import {verificationRecipients} from '../notifications/notifications.store.js';
import { jobAccess } from '../jobs/jobs.access.js';
export async function resourceAccess(db:PoolClient,user:string,resource:Resource){
  if(resource.type==='notification'){
    if(!(await db.query('SELECT 1 FROM notifications WHERE id=$1 AND user_id=$2',[resource.id,user])).rowCount)throw new NotFoundException();
  }else if(resource.type==='report'){
    if(!(await db.query('SELECT 1 FROM reports WHERE id=$1 AND reporter_id=$2',[resource.id,user])).rowCount)throw new NotFoundException();
  }else if(resource.type==='verification'){
    if(!(await verificationRecipients(db,resource.id)).some(r=>r.user_id===user))throw new NotFoundException();
  }else if(resource.type==='review'){
    const r=(await db.query('SELECT job_id FROM reviews WHERE id=$1',[resource.id])).rows[0];if(!r)throw new NotFoundException();await jobAccess(db,r.job_id,user);
  }else if(resource.type==='conversation')await conversationAccess(db,resource.id,user);
  else {
    const id=resource.type==='invoice'?(await db.query('SELECT job_id FROM invoices WHERE id=$1',[resource.id])).rows[0]?.job_id:resource.id;
    if(!id)throw new NotFoundException();await jobAccess(db,id,user);
  }
}

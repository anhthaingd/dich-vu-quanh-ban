import type { PoolClient } from 'pg';

export type Resource = { job_id?: string; conversation_id?: string; invoice_id?: string; schedule_version?: number; lead_seconds?: number };
export async function jobRecipients(db: PoolClient, id: string) {
  return (await db.query<{user_id:string}>(`SELECT customer_id AS user_id FROM jobs WHERE id=$1 UNION
    SELECT m.user_id FROM jobs j JOIN memberships m ON m.partner_id=j.partner_id AND m.active
    WHERE j.id=$1 AND (m.is_owner OR EXISTS(SELECT 1 FROM membership_grants g WHERE g.membership_id=m.id AND g.revoked_at IS NULL AND g.permission IN ('jobs.accept','jobs.manage','jobs.assign'))
    OR EXISTS(SELECT 1 FROM assignments a WHERE a.job_id=j.id AND a.membership_id=m.id AND a.ended_at IS NULL))`, [id])).rows;
}
export async function queueNotice(db: PoolClient, key: string, kind: string, ref: Resource, recipients: {user_id:string}[]) {
  for (const {user_id} of recipients) await db.query(`INSERT INTO notification_deliveries(user_id,event_key,kind,resource_ref)
    SELECT id,$2,$3,$4 FROM users WHERE id=$1 AND status='active' ON CONFLICT(user_id,event_key) DO NOTHING`, [user_id,key,kind,JSON.stringify(ref)]);
}
// Only reviewed events produce inbox entries. No bodies, addresses, wallet balances or tokens.
export async function queueEventNotifications(db: PoolClient, key: string, type: string, payload: unknown) {
  const p = payload as Resource & {message_id?:string; assignment_id?:string};
  // Chat uses conversation_reads and its own badge, never the notification inbox.
  if (['job.accepted.v1','job.assigned.v1','job.schedule_changed.v1'].includes(type) && p.job_id) {
    const recipients = type === 'job.assigned.v1' ? (await db.query<{user_id:string}>(`SELECT customer_id AS user_id FROM jobs WHERE id=$1 UNION
      SELECT m.user_id FROM assignments a JOIN memberships m ON m.id=a.membership_id WHERE a.id=$2 AND a.ended_at IS NULL AND m.active`,[p.job_id,p.assignment_id])).rows : await jobRecipients(db,p.job_id);
    await queueNotice(db,key,type,{job_id:p.job_id},recipients);
  } else if (['invoice.sent.v1','invoice.revision_requested.v1','invoice.locked.v1','invoice.payment_reported.v1','invoice.settled.v1'].includes(type) && p.invoice_id) {
    const j=(await db.query('SELECT j.id,j.customer_id FROM invoices i JOIN jobs j ON j.id=i.job_id WHERE i.id=$1',[p.invoice_id])).rows[0];
    if (j) await queueNotice(db,key,type,{job_id:j.id,invoice_id:p.invoice_id},type==='invoice.sent.v1' ? [{user_id:j.customer_id}] : await jobRecipients(db,j.id));
  }
}
export async function syncReminders(db: PoolClient, job: string) {
  await db.query("UPDATE reminders SET state='superseded' WHERE job_id=$1 AND state='pending'",[job]);
  await db.query(`INSERT INTO reminders(job_id,schedule_version,lead_seconds,due_at)
    SELECT j.id,j.schedule_version,lead,j.scheduled_at-make_interval(secs=>lead) FROM jobs j CROSS JOIN unnest(ARRAY[86400,3600]) lead
    WHERE j.id=$1 AND j.state='accepted' AND j.stop_has_agreed_charges IS NULL AND j.scheduled_at-make_interval(secs=>lead)>clock_timestamp()
    ON CONFLICT(job_id,schedule_version,lead_seconds) DO NOTHING`,[job]);
}

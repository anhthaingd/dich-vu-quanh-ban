import type {PoolClient} from 'pg';
// Caller holds partner -> job locks. Only unsent versions may be discarded.
export async function discardUnsentDrafts(db:PoolClient,job:string){
 const i=(await db.query('SELECT * FROM invoices WHERE job_id=$1 FOR UPDATE',[job])).rows[0];
 if(!i||i.worker_receipt_confirmed_at)return;
 const sent=(await db.query('SELECT id FROM invoice_versions WHERE invoice_id=$1 AND sent_at IS NOT NULL ORDER BY version_no DESC LIMIT 1',[i.id])).rows[0];
 if(i.state==='draft')await db.query("UPDATE invoices SET current_version_id=$2,state=CASE WHEN $2::uuid IS NULL THEN 'draft' ELSE 'revision_requested' END,version=version+1 WHERE id=$1",[i.id,sent?.id??null]);
 await db.query('DELETE FROM invoice_assets WHERE version_id IN (SELECT id FROM invoice_versions WHERE invoice_id=$1 AND sent_at IS NULL)',[i.id]);
 await db.query('DELETE FROM invoice_versions WHERE invoice_id=$1 AND sent_at IS NULL',[i.id]);
 if(!sent)await db.query('DELETE FROM invoices WHERE id=$1',[i.id]);
}

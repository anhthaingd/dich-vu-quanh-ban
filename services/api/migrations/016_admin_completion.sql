-- P1-04 local/test: reviewed finance permission, no automatic grants.
ALTER TABLE admin_grants DROP CONSTRAINT admin_grants_permission_check;
ALTER TABLE admin_grants ADD CONSTRAINT admin_grants_permission_check
 CHECK(permission IN ('support.read','support.manage','moderation.manage','audit.read','finance.review'));
CREATE TABLE admin_completion_evidence (
 settlement_id uuid NOT NULL REFERENCES settlements(id),
 asset_id uuid NOT NULL REFERENCES assets(id),
 PRIMARY KEY(settlement_id,asset_id)
);
CREATE TRIGGER immutable_completion_evidence BEFORE UPDATE OR DELETE ON admin_completion_evidence
 FOR EACH ROW EXECUTE FUNCTION reject_history_mutation();

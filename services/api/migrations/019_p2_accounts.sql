-- P2 isolated DEMO account security. Existing verify challenges retain their purpose.
ALTER TABLE users ADD CONSTRAINT users_locale CHECK(locale IN ('vi','en','ja'));
ALTER TABLE auth_challenges ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE auth_challenges ALTER COLUMN family_id DROP NOT NULL;
ALTER TABLE auth_challenges ADD COLUMN purpose text NOT NULL DEFAULT 'verify'
 CHECK(purpose IN ('verify','login','reset','identity','recovery'));
ALTER TABLE auth_challenges ADD COLUMN recovery_id uuid;
ALTER TABLE auth_challenges ADD COLUMN user_version integer;
ALTER TABLE auth_rate_events ALTER COLUMN actor_id DROP NOT NULL;
CREATE TABLE account_recoveries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES users(id),
 receipt_hash text NOT NULL UNIQUE, request_hash text NOT NULL, contact_cipher text NOT NULL, contact_hash text NOT NULL,
 evidence_cipher text NOT NULL, state text NOT NULL DEFAULT 'pending'
 CHECK(state IN ('pending','awaiting_evidence','approved','rejected','completed')),
 version integer NOT NULL DEFAULT 1, reviewer_id uuid REFERENCES users(id), reason text,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE auth_challenges ADD FOREIGN KEY(recovery_id) REFERENCES account_recoveries(id);
CREATE TABLE account_deletions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id),
 forfeit_points boolean NOT NULL, request_cipher text NOT NULL, state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','approved','rejected')),
 version integer NOT NULL DEFAULT 1, reviewer_id uuid REFERENCES users(id), reason text,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE UNIQUE INDEX account_deletion_pending ON account_deletions(user_id) WHERE state='pending';
CREATE INDEX account_recovery_queue ON account_recoveries(created_at,id);

CREATE TABLE account_recovery_supplements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), recovery_id uuid NOT NULL REFERENCES account_recoveries(id),
 evidence_cipher text NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX account_recovery_supplement_history ON account_recovery_supplements(recovery_id,created_at,id);
CREATE TRIGGER account_recovery_supplement_immutable BEFORE UPDATE OR DELETE ON account_recovery_supplements FOR EACH ROW EXECUTE FUNCTION reject_history_mutation();

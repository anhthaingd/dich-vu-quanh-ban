-- P1-03: independent admin grants and MFA; no public registration grants admin.
CREATE TABLE admin_grants (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id),
 permission text NOT NULL CHECK(permission IN ('support.read','support.manage','moderation.manage','audit.read')),
 revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX admin_grant_active ON admin_grants(user_id,permission) WHERE revoked_at IS NULL;
CREATE TABLE admin_factors (
 user_id uuid PRIMARY KEY REFERENCES users(id), secret_cipher text NOT NULL,
 enrollment_family uuid NOT NULL, pending_until timestamptz NOT NULL,
 enabled_at timestamptz, last_counter bigint NOT NULL DEFAULT -1
);
CREATE TABLE admin_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id),
 family_id uuid NOT NULL, token_hash text NOT NULL UNIQUE, verified_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL, revoked_at timestamptz
);
CREATE TABLE admin_auth_attempts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admin_auth_attempt_time ON admin_auth_attempts(user_id,created_at);
CREATE TABLE verification_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), partner_id uuid NOT NULL REFERENCES partners(id),
 submitted_by uuid NOT NULL REFERENCES users(id), kind text NOT NULL CHECK(kind IN ('identity','business','professional')),
 private_cipher text NOT NULL, state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','awaiting_evidence','approved','rejected')),
 reviewer_id uuid REFERENCES users(id), reason text, version integer NOT NULL DEFAULT 1 CHECK(version>0),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX verification_pending ON verification_requests(partner_id,kind) WHERE state='pending';
CREATE INDEX verification_history ON verification_requests(partner_id,created_at DESC,id DESC);
CREATE TABLE verification_assets (
 request_id uuid NOT NULL REFERENCES verification_requests(id), asset_id uuid NOT NULL REFERENCES assets(id),
 PRIMARY KEY(request_id,asset_id)
);
CREATE TABLE moderation_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), domain text NOT NULL CHECK(domain IN ('reports','verifications','reviews')),
 resource_id uuid NOT NULL, actor_id uuid NOT NULL REFERENCES users(id), action text NOT NULL,
 reason text NOT NULL CHECK(length(btrim(reason))>0), version integer NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX moderation_history_resource ON moderation_history(domain,resource_id,created_at,id);
CREATE TRIGGER moderation_history_immutable BEFORE UPDATE OR DELETE ON moderation_history FOR EACH ROW EXECUTE FUNCTION reject_history_mutation();

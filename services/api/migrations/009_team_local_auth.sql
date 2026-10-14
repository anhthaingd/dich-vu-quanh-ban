-- P1-01 approved 2026-10-13: isolated local/test delivery, team lifecycle.
CREATE TABLE auth_challenges (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id),
 provider text NOT NULL CHECK(provider IN ('email','phone')), contact_hash text NOT NULL,
 contact_cipher text NOT NULL, code_hash text NOT NULL, family_id uuid NOT NULL,
 expires_at timestamptz NOT NULL, attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 5),
 consumed_at timestamptz, invalidated_at timestamptz, created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX auth_challenge_contact ON auth_challenges(contact_hash,created_at);
CREATE TABLE auth_rate_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id uuid NOT NULL REFERENCES users(id),
 contact_hash text NOT NULL, ip_hash text NOT NULL, purpose text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX auth_rate_time ON auth_rate_events(created_at);
CREATE TABLE reauth_grants (
 grant_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id), family_id uuid NOT NULL,
 scope text NOT NULL CHECK(scope='membership.grants'), expires_at timestamptz NOT NULL,
 consumed_at timestamptz, created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE member_invitations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), partner_id uuid NOT NULL REFERENCES partners(id),
 invited_by uuid NOT NULL REFERENCES users(id), provider text NOT NULL CHECK(provider IN ('email','phone')),
 contact_hash text NOT NULL, contact_cipher text NOT NULL, contact_masked text NOT NULL,
 token_hash text NOT NULL UNIQUE, permissions text[] NOT NULL DEFAULT '{}',
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','expired','revoked','replaced')),
 expires_at timestamptz NOT NULL, version integer NOT NULL DEFAULT 1,
 replacement_id uuid REFERENCES member_invitations(id), accepted_by uuid REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE UNIQUE INDEX invitation_pending_contact ON member_invitations(partner_id,contact_hash) WHERE status='pending';
CREATE TABLE local_deliveries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), challenge_id uuid REFERENCES auth_challenges(id),
 invitation_id uuid REFERENCES member_invitations(id), payload_cipher text,
 state text NOT NULL DEFAULT 'queued' CHECK(state IN ('queued','submitted','failed','unknown')),
 attempts integer NOT NULL DEFAULT 0, lease_until timestamptz, expires_at timestamptz NOT NULL,
 next_attempt_at timestamptz NOT NULL DEFAULT clock_timestamp(), created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK(num_nonnulls(challenge_id,invitation_id)=1), UNIQUE(challenge_id), UNIQUE(invitation_id)
);
CREATE TABLE partner_contacts (
 partner_id uuid PRIMARY KEY REFERENCES partners(id), membership_id uuid,
 FOREIGN KEY(membership_id,partner_id) REFERENCES memberships(id,partner_id)
);
CREATE TABLE audit_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id uuid NOT NULL REFERENCES users(id),
 partner_id uuid REFERENCES partners(id), action text NOT NULL, resource_id uuid NOT NULL,
 request_id uuid, reason text NOT NULL DEFAULT '', details jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TRIGGER immutable_audit BEFORE UPDATE OR DELETE ON audit_events FOR EACH ROW EXECUTE FUNCTION reject_history_mutation();

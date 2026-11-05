-- UX-02: invitations do not grant access until the verified recipient accepts.
CREATE TABLE admin_invitations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), invited_by uuid NOT NULL REFERENCES users(id),
 name text NOT NULL, contact_hash text NOT NULL, contact_cipher text NOT NULL, contact_masked text NOT NULL,
 token_hash text NOT NULL UNIQUE, permissions text[] NOT NULL CHECK(cardinality(permissions)>0), reason text NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','revoked','expired','replaced')),
 version integer NOT NULL DEFAULT 1, expires_at timestamptz NOT NULL,
 accepted_by uuid REFERENCES users(id), replacement_id uuid REFERENCES admin_invitations(id),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE UNIQUE INDEX admin_invitation_pending_contact ON admin_invitations(contact_hash) WHERE status='pending';
ALTER TABLE local_deliveries ADD COLUMN admin_invitation_id uuid UNIQUE REFERENCES admin_invitations(id);
ALTER TABLE local_deliveries DROP CONSTRAINT local_deliveries_check;
ALTER TABLE local_deliveries ADD CONSTRAINT local_deliveries_check CHECK(num_nonnulls(challenge_id,invitation_id,admin_invitation_id)=1);

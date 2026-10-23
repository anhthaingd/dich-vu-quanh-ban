-- LOCAL-01 approved 2026-10-23: profile gallery and one-use admin recovery codes.
CREATE TABLE partner_gallery (
 partner_id uuid NOT NULL REFERENCES partners(id),
 asset_id uuid NOT NULL UNIQUE REFERENCES assets(id),
 position integer NOT NULL CHECK(position BETWEEN 0 AND 11),
 PRIMARY KEY(partner_id,position)
);
CREATE TABLE admin_backup_codes (
 user_id uuid NOT NULL REFERENCES users(id),
 code_hash text NOT NULL CHECK(length(code_hash)=64),
 created_at timestamptz NOT NULL DEFAULT now(),
 consumed_at timestamptz,
 PRIMARY KEY(user_id,code_hash)
);

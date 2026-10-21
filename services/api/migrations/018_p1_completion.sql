-- P1-06: minimal resource invalidations and session-bound Expo push delivery.
ALTER TABLE realtime_deliveries DROP CONSTRAINT realtime_deliveries_resource_type_check;
ALTER TABLE realtime_deliveries ADD CHECK(resource_type IN ('notification','conversation','job','invoice','report','verification','review'));
CREATE TABLE push_devices (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES users(id),family_id uuid NOT NULL,
 token text NOT NULL UNIQUE,platform text NOT NULL CHECK(platform IN ('ios','android')),
 revoked_at timestamptz,updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE push_deliveries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),device_id uuid NOT NULL REFERENCES push_devices(id),
 user_id uuid NOT NULL,event_key text NOT NULL,kind text NOT NULL,resource_ref jsonb NOT NULL,
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','ticket','delivered','failed','skipped')),
 attempts integer NOT NULL DEFAULT 0,next_attempt_at timestamptz NOT NULL DEFAULT now(),
 lease_until timestamptz,lease_token uuid,ticket_id text,error_code text,created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(device_id,event_key)
);
CREATE INDEX push_due ON push_deliveries(next_attempt_at) WHERE state IN ('pending','ticket');
ALTER TABLE service_areas DROP CONSTRAINT service_areas_check;
ALTER TABLE service_areas ADD CHECK((center IS NOT NULL AND radius_m>0 AND boundary IS NULL) OR (radius_m IS NULL AND boundary IS NOT NULL));
CREATE TABLE search_snapshots(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),partner_ids uuid[] NOT NULL,expires_at timestamptz NOT NULL DEFAULT now()+interval '15 minutes');
CREATE INDEX search_snapshots_expiry ON search_snapshots(expires_at);

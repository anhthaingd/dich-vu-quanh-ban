-- RT-01A: independent consumer state. Old events deliberately have no recipient snapshot.
ALTER TABLE outbox_events ADD COLUMN correlation_id uuid NOT NULL DEFAULT gen_random_uuid();
CREATE TABLE realtime_deliveries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 event_id uuid NOT NULL REFERENCES outbox_events(id),
 user_id uuid NOT NULL, -- snapshot, no cross-actor FK lock during a business transaction
 resource_type text NOT NULL CHECK(resource_type IN ('notification','conversation','job','invoice')),
 resource_id uuid NOT NULL,
 attempts integer NOT NULL DEFAULT 0,
 next_attempt_at timestamptz NOT NULL DEFAULT now(),
 lease_until timestamptz,
 lease_token uuid,
 processed_at timestamptz,
 failed_at timestamptz,
 UNIQUE(event_id,user_id)
);
CREATE INDEX realtime_due ON realtime_deliveries(next_attempt_at) WHERE processed_at IS NULL AND failed_at IS NULL;

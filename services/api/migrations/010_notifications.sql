-- Inbox and reminders implement the existing notification contract. No push transport.
CREATE TABLE notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id),
  message_push boolean NOT NULL DEFAULT true,
  call_push boolean NOT NULL DEFAULT true,
  service_push boolean NOT NULL DEFAULT true,
  reminder_push boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);


CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  event_key text NOT NULL,
  kind text NOT NULL,
  resource_ref jsonb NOT NULL,
  read_at timestamptz ,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id,event_key)
);


CREATE TABLE reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id),
  schedule_version integer NOT NULL,
  lead_seconds integer NOT NULL,
  due_at timestamptz NOT NULL,
  state text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(job_id,schedule_version,lead_seconds), CHECK(lead_seconds IN (86400,3600))
);



CREATE INDEX notifications_page ON notifications(user_id,created_at,id);
CREATE INDEX reminders_due ON reminders(due_at) WHERE state='pending';
-- Independent inbox consumer: never marks the realtime outbox processed.
-- Snapshot recipients at commit; recheck permission before delivery.
CREATE TABLE notification_deliveries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 -- Snapshot ID without FK: enqueue must not lock another actor row inside a mutation.
 user_id uuid NOT NULL,
 event_key text NOT NULL,
 kind text NOT NULL,
 resource_ref jsonb NOT NULL,
 processed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,event_key)
);
CREATE INDEX notification_deliveries_due ON notification_deliveries(created_at,id) WHERE processed_at IS NULL;

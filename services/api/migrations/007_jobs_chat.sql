-- P0-2 local/test: jobs and durable HTTP chat; no payment or OTP provider.
CREATE TABLE jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES users(id),
  partner_id uuid NOT NULL REFERENCES partners(id),
  state text NOT NULL DEFAULT 'requested',
  service_mode text NOT NULL,
  location_id uuid REFERENCES partner_locations(id),
  address_snapshot jsonb NOT NULL,
  point geography(Point,4326) NOT NULL,
  time_mode text NOT NULL,
  scheduled_at timestamptz ,
  schedule_version integer NOT NULL DEFAULT 1,
  version integer NOT NULL DEFAULT 1,
  note text NOT NULL DEFAULT '',
  eta timestamptz,
  stop_has_agreed_charges boolean,
  stop_reason text,
  accepted_at timestamptz ,
  completed_at timestamptz ,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK(state IN ('requested','accepted','awaiting_settlement','completed','declined','withdrawn','stopped')), CHECK(service_mode IN ('at_shop','at_customer','custom')), CHECK(time_mode IN ('now','scheduled')), CHECK(time_mode<>'scheduled' OR scheduled_at IS NOT NULL), UNIQUE(id,partner_id)
);
CREATE INDEX jobs_customer ON jobs(customer_id,created_at DESC,id); CREATE INDEX jobs_partner ON jobs(partner_id,state,created_at DESC,id);

CREATE TABLE job_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id),
  skill_id uuid NOT NULL REFERENCES skills(id),
  name_snapshot text NOT NULL,
  schema_version integer NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(job_id,skill_id)
);


CREATE TABLE assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  partner_id uuid NOT NULL,
  membership_id uuid NOT NULL,
  assigned_by uuid NOT NULL REFERENCES users(id),
  ended_at timestamptz ,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(job_id,partner_id) REFERENCES jobs(id,partner_id), FOREIGN KEY(membership_id,partner_id) REFERENCES memberships(id,partner_id)
);
CREATE UNIQUE INDEX assignment_active ON assignments(job_id) WHERE ended_at IS NULL;

CREATE TABLE schedule_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id),
  actor_id uuid NOT NULL REFERENCES users(id),
  version integer NOT NULL,
  old_at timestamptz ,
  new_at timestamptz NOT NULL,
  reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(job_id,version)
);


CREATE TABLE conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  user_low uuid REFERENCES users(id),
  user_high uuid REFERENCES users(id),
  customer_id uuid REFERENCES users(id),
  partner_id uuid REFERENCES partners(id),
  next_sequence bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK((kind='direct' AND user_low IS NOT NULL AND user_high IS NOT NULL AND user_low<user_high AND customer_id IS NULL AND partner_id IS NULL) OR (kind='partner' AND customer_id IS NOT NULL AND partner_id IS NOT NULL AND user_low IS NULL AND user_high IS NULL)), UNIQUE(user_low,user_high), UNIQUE(customer_id,partner_id)
);


CREATE TABLE job_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id),
  conversation_id uuid NOT NULL REFERENCES conversations(id),
  assignment_id uuid REFERENCES assignments(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(job_id,conversation_id)
);


CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id),
  sequence bigint NOT NULL,
  sender_id uuid REFERENCES users(id),
  client_message_id uuid ,
  system_event_key text UNIQUE,
  body text NOT NULL,
  asset_id uuid CHECK (asset_id IS NULL),
  job_id uuid REFERENCES jobs(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(conversation_id,sequence), UNIQUE(sender_id,client_message_id)
);
CREATE INDEX message_page ON messages(conversation_id,sequence DESC);

CREATE TABLE conversation_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id),
  user_id uuid NOT NULL REFERENCES users(id),
  last_sequence bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(conversation_id,user_id), CHECK(last_sequence>=0)
);


CREATE TABLE outbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text NOT NULL UNIQUE,
  aggregate_id uuid NOT NULL,
  aggregate_version bigint NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  lease_until timestamptz ,
  processed_at timestamptz ,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX outbox_due ON outbox_events(next_attempt_at) WHERE processed_at IS NULL;


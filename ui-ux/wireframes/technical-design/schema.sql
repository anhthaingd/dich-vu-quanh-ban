-- Catalog delta v0.1.1 / IMPLEMENT-01: executed subset is services/api/migrations/001_catalog.sql. Other DDL remains design only.
-- DESIGN v0.1, Q03 approved. Reference DDL, not a production migration approval.
-- PostgreSQL + PostGIS; extension creation requires deployment role.
BEGIN;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE DOMAIN whole_amount AS numeric CHECK (VALUE >= 0 AND scale(VALUE)=0 AND VALUE::text NOT IN ('NaN','Infinity','-Infinity'));
CREATE DOMAIN signed_whole AS numeric CHECK (scale(VALUE)=0 AND VALUE::text NOT IN ('NaN','Infinity','-Infinity'));

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  locale text NOT NULL DEFAULT 'vi',
  version integer NOT NULL DEFAULT 1,
  anonymized_at timestamptz ,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status IN ('active','suspended','deletion_requested','anonymized')), CHECK(version>0)
);


CREATE TABLE identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  provider text NOT NULL,
  subject text NOT NULL,
  password_hash text ,
  verified_at timestamptz ,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider,subject)
);


CREATE TABLE auth_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_id uuid REFERENCES identities(id),
  subject_hash text NOT NULL,
  purpose text NOT NULL,
  secret_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  consumed_at timestamptz ,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK(attempts>=0)
);


CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  refresh_hash text NOT NULL UNIQUE,
  family_id uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz ,
  last_seen_at timestamptz ,
  created_at timestamptz NOT NULL DEFAULT now()
);


CREATE TABLE saved_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  label text NOT NULL CHECK (length(trim(label)) > 0),
  address_text text NOT NULL CHECK (length(trim(address_text)) > 0),
  point geography(Point,4326) NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (archived_at IS NULL OR NOT is_default)
);
CREATE UNIQUE INDEX saved_addresses_one_default ON saved_addresses(user_id) WHERE is_default AND archived_at IS NULL;
CREATE INDEX saved_addresses_owner_page ON saved_addresses(user_id,created_at,id) WHERE archived_at IS NULL;


CREATE TABLE partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  name text NOT NULL,
  bio text NOT NULL DEFAULT '',
  verification_status text NOT NULL DEFAULT 'unverified',
  publication_status text NOT NULL DEFAULT 'draft' CHECK (publication_status IN ('draft','published')),
  accepting_jobs boolean NOT NULL DEFAULT false,
  moderation_status text NOT NULL DEFAULT 'active',
  profile jsonb NOT NULL DEFAULT '{}',
  version integer NOT NULL DEFAULT 1,
  archived_at timestamptz ,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK(kind IN ('solo','shop','company')), CHECK(verification_status IN ('unverified','pending','verified','rejected')), CHECK(moderation_status IN ('active','new_work_suspended','suspended'))
);


CREATE TABLE memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES partners(id),
  user_id uuid NOT NULL REFERENCES users(id),
  is_owner boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  left_at timestamptz ,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(partner_id,user_id), UNIQUE(id,partner_id)
);
CREATE UNIQUE INDEX one_active_owner ON memberships(partner_id) WHERE is_owner AND active;

CREATE TABLE membership_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id uuid NOT NULL REFERENCES memberships(id),
  permission text NOT NULL,
  granted_by uuid NOT NULL REFERENCES users(id),
  revoked_at timestamptz ,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX active_grant ON membership_grants(membership_id,permission) WHERE revoked_at IS NULL;

CREATE TABLE member_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES partners(id),
  inviter_id uuid NOT NULL REFERENCES users(id),
  contact_hash text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  permissions jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  accepted_by uuid REFERENCES users(id),
  revoked_at timestamptz ,
  created_at timestamptz NOT NULL DEFAULT now()
);


CREATE TABLE partner_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL UNIQUE REFERENCES partners(id),
  membership_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(membership_id,partner_id) REFERENCES memberships(id,partner_id)
);


CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE CHECK (code ~ '^[a-z][a-z0-9_]*$'),
  name_vi text NOT NULL CHECK (length(trim(name_vi)) > 0),
  parent_id uuid REFERENCES categories(id) ON DELETE RESTRICT,
  active boolean NOT NULL DEFAULT true,
  translations jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(translations) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (parent_id IS DISTINCT FROM id)
);


CREATE FUNCTION check_category_tree() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(2809202601);
  IF EXISTS (
    WITH RECURSIVE ancestors AS (
      SELECT id, parent_id FROM categories WHERE id = NEW.parent_id
      UNION
      SELECT c.id, c.parent_id FROM categories c JOIN ancestors a ON c.id = a.parent_id
    ) SELECT 1 FROM ancestors WHERE id = NEW.id
  ) THEN RAISE EXCEPTION 'Category cycle' USING ERRCODE = '23514'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER categories_no_cycle BEFORE INSERT OR UPDATE OF parent_id ON categories
FOR EACH ROW EXECUTE FUNCTION check_category_tree();


CREATE TABLE skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE CHECK (code ~ '^[a-z][a-z0-9_]*$'),
  name_vi text NOT NULL CHECK (length(trim(name_vi)) > 0),
  active boolean NOT NULL DEFAULT true,
  form_schema jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(form_schema) = 'object'),
  schema_version integer NOT NULL DEFAULT 1 CHECK (schema_version > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);


CREATE TABLE partner_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES partners(id),
  skill_id uuid NOT NULL REFERENCES skills(id),
  modes text[] NOT NULL,
  reference_labor whole_amount ,
  inspection_fee whole_amount ,
  travel_fee whole_amount ,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(partner_id,skill_id)
);


CREATE TABLE partner_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES partners(id),
  address_text text NOT NULL,
  point geography(Point,4326) NOT NULL,
  public boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX location_geo ON partner_locations USING gist(point);

CREATE TABLE service_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES partners(id),
  center geography(Point,4326) ,
  radius_m integer ,
  boundary geography(MultiPolygon,4326) ,
  label text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((center IS NOT NULL AND radius_m IS NOT NULL AND radius_m>0 AND boundary IS NULL) OR (center IS NULL AND radius_m IS NULL AND boundary IS NOT NULL))
);
CREATE INDEX area_center_geo ON service_areas USING gist(center); CREATE INDEX area_boundary_geo ON service_areas USING gist(boundary);

CREATE TABLE assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uploader_id uuid NOT NULL REFERENCES users(id),
  object_key text NOT NULL UNIQUE,
  purpose text NOT NULL,
  mime text NOT NULL,
  bytes bigint NOT NULL,
  status text NOT NULL,
  checksum text ,
  uploaded_checksum text, -- P0-3 local/test upload bytes hash
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK(bytes>=0), CHECK(status IN ('pending','ready','rejected'))
);


CREATE TABLE verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES partners(id),
  submitted_by uuid NOT NULL REFERENCES users(id),
  private_data jsonb NOT NULL,
  state text NOT NULL DEFAULT 'pending',
  reviewer_id uuid REFERENCES users(id),
  reason text ,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);


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
  asset_id uuid REFERENCES assets(id),
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


CREATE TABLE call_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id),
  caller_id uuid NOT NULL REFERENCES users(id),
  recipient_id uuid NOT NULL REFERENCES users(id),
  provider_ref text UNIQUE,
  state text NOT NULL,
  ended_at timestamptz ,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK(caller_id<>recipient_id)
);


CREATE TABLE invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL UNIQUE REFERENCES jobs(id),
  state text NOT NULL DEFAULT 'draft',
  version integer NOT NULL DEFAULT 1,
  current_version_id uuid ,
  locked_version_id uuid ,
  customer_payment_reported_at timestamptz ,
  worker_receipt_confirmed_at timestamptz ,
  worker_receipt_by uuid REFERENCES users(id),
  settled_by_kind text ,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK(state IN ('draft','sent','revision_requested','locked','settled')), CHECK((worker_receipt_confirmed_at IS NULL)=(worker_receipt_by IS NULL))
);


CREATE TABLE invoice_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id),
  version_no integer NOT NULL,
  author_id uuid NOT NULL REFERENCES users(id),
  labor whole_amount NOT NULL,
  materials whole_amount NOT NULL,
  note text NOT NULL DEFAULT '',
  industry_details jsonb NOT NULL DEFAULT '{}',
  sent_at timestamptz ,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(invoice_id,version_no), UNIQUE(invoice_id,id), CHECK(version_no>0)
);


CREATE TABLE invoice_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL REFERENCES invoice_versions(id),
  asset_id uuid NOT NULL REFERENCES assets(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(version_id,asset_id)
);


CREATE TABLE invoice_revision_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id),
  version_id uuid NOT NULL,
  customer_id uuid NOT NULL REFERENCES users(id),
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(invoice_id,version_id) REFERENCES invoice_versions(invoice_id,id)
);


CREATE TABLE invoice_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL UNIQUE REFERENCES invoices(id),
  version_id uuid NOT NULL,
  customer_id uuid NOT NULL REFERENCES users(id),
  points_used whole_amount NOT NULL,
  fee whole_amount NOT NULL,
  reward whole_amount NOT NULL,
  cash_due whole_amount NOT NULL,
  rule_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(invoice_id,version_id) REFERENCES invoice_versions(invoice_id,id)
);


CREATE TABLE ledger_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid REFERENCES users(id),
  owner_partner_id uuid REFERENCES partners(id),
  system_code text ,
  unit text NOT NULL,
  balance signed_whole NOT NULL DEFAULT 0,
  version bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK(num_nonnulls(owner_user_id,owner_partner_id,system_code)=1), CHECK(unit IN ('VND','POINT')), CHECK(owner_user_id IS NULL OR unit='POINT'), CHECK(owner_partner_id IS NULL OR unit='VND'), UNIQUE(owner_user_id,unit), UNIQUE(owner_partner_id,unit), UNIQUE(system_code,unit), UNIQUE(id,unit)
);


CREATE TABLE ledger_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_key text NOT NULL UNIQUE,
  kind text NOT NULL,
  actor_id uuid NOT NULL REFERENCES users(id),
  correlation_id uuid NOT NULL,
  posted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);


CREATE TABLE ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES ledger_transactions(id),
  account_id uuid NOT NULL,
  unit text NOT NULL,
  delta signed_whole NOT NULL,
  posting_code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(account_id,unit) REFERENCES ledger_accounts(id,unit), UNIQUE(transaction_id,account_id,posting_code), CHECK(delta<>0)
);
CREATE INDEX ledger_account_history ON ledger_entries(account_id,created_at,id);

CREATE TABLE holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES ledger_accounts(id),
  kind text NOT NULL,
  reference_id uuid NOT NULL,
  amount whole_amount NOT NULL,
  state text NOT NULL DEFAULT 'active',
  ended_at timestamptz ,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(kind,reference_id), CHECK(amount>0), CHECK(state IN ('active','consumed','released')), CHECK(kind IN ('invoice_fee','invoice_points','payout'))
);
CREATE INDEX hold_active ON holds(account_id) WHERE state='active';

CREATE TABLE settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL UNIQUE REFERENCES invoices(id),
  transaction_id uuid NOT NULL UNIQUE REFERENCES ledger_transactions(id),
  actor_id uuid NOT NULL REFERENCES users(id),
  actor_kind text NOT NULL,
  report_id uuid ,
  reason text ,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK(actor_kind IN ('worker','admin')), CHECK(actor_kind<>'admin' OR (report_id IS NOT NULL AND reason IS NOT NULL AND length(trim(reason))>0))
);


CREATE TABLE bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES partners(id),
  bank_code text NOT NULL,
  account_ciphertext text NOT NULL,
  account_last4 text NOT NULL,
  holder_name text NOT NULL,
  status text NOT NULL,
  is_current boolean NOT NULL DEFAULT true,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX current_bank ON bank_accounts(partner_id) WHERE is_current;

CREATE TABLE topups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES partners(id),
  amount whole_amount NOT NULL,
  state text NOT NULL DEFAULT 'pending',
  bank_reference text UNIQUE,
  transaction_id uuid UNIQUE REFERENCES ledger_transactions(id),
  evidence_id uuid REFERENCES assets(id),
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK(amount>0)
);


CREATE TABLE payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES partners(id),
  bank_id uuid NOT NULL REFERENCES bank_accounts(id),
  bank_snapshot jsonb NOT NULL,
  amount whole_amount NOT NULL,
  state text NOT NULL DEFAULT 'pending',
  bank_reference text UNIQUE,
  transaction_id uuid UNIQUE REFERENCES ledger_transactions(id),
  version integer NOT NULL DEFAULT 1,
  resolved_at timestamptz ,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK(amount>=50000), CHECK(state IN ('pending','transferring','unknown','succeeded','rejected','failed_verified'))
);


CREATE TABLE reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id),
  direction text NOT NULL,
  author_id uuid NOT NULL REFERENCES users(id),
  stars smallint NOT NULL,
  body text NOT NULL DEFAULT '',
  asset_id uuid REFERENCES assets(id),
  hidden_at timestamptz ,
  removed_at timestamptz ,
  moderation_reason text ,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(job_id,direction), CHECK(stars BETWEEN 1 AND 5), CHECK(direction IN ('customer_to_partner','partner_to_customer'))
);


CREATE TABLE review_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL UNIQUE REFERENCES reviews(id),
  author_id uuid NOT NULL REFERENCES users(id),
  body text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);


CREATE TABLE reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES users(id),
  job_id uuid REFERENCES jobs(id),
  invoice_id uuid REFERENCES invoices(id),
  invoice_version_id uuid ,
  review_id uuid REFERENCES reviews(id),
  kind text NOT NULL,
  body text NOT NULL,
  state text NOT NULL DEFAULT 'open',
  assignee_id uuid REFERENCES users(id),
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(invoice_id,invoice_version_id) REFERENCES invoice_versions(invoice_id,id)
);


CREATE TABLE report_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES reports(id),
  asset_id uuid NOT NULL REFERENCES assets(id),
  submitted_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(report_id,asset_id)
);


CREATE TABLE report_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES reports(id),
  actor_id uuid NOT NULL REFERENCES users(id),
  body text NOT NULL,
  visibility text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK(visibility IN ('participants','admin_only'))
);


CREATE TABLE admin_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  permission text NOT NULL,
  revoked_at timestamptz ,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX admin_grant_active ON admin_grants(user_id,permission) WHERE revoked_at IS NULL;

CREATE TABLE notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id),
  message_push boolean NOT NULL DEFAULT true,
  call_push boolean NOT NULL DEFAULT true,
  service_push boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);


CREATE TABLE device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  provider text NOT NULL,
  token_ciphertext text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  revoked_at timestamptz ,
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


CREATE TABLE idempotency_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES users(id),
  operation text NOT NULL,
  request_key text NOT NULL,
  request_hash text NOT NULL,
  state text NOT NULL,
  resource_id uuid ,
  response_snapshot jsonb ,
  expires_at timestamptz ,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(actor_id,operation,request_key)
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

CREATE TABLE audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES users(id),
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid NOT NULL,
  correlation_id uuid NOT NULL,
  reason text ,
  changes_redacted jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);


ALTER TABLE invoices ADD FOREIGN KEY(id,current_version_id) REFERENCES invoice_versions(invoice_id,id);
ALTER TABLE invoices ADD FOREIGN KEY(id,locked_version_id) REFERENCES invoice_versions(invoice_id,id);
ALTER TABLE settlements ADD FOREIGN KEY(report_id) REFERENCES reports(id);
-- Review visibility: aggregate only where hidden_at IS NULL AND removed_at IS NULL.
-- Cross-row guards and append-only permissions are mandatory migration step M03 below.

-- Proposed database protections, to verify with PostgreSQL integration tests in M03.
CREATE FUNCTION reject_history_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'immutable history' USING ERRCODE='23514'; END $$;
CREATE TRIGGER immutable_entries BEFORE UPDATE OR DELETE ON ledger_entries FOR EACH ROW EXECUTE FUNCTION reject_history_mutation();
CREATE TRIGGER immutable_transactions BEFORE UPDATE OR DELETE ON ledger_transactions FOR EACH ROW EXECUTE FUNCTION reject_history_mutation();
CREATE TRIGGER immutable_audit BEFORE UPDATE OR DELETE ON audit_events FOR EACH ROW EXECUTE FUNCTION reject_history_mutation();
CREATE FUNCTION protect_sent_invoice_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.sent_at IS NOT NULL THEN RAISE EXCEPTION 'sent invoice version is immutable' USING ERRCODE='23514'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER immutable_sent_version BEFORE UPDATE OR DELETE ON invoice_versions FOR EACH ROW EXECUTE FUNCTION protect_sent_invoice_version();
CREATE FUNCTION verify_balanced_posting() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM ledger_entries WHERE transaction_id=NEW.transaction_id GROUP BY unit HAVING sum(delta)<>0)
 THEN RAISE EXCEPTION 'unbalanced posting' USING ERRCODE='23514'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER balanced_posting AFTER INSERT ON ledger_entries DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION verify_balanced_posting();
-- Accounts must be locked in UUID order by service BEFORE inserting entries.
CREATE FUNCTION project_balance() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 UPDATE ledger_accounts SET balance=balance+NEW.delta, version=version+1 WHERE id=NEW.account_id;
 RETURN NEW;
END $$;
CREATE TRIGGER project_entry AFTER INSERT ON ledger_entries FOR EACH ROW EXECUTE FUNCTION project_balance();
-- Application DB role: no direct UPDATE balance, no DELETE financial/history rows.
-- Use column grants / restricted settlement function in migration M03. Do not run as schema owner.
CREATE TABLE skill_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id uuid NOT NULL REFERENCES skills(id) ON DELETE RESTRICT,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(skill_id, category_id)
);
ALTER TABLE auth_challenges ADD COLUMN context jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE assets ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK(version>0);
ALTER TABLE call_sessions ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK(version>0);
CREATE TABLE recovery_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 claimed_user_id uuid REFERENCES users(id),
 contact_claim_ciphertext text NOT NULL,
 reachable_contact_ciphertext text NOT NULL,
 description text NOT NULL,
 evidence_ids uuid[] NOT NULL DEFAULT '{}',
 status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','evidence_requested','approved','rejected')),
 version integer NOT NULL DEFAULT 1 CHECK(version>0),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX identities_one_contact ON identities(user_id,provider) WHERE provider IN ('phone','email');
-- I18N-04, approved 2026-10-05. Runtime history is migrations/003_catalog_translations.sql.
ALTER TABLE skills ADD COLUMN translations jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(translations) = 'object');
COMMIT;

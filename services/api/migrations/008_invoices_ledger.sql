-- P0-3: invoice versions, balanced test ledger, holds and settlement.
CREATE TABLE assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uploader_id uuid NOT NULL REFERENCES users(id),
  object_key text NOT NULL UNIQUE,
  purpose text NOT NULL,
  mime text NOT NULL,
  bytes bigint NOT NULL,
  status text NOT NULL,
  checksum text ,
  uploaded_checksum text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK(bytes>=0), CHECK(status IN ('pending','ready','rejected'))
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



ALTER TABLE invoices ADD FOREIGN KEY(id,current_version_id) REFERENCES invoice_versions(invoice_id,id);
ALTER TABLE invoices ADD FOREIGN KEY(id,locked_version_id) REFERENCES invoice_versions(invoice_id,id);

CREATE FUNCTION reject_history_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'immutable history' USING ERRCODE='23514'; END $$;
CREATE TRIGGER immutable_entries BEFORE UPDATE OR DELETE ON ledger_entries FOR EACH ROW EXECUTE FUNCTION reject_history_mutation();
CREATE TRIGGER immutable_transactions BEFORE UPDATE OR DELETE ON ledger_transactions FOR EACH ROW EXECUTE FUNCTION reject_history_mutation();

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

CREATE FUNCTION protect_invoice_assets() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM invoice_versions WHERE id IN (NEW.version_id,OLD.version_id) AND sent_at IS NOT NULL)
 THEN RAISE EXCEPTION 'sent invoice assets are immutable' USING ERRCODE='23514'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER immutable_sent_assets BEFORE INSERT OR UPDATE OR DELETE ON invoice_assets FOR EACH ROW EXECUTE FUNCTION protect_invoice_assets();
CREATE TRIGGER immutable_confirmation BEFORE UPDATE OR DELETE ON invoice_confirmations FOR EACH ROW EXECUTE FUNCTION reject_history_mutation();
CREATE TRIGGER immutable_settlement BEFORE UPDATE OR DELETE ON settlements FOR EACH ROW EXECUTE FUNCTION reject_history_mutation();

CREATE FUNCTION protect_posted_transaction() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM ledger_transactions WHERE id=NEW.transaction_id AND created_at=transaction_timestamp())
 OR EXISTS(SELECT 1 FROM settlements WHERE transaction_id=NEW.transaction_id)
 THEN RAISE EXCEPTION 'posted transaction cannot accept entries' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER no_late_postings BEFORE INSERT ON ledger_entries FOR EACH ROW EXECUTE FUNCTION protect_posted_transaction();
CREATE FUNCTION protect_hold() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' OR OLD.state<>'active' OR NEW.state NOT IN ('consumed','released')
 OR ROW(NEW.id,NEW.account_id,NEW.kind,NEW.reference_id,NEW.amount,NEW.created_at) IS DISTINCT FROM ROW(OLD.id,OLD.account_id,OLD.kind,OLD.reference_id,OLD.amount,OLD.created_at)
 OR NEW.ended_at IS NULL
 THEN RAISE EXCEPTION 'hold history is immutable' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER immutable_hold BEFORE UPDATE OR DELETE ON holds FOR EACH ROW EXECUTE FUNCTION protect_hold();

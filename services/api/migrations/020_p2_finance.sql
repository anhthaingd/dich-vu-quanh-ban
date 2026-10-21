-- Local bank simulator only. Monetary postings use the existing immutable balanced ledger.
CREATE TABLE finance_reauth_grants (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), token_hash text NOT NULL UNIQUE,
 user_id uuid NOT NULL REFERENCES users(id), family_id uuid NOT NULL, scope text NOT NULL,
 expires_at timestamptz NOT NULL, consumed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(scope IN ('bank','payout'))
);
CREATE TABLE bank_change_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), partner_id uuid NOT NULL REFERENCES partners(id),
 user_id uuid NOT NULL REFERENCES users(id), account_id uuid NOT NULL REFERENCES ledger_accounts(id),
 bank_code text NOT NULL, account_cipher text NOT NULL, account_last4 text NOT NULL, holder_name text NOT NULL,
 reason text NOT NULL, state text NOT NULL DEFAULT 'pending', version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(), CHECK(state IN ('pending','approved','rejected','cancelled'))
);
CREATE UNIQUE INDEX bank_pending_partner ON bank_change_requests(partner_id) WHERE state='pending';
CREATE TABLE verified_bank_accounts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), partner_id uuid NOT NULL REFERENCES partners(id),
 request_id uuid NOT NULL UNIQUE REFERENCES bank_change_requests(id), bank_code text NOT NULL,
 account_cipher text NOT NULL, account_last4 text NOT NULL, holder_name text NOT NULL,
 current boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX bank_current_partner ON verified_bank_accounts(partner_id) WHERE current;
CREATE TABLE finance_topups (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), partner_id uuid NOT NULL REFERENCES partners(id),
 user_id uuid NOT NULL REFERENCES users(id), account_id uuid NOT NULL REFERENCES ledger_accounts(id),
 amount whole_amount NOT NULL CHECK(amount>0), state text NOT NULL DEFAULT 'pending', version integer NOT NULL DEFAULT 1,
 evidence_id uuid REFERENCES assets(id), bank_reference text, transaction_id uuid UNIQUE REFERENCES ledger_transactions(id),
 created_at timestamptz NOT NULL DEFAULT now(), CHECK(state IN ('pending','confirmed','rejected','cancelled'))
);
CREATE UNIQUE INDEX topup_reference_unique ON finance_topups(bank_reference) WHERE bank_reference IS NOT NULL;
CREATE TABLE finance_payouts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), partner_id uuid NOT NULL REFERENCES partners(id),
 user_id uuid NOT NULL REFERENCES users(id), account_id uuid NOT NULL REFERENCES ledger_accounts(id),
 amount whole_amount NOT NULL CHECK(amount>=50000), state text NOT NULL DEFAULT 'pending', version integer NOT NULL DEFAULT 1,
 bank_account_id uuid NOT NULL REFERENCES verified_bank_accounts(id), bank_snapshot jsonb NOT NULL,
 bank_reference text UNIQUE, transaction_id uuid UNIQUE REFERENCES ledger_transactions(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(state IN ('pending','approved','transferring','unknown','succeeded','failed','rejected','cancelled'))
);
CREATE INDEX finance_topup_pending ON finance_topups(partner_id) WHERE state='pending';
CREATE INDEX finance_payout_pending ON finance_payouts(partner_id) WHERE state IN ('pending','approved','transferring','unknown');
CREATE TABLE finance_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), domain text NOT NULL, resource_id uuid NOT NULL,
 actor_id uuid NOT NULL REFERENCES users(id), action text NOT NULL, reason text NOT NULL,
 version integer NOT NULL, bank_reference text, evidence_ids uuid[] NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now(), CHECK(domain IN ('bank-accounts','topups','payouts'))
);
CREATE TRIGGER immutable_finance_history BEFORE UPDATE OR DELETE ON finance_history FOR EACH ROW EXECUTE FUNCTION reject_history_mutation();
CREATE TABLE local_bank_deposits (
 reference text PRIMARY KEY, partner_id uuid NOT NULL REFERENCES partners(id), amount whole_amount NOT NULL CHECK(amount>0),
 created_by uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER immutable_bank_deposits BEFORE UPDATE OR DELETE ON local_bank_deposits FOR EACH ROW EXECUTE FUNCTION reject_history_mutation();
CREATE TABLE local_bank_transfers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), payout_id uuid NOT NULL UNIQUE REFERENCES finance_payouts(id),
 reference text NOT NULL UNIQUE, amount whole_amount NOT NULL, bank_account_id uuid NOT NULL REFERENCES verified_bank_accounts(id),
 outcome text NOT NULL CHECK(outcome IN ('succeeded','failed')), response_lost boolean NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER immutable_bank_transfers BEFORE UPDATE OR DELETE ON local_bank_transfers FOR EACH ROW EXECUTE FUNCTION reject_history_mutation();

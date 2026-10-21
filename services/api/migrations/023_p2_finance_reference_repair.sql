-- Earlier local P2 decisions could store unverified free text in a unique bank claim.
-- Keep immutable decision evidence/history, but release claims with no bank transfer.
-- Never clear a confirmed ledger posting or an actual durable simulator transfer.
UPDATE finance_topups SET bank_reference=NULL
 WHERE bank_reference IS NOT NULL AND state IN ('pending','rejected','cancelled') AND transaction_id IS NULL;
UPDATE finance_payouts p SET bank_reference=NULL
 WHERE p.bank_reference IS NOT NULL AND p.state IN ('pending','approved','rejected','cancelled')
 AND p.transaction_id IS NULL
 AND NOT EXISTS(SELECT 1 FROM local_bank_transfers t WHERE t.payout_id=p.id AND t.reference=p.bank_reference);

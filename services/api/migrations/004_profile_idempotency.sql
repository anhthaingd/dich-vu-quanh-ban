CREATE TABLE idempotency_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES users(id),
  operation text NOT NULL,
  request_key text NOT NULL,
  request_hash text NOT NULL,
  state text NOT NULL CHECK (state IN ('processing', 'completed')),
  resource_id uuid,
  response_snapshot jsonb,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(actor_id, operation, request_key)
);

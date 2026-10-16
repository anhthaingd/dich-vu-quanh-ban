-- B10-01: one review per direction, preserving removal and moderation independently.
CREATE TABLE reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), job_id uuid NOT NULL REFERENCES jobs(id),
 direction text NOT NULL CHECK(direction IN ('customer_to_partner','partner_to_customer')),
 author_id uuid NOT NULL REFERENCES users(id), stars smallint NOT NULL CHECK(stars BETWEEN 1 AND 5),
 body text NOT NULL DEFAULT '', asset_id uuid REFERENCES assets(id), hidden_at timestamptz,
 removed_at timestamptz, moderation_reason text, version integer NOT NULL DEFAULT 1 CHECK(version>0),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(job_id,direction)
);
CREATE INDEX reviews_public ON reviews(job_id,created_at DESC,id DESC)
 WHERE direction='customer_to_partner' AND hidden_at IS NULL AND removed_at IS NULL;

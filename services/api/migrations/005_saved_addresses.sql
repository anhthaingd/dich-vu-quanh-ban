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

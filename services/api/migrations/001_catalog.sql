CREATE EXTENSION IF NOT EXISTS postgis;

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
CREATE INDEX categories_parent ON categories(parent_id);
CREATE INDEX categories_page ON categories(created_at, id);

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
CREATE INDEX skills_page ON skills(created_at, id);
CREATE TABLE skill_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id uuid NOT NULL REFERENCES skills(id) ON DELETE RESTRICT,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(skill_id, category_id)
);
CREATE INDEX skill_categories_category ON skill_categories(category_id, skill_id);

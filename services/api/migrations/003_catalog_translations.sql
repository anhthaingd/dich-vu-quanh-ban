ALTER TABLE skills ADD COLUMN translations jsonb NOT NULL DEFAULT '{}'
  CHECK (jsonb_typeof(translations) = 'object');

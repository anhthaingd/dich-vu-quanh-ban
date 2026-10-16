-- A review's reply shares its version, so editing either side cannot overwrite a stale snapshot.
ALTER TABLE reviews ADD COLUMN reply_body text;
ALTER TABLE reviews ADD COLUMN reply_author_id uuid REFERENCES users(id);
ALTER TABLE reviews ADD CONSTRAINT review_reply_pair CHECK (
 (reply_body IS NULL AND reply_author_id IS NULL) OR
 (reply_body IS NOT NULL AND length(btrim(reply_body))>0 AND reply_author_id IS NOT NULL)
);

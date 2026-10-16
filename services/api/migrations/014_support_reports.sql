-- B09-01: reports are private to their reporter; submitting one never changes a job or money.
CREATE TABLE reports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), reporter_id uuid NOT NULL REFERENCES users(id),
 job_id uuid REFERENCES jobs(id), invoice_id uuid REFERENCES invoices(id), invoice_version_id uuid,
 review_id uuid REFERENCES reviews(id), kind text NOT NULL CHECK(kind IN ('invoice','account','review','service')),
 subject text NOT NULL CHECK(length(btrim(subject))>0), body text NOT NULL CHECK(length(btrim(body))>0),
 state text NOT NULL DEFAULT 'open' CHECK(state IN ('open','reviewing','awaiting_evidence','resolved','closed')),
 assignee_id uuid REFERENCES users(id), version integer NOT NULL DEFAULT 1 CHECK(version>0),
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(invoice_id,invoice_version_id) REFERENCES invoice_versions(invoice_id,id),
 CHECK((invoice_id IS NULL)=(invoice_version_id IS NULL))
);
CREATE INDEX reports_reporter_page ON reports(reporter_id,created_at DESC,id DESC);
CREATE TABLE report_evidence (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), report_id uuid NOT NULL REFERENCES reports(id),
 asset_id uuid NOT NULL REFERENCES assets(id), submitted_by uuid NOT NULL REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(report_id,asset_id)
);
CREATE TABLE report_updates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), report_id uuid NOT NULL REFERENCES reports(id),
 actor_id uuid NOT NULL REFERENCES users(id), body text NOT NULL CHECK(length(btrim(body))>0),
 visibility text NOT NULL CHECK(visibility IN ('participants','admin_only')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX report_updates_thread ON report_updates(report_id,created_at,id);
ALTER TABLE report_evidence ADD COLUMN update_id uuid REFERENCES report_updates(id);

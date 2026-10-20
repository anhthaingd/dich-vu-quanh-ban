-- P1-05: approved account, partner and catalog administration.
ALTER TABLE admin_grants DROP CONSTRAINT admin_grants_permission_check;
ALTER TABLE admin_grants ADD CONSTRAINT admin_grants_permission_check CHECK
 (permission IN ('support.read','support.manage','moderation.manage','audit.read','finance.review','accounts.manage','catalog.manage'));
ALTER TABLE moderation_history DROP CONSTRAINT moderation_history_domain_check;
ALTER TABLE moderation_history ADD CONSTRAINT moderation_history_domain_check CHECK
 (domain IN ('reports','verifications','reviews','users','partners','categories','skills'));
ALTER TABLE categories ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK(version>0);
ALTER TABLE skills ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK(version>0);
ALTER TABLE sessions ADD COLUMN scope text NOT NULL DEFAULT 'app' CHECK(scope IN ('app','support'));

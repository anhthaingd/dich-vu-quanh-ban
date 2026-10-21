-- P2 separates report/finance reads and least-privilege grant administration.
ALTER TABLE admin_grants DROP CONSTRAINT admin_grants_permission_check;
ALTER TABLE admin_grants ADD CONSTRAINT admin_grants_permission_check CHECK(permission IN (
 'support.read','support.manage','moderation.manage','audit.read','finance.review',
 'accounts.manage','catalog.manage','finance.read','reports.read','grant.manage'));

-- P0-1: supply, ownership and empty wallet foundation. No demo data or money operations.
CREATE DOMAIN whole_amount AS numeric CHECK (VALUE >= 0 AND scale(VALUE)=0 AND VALUE::text NOT IN ('NaN','Infinity','-Infinity'));

CREATE DOMAIN signed_whole AS numeric CHECK (scale(VALUE)=0 AND VALUE::text NOT IN ('NaN','Infinity','-Infinity'));

CREATE TABLE partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  name text NOT NULL,
  bio text NOT NULL DEFAULT '',
  verification_status text NOT NULL DEFAULT 'unverified',
  publication_status text NOT NULL DEFAULT 'draft' CHECK (publication_status IN ('draft','published')),
  accepting_jobs boolean NOT NULL DEFAULT false,
  moderation_status text NOT NULL DEFAULT 'active',
  profile jsonb NOT NULL DEFAULT '{}',
  version integer NOT NULL DEFAULT 1,
  archived_at timestamptz ,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK(kind IN ('solo','shop','company')), CHECK(verification_status IN ('unverified','pending','verified','rejected')), CHECK(moderation_status IN ('active','new_work_suspended','suspended'))
);


CREATE TABLE memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES partners(id),
  user_id uuid NOT NULL REFERENCES users(id),
  is_owner boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  left_at timestamptz ,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(partner_id,user_id), UNIQUE(id,partner_id)
);
CREATE UNIQUE INDEX one_active_owner ON memberships(partner_id) WHERE is_owner AND active;

CREATE TABLE membership_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id uuid NOT NULL REFERENCES memberships(id),
  permission text NOT NULL,
  granted_by uuid NOT NULL REFERENCES users(id),
  revoked_at timestamptz ,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX active_grant ON membership_grants(membership_id,permission) WHERE revoked_at IS NULL;


CREATE TABLE partner_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES partners(id),
  skill_id uuid NOT NULL REFERENCES skills(id),
  modes text[] NOT NULL,
  reference_labor whole_amount ,
  inspection_fee whole_amount ,
  travel_fee whole_amount ,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(partner_id,skill_id)
);


CREATE TABLE partner_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES partners(id),
  address_text text NOT NULL,
  point geography(Point,4326) NOT NULL,
  public boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX location_geo ON partner_locations USING gist(point);

CREATE TABLE service_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES partners(id),
  center geography(Point,4326) ,
  radius_m integer ,
  boundary geography(MultiPolygon,4326) ,
  label text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((center IS NOT NULL AND radius_m IS NOT NULL AND radius_m>0 AND boundary IS NULL) OR (center IS NULL AND radius_m IS NULL AND boundary IS NOT NULL))
);
CREATE INDEX area_center_geo ON service_areas USING gist(center); CREATE INDEX area_boundary_geo ON service_areas USING gist(boundary);


CREATE TABLE ledger_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid REFERENCES users(id),
  owner_partner_id uuid REFERENCES partners(id),
  system_code text ,
  unit text NOT NULL,
  balance signed_whole NOT NULL DEFAULT 0,
  version bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK(num_nonnulls(owner_user_id,owner_partner_id,system_code)=1), CHECK(unit IN ('VND','POINT')), CHECK(owner_user_id IS NULL OR unit='POINT'), CHECK(owner_partner_id IS NULL OR unit='VND'), UNIQUE(owner_user_id,unit), UNIQUE(owner_partner_id,unit), UNIQUE(system_code,unit), UNIQUE(id,unit)
);



CREATE INDEX partner_memberships_user ON memberships(user_id) WHERE active;
CREATE INDEX partner_skills_partner ON partner_skills(partner_id) WHERE active;

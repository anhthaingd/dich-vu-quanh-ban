import type { Skill } from '../catalog/models/catalog.types';
export type Kind = 'solo' | 'shop' | 'company';
export type Mode = 'at_shop' | 'at_customer' | 'custom';
export type Point = { latitude: number; longitude: number };
export type PartnerSkill = {
  skill_id: string;
  modes: Mode[];
  reference_labor: string | null;
  inspection_fee: string | null;
  travel_fee: string | null;
};
export type Area = {
  label: string;
  center: Point;
  radius_m: number;
  boundary_geojson: null;
};
export type Location = {
  address: { text: string; point: Point };
  public: boolean;
};
export type Partner = {
  id: string;
  kind: Kind;
  name: string;
  bio: string;
  phone: string;
  zalo: string;
  version: number;
  verification_status: string;
  publication_status: 'draft' | 'published';
  moderation_status: string;
  accepting_jobs: boolean;
  skills: PartnerSkill[];
  areas: Area[];
  locations: Location[];
};
export type PartnerCreate = { kind: Kind; name: string; bio?: string };
export type PartnerEdit = { expected_version: number } & (
  | {
      action: 'profile';
      name?: string;
      bio?: string;
      phone?: string;
      zalo?: string;
    }
  | { action: 'skills'; skills: PartnerSkill[] }
  | { action: 'service-areas'; areas: Area[] }
  | { action: 'locations'; locations: Location[] }
  | { action: 'publication'; publication_status: 'draft' | 'published' }
  | { action: 'availability'; accepting_jobs: boolean }
);
export type PartnerCard = {
  map_location: Location['address'] | null;
  id: string;
  name: string;
  kind: Kind;
  verification_status: string;
  distance_m: number;
  distance_kind: 'shop' | 'service_area';
  stars: number | null;
  review_count: number;
  reference_labor: string | null;
};
export type PartnerProfile = Pick<
  Partner,
  'id' | 'name' | 'kind' | 'bio' | 'verification_status'
> & {
  skills: Skill[];
  public_locations: {id:string;address:Location['address']}[];
  service_modes: {skill_id:string;modes:Mode[]}[];
  public_addresses: Location['address'][];
  contact: { phone?: string; zalo?: string } | null;
  can_hire: boolean;
  can_message: boolean;
};
export type SearchInput = Point & {
  radius_m: number;
  skill_id?: string;
  category_id?: string;
  service_mode?: Mode;
  verified?: boolean;
};

// Preserve the action-specific fields when adding the shared version at save time.
type WithoutVersion<T> = T extends { expected_version: number }
  ? Omit<T, 'expected_version'>
  : never;
export type PartnerChange = WithoutVersion<PartnerEdit>;

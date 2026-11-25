import { BadRequestException } from "@nestjs/common";
import { identifier, object } from "../accounts/accounts.input.js";
import { invalid, reasoned } from "./partners.errors.js";
export type Mode = "at_shop" | "at_customer" | "custom";
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
  radius_m: number|null;
  boundary_geojson: {type:'MultiPolygon';coordinates:number[][][][]}|null;
};
export type Location = {
  address: { text: string; point: Point };
  public: boolean;
};
export type Create = {
  kind: "solo" | "shop" | "company";
  name: string;
  bio: string;
};
export type Edit = { expected_version: number } & (
  | {
      action: "profile";
      name?: string;
      bio?: string;
      phone?: string;
      zalo?: string;
    }
  | { action: "skills"; skills: PartnerSkill[] }
  | { action: "service-areas"; areas: Area[] }
  | { action: "locations"; locations: Location[] }
  | { action: "gallery"; asset_ids: string[] }
  | { action: "availability"; accepting_jobs: boolean }
  | { action: "publication"; publication_status: "draft" | "published" }
);
// Optional exact causes for a text field. Without them the error stays bare,
// so other modules reusing textInput keep their own reasons.
export type TextReasons = { field: string; invalid: string; required?: string };
export function textInput(
  v: unknown,
  blank = false,
  multiline = false,
  reasons?: TextReasons,
): string {
  const fail = (reason?: string) =>
    reasons ? invalid(reason ?? reasons.invalid, reasons.field) : new BadRequestException();
  if (typeof v !== "string") throw fail(v == null ? reasons?.required : undefined);
  if (!blank && !v.trim()) throw fail(reasons?.required);
  if (
    Array.from(v).some(
      (c) =>
        !(multiline && (c === "\n" || c === "\r")) &&
        (c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127),
    )
  )
    throw fail();
  return v.trim();
}
// `reason`/`field` are optional so callers in other modules keep a bare error.
export function pointInput(value: unknown, reason?: string, field?: string): Point {
  const fail = () => (reason ? invalid(reason, field) : new BadRequestException());
  const p = reason ? reasoned(() => object(value, ["latitude", "longitude"]), reason, field) : object(value, ["latitude", "longitude"]);
  if (
    typeof p.latitude !== "number" ||
    !Number.isFinite(p.latitude) ||
    Math.abs(p.latitude) > 90 ||
    typeof p.longitude !== "number" ||
    !Number.isFinite(p.longitude) ||
    Math.abs(p.longitude) > 180
  )
    throw fail();
  return { latitude: p.latitude, longitude: p.longitude };
}
const bool = (v: unknown, reason: string, field: string) => {
  if (typeof v !== "boolean") throw invalid(reason, field);
  return v;
};
const amount = (v: unknown, field: string): string | null => {
  if (v == null) return null;
  if (typeof v !== "string" || !/^(0|[1-9]\d*)$/.test(v))
    throw invalid("PARTNER_PRICE_INVALID", field);
  return v;
};
function array<T>(v: unknown, parse: (v: unknown) => T, reason: string, field: string): T[] {
  if (!Array.isArray(v)) throw invalid(reason, field);
  return v.map(parse);
}
// Body is not an object or carries a field this action does not accept.
const body = (value: unknown, allowed: string[], field?: string) => object(value, allowed, field);
const NAME: TextReasons = { field: "name", required: "PARTNER_NAME_REQUIRED", invalid: "PARTNER_NAME_INVALID" };
const PROFILE_TEXT: Record<string, TextReasons> = {
  name: NAME,
  bio: { field: "bio", invalid: "PARTNER_BIO_INVALID" },
  phone: { field: "phone", invalid: "PARTNER_PHONE_INVALID" },
  zalo: { field: "zalo", invalid: "PARTNER_ZALO_INVALID" },
};
const versionInput = (v: unknown) => {
  if (!Number.isSafeInteger(v) || Number(v) < 1)
    throw invalid("EXPECTED_VERSION_REQUIRED", "expected_version");
  return v as number;
};
export function createInput(value: unknown): Create {
  const v = body(value, ["kind", "name", "bio"]);
  if (!["solo", "shop", "company"].includes(String(v.kind)))
    throw invalid("PARTNER_KIND_INVALID", "kind");
  return {
    kind: v.kind as Create["kind"],
    name: textInput(v.name, false, false, NAME),
    bio: v.bio === undefined ? "" : textInput(v.bio, true, true, PROFILE_TEXT.bio),
  };
}
export function editInput(action: Edit["action"], value: unknown): Edit {
  const fields = {
    profile: ["name", "bio", "phone", "zalo"],
    skills: ["skills"],
    "service-areas": ["areas"],
    locations: ["locations"],
    gallery: ["asset_ids"],
    availability: ["accepting_jobs"],
    publication: ["publication_status"],
  };
  const v = body(value, ["expected_version", ...fields[action]]);
  const base = { expected_version: versionInput(v.expected_version) };
  switch (action) {
    case "profile":
      return {
        ...base,
        action,
        ...Object.fromEntries(
          fields.profile
            .filter((k) => v[k] !== undefined)
            .map((k) => [k, textInput(v[k], k !== "name", k === "bio", PROFILE_TEXT[k])]),
        ),
      };
    case "gallery": {
      const ids = array(v.asset_ids, (id) => identifier(id, "PARTNER_GALLERY_IMAGE_INVALID", "asset_ids"), "PARTNER_GALLERY_INVALID", "asset_ids");
      if (ids.length > 12) throw invalid("PARTNER_GALLERY_TOO_MANY", "asset_ids");
      if (new Set(ids).size !== ids.length) throw invalid("PARTNER_GALLERY_DUPLICATE", "asset_ids");
      return {...base, action, asset_ids: ids};
    }
    case "availability":
      return { ...base, action, accepting_jobs: bool(v.accepting_jobs, "PARTNER_ACCEPTING_JOBS_INVALID", "accepting_jobs") };
    case "publication": {
      if (
        v.publication_status !== "draft" &&
        v.publication_status !== "published"
      )
        throw invalid("PARTNER_PUBLICATION_STATUS_INVALID", "publication_status");
      return { ...base, action, publication_status: v.publication_status };
    }
    case "skills": {
      const skills = array(v.skills, (value) => {
        const s = body(value, [
          "skill_id",
          "modes",
          "reference_labor",
          "inspection_fee",
          "travel_fee",
        ], "skills");
        const modes = array(s.modes, (m) => {
          if (m !== "at_shop" && m !== "at_customer" && m !== "custom")
            throw invalid("PARTNER_SKILL_MODE_INVALID", "skills.modes");
          return m;
        }, "PARTNER_SKILL_MODE_INVALID", "skills.modes");
        if (!modes.length) throw invalid("PARTNER_SKILL_MODE_REQUIRED", "skills.modes");
        if (new Set(modes).size !== modes.length)
          throw invalid("PARTNER_SKILL_MODE_DUPLICATE", "skills.modes");
        return {
          skill_id: identifier(s.skill_id, "PARTNER_SKILL_INVALID", "skills.skill_id"),
          modes,
          reference_labor: amount(s.reference_labor, "skills.reference_labor"),
          inspection_fee: amount(s.inspection_fee, "skills.inspection_fee"),
          travel_fee: amount(s.travel_fee, "skills.travel_fee"),
        };
      }, "PARTNER_SKILLS_INVALID", "skills");
      if (new Set(skills.map((s) => s.skill_id)).size !== skills.length)
        throw invalid("PARTNER_SKILL_DUPLICATE", "skills.skill_id");
      return { ...base, action, skills };
    }
    case "service-areas":
      return {
        ...base,
        action,
        areas: array(v.areas, (value) => {
          const a = body(value, [
            "label",
            "center",
            "radius_m",
            "boundary_geojson",
          ], "areas");
          const boundary=polygonInput(a.boundary_geojson);
          if (!(boundary&&a.radius_m===null)&&(
            !Number.isSafeInteger(a.radius_m) ||
            Number(a.radius_m) < 1 ||
            Number(a.radius_m) > 2147483647
          ))
            throw invalid("PARTNER_AREA_RADIUS_INVALID", "areas.radius_m");
          return {
            label: textInput(a.label, false, false, { field: "areas.label", required: "PARTNER_AREA_LABEL_REQUIRED", invalid: "PARTNER_AREA_LABEL_INVALID" }),
            center: pointInput(a.center, "PARTNER_AREA_CENTER_INVALID", "areas.center"),
            radius_m: a.radius_m===null?null:Number(a.radius_m),
            boundary_geojson: boundary,
          };
        }, "PARTNER_AREAS_INVALID", "areas"),
      };
    case "locations":
      return {
        ...base,
        action,
        locations: array(v.locations, (value) => {
          const l = body(value, ["address", "public"], "locations"),
            a = body(l.address, ["text", "point"], "locations.address");
          return {
            address: {
              text: textInput(a.text, false, false, { field: "locations.address.text", required: "PARTNER_LOCATION_ADDRESS_REQUIRED", invalid: "PARTNER_LOCATION_ADDRESS_INVALID" }),
              point: pointInput(a.point, "PARTNER_LOCATION_POINT_INVALID", "locations.address.point"),
            },
            public: bool(l.public, "PARTNER_LOCATION_PUBLIC_INVALID", "locations.public"),
          };
        }, "PARTNER_LOCATIONS_INVALID", "locations"),
      };
  }
}

export function polygonInput(value:unknown):Area['boundary_geojson']{
 const F='areas.boundary_geojson',bad=()=>invalid('PARTNER_AREA_BOUNDARY_INVALID',F);
 if(value==null)return null;const v=reasoned(()=>object(value,['type','coordinates']),'PARTNER_AREA_BOUNDARY_INVALID',F);
 if(v.type!=='MultiPolygon'||!Array.isArray(v.coordinates)||v.coordinates.length!==1||!Array.isArray(v.coordinates[0])||v.coordinates[0].length!==1)throw bad();
 const ring=v.coordinates[0][0];if(!Array.isArray(ring))throw bad();
 if(ring.length<4)throw invalid('PARTNER_AREA_BOUNDARY_TOO_FEW_POINTS',F);if(ring.length>101)throw invalid('PARTNER_AREA_BOUNDARY_TOO_MANY_POINTS',F);
 for(const p of ring){if(!Array.isArray(p)||p.length!==2)throw bad();pointInput({longitude:p[0],latitude:p[1]},'PARTNER_AREA_BOUNDARY_INVALID',F);}
 if(ring[0][0]!==ring.at(-1)[0]||ring[0][1]!==ring.at(-1)[1])throw invalid('PARTNER_AREA_BOUNDARY_NOT_CLOSED',F);
 if(new Set(ring.slice(0,-1).map(p=>JSON.stringify(p))).size!==ring.length-1)throw invalid('PARTNER_AREA_BOUNDARY_DUPLICATE_POINT',F);
 if(ring.some((p,i)=>i>0&&Math.abs(p[0]-ring[i-1][0])>180))throw bad();
 return {type:'MultiPolygon',coordinates:v.coordinates as number[][][][]};
}

export function deactivationInput(value:unknown){
 const v=body(value,['expected_version','reason']);
 const expected_version=versionInput(v.expected_version);
 const reason=textInput(v.reason,false,false,{field:'reason',required:'PARTNER_DEACTIVATION_REASON_REQUIRED',invalid:'PARTNER_DEACTIVATION_REASON_INVALID'});if(reason.length>1000)throw invalid('PARTNER_DEACTIVATION_REASON_TOO_LONG','reason');
 return {expected_version:Number(expected_version),reason};
}

import { BadRequestException } from "@nestjs/common";
import { identifier, object } from "../accounts/accounts.input.js";
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
export function textInput(
  v: unknown,
  blank = false,
  multiline = false,
): string {
  if (
    typeof v !== "string" ||
    (!blank && !v.trim()) ||
    Array.from(v).some(
      (c) =>
        !(multiline && (c === "\n" || c === "\r")) &&
        (c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127),
    )
  )
    throw new BadRequestException();
  return v.trim();
}
export function pointInput(value: unknown): Point {
  const p = object(value, ["latitude", "longitude"]);
  if (
    typeof p.latitude !== "number" ||
    !Number.isFinite(p.latitude) ||
    Math.abs(p.latitude) > 90 ||
    typeof p.longitude !== "number" ||
    !Number.isFinite(p.longitude) ||
    Math.abs(p.longitude) > 180
  )
    throw new BadRequestException();
  return { latitude: p.latitude, longitude: p.longitude };
}
const bool = (v: unknown) => {
  if (typeof v !== "boolean") throw new BadRequestException();
  return v;
};
const amount = (v: unknown): string | null => {
  if (v == null) return null;
  if (typeof v !== "string" || !/^(0|[1-9]\d*)$/.test(v))
    throw new BadRequestException();
  return v;
};
function array<T>(v: unknown, parse: (v: unknown) => T): T[] {
  if (!Array.isArray(v)) throw new BadRequestException();
  return v.map(parse);
}
export function createInput(value: unknown): Create {
  const v = object(value, ["kind", "name", "bio"]);
  if (!["solo", "shop", "company"].includes(String(v.kind)))
    throw new BadRequestException();
  return {
    kind: v.kind as Create["kind"],
    name: textInput(v.name),
    bio: v.bio === undefined ? "" : textInput(v.bio, true, true),
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
  const v = object(value, ["expected_version", ...fields[action]]);
  if (
    !Number.isSafeInteger(v.expected_version) ||
    Number(v.expected_version) < 1
  )
    throw new BadRequestException();
  const base = { expected_version: v.expected_version as number };
  switch (action) {
    case "profile":
      return {
        ...base,
        action,
        ...Object.fromEntries(
          fields.profile
            .filter((k) => v[k] !== undefined)
            .map((k) => [k, textInput(v[k], k !== "name", k === "bio")]),
        ),
      };
    case "gallery": {
      const ids = array(v.asset_ids, identifier);
      if (ids.length > 12 || new Set(ids).size !== ids.length) throw new BadRequestException();
      return {...base, action, asset_ids: ids};
    }
    case "availability":
      return { ...base, action, accepting_jobs: bool(v.accepting_jobs) };
    case "publication": {
      if (
        v.publication_status !== "draft" &&
        v.publication_status !== "published"
      )
        throw new BadRequestException();
      return { ...base, action, publication_status: v.publication_status };
    }
    case "skills": {
      const skills = array(v.skills, (value) => {
        const s = object(value, [
          "skill_id",
          "modes",
          "reference_labor",
          "inspection_fee",
          "travel_fee",
        ]);
        const modes = array(s.modes, (m) => {
          if (m !== "at_shop" && m !== "at_customer" && m !== "custom")
            throw new BadRequestException();
          return m;
        });
        if (!modes.length || new Set(modes).size !== modes.length)
          throw new BadRequestException();
        return {
          skill_id: identifier(s.skill_id),
          modes,
          reference_labor: amount(s.reference_labor),
          inspection_fee: amount(s.inspection_fee),
          travel_fee: amount(s.travel_fee),
        };
      });
      if (new Set(skills.map((s) => s.skill_id)).size !== skills.length)
        throw new BadRequestException();
      return { ...base, action, skills };
    }
    case "service-areas":
      return {
        ...base,
        action,
        areas: array(v.areas, (value) => {
          const a = object(value, [
            "label",
            "center",
            "radius_m",
            "boundary_geojson",
          ]);
          const boundary=polygonInput(a.boundary_geojson);
          if (!(boundary&&a.radius_m===null)&&(
            !Number.isSafeInteger(a.radius_m) ||
            Number(a.radius_m) < 1 ||
            Number(a.radius_m) > 2147483647
          ))
            throw new BadRequestException();
          return {
            label: textInput(a.label),
            center: pointInput(a.center),
            radius_m: a.radius_m===null?null:Number(a.radius_m),
            boundary_geojson: boundary,
          };
        }),
      };
    case "locations":
      return {
        ...base,
        action,
        locations: array(v.locations, (value) => {
          const l = object(value, ["address", "public"]),
            a = object(l.address, ["text", "point"]);
          return {
            address: { text: textInput(a.text), point: pointInput(a.point) },
            public: bool(l.public),
          };
        }),
      };
  }
}

export function polygonInput(value:unknown):Area['boundary_geojson']{
 if(value==null)return null;const v=object(value,['type','coordinates']);
 if(v.type!=='MultiPolygon'||!Array.isArray(v.coordinates)||v.coordinates.length!==1||!Array.isArray(v.coordinates[0])||v.coordinates[0].length!==1)throw new BadRequestException();
 const ring=v.coordinates[0][0];if(!Array.isArray(ring)||ring.length<4||ring.length>101)throw new BadRequestException();
 for(const p of ring){if(!Array.isArray(p)||p.length!==2)throw new BadRequestException();pointInput({longitude:p[0],latitude:p[1]});}
 if(ring[0][0]!==ring.at(-1)[0]||ring[0][1]!==ring.at(-1)[1]||new Set(ring.slice(0,-1).map(p=>JSON.stringify(p))).size!==ring.length-1||ring.some((p,i)=>i>0&&Math.abs(p[0]-ring[i-1][0])>180))throw new BadRequestException();
 return {type:'MultiPolygon',coordinates:v.coordinates as number[][][][]};
}

export function deactivationInput(value:unknown){
 const v=object(value,['expected_version','reason']);
 if(!Number.isSafeInteger(v.expected_version)||Number(v.expected_version)<1)throw new BadRequestException();
 const reason=textInput(v.reason);if(reason.length>1000)throw new BadRequestException();
 return {expected_version:Number(v.expected_version),reason};
}

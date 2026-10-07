import { afterEach, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { databaseFixture } from "../helpers/database.js";
import { stableId } from "../../src/database/seed.js";
let f: Awaited<ReturnType<typeof databaseFixture>>;
let token: string, user: string;
const skill = stableId("socket_replacement"),
  otherSkill = stableId("camera_mounting");
const point = { latitude: 21.0285, longitude: 105.8542 };
async function call(
  path: string,
  method = "GET",
  body?: unknown,
  access: string | null = token,
  key = randomUUID(),
) {
  const response = await fetch(f.base + path, {
    method,
    headers: {
      ...(access ? { Authorization: `Bearer ${access}` } : {}),
      "Content-Type": "application/json",
      "Idempotency-Key": key,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, body: await response.json() };
}
beforeEach(async () => {
  f = await databaseFixture("partner-test-secret".repeat(3));
  const r = await call(
    "/auth/register",
    "POST",
    {
      email: "owner@example.test",
      password: "partner test password 2026",
      display_name: "Test owner",
    },
    null,
  );
  token = r.body.access_token;
  user = r.body.user.id;
  await f.pool.query(
    "INSERT INTO identities(user_id,provider,subject,verified_at) VALUES($1,'phone','+84900000001',now())",
    [user],
  );
});
afterEach(async () => {
  await f?.close();
});
const create = async (kind = "solo", name = "Test provider") => {
  const r = await call("/partners", "POST", { kind, name });
  assert.equal(r.status, 201);
  return r.body;
};
async function edit(
  p: { id: string; version: number },
  action: string,
  body: Record<string, unknown>,
) {
  const r = await call(`/partners/${p.id}/${action}`, "PUT", {
    expected_version: p.version,
    ...body,
  });
  assert.equal(r.status, 200, JSON.stringify(r));
  return r.body;
}
async function ready(name = "Test provider", mode = "at_customer") {
  let p = await create("solo", name);
  p = await edit(p, "skills", {
    skills: [{ skill_id: skill, modes: [mode], reference_labor: "0" }],
  });
  if (mode === "at_shop")
    p = await edit(p, "locations", {
      locations: [{ address: { text: "Public shop", point }, public: true }],
    });
  else
    p = await edit(p, "service-areas", {
      areas: [{ label: "Hanoi", center: point, radius_m: 5000 }],
    });
  p = await edit(p, "publication", { publication_status: "published" });
  return edit(p, "availability", { accepting_jobs: true });
}
const query = (tail = "") =>
  `/partners?latitude=${point.latitude}&longitude=${point.longitude}&sort=distance${tail}`;

test("verified account creates draft + owner + empty wallet atomically; Me derives verification and memberships", async () => {
  const key = randomUUID(),
    input = {
      kind: "company",
      name: "Company test",
      bio: "First line\nSecond line",
    };
  const a = await call("/partners", "POST", input, token, key),
    b = await call("/partners", "POST", input, token, key);
  assert.equal(a.status, 201);
  assert.deepEqual(a.body, b.body);
  assert.equal(a.body.bio, input.bio);
  assert.equal(a.body.publication_status, "draft");
  assert.equal(a.body.verification_status, "unverified");
  assert.equal(a.body.accepting_jobs, false);
  const me = (await call("/me")).body;
  assert.equal(me.phone_verified, true);
  assert.equal(me.email_verified, false);
  assert.deepEqual(me.partner_ids, [a.body.id]);
  assert.equal(
    (
      await f.pool.query(
        "SELECT balance::text FROM ledger_accounts WHERE owner_partner_id=$1",
        [a.body.id],
      )
    ).rows[0].balance,
    "0",
  );
  assert.equal(
    (
      await call(
        "/partners",
        "POST",
        { ...input, name: "Different" },
        token,
        key,
      )
    ).status,
    409,
  );
  assert.equal(
    (await call("/partners/" + a.body.id, "GET", undefined, null)).status,
    404,
  );
  await f.pool.query(
    "UPDATE identities SET verified_at=NULL WHERE provider='phone'",
  );
  assert.equal((await call("/partners", "POST", input)).status, 403);
});
test("publication requires eligible skills and location for every mode, does not turn on availability", async () => {
  let p = await create();
  assert.equal(
    (
      await call(`/partners/${p.id}/publication`, "PUT", {
        expected_version: 1,
        publication_status: "published",
      })
    ).status,
    400,
  );
  p = await edit(p, "skills", {
    skills: [{ skill_id: skill, modes: ["at_shop", "at_customer"] }],
  });
  p = await edit(p, "service-areas", {
    areas: [{ label: "Area", center: point, radius_m: 1000 }],
  });
  assert.equal(
    (
      await call(`/partners/${p.id}/publication`, "PUT", {
        expected_version: p.version,
        publication_status: "published",
      })
    ).status,
    400,
  );
  p = await edit(p, "locations", {
    locations: [{ address: { text: "Shop", point }, public: false }],
  });
  assert.equal(
    (
      await call(`/partners/${p.id}/publication`, "PUT", {
        expected_version: p.version,
        publication_status: "published",
      })
    ).status,
    400,
  );
  p = await edit(p, "locations", {
    locations: [{ address: { text: "Shop", point }, public: true }],
  });
  p = await edit(p, "publication", { publication_status: "published" });
  assert.equal(p.accepting_jobs, false);
  assert.deepEqual((await call(query())).body.items, []);
});
test("only owner or active profile.manage grant can read/write; replay rechecks grants and sessions", async () => {
  const p = await ready();
  const outsider = await call(
      "/auth/register",
      "POST",
      {
        email: "other@example.test",
        password: "partner test password 2026",
        display_name: "Other",
      },
      null,
    ),
    t = outsider.body.access_token;
  assert.equal(
    (await call(`/partners/${p.id}/management`, "GET", undefined, t)).status,
    404,
  );
  const {
    rows: [m],
  } = await f.pool.query(
    "INSERT INTO memberships(user_id,partner_id) VALUES($1,$2) RETURNING id",
    [outsider.body.user.id, p.id],
  );
  assert.equal(
    (await call(`/partners/${p.id}/management`, "GET", undefined, t)).status,
    403,
  );
  await f.pool.query(
    "INSERT INTO membership_grants(membership_id,permission,granted_by) VALUES($1,'profile.manage',$2)",
    [m.id, user],
  );
  const key = randomUUID(),
    input = { expected_version: p.version, bio: "Changed by delegate" };
  assert.equal(
    (await call(`/partners/${p.id}/profile`, "PUT", input, t, key)).status,
    200,
  );
  await f.pool.query(
    "UPDATE membership_grants SET revoked_at=now() WHERE membership_id=$1",
    [m.id],
  );
  assert.equal(
    (await call(`/partners/${p.id}/profile`, "PUT", input, t, key)).status,
    403,
  );
  await call("/auth/logout", "POST");
  assert.equal((await call(`/partners/${p.id}/management`)).status, 401);
});
test("competing writes use shared version; invalid published edit rolls back; draft turns off work", async () => {
  let p = await ready();
  const results = await Promise.all(
    ["First", "Second"].map((name) =>
      call(`/partners/${p.id}/profile`, "PUT", {
        expected_version: p.version,
        name,
      }),
    ),
  );
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  p = (await call(`/partners/${p.id}/management`)).body;
  assert.equal(
    (
      await call(`/partners/${p.id}/skills`, "PUT", {
        expected_version: p.version,
        skills: [],
      })
    ).status,
    400,
  );
  assert.deepEqual((await call(`/partners/${p.id}/management`)).body, p);
  p = await edit(p, "publication", { publication_status: "draft" });
  assert.equal(p.accepting_jobs, false);
  assert.deepEqual((await call(query())).body.items, []);
});
test("search filters first, computes PostGIS distance, deduplicates and binds signed cursor to all filters", async () => {
  const a = await ready("A"),
    b = await ready("B");
  await f.pool.query(
    "INSERT INTO service_areas(partner_id,label,center,radius_m) SELECT partner_id,label,center,radius_m FROM service_areas WHERE partner_id=$1",
    [a.id],
  );
  const first = await call(query("&limit=1"));
  assert.equal(first.status, 200);
  assert.equal(first.body.items.length, 1);
  assert.equal(first.body.items[0].distance_m, 0);
  assert.equal(first.body.items[0].reference_labor, "0");
  const next = await call(
    query("&limit=1&cursor=" + encodeURIComponent(first.body.next_cursor)),
  );
  assert.equal(next.status, 200);
  assert.equal(next.body.next_cursor, null);
  assert.notEqual(next.body.items[0].id, first.body.items[0].id);
  assert.equal(
    (
      await call(
        query(
          "&radius_m=20000&cursor=" +
            encodeURIComponent(first.body.next_cursor),
        ),
      )
    ).status,
    400,
  );
  assert.equal((await call(query("&cursor=bad"))).status, 400);
  assert.equal((await call(query("&verified=true"))).body.items.length, 0);
  await edit(b, "availability", { accepting_jobs: false });
  assert.equal((await call(query())).body.items.length, 1);
  await f.pool.query(
    "UPDATE partners SET moderation_status='new_work_suspended' WHERE id=$1",
    [a.id],
  );
  assert.deepEqual((await call(query())).body.items, []);
});
test("service area coverage AND search radius, exact skill/mode/category matching, inactive hierarchy", async () => {
  const p = await ready();
  assert.equal(
    (await call(query("&skill_id=" + otherSkill))).body.items.length,
    0,
  );
  assert.equal(
    (await call(query("&category_id=" + stableId("home_utilities")))).body.items
      .length,
    1,
  );
  assert.equal(
    (await call(query("&category_id=" + stableId("beauty")))).body.items.length,
    0,
  );
  // A shop-mode match on a different skill must not make this skill available at shop.
  await f.pool.query(
    "INSERT INTO partner_skills(partner_id,skill_id,modes) VALUES($1,$2,ARRAY['at_shop'])",
    [p.id, otherSkill],
  );
  await f.pool.query(
    "INSERT INTO partner_locations(partner_id,address_text,point) VALUES($1,'Shop',ST_SetSRID(ST_MakePoint($2,$3),4326)::geography)",
    [p.id, point.longitude, point.latitude],
  );
  assert.equal(
    (await call(query("&skill_id=" + skill + "&service_mode=at_shop"))).body
      .items.length,
    0,
  );
  assert.equal(
    (
      await call(
        `/partners?latitude=21.0485&longitude=${point.longitude}&radius_m=1000&service_mode=at_customer`,
      )
    ).body.items.length,
    0,
  );
  assert.equal(
    (
      await call(
        `/partners?latitude=21.0485&longitude=${point.longitude}&radius_m=5000&service_mode=at_customer`,
      )
    ).body.items.length,
    1,
  );
  await f.pool.query(
    "UPDATE service_areas SET radius_m=1000 WHERE partner_id=$1",
    [p.id],
  );
  assert.equal(
    (
      await call(
        `/partners?latitude=21.0485&longitude=${point.longitude}&radius_m=5000&service_mode=at_customer`,
      )
    ).body.items.length,
    0,
  );
  await f.pool.query(
    "UPDATE categories SET active=false WHERE code='home_utilities'",
  );
  assert.equal((await call(query("&skill_id=" + skill))).body.items.length, 0);
});
test("public profile whitelists fields, private locations/contact hidden; authenticated own profile cannot hire", async () => {
  let p = await ready();
  p = await edit(p, "profile", {
    bio: "Services\nContact us for details",
    phone: "Public-contact",
    zalo: "Chat-contact",
  });
  p = await edit(p, "locations", {
    locations: [
      { address: { text: "Private home", point }, public: false },
      { address: { text: "Public shop", point }, public: true },
    ],
  });
  await f.pool.query(
    `UPDATE partners SET profile=profile || '{"secret_document":"private-file","bank":"private-bank"}'::jsonb WHERE id=$1`,
    [p.id],
  );
  const anon = (await call("/partners/" + p.id, "GET", undefined, null)).body;
  assert.equal(anon.bio, "Services\nContact us for details");
  assert.equal(anon.contact, null);
  assert.equal(anon.can_hire, false);
  assert.equal(anon.can_message, false);
  assert.deepEqual(
    anon.public_addresses.map((a: { text: string }) => a.text),
    ["Public shop"],
  );
  assert.ok(!JSON.stringify(anon).includes("private"));
  assert.ok(!("version" in anon));
  assert.ok(!("areas" in anon));
  const signed = (await call("/partners/" + p.id)).body;
  assert.equal(signed.contact.phone, "Public-contact");
  assert.equal(signed.can_hire, false);
  assert.equal(
    (await call("/partners/" + p.id, "GET", undefined, "invalid")).status,
    401,
  );
});
test("create transaction rolls back membership and partner if wallet creation fails", async () => {
  await f.pool.query(
    "CREATE FUNCTION reject_wallet() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test rollback'; END $$",
  );
  await f.pool.query(
    "CREATE TRIGGER reject_wallet BEFORE INSERT ON ledger_accounts FOR EACH ROW EXECUTE FUNCTION reject_wallet()",
  );
  assert.equal(
    (await call("/partners", "POST", { kind: "shop", name: "Rollback" }))
      .status,
    500,
  );
  assert.equal(
    (await f.pool.query("SELECT count(*) FROM partners")).rows[0].count,
    "0",
  );
  assert.equal(
    (await f.pool.query("SELECT count(*) FROM memberships")).rows[0].count,
    "0",
  );
});
test("malformed requests and unsupported ranking/polygons fail safely", async () => {
  for (const path of [
    "/partners",
    "/partners?latitude=NaN&longitude=0",
    query("&limit=101"),
    query("&sort=recommended"),
    query("&latitude=1"),
    query("&verified=1"),
    query("&min_stars=3"),
  ])
    assert.equal((await call(path)).status, 400, path);
  const p = await create();
  for (const fields of [{ name: "Bad\nname" }, { bio: "Bad\u0000bio" }]) {
    assert.equal(
      (
        await call(`/partners/${p.id}/profile`, "PUT", {
          expected_version: p.version,
          ...fields,
        })
      ).status,
      400,
    );
  }
  for (const skills of [
    [{ skill_id: skill, modes: [] }],
    [{ skill_id: skill, modes: ["at_shop"], reference_labor: 1.5 }],
    [{ skill_id: skill, modes: ["at_shop", "at_shop"] }],
  ])
    assert.equal(
      (
        await call(`/partners/${p.id}/skills`, "PUT", {
          expected_version: p.version,
          skills,
        })
      ).status,
      400,
    );
  assert.equal(
    (
      await call(`/partners/${p.id}/service-areas`, "PUT", {
        expected_version: p.version,
        areas: [
          { label: "A", center: { latitude: 91, longitude: 0 }, radius_m: 1 },
        ],
      })
    ).status,
    400,
  );
});

test("management, distance results and localized public profile match approved contracts; create replay checks current membership", async () => {
  const { readFile } = await import("node:fs/promises");
  const { Ajv2020 } = await import("ajv/dist/2020.js");
  const { default: formats } = await import("ajv-formats");
  const spec = JSON.parse(
    await readFile(
      new URL(
        "../../../../docs/technical-design/openapi.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const ajv = new Ajv2020({ strict: false });
  (formats as unknown as (x: typeof ajv) => void)(ajv);
  const matches = (name: string, body: unknown) => {
    const valid = ajv.compile({
      ...spec.components.schemas[name],
      components: spec.components,
    });
    assert.ok(valid(body), JSON.stringify(valid.errors));
  };
  const p = await ready();
  matches("PartnerManagement", p);
  const profile = (
    await call(`/partners/${p.id}?locale=ja`, "GET", undefined, null)
  ).body;
  matches("PartnerProfile", profile);
  assert.equal(profile.skills[0].name_locale, "ja");
  assert.notEqual(profile.skills[0].name, profile.skills[0].name_vi);
  matches("searchPartnersPage", (await call(query())).body);
  const key = randomUUID(),
    input = { kind: "solo", name: "Replay owner" };
  const draft = await call("/partners", "POST", input, token, key);
  await f.pool.query(
    "UPDATE memberships SET active=false WHERE partner_id=$1",
    [draft.body.id],
  );
  assert.equal(
    (await call("/partners", "POST", input, token, key)).status,
    404,
  );
});

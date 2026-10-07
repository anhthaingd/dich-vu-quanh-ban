// Explicit developer fixture command. Never called by migrations, API startup or production.
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import { createApp } from '../bootstrap.js';
import { migrate } from './migrate.js';
import { seed, stableId } from './seed.js';
import { AuthService } from '../modules/auth/auth.service.js';
import { PartnersService } from '../modules/partners/partners.service.js';
import { requireLocalDemoDatabase } from './demo-options.js';

const url = requireLocalDemoDatabase(
  process.env.DATABASE_URL,
  process.env.NODE_ENV
);
const file = resolve('../../.local/demo-partners.json');
const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 3000 });
let app: Awaited<ReturnType<typeof createApp>> | undefined;
try {
  try {
    await readFile(file);
    throw new Error(
      'Demo credentials already exist at .local/demo-partners.json; reuse those accounts. No data changed.'
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  await migrate(pool);
  await seed(pool);
  app = await createApp(
    {
      databaseUrl: url,
      cursorSecret: randomBytes(48).toString('hex'),
      authSecret: randomBytes(48).toString('hex'),
      port: 0,
      host: '127.0.0.1'
    },
    pool
  );
  await app.init();
  const auth = app.get(AuthService),
    partners = app.get(PartnersService);
  const accounts: {
    kind: string;
    email: string;
    password: string;
    user_id?: string;
    partner_id?: string;
  }[] = [];
  const point = { latitude: 21.0285, longitude: 105.8542 };
  const save = async () => {
    await mkdir(resolve('../../.local'), { recursive: true });
    await writeFile(
      file,
      JSON.stringify(
        {
          purpose: 'LOCAL DEMO ONLY — not real providers or real verification',
          point,
          accounts
        },
        null,
        2
      ) + '\n',
      { mode: 0o600 }
    );
  };
  for (const kind of ['solo', 'shop', 'company'] as const) {
    const email = `demo-${kind}-${randomUUID()}@example.test`,
      password = randomBytes(24).toString('base64url');
    const record: (typeof accounts)[number] = { kind, email, password };
    accounts.push(record);
    // Save credentials before creating the account so an interrupted run is recoverable.
    await save();
    const session = await auth.register(email, password, `DEMO ${kind}`);
    record.user_id = session.user.id;
    await save();
    await pool.query(
      "INSERT INTO identities(user_id,provider,subject,verified_at) VALUES($1,'phone',$2,now())",
      [record.user_id, `local-demo:${record.user_id}`]
    );
    const header = `Bearer ${session.access_token}`;
    let partner = await partners.create(
      header,
      {
        kind,
        name: `DEMO ${kind} — Hà Nội`,
        bio: 'Dữ liệu thử tại máy phát triển. Không phải đơn vị cung cấp thật.'
      },
      randomUUID()
    );
    record.partner_id = partner.id;
    await save();
    partner = await partners.edit(
      header,
      partner.id,
      {
        action: 'skills',
        expected_version: partner.version,
        skills: [
          {
            skill_id: stableId('socket_replacement'),
            modes: [kind === 'shop' ? 'at_shop' : 'at_customer'],
            reference_labor: '100000',
            inspection_fee: null,
            travel_fee: null
          }
        ]
      },
      randomUUID()
    );
    partner =
      kind === 'shop'
        ? await partners.edit(
            header,
            partner.id,
            {
              action: 'locations',
              expected_version: partner.version,
              locations: [
                {
                  address: { text: 'DEMO — cửa hàng thử Hà Nội', point },
                  public: true
                }
              ]
            },
            randomUUID()
          )
        : await partners.edit(
            header,
            partner.id,
            {
              action: 'service-areas',
              expected_version: partner.version,
              areas: [
                {
                  label: 'DEMO — vùng thử Hà Nội',
                  center: point,
                  radius_m: 5000,
                  boundary_geojson: null
                }
              ]
            },
            randomUUID()
          );
    partner = await partners.edit(
      header,
      partner.id,
      {
        action: 'publication',
        expected_version: partner.version,
        publication_status: 'published'
      },
      randomUUID()
    );
    await partners.edit(
      header,
      partner.id,
      {
        action: 'availability',
        expected_version: partner.version,
        accepting_jobs: true
      },
      randomUUID()
    );
  }
  console.log(
    'Created 3 local DEMO accounts. Credentials: .local/demo-partners.json (gitignored). No real contact data or funded wallets.'
  );
} finally {
  await app?.close();
  await pool.end();
}

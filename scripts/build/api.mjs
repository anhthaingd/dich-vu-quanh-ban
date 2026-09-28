import { cp } from 'node:fs/promises';
// tsc preserves src/database; runtime SQL and fixtures retain the same relative paths.
for (const name of ['migrations', 'seeds']) await cp(new URL(`../../services/api/${name}`, import.meta.url), new URL(`../../services/api/dist/${name}`, import.meta.url), { recursive: true });

import { rm } from 'node:fs/promises';
// Remove generated output so moved/deleted source cannot survive in a build.
await rm(new URL('../../services/api/dist/', import.meta.url), { recursive: true, force: true });

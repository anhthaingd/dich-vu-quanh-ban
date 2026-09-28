import { createApp } from './app.js';
import { config } from './config.js';
try {
  const settings = config();
  const app = await createApp(settings);
  await app.listen(settings.port, settings.host);
  console.log(`API listening on ${settings.host}:${settings.port}`);
} catch {
  console.error('API could not start. Check environment configuration and port availability.');
  process.exitCode = 1;
}

export function requireLocalDemoDatabase(
  value: string | undefined,
  environment: string | undefined
): string {
  if (!value || environment !== 'development')
    throw new Error('DEMO requires NODE_ENV=development and DATABASE_URL');
  const url = new URL(value);
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
    url.pathname !== '/dvqb_local' ||
    url.search
  )
    throw new Error(
      'DEMO is restricted to the local dvqb_local database without connection overrides'
    );
  return value;
}

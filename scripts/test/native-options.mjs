export function requireTestDatabase(value) {
  const url = new URL(value);
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.pathname !== '/dvqb_test' || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) {
    throw Error('Native tests require a local dvqb_test database');
  }
  return value;
}

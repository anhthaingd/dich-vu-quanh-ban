import { LocaleState } from './locale-state';
const storage = (value: string | null = null) => ({ read: jest.fn().mockResolvedValue(value), write: jest.fn().mockResolvedValue(undefined) });
test.each([null, 'unknown', 'en', 'ja'])('cold start validates persisted locale %s', async saved => {
  const manager = new LocaleState(storage(saved));
  await manager.restore();
  expect(manager.getSnapshot()).toMatchObject({ locale: saved === 'en' || saved === 'ja' ? saved : 'vi', ready: true, error: null });
});
test('read failure offers safe default; choosing again persists the recovery', async () => {
  const s = storage(); s.read.mockRejectedValueOnce(Error('PRIVATE_CANARY'));
  const manager = new LocaleState(s); await manager.restore();
  expect(manager.getSnapshot()).toMatchObject({ locale: 'vi', ready: true, error: 'READ_FAILED' });
  await manager.select('en'); expect(manager.getSnapshot()).toMatchObject({ locale: 'en', error: null });
  expect(s.write).toHaveBeenCalledWith('en');
});
test('failed write retains previous locale and a retry succeeds; errors never include raw storage data', async () => {
  const s = storage('ja'); const manager = new LocaleState(s);
  await manager.restore(); s.write.mockRejectedValueOnce(Error('PRIVATE_CANARY'));
  await manager.select('en'); expect(manager.getSnapshot()).toMatchObject({ locale: 'ja', busy: false, error: 'WRITE_FAILED' });
  expect(JSON.stringify(manager.getSnapshot())).not.toContain('CANARY');
  await manager.select('en'); expect(manager.getSnapshot()).toMatchObject({ locale: 'en', error: null });
});
test('hydration runs once, early taps cannot race it and concurrent writes are blocked', async () => {
  const s = storage(); let read!: (s: string) => void, written!: () => void;
  s.read.mockImplementationOnce(() => new Promise(resolve => { read = resolve; }));
  const manager = new LocaleState(s), changed = jest.fn(); const unsubscribe = manager.subscribe(changed);
  const pending = manager.restore(); expect(manager.restore()).toBe(pending);
  await manager.select('en'); expect(s.write).not.toHaveBeenCalled();
  read('ja'); await pending;
  s.write.mockImplementationOnce(() => new Promise<void>(resolve => { written = resolve; }));
  const write = manager.select('en'); await manager.select('vi');
  expect(s.write).toHaveBeenCalledTimes(1); expect(manager.getSnapshot().locale).toBe('ja');
  written(); await write; expect(manager.getSnapshot().locale).toBe('en');
  unsubscribe(); changed.mockClear(); await manager.select('vi'); expect(changed).not.toHaveBeenCalled();
});

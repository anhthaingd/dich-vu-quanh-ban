import { createCatalogApi } from './api';
test('reads every page without replacing API errors with mock', async () => {
  const request = jest.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ items: [{ id: 'a' }], next_cursor: 'next' }) }).mockResolvedValueOnce({ ok: true, json: async () => ({ items: [{ id: 'b' }], next_cursor: null }) });
  expect(await createCatalogApi('http://localhost:3100/v1', request).categories()).toEqual([{ id: 'a' }, { id: 'b' }]);
  expect(request.mock.calls[1][0]).toContain('cursor=next');
  await expect(createCatalogApi(undefined, request).categories()).rejects.toThrow('Chưa cấu hình');
  await expect(createCatalogApi('http://localhost', jest.fn().mockResolvedValue({ ok: false })).categories()).rejects.toThrow('Không tải');
});

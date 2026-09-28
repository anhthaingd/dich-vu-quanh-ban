import { createCatalogApi } from './catalog-api';
test('reads every page without replacing API errors with mock', async () => {
  const request = jest.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ items: [{ id: 'a', code: 'a', name_vi: 'A', active: true, parent_id: null }], next_cursor: 'next' }) }).mockResolvedValueOnce({ ok: true, json: async () => ({ items: [{ id: 'b', code: 'b', name_vi: 'B', active: true, parent_id: null }], next_cursor: null }) });
  expect(await createCatalogApi('http://localhost:3100/v1', request).categories()).toEqual([{ id: 'a', code: 'a', name_vi: 'A', active: true, parent_id: null }, { id: 'b', code: 'b', name_vi: 'B', active: true, parent_id: null }]);
  expect(request.mock.calls[1][0]).toContain('cursor=next');
  await expect(createCatalogApi(undefined, request).categories()).rejects.toThrow('Chưa cấu hình');
  await expect(createCatalogApi('http://localhost', jest.fn().mockResolvedValue({ ok: false })).categories()).rejects.toThrow('Không tải');
});
test('HTTP error preserves safe server request ID and typed error code', async () => {
  const id = 'd28753c2-a88f-4eb5-9df1-e7c8fdfe604c';
  const request = jest.fn().mockResolvedValue({ ok: false, status: 503, headers: { get: () => id }, json: async () => ({ code: 'SERVICE_UNAVAILABLE', message: 'SECRET', correlation_id: id }) });
  await expect(createCatalogApi('http://localhost', request).categories()).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE', requestId: id, status: 503 });
});
test.each([null, {}, { items: [], next_cursor: '' }, { items: [], next_cursor: 2 }, { items: [null], next_cursor: null }, { items: [{ id: 1 }], next_cursor: null }, { items: [{ id: 'a', code: 'a', name_vi: 'A', active: 'yes' }], next_cursor: null }])('rejects malformed response %j', async value => {
  const request = jest.fn().mockResolvedValue({ ok: true, json: async () => value });
  await expect(createCatalogApi('http://localhost', request).categories()).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
});
test('repeating cursor fails without infinite loop', async () => {
  const request = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [], next_cursor: 'repeat' }) });
  await expect(createCatalogApi('http://localhost', request).categories()).rejects.toMatchObject({ code: 'INVALID_RESPONSE' }); expect(request).toHaveBeenCalledTimes(2);
});
test('skills validate category links and form schema', async () => {
  const item = { id: 's', code: 's', name_vi: 'Skill', schema_version: 1, form_schema: {}, category_ids: ['a'] };
  for (const value of [item, { ...item, form_schema: [] }, { ...item, category_ids: [1] }, { ...item, schema_version: 0 }]) {
    const request = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [value], next_cursor: null }) });
    const result = createCatalogApi('http://localhost/', request).skills('a');
    if (value === item) expect(await result).toEqual([item]); else await expect(result).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  }
});

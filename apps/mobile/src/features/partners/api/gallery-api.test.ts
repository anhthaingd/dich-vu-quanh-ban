import { createGalleryApi, photoProblem } from './gallery-api';
import { ApiError } from '../../../lib/http/api-error';
import { errorText } from '../../../lib/errors/describe';

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

test('local photo checks name the exact problem', () => {
  expect(photoProblem({ type: 'image/heic', size: 10 })).toBe('ASSET_TYPE_UNSUPPORTED');
  expect(photoProblem({ type: 'image/png', size: 0 })).toBe('ASSET_SIZE_INVALID');
  expect(photoProblem({ type: 'image/png', size: 10 * 1024 * 1024 + 1 })).toBe('ASSET_TOO_LARGE');
  expect(photoProblem({ type: 'image/webp', size: 1 })).toBeUndefined();
  expect(errorText('vi', { code: 'VALIDATION', reason: 'ASSET_TOO_LARGE' })).toContain('10 MB');
});

test('upload rejects oversize photos before any request and keeps the reason of a failed upload', async () => {
  const transport = jest.fn();
  const api = createGalleryApi('http://api.test', transport as unknown as typeof fetch);
  await expect(api.upload('token', new Blob([new Uint8Array(1)], { type: 'image/gif' }), 'key')).rejects.toMatchObject({ code: 'VALIDATION', reason: 'ASSET_TYPE_UNSUPPORTED' });
  expect(transport).not.toHaveBeenCalled();

  const grant = { asset_id: 'a', upload_url: 'http://api.test/v1/assets/a/upload?grant=x', expires_at: '2099-01-01T00:00:00Z', required_headers: { 'Content-Type': 'image/png' } };
  transport.mockResolvedValueOnce(json(201, grant))
    .mockResolvedValueOnce(json(200, { id: 'a', status: 'pending', download_url: null, expires_at: null }))
    .mockResolvedValueOnce(json(400, { code: 'VALIDATION', reason: 'ASSET_SIZE_MISMATCH', message: 'x' }));
  const error = await api.upload('token', new Blob(['png'], { type: 'image/png' }), 'key').catch((e: unknown) => e);
  expect(error).toBeInstanceOf(ApiError);
  expect(error).toMatchObject({ code: 'VALIDATION', reason: 'ASSET_SIZE_MISMATCH', status: 400 });

  transport.mockResolvedValueOnce(json(201, grant))
    .mockResolvedValueOnce(json(200, { id: 'a', status: 'pending', download_url: null, expires_at: null }))
    .mockResolvedValueOnce(json(503, { code: 'SERVICE_UNAVAILABLE', reason: 'ASSET_STORAGE_UNAVAILABLE' }));
  await expect(api.upload('token', new Blob(['png'], { type: 'image/png' }), 'key')).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE', reason: 'ASSET_STORAGE_UNAVAILABLE' });
});

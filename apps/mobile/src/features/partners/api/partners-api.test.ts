import {
  createPartnersApi,
  isCard,
  isPartner,
  isProfile
} from './partners-api';
import { ApiError } from '../../../lib/http/api-error';
const id = 'b830a5d6-b9e0-4000-a000-61f8a8fc3391';
const p = {
  id,
  kind: 'solo',
  name: 'Test',
  bio: '',
  phone: '',
  zalo: '',
  version: 1,
  verification_status: 'unverified',
  publication_status: 'draft',
  moderation_status: 'active',
  accepting_jobs: false,
  skills: [],
  areas: [],
  locations: []
};
const response = (value: unknown) => ({
  ok: true,
  status: 200,
  headers: new Headers(),
  json: async () => value
});
test('management response validation protects editor and preserves null vs zero price', () => {
  expect(isPartner(p)).toBe(true);
  expect(isPartner({ ...p, version: 0 })).toBe(false);
  expect(
    isPartner({
      ...p,
      areas: [
        {
          label: 'A',
          center: { latitude: 100, longitude: 0 },
          radius_m: 10,
          boundary_geojson: null
        }
      ]
    })
  ).toBe(false);
  const card = {
    id,
    name: 'Test',
    kind: 'shop',
    verification_status: 'unverified',
    distance_m: 0,
    distance_kind: 'shop',
    stars: null,
    review_count: 0,
    reference_labor: '0'
  };
  expect(isCard(card)).toBe(true);
  expect(isCard({ ...card, reference_labor: null })).toBe(true);
  expect(isCard({ ...card, distance_m: -1 })).toBe(false);
  expect(isCard({ ...card, reference_labor: 0 })).toBe(false);
  expect(
    isProfile({
      id,
      name: 'Test',
      kind: 'solo',
      bio: '',
      verification_status: 'unverified',
      skills: [],
      public_addresses: [],
      contact: null,
      can_hire: false,
      can_message: false
    })
  ).toBe(true);
});
test('write sends bearer, stable retry key and expected version without internal action field', async () => {
  const transport = jest.fn().mockResolvedValue(response(p));
  const api = createPartnersApi('http://localhost/v1', transport);
  await api.edit(
    'secret',
    id,
    { action: 'availability', expected_version: 1, accepting_jobs: true },
    'key'
  );
  const [url, options] = transport.mock.calls[0];
  expect(url).toContain(`/partners/${id}/availability`);
  expect(options.headers).toMatchObject({
    Authorization: 'Bearer secret',
    'Idempotency-Key': 'key'
  });
  expect(JSON.parse(options.body)).toEqual({
    expected_version: 1,
    accepting_jobs: true
  });
});
test('search is public, profile locale explicit, malformed response is rejected', async () => {
  const transport = jest
    .fn()
    .mockResolvedValueOnce(response({ items: [], next_cursor: null }))
    .mockResolvedValueOnce(response({ bad: true }));
  const api = createPartnersApi('http://localhost/v1', transport);
  await api.search({
    latitude: 21,
    longitude: 105,
    radius_m: 10000,
    verified: false
  });
  expect(transport.mock.calls[0][0]).toContain('sort=distance');
  expect(transport.mock.calls[0][1].headers.Authorization).toBeUndefined();
  await expect(api.profile(id, 'ja')).rejects.toEqual(
    expect.objectContaining({ code: 'INVALID_RESPONSE' })
  );
  expect(transport.mock.calls[1][0]).toContain('locale=ja');
  await expect(
    createPartnersApi(undefined, transport).management('secret', id)
  ).rejects.toBeInstanceOf(ApiError);
});

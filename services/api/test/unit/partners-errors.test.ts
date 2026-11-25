import assert from 'node:assert/strict';
import test from 'node:test';
import { HttpException } from '@nestjs/common';
import { createInput, deactivationInput, editInput, polygonInput, pointInput, textInput } from '../../src/modules/partners/partners.input.js';
import { searchInput } from '../../src/modules/search/search.query.js';
import { parseQuery } from '../../src/modules/catalog/catalog.query.js';
import { locationInput } from '../../src/modules/locations/locations.input.js';

const ID = '7d3c1b0e-7a6f-4b52-9c1e-0f4c8b7a9d21';
// Asserts the 400 body names the exact cause (and field) without echoing input.
function rejects(fn: () => unknown, reason: string, field?: string) {
  assert.throws(fn, (e: unknown) => {
    assert.ok(e instanceof HttpException);
    assert.equal(e.getStatus(), 400);
    assert.deepEqual(e.getResponse(), { reason, ...(field ? { field } : {}) });
    return true;
  });
}

test('partner create/edit inputs name the field and rule that failed', () => {
  rejects(() => createInput({ kind: 'robot', name: 'A' }), 'PARTNER_KIND_INVALID', 'kind');
  rejects(() => createInput({ kind: 'solo', name: '   ' }), 'PARTNER_NAME_REQUIRED', 'name');
  rejects(() => createInput({ kind: 'solo' }), 'PARTNER_NAME_REQUIRED', 'name');
  rejects(() => createInput({ kind: 'solo', name: 'A\u0007' }), 'PARTNER_NAME_INVALID', 'name');
  rejects(() => createInput({ kind: 'solo', name: 'A', bio: 7 }), 'PARTNER_BIO_INVALID', 'bio');
  rejects(() => editInput('profile', { expected_version: 0 }), 'EXPECTED_VERSION_REQUIRED', 'expected_version');
  rejects(() => editInput('profile', { expected_version: 1, phone: 'x\u0001' }), 'PARTNER_PHONE_INVALID', 'phone');
  rejects(() => editInput('availability', { expected_version: 1, accepting_jobs: 'yes' }), 'PARTNER_ACCEPTING_JOBS_INVALID', 'accepting_jobs');
  rejects(() => editInput('publication', { expected_version: 1, publication_status: 'live' }), 'PARTNER_PUBLICATION_STATUS_INVALID', 'publication_status');
});

test('gallery and skills inputs separate each rule', () => {
  rejects(() => editInput('gallery', { expected_version: 1, asset_ids: 'x' }), 'PARTNER_GALLERY_INVALID', 'asset_ids');
  rejects(() => editInput('gallery', { expected_version: 1, asset_ids: ['nope'] }), 'PARTNER_GALLERY_IMAGE_INVALID', 'asset_ids');
  rejects(() => editInput('gallery', { expected_version: 1, asset_ids: [ID, ID] }), 'PARTNER_GALLERY_DUPLICATE', 'asset_ids');
  const many = Array.from({ length: 13 }, (_, i) => ID.slice(0, -2) + String(i).padStart(2, '0'));
  rejects(() => editInput('gallery', { expected_version: 1, asset_ids: many }), 'PARTNER_GALLERY_TOO_MANY', 'asset_ids');
  const skill = (s: Record<string, unknown>) => editInput('skills', { expected_version: 1, skills: [{ skill_id: ID, modes: ['at_shop'], ...s }] });
  rejects(() => skill({ modes: [] }), 'PARTNER_SKILL_MODE_REQUIRED', 'skills.modes');
  rejects(() => skill({ modes: ['fly'] }), 'PARTNER_SKILL_MODE_INVALID', 'skills.modes');
  rejects(() => skill({ modes: ['at_shop', 'at_shop'] }), 'PARTNER_SKILL_MODE_DUPLICATE', 'skills.modes');
  rejects(() => skill({ skill_id: 'x' }), 'PARTNER_SKILL_INVALID', 'skills.skill_id');
  rejects(() => skill({ travel_fee: '1.5' }), 'PARTNER_PRICE_INVALID', 'skills.travel_fee');
  rejects(() => editInput('skills', { expected_version: 1, skills: [{ skill_id: ID, modes: ['at_shop'] }, { skill_id: ID, modes: ['custom'] }] }), 'PARTNER_SKILL_DUPLICATE', 'skills.skill_id');
});

test('service area, location and deactivation inputs name the field', () => {
  const area = (a: Record<string, unknown>) => editInput('service-areas', { expected_version: 1, areas: [{ label: 'Q1', center: { latitude: 10, longitude: 106 }, radius_m: 1000, ...a }] });
  rejects(() => area({ radius_m: 0 }), 'PARTNER_AREA_RADIUS_INVALID', 'areas.radius_m');
  rejects(() => area({ label: '' }), 'PARTNER_AREA_LABEL_REQUIRED', 'areas.label');
  rejects(() => area({ center: { latitude: 99, longitude: 0 } }), 'PARTNER_AREA_CENTER_INVALID', 'areas.center');
  const ring = [[106, 10], [106.1, 10], [106.1, 10.1], [106, 10]];
  const shape = (r: unknown) => polygonInput({ type: 'MultiPolygon', coordinates: [[r]] });
  assert.ok(shape(ring));
  rejects(() => shape(ring.slice(1)), 'PARTNER_AREA_BOUNDARY_TOO_FEW_POINTS', 'areas.boundary_geojson');
  rejects(() => shape([...Array(101).fill([106, 10]), [106, 10]]), 'PARTNER_AREA_BOUNDARY_TOO_MANY_POINTS', 'areas.boundary_geojson');
  rejects(() => shape([...ring.slice(0, 3), [107, 11]]), 'PARTNER_AREA_BOUNDARY_NOT_CLOSED', 'areas.boundary_geojson');
  rejects(() => shape([[106, 10], [106.1, 10], [106.1, 10], [106, 10]]), 'PARTNER_AREA_BOUNDARY_DUPLICATE_POINT', 'areas.boundary_geojson');
  rejects(() => shape([[106, 10], [106.1, 10], [106.1, 99], [106, 10]]), 'PARTNER_AREA_BOUNDARY_INVALID', 'areas.boundary_geojson');
  const location = (l: Record<string, unknown>) => editInput('locations', { expected_version: 1, locations: [{ address: { text: '1 Lê Lợi', point: { latitude: 10, longitude: 106 } }, public: true, ...l }] });
  rejects(() => location({ public: 'yes' }), 'PARTNER_LOCATION_PUBLIC_INVALID', 'locations.public');
  rejects(() => location({ address: { text: ' ', point: { latitude: 10, longitude: 106 } } }), 'PARTNER_LOCATION_ADDRESS_REQUIRED', 'locations.address.text');
  rejects(() => location({ address: { text: 'A', point: { latitude: 10 } } }), 'PARTNER_LOCATION_POINT_INVALID', 'locations.address.point');
  rejects(() => deactivationInput({ expected_version: 1, reason: '' }), 'PARTNER_DEACTIVATION_REASON_REQUIRED', 'reason');
  rejects(() => deactivationInput({ expected_version: 1, reason: 'x'.repeat(1001) }), 'PARTNER_DEACTIVATION_REASON_TOO_LONG', 'reason');
});

test('shared text/point parsers stay bare for modules that bring their own reasons', () => {
  assert.throws(() => textInput(''), (e: unknown) => e instanceof HttpException && typeof e.getResponse() === 'object' && !('reason' in (e.getResponse() as object)));
  assert.throws(() => pointInput({ latitude: 91, longitude: 0 }), (e: unknown) => e instanceof HttpException && !('reason' in (e.getResponse() as object)));
});

test('search filters name the bad filter', () => {
  const q = { latitude: '10.7', longitude: '106.6' };
  assert.equal(searchInput(q).radius, 10000);
  rejects(() => searchInput({ ...q, latitude: '91' }), 'SEARCH_LOCATION_INVALID', 'latitude');
  rejects(() => searchInput({ longitude: '106' }), 'SEARCH_LOCATION_INVALID', 'latitude');
  rejects(() => searchInput({ ...q, radius_m: '0' }), 'SEARCH_RADIUS_INVALID', 'radius_m');
  rejects(() => searchInput({ ...q, radius_m: '1.5' }), 'SEARCH_RADIUS_INVALID', 'radius_m');
  rejects(() => searchInput({ ...q, sort: 'price' }), 'SEARCH_SORT_INVALID', 'sort');
  rejects(() => searchInput({ ...q, verified: 'yes' }), 'SEARCH_VERIFIED_INVALID', 'verified');
  rejects(() => searchInput({ ...q, service_mode: 'online' }), 'SEARCH_SERVICE_MODE_INVALID', 'service_mode');
  rejects(() => searchInput({ ...q, skill_id: 'x' }), 'SEARCH_SKILL_INVALID', 'skill_id');
  rejects(() => searchInput({ ...q, category_id: 'x' }), 'SEARCH_CATEGORY_INVALID', 'category_id');
  rejects(() => searchInput({ ...q, radius_m: ['1', '2'] }), 'SEARCH_FILTER_REPEATED', 'radius_m');
  rejects(() => searchInput({ ...q, price: '1' }), 'SEARCH_FILTER_UNKNOWN');
  rejects(() => searchInput({ ...q, limit: '0' }), 'LIMIT_INVALID', 'limit');
  rejects(() => searchInput({ ...q, cursor: 'x'.repeat(1025) }), 'CURSOR_INVALID', 'cursor');
});

test('catalog query names the bad parameter', () => {
  assert.equal(parseQuery({}, 'skills').locale, 'vi');
  rejects(() => parseQuery({ foo: '1' }, 'skills'), 'CATALOG_FILTER_UNKNOWN');
  rejects(() => parseQuery({ limit: ['1', '2'] }, 'skills'), 'CATALOG_FILTER_REPEATED', 'limit');
  rejects(() => parseQuery({ limit: '101' }, 'skills'), 'LIMIT_INVALID', 'limit');
  rejects(() => parseQuery({ category_id: 'x' }, 'skills'), 'CATALOG_CATEGORY_INVALID', 'category_id');
  rejects(() => parseQuery({ parent_id: 'x' }, 'categories'), 'CATALOG_PARENT_INVALID', 'parent_id');
  rejects(() => parseQuery({ cursor: '' }, 'categories'), 'CURSOR_INVALID', 'cursor');
  rejects(() => parseQuery({ locale: 'fr' }, 'categories'), 'LOCALE_INVALID', 'locale');
});

test('address lookup input names the bad field', () => {
  rejects(() => locationInput('autocomplete', { text: 'ab', locale: 'vi' }), 'LOCATION_QUERY_TOO_SHORT', 'text');
  rejects(() => locationInput('autocomplete', { text: 'a'.repeat(301), locale: 'vi' }), 'LOCATION_QUERY_TOO_LONG', 'text');
  rejects(() => locationInput('autocomplete', { text: 'Ha\u0000Noi', locale: 'vi' }), 'LOCATION_QUERY_INVALID', 'text');
  rejects(() => locationInput('autocomplete', { text: 'Hanoi', locale: 'fr' }), 'LOCALE_INVALID', 'locale');
  rejects(() => locationInput('geocode', { text: 'Hanoi', locale: 'vi', bias: { latitude: 0 } }), 'LOCATION_POINT_INVALID', 'bias');
  rejects(() => locationInput('reverse', { point: { latitude: 91, longitude: 0 }, locale: 'vi' }), 'LOCATION_POINT_INVALID', 'point');
});

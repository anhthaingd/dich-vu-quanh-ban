import { LocationDraft } from './location-draft';
import type { LocationsApi } from '../api/locations-api';
import { ApiError } from '../../../lib/http/api-error';
const p = { latitude: 21, longitude: 105 };
const item = { id: '1', text: 'Place', point: p, precision: 'approximate' as const };
const setup = () => { const api: jest.Mocked<LocationsApi> = { search: jest.fn().mockResolvedValue([item]), reverse: jest.fn().mockResolvedValue(item) }; return { api, draft: new LocationDraft(api) }; };
test('typing invalidates choice, descriptions keep pin, cancel keeps caller value unchanged', async () => {
 const { draft } = setup(); const listener = jest.fn(), off = draft.subscribe(listener);
 draft.choose(item); draft.describe('Floor 2'); expect(draft.getSnapshot().value).toMatchObject({ text: 'Floor 2', point: p }); expect(item.text).toBe('Place');
 draft.query('new'); expect(draft.getSnapshot().value).toBeNull(); await draft.search('autocomplete','vi'); expect(draft.getSnapshot().items).toEqual([item]);
 off(); draft.cancel(); expect(listener).toHaveBeenCalled();
});
test('late autocomplete cannot overwrite a newer query or a pin', async () => {
 const { draft, api } = setup(); let resolve!: (x: typeof item[]) => void;
 api.search.mockImplementationOnce(() => new Promise(r => { resolve = r; })); draft.query('old'); const pending = draft.search('geocode','vi');
 await draft.pin(p,'vi'); resolve([item]); await pending;
 expect(draft.getSnapshot().items).toEqual([]); expect(draft.getSnapshot().value?.source).toBe('map');
});
test('late reverse cannot overwrite a moved pin or an edited description', async () => {
 const { draft, api } = setup(); let resolve!: (x: typeof item) => void;
 api.reverse.mockImplementationOnce(() => new Promise(r => { resolve = r; })); const pending = draft.pin(p,'vi'); draft.describe('Manual address'); resolve(item); await pending;
 expect(draft.getSnapshot().value?.text).toBe('Manual address');
 api.reverse.mockResolvedValue({ ...item, point: {latitude:22,longitude:106} }); await draft.pin(p,'vi','gps'); expect(draft.getSnapshot().value?.point).toEqual(p);
});
test('empty reverse and errors preserve exact point for manual description, invalid points are ignored', async () => {
 const { draft, api } = setup(); api.reverse.mockResolvedValue(null); await draft.pin(p,'en'); expect(draft.getSnapshot().value?.text).toBe('');
 api.reverse.mockRejectedValue(new ApiError('RATE_LIMITED')); await draft.pin(p,'vi'); expect(draft.getSnapshot().error).toBe('RATE_LIMITED'); expect(draft.getSnapshot().value?.point).toEqual(p);
 await draft.pin({latitude:91,longitude:0},'vi'); expect(draft.getSnapshot().value?.point).toEqual(p);
 draft.query('ab'); await draft.search('autocomplete','vi'); expect(api.search).not.toHaveBeenCalled();
});

import {useLocale} from '../../../app/providers/LocaleProvider';
import type {Locale} from '../../../lib/i18n';
import { locationsApi } from '../../location/api/locations-api';
jest.mock('../../location/api/locations-api', () => ({ locationsApi: { search: jest.fn(), reverse: jest.fn() } }));
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor
} from '@testing-library/react-native';
import { AppNavigator } from '../../../app/navigation/AppNavigator';
import { AppProviders } from '../../../app/providers/AppProviders';
import { AuthProvider } from '../../../app/providers/AuthProvider';
import { authFixture, session } from '../../../../test/helpers/auth';
import { ApiError } from '../../../lib/http/api-error';
import type { PartnersApi } from '../api/partners-api';
import type { Partner } from '../models';
let changeTestLocale:(locale:Locale)=>Promise<void>;
function LocaleProbe(){changeTestLocale=useLocale().selectLocale;return null;}
async function choosePlace(prefix: string, point={latitude:21,longitude:105}) {
  jest.mocked(locationsApi.search).mockResolvedValue([{id:'demo',text:'DEMO address',point,precision:'address'}]);
  fireEvent.press(await screen.findByTestId(`${prefix}-pick-location`));
  fireEvent.changeText(screen.getByTestId('location-query'), 'DEMO address');
  fireEvent.press(screen.getByTestId('location-search'));
  fireEvent.press(await screen.findByTestId('location-result-0'));
  fireEvent.press(screen.getByTestId('location-confirm'));
}
const id = '00000000-0000-4000-8000-000000000002';
const skill = {
  id: '00000000-0000-4000-8000-000000000003',
  code: 'repair',
  name: 'Repair',
  name_vi: 'Sửa',
  name_locale: 'en' as const,
  category_ids: ['industry'],
  schema_version: 1,
  form_schema: {}
};
const initial: Partner = {
  id,
  kind: 'solo',
  name: 'Provider',
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
function fixture(saved: string | null = 'saved', verified = true, emailLab = false) {
  let value = { ...initial };
  const api: jest.Mocked<PartnersApi> = {
    create: jest.fn<
      ReturnType<PartnersApi['create']>,
      Parameters<PartnersApi['create']>
    >(async (_t, input) => (value = { ...value, ...input })),
    management: jest.fn<
      ReturnType<PartnersApi['management']>,
      Parameters<PartnersApi['management']>
    >(async () => value),
    edit: jest.fn<
      ReturnType<PartnersApi['edit']>,
      Parameters<PartnersApi['edit']>
    >(async (_t, _id, input) => {
      const { action, expected_version, ...fields } = input;
      return (value = { ...value, ...fields, ...(action==='deactivation'?{accepting_jobs:false}:{}), version: expected_version + 1 });
    }),
    search: jest.fn().mockResolvedValue({
      items: [
        {
          id,
          name: 'Provider',
          kind: 'solo',
          verification_status: 'unverified',
          distance_m: 100,
          distance_kind: 'service_area',
          map_location: null,
          reference_labor: '0',
          stars: null,
          review_count: 0
        }
      ],
      next_cursor: null
    }),
    profile: jest.fn().mockResolvedValue({
      id,
      name: 'Provider',
      kind: 'solo',
      verification_status: 'unverified',
      bio: 'Description',
      skills: [skill],
      public_addresses: [
        { text: 'Public address', point: { latitude: 21, longitude: 105 } }
      ],
      contact: null,
      can_hire: false,
      can_message: false
    })
  };
  const f = authFixture(saved, api);
  const user = { ...session.user, phone_verified: verified, ...(emailLab?{verification_policy:'email_lab' as const,email_verified:true}:{}), partner_ids: [id] };
  f.api.refresh.mockResolvedValue({ ...session, user });
  f.api.me.mockResolvedValue(user);
  render(
    <AppProviders
      partners={api}
      api={{
        categories: async () => [
          {
            id: 'industry',
            code: 'industry',
            name: 'Industry',
            name_vi: 'Ngành',
            name_locale: 'en',
            kind: 'industry',
            parent_id: null,
            active: true
          }
        ],
        skills: async () => [skill]
      }}
    >
      <AuthProvider manager={f.manager}><LocaleProbe/>
        <AppNavigator />
      </AuthProvider>
    </AppProviders>
  );
  return { ...f, partners: api };
}
async function openEditor() {
  fireEvent.press(await screen.findByTestId('nav-account'));
  fireEvent.press(await screen.findByTestId('partners-open'));
  fireEvent.press(await screen.findByText('Provider'));
  await screen.findByTestId('partner-name');
}
async function saved() {
  await waitFor(() =>
    expect(screen.getByTestId('partner-save-profile')).not.toBeDisabled()
  );
  await screen.findByTestId('partner-saved');
}
test('owner creates a company; a lost save response freezes fields and retries exact request', async () => {
  const f = fixture();
  fireEvent.press(await screen.findByTestId('nav-account'));
  fireEvent.press(await screen.findByTestId('partners-open'));
  const create = await screen.findByTestId('partner-create-open');
  await waitFor(() => expect(create).not.toBeDisabled());
  fireEvent.press(create);
  fireEvent.press(screen.getByTestId('partner-kind-company'));
  fireEvent.changeText(screen.getByTestId('partner-name'), 'Company');
  fireEvent.press(screen.getByTestId('partner-create'));
  await screen.findByTestId('partner-publication');
  expect(f.partners.create).toHaveBeenCalledWith(
    expect.any(String),
    { kind: 'company', name: 'Company' },
    expect.any(String)
  );
  f.partners.edit.mockRejectedValueOnce(new ApiError('NETWORK'));
  fireEvent.changeText(screen.getByTestId('partner-name'), 'New company');
  fireEvent.press(screen.getByTestId('partner-save-profile'));
  await screen.findByTestId('partner-retry');
  expect(screen.getByTestId('partner-name').props.editable).toBe(false);
  fireEvent.press(screen.getByTestId('partner-retry'));
  await saved();
  expect(f.partners.edit.mock.calls[0]).toEqual(f.partners.edit.mock.calls[1]);
});
test('owner edits skills, modes, prices, circles and public shops with a shared version; locale retains drafts', async () => {
  const f = fixture();
  await openEditor();
  fireEvent.press(screen.getByTestId('partner-section-skills'));
  fireEvent.press(await screen.findByText('Industry'));
  fireEvent.press(await screen.findByTestId('partner-add-skill-repair'));
  fireEvent(screen.getByTestId('skill-mode-0-at_shop'), 'valueChange', true);
  fireEvent.changeText(screen.getByLabelText('Giá công tham khảo (đ)'), '0');
  fireEvent.press(screen.getByTestId('partner-save-skills'));
  await waitFor(() =>
    expect(f.partners.edit).toHaveBeenCalledWith(
      expect.any(String),
      id,
      expect.objectContaining({
        action: 'skills',
        skills: [
          expect.objectContaining({
            modes: ['at_customer', 'at_shop'],
            reference_labor: '0'
          })
        ]
      }),
      expect.any(String)
    )
  );
  await waitFor(() =>
    expect(screen.getByTestId('partner-section-areas')).not.toBeDisabled()
  );
  fireEvent.press(screen.getByTestId('partner-section-areas'));
  fireEvent.press(screen.getByTestId('partner-add-area'));
  fireEvent.changeText(screen.getByLabelText('Tên khu vực'), 'Hanoi');
  await choosePlace('area-0');
  await act(async()=>changeTestLocale('en'));
  expect(screen.getByTestId('area-0-pick-location')).toHaveTextContent('Change location');
  await act(async()=>changeTestLocale('vi'));
  fireEvent.press(screen.getByTestId('partner-save-areas'));
  await waitFor(() =>
    expect(screen.getByTestId('partner-section-locations')).not.toBeDisabled()
  );
  fireEvent.press(screen.getByTestId('partner-section-locations'));
  fireEvent.press(screen.getByTestId('partner-add-location'));
  fireEvent.changeText(screen.getByLabelText('Địa chỉ'), 'Shop');
  await choosePlace('location-0');
  fireEvent.press(screen.getByTestId('partner-save-locations'));
  await waitFor(() =>
    expect(screen.getByTestId('partner-publication')).not.toBeDisabled()
  );
  fireEvent.press(screen.getByTestId('partner-publication'));
  await screen.findByTestId('partner-availability');
  fireEvent.press(screen.getByTestId('partner-availability'));
  await screen.findByText('Tắt nhận việc');
  expect(
    f.partners.edit.mock.calls.map((call) => call[2].expected_version)
  ).toEqual([1, 2, 3, 4, 5]);
});
test('conflict preserves draft until explicit reload, access loss removes private editor', async () => {
  const f = fixture();
  await openEditor();
  f.partners.edit.mockRejectedValueOnce(new ApiError('VERSION_CONFLICT'));
  fireEvent.changeText(screen.getByTestId('partner-name'), 'Unsaved');
  fireEvent.press(screen.getByTestId('partner-save-profile'));
  await screen.findByTestId('partner-error');
  expect(screen.getByTestId('partner-name').props.value).toBe('Unsaved');
  fireEvent.press(screen.getByTestId('partner-reload'));
  await waitFor(() =>
    expect(screen.getByTestId('partner-name').props.value).toBe('Provider')
  );
  await waitFor(() =>
    expect(screen.getByTestId('partner-save-profile')).not.toBeDisabled()
  );
  f.partners.edit.mockRejectedValueOnce(new ApiError('UNAUTHENTICATED'));
  f.api.refresh.mockRejectedValueOnce(new ApiError('UNAUTHENTICATED'));
  await act(async () => {
    fireEvent.press(screen.getByTestId('partner-save-profile'));
  });
  expect(f.partners.edit).toHaveBeenCalledTimes(2);
  expect(f.manager.getSnapshot().phase).toBe('anonymous');
  await waitFor(() => expect(screen.queryByTestId('partner-name')).toBeNull());
});
test('unverified account cannot create provider and anonymous search opens public profile', async () => {
  const f = fixture(null);
  fireEvent.press(await screen.findByTestId('search-submit'));
  expect(f.partners.search).not.toHaveBeenCalled();
  await choosePlace('search');
  f.partners.search.mockRejectedValueOnce(new ApiError('NETWORK'));
  fireEvent.press(screen.getByTestId('search-submit'));
  fireEvent.press(await screen.findByText('Thử lại'));
  fireEvent.press(await screen.findByText('Xem hồ sơ'));
  await screen.findByText('Description');
  expect(screen.queryByText('Phone secret')).toBeNull();
  expect(await screen.findByText('Public address')).toBeVisible();
});
test('unverified account sees creation gate, list retries and omits inaccessible membership', async () => {
  const f = fixture('saved', false);
  f.partners.management.mockRejectedValueOnce(new ApiError('NETWORK'));
  fireEvent.press(await screen.findByTestId('nav-account'));
  fireEvent.press(await screen.findByTestId('partners-open'));
  fireEvent.press(await screen.findByText('Thử lại'));
  await screen.findByText('Provider');
  expect(screen.getByTestId('partner-create-open')).toBeDisabled();
});

test('availability is always visible; a draft explains why it is disabled and cannot send a request', async () => {
  const f = fixture();
  await openEditor();
  expect(screen.getByTestId('partner-availability')).toBeDisabled();
  expect(
    screen.getByText(/Công bố hồ sơ trước khi bật nhận việc/)
  ).toBeVisible();
  fireEvent.press(screen.getByTestId('partner-availability'));
  expect(f.partners.edit).not.toHaveBeenCalled();
  fireEvent.press(screen.getByTestId('partner-publication'));
  await waitFor(() =>
    expect(screen.getByTestId('partner-availability')).not.toBeDisabled()
  );
  fireEvent.press(screen.getByTestId('partner-availability'));
  await screen.findByText('Tắt nhận việc');
  expect(screen.getByTestId('partner-availability-status')).toHaveTextContent(
    'Đang nhận việc'
  );
  fireEvent.press(screen.getByTestId('partner-availability'));
  await screen.findByText('Bật nhận việc');
  expect(screen.getByTestId('partner-availability-status')).toHaveTextContent(
    'Đang tắt nhận việc'
  );
  expect(f.partners.edit.mock.calls.map((call) => call[2].action)).toEqual([
    'publication',
    'availability',
    'deactivation'
  ]);
});

test('filter cancel discards drafts; apply and sort query immediately without clearing visible results', async()=>{
 const f=fixture(null);await choosePlace('search');fireEvent.press(screen.getByTestId('search-submit'));
 await screen.findByTestId(`search-result-${id}`);
 fireEvent.press(screen.getByTestId('search-filters-open'));fireEvent.changeText(screen.getByTestId('search-radius'),'5000');fireEvent.press(screen.getByTestId('search-filters-cancel'));
 expect(f.partners.search).toHaveBeenCalledTimes(1);
 fireEvent.press(screen.getByTestId('search-filters-open'));expect(screen.getByTestId('search-radius').props.value).toBe('10000');
 fireEvent.changeText(screen.getByTestId('search-radius'),'5000');fireEvent.press(screen.getByTestId('search-filters-apply'));
 await waitFor(()=>expect(f.partners.search).toHaveBeenCalledTimes(2));expect(f.partners.search.mock.calls[1][0]).toMatchObject({radius_m:5000,latitude:21,longitude:105});
 let resolve!: (value: Awaited<ReturnType<PartnersApi['search']>>)=>void;
 f.partners.search.mockImplementationOnce(()=>new Promise(r=>{resolve=r;}));
 fireEvent.press(screen.getByTestId('search-sort-rating'));
 expect(screen.getByTestId(`search-result-${id}`)).toBeVisible();expect(f.partners.search.mock.calls[2][0]).toMatchObject({sort:'rating',radius_m:5000,latitude:21,longitude:105});
 await act(async()=>resolve({items:[],next_cursor:null}));
 expect(!!screen.queryByTestId(`search-result-${id}`)).toBe(false);
 fireEvent.press(screen.getByTestId('search-filters-clear'));
 await waitFor(()=>expect(f.partners.search.mock.calls[3][0]).toMatchObject({radius_m:10000,verified:false,latitude:21,longitude:105,sort:'rating'}));
});

test('editor section status tracks drafts without losing other section edits on save',async()=>{
 const f=fixture();await openEditor();
 expect(screen.getByTestId('partner-section-status')).toHaveTextContent('Đã lưu nội dung nhóm này');
 fireEvent.changeText(screen.getByTestId('partner-name'),'Unsaved provider');
 expect(screen.getByTestId('partner-section-status')).toHaveTextContent('Có thay đổi chưa lưu');
 fireEvent.press(screen.getByTestId('partner-section-skills'));
 fireEvent.press(screen.getByTestId('partner-save-skills'));
 await waitFor(()=>expect(f.partners.edit).toHaveBeenCalledTimes(1));
 await waitFor(()=>expect(screen.getByTestId('partner-section-profile')).not.toBeDisabled());
 fireEvent.press(screen.getByTestId('partner-section-profile'));
 expect(screen.getByTestId('partner-name').props.value).toBe('Unsaved provider');
 expect(screen.getByTestId('partner-section-status')).toHaveTextContent('Có thay đổi chưa lưu');
});

test('switching editor sections keeps the unsaved gallery order',async()=>{
 const f=fixture();jest.spyOn(f.manager,'gallery').mockResolvedValue({partner_id:id,version:1,asset_ids:['first','second']});
 jest.spyOn(f.manager,'galleryAsset').mockImplementation(async asset=>({id:asset,status:'ready',download_url:'http://demo/'+asset,expires_at:'2099-01-01T00:00:00Z'}));
 const save=jest.spyOn(f.manager,'saveGallery').mockResolvedValue({partner_id:id,version:2,asset_ids:['second','first']});
 await openEditor();fireEvent.press(screen.getByTestId('partner-section-gallery'));
 await waitFor(()=>expect(screen.getByTestId('gallery-down-0')).not.toBeDisabled());fireEvent.press(screen.getByTestId('gallery-down-0'));
 fireEvent.press(screen.getByTestId('partner-section-profile'));fireEvent.press(screen.getByTestId('partner-section-gallery'));
 fireEvent.press(screen.getByTestId('gallery-save'));
 await waitFor(()=>expect(save).toHaveBeenCalledWith(session.user.id,id,1,['second','first'],expect.any(String)));
});

test('authorized profile action is available in the fixed action area and returning keeps search results',async()=>{
 const f=fixture();f.partners.profile.mockResolvedValue({...initial,skills:[skill],public_addresses:[],public_locations:[],service_modes:[],contact:{},can_hire:true,can_message:false});
 await choosePlace('search');fireEvent.press(screen.getByTestId('search-submit'));fireEvent.press(await screen.findByText('Xem hồ sơ'));
 expect(await screen.findByTestId('profile-hire')).toBeEnabled();
 fireEvent.press(screen.getByTestId('nav-back'));
 expect(await screen.findByTestId(`search-result-${id}`)).toBeVisible();expect(f.partners.search).toHaveBeenCalledTimes(1);
});


test('changing the picked location clears previous results and ignores an in-flight response from the old area',async()=>{
 const f=fixture(null);await choosePlace('search');fireEvent.press(screen.getByTestId('search-submit'));
 await screen.findByTestId(`search-result-${id}`);
 const page=await f.partners.search.mock.results[0].value;
 let finish!:(value:Awaited<ReturnType<PartnersApi['search']>>)=>void;
 f.partners.search.mockReturnValueOnce(new Promise(resolve=>{finish=resolve;}));
 fireEvent.press(screen.getByTestId('search-sort-rating'));
 await waitFor(()=>expect(f.partners.search).toHaveBeenCalledTimes(2));
 await choosePlace('search',{latitude:10,longitude:105});
 expect(!!screen.queryByTestId(`search-result-${id}`)).toBe(false);
 await act(async()=>finish(page));
 expect(!!screen.queryByTestId(`search-result-${id}`)).toBe(false);
 fireEvent.press(screen.getByTestId('search-submit'));
 await waitFor(()=>expect(f.partners.search).toHaveBeenLastCalledWith(expect.objectContaining({latitude:10,longitude:105,sort:'rating'}),undefined,expect.anything()));
});

test('verified email enables lab provider creation even when phone remains unverified',async()=>{
 fixture('saved',false,true);
 fireEvent.press(await screen.findByTestId('nav-account'));fireEvent.press(await screen.findByTestId('partners-open'));
 await waitFor(()=>expect(screen.getByTestId('partner-create-open')).toBeEnabled());
 fireEvent.press(screen.getByTestId('partner-create-open'));fireEvent.changeText(await screen.findByTestId('partner-name'),'DEMO email lab');
 expect(screen.getByTestId('partner-create')).toBeEnabled();
});

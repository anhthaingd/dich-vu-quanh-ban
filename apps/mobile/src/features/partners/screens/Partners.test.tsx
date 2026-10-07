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
async function choosePlace(prefix: string) {
  jest.mocked(locationsApi.search).mockResolvedValue([{id:'demo',text:'DEMO address',point:{latitude:21,longitude:105},precision:'address'}]);
  fireEvent.press(screen.getByTestId(`${prefix}-pick-location`));
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
function fixture(saved: string | null = 'saved', verified = true) {
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
      void action;
      return (value = { ...value, ...fields, version: expected_version + 1 });
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
  const user = { ...session.user, phone_verified: verified, partner_ids: [id] };
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
      <AuthProvider manager={f.manager}>
        <AppNavigator />
      </AuthProvider>
    </AppProviders>
  );
  return { ...f, partners: api };
}
async function openEditor() {
  fireEvent.press(screen.getByTestId('nav-account'));
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
  fireEvent.press(screen.getByTestId('nav-account'));
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
  fireEvent.press(screen.getByTestId('locale-en'));
  await waitFor(() =>
    expect(screen.getByTestId('locale-vi')).not.toBeDisabled()
  );
  expect(screen.getByTestId('area-0-pick-location')).toHaveTextContent('Change location');
  fireEvent.press(screen.getByTestId('locale-vi'));
  await waitFor(() =>
    expect(screen.getByTestId('locale-en')).not.toBeDisabled()
  );
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
  fireEvent.press(screen.getByTestId('search-open'));
  fireEvent.press(screen.getByTestId('search-submit'));
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
  fireEvent.press(screen.getByTestId('nav-account'));
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
    'availability'
  ]);
});

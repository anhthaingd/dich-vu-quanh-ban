import { LocaleState } from '../../../lib/i18n/locale-state';
import { AuthProvider } from '../../../app/providers/AuthProvider';
import { authFixture } from '../../../../test/helpers/auth';
import { BackHandler } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AppNavigator } from '../../../app/navigation/AppNavigator';
import { AppProviders } from '../../../app/providers/AppProviders';
import type { CatalogApi, Category } from '../models/catalog.types';
function CatalogScreen({ api }: { api: CatalogApi }) {
  return <AppProviders api={api}><AuthProvider manager={authFixture().manager}><AppNavigator /></AuthProvider></AppProviders>;
}
const industry: Category = { id: 'industry', code: 'home_utilities', name_vi: 'Điện nước', name: 'Điện nước', name_locale: 'vi' as const, active: true, parent_id: null };
const group: Category = { ...industry, id: 'group', name_vi: 'Dịch vụ điện nước', name: 'Dịch vụ điện nước', name_locale: 'vi' as const, parent_id: 'industry' };
test('loading → industry → group and skills → back', async () => {
  let resolve!: (data: Category[]) => void;
  const api: CatalogApi = {
    categories: jest.fn().mockImplementationOnce(() => new Promise(r => { resolve = r; })).mockImplementation(async id => id === 'industry' ? [group] : id === 'group' ? [] : [industry]),
    skills: jest.fn().mockResolvedValue([{ id: 'skill', code: 'electrical', name_vi: 'Sửa điện dân dụng', name: 'Sửa điện dân dụng', name_locale: 'vi' as const, category_ids: ['group'], schema_version: 1, form_schema: {} }]),
  };
  render(<CatalogScreen api={api} />);
  expect(screen.getByText('Đang tải danh mục…')).toBeTruthy();
  await act(async () => resolve([industry]));
  fireEvent.press(screen.getByRole('button', { name: 'Điện nước' }));
  await screen.findByRole('button', { name: 'Dịch vụ điện nước' });
  expect(screen.queryByText('Sửa điện dân dụng')).toBeNull();
  expect(api.skills).toHaveBeenCalledWith('industry', expect.anything(), 'vi');
  fireEvent.press(screen.getByRole('button', { name: 'Dịch vụ điện nước' }));
  await screen.findByText('Sửa điện dân dụng');
  expect(api.categories).toHaveBeenCalledWith('group', expect.anything(), 'vi');
  fireEvent.press(screen.getByRole('button', { name: 'Quay lại' }));
  await screen.findByRole('header', { name: 'Điện nước' });
});
test('empty is visible', async () => {
  render(<CatalogScreen api={{ categories: jest.fn().mockResolvedValue([]), skills: jest.fn() }} />);
  expect(await screen.findByText('Chưa có dịch vụ đang hoạt động.')).toBeTruthy();
});
test('rapid repeated selection opens one route and cancels the blurred screen request', async () => {
  const api: CatalogApi = {
    categories: jest.fn(async id => id ? [group] : [industry]),
    skills: jest.fn().mockResolvedValue([]),
  };
  render(<CatalogScreen api={api} />);
  const button = await screen.findByRole('button', { name: 'Điện nước' });
  act(() => { fireEvent.press(button); fireEvent.press(button); });
  expect(await screen.findByRole('button', { name: 'Dịch vụ điện nước' })).toBeVisible();
  const calls = (api.categories as jest.Mock).mock.calls;
  expect(calls[0][1].aborted).toBe(true);
  expect(calls.filter(([id]) => id === industry.id)).toHaveLength(1);
  fireEvent.press(screen.getByRole('button', { name: 'Quay lại' }));
  expect(await screen.findByRole('header', { name: 'Bạn cần dịch vụ gì?' })).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Quay lại' })).toBeNull();
});
test('error has retry and never substitutes sample data', async () => {
  const api = { categories: jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([industry]), skills: jest.fn() };
  render(<CatalogScreen api={api} />);
  await screen.findByRole('alert');
  expect(screen.queryByText('Điện nước')).toBeNull();
  fireEvent.press(screen.getByRole('button', { name: 'Thử lại' }));
  expect(await screen.findByText('Điện nước')).toBeTruthy();
});
test('back cancels stale group response and unmount aborts outstanding requests', async () => {
  let resolve!: (value: Category[]) => void;
  const api = { categories: jest.fn().mockResolvedValueOnce([industry]).mockImplementationOnce(() => new Promise(r => { resolve = r; })).mockResolvedValue([]), skills: jest.fn().mockResolvedValue([]) };
  const view = render(<CatalogScreen api={api} />);
  await screen.findByRole('button', { name: 'Điện nước' });
  fireEvent.press(screen.getByRole('button', { name: 'Điện nước' }));
  const signal = api.categories.mock.calls[1][1] as AbortSignal;
  fireEvent.press(screen.getByRole('button', { name: 'Quay lại' }));
  await screen.findByText('Chưa có dịch vụ đang hoạt động.');
  expect(signal.aborted).toBe(true);
  await act(async () => resolve([group])); expect(screen.queryByText('Dịch vụ điện nước')).toBeNull();
  const current = api.categories.mock.calls[3][1] as AbortSignal; view.unmount(); expect(current.aborted).toBe(true);
});
test('Android back handler returns to parent and yields to OS at root', async () => {
  let handler!: Parameters<typeof BackHandler.addEventListener>[1];
  const remove = jest.fn();
  const subscription = jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, callback) => { handler = callback; return { remove }; });
  try {
    const view = render(<CatalogScreen api={{ categories: jest.fn().mockResolvedValue([industry]), skills: jest.fn().mockResolvedValue([]) }} />);
    await screen.findByRole('button', { name: 'Điện nước' }); expect(handler({ type: 'hardwareBackPress', timeStamp: 0 })).toBe(false);
    fireEvent.press(screen.getByRole('button', { name: 'Điện nước' }));
    await screen.findByRole('header', { name: 'Điện nước' });
    act(() => { expect(handler({ type: 'hardwareBackPress', timeStamp: 0 })).toBe(true); });
    await screen.findByRole('header', { name: 'Bạn cần dịch vụ gì?' }); view.unmount(); expect(remove).toHaveBeenCalled();
  } finally { subscription.mockRestore(); }
});

test('localized names and title follow the same ID; stale locale replies cannot replace newer data', async () => {
  const localeManager = new LocaleState({ read: async () => null, write: async () => undefined });
  let resolveEnglish!: (value: Category[]) => void;
  const englishSignals: AbortSignal[] = [];
  const api: CatalogApi = {
    categories: jest.fn((id, signal, locale = 'vi') => {
      if (locale === 'en' && id === 'industry') {
        englishSignals.push(signal!);
        return new Promise(resolve => { resolveEnglish = resolve; });
      }
      const original = id ? group : industry;
      return Promise.resolve([{ ...original, name: locale === 'ja' ? (id ? '電気工事' : '電気・水道') : original.name, name_locale: locale }]);
    }),
    skills: jest.fn(async (_id, _signal, locale = 'vi') => [{ id: 's', code: 's', name_vi: 'Tên gốc', name: locale === 'ja' ? '電気修理' : 'Tên gốc', name_locale: locale, schema_version: 1, form_schema: {}, category_ids: ['industry'] }]),
  };
  render(<AppProviders api={api} localeManager={localeManager}><AuthProvider manager={authFixture().manager}><AppNavigator /></AuthProvider></AppProviders>);
  fireEvent.press(await screen.findByRole('button', { name: 'Điện nước' }));
  await screen.findByRole('header', { name: 'Điện nước' });
  await act(async () => localeManager.select('en'));
  expect(screen.queryByRole('button', { name: 'Dịch vụ điện nước' })).toBeNull();
  await act(async () => localeManager.select('ja'));
  expect(englishSignals[0].aborted).toBe(true);
  expect(await screen.findByRole('header', { name: '電気・水道' })).toBeVisible();
  expect(screen.getByText('電気修理')).toBeVisible();
  await act(async () => resolveEnglish([{ ...group, name: 'OLD ENGLISH', name_locale: 'en' }]));
  expect(screen.queryByText('OLD ENGLISH')).toBeNull();
  expect(screen.getByRole('header', { name: '電気・水道' })).toBeVisible();
  expect(screen.queryByText('未翻訳の項目はベトナム語で表示しています。')).toBeNull();
});

test('fallback notice is shown only for missing names, including the selected title', async () => {
  const localeManager = new LocaleState({ read: async () => 'en', write: async () => undefined });
  const api = { categories: jest.fn(async (id?: string) => id ? [] : [industry]), skills: jest.fn(async () => []) };
  render(<AppProviders api={api} localeManager={localeManager}><AuthProvider manager={authFixture().manager}><AppNavigator /></AuthProvider></AppProviders>);
  expect(await screen.findByText('Some names are not translated yet; Vietnamese is shown instead.')).toBeVisible();
  fireEvent.press(screen.getByRole('button', { name: 'Điện nước' }));
  expect(await screen.findByRole('header', { name: 'Điện nước' })).toBeVisible();
  expect(screen.getByText('Some names are not translated yet; Vietnamese is shown instead.')).toBeVisible();
  await act(async () => localeManager.select('vi'));
  expect(screen.queryByText('Một số mục chưa có bản dịch; tên tiếng Việt được hiển thị thay thế.')).toBeNull();
});

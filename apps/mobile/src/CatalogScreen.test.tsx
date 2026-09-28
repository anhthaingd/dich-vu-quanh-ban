import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { CatalogScreen } from './CatalogScreen';
import type { CatalogApi, Category } from './api';
const industry: Category = { id: 'industry', code: 'home_utilities', name_vi: 'Điện nước', active: true, parent_id: null };
const group: Category = { ...industry, id: 'group', name_vi: 'Dịch vụ điện nước', parent_id: 'industry' };
test('loading → industry → group and skills → back', async () => {
  let resolve!: (data: Category[]) => void;
  const api: CatalogApi = {
    categories: jest.fn().mockImplementationOnce(() => new Promise(r => { resolve = r; })).mockResolvedValueOnce([group]).mockResolvedValueOnce([]).mockResolvedValue([group]),
    skills: jest.fn().mockResolvedValue([{ id: 'skill', code: 'electrical', name_vi: 'Sửa điện dân dụng', category_ids: ['group'], schema_version: 1, form_schema: {} }]),
  };
  render(<CatalogScreen api={api} />);
  expect(screen.getByText('Đang tải danh mục…')).toBeTruthy();
  await act(async () => resolve([industry]));
  fireEvent.press(screen.getByRole('button', { name: 'Điện nước' }));
  await screen.findByText('Sửa điện dân dụng');
  expect(api.skills).toHaveBeenCalledWith('industry', expect.anything());
  fireEvent.press(screen.getByRole('button', { name: 'Dịch vụ điện nước' }));
  await screen.findByText('Sửa điện dân dụng');
  expect(api.categories).toHaveBeenCalledWith('group', expect.anything());
  fireEvent.press(screen.getByRole('button', { name: 'Quay lại' }));
  await screen.findByRole('header', { name: 'Điện nước' });
});
test('empty is visible', async () => {
  render(<CatalogScreen api={{ categories: jest.fn().mockResolvedValue([]), skills: jest.fn() }} />);
  expect(await screen.findByText('Chưa có dịch vụ đang hoạt động.')).toBeTruthy();
});
test('error has retry and never substitutes sample data', async () => {
  const api = { categories: jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([industry]), skills: jest.fn() };
  render(<CatalogScreen api={api} />);
  await screen.findByRole('alert');
  expect(screen.queryByText('Điện nước')).toBeNull();
  fireEvent.press(screen.getByRole('button', { name: 'Thử lại' }));
  expect(await screen.findByText('Điện nước')).toBeTruthy();
});

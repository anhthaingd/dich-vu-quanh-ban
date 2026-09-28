import { render, screen } from '@testing-library/react-native';
import App from './App';
jest.mock('../features/catalog/api/catalog-api', () => ({ createCatalogApi: () => ({ categories: async () => [], skills: async () => [] }) }));
test('app composes safe area, status bar and catalog screen', async () => {
  render(<App />); expect(await screen.findByText('Chưa có dịch vụ đang hoạt động.')).toBeTruthy();
});

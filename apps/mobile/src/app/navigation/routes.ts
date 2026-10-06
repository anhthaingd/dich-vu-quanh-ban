export type AccountDestination = 'Profile' | 'Sessions' | 'Addresses';
// Never accept an arbitrary screen, URL or mutation as a post-login action.
export const accountDestination = (value: unknown): AccountDestination | null =>
  value === 'Profile' || value === 'Sessions' || value === 'Addresses' ? value : null;
export type RootStackParamList = {
  CatalogHome: undefined;
  CatalogCategory: { categoryId: string; parentId: string | null };
  Account: { returnTo?: AccountDestination } | undefined;
  Profile: undefined;
  Sessions: undefined;
  Addresses: undefined;
};

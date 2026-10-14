export type AccountDestination = 'Organizations' | 'VerifyContact' | 'Profile' | 'Sessions' | 'Addresses' | 'Partners' | 'Jobs' | 'Conversations';
// Never accept an arbitrary screen, URL or mutation as a post-login action.
export const accountDestination = (value: unknown): AccountDestination | null =>
  value === 'Organizations' || value === 'VerifyContact' || value === 'Profile' || value === 'Sessions' || value === 'Addresses' || value === 'Partners' || value === 'Jobs' || value === 'Conversations' ? value : null;
export type RootStackParamList = {
  Organizations: undefined;
  VerifyContact: undefined;
  Team: {id:string};
  Jobs: undefined;
  JobCreate: {partnerId:string};
  JobDetail: {id:string};
  Invoice: {id:string};
  Conversations: {jobId?:string}|undefined;
  Conversation: {id:string;jobId?:string};
  CatalogHome: undefined;
  CatalogCategory: { categoryId: string; parentId: string | null };
  Account: { returnTo?: AccountDestination } | undefined;
  Profile: undefined;
  Sessions: undefined;
  Addresses: undefined;
  Partners: undefined;
  PartnerEditor: {id?:string};
  PartnerProfile: {id:string};
  Search: {skillId?:string;categoryId?:string};
};

import {Linking} from 'react-native';
import {workFixture,profile} from '../../../test/helpers/work';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AppNavigator } from './AppNavigator';
import { AppProviders } from '../providers/AppProviders';
import { AuthProvider } from '../providers/AuthProvider';
import { authFixture, credentials, session } from '../../../test/helpers/auth';
import { ApiError } from '../../lib/http/api-error';
import { accountDestination } from './routes';
async function expiredScreen(route: 'profile'|'sessions'|'addresses') {
  const f=authFixture('stored');
  render(<AppProviders api={{categories:async()=>[],skills:async()=>[]}}><AuthProvider manager={f.manager}><AppNavigator /></AuthProvider></AppProviders>);
  fireEvent.press(await screen.findByRole('button',{name:'Tài khoản'}));const button=await screen.findByTestId(route+'-open');await waitFor(()=>expect(button).not.toBeDisabled());fireEvent.press(button);
  await waitFor(()=>expect(f.manager.getSnapshot().busy).toBe(false));
  f.api.me.mockRejectedValueOnce(new ApiError('UNAUTHENTICATED'));f.api.refresh.mockRejectedValueOnce(new ApiError('UNAUTHENTICATED'));
  await act(()=>f.manager.verify());
  fireEvent.press(await screen.findByRole('button',{name:'Đăng nhập'}));await screen.findByTestId('auth-submit');return f;
}
test.each(['profile','sessions','addresses'] as const)('login returns to %s with fresh data and no automatic mutation',async route=>{
  const f=await expiredScreen(route);
  f.api.login.mockResolvedValue({...session,user:{...session.user,id:'00000000-0000-4000-8000-000000000002',display_name:'New owner'}});
  f.api.me.mockResolvedValue({...session.user,id:'00000000-0000-4000-8000-000000000002',display_name:'New owner'});
  fireEvent.changeText(screen.getByTestId('auth-email'),credentials.email);fireEvent.changeText(screen.getByTestId('auth-password'),credentials.password);fireEvent.press(screen.getByTestId('auth-submit'));
  await screen.findByTestId(route==='profile'?'profile-name':route==='addresses'?'addresses-empty':'sessions-revoke-others');
  expect(screen.queryByTestId('auth-submit')).toBeNull();expect(f.accounts.edit).not.toHaveBeenCalled();expect(f.accounts.saveAddress).not.toHaveBeenCalled();expect(f.accounts.revokeSession).not.toHaveBeenCalled();
  expect(f.manager.getSnapshot().user?.display_name).toBe('New owner');
});
test('failed login stays in form; back abandons the destination',async()=>{
  const f=await expiredScreen('addresses');f.api.login.mockRejectedValueOnce(new ApiError('UNAUTHENTICATED'));
  fireEvent.changeText(screen.getByTestId('auth-email'),credentials.email);fireEvent.changeText(screen.getByTestId('auth-password'),credentials.password);fireEvent.press(screen.getByTestId('auth-submit'));
  await screen.findByRole('alert');expect(screen.queryByTestId('addresses-empty')).toBeNull();
  fireEvent.press(screen.getByRole('button',{name:'Quay lại'}));await screen.findByTestId('auth-submit');
  fireEvent.changeText(screen.getByTestId('auth-email'),credentials.email);fireEvent.changeText(screen.getByTestId('auth-password'),credentials.password);fireEvent.press(screen.getByTestId('auth-submit'));
  await screen.findByTestId('addresses-open');expect(screen.queryByTestId('addresses-empty')).toBeNull();
});
test('destination whitelist rejects URLs, mutations and unknown screens',()=>{
  for(const value of [undefined,null,'https://example.test','revokeSession','Admin',{},'CatalogHome'])expect(accountDestination(value)).toBeNull();
  expect(accountDestination('Profile')).toBe('Profile');expect(accountDestination('Sessions')).toBe('Sessions');expect(accountDestination('Addresses')).toBe('Addresses');
});

test('resource destinations retain only a validated identity and never a mutation or draft',()=>{
 const id='00000000-0000-4000-8000-000000000010';
 expect(accountDestination({screen:'JobCreate',params:{partnerId:id}})).toEqual({screen:'JobCreate',params:{partnerId:id}});
 expect(accountDestination({screen:'Conversations',params:{jobId:id}})).toEqual({screen:'Conversations',params:{jobId:id}});
 expect(accountDestination({screen:'Invoice',params:{id}})).toEqual({screen:'Invoice',params:{id}});
 for(const value of [{screen:'JobCreate',params:{partnerId:'bad'}},{screen:'Invoice',params:{id,confirm:true}},{screen:'Admin',params:{id}},{screen:'Finance',params:{id,amount:'50000'}}])expect(accountDestination(value)).toBeNull();
});
test('local app links accept read destinations and reject foreign hosts, secrets, nested paths and actions',()=>{
 const id='00000000-0000-4000-8000-000000000010';
 expect(accountDestination('dvqb://partners/'+id+'/hire')).toEqual({screen:'JobCreate',params:{partnerId:id}});
 expect(accountDestination('dvqb://jobs/'+id)).toEqual({screen:'JobDetail',params:{id}});
 expect(accountDestination('dvqb://jobs/'+id+'/invoice')).toEqual({screen:'Invoice',params:{id}});
 for(const value of ['https://example.test/jobs/'+id,'dvqb://jobs/'+id+'/settle','dvqb://jobs/'+id+'?token=secret','dvqb://jobs/%2F'+id,'dvqb://admin','dvqb://jobs/'+id+'#pay'])expect(accountDestination(value)).toBeNull();
});

test('cold hire link survives sign-in and reloads the exact partner without submitting a request',async()=>{
 const id='00000000-0000-4000-8000-000000000010',f=workFixture();f.storage.read.mockResolvedValue(null);f.partners.profile.mockResolvedValue({...profile,id});
 const initial=jest.spyOn(Linking,'getInitialURL').mockResolvedValue('dvqb://partners/'+id+'/hire');
 const view=render(<AppProviders api={{categories:async()=>[],skills:async()=>[]}}><AuthProvider manager={f.manager}><AppNavigator/></AuthProvider></AppProviders>);
 try{
  fireEvent.press(await screen.findByTestId('account-continue-login'));await screen.findByTestId('auth-submit');
  fireEvent.changeText(screen.getByTestId('auth-email'),credentials.email);fireEvent.changeText(screen.getByTestId('auth-password'),credentials.password);fireEvent.press(screen.getByTestId('auth-submit'));
  await screen.findByTestId('job-submit');expect(f.partners.profile).toHaveBeenCalledWith(id,'vi',undefined,expect.any(String));expect(f.jobs.create).not.toHaveBeenCalled();expect(screen.queryByTestId('auth-submit')).toBeNull();
 }finally{view.unmount();initial.mockRestore();}
});
test('warm job link checks current permissions and never displays an inaccessible job or runs an action',async()=>{
 const f=workFixture();
 const id='00000000-0000-4000-8000-000000000011';let open:((event:{url:string})=>void)|undefined;
 const listener=jest.spyOn(Linking,'addEventListener').mockImplementation((event,handler)=>{if(event==='url')open=handler;return {remove:()=>{}} as ReturnType<typeof Linking.addEventListener>;});
 f.jobs.get.mockRejectedValue(new ApiError('NOT_FOUND'));
 jest.spyOn(f.manager,'getJob').mockRejectedValueOnce(new ApiError('BUSY'));
 const view=render(<AppProviders api={{categories:async()=>[],skills:async()=>[]}}><AuthProvider manager={f.manager}><AppNavigator/></AuthProvider></AppProviders>);
 try{
  await screen.findByTestId('nav-account');await waitFor(()=>expect(f.manager.getSnapshot().phase).toBe('authenticated'));expect(open).toBeDefined();
  act(()=>open!({url:'dvqb://jobs/'+id}));await waitFor(()=>expect(f.jobs.get).toHaveBeenCalledWith(expect.any(String),id));await screen.findByText('Bạn không có quyền hoặc dữ liệu này không còn khả dụng.');expect(screen.queryByText('DEMO job')).toBeNull();expect(f.jobs.change).not.toHaveBeenCalled();
 }finally{view.unmount();listener.mockRestore();}
});

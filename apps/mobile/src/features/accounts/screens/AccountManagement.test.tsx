import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AppNavigator } from '../../../app/navigation/AppNavigator';
import { AppProviders } from '../../../app/providers/AppProviders';
import { AuthProvider } from '../../../app/providers/AuthProvider';
import { authFixture } from '../../../../test/helpers/auth';
import { ApiError } from '../../../lib/http/api-error';
const address={id:'00000000-0000-4000-8000-000000000003',label:'Home',address:{text:'Street',point:{latitude:10,longitude:106}},is_default:true,version:1};
async function mount(kind:'addresses'|'sessions') {
  const f=authFixture('saved');
  f.accounts.saveAddress.mockImplementation(async(_token,_id,input)=>({...address,...input,version:2}));
  render(<AppProviders api={{categories:async()=>[],skills:async()=>[]}}><AuthProvider manager={f.manager}><AppNavigator /></AuthProvider></AppProviders>);
  fireEvent.press(screen.getByRole('button',{name:'Tài khoản'}));const open=await screen.findByTestId(kind+'-open');await waitFor(()=>expect(open).not.toBeDisabled());fireEvent.press(open);
  await waitFor(()=>expect(screen.getByTestId('account-reload')).not.toBeDisabled());return f;
}
test('address form validates, preserves draft across locale, retries lost response, supports edit and confirmed archive',async()=>{
  const f=await mount('addresses');fireEvent.press(screen.getByTestId('address-add'));fireEvent.press(screen.getByTestId('address-save'));expect(await screen.findByRole('alert')).toBeVisible();
  for(const [id,value] of [['label','Home'],['text','Street'],['lat','10'],['lng','106']]) fireEvent.changeText(screen.getByTestId('address-'+id),value);
  fireEvent.press(screen.getByRole('button',{name:'English'}));await waitFor(()=>expect(screen.getByTestId('locale-ja')).not.toBeDisabled());expect(screen.getByTestId('address-text').props.value).toBe('Street');
  f.accounts.saveAddress.mockRejectedValueOnce(new ApiError('NETWORK'));fireEvent.press(screen.getByTestId('address-save'));await screen.findByTestId('account-retry');expect(screen.getByTestId('address-text').props.editable).toBe(false);
  f.accounts.addresses.mockResolvedValue({items:[address],next_cursor:null});fireEvent.press(screen.getByTestId('account-retry'));await screen.findByTestId('address-edit');expect(f.accounts.saveAddress.mock.calls[0]).toEqual(f.accounts.saveAddress.mock.calls[1]);
  fireEvent.press(screen.getByTestId('address-edit'));f.accounts.saveAddress.mockRejectedValueOnce(new ApiError('VERSION_CONFLICT'));fireEvent.changeText(screen.getByTestId('address-text'),'Draft');fireEvent.press(screen.getByTestId('address-save'));await screen.findByRole('alert');expect(screen.getByTestId('address-save')).toBeDisabled();
  f.accounts.addresses.mockResolvedValue({items:[{...address,version:4}],next_cursor:null});fireEvent.press(screen.getByTestId('account-reload'));await waitFor(()=>expect(screen.getByTestId('address-save')).not.toBeDisabled());expect(screen.getByTestId('address-text').props.value).toBe('Draft');
  fireEvent.press(screen.getByTestId('address-save'));await screen.findByTestId('address-edit');expect(f.accounts.saveAddress.mock.calls.at(-1)?.[2]).toMatchObject({expected_version:4});
  fireEvent.press(screen.getByTestId('address-archive'));f.accounts.archiveAddress.mockResolvedValue({id:address.id,version:5,state:'archived'});f.accounts.addresses.mockResolvedValue({items:[],next_cursor:null});fireEvent.press(screen.getByTestId('address-confirm-archive'));expect(await screen.findByTestId('addresses-empty')).toBeVisible();
});
test('session confirmation shows current login and revocation removes authenticated screen',async()=>{
  const f=await mount('sessions');f.accounts.sessions.mockResolvedValue({items:[{id:'family',version:1,state:'active',is_current:true,created_at:'2026-10-06T00:00:00Z',last_seen_at:null}],next_cursor:null});
  fireEvent.press(screen.getByTestId('account-reload'));fireEvent.press(await screen.findByTestId('session-revoke-current'));expect(await screen.findByText('Đây là phiên hiện tại. Thu hồi sẽ đăng xuất bạn khỏi app này.')).toBeVisible();
  f.accounts.revokeSession.mockResolvedValue({id:'family',version:1,state:'revoked'});fireEvent.press(screen.getByTestId('session-confirm'));await screen.findByRole('button',{name:'Đăng nhập'});expect(screen.queryByTestId('session-revoke-current')).toBeNull();expect(f.storage.clear).toHaveBeenCalled();
});

test('bulk confirmation can cancel, retries partial failure and keeps current login',async()=>{
  const f=await mount('sessions');
  const current={id:'current',version:1,state:'active' as const,is_current:true,created_at:'2026-10-06T00:00:00Z',last_seen_at:null};
  const a={...current,id:'a',is_current:false},b={...a,id:'b'};
  f.accounts.sessions.mockResolvedValue({items:[current,a,b],next_cursor:null});
  fireEvent.press(screen.getByTestId('account-reload'));await screen.findByTestId('session-revoke-current');
  fireEvent.press(screen.getByTestId('sessions-revoke-others'));await screen.findByTestId('sessions-confirm-others');
  fireEvent.press(screen.getByTestId('sessions-cancel-others'));expect(f.accounts.revokeSession).not.toHaveBeenCalled();
  f.accounts.revokeSession.mockResolvedValueOnce({id:'a',version:1,state:'revoked'}).mockRejectedValueOnce(new ApiError('NETWORK')).mockResolvedValue({id:'b',version:1,state:'revoked'});
  fireEvent.press(screen.getByTestId('sessions-revoke-others'));fireEvent.press(await screen.findByTestId('sessions-confirm-others'));
  fireEvent.press(await screen.findByTestId('sessions-batch-retry'));
  await screen.findByTestId('sessions-batch-done');expect(f.accounts.revokeSession.mock.calls.map(x=>x[1])).toEqual(['a','b','b']);
  expect(f.manager.getSnapshot().phase).toBe('authenticated');expect(f.storage.clear).not.toHaveBeenCalled();
});

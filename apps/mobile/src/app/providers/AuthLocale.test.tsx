import {act,render,waitFor} from '@testing-library/react-native';
import {View} from 'react-native';
import {AuthProvider} from './AuthProvider';
import {LocaleProvider} from './LocaleProvider';
import {LocaleState} from '../../lib/i18n/locale-state';
import {authFixture,credentials,session} from '../../../test/helpers/auth';
import {ApiError} from '../../lib/http/api-error';
test('lost locale write replay cannot display an older locale than the newer account profile',async()=>{
 const f=authFixture(),locale=new LocaleState({read:async()=>null,write:async()=>{}});render(<LocaleProvider manager={locale}><AuthProvider manager={f.manager}><View/></AuthProvider></LocaleProvider>);await waitFor(()=>expect(f.manager.getSnapshot().phase).toBe('anonymous'));
 await act(async()=>{await f.manager.login(credentials);});f.accounts.edit.mockRejectedValueOnce(new ApiError('NETWORK'));await act(async()=>{await locale.select('en');});expect(locale.getSnapshot()).toMatchObject({locale:'vi',error:'WRITE_FAILED'});
 f.api.me.mockResolvedValueOnce({...session.user,version:3,locale:'ja'});await act(async()=>{await f.manager.verify();});expect(locale.getSnapshot().locale).toBe('ja');
 f.accounts.edit.mockResolvedValueOnce({...session.user,version:2,locale:'en'});await act(async()=>{await locale.select('en');});expect(f.accounts.edit.mock.calls[0]).toEqual(f.accounts.edit.mock.calls[1]);expect(f.manager.getSnapshot().user).toMatchObject({version:3,locale:'ja'});expect(locale.getSnapshot()).toMatchObject({locale:'ja',busy:false,error:null});
});

test('suspended account locale save retains the restricted session instead of refreshing or logging out',async()=>{
 const f=authFixture(),support={...session,user:{...session.user,status:'suspended'}},locale=new LocaleState({read:async()=>null,write:async()=>{}});f.api.login.mockResolvedValue(support);f.accounts.edit.mockResolvedValue({...support.user,locale:'ja',version:2});render(<LocaleProvider manager={locale}><AuthProvider manager={f.manager}><View/></AuthProvider></LocaleProvider>);await waitFor(()=>expect(f.manager.getSnapshot().phase).toBe('anonymous'));await act(async()=>{await f.manager.login(credentials);await locale.select('ja');});expect(f.manager.getSnapshot()).toMatchObject({phase:'authenticated',user:{status:'suspended',locale:'ja'}});expect(locale.getSnapshot().locale).toBe('ja');expect(f.api.refresh).not.toHaveBeenCalled();expect(f.api.logout).not.toHaveBeenCalled();
});


test('locale selection waits for account verification before saving the current profile version',async()=>{
 const f=authFixture(),locale=new LocaleState({read:async()=>null,write:async()=>{}});
 render(<LocaleProvider manager={locale}><AuthProvider manager={f.manager}><View/></AuthProvider></LocaleProvider>);
 await waitFor(()=>expect(f.manager.getSnapshot().phase).toBe('anonymous'));
 await act(async()=>{await f.manager.login(credentials);});
 let finish!:(value:typeof session.user)=>void;
 f.api.me.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
 f.accounts.edit.mockResolvedValue({...session.user,version:3,locale:'en'});
 let verifying!:Promise<void>,changing!:Promise<void>;
 act(()=>{verifying=f.manager.verify();changing=locale.select('en');});
 expect(f.accounts.edit).not.toHaveBeenCalled();expect(locale.getSnapshot().busy).toBe(true);
 await act(async()=>{finish({...session.user,version:2});await verifying;await changing;});
 expect(f.accounts.edit).toHaveBeenCalledWith(expect.any(String),{expected_version:2,locale:'en'},expect.any(String));
 expect(locale.getSnapshot()).toMatchObject({locale:'en',busy:false,error:null});
});

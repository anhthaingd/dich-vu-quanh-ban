import {CustomerReviews} from './CustomerReviews';
import * as Picker from 'expo-image-picker';
import {act,fireEvent,render,screen,waitFor} from '@testing-library/react-native';
import {View} from 'react-native';
import {createNavigationContainerRef,NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {AppProviders} from '../../../app/providers/AppProviders';
import {AuthProvider} from '../../../app/providers/AuthProvider';
import type {RootStackParamList} from '../../../app/navigation/routes';
import {AuthSession} from '../../auth/state/auth-session';
import {invoiceFixture,invoice} from '../../../../test/helpers/invoices';
import {session} from '../../../../test/helpers/auth';
import {ReviewsScreen} from './ReviewsScreen';
import {PartnerReviews} from './PartnerReviews';
import type {ReviewsApi} from '../api/reviews-api';
import type {Review} from '../models';
import {ApiError} from '../../../lib/http/api-error';
jest.mock('expo-image-picker',()=>({launchImageLibraryAsync:jest.fn()}));
const Stack=createNativeStackNavigator<RootStackParamList>();
const review:Review={id:'r',job_id:'job',direction:'customer_to_partner',author_id:session.user.id,stars:5,body:'DEMO sent',hidden:false,removed:false,version:1,asset_id:null,reply:null,allowed_actions:['edit','visibility']};
function fixture(){const f=invoiceFixture();f.setInvoice({...invoice,review_eligible:true});let items:Review[]=[];
 const reviews:jest.Mocked<ReviewsApi>={customerHistory:jest.fn(),reply:jest.fn(),upload:jest.fn(),asset:jest.fn(),list:jest.fn().mockImplementation(async()=>({items,next_cursor:null})),publicList:jest.fn().mockResolvedValue({items:[],next_cursor:null}),create:jest.fn().mockImplementation(async(_t,_j,b)=>{const r={...review,...b};items=[r];return r;}),edit:jest.fn().mockImplementation(async(_t,_id,b)=>{const r={...review,...b,version:2};items=[r];return r;}),visibility:jest.fn().mockImplementation(async(_t,_id,_v,removed)=>{const r={...review,removed,version:3};items=[r];return r;})};
 return {...f,reviews,setReviews:(next:Review[])=>{items=next;},manager:new AuthSession(f.api,f.storage,f.accounts,f.partners,f.jobs,f.chat,f.invoices,undefined,undefined,reviews)};
}
function mount(f:ReturnType<typeof fixture>){return render(<AppProviders api={{categories:jest.fn(),skills:jest.fn()}}><AuthProvider manager={f.manager}><NavigationContainer><Stack.Navigator screenOptions={{headerShown:false,animation:'none'}}><Stack.Screen name="Reviews" component={ReviewsScreen} initialParams={{id:'job'}}/></Stack.Navigator></NavigationContainer></AuthProvider></AppProviders>);}
const press=(id:string)=>fireEvent.press(screen.getByTestId(id));
async function ready(){await waitFor(()=>expect(screen.getByTestId('reviews-reload')).not.toBeDisabled());}
test('reviews keep the same payload after lost response, then edit and remove the existing review',async()=>{
 const f=fixture();mount(f);await screen.findByTestId('review-save');await ready();expect(screen.getByTestId('review-save')).toBeDisabled();
 press('review-star-5');fireEvent.changeText(screen.getByTestId('review-body'),'DEMO draft');f.reviews.create.mockRejectedValueOnce(new ApiError('NETWORK'));press('review-save');await screen.findByTestId('work-retry');expect(screen.getByTestId('review-body').props.value).toBe('DEMO draft');expect(screen.getByTestId('review-save')).toBeDisabled();press('work-retry');await screen.findByTestId('review-edit');await ready();expect(f.reviews.create.mock.calls[1]).toEqual(f.reviews.create.mock.calls[0]);
 press('review-edit');press('review-star-3');press('review-save');await ready();expect(f.reviews.edit.mock.calls[0][2]).toMatchObject({expected_version:1,stars:3});press('review-visibility');await screen.findByText('Tác giả đã gỡ đánh giá này');await ready();expect(f.reviews.visibility.mock.calls[0].slice(2,4)).toEqual([2,true]);
});
test('reviews stay locked without both marks, retain draft on reload error and clear private content when access is lost',async()=>{
 const f=fixture();f.setInvoice({...invoice,review_eligible:false});mount(f);await screen.findByTestId('reviews-locked');expect(screen.queryByTestId('review-save')).toBeNull();
 f.setInvoice({...invoice,review_eligible:true});await ready();press('reviews-reload');await screen.findByTestId('review-body');fireEvent.changeText(screen.getByTestId('review-body'),'Keep draft');await ready();f.reviews.list.mockRejectedValueOnce(new ApiError('NETWORK'));press('reviews-reload');await screen.findByRole('alert');expect(screen.getByTestId('review-body').props.value).toBe('Keep draft');
 await ready();f.reviews.list.mockRejectedValueOnce(new ApiError('NOT_FOUND'));press('reviews-reload');await waitFor(()=>expect(f.reviews.list).toHaveBeenCalledTimes(4),{timeout:5000});await waitFor(()=>expect(screen.queryByTestId('review-body')).toBeNull());
});
test('review conflict requires an explicit reload before editing the latest version',async()=>{
 const f=fixture();f.setReviews([review]);mount(f);await screen.findByTestId('review-edit');await ready();press('review-edit');f.reviews.edit.mockRejectedValueOnce(new ApiError('VERSION_CONFLICT'));press('review-save');await screen.findByRole('alert');expect(screen.getByTestId('review-save')).toBeDisabled();f.setReviews([{...review,version:8,body:'Newer'}]);await ready();press('reviews-reload');await ready();press('review-edit');press('review-save');await ready();expect(f.reviews.edit.mock.calls.at(-1)?.[2].expected_version).toBe(8);
});
test('public partner reviews page loads more and retries without displaying failed partial pages',async()=>{
 const f=fixture();f.reviews.publicList.mockResolvedValueOnce({items:[review],next_cursor:'next'}).mockResolvedValueOnce({items:[{...review,id:'r2',body:'Next'}],next_cursor:null});
 const mounted=render(<AppProviders api={{categories:jest.fn(),skills:jest.fn()}}><NavigationContainer><PartnerReviews id="p" api={f.reviews}/></NavigationContainer></AppProviders>);
 await screen.findByText('DEMO sent');fireEvent.press(screen.getByRole('button',{name:'Xem thêm'}));await screen.findByText('Next');mounted.unmount();
 f.reviews.publicList.mockRejectedValueOnce(new ApiError('NETWORK')).mockResolvedValueOnce({items:[],next_cursor:null});render(<AppProviders api={{categories:jest.fn(),skills:jest.fn()}}><NavigationContainer><PartnerReviews id="p" api={f.reviews}/></NavigationContainer></AppProviders>);await screen.findByRole('alert');fireEvent.press(screen.getByRole('button',{name:'Thử lại'}));await screen.findByText('Chưa có đánh giá công khai.');
});

test('refreshing an open review draft does not silently adopt a newer edit version',async()=>{
 const f=fixture();f.setReviews([review]);mount(f);await screen.findByTestId('review-edit');await ready();press('review-edit');fireEvent.changeText(screen.getByTestId('review-body'),'Old draft');f.setReviews([{...review,version:9}]);press('reviews-reload');await ready();press('review-save');await ready();expect(f.reviews.edit.mock.calls[0][2]).toMatchObject({expected_version:1,body:'Old draft'});
});

test('review reads wait for session contention without losing the loaded form',async()=>{
 const f=fixture();f.invoices.get.mockRejectedValueOnce(new ApiError('BUSY'));mount(f);await screen.findByTestId('review-save');await ready();expect(f.invoices.get).toHaveBeenCalledTimes(2);expect(screen.queryByRole('alert')).toBeNull();
});

test('returning to a public profile restarts pagination and drops reviews removed since the previous visit',async()=>{
 const f=fixture(),nav=createNavigationContainerRef<{Public:undefined;Other:undefined}>(),PublicStack=createNativeStackNavigator<{Public:undefined;Other:undefined}>();
 f.reviews.publicList.mockResolvedValueOnce({items:[review],next_cursor:'next'}).mockResolvedValueOnce({items:[{...review,id:'r2',body:'Next'}],next_cursor:null});
 render(<AppProviders api={{categories:jest.fn(),skills:jest.fn()}}><NavigationContainer ref={nav}><PublicStack.Navigator screenOptions={{headerShown:false,animation:'none'}}><PublicStack.Screen name="Public">{()=> <PartnerReviews id="p" api={f.reviews}/>}</PublicStack.Screen><PublicStack.Screen name="Other">{()=> <View/>}</PublicStack.Screen></PublicStack.Navigator></NavigationContainer></AppProviders>);
 await screen.findByText('DEMO sent');fireEvent.press(screen.getByRole('button',{name:'Xem thêm'}));await screen.findByText('Next');
 act(()=>nav.navigate('Other'));f.reviews.publicList.mockResolvedValueOnce({items:[],next_cursor:null});act(()=>nav.goBack());
 await screen.findByText('Chưa có đánh giá công khai.');expect(f.reviews.publicList.mock.calls.at(-1)).toEqual(['p',undefined]);expect(screen.queryByText('DEMO sent')).toBeNull();expect(screen.queryByText('Next')).toBeNull();
});

test('review reply keeps draft version and retry payload, then clears private draft after revocation',async()=>{
 const f=fixture(),received:Review={...review,id:'received',author_id:'worker',direction:'partner_to_customer',allowed_actions:['reply']};f.setReviews([received]);
 f.reviews.reply.mockRejectedValueOnce(new ApiError('NETWORK')).mockImplementation(async(_t,_id,_v,body)=>{const r={...received,version:2,reply:{body,author_id:session.user.id}};f.setReviews([r]);return r;});
 mount(f);await screen.findByTestId('review-reply-edit');await ready();press('review-reply-edit');fireEvent.changeText(screen.getByTestId('review-reply-body'),'DEMO reply');
 f.setReviews([{...received,version:9}]);press('reviews-reload');await ready();press('review-reply-save');await screen.findByTestId('work-retry');expect(screen.getByTestId('review-reply-save')).toBeDisabled();press('work-retry');await screen.findByText('DEMO reply');await ready();expect(f.reviews.reply.mock.calls[1]).toEqual(f.reviews.reply.mock.calls[0]);expect(f.reviews.reply.mock.calls[0][2]).toBe(1);
 await waitFor(()=>expect(screen.queryByTestId('review-reply-body')).toBeNull());await ready();press('review-reply-edit');await waitFor(()=>expect(screen.getByTestId('review-reply-save')).not.toBeDisabled());f.reviews.reply.mockRejectedValueOnce(new ApiError('FORBIDDEN'));press('review-reply-save');await waitFor(()=>expect(f.reviews.reply).toHaveBeenCalledTimes(3));await expect(f.reviews.reply.mock.results[2].value).rejects.toMatchObject({code:'FORBIDDEN'});await screen.findByText('Bạn không có quyền hoặc dữ liệu này không còn khả dụng.');await waitFor(()=>expect(screen.queryByTestId('review-reply-body')).toBeNull());expect(screen.queryByText('DEMO reply')).toBeNull();
});
test('review photo upload retries the same blob, attaches it, and explicit removal sends null',async()=>{
 const f=fixture(),photo={id:'photo',status:'ready' as const,download_url:'http://local/photo',expires_at:'2099-01-01T00:00:00Z'};
 const blob=new Blob(['image']);jest.mocked(Picker.launchImageLibraryAsync).mockResolvedValue({canceled:false,assets:[{uri:'demo',file:blob,mimeType:'image/png',width:24,height:24}]} as Awaited<ReturnType<typeof Picker.launchImageLibraryAsync>>);
 f.reviews.upload.mockRejectedValueOnce(new ApiError('NETWORK')).mockResolvedValue(photo);mount(f);await screen.findByTestId('review-save');await ready();press('review-photo-pick');await screen.findByTestId('work-retry');press('work-retry');await screen.findByTestId('review-photo');await ready();expect(f.reviews.upload.mock.calls[1]).toEqual(f.reviews.upload.mock.calls[0]);expect(f.reviews.upload.mock.calls[0][1].type).toBe('image/png');press('review-star-5');press('review-save');await screen.findByTestId('review-edit');await ready();expect(f.reviews.create.mock.calls[0][2].asset_id).toBe('photo');
 press('review-edit');press('review-photo-remove');press('review-save');await ready();expect(f.reviews.edit.mock.calls[0][2].asset_id).toBeNull();
});
test('customer history loads only on demand, paginates minimal reviews and clears them after permission loss',async()=>{
 const f=fixture();f.reviews.customerHistory.mockResolvedValueOnce({items:[{id:'one',stars:5,body:'DEMO history',reply:null,created_at:'2026-10-20T00:00:00Z'}],next_cursor:'next'}).mockResolvedValueOnce({items:[{id:'two',stars:4,body:'DEMO next',reply:'DEMO reply',created_at:'2026-10-19T00:00:00Z'}],next_cursor:null});
 render(<AppProviders api={{categories:jest.fn(),skills:jest.fn()}}><AuthProvider manager={f.manager}><NavigationContainer><Stack.Navigator screenOptions={{headerShown:false}}><Stack.Screen name="JobDetail">{()=> <CustomerReviews owner={session.user.id} job="job"/>}</Stack.Screen></Stack.Navigator></NavigationContainer></AuthProvider></AppProviders>);
 await waitFor(()=>expect(f.manager.getSnapshot().phase).toBe('authenticated'));expect(f.reviews.customerHistory).not.toHaveBeenCalled();fireEvent.press(screen.getByTestId('customer-reviews-open'));await screen.findByText('DEMO history');fireEvent.press(screen.getByText('Xem thêm'));await screen.findByText('DEMO next');expect(f.reviews.customerHistory.mock.calls[1][2]).toBe('next');
 fireEvent.press(screen.getByTestId('customer-reviews-open'));f.reviews.customerHistory.mockRejectedValueOnce(new ApiError('NOT_FOUND'));fireEvent.press(screen.getByTestId('customer-reviews-open'));await screen.findByRole('alert');expect(screen.queryByText('DEMO history')).toBeNull();expect(screen.queryByText('DEMO next')).toBeNull();
});

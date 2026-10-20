import {useRealtimeRefresh} from '../../../app/providers/RealtimeProvider';
import {act,fireEvent,render,screen,waitFor} from '@testing-library/react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import * as Picker from 'expo-image-picker';
import {AppProviders} from '../../../app/providers/AppProviders';
import {AuthProvider} from '../../../app/providers/AuthProvider';
import type {RootStackParamList} from '../../../app/navigation/routes';
import {InvoiceScreen} from './InvoiceScreen';
import {invoiceFixture,invoice} from '../../../../test/helpers/invoices';
import {ApiError} from '../../../lib/http/api-error';
jest.mock('../../../app/providers/RealtimeProvider',()=>({useRealtimeRefresh:jest.fn()}));
jest.mock('expo-image-picker',()=>({launchImageLibraryAsync:jest.fn()}));
const Stack=createNativeStackNavigator<RootStackParamList>();
function mount(f:ReturnType<typeof invoiceFixture>){return render(<AppProviders api={{categories:jest.fn().mockResolvedValue([]),skills:jest.fn().mockResolvedValue([])}}><AuthProvider manager={f.manager}><NavigationContainer><Stack.Navigator screenOptions={{headerShown:false,animation:'none'}}><Stack.Screen name="Invoice" component={InvoiceScreen} initialParams={{id:'job'}}/></Stack.Navigator></NavigationContainer></AuthProvider></AppProviders>);}
async function ready(){await waitFor(()=>expect(screen.getByTestId('invoice-reload')).not.toBeDisabled());}
const press=(id:string)=>fireEvent.press(screen.getByTestId(id));
test('customer validates point limit, retains a lost confirmation operation, then reports payment',async()=>{
 const f=invoiceFixture();mount(f);await ready();expect(screen.getByTestId('invoice-points').props.value).toBe('0');
 fireEvent.changeText(screen.getByTestId('invoice-points'),'90000');press('invoice-confirm');await screen.findByRole('alert');expect(f.invoices.change).not.toHaveBeenCalled();
 fireEvent.changeText(screen.getByTestId('invoice-points'),'300000');press('invoice-confirm');expect(f.invoices.change).not.toHaveBeenCalled();
 press('invoice-max');expect(screen.getByTestId('invoice-points').props.value).toBe('80000');
 f.invoices.change.mockRejectedValueOnce(new ApiError('NETWORK'));press('invoice-confirm');await screen.findByTestId('work-retry');expect(screen.getByTestId('invoice-confirm')).toBeDisabled();press('work-retry');await screen.findByTestId('invoice-paid');await ready();
 expect(f.invoices.change.mock.calls[1]).toEqual(f.invoices.change.mock.calls[0]);expect(f.invoices.change.mock.calls[1][3]).toMatchObject({points_used:'80000',version_id:'v1',expected_version:3});
 press('invoice-paid');await ready();expect(f.invoices.change.mock.calls.at(-1)?.[3]).toMatchObject({confirmed:true});expect(screen.queryByTestId('invoice-paid')).toBeNull();
});
test('customer revision trims reason and new sent version resets point selection',async()=>{
 const f=invoiceFixture();mount(f);await ready();fireEvent.changeText(screen.getByTestId('invoice-points'),'500');press('invoice-revise');expect(screen.getByTestId('invoice-revision-send')).toBeDisabled();fireEvent.changeText(screen.getByTestId('invoice-reason'),'  DEMO correction  ');press('invoice-revision-send');await ready();expect(f.invoices.change.mock.calls[0][3]).toEqual({expected_version:3,reason:'DEMO correction'});expect(screen.queryByTestId('invoice-confirm')).toBeNull();
 f.setInvoice({...invoice,version:6,version_id:'v2'});press('invoice-reload');await ready();expect(screen.getByTestId('invoice-points').props.value).toBe('0');
});
test('worker uploads ready image, keeps saved draft through lost send and confirms receipt only after checkbox',async()=>{
 const f=invoiceFixture(true);f.setInvoice({...invoice,state:'draft',result_asset_ids:[]});mount(f);await ready();expect(screen.getByTestId('invoice-send')).toBeDisabled();
 jest.mocked(Picker.launchImageLibraryAsync).mockResolvedValueOnce({canceled:true,assets:null});press('invoice-pick');await waitFor(()=>expect(Picker.launchImageLibraryAsync).toHaveBeenCalled());expect(f.invoices.upload).not.toHaveBeenCalled();
 jest.mocked(Picker.launchImageLibraryAsync).mockResolvedValueOnce({canceled:false,assets:[{uri:'local',width:1,height:1,file:new File(['DEMO'],'test.png',{type:'image/png'})}]});press('invoice-pick');await screen.findByTestId('invoice-photo');await ready();
 fireEvent.changeText(screen.getByTestId('invoice-materials'),'-1');press('invoice-save');await screen.findByRole('alert');expect(f.invoices.save).not.toHaveBeenCalled();fireEvent.changeText(screen.getByTestId('invoice-materials'),'50000');fireEvent.changeText(screen.getByTestId('invoice-note'),'DEMO edited');
 f.invoices.change.mockRejectedValueOnce(new ApiError('NETWORK'));press('invoice-send');await screen.findByTestId('work-retry');press('work-retry');await screen.findByTestId('invoice-review');await ready();expect(f.invoices.save).toHaveBeenCalledTimes(1);expect(f.invoices.change.mock.calls[1]).toEqual(f.invoices.change.mock.calls[0]);
 f.setInvoice({...invoice,state:'locked',version:4});press('invoice-reload');await ready();expect(screen.getByTestId('invoice-receive')).toBeDisabled();press('invoice-receive-check');press('invoice-receive');await ready();expect(f.invoices.change.mock.calls.at(-1)?.[3]).toEqual({expected_version:4,version_id:'v1',received_in_full:true});expect(screen.queryByTestId('invoice-receive')).toBeNull();
});
test.each(['INSUFFICIENT_POINTS','PARTNER_FUNDING_REQUIRED'] as const)('known financial error %s unlocks form for correction',async code=>{
 const f=invoiceFixture();f.invoices.change.mockRejectedValueOnce(new ApiError(code));mount(f);await ready();press('invoice-confirm');await screen.findByRole('alert');expect(screen.getByTestId('invoice-confirm')).not.toBeDisabled();expect(screen.queryByTestId('work-retry')).toBeNull();
});
test('zero invoice and two marks show completion; history pagination deduplicates entries',async()=>{
 const f=invoiceFixture();f.setInvoice({...invoice,labor:'0',materials:'0',total:'0',cash_due:'0',reward:'0',state:'settled',settled:true,review_eligible:true,customer_payment_reported_at:'2026-10-08T00:00:00Z',worker_receipt_confirmed_at:'2026-10-08T00:00:00Z'});
 const entry={id:'entry',kind:'reward',amount:'3200',unit:'POINT' as const,created_at:'2026-10-08T00:00:00Z',reference_id:'invoice'};
 f.invoices.ledger.mockResolvedValueOnce({items:[entry],next_cursor:'next'}).mockResolvedValueOnce({items:[entry,{...entry,id:'entry2',kind:'points_spent',amount:'-50000'}],next_cursor:null});mount(f);await ready();await screen.findByTestId('invoice-done');press('invoice-history');fireEvent.press(screen.getByText('Xem thêm'));await ready();expect(screen.getAllByText('Point thưởng')).toHaveLength(1);expect(screen.getByText('Point đã dùng')).toBeTruthy();expect(f.invoices.ledger).toHaveBeenLastCalledWith(expect.any(String),undefined,'next');
});
test('missing invoice waits; permission loss removes private content; non-wallet worker can still draft',async()=>{
 const f=invoiceFixture();f.invoices.get.mockRejectedValueOnce(new ApiError('NOT_FOUND'));const v=mount(f);await ready();expect(screen.queryByTestId('invoice-review')).toBeNull();press('invoice-reload');await ready();expect(screen.getByText('DEMO work completed')).toBeTruthy();f.jobs.get.mockRejectedValueOnce(new ApiError('FORBIDDEN'));press('invoice-reload');await ready();expect(screen.queryByText('DEMO work completed')).toBeNull();v.unmount();
 const g=invoiceFixture(true);g.invoices.get.mockRejectedValueOnce(new ApiError('NOT_FOUND'));g.invoices.wallet.mockRejectedValue(new ApiError('FORBIDDEN'));mount(g);await ready();expect(screen.getByTestId('invoice-editor')).toBeTruthy();expect(screen.queryByTestId('invoice-history')).toBeNull();fireEvent.changeText(screen.getByTestId('invoice-labor'),'0');fireEvent.changeText(screen.getByTestId('invoice-materials'),'0');press('invoice-save');await ready();expect(g.invoices.save.mock.calls[0][2]).toMatchObject({expected_version:1,labor:'0',materials:'0',result_asset_ids:[]});
});

test('realtime rechecks an edited invoice: duplicate version keeps points; newer version requires reload',async()=>{
 const f=invoiceFixture();mount(f);await ready();
 fireEvent.changeText(screen.getByTestId('invoice-points'),'50000');
 const refresh=()=>act(()=>jest.mocked(useRealtimeRefresh).mock.calls.at(-1)![0].refresh());
 refresh();await ready();
 expect(screen.getByTestId('invoice-points').props.value).toBe('50000');
 expect(screen.getByTestId('invoice-confirm')).not.toBeDisabled();
 f.setInvoice({...invoice,version:6,version_id:'v2',materials:'50000',total:'250000'});
 refresh();await ready();
 expect(screen.getByTestId('invoice-points').props.value).toBe('50000');
 expect(screen.getByTestId('invoice-confirm')).toBeDisabled();
 press('invoice-reload');await ready();
 expect(screen.getByTestId('invoice-points').props.value).toBe('0');
 expect(screen.getByTestId('invoice-confirm')).not.toBeDisabled();
});

test('invoice send waits for background snapshot without losing the click or replacing the draft',async()=>{
 const f=invoiceFixture(true);f.setInvoice({...invoice,state:'revision_requested'});mount(f);await ready();
 const job=await f.jobs.get.mock.results[0].value;let finish!:(value:typeof job)=>void;
 f.jobs.get.mockReturnValueOnce(new Promise(resolve=>{finish=resolve;}));
 press('invoice-reload');
 await waitFor(()=>expect(f.manager.getSnapshot().busy).toBe(true));
 expect(screen.getByTestId('invoice-materials').props.editable).toBe(true);
 fireEvent.changeText(screen.getByTestId('invoice-materials'),'40000');
 let releaseWrite!:()=>void;const gate=new Promise<void>(resolve=>{releaseWrite=resolve;}),save=f.invoices.save.getMockImplementation()!;
 f.invoices.save.mockImplementationOnce(async(...args)=>{await gate;return save(...args);});
 expect(screen.getByTestId('invoice-send')).not.toBeDisabled();press('invoice-send');
 expect(f.invoices.save).not.toHaveBeenCalled();expect(screen.getByTestId('invoice-send')).toBeDisabled();
 await act(async()=>finish(job));expect(screen.getByTestId('invoice-materials').props.value).toBe('40000');
 await act(async()=>releaseWrite());await screen.findByTestId('invoice-review');await ready();
 expect(f.invoices.save).toHaveBeenCalledTimes(1);expect(f.invoices.save.mock.calls[0][2]).toMatchObject({expected_version:3,materials:'40000'});
});

test('queued invoice confirmation keeps the reviewed version and handles a newer server snapshot as conflict',async()=>{
 const f=invoiceFixture();mount(f);await ready();const job=await f.jobs.get.mock.results[0].value;
 let finish!:(value:typeof job)=>void;f.jobs.get.mockReturnValueOnce(new Promise(resolve=>{finish=resolve;}));
 act(()=>jest.mocked(useRealtimeRefresh).mock.calls.at(-1)![0].refresh());await waitFor(()=>expect(f.manager.getSnapshot().busy).toBe(true));
 fireEvent.changeText(screen.getByTestId('invoice-points'),'50000');press('invoice-confirm');
 f.setInvoice({...invoice,version:6,version_id:'v2'});f.invoices.change.mockRejectedValueOnce(new ApiError('VERSION_CONFLICT'));
 await act(async()=>finish(job));expect(await screen.findAllByRole('alert')).toHaveLength(2);
 expect(f.invoices.change.mock.calls[0][3]).toEqual({expected_version:3,version_id:'v1',points_used:'50000'});
 expect(screen.getByTestId('invoice-points').props.value).toBe('50000');expect(screen.getByTestId('invoice-confirm')).toBeDisabled();expect(f.invoices.change).toHaveBeenCalledTimes(1);
});
test('leaving the invoice screen cancels a queued write before it reaches the API',async()=>{
 const f=invoiceFixture(true);f.setInvoice({...invoice,state:'draft'});const view=mount(f);await ready();const job=await f.jobs.get.mock.results[0].value;
 let finish!:(value:typeof job)=>void;f.jobs.get.mockReturnValueOnce(new Promise(resolve=>{finish=resolve;}));
 act(()=>jest.mocked(useRealtimeRefresh).mock.calls.at(-1)![0].refresh());await waitFor(()=>expect(f.manager.getSnapshot().busy).toBe(true));
 press('invoice-send');view.unmount();await act(async()=>finish(job));expect(f.invoices.save).not.toHaveBeenCalled();expect(f.invoices.change).not.toHaveBeenCalled();
});
test('admin-settled invoice shows settlement separately without inventing a worker receipt or review eligibility',async()=>{
 const f=invoiceFixture(true);f.setInvoice({...invoice,state:'settled',settled:true,customer_payment_reported_at:'2026-10-20T00:00:00Z',worker_receipt_confirmed_at:null,review_eligible:false});mount(f);await ready();expect(screen.getByTestId('invoice-settled-separate')).toBeTruthy();expect(screen.queryByTestId('invoice-receive')).toBeNull();expect(screen.queryByTestId('invoice-done')).toBeNull();
});

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AuthProvider } from '../../../app/providers/AuthProvider';
import { LocaleProvider } from '../../../app/providers/LocaleProvider';
import { LocaleState } from '../../../lib/i18n/locale-state';
import { authFixture } from '../../../../test/helpers/auth';
import { LocationField } from './LocationField';
import { locationsApi } from '../api/locations-api';
import * as Location from 'expo-location';
jest.mock('../api/locations-api', () => ({ locationsApi: { search: jest.fn(), reverse: jest.fn() } }));
jest.mock('expo-location', () => ({ Accuracy:{Balanced:3},requestForegroundPermissionsAsync: jest.fn(), getCurrentPositionAsync: jest.fn() }));
const point={latitude:21,longitude:105};
const result={id:'a',text:'DEMO public address',point,precision:'approximate' as const};
async function mount(){
 const f=authFixture(), change=jest.fn();
 const locale=new LocaleState({read:async()=>null,write:async()=>{}});
 render(<AuthProvider manager={f.manager}><LocaleProvider manager={locale}><LocationField lat="" lng="" prefix="test" onChange={change} /></LocaleProvider></AuthProvider>);
 await waitFor(()=>expect(f.manager.getSnapshot().phase).toBe('anonymous'));
 fireEvent.press(screen.getByTestId('test-pick-location'));
 return {change};
}
beforeEach(()=>{jest.useFakeTimers();jest.clearAllMocks();jest.mocked(locationsApi.search).mockResolvedValue([result]);jest.mocked(locationsApi.reverse).mockResolvedValue(result);});
afterEach(()=>jest.useRealTimers());
// Drive the autocomplete debounce explicitly; machine load must not decide whether the result exists.
async function searchAddress(){fireEvent.changeText(screen.getByTestId('location-query'),'Hanoi');await act(async()=>{jest.advanceTimersByTime(400);});}
test('confirm requires a selected point; changing query invalidates it; cancel never mutates caller',async()=>{
 const {change}=await mount();expect(screen.getByTestId('location-confirm')).toBeDisabled();
 await searchAddress();fireEvent.press(await screen.findByTestId('location-result-0'));
 fireEvent.changeText(screen.getByTestId('location-description'),'DEMO floor 2');expect(screen.getByTestId('location-confirm')).not.toBeDisabled();
 fireEvent.changeText(screen.getByTestId('location-query'),'another');expect(screen.getByTestId('location-confirm')).toBeDisabled();
 fireEvent.press(screen.getByTestId('location-cancel'));expect(change).not.toHaveBeenCalled();expect(screen.queryByTestId('location-query')).toBeNull();
});
test('selection returns a trimmed description and exact point only on confirmation',async()=>{
 const {change}=await mount();fireEvent.changeText(screen.getByTestId('location-query'),'Hanoi');fireEvent.press(screen.getByTestId('location-search'));
 fireEvent.press(await screen.findByTestId('location-result-0'));fireEvent.changeText(screen.getByTestId('location-description'),'  DEMO floor 2  ');fireEvent.press(screen.getByTestId('location-confirm'));
 expect(change).toHaveBeenCalledWith({text:'DEMO floor 2',point,source:'search'});
});
test('denied GPS allows address search without requesting a position',async()=>{
 jest.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue({status:'denied'} as Location.LocationPermissionResponse);
 await mount();fireEvent.press(screen.getByTestId('location-gps'));await screen.findByText(/Chưa được cấp quyền vị trí/);
 await searchAddress();fireEvent.press(await screen.findByTestId('location-result-0'));expect(screen.getByTestId('location-confirm')).not.toBeDisabled();
 expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
});
test('GPS arriving after another address choice cannot overwrite that choice',async()=>{
 let finish!: (value: Location.LocationObject) => void;
 jest.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue({status:'granted'} as Location.LocationPermissionResponse);
 jest.mocked(Location.getCurrentPositionAsync).mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
 const {change}=await mount();fireEvent.press(screen.getByTestId('location-gps'));
 await waitFor(()=>expect(Location.getCurrentPositionAsync).toHaveBeenCalled());
 await searchAddress();fireEvent.press(await screen.findByTestId('location-result-0'));
 await act(async()=>finish({timestamp:Date.now(),coords:{latitude:10,longitude:100,accuracy:20,altitude:null,altitudeAccuracy:null,heading:null,speed:null}}));
 fireEvent.press(screen.getByTestId('location-confirm'));
 expect(change).toHaveBeenCalledWith({text:result.text,point,source:'search'});
 expect(locationsApi.reverse).not.toHaveBeenCalled();
});

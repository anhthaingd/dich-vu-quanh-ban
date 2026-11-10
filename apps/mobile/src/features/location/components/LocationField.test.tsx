import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Keyboard, Platform, StyleSheet, type KeyboardEvent } from 'react-native';
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
afterEach(()=>{jest.useRealTimers();jest.restoreAllMocks();});
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
async function keyboardFixture(platform: 'android' | 'ios') {
 jest.replaceProperty(Platform, 'OS', platform);
 const listeners = new Map<string, (event: KeyboardEvent) => void>();
 const addListener = Keyboard.addListener.bind(Keyboard);
 jest.spyOn(Keyboard, 'addListener').mockImplementation((name, listener) => {
  listeners.set(name, listener); return addListener(name, listener);
 });
 await mount();
 const layout = async (height: number) => {
  await act(async () => fireEvent(screen.getByTestId('location-layout'), 'layout', {
   nativeEvent: { layout: { x: 0, y: 0, width: 400, height } }, persist: () => {},
  }));
 };
 const keyboard = async (name: string, height: number) => {
  await act(async () => listeners.get(name)?.({ duration: 0, easing: 'keyboard', endCoordinates: { screenX: 0, screenY: 900 - height, width: 400, height } }));
 };
 const style = () => StyleSheet.flatten(screen.getByTestId('location-layout').props.style);
 return { layout, keyboard, style };
}
test('Android keyboard transitions leave modal height to the resized native window', async () => {
 const { layout, keyboard, style } = await keyboardFixture('android');
 await layout(900);
 // Compact keyboard/handwriting panels can repeatedly report show/hide frames.
 // The modal window already uses adjustResize; JS must not fix its height too.
 for (const height of [72, 300, 72]) {
  await keyboard('keyboardDidShow', height);
  await layout(900 - height);
  expect(style().height).toBeUndefined();
  expect(style().flex).toBe(1);
  await keyboard('keyboardDidHide', 0);
  await layout(900);
  expect(style().height).toBeUndefined();
 }
 expect(screen.getByTestId('location-query')).toBeOnTheScreen();
 expect(screen.getByTestId('location-confirm')).toBeDisabled();
});
test('iOS keyboard transitions reserve and release space below location controls', async () => {
 const { layout, keyboard, style } = await keyboardFixture('ios');
 await layout(900);
 await keyboard('keyboardWillShow', 300);
 expect(style().paddingBottom).toBe(300);
 await keyboard('keyboardWillHide', 0);
 expect(style().paddingBottom).toBe(0);
 expect(screen.getByTestId('location-query')).toBeOnTheScreen();
});

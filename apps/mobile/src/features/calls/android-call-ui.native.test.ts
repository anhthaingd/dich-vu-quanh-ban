import type {Call} from './models';
function load(os:string,bridge?:unknown){
 let ui:typeof import('./android-call-ui.native').androidCallUi;
 jest.isolateModules(()=>{
  const {NativeModules,Platform}=jest.requireActual('react-native');
  Object.defineProperty(Platform,'OS',{configurable:true,value:os});
  if(bridge)NativeModules.DVQBAndroidCalls=bridge;else delete NativeModules.DVQBAndroidCalls;
  ui=jest.requireActual('./android-call-ui.native').androidCallUi;
 });
 return ui!;
}
test('Android bridge passes credentials only to the foreground service and tolerates unavailable builds',async()=>{
 const bridge={configure:jest.fn(),consumeAction:jest.fn().mockResolvedValue({id:'c',owner:'o',action:'accept'}),start:jest.fn(),updateToken:jest.fn(),running:jest.fn().mockResolvedValue(false),stop:jest.fn()};
 let ui=load('android',bridge);
 expect(ui.available).toBe(true);await ui.configure('o','vi');expect(bridge.configure).toHaveBeenCalledWith('o','vi');
 expect(await ui.consumeAction()).toEqual({id:'c',owner:'o',action:'accept'});
 await ui.start({id:'c'} as Call,'o','DEMO_TOKEN');expect(bridge.start).toHaveBeenCalledWith('c','o',expect.any(String),'DEMO_TOKEN');
 await ui.updateToken('c','DEMO_ROTATED');expect(bridge.updateToken).toHaveBeenCalledWith('c','DEMO_ROTATED');expect(await ui.running('c')).toBe(false);await ui.stop('c');expect(bridge.stop).toHaveBeenCalledWith('c');
 ui=load('android');
 expect(ui.available).toBe(false);expect(await ui.consumeAction()).toBeNull();expect(await ui.running('c')).toBe(true);await ui.configure(null,'en');await ui.start({id:'c'} as Call,'o','DEMO');await ui.updateToken('c','DEMO');await ui.stop('c');
});
test('iOS does not advertise or start the Android call service',async()=>{
 const bridge={start:jest.fn()};const ui=load('ios',bridge);
 expect(ui.available).toBe(false);await ui.start({id:'c'} as Call,'o','DEMO');expect(bridge.start).not.toHaveBeenCalled();
});

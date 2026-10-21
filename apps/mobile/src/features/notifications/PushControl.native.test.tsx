import {fireEvent,render,screen,waitFor} from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import {PushControl} from './PushControl.native';
const mockRegister=jest.fn();
jest.mock('../../app/providers/AuthProvider',()=>({useAuth:()=>({manager:{registerPushDevice:(...args:unknown[])=>mockRegister(...args)}})}));
jest.mock('../../app/providers/LocaleProvider',()=>({useLocale:()=>({t:(key:string)=>key})}));
jest.mock('expo-device',()=>({isDevice:false}));
jest.mock('expo-constants',()=>({__esModule:true,default:{expoConfig:{extra:{eas:{projectId:'demo-project'}}}}}));
jest.mock('expo-notifications',()=>({requestPermissionsAsync:jest.fn(),getExpoPushTokenAsync:jest.fn(),setNotificationChannelAsync:jest.fn(),AndroidImportance:{DEFAULT:3}}));
beforeEach(()=>{jest.clearAllMocks();mockRegister.mockResolvedValue({id:'device'});});
test('native push requests explicit permission and registers the Expo token only after permission is granted',async()=>{
 jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValue({granted:true} as Notifications.NotificationPermissionsStatus);jest.mocked(Notifications.getExpoPushTokenAsync).mockResolvedValue({type:'expo',data:'ExpoPushToken[demo-demo-demo]'});
 render(<PushControl owner="owner"/>);expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();fireEvent.press(screen.getByTestId('push-register'));await screen.findByText('push.registered');
 expect(mockRegister).toHaveBeenCalledWith('owner',{token:'ExpoPushToken[demo-demo-demo]',platform:expect.any(String)},expect.any(String));expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({projectId:'demo-project'});
});
test('denied push permission and provider failure show a retryable status without registering a token',async()=>{
 jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValueOnce({granted:false} as Notifications.NotificationPermissionsStatus).mockResolvedValue({granted:true} as Notifications.NotificationPermissionsStatus);
 render(<PushControl owner="owner"/>);fireEvent.press(screen.getByTestId('push-register'));await screen.findByText('push.permissionDenied');expect(mockRegister).not.toHaveBeenCalled();
 jest.mocked(Notifications.getExpoPushTokenAsync).mockRejectedValue(new Error('network'));fireEvent.press(screen.getByTestId('push-register'));await screen.findByText('push.failed');await waitFor(()=>expect(screen.getByTestId('push-register')).not.toBeDisabled());expect(mockRegister).not.toHaveBeenCalled();
});

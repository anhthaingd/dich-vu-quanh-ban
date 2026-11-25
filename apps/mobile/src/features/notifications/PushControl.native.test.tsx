import {fireEvent,render,screen,waitFor} from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import {PushControl} from './PushControl.native';
import {ApiError} from '../../lib/http/api-error';
import {chatReasons} from '../../lib/errors/reasons/chat';
const mockRegister=jest.fn();
jest.mock('../../app/providers/AuthProvider',()=>({useAuth:()=>({manager:{registerPushDevice:(...args:unknown[])=>mockRegister(...args)}})}));
jest.mock('../../app/providers/LocaleProvider',()=>({useLocale:()=>({t:(key:string)=>key,locale:'en'})}));
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
 jest.mocked(Notifications.getExpoPushTokenAsync).mockRejectedValue(new Error('network'));fireEvent.press(screen.getByTestId('push-register'));await screen.findByText(chatReasons.en.PUSH_DEVICE_TOKEN_FAILED);await waitFor(()=>expect(screen.getByTestId('push-register')).not.toBeDisabled());expect(mockRegister).not.toHaveBeenCalled();
});
test('a server refusal shows the exact reason instead of a generic failure',async()=>{
 jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValue({granted:true} as Notifications.NotificationPermissionsStatus);jest.mocked(Notifications.getExpoPushTokenAsync).mockResolvedValue({type:'expo',data:'ExpoPushToken[demo-demo-demo]'});
 mockRegister.mockRejectedValueOnce(new ApiError('VALIDATION',400,undefined,undefined,undefined,'PUSH_TOKEN_INVALID','token'));
 render(<PushControl owner="owner"/>);fireEvent.press(screen.getByTestId('push-register'));await screen.findByText(chatReasons.en.PUSH_TOKEN_INVALID);
 mockRegister.mockRejectedValueOnce(new ApiError('NETWORK'));fireEvent.press(screen.getByTestId('push-register'));await screen.findByText(/Cannot reach the server/);
});

import {PublicGallery} from './PublicGallery';
import * as apiModule from '../api/gallery-api';
import {act,fireEvent,render,screen,waitFor} from '@testing-library/react-native';
import {NavigationContainer} from '@react-navigation/native';
import * as Picker from 'expo-image-picker';
import {AppProviders} from '../../../app/providers/AppProviders';
import {AuthProvider} from '../../../app/providers/AuthProvider';
import {authFixture,session} from '../../../../test/helpers/auth';
import {GalleryEditor} from './GalleryEditor';
import {ApiError} from '../../../lib/http/api-error';
jest.mock('expo-image-picker',()=>({launchImageLibraryAsync:jest.fn()}));
test('gallery keeps ordered IDs and retries the same upload before save without duplicate photos',async()=>{
 const f=authFixture('saved'),saved=jest.fn(),photo={id:'third',status:'ready' as const,download_url:'http://demo/image',expires_at:'2099-01-01T00:00:00Z'};
 const save=jest.spyOn(f.manager,'saveGallery').mockResolvedValue({partner_id:'partner',version:2,asset_ids:['second','third']});jest.spyOn(f.manager,'gallery').mockResolvedValue({partner_id:'partner',version:1,asset_ids:['first','second']});
 const upload=jest.spyOn(f.manager,'uploadGallery').mockRejectedValueOnce(new ApiError('NETWORK')).mockResolvedValue(photo);jest.spyOn(f.manager,'galleryAsset').mockResolvedValue(photo);
 jest.mocked(Picker.launchImageLibraryAsync).mockResolvedValue({canceled:false,assets:[{uri:'blob:demo',width:1,height:1,file:new Blob(['demo'],{type:'image/png'}) as File}]});
 await act(async()=>{await f.manager.restore();});
 render(<AppProviders api={{categories:jest.fn(),skills:jest.fn()}}><AuthProvider manager={f.manager}><NavigationContainer><GalleryEditor owner={session.user.id} partner={{id:'partner'}} blocked={false} saved={saved}/></NavigationContainer></AuthProvider></AppProviders>);
 await screen.findAllByTestId('evidence-photo');fireEvent.press(screen.getByTestId('gallery-up-1'));fireEvent.press(screen.getByTestId('gallery-remove-1'));fireEvent.press(screen.getByTestId('gallery-pick'));await screen.findByTestId('work-retry');expect(screen.getByTestId('gallery-save')).toBeDisabled();
 fireEvent.press(screen.getByTestId('work-retry'));await waitFor(()=>expect(screen.getByTestId('gallery-save')).toBeEnabled());expect(upload.mock.calls[0]).toEqual(upload.mock.calls[1]);fireEvent.press(screen.getByTestId('gallery-save'));await waitFor(()=>expect(save).toHaveBeenCalledWith(session.user.id,'partner',1,['second','third'],expect.any(String)));expect(saved).toHaveBeenCalled();
});

test('public gallery retries a failed list and only renders images returned by its API',async()=>{
 const list=jest.fn().mockRejectedValueOnce(new ApiError('NETWORK')).mockResolvedValue({partner_id:'partner',version:2,asset_ids:['public-photo']});
 const spy=jest.spyOn(apiModule,'createGalleryApi').mockReturnValue({list,asset:jest.fn().mockResolvedValue({id:'public-photo',status:'ready',download_url:'http://demo/public',expires_at:'2099-01-01T00:00:00Z'}),save:jest.fn(),upload:jest.fn()});
 try{render(<AppProviders api={{categories:jest.fn(),skills:jest.fn()}}><NavigationContainer><PublicGallery id="partner"/></NavigationContainer></AppProviders>);fireEvent.press(await screen.findByTestId('gallery-public-retry'));await screen.findByTestId('evidence-photo');expect(list).toHaveBeenNthCalledWith(2,'partner');}finally{spy.mockRestore();}
});

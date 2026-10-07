import { fireEvent, render, screen } from '@testing-library/react-native';
import { LocaleProvider } from '../../../app/providers/LocaleProvider';
import { LocaleState } from '../../../lib/i18n/locale-state';
import { SearchResultsMap } from './SearchResultsMap';
import type { ResultsMapProps } from './results-map-model';
import type { PartnerCard } from '../../partners/models';
jest.mock('./ResultsMap',()=>({ResultsMap:({onSelect,onError,pins}:ResultsMapProps)=>{
 const {Button}=jest.requireActual('react-native');
 return <><Button title="select pin" onPress={()=>onSelect(pins[0].id)}/><Button title="fail map" onPress={onError}/></>;
}}));
const point={latitude:21,longitude:105};
const card=(id:string,publicPoint:boolean):PartnerCard=>({id,name:id,kind:'solo',verification_status:'unverified',distance_m:1,distance_kind:'service_area',reference_labor:null,review_count:0,stars:null,map_location:publicPoint?{text:'Public address',point}:null});
test('shared pin opens each profile; retry preserves results and paging warning; removed group clears selection',async()=>{
 const locale=new LocaleState({read:async()=> 'vi',write:async()=>{}});await locale.restore();
 const open=jest.fn(),items=[card('a',true),card('b',true),card('private',false)];
 const ui=(rows:PartnerCard[])=> <LocaleProvider manager={locale}><SearchResultsMap items={rows} center={point} hasMore openProfile={open}/></LocaleProvider>;
 const view=render(ui(items));
 expect(screen.getByText('2/3 người cung cấp đã tải có ghim công khai.')).toBeTruthy();
 expect(screen.getByText(/Còn kết quả chưa tải/)).toBeTruthy();
 fireEvent.press(screen.getByText('select pin'));
 expect(screen.getByTestId('map-selected-a')).toBeTruthy();expect(screen.getByTestId('map-selected-b')).toBeTruthy();expect(screen.queryByTestId('map-selected-private')).toBeNull();
 fireEvent.press(screen.getAllByText('Xem hồ sơ')[1]);expect(open).toHaveBeenCalledWith('b');
 fireEvent.press(screen.getByText('fail map'));expect(screen.getByText(/Chưa tải được bản đồ/)).toBeTruthy();
 fireEvent.press(screen.getByText('Thử lại'));expect(screen.queryByText(/Chưa tải được bản đồ/)).toBeNull();expect(screen.getByTestId('map-selected-a')).toBeTruthy();
 view.rerender(ui([card('private',false)]));expect(screen.queryByTestId('map-selected-a')).toBeNull();expect(screen.getByText('0/1 người cung cấp đã tải có ghim công khai.')).toBeTruthy();
});

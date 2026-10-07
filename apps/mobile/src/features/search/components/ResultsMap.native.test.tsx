import { render } from '@testing-library/react-native';
import { ResultsMap } from './ResultsMap.native';
jest.mock('../../location/components/map-model',()=>({mapStyle:()=> 'test-style'}));
jest.mock('@maplibre/maplibre-react-native',()=>{
 const React=jest.requireActual('react');
 const {View}=jest.requireActual('react-native');
 return {
  Map:View,Marker:View,
  Camera:({ref}:{ref:unknown})=>{React.useImperativeHandle(ref,()=>({fitBounds:()=>Promise.resolve()}));return null;}
 };
});
test('camera promise is not returned as an effect cleanup on update or unmount',()=>{
 const error=jest.spyOn(console,'error').mockImplementation(()=>{});
 try{
  const props={center:{latitude:21,longitude:105},pins:[],selected:null,onSelect:jest.fn(),onError:jest.fn(),centerLabel:'Origin'};
  const view=render(<ResultsMap {...props}/>);
  view.rerender(<ResultsMap {...props} center={{latitude:22,longitude:106}}/>);
  view.unmount();
  expect(error).not.toHaveBeenCalled();
 }finally{error.mockRestore();}
});

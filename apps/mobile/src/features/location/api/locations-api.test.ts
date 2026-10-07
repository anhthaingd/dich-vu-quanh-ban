import { createLocationsApi } from './locations-api';
const signal=new AbortController().signal;
const point={latitude:0,longitude:0};
const item={id:'1',text:'DEMO address',point,precision:'approximate'};
const response=(body:unknown,status=200)=>({ok:status===200,status,headers:{get:()=>null},json:async()=>body}) as unknown as Response;
test('lookup sends text in POST body, accepts zero, validates provider-normalized envelope',async()=>{
 const request=jest.fn().mockResolvedValue(response({items:[item],attribution:'Geoapify'}));const api=createLocationsApi('http://localhost/v1/',request);
 expect(await api.search('geocode','DEMO address','ja',signal,point)).toEqual([item]);expect(request.mock.calls[0][0]).toBe('http://localhost/v1/locations/geocode');expect(JSON.parse(request.mock.calls[0][1].body)).toEqual({text:'DEMO address',locale:'ja',bias:point});
 request.mockResolvedValue(response({address:null,attribution:'Geoapify'}));expect(await api.reverse(point,'vi',signal)).toBeNull();
 request.mockResolvedValue(response({items:[{...item,point:{latitude:91,longitude:0}}],attribution:'Geoapify'}));await expect(api.search('autocomplete','DEMO','vi',signal)).rejects.toMatchObject({code:'INVALID_RESPONSE'});
 await expect(createLocationsApi(undefined,request).reverse(point,'en',signal)).rejects.toMatchObject({code:'CONFIG'});
});

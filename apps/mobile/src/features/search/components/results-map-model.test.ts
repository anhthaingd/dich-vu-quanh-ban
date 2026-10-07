import { resultPins, resultBounds } from './results-map-model';
import type { PartnerCard } from '../../partners/models';
const point={latitude:0,longitude:0};
const card=(id:string,location:PartnerCard['map_location']):PartnerCard=>({id,name:id,kind:'solo',verification_status:'unverified',distance_m:0,distance_kind:'service_area',reference_labor:null,review_count:0,stars:null,map_location:location});
test('public pins include zero, omit missing points, group coincident providers and deduplicate identities',()=>{
 const a=card('a',{text:'Public',point}),b=card('b',{text:'Public',point});
 const pins=resultPins([a,b,a,card('private',null)]);
 expect(pins).toHaveLength(1);expect(pins[0].partners.map(p=>p.id)).toEqual(['a','b']);
 expect(resultBounds({latitude:1,longitude:2},pins)).toEqual([-0.002,-0.002,2.002,1.002]);
});
test('bounds stay inside valid coordinates at the world edges',()=>{
 expect(resultBounds({latitude:90,longitude:180},[])).toEqual([179.998,89.998,180,90]);
 expect(resultBounds({latitude:-90,longitude:-180},[])).toEqual([-180,-90,-179.998,-89.998]);
});

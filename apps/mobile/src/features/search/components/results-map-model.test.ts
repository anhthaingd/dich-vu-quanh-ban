import { clusterPins, resultPins, resultBounds } from './results-map-model';
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
test('zoom clusters nearby results and splits them while preserving every provider',()=>{
 const pins=[{id:'a',point:{latitude:21,longitude:105},partners:[{id:'a'} as PartnerCard]},{id:'b',point:{latitude:21.00001,longitude:105.00001},partners:[{id:'b'} as PartnerCard]}];
 expect(clusterPins(pins,5)).toHaveLength(1);expect(clusterPins(pins,22)).toHaveLength(2);
 expect(clusterPins(pins,5).flatMap(p=>p.partners.map(v=>v.id))).toEqual(['a','b']);
});

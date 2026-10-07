import { HttpException, ServiceUnavailableException } from '@nestjs/common';
import { attribution, type LocationAction, type LocationInput, type LocationResponse, type LocationResult } from '../../modules/locations/locations.input.js';
export class GeoapifyProvider {
  constructor(private readonly key?:string,private readonly transport:typeof fetch=fetch) {}
  async lookup(action:LocationAction,input:LocationInput):Promise<LocationResponse> {
    if(!this.key)throw new ServiceUnavailableException();
    const url=new URL('https://api.geoapify.com/v1/geocode/'+(action==='geocode'?'search':action));
    url.searchParams.set('apiKey',this.key);url.searchParams.set('format','json');url.searchParams.set('lang',input.locale);url.searchParams.set('limit',action==='reverse'?'1':'5');
    if(action==='reverse') {url.searchParams.set('lat',String(input.point!.latitude));url.searchParams.set('lon',String(input.point!.longitude));}
    else {url.searchParams.set('text',input.text!);url.searchParams.set('filter','countrycode:vn');if(input.bias)url.searchParams.set('bias',`proximity:${input.bias.longitude},${input.bias.latitude}`);}
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),6000);
    try {
      const response=await this.transport(url,{signal:controller.signal,redirect:'error'});
      if(response.status===429)throw new HttpException('Rate limited',429);
      if(!response.ok)throw new ServiceUnavailableException();
      const body:unknown=await response.json();
      if(!body||typeof body!=='object'||!('results' in body)||!Array.isArray(body.results))throw new ServiceUnavailableException();
      const items:LocationResult[]=body.results.slice(0,5).map((v:unknown,i:number)=>{
        if(!v||typeof v!=='object')throw new ServiceUnavailableException();
        const r=v as Record<string,unknown>;
        if(typeof r.formatted!=='string'||!r.formatted.trim()||r.formatted.length>1000||typeof r.lat!=='number'||!Number.isFinite(r.lat)||Math.abs(r.lat)>90||typeof r.lon!=='number'||!Number.isFinite(r.lon)||Math.abs(r.lon)>180)throw new ServiceUnavailableException();
        return {id:typeof r.place_id==='string'?r.place_id.slice(0,512):String(i),text:r.formatted,point:action==='reverse'?input.point!:{latitude:r.lat,longitude:r.lon},precision:r.result_type==='building'?'address':'approximate'};
      });
      return action==='reverse'?{address:items[0]??null,attribution}:{items,attribution};
    } catch(error) {
      // Never propagate provider URL/key, response body, address or fetch cause to logs.
      if(error instanceof HttpException)throw error;
      if(controller.signal.aborted)throw new HttpException('Location timeout',504);
      throw new ServiceUnavailableException();
    } finally {clearTimeout(timer);}
  }
}

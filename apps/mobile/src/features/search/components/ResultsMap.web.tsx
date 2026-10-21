import { useEffect, useRef } from 'react';
import { Map, Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { mapStyle } from '../../location/components/map-model';
import { clusterPins, resultBounds, type ResultsMapProps } from './results-map-model';
export function ResultsMap(props:ResultsMapProps) {
  const host=useRef<HTMLDivElement>(null),map=useRef<Map|null>(null),markers=useRef<Marker[]>([]),latest=useRef(props);latest.current=props;
  const draw=useRef(()=>{});
  draw.current=()=>{
    const instance=map.current;if(!instance)return;
    markers.current.forEach(m=>m.remove());markers.current=[];
    const {center,pins,selected,centerLabel}=latest.current;
    const origin=document.createElement('div');origin.setAttribute('aria-label',centerLabel);origin.style.cssText='width:16px;height:16px;border-radius:50%;background:#147d73;border:3px solid white;';
    markers.current.push(new Marker({element:origin}).setLngLat([center.longitude,center.latitude]).addTo(instance));
    clusterPins(pins,instance.getZoom()).forEach((pin,index)=>{
      const el=document.createElement('button');el.type='button';el.textContent=pin.partners.length>1?`${pin.partners.length}×`:String(index+1);
      el.setAttribute('aria-label',pin.partners.map(p=>p.name).join(', '));el.dataset.testid=`result-pin-${pin.partners[0].id}`;
      el.style.cssText=`min-width:36px;height:36px;border-radius:50%;border:3px solid white;background:${selected===pin.id?'#102b4e':'#2455dc'};color:white;font-weight:700;cursor:pointer;box-shadow:0 2px 6px #0004;`;
      el.onclick=()=>latest.current.onSelect(pin.id,pin.partners);
      markers.current.push(new Marker({element:el}).setLngLat([pin.point.longitude,pin.point.latitude]).addTo(instance));
    });
  };
  useEffect(()=>{
    const style=mapStyle();if(!style||!host.current){latest.current.onError();return;}
    let instance:Map;
    try{instance=new Map({container:host.current,style,center:[latest.current.center.longitude,latest.current.center.latitude],zoom:12,maxZoom:18,attributionControl:{compact:true}});}catch{latest.current.onError();return;}
    map.current=instance;
    instance.on('zoomend',()=>draw.current());
    instance.on('error',()=>latest.current.onError());
    instance.on('load',()=>{draw.current();instance.fitBounds(resultBounds(latest.current.center,latest.current.pins),{padding:40,maxZoom:15,duration:0});});
    const resize=new ResizeObserver(()=>instance.resize());resize.observe(host.current);
    return()=>{resize.disconnect();markers.current.forEach(m=>m.remove());markers.current=[];instance.remove();map.current=null;};
  },[]);
  useEffect(()=>{draw.current();map.current?.fitBounds(resultBounds(props.center,props.pins),{padding:40,maxZoom:15,duration:0});},[props.center,props.pins]);
  useEffect(()=>{draw.current();},[props.selected,props.centerLabel]);
  return <div ref={host} style={{height:'100%',width:'100%'}} />;
}

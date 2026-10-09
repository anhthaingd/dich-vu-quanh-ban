import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AppProviders } from '../../../app/providers/AppProviders';
import { ServiceFilter } from './ServiceFilter';
import type { CatalogApi, Category } from '../../catalog/models/catalog.types';
import { LocaleState } from '../../../lib/i18n/locale-state';
const industry: Category = {id:'industry',code:'industry',name:'Điện nước',name_vi:'Điện nước',name_locale:'vi',parent_id:null,active:true};
const group: Category = {...industry,id:'group',name:'Điện',parent_id:'industry'};
const skill = {id:'socket',code:'socket',name:'Thay ổ cắm',name_vi:'Thay ổ cắm',name_locale:'vi' as const,category_ids:['group'],schema_version:1,form_schema:{}};
function api(): CatalogApi {return {categories:jest.fn(async id => id === 'industry' ? [group] : id ? [] : [industry]),skills:jest.fn(async () => [skill])};}
test('choose industry → group → service, cancel a draft, and explicitly clear selection',async()=>{
 const onChange=jest.fn(), catalog=api();
 const view=render(<AppProviders api={catalog}><ServiceFilter value={{}} onChange={onChange}/></AppProviders>);
 fireEvent.press(screen.getByTestId('search-service-open'));
 fireEvent.press(await screen.findByTestId('service-category-industry'));
 fireEvent.press(await screen.findByTestId('service-category-group'));
 fireEvent.press(await screen.findByTestId('service-skill-socket'));
 expect(onChange).toHaveBeenLastCalledWith({categoryId:'group',skillId:'socket'});
 view.rerender(<AppProviders api={catalog}><ServiceFilter value={{categoryId:'group',skillId:'socket'}} onChange={onChange}/></AppProviders>);
 expect(await screen.findByText('Thay ổ cắm')).toBeTruthy();
 fireEvent.press(screen.getByTestId('search-service-open'));
 fireEvent.press(screen.getByTestId('service-root'));
 fireEvent.press(screen.getByTestId('service-cancel'));
 expect(onChange).toHaveBeenCalledTimes(1);
 fireEvent.press(screen.getByTestId('search-service-open'));
 await act(async()=>fireEvent.press(screen.getByTestId('service-all')));
 expect(onChange).toHaveBeenLastCalledWith({});
});
test('category-only selection and failed load retry never silently select all',async()=>{
 const catalog=api(),onChange=jest.fn();
 jest.mocked(catalog.categories).mockRejectedValueOnce(new Error('offline'));
 render(<AppProviders api={catalog}><ServiceFilter value={{categoryId:'group'}} onChange={onChange}/></AppProviders>);
 fireEvent.press(screen.getByTestId('search-service-open'));
 fireEvent.press(await screen.findByRole('button',{name:'Thử lại'}));
 const apply=await screen.findByTestId('service-category-apply');
 await act(async()=>fireEvent.press(apply));
 expect(onChange).toHaveBeenCalledWith({categoryId:'group'});
});
test('locale changes preserve IDs and ignore an old response',async()=>{
 const catalog=api(),onChange=jest.fn();
 let resolve!: (v: typeof skill[])=>void;
 catalog.skills=jest.fn((_id,_signal,locale)=>locale==='en' ? new Promise(r=>{resolve=r;}) : Promise.resolve([{...skill,name:locale==='ja'?'コンセント交換':skill.name,name_locale:locale??'vi'}]));
 const localeManager=new LocaleState({read:async()=>null,write:async()=>undefined});
 render(<AppProviders api={catalog} localeManager={localeManager}><ServiceFilter value={{categoryId:'group',skillId:'socket'}} onChange={onChange}/></AppProviders>);
 await screen.findByText('Thay ổ cắm');
 await act(async()=>localeManager.select('en'));
 await act(async()=>localeManager.select('ja'));
 await screen.findByText('コンセント交換');
 await act(async()=>resolve([{...skill,name:'STALE'}]));
 expect(screen.queryByText('STALE')).toBeNull();expect(onChange).not.toHaveBeenCalled();
});

test('discovery categories use real IDs, selected service stays visible and all clears both filters',async()=>{
 const onChange=jest.fn(),catalog=api();
 const view=render(<AppProviders api={catalog}><ServiceFilter value={{categoryId:'group',skillId:'socket'}} onChange={onChange} locationControl={<></>}/></AppProviders>);
 expect((await screen.findByTestId('home-category-industry')).props.accessibilityState).toEqual({selected:true});
 await screen.findByText('Thay ổ cắm');
 fireEvent.press(screen.getByTestId('home-category-industry'));
 expect(onChange).toHaveBeenLastCalledWith({categoryId:'industry'});
 view.rerender(<AppProviders api={catalog}><ServiceFilter value={{categoryId:'industry'}} onChange={onChange} locationControl={<></>}/></AppProviders>);
 fireEvent.press(screen.getByTestId('home-category-all'));
 expect(onChange).toHaveBeenLastCalledWith({});
});
test('catalog text lookup matches unaccented names and sends the selected skill ID',async()=>{
 const onChange=jest.fn(),catalog=api();
 render(<AppProviders api={catalog}><ServiceFilter value={{}} onChange={onChange}/></AppProviders>);
 fireEvent.press(screen.getByTestId('search-service-open'));
 fireEvent.changeText(screen.getByTestId('service-query'),'O CAM');
 fireEvent.press(await screen.findByTestId('service-match-socket'));
 expect(onChange).toHaveBeenCalledWith({categoryId:'group',skillId:'socket'});
 expect(screen.queryByTestId('service-query')).toBeNull();
});
test('text lookup has retry, empty state and never selects a service on failure',async()=>{
 const onChange=jest.fn(),catalog=api();
 jest.mocked(catalog.skills).mockRejectedValueOnce(new Error('offline'));
 render(<AppProviders api={catalog}><ServiceFilter value={{}} onChange={onChange}/></AppProviders>);
 fireEvent.press(screen.getByTestId('search-service-open'));
 fireEvent.changeText(screen.getByTestId('service-query'),'ổ cắm');
 fireEvent.press(await screen.findByRole('button',{name:'Thử lại'}));
 await screen.findByTestId('service-match-socket');
 fireEvent.changeText(screen.getByTestId('service-query'),'does not exist');
 expect(await screen.findByText('Chưa có dịch vụ đang hoạt động.')).toBeTruthy();
 expect(onChange).not.toHaveBeenCalled();
});

import {CatalogContext} from './admin/CatalogContext';
import {activeCatalog,activeSkills} from './admin/model.mjs';
import React,{useState} from 'react';
import {Search,X,Check} from 'lucide-react';
import {normalize} from './skill-catalog.mjs';
export function SkillPicker({value,onChange}){
 const catalog=React.useContext(CatalogContext),industries=activeCatalog(catalog),skills=activeSkills(catalog);
 const [query,setQuery]=useState(''),[industry,setIndustry]=useState('all');
 const toggle=name=>onChange(value.includes(name)?value.filter(s=>s!==name):[...value,name]);
 const results=skills.filter(s=>(industry==='all'||s.industryId===industry)&&normalize(s.name+' '+s.industry+' '+s.group).includes(normalize(query)));
 return <section className="ds-panel skill-picker"><h3>02 · Kỹ năng cung cấp</h3><p className="muted">Chọn nhiều kỹ năng ở một hoặc nhiều ngành. Chỉ chọn những việc bạn thực sự nhận làm.</p>
 <div className="skill-selected"><strong>Đã chọn {value.length} kỹ năng</strong>{value.length?<div className="skill-chips">{value.map(name=><button type="button" key={name} onClick={()=>toggle(name)} aria-label={'Bỏ kỹ năng '+name}>{name}<X size={14}/></button>)}</div>:<p className="muted">Chọn ít nhất một kỹ năng bên dưới.</p>}</div>
 <label className="ds-field"><span>Tìm kỹ năng</span><div className="skill-search"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Ví dụ: máy giặt, camera, grooming…"/></div></label>
 <label className="ds-field"><span>Lọc theo ngành</span><select value={industry} onChange={e=>setIndustry(e.target.value)}><option value="all">Tất cả {industries.length} ngành</option>{industries.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</select></label>
 <p className="muted" role="status">{results.length} kỹ năng phù hợp · lựa chọn được giữ khi đổi bộ lọc</p>
 {!results.length&&<div className="ds-empty"><Search size={24}/><h3>Chưa tìm thấy kỹ năng</h3><p>Thử từ khóa khác hoặc xem tất cả ngành.</p><button type="button" className="text-button" onClick={()=>{setQuery('');setIndustry('all')}}>Xóa bộ lọc kỹ năng</button></div>}
 <div className="skill-results">{industries.map(i=>{const found=results.filter(s=>s.industryId===i.id);if(!found.length)return null;return <fieldset className="profile-options skill-group" key={i.id}><legend>{i.name}</legend>{i.groups.map(g=>{const rows=found.filter(s=>g.skills.some(k=>k.id===s.id));return rows.length?<div key={g.id}><p className="skill-group-label">{g.name}</p>{rows.map(s=><label key={s.id} className={value.includes(s.name)?'is-selected':''}><input type="checkbox" checked={value.includes(s.name)} onChange={()=>toggle(s.name)}/><span>{s.name}</span>{value.includes(s.name)&&<Check size={16}/>}</label>)}</div>:null})}</fieldset>})}</div>
 <p className="muted">Danh mục do admin quản lý; các mục ngừng không cho chọn mới. Có thể bổ sung kỹ năng qua danh mục quản trị; không giới hạn ở ngành ban đầu của hồ sơ.</p></section>;
}

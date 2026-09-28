import {skillNames} from './skill-catalog.mjs';
import {activeSkills} from './admin/model.mjs';
export function hireIssue(provider,availability,catalog,skill){
 if(!provider||provider.suspended||availability[provider.id]===false)return 'Partner đang tạm ngừng nhận yêu cầu mới. Hãy chọn người khác.';
 if(skill&&(!skillNames(provider).includes(skill)||!activeSkills(catalog).some(s=>s.name===skill)))return 'Dịch vụ đã thay đổi. Hãy chọn lại kỹ năng đang được cung cấp.';
 return '';
}
export const customerRoom=actor=>`p${actor.partnerId===2?(actor.employeeId===100?2:actor.employeeId):actor.partnerId}:main`;
export function partnerTargets(job,actors){
 const manager=Object.keys(actors).find(k=>actors[k].partnerId===job.partner.id&&actors[k].manager);
 const employee=job.partner.id===2&&job.assignedId?Object.keys(actors).find(k=>actors[k].employeeId===job.assignedId)||`member-${job.assignedId}`:null;
 return [...new Set([manager,employee].filter(Boolean))];
}

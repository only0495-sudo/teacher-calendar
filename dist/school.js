'use strict';
// Human-verified school data is loaded once. Later user edits are never overwritten.
document.body.insertAdjacentHTML('beforeend',`<dialog id="weeklyDialog" style="width:min(960px,calc(100% - 28px))"><div class="modal-head"><h2>每週課表</h2><button class="close" data-close aria-label="關閉">×</button></div><div class="modal-body"><p id="weeklyCaption" class="muted"></p><div id="weeklyTable" class="import-table" style="max-height:65vh"></div><p class="help">探究實作列出原課表時段供參考；實際授課／換課日期請至探究專區登記。未自行推算學期目標或已完成堂數。</p></div></dialog>`);
$('#showSchedule').onclick=()=>{
 $('#weeklyCaption').textContent=`${state.teacher} · ${state.termName}`;
 const times=['08:10','09:10','10:10','11:10','13:10','14:20','15:20','16:20'];
 const allTimes=[...new Set([...times,...state.classes.flatMap(c=>c.slots.map(s=>s.time))])].sort();
 $('#weeklyTable').innerHTML=`<table><thead><tr><th>節次／時間</th>${[1,2,3,4,5].map(d=>`<th>星期${week[d]}</th>`).join('')}</tr></thead><tbody>${allTimes.map(t=>`<tr><th>${times.indexOf(t)>=0?'第 '+(times.indexOf(t)+1)+' 節<br>':''}${t}</th>${[1,2,3,4,5].map(d=>`<td>${state.classes.filter(c=>c.slots.some(s=>s.day===d&&s.time===t)).map(c=>`<b>${esc(c.name)}</b><br>${esc(c.subject)}${c.mode==='inquiry'?'<br><small>原排時段</small>':''}`).join('<hr>')||'—'}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
 $('#weeklyDialog').showModal();
};
const previousRefreshInquiry=refreshInquiry;
refreshInquiry=function(){previousRefreshInquiry();let reference=$('#inquiryReference');if(!reference){reference=document.createElement('p');reference.id='inquiryReference';reference.className='help';$('#inquiryClass').closest('label').after(reference);}const c=state.classes.find(c=>c.id===currentInquiry);reference.textContent=c?.slots.length?`原課表：${c.slots.map(s=>'週'+week[s.day]+' '+s.time).join('、')}${c.room?' · '+c.room:''}。實際換課另行登記。`:'尚無原排固定時段。';};
const previousSchoolRender=render;
render=function(){
 previousSchoolRender();
 const real=state.teacher==='瑋澤老師';
 $('#sourceLabel').textContent=real?'已套用林口高中 115-1 行事曆及老師課表':'校內日期依目前工作區';
 $('#sourceReview').innerHTML=real?`<b>已輸入：8 個基礎物理班／每週 15 堂，3 個探究實作班／原排每週 5 堂</b><p class="help">探究實作的預定總堂數與實際完成紀錄尚未提供，請至專區設定。一般課程已排除學校明定假日、段考、運動會與高一校外教學；12/24、12/31 高一成果活動只排除上午課程。</p><details><summary>活動適用範圍待確認（未自動扣課）</summary>${(state.sourceNotes||[]).map(n=>`<p class="help"><b>${esc(n.date)}</b> ${esc(n.text)}</p>`).join('')}<p class="help">${esc(state.sourceDescription||'')}</p></details>`:'';
 $('#sourceReview').classList.toggle('hidden',!real);
 if(real)$('#upcoming').innerHTML=$('#upcoming').innerHTML.replaceAll('・示範／可編輯','');
 if(real)$('#inquirySummary').insertAdjacentHTML('beforeend','<p class="help">已保存照片中的原排時段；「每週課表」可查看全部課程。實際換課與完成堂數請另行登記。</p>');
};
// Time-bounded closures avoid cancelling an entire day for a morning-only event.
$('#extraField').insertAdjacentHTML('beforebegin',`<div class="form-grid" id="closureTimes"><label class="field"><span>停課開始（留空為全天）</span><input name="startTime" type="time"></label><label class="field"><span>停課結束</span><input name="endTime" type="time"></label></div>`);
const previousOpenSchoolEvent=openEvent;
openEvent=function(){previousOpenSchoolEvent();$('#closureTimes').classList.remove('hidden');};$('#addEvent').onclick=openEvent;
$('#eventForm').elements.type.onchange=e=>{$('#extraField').classList.toggle('hidden',e.target.value!=='extra');$('#closureTimes').classList.toggle('hidden',e.target.value!=='off');};
$('#eventForm').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target),event={id:uid(),title:f.get('title').trim(),date:f.get('date'),type:f.get('type'),classId:f.get('classId'),time:f.get('time')};if(event.type==='off'&&(f.get('startTime')||f.get('endTime'))){event.startTime=f.get('startTime');event.endTime=f.get('endTime');}const next=structuredClone(state);next.events.push(event);if(!validate(next)){toast('請確認名稱、日期及時間；部分停課需同時填寫開始與結束時間。');return;}state=next;const ok=save();$('#eventDialog').close();render();if(ok)toast('活動已儲存並重算堂數。');};
renderEventList=function(){$('#eventList').innerHTML=[...state.events].sort((a,b)=>a.date.localeCompare(b.date)).map(e=>`<div class="event-manage"><span>${e.date} · ${esc(e.title)}<br><span class="muted" style="font-size:11px">${e.classId==='all'?'全校':esc(clName(e.classId))} · ${e.type==='off'?(e.startTime?e.startTime+'–'+e.endTime+' 停課':'全天停課'):'補課 '+e.time}</span></span><button type="button" class="btn" data-delete-event="${esc(e.id)}" aria-label="刪除${esc(e.title)}">刪除</button></div>`).join('');};
// Old imported profiles remain available; the new verified profile is selected on first load.
selectedClass=state.classes[0]?.id;render();

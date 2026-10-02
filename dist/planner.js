'use strict';

// Weekly feedback is partitioned by Taipei Saturday, never erased on rollover.
$('#inquirySummary').insertAdjacentHTML('beforebegin',`<section class="panel class-panel" id="feedbackPanel">
 <div class="row spread"><h2>表單回饋</h2><label>回饋週次 <select id="feedbackWeek" aria-label="回饋週次"></select></label></div>
 <p class="help">高一、高二各班共用的回饋整理。每週六換新空白格，舊週內容可從週次選單查閱。</p>
 <form id="feedbackForm"><div class="class-panel-columns">${[['grade1','高一'],['grade2','高二']].map(([id,label])=>`<label class="field"><span>${label}表單回覆</span><textarea id="${id}Feedback" rows="7" maxlength="12000" placeholder="整理學生問題、各班狀況，以及下週要回饋的內容…"></textarea></label>`).join('')}</div>
 <div class="row spread"><span class="help" id="feedbackStatus" role="status"></span><button class="btn primary" type="submit">儲存表單回饋</button></div></form></section>`);
let feedbackContext='',feedbackSelected='',feedbackCurrent='',feedbackWorkspace='';
function feedbackPrefix(){return 'keri-feedback-draft:'+cloudOwner+':'+book.active+':';}
function feedbackDraft(key){try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}}
function renderFeedback(){
 const visible=state.teacher==='瑋澤老師';$('#feedbackPanel').hidden=!visible;if(!visible)return;
 $('#inquirySummary').classList.add('hidden');
 const current=CalendarEngine.feedbackWeek(taipeiNow().date),workspace=feedbackPrefix();
 if(workspace!==feedbackWorkspace||current!==feedbackCurrent){feedbackSelected=current;feedbackWorkspace=workspace;feedbackCurrent=current;}
 const weeks=new Set([current,feedbackSelected,...Object.keys(state.feedback||{})]);
 // Include locally saved drafts from a previous week even if never submitted.
 try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k.startsWith(workspace)&&validDate(k.slice(workspace.length)))weeks.add(k.slice(workspace.length));}}catch{}
 $('#feedbackWeek').innerHTML=[...weeks].sort().reverse().map(w=>`<option value="${w}">${w} ～ ${addDays(w,6)}${w===current?'（本週）':''}</option>`).join('');$('#feedbackWeek').value=feedbackSelected;
 const context=workspace+feedbackSelected,draft=feedbackDraft(context),stored=state.feedback?.[feedbackSelected];
 if(context!==feedbackContext||!draft&&!$('#feedbackForm').contains(document.activeElement)){
  feedbackContext=context;for(const g of ['grade1','grade2'])$('#'+g+'Feedback').value=draft?.[g]??stored?.[g]??'';
  $('#feedbackStatus').textContent=draft?'草稿已保留在此裝置，請儲存以同步':stored?'已儲存；可繼續補充':'本週空白回饋 · 臺北時間週六起算';
 }
}
$('#feedbackWeek').onchange=e=>{feedbackSelected=e.target.value;renderFeedback();};
$('#feedbackForm').oninput=()=>{const record={grade1:$('#grade1Feedback').value,grade2:$('#grade2Feedback').value};try{localStorage.setItem(feedbackContext,JSON.stringify(record));$('#feedbackStatus').textContent='草稿已保留，請按「儲存表單回饋」同步';}catch{$('#feedbackStatus').textContent='草稿保存失敗，請立即儲存或複製文字。';}};
$('#feedbackForm').onsubmit=e=>{e.preventDefault();const next=structuredClone(state);next.feedback||={};next.feedback[feedbackSelected]={grade1:$('#grade1Feedback').value,grade2:$('#grade2Feedback').value,updatedAt:new Date().toISOString()};if(!commitPlanner(next))return;try{localStorage.removeItem(feedbackContext);}catch{}$('#feedbackStatus').textContent='已儲存；雲端結果請看上方同步狀態';};

$('#showSchedule').insertAdjacentHTML('afterend','<button class="btn" id="adjustLessons">調課／補課／刪課</button>');
document.body.insertAdjacentHTML('beforeend',`<dialog id="adjustDialog" class="adjust-dialog"><div class="modal-head"><h2>調課／補課／刪課</h2><button class="close" data-close aria-label="關閉">×</button></div><div class="modal-body">
 <p class="help">只調整指定日期，不更動每週固定課表。原時段及被取代的課程會從當週行事曆消失；既有進度仍保留於「進度紀錄」。探究實作請從探究專區調整。</p>
 <form id="adjustForm"><div class="form-grid"><label class="field"><span>操作</span><select id="adjustType"><option value="move">調課</option><option value="extra">補課</option><option value="delete">刪課</option></select></label><label class="field"><span>班級／科目</span><select id="adjustClass"></select></label></div>
 <div id="adjustSourceFields"><label class="field"><span>原上課週次（選擇該週任一天）</span><input id="adjustWeek" type="date" required></label><label class="field"><span>要調整的課程</span><select id="adjustSource" required></select></label></div>
 <div id="adjustTargetFields" class="form-grid"><label class="field"><span>新的上課日期</span><input id="adjustDate" type="date" required></label><label class="field"><span>新的上課時間</span><input id="adjustTime" type="time" required value="09:10"></label></div>
 <div id="adjustConflicts" class="help" role="status"></div><label class="field"><span>原因／備註（選填）</span><input id="adjustReason" maxlength="300" placeholder="例如：配合校內活動，改至週四下午"></label>
 <p id="adjustPreview" class="adjust-preview" aria-live="polite"></p><button type="submit" class="btn primary" id="applyAdjustment">套用本次調整</button></form>
 <h3 class="section-title">該週實際課表</h3><div id="adjustWeekTable" class="import-table"></div>
 <h3 class="section-title">調整紀錄</h3><p class="help">可由最新一筆開始復原，避免影響後續調整。</p><div id="adjustHistory"></div></div></dialog>`);
let adjustmentSources=[];
function commitPlanner(next){if(!validate(next)){toast('資料無效，請檢查填寫內容。');return false;}const previous=state;state=next;if(!save()){state=previous;book.workspaces.find(w=>w.id===book.active).data=previous;return false;}return true;}
function adjustmentSource(){return adjustmentSources.find(l=>l.key===$('#adjustSource').value);}
function lessonLabel(l){return `${l.date} ${l.time} · ${clName(l.classId)}`;}
function adjustmentCollisions(){const date=$('#adjustDate').value,time=$('#adjustTime').value,source=$('#adjustType').value==='extra'?null:adjustmentSource();if(!validDate(date)||!validTime(time))return [];const mins=t=>Number(t.slice(0,2))*60+Number(t.slice(3));return lessons(date).filter(l=>l.key!==source?.key&&mins(l.time)<mins(time)+50&&mins(l.time)+(l.minutes||50)>mins(time));}
function refreshAdjustmentSources(){
 const date=$('#adjustWeek').value,old=$('#adjustSource').value;adjustmentSources=[];
 if(validDate(date)){const monday=addDays(date,-((weekday(date)+6)%7));for(let i=0;i<7;i++)adjustmentSources.push(...lessons(addDays(monday,i),$('#adjustClass').value));}
 $('#adjustSource').innerHTML=adjustmentSources.map(l=>`<option value="${esc(l.key)}">${esc(lessonLabel(l))}${l.extra?'（補課）':l.moved?'（已調課）':''}</option>`).join('')||'<option value="">本週沒有可調整的課程</option>';
 if(adjustmentSources.some(l=>l.key===old))$('#adjustSource').value=old;
 refreshAdjustmentPreview();renderAdjustmentTable();
}
function refreshAdjustmentPreview(){
 const type=$('#adjustType').value,source=adjustmentSource(),extra=type==='extra',del=type==='delete';
 $('#adjustSourceFields').hidden=extra;$('#adjustSource').disabled=extra;$('#adjustWeek').required=!extra;
 $('#adjustTargetFields').hidden=del;for(const id of ['adjustDate','adjustTime']){$('#'+id).disabled=del;}
 const collisions=del?[]:adjustmentCollisions();
 $('#adjustConflicts').innerHTML=collisions.length?'<b>新時段重疊的課程：</b>'+collisions.map(l=>`<p>${esc(lessonLabel(l))}${l.inquiry?'（探究實作，請先至探究專區調整）':''}</p>`).join('')+(extra?'<p>補課時段已有課程，請另選時間；若要取代原課程，請改用調課。</p>':'<p>套用後，上列一般課程只會在該日期被取代，不會自動交換到原時段。</p>'):'新時段沒有其他課程重疊。';
 $('#adjustPreview').textContent=del?(source?'刪除 '+lessonLabel(source)+'，下週課表維持原樣。':'請選擇原課程。'):(extra?'補課：'+clName($('#adjustClass').value):source?'調課：'+lessonLabel(source):'請選擇原課程')+' → '+$('#adjustDate').value+' '+$('#adjustTime').value;
 $('#applyAdjustment').disabled=(!extra&&!source)||collisions.some(l=>l.inquiry)||(extra&&collisions.length>0);
}
function renderAdjustmentTable(){const date=$('#adjustWeek').value;if(!validDate(date))return;const monday=addDays(date,-((weekday(date)+6)%7));$('#adjustWeekTable').innerHTML='<table><thead><tr><th>日期</th><th>時間</th><th>班級／科目</th></tr></thead><tbody>'+Array.from({length:7},(_,i)=>{const d=addDays(monday,i),ls=lessons(d);return ls.length?ls.map(l=>`<tr><td>${d} 週${week[weekday(d)]}</td><td>${l.time}</td><td>${esc(clName(l.classId))}／${esc(state.classes.find(c=>c.id===l.classId).subject)}${l.moved?' · 調課':l.extra?' · 補課':''}</td></tr>`).join(''):`<tr><td>${d} 週${week[weekday(d)]}</td><td colspan="2">沒有課程</td></tr>`;}).join('')+'</tbody></table>';}
function renderAdjustmentHistory(){const records=state.lessonChanges||[];$('#adjustHistory').innerHTML=[...records].reverse().map((a,i)=>`<div class="event-manage"><div><b>${{move:'調課',extra:'補課',delete:'刪課'}[a.type]} · ${esc(clName(a.classId))}</b><p>${a.source?esc(lessonLabel(a.source)):''}${a.type!=='delete'?' → '+a.date+' '+a.time:''}</p>${a.replaced.length?`<p>取代 ${a.replaced.length} 堂原時段課程</p>`:''}<p class="help">${esc(a.reason)}</p></div>${i===0?`<button type="button" class="btn" data-undo-adjustment="${a.id}">復原此筆</button>`:''}</div>`).join('')||'<p class="help">尚無臨時調整。</p>';}
function openAdjustments(){const f=$('#adjustForm');f.reset();$('#adjustClass').innerHTML=state.classes.filter(c=>c.mode!=='inquiry').map(c=>`<option value="${esc(c.id)}">${esc(c.name)}／${esc(c.subject)}</option>`).join('');if(state.classes.some(c=>c.id===selectedClass&&c.mode!=='inquiry'))$('#adjustClass').value=selectedClass;for(const id of ['adjustDate','adjustWeek']){$('#'+id).value=selectedDate;$('#'+id).min=state.termStart;$('#'+id).max=state.termEnd;}refreshAdjustmentSources();renderAdjustmentHistory();$('#adjustDialog').showModal();}
$('#adjustLessons').onclick=openAdjustments;
for(const id of ['adjustClass','adjustWeek','adjustType'])$('#'+id).onchange=refreshAdjustmentSources;
for(const id of ['adjustSource','adjustDate','adjustTime'])$('#'+id).onchange=refreshAdjustmentPreview;
$('#adjustForm').onsubmit=e=>{
 e.preventDefault();const type=$('#adjustType').value,source=adjustmentSource(),date=$('#adjustDate').value,time=$('#adjustTime').value,classId=$('#adjustClass').value;
 if(type!=='extra'&&(!source||!lessons(source.date,classId).some(l=>l.key===source.key))){toast('原課程已變動，請重新選擇。');refreshAdjustmentSources();return;}
 if(type!=='delete'&&(!validDate(date)||date<state.termStart||date>state.termEnd||!validTime(time))){toast('請填寫學期內的有效日期與時間。');return;}
 if(type==='move'&&source.date===date&&source.time===time){toast('新時間與原課程相同，無需調課。');return;}
 const conflicts=type==='delete'?[]:adjustmentCollisions();if(conflicts.some(l=>l.inquiry)){toast('請先至探究專區調整重疊課程。');return;}
 if(type==='extra'&&conflicts.length){toast('補課時段已有課程，請另選時間。');return;}
 const next=structuredClone(state),change={id:uid(),type,classId,reason:$('#adjustReason').value.trim(),replaced:conflicts.map(l=>l.key)};
 if(type!=='extra')change.source={key:source.key,date:source.date,time:source.time,classId};
 if(type!=='delete')Object.assign(change,{date,time});
 (next.lessonChanges||=[]).push(change);if(!commitPlanner(next))return;
 render();refreshAdjustmentSources();renderAdjustmentHistory();toast('已套用指定日期的調整，堂數已重算。');
};
document.addEventListener('click',e=>{const button=e.target.closest('[data-undo-adjustment]');if(!button)return;const next=structuredClone(state);if(next.lessonChanges?.at(-1)?.id!==button.dataset.undoAdjustment)return;next.lessonChanges.pop();if(commitPlanner(next)){render();refreshAdjustmentSources();renderAdjustmentHistory();toast('已復原這筆調整，既有進度紀錄保留。');}});
const renderBeforePlanner=render;
render=function(){renderBeforePlanner();renderFeedback();};
render();

'use strict';
$('#cards').insertAdjacentHTML('afterend',`<section id="classPanel" class="panel class-panel"><div class="row spread"><h2 id="classPanelTitle">班級紀錄</h2><span class="help">點上方班級卡片查看；行事曆不會跟著篩選</span></div><div class="class-panel-columns"><section><h3>最近一次上課紀錄</h3><div id="latestClassNote"></div></section><form id="classMemoForm"><label class="field"><span>重要記事 · 本學期持續保留</span><textarea id="classMemo" rows="4" maxlength="4000" placeholder="例如：小老師、班級約定、長期提醒"></textarea></label><div class="row spread"><span class="help" id="classMemoStatus">公開共用，與課表一起同步</span><button class="btn primary" type="submit">儲存重要記事</button></div></form></div></section>`);
let memoContext=null;
function panelClass(){return state.classes.find(c=>c.id===selectedClass)||state.classes.find(c=>c.mode==='exam')||state.classes[0];}
function memoKey(course){return 'keri-memo-draft:'+cloudOwner+':'+book.active+':'+course.id;}
function renderClassPanel(){const selected=panelClass();if(!selected){$('#classPanel').hidden=true;return;}$('#classPanel').hidden=false;const course=state.classes.find(c=>c.name===selected.name&&c.mode==='exam')||selected;const context=memoKey(course);$('#classPanelTitle').textContent=course.name+' · 班級紀錄';const latest=CalendarEngine.latestClassNote(state,course.id);$('#latestClassNote').innerHTML=latest?`<p class="muted">${esc(latest[1].date)} ${esc(latest[1].time)} · ${esc(state.classes.find(c=>c.id===latest[1].classId)?.subject||'')}</p><p class="class-note-text">${esc(latest[1].content)}</p>${latest[1].homework?`<p class="class-note-text muted">下次提醒：${esc(latest[1].homework)}</p>`:''}<button class="btn" data-history-note="${esc(latest[0])}">編輯這筆紀錄</button>`:'<p class="help">這個班級還沒有上課紀錄。可在下方行事曆登記第一筆。</p>';
 let hasDraft=false;try{hasDraft=localStorage.getItem(context)!==null;}catch{}
 if(context!==memoContext||!hasDraft&&document.activeElement!==$('#classMemo')){memoContext=context;const stored=state.classNotes?.[course.id];let draft=null;try{draft=localStorage.getItem(context);}catch{}$('#classMemo').value=draft??stored?.text??'';$('#classMemoStatus').textContent=draft!==null?'有尚未送出的記事草稿':'公開共用，與課表一起同步';}
}
$('#classMemo').oninput=()=>{try{localStorage.setItem(memoContext,$('#classMemo').value);$('#classMemoStatus').textContent='尚未送出，請按「儲存重要記事」';}catch{$('#classMemoStatus').textContent='草稿無法保存在此裝置，請立即儲存或複製文字。';}};
$('#classMemoForm').onsubmit=e=>{e.preventDefault();const selected=panelClass(),course=state.classes.find(c=>c.name===selected.name&&c.mode==='exam')||selected;state.classNotes||={};state.classNotes[course.id]={text:$('#classMemo').value,updatedAt:new Date().toISOString()};if(save()){try{localStorage.removeItem(memoContext);}catch{}$('#classMemoStatus').textContent='已儲存；雲端結果請看頁面上方同步狀態';}};
const previousClassRender=render;
render=function(){previousClassRender();renderClassPanel();const exam=state.exams[examIndex];if(exam.cutoffDate)$('#countInfo').textContent+=` 本次含部分考科，剩餘堂數僅計至 ${exam.cutoffDate} ${exam.cutoffTime} 前。`;
 $('#allClasses').classList.toggle('soft',filter!=='all');$('#allClasses').textContent=filter==='all'?'全部班級（目前）':'顯示全部班級';
 if(state.school==='新北市立中和高中'){$('#sourceLabel').textContent='已套用中和高中 115-1 行事曆及和欣老師課表';$('#sourceReview').classList.remove('hidden');$('#sourceReview').innerHTML='<b>中和高中：7 個公民與社會班／每週 14 堂；109 團體活動每週 2 堂，不計段考堂數</b><p class="help">下午節次為 13:00、14:10、15:10、16:10。兼課時段照常計入公民課。</p><details><summary>部分考科與待確認活動</summary>'+state.sourceNotes.map(n=>'<p class="help"><b>'+esc(n.date)+'</b> '+esc(n.text)+'</p>').join('')+'</details>';}
};
$('#allClasses').onclick=()=>{filter='all';render();};
const originalClassFilterChange=$('#classFilter').onchange;
$('#classFilter').onchange=e=>{originalClassFilterChange(e);render();};
// Expose partial-exam cutoff dates so later edits remain reviewable.
const originalClassSettings=openSettings;
openSettings=function(){originalClassSettings();draft.exams.forEach((ex,i)=>{const row=$(`[data-exam-start="${i}"]`).closest('.exam-row');const label=document.createElement('div');label.className='exam-cutoff';label.innerHTML=`<label>部分考科日期（選填）<input type="date" data-cutoff-date="${i}" value="${esc(ex.cutoffDate||'')}"></label><label>部分考科開始時間<input type="time" data-cutoff-time="${i}" value="${esc(ex.cutoffTime||'')}"></label>`;row.after(label);label.onchange=()=>{const date=label.querySelector('[data-cutoff-date]').value,time=label.querySelector('[data-cutoff-time]').value;if(!date&&!time){delete ex.cutoffDate;delete ex.cutoffTime;}else{ex.cutoffDate=date;ex.cutoffTime=time;}};});};$('#settings').onclick=openSettings;
render();

/* Platform-independent scheduling rules. No DOM or storage dependencies. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CalendarEngine=api;})(globalThis,()=>{
 const addDays=(d,n)=>{const x=new Date(d+'T00:00:00Z');x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10)};
 const weekday=d=>new Date(d+'T00:00:00Z').getUTCDay();
 function period(data,index){return {start:index?addDays(data.exams[index-1].end,1):data.termStart,end:data.exams[index].date};}
 function lessons(d,c,data,includeCancelled=false){
  if(d<data.termStart||d>data.termEnd)return [];
  const result=[];
  for(const cl of data.classes.filter(x=>c==='all'||x.id===c)){
   if(cl.mode==='inquiry'){
    for(const s of (data.sessions||[]).filter(s=>s.date===d&&s.classId===cl.id)) result.push({...s,key:'inquiry_'+s.id,inquiry:true,cancelled:false,extra:false});
    continue;
   }
   for(const slot of cl.slots.filter(s=>s.day===weekday(d))){
    const minutes=t=>Number(t.slice(0,2))*60+Number(t.slice(3));
    const cancelled=data.exams.some(e=>d>=e.date&&d<=e.end)||data.events.some(e=>e.date===d&&e.type==='off'&&(e.classId==='all'||e.classId===cl.id)&&(!e.startTime||minutes(slot.time)<minutes(e.endTime)&&minutes(slot.time)+50>minutes(e.startTime)));
    if(!cancelled||includeCancelled)result.push({date:d,classId:cl.id,time:slot.time,key:`${d}_${cl.id}_${slot.time}`,cancelled,extra:false});
   }
   for(const e of data.events.filter(e=>e.date===d&&e.type==='extra'&&(e.classId==='all'||e.classId===cl.id)))result.push({date:d,classId:cl.id,time:e.time,key:`${d}_${cl.id}_extra_${e.id}`,cancelled:false,extra:true,title:e.title});
  }
  return result.sort((a,b)=>a.time.localeCompare(b.time));
 }
 function remaining(c,index,data,at){
  const bounds=period(data,index),exam=data.exams[index],cutoff=exam.cutoffDate||bounds.end;let total=0,excluded=0,extra=0;
  for(let d=[bounds.start,at.date,data.termStart].sort().at(-1);(d<cutoff||d===cutoff&&exam.cutoffTime)&&d<=data.termEnd;d=addDays(d,1))for(const l of lessons(d,c,data,true)){
   if(d===at.date&&l.time<=at.time||d===cutoff&&exam.cutoffTime&&l.time>=exam.cutoffTime)continue;
   if(l.cancelled)excluded++;else{total++;if(l.extra)extra++;}
  }
  return{total,excluded,extra,...bounds};
 }
 function inquiry(c,data,at){
  const cl=data.classes.find(x=>x.id===c),sessions=data.sessions.filter(s=>s.classId===c),done=sessions.filter(s=>s.done).length;
  const future=sessions.filter(s=>!s.done&&(s.date>at.date||s.date===at.date&&s.time>at.time)).length;
  const unconfirmed=sessions.filter(s=>!s.done&&(s.date<at.date||s.date===at.date&&s.time<=at.time)).length;
  return{done,future,unconfirmed,target:cl.target,total:cl.inquiryMethod==='scheduled'?future:Math.max(0,cl.target-done),minutes:sessions.filter(s=>s.done).reduce((n,s)=>n+s.minutes,0)};
 }
 // RFC-style quoted CSV fields; UTF-8 BOM, CRLF, embedded commas/newlines supported.
 function parseCSV(text){
  text=text.replace(/^\uFEFF/,'');const rows=[];let row=[],cell='',quoted=false,closed=false;
  const push=()=>{row.push(cell.trim());cell='';closed=false;};
  for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;}
   else if(c==='"'){if(cell.trim()||closed)throw Error('CSV 引號格式錯誤');quoted=true;}
   else if(c===',')push();else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;push();if(row.some(Boolean))rows.push(row);row=[];}
   else {if(closed&&!/\s/.test(c))throw Error('CSV 引號後有多餘文字');cell+=c;}
  }
  if(quoted)throw Error('CSV 引號未閉合');push();if(row.some(Boolean))rows.push(row);
  if(rows.length<2)throw Error('至少需要標題列與一筆資料');const headers=rows.shift();if(new Set(headers).size!==headers.length)throw Error('欄位名稱不可重複');
  return rows.map((r,i)=>{if(r.length!==headers.length)throw Error(`第 ${i+2} 列欄位數不符`);return Object.fromEntries(headers.map((h,j)=>[h,r[j]]));});
 }
 function latestClassNote(data,classId){const selected=data.classes.find(c=>c.id===classId);if(!selected)return null;const ids=data.classes.filter(c=>c.name===selected.name).map(c=>c.id);return Object.entries(data.notes).filter(([,n])=>ids.includes(n.classId)).sort((a,b)=>(b[1].date+b[1].time).localeCompare(a[1].date+a[1].time))[0]||null;}
 return{addDays,weekday,period,lessons,remaining,inquiry,parseCSV,latestClassNote};
});

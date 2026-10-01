const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),E=require('./dist/engine.js');const ctx={structuredClone};vm.runInNewContext(fs.readFileSync('dist/hexin-data.js','utf8'),ctx);const d=JSON.parse(JSON.stringify(ctx.HexinPreset.data));
for(const file of ['hexin-data.js','class-panel.js','school.js','cloud.js'])new vm.Script(fs.readFileSync('dist/'+file,'utf8'));
assert.equal(d.classes.filter(c=>c.mode==='exam').length,7);assert.equal(d.classes.filter(c=>c.mode==='exam').reduce((n,c)=>n+c.slots.length,0),14);assert.equal(d.classes.filter(c=>c.mode==='activity').reduce((n,c)=>n+c.slots.length,0),2);
assert.deepEqual(E.lessons('2026-09-30','all',d).map(l=>[l.classId,l.time]),[['hx-c103','08:10'],['hx-c111','10:10'],['hx-c118','11:10']]);
assert.deepEqual(E.lessons('2026-10-01','all',d).map(l=>[l.classId,l.time]),[['hx-c105','11:10'],['hx-a109','14:10'],['hx-a109','15:10']]);
assert.equal(E.lessons('2026-10-15','all',d).length,0);assert.equal(E.lessons('2026-11-12','all',d).length,0);assert.equal(E.lessons('2026-12-21','all',d).length,0);
assert.equal(E.lessons('2026-09-02','hx-c103',d).length,1); // high-2/high-3 exams do not cancel high-1
assert.equal(E.lessons('2026-09-17','hx-a109',d).length,1); // only the drill period is cancelled
assert.equal(E.remaining('hx-c101',0,d,{date:'2026-10-12',time:'09:00'}).total,1);
assert.equal(E.remaining('hx-c115',0,d,{date:'2026-10-12',time:'09:00'}).total,1);
assert.equal(E.remaining('hx-c105',0,d,{date:'2026-10-12',time:'09:00'}).total,0); // after partial exam begins
assert.equal(E.remaining('hx-c118',1,d,{date:'2026-11-25',time:'10:00'}).total,1);
assert.deepEqual(E.period(d,1),{start:'2026-10-15',end:'2026-11-26'});assert.deepEqual(E.period(d,2),{start:'2026-11-28',end:'2027-01-18'});
d.notes={old:{classId:'hx-c109',date:'2026-09-29',time:'08:10',content:'old'},activity:{classId:'hx-a109',date:'2026-10-01',time:'15:10',content:'latest'},other:{classId:'hx-c101',date:'2026-10-02',time:'10:10',content:'different'}};
assert.equal(E.latestClassNote(d,'hx-c109')[0],'activity');assert.equal(E.latestClassNote(d,'hx-c115'),null);
const previous={version:2,active:'old',workspaces:[{id:'old',data:{notes:{keep:'record'}}}]};const next=ctx.importHexinPreset(previous);assert.deepEqual(next.workspaces[0],previous.workspaces[0]);assert.equal(next.active,'hexin-zhonghe-115-1');assert.equal(ctx.importHexinPreset(next),null);
console.log('PASS: Zhonghe 14 civics + 2 activity periods, partial exam cutoff mornings, school-specific exclusions, latest class record, non-destructive import');
const app=fs.readFileSync('dist/app.js','utf8'),features=fs.readFileSync('dist/features.js','utf8');const validationCode=app.slice(0,app.indexOf('let state='))+features.slice(features.indexOf('const uid='),features.indexOf('let book;'))+';globalThis.checkData=validate;';const validators={structuredClone};vm.runInNewContext(validationCode,validators);
const clean=JSON.parse(JSON.stringify(ctx.HexinPreset.data));assert.equal(validators.checkData(clean),true);clean.classNotes={'hx-c101':{text:'班級長期提醒',updatedAt:'2026-10-01T10:00:00.000Z'}};assert.equal(validators.checkData(clean),true);assert.equal(JSON.parse(JSON.stringify(clean)).classNotes['hx-c101'].text,'班級長期提醒');clean.classNotes['hx-c101'].text='x'.repeat(4001);assert.equal(validators.checkData(clean),false);
console.log('PASS: important class notes persist in backup/cloud payload and invalid oversize notes are rejected');

const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const Sync=require('./dist/cloud-sync.js');
for(const file of ['cloud-config.js','cloud-sync.js','cloud.js'])new vm.Script(fs.readFileSync('dist/'+file,'utf8'));
function harness(write){const logs=[],disk={};const sync=new Sync({owner:'teacher-a',revision:1,write,persist:d=>disk.draft=structuredClone(d),clear:()=>delete disk.draft,status:s=>logs.push(s)});return{sync,logs,disk};}
(async()=>{
 // Real competing writers against one revisioned server: the second cannot overwrite.
 let server={revision:1,book:{value:'original'}};
 const write=async(owner,revision,book)=>{assert.equal(owner,'teacher-a');if(revision!==server.revision)return null;server={revision:revision+1,book};return server;};
 const a=harness(write),b=harness(write);a.sync.stage({value:'phone'});b.sync.stage({value:'computer'});
 await a.sync.flush();await b.sync.flush();assert.equal(server.book.value,'phone');assert.equal(b.sync.conflict,true);assert.equal(b.disk.draft.book.value,'computer');assert.equal(a.disk.draft,undefined);
 // Edits made while a request is running must be sent after the acknowledgement.
 let resolve;const calls=[];const q=harness((owner,revision,book)=>{calls.push({revision,book});return calls.length===1?new Promise(r=>resolve=r):Promise.resolve({revision:3});});
 q.sync.stage({n:1});const flight=q.sync.flush();q.sync.stage({n:2});resolve({revision:2});await flight;
 assert.deepEqual(calls,[{revision:1,book:{n:1}},{revision:2,book:{n:2}}]);assert.equal(q.disk.draft,undefined);
 // Offline failures keep drafts; retries preserve the original revision.
 let online=false;const o=harness(async()=>{if(!online)throw Error('offline');return{revision:2};});o.sync.stage({n:7});await o.sync.flush();assert.equal(o.disk.draft.book.n,7);online=true;await o.sync.flush();assert.equal(o.disk.draft,undefined);
 // A late response after logout cannot clear a preserved draft or act on the new user.
 let done;const c=harness(()=>new Promise(r=>done=r));c.sync.stage({secret:'A'});const f=c.sync.flush();c.sync.close();done({revision:2});await f;assert.equal(c.disk.draft.book.secret,'A');assert.throws(()=>c.sync.stage({secret:'B'}));
 const quota=harness(write);quota.sync.persist=()=>{throw Error('quota');};assert.throws(()=>quota.sync.stage({n:1}));assert.equal(quota.sync.pending,null);
 const first=harness(async()=>{const e=Error('exists');e.code='CONFLICT';throw e;});first.sync.revision=0;first.sync.stage({n:9});await first.sync.flush();assert.equal(first.sync.conflict,true);assert.equal(first.disk.draft.book.n,9);
 console.log('PASS: cloud CAS conflicts, rapid edits, offline retries, logout isolation, quota failure, first-save race; script syntax');
})().catch(e=>{console.error(e);process.exitCode=1;});

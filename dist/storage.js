/* Replace this adapter with an authenticated API when adding cross-device sync. */
const CalendarStore={
 key:'keri-workspaces-v2',
 load(){const raw=localStorage.getItem(this.key);return raw?JSON.parse(raw):null;},
 save(book){localStorage.setItem(this.key,JSON.stringify(book));},
 async db(){return new Promise((resolve,reject)=>{const r=indexedDB.open('keri-files',1);r.onupgradeneeded=()=>r.result.createObjectStore('files',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});},
 async file(action,value){const db=await this.db();return new Promise((resolve,reject)=>{const tx=db.transaction('files',action==='get'?'readonly':'readwrite'),store=tx.objectStore('files');const r=action==='get'?store.get(value):store.put(value);tx.oncomplete=()=>{db.close();resolve(r.result)};tx.onerror=()=>{db.close();reject(tx.error)};tx.onabort=()=>{db.close();reject(tx.error||Error('檔案儲存失敗'))};});}
};

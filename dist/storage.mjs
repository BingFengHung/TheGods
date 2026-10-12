import {clone} from './core.mjs';
export class SaveStore{
 constructor(){this.db=null;this.revision=0;this.queue=Promise.resolve();this.degraded=false;}
 async open(){if(!globalThis.indexedDB){this.degraded=true;return;}this.db=await new Promise((resolve,reject)=>{const r=indexedDB.open('thegods-offline',1);r.onupgradeneeded=()=>r.result.createObjectStore('saves');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
 async read(slot='current'){if(!this.db)return JSON.parse(localStorage.getItem(slot==='current'?'thegods-save':'thegods-save-previous')||'null');return new Promise((resolve,reject)=>{const r=this.db.transaction('saves').objectStore('saves').get(slot);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error);});}
 async load(){const state=await this.read();this.revision=state?.revision||0;return state;}
 async previous(){return this.read('previous');}
 save(state){const copy=clone(state);const task=this.queue.catch(()=>{}).then(()=>this.write(copy));this.queue=task;return task;}
 async write(state){state.savedAt=Date.now();if(!this.db){const prev=await this.read();if(prev&&(prev.revision||0)!==this.revision)throw Error('這個存檔已在另一個分頁更新，請重新載入。');state.revision=this.revision+1;if(prev)localStorage.setItem('thegods-save-previous',JSON.stringify(prev));localStorage.setItem('thegods-save',JSON.stringify(state));this.revision=state.revision;return state;}
 return new Promise((resolve,reject)=>{const tx=this.db.transaction('saves','readwrite'),os=tx.objectStore('saves');let conflict=false;const r=os.get('current');r.onsuccess=()=>{const prev=r.result;if(prev&&(prev.revision||0)!==this.revision){conflict=true;tx.abort();return;}state.revision=this.revision+1;if(prev)os.put(prev,'previous');os.put(state,'current');};tx.oncomplete=()=>{this.revision=state.revision;resolve(state);};tx.onabort=()=>reject(Error(conflict?'這個存檔已在另一個分頁更新，請重新載入。':'存檔失敗，請匯出備份後再試。'));tx.onerror=()=>reject(tx.error);});}
}

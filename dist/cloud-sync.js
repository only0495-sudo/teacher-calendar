/* One writer per view; revision compare-and-swap prevents cross-device overwrite. */
(function(root){
 class CloudSync {
  constructor({owner,revision=0,write,persist,clear,status}){Object.assign(this,{owner,revision,write,persist,clear,status});this.pending=null;this.serial=0;this.running=false;this.conflict=false;this.closed=false;}
  stage(book){if(this.closed)throw Error('signed out');const next=structuredClone(book);this.persist({owner:this.owner,revision:this.revision,book:next,savedAt:new Date().toISOString()});this.pending=next;this.serial++;this.status('pending');}
  async flush(){if(this.closed||this.running||this.conflict||!this.pending)return;this.running=true;
   try{while(this.pending&&!this.closed){const version=this.serial,copy=this.pending;this.status('saving');const row=await this.write(this.owner,this.revision,copy);if(this.closed)return;if(!row){this.conflict=true;this.status('conflict');return;}this.revision=row.revision;if(version===this.serial){this.clear();this.pending=null;this.status('saved');}else this.persist({owner:this.owner,revision:this.revision,book:this.pending,savedAt:new Date().toISOString()});}}
   catch(e){if(!this.closed)this.status(e.code==='CONFLICT'?'conflict':'error',e);if(e.code==='CONFLICT')this.conflict=true;}
   finally{this.running=false;}
  }
  close(){this.closed=true;}
 }
 if(typeof module!=='undefined')module.exports=CloudSync;else root.CloudSync=CloudSync;
})(globalThis);

/* Explicit, bounded resource selections. No source records or credentials. */
((root, make) => { const api=make(); if(typeof module==='object'&&module.exports)module.exports=api; else root.CWResourceContract=api; })(typeof globalThis==='object'?globalThis:this,()=>{
 'use strict';
 const apps=Object.freeze({
  talk:{name:'Talk Tuner',origin:'https://talk-tuner-coherenceworks.netlify.app',schema:'cw-talk-resource',local:true,fields:{title:180,subject:160,grade:80,purpose:500,question:2000,next_step:2000}},
  song:{name:'SongBridge',origin:'https://songbridgelearning.com',schema:'cw-song-resource',local:false,fields:{title:180,language:80,moment:160,audience:160,use:2000}}
 });
 const idOK=(app,id)=>typeof id==='string'&&(app==='song'?/^\d{1,4}$/:/^[A-Za-z0-9_-]{1,120}$/).test(id);
 function project(app,input){
  const config=apps[app];if(!Object.hasOwn(apps,app)||!config||!input||typeof input!=='object'||Array.isArray(input))throw Error('Choose a supported app resource.');
  const out={schema:config.schema,version:1};
  for(const [key,max]of Object.entries(config.fields)){const value=input[key]??'';if(typeof value!=='string'||value.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))throw Error('Please shorten or revise '+key.replace('_',' ')+'.');out[key]=value;}
  if(!out.title.trim())throw Error('Give this resource a title.');return out;
 }
 function normalize(input){
  if(!input||input.schema!=='cw-studio-handoff'||input.version!==1||!Object.hasOwn(apps,input.source_app)||!idOK(input.source_app,input.source_id))throw Error('This is not a supported studio resource.');
  if(input.summary?.schema!==apps[input.source_app].schema||input.summary?.version!==1)throw Error('This app resource needs an update.');
  const source_updated_at=input.source_updated_at;
  if(typeof source_updated_at!=='string'||source_updated_at.length>80||!Number.isFinite(Date.parse(source_updated_at)))throw Error('The resource date could not be read.');
  return {schema:'cw-studio-handoff',version:1,source_app:input.source_app,source_id:input.source_id,source_updated_at,summary:project(input.source_app,input.summary)};
 }
 function packet(app,id,summary,updated){return normalize({schema:'cw-studio-handoff',version:1,source_app:app,source_id:String(id),source_updated_at:updated,summary:project(app,summary)});}
 function sourceURL(app,id){if(!Object.hasOwn(apps,app)||!idOK(app,id))return '';return app==='song'?apps.song.origin+'/?song='+id:apps.talk.origin+'/#saved-session/'+id;}
 return {apps,idOK,project,normalize,packet,sourceURL};
});

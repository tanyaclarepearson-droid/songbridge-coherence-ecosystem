/* SongBridge controls enhance existing audio; cue timing continues to use the same element. */
(()=>{
'use strict';
const players=new Map();
const icon={play:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',pause:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>'};
const time=n=>Number.isFinite(n)&&n>=0?Math.floor(n/60)+':'+String(Math.floor(n%60)).padStart(2,'0'):'–:––';

// One compact remote for the current collection audio; never creates a second recording.
let activeAudio=null,activeCardAudio=null,mini=null,framePending=false,returningToPage=false;
let mediaKey="";
function ensureMini(){
 if(mini)return;
 mini=document.createElement('section');mini.className='sb-mini';mini.hidden=true;
 mini.setAttribute('aria-label','Current song');
 mini.innerHTML='<button type="button" class="sb-mini-return" aria-label="Return to playing song"><img class="sb-mini-cover" alt=""><span class="sb-mini-copy"><span class="sb-mini-label">Now playing</span><span class="sb-mini-title"></span></span></button><button type="button" class="sb-mini-toggle" aria-label="Pause">'+icon.pause+'</button><div class="sb-mini-progress" aria-hidden="true"><span></span></div><span class="sb-mini-status" role="status"></span>';
 document.body.append(mini);
 mini.querySelector('.sb-mini-return').onclick=()=>{
  const a=activeCardAudio;if(!a)return;
  a.closest('.song-card')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});
  players.get(a)?.box.querySelector('.sb-play')?.focus({preventScroll:true});
 };
 mini.querySelector('.sb-mini-toggle').onclick=async()=>{
  const a=activeCardAudio;if(!a)return;
  mini.querySelector('.sb-mini-status').textContent='';
  if(!a.paused)a.pause();
  else try{await a.play();}catch(e){if(e.name!=='AbortError')mini.querySelector('.sb-mini-status').textContent='Could not play. Try again.';}
  updateMini();
 };
}
function updateMini(){
 const a=activeCardAudio;
 if(!a||!a.isConnected||a.ended||!a.getAttribute('src')){if(mini)mini.hidden=true;return;}
 const box=players.get(a)?.box;if(!box)return;
 ensureMini();
 const rect=box.getBoundingClientRect(),viewport=window.visualViewport;
 const top=viewport?.offsetTop||0,bottom=top+(viewport?.height||window.innerHeight);
 // Show whenever the card's actual playback control is no longer fully reachable.
 const visible=rect.top>=top+8&&rect.bottom<=bottom-8&&rect.height>0;
 mini.hidden=visible&&!returningToPage;
 const card=a.closest('.song-card'),title=card?.querySelector('h3')?.textContent||'SongBridge';
 const playing=!a.paused;
 mini.querySelector('.sb-mini-title').textContent=title;
 mini.querySelector('.sb-mini-label').textContent=playing?'Now playing':'Paused';
 mini.querySelector('.sb-mini-return').setAttribute('aria-label','Return to '+title);
 const cover=card?.querySelector('.cover img')?.getAttribute('src'),img=mini.querySelector('img');
 img.hidden=!cover;if(cover&&img.getAttribute('src')!==cover)img.setAttribute('src',cover);
 const toggle=mini.querySelector('.sb-mini-toggle');
 toggle.setAttribute('aria-label',(playing?'Pause ':'Resume ')+title);
 toggle.querySelector('path').setAttribute('d',playing?'M6 5h4v14H6zm8 0h4v14h-4z':'M8 5v14l11-7z');
 mini.querySelector('.sb-mini-progress span').style.width=(Number.isFinite(a.duration)&&a.duration>0?Math.min(100,a.currentTime/a.duration*100):0)+'%';
}
function scheduleMini(){if(!framePending){framePending=true;requestAnimationFrame(()=>{framePending=false;updateMini();});}}
window.addEventListener('scroll',()=>{returningToPage=false;scheduleMini();},{passive:true});
window.addEventListener('resize',scheduleMini,{passive:true});
window.visualViewport?.addEventListener('resize',scheduleMini,{passive:true});
window.visualViewport?.addEventListener('scroll',scheduleMini,{passive:true});
// Explicitly connect the currently playing audio to the phone's Now Playing controls.
function allAudio(){return [...new Set([...players.keys(),...document.querySelectorAll('audio')])];}
function mediaInfo(a){
 const card=a.closest('.song-card'),projection=a.closest('#projection'),detail=a.closest('#songDialog');
 return {title:card?.querySelector('h3')?.textContent||projection?.querySelector('#projectionTitle')?.textContent||detail?.querySelector('#detailTitle')?.textContent||'SongBridge',
  cover:card?.querySelector('.cover img')?.getAttribute('src')||projection?.querySelector('aside img')?.getAttribute('src')||detail?.querySelector('#detailCover')?.getAttribute('src')||document.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href')};
}
function syncMediaSession(){
 const session=navigator.mediaSession;if(!session)return;
 const a=activeAudio;
 if(!a||!a.isConnected||!a.getAttribute('src')||a.error){
  try{session.playbackState='none';session.metadata=null;session.setPositionState?.();}catch(_){}
  mediaKey='';return;
 }
 const info=mediaInfo(a),key=[a.currentSrc||a.getAttribute('src'),info.title,info.cover].join('|');
 if(key!==mediaKey&&typeof MediaMetadata!=='undefined'){
  try{
   const artwork=info.cover?[{src:new URL(info.cover,document.baseURI).href}]:[];
   session.metadata=new MediaMetadata({title:info.title,artist:'SongBridge',album:'Find a song for this moment',artwork});mediaKey=key;
  }catch(_){}
 }
 try{session.playbackState=a.ended?'none':a.paused?'paused':'playing';}catch(_){}
 try{
  if(Number.isFinite(a.duration)&&a.duration>0&&Number.isFinite(a.currentTime))session.setPositionState?.({duration:a.duration,playbackRate:Number.isFinite(a.playbackRate)&&a.playbackRate>0?a.playbackRate:1,position:Math.max(0,Math.min(a.duration,a.currentTime))});
  else session.setPositionState?.();
 }catch(_){}
}
function pauseAudio(except){allAudio().forEach(a=>{if(a!==except)a.pause();});}
function claimAudio(a){
 if(a.paused||a.ended||!a.isConnected)return;
 activeAudio=a;activeCardAudio=a.matches('.card-audio')?a:null;returningToPage=false;
 pauseAudio(a);
 if(mini)mini.querySelector('.sb-mini-status').textContent='';
 syncMediaSession();updateMini();
}
function refreshPlayback(){
 const live=allAudio().filter(a=>a.isConnected&&!a.paused&&!a.ended&&!a.error);
 // Recover from missed background events by inspecting the audio elements themselves.
 if(live.length){
  const a=live.includes(activeAudio)?activeAudio:live[0];
  activeAudio=a;activeCardAudio=a.matches('.card-audio')?a:null;pauseAudio(a);
 }else if(activeAudio&&!activeAudio.isConnected){activeAudio=null;activeCardAudio=null;}
 for(const [a,p] of players){if(a.isConnected)p.update();}
 syncMediaSession();updateMini();
}
function resumePage(){
 if(document.visibilityState==='hidden')return;
 scan();refreshPlayback();
 returningToPage=!!activeCardAudio&&!activeCardAudio.ended;
 framePending=false;updateMini();
}
window.addEventListener('pageshow',resumePage);
window.addEventListener('focus',resumePage);
document.addEventListener('visibilitychange',()=>{
 if(document.visibilityState==='hidden'){syncMediaSession();return;}
 resumePage();
});
const sessionActions={
 play:async()=>{
  const a=activeAudio;if(!a||!a.isConnected)return;
  pauseAudio(a);
  try{await a.play();}catch(_){const p=players.get(a);if(p)p.box.querySelector('.sb-player-status').textContent='Tap play on the page to resume.';}
  refreshPlayback();
 },
 pause:()=>{pauseAudio();refreshPlayback();},
 stop:()=>{pauseAudio();if(activeAudio){try{activeAudio.currentTime=0;}catch(_){}}refreshPlayback();},
 seekbackward:({seekOffset=10}={})=>seekActive((activeAudio?.currentTime||0)-seekOffset),
 seekforward:({seekOffset=10}={})=>seekActive((activeAudio?.currentTime||0)+seekOffset),
 seekto:({seekTime}={})=>seekActive(seekTime)
};
function seekActive(position){
 const a=activeAudio;if(!a||!a.isConnected||!Number.isFinite(position)||!Number.isFinite(a.duration)||a.duration<=0)return;
 a.currentTime=Math.max(0,Math.min(a.duration,position));refreshPlayback();
}
if(navigator.mediaSession){
 for(const [action,handler] of Object.entries(sessionActions)){
  try{navigator.mediaSession.setActionHandler(action,handler);}catch(_){}
 }
}

function enhance(a){
 if(players.has(a))return;
 const box=document.createElement('div');box.className='sb-player'+(a.classList.contains('card-audio')?' sb-player--compact':'');
 box.innerHTML='<button class="sb-play" type="button" aria-label="Play">'+icon.play+'</button><div class="sb-player-main"><div class="sb-player-heading"><span class="sb-player-label">Ready to listen</span><span class="sb-player-title"></span></div><input class="sb-seek" type="range" min="0" max="100" step="0.1" value="0" aria-label="Seek through song"><div class="sb-player-times"><span class="sb-elapsed">0:00</span><span class="sb-duration">–:––</span></div></div><button class="sb-mute" type="button" aria-label="Mute" aria-pressed="false">Sound on</button><p class="sb-player-status" role="status"></p>';
 a.before(box);box.append(a);
 const play=box.querySelector('.sb-play'),seek=box.querySelector('.sb-seek'),mute=box.querySelector('.sb-mute'),status=box.querySelector('.sb-player-status');
 play.querySelector('svg').style.pointerEvents='none';
 let seeking=false;
 function update(){
  box.hidden=a.hidden||!a.getAttribute('src');
  const title=a.closest('#projection')?.querySelector('#projectionTitle')?.textContent||a.closest('.song-card')?.querySelector('h3')?.textContent||a.closest('#songDialog')?.querySelector('#detailTitle')?.textContent||'SongBridge';
  const playing=!a.paused&&!a.ended;
  box.classList.toggle('is-playing',playing);
  // Keep the click target stable while playback events update the timeline.
  const path=play.querySelector('path'),shape=playing?'M6 5h4v14H6zm8 0h4v14h-4z':'M8 5v14l11-7z';
  if(path.getAttribute('d')!==shape)path.setAttribute('d',shape);
  play.setAttribute('aria-label',(playing?'Pause ':'Play ')+title);
  box.querySelector('.sb-player-label').textContent=a.ended?'Listen again':playing?'Now playing':a.currentTime>0?'Paused':'Ready to listen';
  box.querySelector('.sb-player-title').textContent=title;
  box.querySelector('.sb-elapsed').textContent=time(a.currentTime);
  box.querySelector('.sb-duration').textContent=time(a.duration);
  const valid=Number.isFinite(a.duration)&&a.duration>0;
  seek.disabled=!valid;seek.max=valid?a.duration:100;
  if(!seeking)seek.value=valid?a.currentTime:0;
  seek.style.setProperty('--played',valid?(Number(seek.value)/a.duration*100)+'%':'0%');
  seek.setAttribute('aria-valuetext',time(Number(seek.value))+' of '+time(a.duration));
  if(a===activeCardAudio)updateMini();
  if(a===activeAudio)syncMediaSession();
  mute.textContent=a.muted?'Sound off':'Sound on';mute.setAttribute('aria-label',a.muted?'Unmute':'Mute');mute.setAttribute('aria-pressed',String(a.muted));
 }
 play.onclick=async()=>{if(!a.paused){a.pause();update();return;}status.textContent='';try{await a.play();}catch(e){if(e.name!=='AbortError')status.textContent='Unable to play. Please try again or check the recording.';}update();};
 mute.onclick=()=>{a.muted=!a.muted;};
 seek.addEventListener('input',()=>{seeking=true;seek.style.setProperty('--played',(Number(seek.value)/a.duration*100)+'%');seek.setAttribute('aria-valuetext',time(Number(seek.value))+' of '+time(a.duration));box.querySelector('.sb-elapsed').textContent=time(Number(seek.value));});
 seek.addEventListener('change',()=>{if(Number.isFinite(a.duration))a.currentTime=Number(seek.value);seeking=false;update();});
 a.addEventListener('play',()=>claimAudio(a));
 a.addEventListener('playing',()=>claimAudio(a));
 const events=['loadedmetadata','durationchange','timeupdate','play','playing','pause','ended','volumechange','emptied','loadeddata','ratechange','seeked'];
 events.forEach(e=>a.addEventListener(e,update));
 a.addEventListener('waiting',()=>{status.textContent='Loading audio…';});
 a.addEventListener('playing',()=>{status.textContent='';});
 a.addEventListener('error',()=>{status.textContent='Recording could not load. Please try again.';});
 const watcher=new MutationObserver(()=>{status.textContent='';update();});watcher.observe(a,{attributes:true,attributeFilter:['src','hidden']});
 players.set(a,{box,watcher,update});
 a.controls=false;a.classList.add('sb-enhanced-audio');
 if(a.preload==='none')a.preload='metadata';
 update();
}
function compactCards(){
 document.querySelectorAll('.song-info').forEach(info=>{
  const lyrics=info.querySelector('button.open[data-open]'),project=info.querySelector('button.open[data-display]');
  if(!lyrics||!project||info.querySelector('.sb-song-actions'))return;
  const actions=document.createElement('div');actions.className='sb-song-actions';
  actions.setAttribute('role','group');actions.setAttribute('aria-label','Song resources');
  const arrow='<svg class="sb-resource-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10"/></svg>';
  lyrics.innerHTML='Lyrics & ideas '+arrow;
  project.innerHTML='Project lyrics <svg class="sb-resource-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 5h5v5M19 5l-6 6M10 19H5v-5M5 19l6-6"/></svg>';
  lyrics.before(actions);actions.append(lyrics,project);
 });
}
function scan(){
 compactCards();
 for(const [a,p] of players){
  if(!a.isConnected){
   // A removed card must not leave an invisible recording running in Safari.
   p.watcher.disconnect();a.pause();a.removeAttribute('src');try{a.load();}catch(_){}
   if(activeAudio===a){activeAudio=null;activeCardAudio=null;}
   players.delete(a);syncMediaSession();
  }else if(!p.box.contains(a)){p.box.remove();p.watcher.disconnect();players.delete(a);}
 }
 document.querySelectorAll('audio').forEach(enhance);
 updateMini();
}
new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1&&(n.matches?.('audio,.song-card,.song-info')||n.querySelector?.('audio,.song-card,.song-info')))))scan();}).observe(document.body,{childList:true,subtree:true});

scan();
refreshPlayback();
})();

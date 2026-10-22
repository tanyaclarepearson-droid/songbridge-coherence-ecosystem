/* Compatible with SongBridge Lyric Timing Studio cue maps. Times are seconds. */
function validateCueMap(data){
  if(data.format!=='songbridge-lyric-cues-v1'||!Array.isArray(data.cues)||!data.cues.length)throw Error('Choose a SongBridge Lyric Timing Studio cue-map JSON file.');
  let last=-1;
  return data.cues.map(c=>{
    if(typeof c.text!=='string'||!c.text.trim()||!(c.time===null||(typeof c.time==='number'&&Number.isFinite(c.time)&&c.time>=0)))throw Error('Each cue needs text and a nonnegative time in seconds (or null).');
    if(c.time!==null&&c.time<last)throw Error('Cue times must be in song order.');
    if(c.time!==null)last=c.time;
    return {text:c.text,section:String(c.section||''),time:c.time};
  });
}
function cueIndexAt(cues,time){let found=-1;for(let i=0;i<cues.length;i++)if(cues[i].time!==null&&cues[i].time<=time)found=i;return found;}
(()=>{
 const stage=document.createElement('dialog');stage.id='projection';stage.setAttribute('aria-labelledby','projectionTitle');document.body.append(stage);
 const cache=new Map();let song,cues=[],current=-1,auto=true,audio,viewport,session=0,returnFocus;
 const q=s=>stage.querySelector(s);
 function status(text){q('#projectionStatus').textContent=text;}
 function showLines(){viewport.replaceChildren();cues.forEach((c,i)=>{const line=document.createElement('p');line.className='projection-line';line.textContent=c.text;line.dataset.line=i;viewport.append(line)});current=-1;}
 function focusLine(i){if(i===current)return;current=i;viewport.querySelectorAll('p').forEach((p,n)=>p.classList.toggle('current',n===i));const line=viewport.children[i];if(line)viewport.scrollTo({top:Math.max(0,line.offsetTop-viewport.offsetTop-viewport.clientHeight*.32),behavior:'auto'});}
 function follow(){if(auto)focusLine(cueIndexAt(cues,audio.currentTime));}
 function setCues(next){cues=next;showLines();const timed=cues.filter(c=>c.time!==null).length;status(timed?`${timed} of ${cues.length} phrases timed. Follow audio advances at each cue.`:'Manual display · Use Previous / Next or scroll the lyrics.');follow();}
 async function open(id,trigger){
  const ticket=++session;song=SONGS.find(s=>s.id===id);if(!song)return;returnFocus=trigger;auto=true;
  document.querySelectorAll('audio').forEach(a=>a.pause());
  const v=Object.keys(song.variants)[0],rec=recordings.get(`${id}:${v}`),src=rec?.url||(window.SONGBRIDGE_AUDIO||{})[id];
  stage.innerHTML=`<div class="projection-shell"><header><div><small>SONGBRIDGE · ${esc(song.language)}</small><h2 id="projectionTitle">${esc(song.title)}</h2></div><div class="projection-actions"><button id="projectionFullscreen">Full screen</button><button id="projectionClose" aria-label="Close lyric display">Close ×</button></div></header><div class="projection-body"><aside><img src="${esc(song.cover)}" alt="${esc(song.title)} cover"><p>Lyrics by Tanya Pearson</p></aside><div id="projectionLyrics" tabindex="0" role="region" aria-label="Scrollable song lyrics" lang="${song.language==='Español'?'es':'en'}"></div></div><footer><audio id="projectionAudio" controls preload="metadata" aria-label="Song playback"></audio><div class="projection-controls"><button id="projectionPrev">← Previous</button><button id="projectionNext">Next →</button><label><input id="projectionFollow" type="checkbox" checked> Follow audio</label><label>Text size <input id="projectionSize" type="range" min="24" max="72" value="40"></label><details><summary>Recording & timing</summary><label>Try audio <input id="projectionFile" type="file" accept="audio/*"></label><label>Import cue map <input id="projectionCues" type="file" accept=".json,application/json"></label><button id="projectionTemplate">Download timing template</button><p>Device files last for this visit. For permanent playback, use recordings.js and timings.js.</p></details></div><p id="projectionStatus" role="status"></p></footer></div>`;
  audio=q('#projectionAudio');viewport=q('#projectionLyrics');if(src)audio.src=src;else audio.hidden=true;
  q('#projectionClose').onclick=()=>stage.close();
  q('#projectionFullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(stage.requestFullscreen)await stage.requestFullscreen();else status('Use your browser’s full-screen option for projection.');}catch{status('Full screen is unavailable in this browser. The display still fills the window.');}};
  q('#projectionSize').oninput=e=>viewport.style.setProperty('--lyric-size',`${e.target.value}px`);
  q('#projectionFollow').onchange=e=>{auto=e.target.checked;if(auto)follow()};
  function move(delta){auto=false;q('#projectionFollow').checked=false;focusLine(Math.max(0,Math.min(cues.length-1,current+delta)));}
  q('#projectionPrev').onclick=()=>move(-1);q('#projectionNext').onclick=()=>move(1);
  stage.onkeydown=e=>{if(/INPUT|AUDIO|BUTTON|SUMMARY/.test(e.target.tagName))return;if(e.key==='ArrowDown'||e.key==='ArrowRight'){e.preventDefault();move(1)}if(e.key==='ArrowUp'||e.key==='ArrowLeft'){e.preventDefault();move(-1)}};
  audio.addEventListener('timeupdate',follow);audio.addEventListener('seeking',follow);
  audio.addEventListener('error',()=>status('The recording could not load. Check its path or choose an audio file.'));
  q('#projectionFile').onchange=e=>{const f=e.target.files[0];if(!f)return;const key=`${id}:${v}`,old=recordings.get(key);audio.pause();if(old)URL.revokeObjectURL(old.url);const r={url:URL.createObjectURL(f),name:f.name};recordings.set(key,r);audio.src=r.url;audio.hidden=false;status('Recording ready for this visit.');};
  q('#projectionCues').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const next=validateCueMap(JSON.parse(await f.text()));if(ticket!==session)return;cache.set(id,next);setCues(next)}catch(err){if(ticket===session)status(err.message)}};
  q('#projectionTemplate').onclick=()=>{const data={format:'songbridge-lyric-cues-v1',title:song.title,subtitle:song.language,audioFileName:src||'',cues};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`song-${id}-lyric-cues.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  const lines=song.variants[v].split('\n').map(t=>t.trim()).filter(t=>t&&!/^\[|^[⸻—_-]+$|^(?:(?:final |pre[- ]?)?chorus|verse(?: \d+)?|bridge|outro|intro|coro|verso(?: \d+)?)(?:\s*\(.*\))?$/i.test(t)).map(text=>({text,section:'',time:null}));
  if(!stage.open)stage.showModal();setCues(cache.get(id)||lines);
  const path=(window.SONGBRIDGE_TIMINGS||{})[id];if(path&&!cache.has(id))try{const r=await fetch(path);if(!r.ok)throw Error();const next=validateCueMap(await r.json());if(ticket===session){cache.set(id,next);setCues(next)}}catch{if(ticket===session)status('Timing file could not load. Manual display is available; check timings.js or import a cue map.');}
 }
 stage.addEventListener('close',()=>{session++;audio?.pause();if(document.fullscreenElement===stage)document.exitFullscreen().catch(()=>{});returnFocus?.focus();});
 document.addEventListener('click',e=>{const b=e.target.closest('[data-display]');if(b)open(Number(b.dataset.display),b)});
})();

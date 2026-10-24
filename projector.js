/* Compatible with SongBridge Lyric Timing Studio cue maps. Times are seconds. */
function validateCueMap(data){
  if(data.format!=='songbridge-lyric-cues-v1'||!Array.isArray(data.cues)||!data.cues.length)throw Error('Choose a SongBridge Lyric Timing Studio cue-map JSON file.');
  let last=-1;
  return data.cues.map(c=>{
    if(typeof c.text!=='string'||!c.text.trim()||!(c.time===null||(typeof c.time==='number'&&Number.isFinite(c.time)&&c.time>=0)))throw Error('Each cue needs text and a nonnegative time in seconds (or null).');
    if(c.time!==null&&c.time<last)throw Error('Cue times must be in song order.');
    if(c.time!==null)last=c.time;
    if(c.chords!==undefined&&(!Array.isArray(c.chords)||c.chords.some(x=>typeof x!=='string'||x.length>24)))throw Error('Chords must be an array of short chord names, such as ["C","Am"].');
    return {text:c.text,section:String(c.section||''),time:c.time,chords:c.chords||[]};
  });
}
function cueIndexAt(cues,time){let found=-1;for(let i=0;i<cues.length;i++)if(cues[i].time!==null&&cues[i].time<=time)found=i;return found;}
(()=>{
 const stage=document.createElement('dialog');stage.id='projection';stage.setAttribute('aria-labelledby','projectionTitle');document.body.append(stage);
 const cache=new Map();let song,cues=[],current=-1,auto=true,audio,viewport,session=0,returnFocus,playalong;
 const q=s=>stage.querySelector(s);
 function status(text){q('#projectionStatus').textContent=text;}
 function showLines(){viewport.replaceChildren();cues.forEach((c,i)=>{const line=document.createElement('p');line.className='projection-line';line.textContent=c.text;line.dataset.line=i;viewport.append(line)});current=-1;}
 function focusLine(i){if(i===current)return;current=i;playalong?.update(cues,i);viewport.querySelectorAll('p').forEach((p,n)=>p.classList.toggle('current',n===i));const line=viewport.children[i];if(line)viewport.scrollTo({top:Math.max(0,line.offsetTop-viewport.offsetTop-viewport.clientHeight*.32),behavior:'auto'});}
 function follow(){if(auto)focusLine(cueIndexAt(cues,audio.currentTime));}
 function setCues(next){cues=next;showLines();playalong?.update(cues,0);const timed=cues.filter(c=>c.time!==null).length;status(timed?`${timed} of ${cues.length} phrases timed. Follow audio advances at each cue.`:'Manual display · Use Previous / Next or scroll the lyrics.');follow();}
 async function open(id,trigger){
  const ticket=++session;song=SONGS.find(s=>s.id===id);if(!song)return;returnFocus=trigger;auto=true;
  document.querySelectorAll('audio').forEach(a=>a.pause());
  const v=Object.keys(song.variants)[0],rec=recordings.get(`${id}:${v}`),src=rec?.url||(window.SONGBRIDGE_AUDIO||{})[id];
  stage.innerHTML=`<div class="projection-shell"><header><div><small>SONGBRIDGE · ${esc(song.language)}</small><h2 id="projectionTitle">${esc(song.title)}</h2></div><div class="projection-actions"><button id="projectionFullscreen">Full screen</button><button id="projectionClose" aria-label="Close lyric display">Close ×</button></div></header><div class="projection-body"><aside><img src="${esc(song.cover)}" alt="${esc(song.title)} cover"><p>Lyrics by Tanya Pearson</p></aside><div id="projectionLyrics" tabindex="0" role="region" aria-label="Scrollable song lyrics" lang="${song.language==='Español'?'es':'en'}"></div></div><footer><audio id="projectionAudio" controls preload="metadata" aria-label="Song playback"></audio><div class="projection-controls"><button id="projectionPrev">← Previous</button><button id="projectionNext">Next →</button><label><input id="projectionFollow" type="checkbox" checked> Follow audio</label><label>Text size <input id="projectionSize" type="range" min="24" max="72" value="40"></label><details><summary>Recording & timing</summary><label>Try audio <input id="projectionFile" type="file" accept="audio/*"></label><label>Import cue map <input id="projectionCues" type="file" accept=".json,application/json"></label><button id="projectionTemplate">Download timing template</button><p>Device files last for this visit. For permanent playback, use recordings.js and timings.js.</p></details></div><p id="projectionStatus" role="status"></p></footer></div>`;
  audio=q('#projectionAudio');viewport=q('#projectionLyrics');if(src)audio.src=src;else audio.hidden=true;
  playalong=createSongBridgePlayalong(stage,audio,viewport,()=>{auto=false;q('#projectionFollow').checked=false;},i=>{auto=false;q('#projectionFollow').checked=false;focusLine(i);});
  viewport.addEventListener('scroll',()=>{if(auto)return;const at=viewport.getBoundingClientRect().top+viewport.clientHeight*.32;let best=0,distance=Infinity;Array.from(viewport.children).forEach((line,i)=>{const d=Math.abs(line.getBoundingClientRect().top-at);if(d<distance){best=i;distance=d;}});current=best;viewport.querySelectorAll('p').forEach((line,i)=>line.classList.toggle('current',i===best));playalong.update(cues,best);});
  q('#projectionClose').onclick=()=>stage.close();
  q('#projectionFullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(stage.requestFullscreen)await stage.requestFullscreen();else status('Use your browser’s full-screen option for projection.');}catch{status('Full screen is unavailable in this browser. The display still fills the window.');}};
  q('#projectionSize').oninput=e=>viewport.style.setProperty('--lyric-size',`${e.target.value}px`);
  q('#projectionFollow').onchange=e=>{auto=e.target.checked;if(auto)follow()};
  function move(delta){auto=false;q('#projectionFollow').checked=false;focusLine(Math.max(0,Math.min(cues.length-1,current+delta)));}
  q('#projectionPrev').onclick=()=>move(-1);q('#projectionNext').onclick=()=>move(1);
  stage.onkeydown=e=>{if(/INPUT|AUDIO|BUTTON|SUMMARY|SELECT|TEXTAREA/.test(e.target.tagName))return;if(e.key==='ArrowDown'||e.key==='ArrowRight'){e.preventDefault();move(1)}if(e.key==='ArrowUp'||e.key==='ArrowLeft'){e.preventDefault();move(-1)}};
  audio.addEventListener('timeupdate',follow);audio.addEventListener('seeking',follow);
  audio.addEventListener('error',()=>status('The recording could not load. Check its path or choose an audio file.'));
  q('#projectionFile').onchange=e=>{const f=e.target.files[0];if(!f)return;const key=`${id}:${v}`,old=recordings.get(key);audio.pause();if(old)URL.revokeObjectURL(old.url);const r={url:URL.createObjectURL(f),name:f.name};recordings.set(key,r);audio.src=r.url;audio.hidden=playalong.isLive();status('Recording ready for this visit.');};
  q('#projectionCues').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const next=validateCueMap(JSON.parse(await f.text()));if(ticket!==session)return;cache.set(id,next);setCues(next)}catch(err){if(ticket===session)status(err.message)}};
  q('#projectionTemplate').onclick=()=>{const data={format:'songbridge-lyric-cues-v1',title:song.title,subtitle:song.language,audioFileName:src||'',cues};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`song-${id}-lyric-cues.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  const lines=song.variants[v].split('\n').map(t=>t.trim()).filter(t=>t&&!/^\[|^[⸻—_-]+$|^(?:(?:final |pre[- ]?)?chorus|verse(?: \d+)?|bridge|outro|intro|coro|verso(?: \d+)?)(?:\s*\(.*\))?$/i.test(t)).map(text=>({text,section:'',time:null,chords:[]}));
  if(!stage.open)stage.showModal();setCues(cache.get(id)||lines);
  const path=(window.SONGBRIDGE_TIMINGS||{})[id];if(path&&!cache.has(id))try{const r=await fetch(path);if(!r.ok)throw Error();const next=validateCueMap(await r.json());if(ticket===session){cache.set(id,next);setCues(next)}}catch{if(ticket===session)status('Timing file could not load. Manual display is available; check timings.js or import a cue map.');}
 }
 stage.addEventListener('close',()=>{session++;audio?.pause();if(document.fullscreenElement===stage)document.exitFullscreen().catch(()=>{});returnFocus?.focus();});
 document.addEventListener('click',e=>{const b=e.target.closest('[data-display]');if(b)open(Number(b.dataset.display),b)});
})();

/* Optional accompaniment shares the lyric cue map; it never guesses harmony. */
function createSongBridgePlayalong(stage,audio,viewport,stopFollow,jump){
 const styleId='songbridge-playalong-style';
 if(!document.getElementById(styleId)){
  const style=document.createElement('style');style.id=styleId;style.textContent=`
  #projection .sb-band-tools{display:flex;gap:10px 20px;flex-wrap:wrap;align-items:center;margin-bottom:10px;font-size:14px}
  #projection .sb-band-tools label{display:flex;gap:8px;align-items:center}
  #projection .sb-band-tools select{background:#214d42;color:#fff4d8;border:1px solid #789386;border-radius:8px;padding:8px;min-height:44px;font:inherit;max-width:100%}
  #projection .sb-band-panel[hidden]{display:none}
  #projection .sb-band-panel{min-width:0;min-height:0;height:100%;border-left:1px solid #e3cf913b;padding:12px 0 12px 22px;display:flex;flex-direction:column;overflow:hidden;color:#f8edcf}
  #projection .sb-band-panel h3{font:25px Georgia,serif;margin:0 0 6px}
  #projection .sb-band-note{font-size:13px;line-height:1.5;color:#d4dbc9;margin:0 0 12px}
  #projection .sb-band-list{overflow:auto;min-height:0;scrollbar-color:#bca977 #244d43;padding:2px 8px 30px 2px}
  #projection .sb-band-row{display:block;width:100%;text-align:left;background:transparent;border:0;border-bottom:1px solid #d8c59030;border-radius:0;padding:14px 4px;color:#dbe4d5;box-shadow:none}
  #projection .sb-band-row.is-current{color:#ffe19b;background:#fff4d809;border-left:3px solid #e8c671;padding-left:12px;border-radius:0 12px 12px 0}
  #projection .sb-band-phrase{display:block;font-size:15px;line-height:1.5;margin-bottom:8px}
  #projection .sb-band-chords{display:flex;gap:15px;flex-wrap:wrap;font:26px Georgia,serif;color:inherit}
  #projection .sb-band-empty{font:14px/1.5 Arial,sans-serif;color:#d4dbc9}
  #projection .sb-band-diagrams{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
  #projection .sb-chord{width:100px;display:block}
  #projection .sb-chord svg{width:100%;height:auto;display:block}
  #projection .sb-chord-caption{display:block;font-size:11px;line-height:1.4;color:#d4dbc9}
  #projection .sb-band-panel a{color:inherit}
  #projection .projection-body.sb-band-on{grid-template-columns:minmax(0,1fr) minmax(245px,.48fr);gap:25px}
  #projection .sb-band-on>aside{display:none}
  @media(min-width:1400px){#projection .projection-body.sb-band-on{grid-template-columns:minmax(140px,.45fr) minmax(0,1.15fr) minmax(260px,.55fr)}#projection .sb-band-on>aside{display:block}}
  @media(max-width:700px){#projection .projection-body.sb-band-on{grid-template-columns:1fr;grid-template-rows:minmax(0,1fr) 180px;gap:8px}#projection .sb-band-panel{border-left:0;border-top:1px solid #e3cf913b;padding:10px 0 0}#projection .sb-band-panel h3{font-size:19px}#projection .sb-band-note{font-size:12px;margin-bottom:4px}#projection .sb-band-list{display:flex;gap:12px;overflow:auto;padding:0 0 10px}#projection .sb-band-row{flex:0 0 190px;padding:8px}.sb-band-diagrams{display:none!important}#projection .sb-band-tools{gap:6px;font-size:12px;margin-bottom:6px}#projection .sb-band-tools select{padding:6px;min-height:36px}}
  `;document.head.append(style);
 }
 const tools=document.createElement('div');tools.className='sb-band-tools';tools.innerHTML=`<label>Play along <select aria-label="Play-along instrument"><option value="off">Off</option><option value="ukulele">Ukulele</option><option value="guitar">Guitar</option><option value="keyboard">Keyboard</option></select></label><label>Accompaniment <select aria-label="Accompaniment mode"><option value="recording">With recording</option><option value="live">Live instruments only</option></select></label>`;
 stage.querySelector('footer').prepend(tools);
 const panel=document.createElement('section');panel.className='sb-band-panel';panel.hidden=true;panel.setAttribute('aria-label','Play-along chord guide');stage.querySelector('.projection-body').append(panel);
 const [instrument,mode]=tools.querySelectorAll('select');let cues=[],index=0,lastKey='';
 instrument.onchange=()=>{panel.hidden=instrument.value==='off';stage.querySelector('.projection-body').classList.toggle('sb-band-on',!panel.hidden);render(true);};
 mode.onchange=()=>{audio.pause();const live=mode.value==='live';audio.hidden=live||!audio.getAttribute('src');const follow=stage.querySelector('#projectionFollow');follow.disabled=live;if(live)stopFollow();render(true);};
 function render(force=false){
  if(panel.hidden)return;
  const key=instrument.value+':'+index+':'+mode.value;if(!force&&key===lastKey)return;lastKey=key;
  const has=cues.some(c=>c.chords?.length);
  panel.innerHTML=`<h3>${esc(instrument.options[instrument.selectedIndex].text)} · play along</h3><p class="sb-band-note">${has?'Highlighted phrase + what comes next. Chords read left to right.':'No chord chart added for this song yet. Add checked chords to its timing template, then import it under Recording & timing.'}${mode.value==='live'?' Use Previous / Next or scroll lyrics at your own pace.':''}</p><div class="sb-band-list"></div>`;
  const list=panel.querySelector('.sb-band-list');
  cues.forEach((cue,i)=>{
   const row=document.createElement('button');row.className='sb-band-row'+(i===index?' is-current':'');row.type='button';row.setAttribute('aria-label','Go to phrase '+(i+1)+': '+cue.text);if(i===index)row.setAttribute('aria-current','true');
   const chords=cue.chords||[];
   row.innerHTML=`<span class="sb-band-phrase">${esc(cue.text)}</span><span class="sb-band-chords">${chords.length?chords.map(c=>`<span>${esc(c)}</span>`).join(''):'<span class="sb-band-empty">Chords not added</span>'}</span>`;
   if(i===index&&chords.length){const diagrams=document.createElement('span');diagrams.className='sb-band-diagrams';chords.forEach(c=>{const span=document.createElement('span');span.className='sb-chord';span.innerHTML=songBridgeChordDiagram(instrument.value,c);diagrams.append(span)});row.append(diagrams);}
   row.onclick=()=>jump(i);list.append(row);
  });
  const active=list.children[index];if(active){if(matchMedia('(max-width:700px)').matches)list.scrollLeft=active.offsetLeft-list.offsetLeft;else list.scrollTop=active.offsetTop-list.offsetTop;}
 }
 return {isLive:()=>mode.value==='live',update(next,i){const changed=next!==cues;cues=next;index=Math.max(0,i);render(changed);}};
}
function songBridgeChordDiagram(instrument,name){
 const shapes={ukulele:{C:[0,0,0,3],G:[0,2,3,2],Am:[2,0,0,0],F:[2,0,1,0],Dm:[2,2,1,0],Em:[0,4,3,2],A:[2,1,0,0],D:[2,2,2,0],E:[4,4,4,2],G7:[0,2,1,2],C7:[0,0,0,1],A7:[0,1,0,0],D7:[2,2,2,3]},guitar:{C:[-1,3,2,0,1,0],G:[3,2,0,0,0,3],Am:[-1,0,2,2,1,0],F:[1,3,3,2,1,1],Dm:[-1,-1,0,2,3,1],Em:[0,2,2,0,0,0],A:[-1,0,2,2,2,0],D:[-1,-1,0,2,3,2],E:[0,2,2,1,0,0],G7:[3,2,0,0,0,1],C7:[-1,3,2,3,1,0],A7:[-1,0,2,0,2,0],D7:[-1,-1,0,2,1,2]}};
 if(instrument==='keyboard'){
  const m=/^([A-G])([#b]?)(m|maj7|7|m7)?$/.exec(name);if(!m)return '<span class="sb-chord-caption">Diagram not included for this chord.</span>';
  const root=({C:0,D:2,E:4,F:5,G:7,A:9,B:11}[m[1]]+(m[2]==='#'?1:m[2]==='b'?-1:0)+12)%12;
  const intervals=({m:[0,3,7],m7:[0,3,7,10],maj7:[0,4,7,11],7:[0,4,7,10]})[m[3]]||[0,4,7];const notes=intervals.map(n=>(n+root)%12);
  let svg=`<svg viewBox="0 0 140 100" role="img" aria-label="${esc(name)} chord tones on keyboard">`;
  [0,2,4,5,7,9,11].forEach((n,i)=>{svg+=`<rect x="${i*20}" y="3" width="19" height="72" rx="2" fill="${notes.includes(n)?'#efcf7e':'#f8edcf'}"/><text x="${i*20+9}" y="68" text-anchor="middle" fill="#143e34" font-size="9">${['C','D','E','F','G','A','B'][i]}</text>`;});
  [[1,14],[3,34],[6,74],[8,94],[10,114]].forEach(([n,x])=>{svg+=`<rect x="${x}" y="3" width="11" height="43" rx="2" fill="${notes.includes(n)?'#efcf7e':'#163f35'}" stroke="#163f35"/>`;});
  return svg+'</svg><span class="sb-chord-caption">Gold = chord tones; choose a comfortable octave.</span>';
 }
 const frets=shapes[instrument]?.[name];if(!frets)return '<span class="sb-chord-caption">Diagram not included; use your preferred voicing.</span>';
 const labels=instrument==='ukulele'?['G','C','E','A']:['E','A','D','G','B','E'];const step=80/(frets.length-1);
 let svg=`<svg viewBox="0 0 110 140" role="img" aria-label="${esc(name)} ${instrument}, frets ${frets.map(f=>f<0?'mute':f).join(', ')}">`;
 for(let f=0;f<=4;f++)svg+=`<line x1="15" y1="${30+f*20}" x2="95" y2="${30+f*20}" stroke="#d4dbc9" stroke-width="${f===0?3:1}"/>`;
 frets.forEach((f,i)=>{const x=15+i*step;svg+=`<line x1="${x}" y1="30" x2="${x}" y2="110" stroke="#d4dbc9"/><text x="${x}" y="129" font-size="11" fill="#d4dbc9" text-anchor="middle">${labels[i]}</text>`;if(f>0)svg+=`<circle cx="${x}" cy="${20+f*20}" r="6" fill="#efcf7e"/>`;else svg+=`<text x="${x}" y="21" font-size="14" fill="#efcf7e" text-anchor="middle">${f===0?'○':'×'}</text>`;});
 return svg+'</svg><span class="sb-chord-caption">Standard tuning · ○ open · × mute</span>';
}

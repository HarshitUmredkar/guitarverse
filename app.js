const DB_NAME='guitarverse-db', STORE='songs';
let db, songs=[], activeFilter='all', deferredInstall=null, metronomeTimer=null, audioCtx=null, tunerStream=null, tunerFrame=null;
const $=id=>document.getElementById(id);
const today=()=>new Date().toISOString().slice(0,10);
function toast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2300)}
function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>{const s=req.result.createObjectStore(STORE,{keyPath:'id'});s.createIndex('title','title')};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
function tx(mode='readonly'){return db.transaction(STORE,mode).objectStore(STORE)}
function getAll(){return new Promise((resolve,reject)=>{const r=tx().getAll();r.onsuccess=()=>resolve(r.result||[]);r.onerror=()=>reject(r.error)})}
function putSong(song){return new Promise((resolve,reject)=>{const r=tx('readwrite').put(song);r.onsuccess=resolve;r.onerror=()=>reject(r.error)})}
function deleteSong(id){return new Promise((resolve,reject)=>{const r=tx('readwrite').delete(id);r.onsuccess=resolve;r.onerror=()=>reject(r.error)})}
function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function refresh(){songs=(await getAll()).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));render()}
function render(){
 $('playedCount').textContent=songs.filter(s=>s.played).length;
 $('totalCount').textContent=songs.length;
 $('favoriteCount').textContent=songs.filter(s=>s.favorite).length;
 const q=$('searchInput').value.trim().toLowerCase();
 const visible=songs.filter(s=>{
  const match=[s.title,s.artist,s.chords,s.notes].join(' ').toLowerCase().includes(q);
  const filter=activeFilter==='all'||(activeFilter==='played'&&s.played)||(activeFilter==='pending'&&!s.played)||(activeFilter==='favorites'&&s.favorite);
  return match&&filter;
 });
 $('songList').innerHTML=visible.map(s=>`<article class="song-card">
  <div class="song-cover">♫</div><div class="song-info" data-open="${s.id}">
  <h3>${esc(s.title)}</h3><p>${esc(s.artist||'Artist not added')}</p><div class="song-meta">
  <span class="tag ${s.played?'played':'pending'}">${s.played?'✓ PLAYED':'TO LEARN'}</span>${s.key?`<span class="tag">KEY ${esc(s.key)}</span>`:''}${s.capo!==''&&s.capo!=null?`<span class="tag">CAPO ${esc(s.capo)}</span>`:''}
  </div></div><div class="card-actions"><button class="mini-btn ${s.favorite?'active':''}" data-fav="${s.id}" title="Favourite">${s.favorite?'♥':'♡'}</button><button class="mini-btn" data-edit="${s.id}" title="Edit">⋯</button></div></article>`).join('');
 $('emptyState').style.display=visible.length?'none':'block';
 $('emptyState').querySelector('h3').textContent=songs.length?'No songs found':'Your songbook starts here';
 $('emptyState').querySelector('p').textContent=songs.length?'Try another search or filter.':'Add a song after you have played it—or save one you are learning. Nothing is imported automatically.';
 $('emptyAddBtn').style.display=songs.length?'none':'inline-block';
}
function openSong(song=null){
 $('songForm').reset();$('songId').value=song?.id||'';
 $('songDialogTitle').textContent=song?'Edit song':'Add a song';
 ['title','artist','difficulty','key','capo','bpm','strumming','chords','lyrics','notes','played','favorite','playedDate'].forEach(k=>{const el=$(k);if(!el)return; if(el.type==='checkbox')el.checked=!!song?.[k];else el.value=song?.[k]??(k==='difficulty'?'Intermediate':'')});
 $('playedDate').value=song?.playedDate||(song?.played?today():'');
 $('songDialog').showModal();
}
$('songForm').addEventListener('submit',async e=>{e.preventDefault();const id=$('songId').value||crypto.randomUUID();const played=$('played').checked;
 const song={id,title:$('title').value.trim(),artist:$('artist').value.trim(),difficulty:$('difficulty').value,key:$('key').value,capo:$('capo').value,bpm:$('bpm').value,strumming:$('strumming').value.trim(),chords:$('chords').value.trim(),lyrics:$('lyrics').value,notes:$('notes').value,played,favorite:$('favorite').checked,playedDate:played?($('playedDate').value||today()):'',updatedAt:Date.now()};
 if(!song.title)return;await putSong(song);$('songDialog').close();await refresh();toast('Song saved to your book')});
document.addEventListener('click',async e=>{
 const c=e.target.closest('[data-close]');if(c){$(c.dataset.close).close();return}
 const o=e.target.closest('[data-open]');if(o){showDetail(o.dataset.open);return}
 const ed=e.target.closest('[data-edit]');if(ed){openSong(songs.find(s=>s.id===ed.dataset.edit));return}
 const fav=e.target.closest('[data-fav]');if(fav){const s=songs.find(x=>x.id===fav.dataset.fav);s.favorite=!s.favorite;s.updatedAt=Date.now();await putSong(s);refresh();return}
 const f=e.target.closest('[data-filter]');if(f){activeFilter=f.dataset.filter;document.querySelectorAll('.filter-chip').forEach(x=>x.classList.toggle('active',x===f));render();return}
 const tool=e.target.closest('[data-tool]');if(tool)openTool(tool.dataset.tool);
});
$('addSongBtn').onclick=$('emptyAddBtn').onclick=()=>openSong();
$('searchInput').addEventListener('input',render);
function showDetail(id){const s=songs.find(x=>x.id===id);if(!s)return;
 $('detailContent').innerHTML=`<div class="detail-head"><div style="display:flex;justify-content:space-between"><p class="eyebrow">YOUR SONGBOOK</p><button class="close-btn" data-close="detailDialog">×</button></div><h2>${esc(s.title)}</h2><p>${esc(s.artist||'Artist not added')} · ${esc(s.difficulty||'')}</p></div>
 <div class="detail-body"><div class="detail-actions"><button class="secondary-btn" id="detailPlayed">${s.played?'✓ Mark as to learn':'✓ Mark as played'}</button><button class="secondary-btn" id="detailEdit">Edit song</button><button class="secondary-btn" id="detailFavorite">${s.favorite?'♥ Favourite':'♡ Add favourite'}</button><button class="text-btn" id="detailDelete">Delete</button></div>
 <div class="detail-chips">${s.key?`<span class="detail-chip">Key: ${esc(s.key)}</span>`:''}${s.capo!==''&&s.capo!=null?`<span class="detail-chip">Capo: ${esc(s.capo)}</span>`:''}${s.bpm?`<span class="detail-chip">${esc(s.bpm)} BPM</span>`:''}${s.strumming?`<span class="detail-chip">${esc(s.strumming)}</span>`:''}${s.playedDate?`<span class="detail-chip">Played: ${esc(s.playedDate)}</span>`:''}</div>
 ${s.chords?`<div class="detail-block"><h4>CHORDS / PROGRESSION</h4><div class="detail-text">${esc(s.chords)}</div></div>`:''}
 ${s.lyrics?`<div class="detail-block"><h4>LYRICS / YOUR CHORD SHEET</h4><div class="detail-text">${esc(s.lyrics)}</div></div>`:''}
 ${s.notes?`<div class="detail-block"><h4>PERSONAL NOTES</h4><div class="detail-text">${esc(s.notes)}</div></div>`:''}
 ${!s.chords&&!s.lyrics&&!s.notes?'<p style="color:var(--muted);font-size:12px">No chord sheet or notes added yet. Edit this song to add your arrangement.</p>':''}
 <p style="font-size:9px;color:var(--muted);margin-top:22px">Your content is stored privately in this browser on this device.</p></div>`;
 $('detailDialog').showModal();
 $('detailPlayed').onclick=async()=>{s.played=!s.played;s.playedDate=s.played?(s.playedDate||today()):'';s.updatedAt=Date.now();await putSong(s);$('detailDialog').close();await refresh();toast(s.played?'Marked as played':'Moved to to-learn')};
 $('detailEdit').onclick=()=>{$('detailDialog').close();openSong(s)};
 $('detailFavorite').onclick=async()=>{s.favorite=!s.favorite;await putSong(s);$('detailDialog').close();await refresh();toast('Favourite updated')};
 $('detailDelete').onclick=async()=>{if(confirm(`Delete "${s.title}" from your songbook?`)){await deleteSong(s.id);$('detailDialog').close();await refresh();toast('Song deleted')}};
}
$('exportBtn').onclick=async()=>{const data={app:'GUITARVERSE',version:1,exportedAt:new Date().toISOString(),songs:await getAll()};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`guitarverse-backup-${today()}.json`;a.click();URL.revokeObjectURL(a.href);toast('Backup exported')};
$('importBtn').onclick=()=>$('importFile').click();
$('importFile').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{const data=JSON.parse(await file.text());if(!Array.isArray(data.songs))throw Error('Invalid backup');if(!confirm(`Restore ${data.songs.length} songs? Songs with matching IDs will be replaced.`))return;for(const s of data.songs){if(s.id&&s.title)await putSong(s)}await refresh();toast('Backup restored')}catch(err){alert('Could not restore this file. Please choose a valid GUITARVERSE JSON backup.')}e.target.value=''};
function openTool(name){$('toolDialog').showModal();const root=$('toolContent');
 const head=(title,sub)=>`<div class="tool-content"><div style="display:flex;justify-content:space-between"><p class="eyebrow">PRACTICE ROOM</p><button class="close-btn" data-close="toolDialog">×</button></div><h2>${title}</h2><p>${sub}</p>`;
 if(name==='metronome'){root.innerHTML=head('Metronome','Set a tempo and practise with a steady pulse.')+`<div class="tool-display" id="bpmDisplay">90 <small style="font:12px 'DM Sans'">BPM</small></div><div class="tool-controls"><button class="secondary-btn" id="bpmMinus">−</button><input class="tool-input" id="bpmInput" type="number" min="30" max="240" value="90"><button class="secondary-btn" id="bpmPlus">＋</button></div><div class="tool-controls" style="margin-top:18px"><button class="tool-action" id="metroToggle">START</button></div></div>`;
  let bpm=90,beat=0;const update=()=>{$('bpmInput').value=bpm;$('bpmDisplay').innerHTML=`${bpm} <small style="font:12px 'DM Sans'">BPM</small>`};const click=()=>{try{audioCtx=audioCtx||new(window.AudioContext||window.webkitAudioContext)();const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();osc.frequency.value=beat%4===0?1100:760;gain.gain.value=.12;osc.connect(gain);gain.connect(audioCtx.destination);osc.start();osc.stop(audioCtx.currentTime+.055);beat++}catch(e){}};const stop=()=>{if(metronomeTimer)clearInterval(metronomeTimer);metronomeTimer=null;$('metroToggle').textContent='START'};const start=()=>{stop();beat=0;click();metronomeTimer=setInterval(click,60000/bpm);$('metroToggle').textContent='STOP'};$('bpmMinus').onclick=()=>{bpm=Math.max(30,bpm-1);update();if(metronomeTimer)start()};$('bpmPlus').onclick=()=>{bpm=Math.min(240,bpm+1);update();if(metronomeTimer)start()};$('bpmInput').onchange=e=>{bpm=Math.min(240,Math.max(30,Number(e.target.value)||90));update();if(metronomeTimer)start()};$('metroToggle').onclick=()=>metronomeTimer?stop():start();$('toolDialog').addEventListener('close',stop,{once:true});
 }else if(name==='transpose'){root.innerHTML=head('Transpose chords','Paste a chord progression and move it up or down by semitones.')+`<label class="field"><span>CHORDS</span><textarea id="transposeInput" rows="3" placeholder="Am F C G"></textarea></label><div class="tool-controls" style="margin:14px 0"><button class="secondary-btn" id="downSemitone">− 1 semitone</button><button class="secondary-btn" id="upSemitone">＋ 1 semitone</button></div><div class="detail-text" id="transposeOutput">Your transposed chords will appear here.</div><p>Note: This changes chord names only. Check the result against your song and preferred capo position.</p></div>`;
  const notes=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];let shift=0;const transpose=()=>{const txt=$('transposeInput').value;const out=txt.replace(/([A-G])(#|b)?(m|maj|min|dim|aug|sus\d*|add\d*|M\d*|7|9|11|13)?/g,(full,n,a,suf)=>{let ix=notes.indexOf(n+(a||''));if(ix<0&&a==='b')ix=(notes.indexOf(n)-1+12)%12;if(ix<0)return full;return notes[(ix+shift+120)%12]+(suf||'')});$('transposeOutput').textContent=out||'Enter a chord progression above.'};$('transposeInput').oninput=()=>{shift=0;transpose()};$('downSemitone').onclick=()=>{shift--;transpose()};$('upSemitone').onclick=()=>{shift++;transpose()};
 }else if(name==='chords'){const chords={'A':'x02220','Am':'x02210','A7':'x02020','C':'x32010','D':'xx0232','Dm':'xx0231','E':'022100','Em':'022000','F':'133211','G':'320003','G7':'320001','Bm':'x24432'};root.innerHTML=head('Chord library','Common open chords and beginner-friendly shapes. Fingerings are shown from low E to high e; x means mute, 0 means open.')+`<div class="chord-grid">${Object.entries(chords).map(([n,v])=>`<div class="chord-item"><strong>${n}</strong><small>${v}</small></div>`).join('')}</div></div>`;
 }else if(name==='tuner'){root.innerHTML=head('Guitar tuner','Allow microphone access, pluck one string at a time, and tune by ear to the displayed note. Use a quiet room for best results.')+`<div class="tuner-note" id="tunerNote">—</div><div style="text-align:center;color:var(--muted);font-size:11px" id="tunerHint">Waiting for microphone</div><div class="tuner-meter"></div><div class="tuner-strings"><span>E2 · 82 Hz</span><span>A2 · 110 Hz</span><span>D3 · 147 Hz</span><span>G3 · 196 Hz</span><span>B3 · 247 Hz</span><span>e4 · 330 Hz</span></div><div class="tool-controls" style="margin-top:20px"><button class="tool-action" id="tunerStart">START TUNER</button><button class="secondary-btn" id="tunerStop">STOP</button></div><p>Microphone access requires HTTPS and your permission. This is a basic browser tuner, not a calibrated studio instrument.</p></div>`;
  $('tunerStart').onclick=startTuner;$('tunerStop').onclick=stopTuner;$('toolDialog').addEventListener('close',stopTuner,{once:true});
 }
}
async function startTuner(){try{stopTuner();tunerStream=await navigator.mediaDevices.getUserMedia({audio:true});audioCtx=audioCtx||new(window.AudioContext||window.webkitAudioContext)();const src=audioCtx.createMediaStreamSource(tunerStream),analyser=audioCtx.createAnalyser();analyser.fftSize=4096;src.connect(analyser);const buf=new Float32Array(analyser.fftSize);const names=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];function loop(){analyser.getFloatTimeDomainData(buf);let rms=0;for(let v of buf)rms+=v*v;rms=Math.sqrt(rms/buf.length);if(rms>.008){let best=0;for(let tau=30;tau<buf.length/2;tau++){let corr=0;for(let i=0;i<buf.length/2;i++)corr+=buf[i]*buf[i+tau];if(corr>best){best=corr;var period=tau}}if(period){const hz=audioCtx.sampleRate/period;if(hz>65&&hz<370){const midi=Math.round(69+12*Math.log2(hz/440));const note=names[(midi%12+12)%12]+(Math.floor(midi/12)-1);const target=440*Math.pow(2,(midi-69)/12);const cents=Math.round(1200*Math.log2(hz/target));$('tunerNote').textContent=note;$('tunerHint').textContent=`${hz.toFixed(1)} Hz · ${cents>0?'+':''}${cents} cents ${Math.abs(cents)<5?'— In tune':cents<0?'— Tune up':'— Tune down'}`}}}else $('tunerHint').textContent='Pluck a single string';tunerFrame=requestAnimationFrame(loop)}loop();$('tunerHint').textContent='Listening…'}catch(e){$('tunerHint').textContent='Microphone unavailable. Allow mic access and open this app over HTTPS.'}}
function stopTuner(){if(tunerFrame)cancelAnimationFrame(tunerFrame);tunerFrame=null;if(tunerStream){tunerStream.getTracks().forEach(t=>t.stop());tunerStream=null}}
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e;$('installBtn').hidden=false});
$('installBtn').onclick=async()=>{if(!deferredInstall)return;deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;$('installBtn').hidden=true};

// AI Song Finder — calls the user's own Cloudflare Worker; no API key is stored in this app.
const FINDER_ENDPOINT_KEY='guitarverse-finder-endpoint';
let finderItems=[];
function openFinder(){
 $('finderDialog').showModal();
 $('finderEndpoint').value=localStorage.getItem(FINDER_ENDPOINT_KEY)||'';
 $('finderQuery').focus();
}
$('openFinderBtn').onclick=openFinder;
$('saveFinderEndpoint').onclick=()=>{
 const value=$('finderEndpoint').value.trim().replace(/\/+$/,'');
 if(value&&!/^https:\/\/[^ ]+/i.test(value)){toast('Enter a valid HTTPS Worker URL');return}
 localStorage.setItem(FINDER_ENDPOINT_KEY,value);
 toast('Connection saved on this device');
};
$('finderSearchBtn').onclick=searchFinder;
$('finderQuery').addEventListener('keydown',e=>{if(e.key==='Enter')searchFinder()});
$('voiceSearchBtn').onclick=()=>{
 const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!SR){$('finderStatus').textContent='Voice search is not supported in this browser. Type the song name instead.';return}
 const rec=new SR();rec.lang='en-IN';rec.interimResults=false;
 $('finderStatus').textContent='Listening… say the song name and artist.';
 rec.onresult=e=>{$('finderQuery').value=e.results[0][0].transcript;searchFinder()};
 rec.onerror=()=>{$('finderStatus').textContent='Voice search could not start. Check microphone permission.'};
 rec.start();
};
function parseFinderPayload(data){
 if(data&&Array.isArray(data.results))return data.results;
 if(data&&data.result)return [data.result];
 if(data&&data.title)return [data];
 return [];
}
async function searchFinder(){
 const query=$('finderQuery').value.trim();
 const endpoint=(localStorage.getItem(FINDER_ENDPOINT_KEY)||$('finderEndpoint').value.trim()).replace(/\/+$/,'');
 const status=$('finderStatus'),results=$('finderResults');
 results.innerHTML='';
 if(!query){status.textContent='Enter a song title and artist.';return}
 if(!endpoint){status.className='finder-status error';status.textContent='Connection not set. Open Connection settings and add your Cloudflare Worker URL first.';return}
 if(!/^https:\/\/[^ ]+/i.test(endpoint)){status.className='finder-status error';status.textContent='The Worker URL must start with https://';return}
 status.className='finder-status';status.textContent='Searching source-backed chord information…';
 $('finderSearchBtn').disabled=true;
 try{
  const response=await fetch(endpoint+'/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query})});
  const data=await response.json();
  if(!response.ok)throw new Error(data.error||`Search failed (${response.status})`);
  finderItems=parseFinderPayload(data);
  if(!finderItems.length){status.textContent=data.message||'No structured song result was returned. Try adding the artist name.';return}
  status.textContent=`Found ${finderItems.length} possible result(s). Check the source and arrangement before saving.`;
  results.innerHTML=finderItems.map((r,i)=>{
   const src=(r.sources||[]).map(s=>`<a href="${esc(s.url||'#')}" target="_blank" rel="noopener noreferrer">${esc(s.title||s.url||'Open source')}</a>`).join('');
   const sheet=r.chordSheet||r.chords||r.progression||'No chord progression was provided by the source.';
   const lyricNote=r.lyrics?'<span class="tag">Lyrics available from permitted source</span>':'<span class="tag">Lyrics not imported — open source</span>';
   return `<article class="finder-result"><h3>${esc(r.title||query)}</h3><div class="sub">${esc(r.artist||'Artist not confirmed')}</div><div class="result-meta">${r.key?`<span class="tag">KEY ${esc(r.key)}</span>`:''}${r.capo!==undefined&&r.capo!==null?`<span class="tag">CAPO ${esc(r.capo)}</span>`:''}${r.bpm?`<span class="tag">${esc(r.bpm)} BPM</span>`:''}${lyricNote}</div><pre>${esc(sheet)}</pre>${r.lyrics?`<details><summary>View imported lyrics</summary><pre>${esc(r.lyrics)}</pre></details>`:''}${r.strumming?`<p class="sub">Strumming: ${esc(r.strumming)}</p>`:''}<div class="source-list">${src||'<span class="sub">No source URL returned. Do not treat this result as verified.</span>'}</div><div class="result-actions"><button class="primary-btn" data-import-finder="${i}">＋ Add to My Songbook</button></div></article>`;
  }).join('');
 }catch(err){status.className='finder-status error';status.textContent=err.message||'Could not connect to Song Finder. Check Worker deployment and internet.'}
 finally{$('finderSearchBtn').disabled=false}
}
$('finderResults').addEventListener('click',async e=>{
 const btn=e.target.closest('[data-import-finder]');if(!btn)return;
 const r=finderItems[Number(btn.dataset.importFinder)];if(!r)return;
 const source=(r.sources||[]).find(s=>s.url)?.url||'';
 const song={id:crypto.randomUUID(),title:String(r.title||$('finderQuery').value.trim()),artist:String(r.artist||''),difficulty:'Intermediate',key:String(r.key||''),capo:r.capo===undefined?'':String(r.capo),bpm:r.bpm?String(r.bpm):'',strumming:String(r.strumming||''),chords:String(r.chords||r.progression||r.chordSheet||''),lyrics:String(r.lyrics||''),notes:source?`Imported with AI Song Finder. Source: ${source}\nPlease verify the key, capo and arrangement by listening to the recording.`:'Imported with AI Song Finder. Verify this arrangement before practice.',played:false,favorite:false,playedDate:'',sourceUrl:source,updatedAt:Date.now()};
 await putSong(song);await refresh();toast('Song imported to your book');$('finderDialog').close();showDetail(song.id);
});

if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
(async()=>{try{db=await openDB();await refresh()}catch(e){alert('Your browser could not open local storage. Please use an updated Chrome browser.')}})();

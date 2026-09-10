import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createCombatAudio,AUDIO_CUES,AUDIO_FILES} from '../src/audio.js';
function context() {
  const played=[];const param=()=>({setValueAtTime(){}});
  return {played,currentTime:1,destination:{},state:'suspended',
    async resume(){this.state='running';},async suspend(){this.state='suspended';},async close(){this.state='closed';},
    async decodeAudioData(data){return {data,duration:.5};},
    createGain:()=>({gain:param(),connect(){},disconnect(){}}),
    createDynamicsCompressor:()=>({threshold:param(),ratio:param(),connect(){},disconnect(){}}),
    createBufferSource(){const s={playbackRate:param(),connect(){},disconnect(){},start(){played.push(s);},stop(){s.stopped=true;}};return s;},
  };
}
const fetcher=async url=>({ok:true,arrayBuffer:async()=>url});
test('bundled CC0 audio has valid OGG headers and matches original hashes',()=>{
  const manifest=JSON.parse(readFileSync(new URL('../public/audio/kenney/manifest.json',import.meta.url)));
  for(const file of AUDIO_FILES){
    const entry=manifest.find(e=>e.file===file+'.ogg');assert.ok(entry,file);
    const data=readFileSync(new URL('../public/audio/kenney/'+entry.file,import.meta.url));
    assert.equal(data.subarray(0,4).toString(),'OggS');assert.equal(createHash('sha256').update(data).digest('hex'),entry.sha256);
  }
});
test('sample cues unlock on demand, throttle duplicates, rotate variants, and clean up',async()=>{
  const ac=context(),audio=createCombatAudio(ac,fetcher);audio.play(['shot']);assert.equal(ac.played.length,0);
  assert.equal(await audio.setMuted(false),true);assert.equal(audio.status().loaded,AUDIO_FILES.length);
  audio.play(['shot','shot','hurt']);assert.equal(audio.status().voices,2);
  const first=ac.played[1].buffer.data;audio.play(['shot']);assert.equal(audio.status().voices,2);
  ac.currentTime+=1;audio.play(['shot']);assert.notEqual(ac.played.at(-1).buffer.data,first);
  await audio.setMuted(true);assert.ok(ac.played.every(s=>s.stopped));assert.equal(ac.state,'suspended');
  await audio.setMuted(false);assert.equal(ac.played.filter(s=>s.loop&&!s.stopped).length,1);
  await audio.dispose();assert.equal(ac.state,'closed');assert.ok(ac.played.every(s=>s.stopped));
});
test('every event uses a decoded sample; natural endings release voices; overlap stays bounded',async()=>{
  const ac=context(),audio=createCombatAudio(ac,fetcher);await audio.setMuted(false);
  for(const name of Object.keys(AUDIO_CUES)){const before=ac.played.length;audio.play([name]);assert.equal(ac.played.length,before+1,name);ac.currentTime++;}
  const active=audio.status().voices;ac.played.at(-1).onended();assert.equal(audio.status().voices,active-1);
  for(let i=0;i<100;i++){ac.currentTime++;audio.play(['shot','blast','warning']);}
  assert.equal(audio.status().voices,24);await audio.dispose();
});
test('failed downloads are isolated and retried on the next enable',async()=>{
  let fail=true;const ac=context(),audio=createCombatAudio(ac,async url=>fail?{ok:false,status:404}:fetcher(url));
  assert.equal(await audio.setMuted(false),false);assert.equal(Object.keys(audio.status().errors).length,AUDIO_FILES.length);
  fail=false;assert.equal(await audio.setMuted(false),true);assert.deepEqual(audio.status().errors,{});await audio.dispose();
});
test('muting or disposing during loading prevents delayed playback',async()=>{
  for(const dispose of [false,true]){
    let release;const gate=new Promise(r=>{release=r;});const ac=context();
    const audio=createCombatAudio(ac,async url=>{await gate;return fetcher(url);});
    const pending=audio.setMuted(false);
    if(dispose) await audio.dispose();else await audio.setMuted(true);
    release();assert.equal(await pending,false);assert.equal(ac.played.length,0);assert.equal(ac.state,dispose?'closed':'suspended');
  }
});

// Kenney CC0 samples; licenses and hashes live in public/audio/kenney.
export const AUDIO_CUES = {
  shot: { files:['laserSmall_000','laserSmall_001','laserSmall_002'], volume:.21, gap:.075 },
  wire: { files:['laserLarge_001'], volume:.34, gap:.2, rate:1.35 },
  emp: { files:['forceField_000'], volume:.4, gap:.3 },
  arc: { files:['laserRetro_001'], volume:.28, gap:.18 },
  gravity: { files:['forceField_002'], volume:.3, gap:.5, rate:.75 },
  'lock-on': { files:['computerNoise_000'], volume:.2, gap:.3, rate:1.25 },
  orbital: { files:['explosionCrunch_002'], volume:.48, gap:.15 },
  jackpot: { files:['lowFrequency_explosion_000'], volume:.55, gap:.3 },
  hit: { files:['impactMetal_000','impactMetal_001'], volume:.12, gap:.09 },
  hurt: { files:['impactMetal_002'], volume:.43, gap:.2, rate:.8 },
  kill: { files:['explosionCrunch_000'], volume:.16, gap:.12, rate:1.25 },
  relay: { files:['confirmation_004'], volume:.48, gap:.3 },
  upgrade: { files:['confirmation_002'], volume:.42, gap:.2 },
  dash: { files:['thrusterFire_000'], volume:.24, gap:.12, rate:1.4 },
  overclock: { files:['forceField_001'], volume:.4, gap:.4 },
  'enemy-shot': { files:['laserLarge_000'], volume:.25, gap:.12 },
  warning: { files:['error_001'], volume:.4, gap:.6 },
  blast: { files:['explosionCrunch_001'], volume:.48, gap:.12 },
  victory: { files:['confirmation_001'], volume:.5, gap:1, rate:.85 },
  ui: { files:['select_001'], volume:.25, gap:.08 },
};
const AMBIENT = 'spaceEngineLow_000';
export const AUDIO_FILES = [...new Set([...Object.values(AUDIO_CUES).flatMap(c=>c.files), AMBIENT])];
export function createCombatAudio(ac, fetchAudio = globalThis.fetch) {
  let muted = true, disposed = false, loading, ambient, revision = 0;
  const buffers = new Map(), errors = new Map(), voices = new Set(), last = new Map(), variants = new Map();
  const master = ac.createGain(); master.gain.setValueAtTime(.6, ac.currentTime);
  const compressor = ac.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(-16, ac.currentTime); compressor.ratio.setValueAtTime(6, ac.currentTime);
  master.connect(compressor); compressor.connect(ac.destination);
  function stop(v) { v.source.onended=null; v.source.stop(); v.source.disconnect(); v.gain.disconnect(); voices.delete(v); }
  function stopAll() { for(const v of voices) stop(v); if(ambient) { stop(ambient); ambient=null; } }
  function load() {
    if(loading) return loading;
    loading=Promise.all(AUDIO_FILES.filter(f=>!buffers.has(f)).map(async file=>{
      try {
        const response=await fetchAudio(`/audio/kenney/${file}.ogg`);
        if(!response.ok) throw new Error(`HTTP ${response.status}`);
        const buffer=await ac.decodeAudioData(await response.arrayBuffer());
        if(!disposed) { buffers.set(file,buffer); errors.delete(file); }
      } catch(error) { if(!disposed) errors.set(file,String(error)); }
    })).finally(()=>{loading=null;});
    return loading;
  }
  function voice(file,volume,rate=1,loop=false) {
    const source=ac.createBufferSource(),gain=ac.createGain();
    source.buffer=buffers.get(file);source.playbackRate.setValueAtTime(rate,ac.currentTime);source.loop=loop;
    gain.gain.setValueAtTime(volume,ac.currentTime);source.connect(gain);gain.connect(master);
    const v={source,gain};
    source.onended=()=>{source.disconnect();gain.disconnect();voices.delete(v);};
    if(!loop) voices.add(v);source.start();return v;
  }
  return {
    async setMuted(value) {
      if(disposed) return false;
      const request=++revision;muted=value;
      if(muted) {stopAll();await ac.suspend();return false;}
      // Unlock in the user gesture; never queue old combat events during downloads.
      await Promise.all([ac.resume(),load()]);
      if(disposed||request!==revision||muted) return false;
      muted=ac.state!=='running'||!Object.values(AUDIO_CUES).some(c=>c.files.some(f=>buffers.has(f)));
      if(muted) {await ac.suspend();return false;}
      if(!ambient&&buffers.has(AMBIENT)) ambient=voice(AMBIENT,.025,1,true);
      return true;
    },
    play(events) {
      if(muted||disposed||ac.state!=='running') return;
      for(const name of new Set(events)) {
        const cue=AUDIO_CUES[name],now=ac.currentTime;
        if(!cue||now-(last.get(name)??-Infinity)<cue.gap) continue;
        const files=cue.files.filter(f=>buffers.has(f));if(!files.length) continue;
        if(voices.size>=24) {if(['shot','hit','kill','enemy-shot'].includes(name)) continue;stop(voices.values().next().value);}
        const index=variants.get(name)||0;
        voice(files[index%files.length],cue.volume,cue.rate);variants.set(name,index+1);last.set(name,now);
      }
    },
    status() {return {loaded:buffers.size,total:AUDIO_FILES.length,errors:Object.fromEntries(errors),voices:voices.size,muted};},
    async dispose() {
      if(disposed) return;
      disposed=true;++revision;stopAll();buffers.clear();master.disconnect();compressor.disconnect();await ac.close();
    },
  };
}

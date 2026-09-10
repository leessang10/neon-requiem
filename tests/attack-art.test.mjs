import test from 'node:test';
import assert from 'node:assert/strict';
import {setAttackAtlas,setAttackTime,attackStamp,splash} from '../src/attack-art.js';
import {renderWeapons} from '../src/weapons.js';

test('slash keeps its attack direction across all authored frames without a spinning duplicate',()=>{
  setAttackAtlas({width:1122,height:1402});
  const angles=[],draws=[];
  const ctx=new Proxy({globalAlpha:1,rotate:a=>angles.push(a),drawImage:(...a)=>draws.push(a)}, {get:(o,k)=>o[k]??(()=>{})});
  for(const life of [1,.74,.49,.01])renderWeapons(ctx,{time:0,weaponZones:[],weaponFx:[{kind:'wire',x:0,y:0,r:130,angle:.7,life,max:1}]});
  assert.deepEqual(angles,[.7,.7,.7,.7]);
  assert.equal(draws.length,4);
  assert.equal(new Set(draws.map(a=>a[1])).size,4);
});
test('authored VFX selects distinct rows and four lifetime frames within the atlas',()=>{
  const sheet={width:1122,height:1402};setAttackAtlas(sheet);
  const draws=[];const ctx=new Proxy({globalAlpha:1},{get:(o,k)=>k in o?o[k]:k==='drawImage'?(...a)=>draws.push(a):()=>{}});
  for(const kind of ['slash','ring','burst','vortex','bolt'])for(const p of [0,.25,.5,.99])attackStamp(ctx,kind,'#76baff',0,0,100,0,1,1,p);
  assert.equal(draws.length,20);assert.equal(new Set(draws.map(a=>a[2])).size,5);
  assert.equal(new Set(draws.slice(0,4).map(a=>a[1])).size,4);
  for(const [,x,y,w,h]of draws){assert.ok(x>=0&&y>=0&&x+w<=1122.01&&y+h<=1402.01);}
  draws.length=0;setAttackTime(2);attackStamp(ctx,'bolt','#76baff',0,0,20);attackStamp(ctx,'bolt','#76baff',0,0,20);
  assert.deepEqual(draws[0],draws[1]);
  splash(ctx,0,0,100,1,'#ff668c');assert.equal(draws.length,2);
});

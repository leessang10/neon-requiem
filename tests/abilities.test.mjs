import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,chooseUpgrade,dash,overclock,step,nextSector,render} from '../src/game.js';
import {ABILITIES,abilityStats} from '../src/abilities.js';
import {rollUpgrades,equipWeapon} from '../src/weapons.js';
const choose=(s,id)=>{s.mode='upgrade';s.choices=[ABILITIES.find(a=>a.id===id)];chooseUpgrade(s,id);};
test('dash upgrades cooldown and immunity without occupying a weapon slot',()=>{
  const s=createState();choose(s,'dash');dash(s);
  assert.equal(s.abilities.dash,2);assert.deepEqual(s.weapons,{});
  assert.ok(s.dash<3.2);assert.ok(s.invuln>.4);
  const duration=s.dash;dash(s);assert.equal(s.dash,duration);
  assert.equal(chooseUpgrade(s,'dash'),false);assert.equal(s.abilities.dash,2);
});
test('overclock upgrade increases damage, radius and recharge; pause freezes recharge',()=>{
  const s=createState();choose(s,'overclock');s.spawn=999;
  s.enemies=[{x:s.x+445,y:s.y,hp:1000}];overclock(s);
  assert.equal(s.heat,0);assert.ok(s.enemies[0].hp<1000);assert.equal(s.fx[0].r,455);
  assert.ok(abilityStats(s,'overclock').damage>136);
  s.enemies=[];step(s,.1);assert.ok(s.heat>.4);
  s.mode='paused';const heat=s.heat;step(s,1);assert.equal(s.heat,heat);
});
test('abilities cap at level six, disappear from choices and persist across sectors',()=>{
  const s=createState();equipWeapon(s,'wire');
  for(const a of ABILITIES)for(let i=0;i<5;i++)choose(s,a.id);
  const stats=abilityStats(s,'dash');assert.ok(stats.cooldown>=1.7);
  for(let i=0;i<100;i++)assert.ok(rollUpgrades(s,()=>i/100).every(w=>!w.ability));
  choose(s,'dash');assert.equal(s.abilities.dash,6);
  nextSector(s);assert.deepEqual(s.abilities,{dash:6,overclock:6});
});
test('enemy types select separate art rows and real walking frames',()=>{
  const calls=[];const ctx=new Proxy({},{get:(_,k)=>k==='drawImage'?(...a)=>calls.push(a):()=>{},set:()=>true});
  const loaded={complete:true,naturalWidth:1254,naturalHeight:1254};
  const atlas={complete:true,naturalWidth:1254,naturalHeight:1254};
  const s=createState();s.mode='playing';s.enemies=['charger','gunner','bomber','boss'].map((type,i)=>({type,x:s.x+i*60,y:s.y,hp:100,maxHp:100,walk:2,face:0}));
  render(ctx,s,{bg:loaded,player:loaded,enemy:loaded,enemyTypes:atlas},1280,720);
  const frames=calls.filter(a=>a[0]===atlas);assert.equal(frames.length,4);
  assert.equal(new Set(frames.map(a=>a[2])).size,4);assert.ok(frames.every(a=>a[1]===627));
});

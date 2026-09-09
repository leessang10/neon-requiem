import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, step, render, WORLD, SPAWN } from '../src/game.js';
const playing = () => { const s = createState(); s.mode = 'playing'; s.spawn = 1000; return s; };
test('WASD and joystick move, normalize diagonals, and stop at release', () => {
  const s = playing(); s.keys.add('d'); s.keys.add('w'); step(s, .1);
  assert.ok(Math.abs(Math.hypot(s.x-SPAWN.x,s.y-SPAWN.y)-20.5)<.001);
  assert.ok(s.walk > 0); s.keys.clear(); const x=s.x,y=s.y; step(s,.1);
  assert.equal(s.x,x); assert.equal(s.y,y); assert.equal(s.walk,0);
  s.stick={x:-1,y:0}; step(s,.1); assert.ok(s.x<x);
});
test('legacy targets and arrow keys do not move the player', () => {
  const s=playing(); s.target={x:3000,y:2000}; s.keys.add('arrowright'); step(s,.1);
  assert.equal(s.x,SPAWN.x); assert.equal(s.y,SPAWN.y);
});
test('expanded world is traversable beyond old bounds and clamps at new bounds', () => {
  const s=playing(); s.keys.add('d'); for(let i=0;i<100;i++) step(s,.04);
  assert.ok(s.x>2900); s.x=WORLD.width-91; step(s,.1); assert.equal(s.x,WORLD.width-90);
  s.keys.clear(); s.keys.add('s'); s.y=WORLD.height-91; step(s,.1); assert.equal(s.y,WORLD.height-90);
});
test('renderer selects actual atlas cells, idle frame, and enemy walk frames', () => {
  const calls=[]; const ctx=new Proxy({}, {get:(_,key)=>key==='drawImage'?(...args)=>calls.push(args):()=>{},set:()=>true});
  const loaded={complete:true,naturalWidth:1536}; const atlas={width:1536,height:1024};
  const images={bg:loaded,terminal:loaded,arcology:loaded,player:loaded,enemy:loaded,walkAtlas:atlas};
  const s=playing(); s.walk=2.3; s.enemies=[{x:s.x+80,y:s.y+20,hp:42,maxHp:42,walk:3.2,face:0,speed:55,hit:0}];
  render(ctx,s,images,1280,720);
  const frames=calls.filter(c=>c[0]===atlas); assert.equal(frames[0][1],768); assert.equal(frames[0][2],0);
  assert.equal(frames[1][1],1152); assert.equal(frames[1][2],512);
  calls.length=0; step(s,.01); render(ctx,s,images,390,844);
  assert.equal(calls.find(c=>c[0]===atlas)[1],0);
});


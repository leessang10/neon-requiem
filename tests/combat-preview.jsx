// Vite-only visual fixture. Not part of the production entry or build.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '../src/App.jsx';
import { createState } from '../src/game.js';
import { createEnemy } from '../src/combat.js';
import { WEAPONS, equipWeapon, stepWeapons } from '../src/weapons.js';
import '../src/theme.css';

const scene = new URLSearchParams(location.search).get('scene') || 'boss';
function fixture() {
  const s = createState();
  s.mode = 'inspection'; // Freeze simulation to inspect actual renderer and HUD.
  s.sector = 2; s.time = 180; s.level = 8; s.noticeTime = 0;
  s.nodes.forEach(n => n.p = 1);
  const make = (type, dx, dy) => Object.assign(createEnemy(s, () => .5, type), {
    x: s.x + dx, y: s.y + dy, aim: Math.atan2(-dy, -dx), phase: 'windup', timer: .5, windupDuration: 1.05,
  });
  if (['choices','loadout','weapons','orbital'].includes(scene)) {
    s.sector=0; s.nodes.forEach(n=>n.p=0); s.level=2; s.spawn=999;
    equipWeapon(s,'wire');
    if(scene==='choices') { s.mode='upgrade'; s.choices=['wire','emp','orbital'].map(id=>WEAPONS.find(w=>w.id===id)); return s; }
    WEAPONS.filter(w=>w.id!=='wire').forEach(w=>equipWeapon(s,w.id));
    if(scene==='loadout') {s.mode='paused';return s;}
    s.enemies=[make('soldier',-120,-110),make('soldier',170,-70),make('soldier',80,160)].map(e=>({...e,hp:10000,maxHp:10000,phase:'chase'}));
    s.mode='playing';stepWeapons(s,.01,()=>.05);
    if(scene==='orbital') {stepWeapons(s,.66,()=>.05);s.weaponTimers.wire=0;stepWeapons(s,0,()=>.05);}
    s.mode='inspection';return s;
  } else if (scene === 'patterns') {
    s.enemies = [make('charger', -150, -130), make('gunner', 180, -140), make('bomber', 40, 140)];
  } else {
    s.bossSpawned = true;
    const boss = make('boss', 90, -160);
    boss.enraged = scene === 'blast'; boss.hp = boss.enraged ? 880 : 1800;
    boss.attack = scene === 'blast' ? 'blast' : 'shot'; boss.targetX = s.x - 65; boss.targetY = s.y + 90;
    s.enemies = [boss];
  }
  return s;
}
createRoot(document.getElementById('root')).render(<App initialState={fixture} />);

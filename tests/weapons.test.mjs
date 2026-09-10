import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, step, chooseUpgrade, nextSector, UPGRADES } from '../src/game.js';
import { WEAPONS, equipWeapon, grantStarterWeapon, weaponStats, rollUpgrades, stepWeapons } from '../src/weapons.js';

const playing = () => Object.assign(createState(), { mode: 'playing', spawn: 999 });
const choose = (s,id) => { s.mode='upgrade'; s.choices=[WEAPONS.find(w=>w.id===id)]; chooseUpgrade(s,id); };
const foe = (s, x, y = 0) => ({ x: s.x + x, y: s.y + y, hp: 1000, maxHp: 1000, speed: 0, walk: 0, type: 'soldier' });
const advance = (s, seconds, dt = .01, random = () => .9) => { for (let t = 0; t < seconds - 1e-8; t += dt) step(s, dt, random); };

test('a run receives exactly one random starter and identical seeds reproduce it', () => {
  const a = playing(), b = playing(), c = playing();
  grantStarterWeapon(a, () => 0); grantStarterWeapon(b, () => 0); grantStarterWeapon(c, () => .99);
  assert.deepEqual(a.weapons, b.weapons); assert.notDeepEqual(a.weapons, c.weapons);
  assert.equal(Object.values(a.weapons).reduce((x,y) => x+y, 0), 1);
});

test('all seven weapons can coexist, improve, and persist between sectors', () => {
  const s = playing();
  for (const w of WEAPONS) {
    choose(s, w.id); const first = weaponStats(s, w.id);
    choose(s, w.id); assert.ok(weaponStats(s, w.id).damage > first.damage);
  }
  s.weaponZones.push({ kind: 'gravity' }); s.weaponFx.push({}); nextSector(s);
  assert.equal(Object.keys(s.weapons).length,7); assert.ok(Object.values(s.weapons).every(n=>n===2)); assert.deepEqual(s.weaponZones, []); assert.deepEqual(s.weaponFx, []);
});

test('three distinct weapon choices mix new equipment and owned upgrades whenever possible', () => {
  const s = playing(); equipWeapon(s,'wire');
  const a = rollUpgrades(s, () => 0), b = rollUpgrades(s, () => .99);
  assert.equal(new Set(a.map(w => w.id)).size, 3); assert.ok(a.every(w => w.weapon)); assert.notDeepEqual(a, b);
  assert.ok(a.some(w=>s.weapons[w.id])); assert.ok(a.some(w=>!s.weapons[w.id]));
  assert.ok(UPGRADES.every(w=>w.weapon));
  WEAPONS.forEach(w => { s.weapons[w.id] = 20; });
  const allOwned=rollUpgrades(s,()=>.5); assert.equal(allOwned.length,3); choose(s,allOwned[0].id);
  assert.equal(s.weapons[allOwned[0].id],21);
});

test('monowire hits the whole close circle once per cycle and uses the current player position', () => {
  const s = playing(); equipWeapon(s, 'wire');
  const a = foe(s, 100), b = foe(s, -100), far = foe(s, 250); s.enemies = [a,b,far];
  step(s, .01); assert.ok(a.hp < 1000); assert.equal(a.hp, b.hp); assert.equal(far.hp, 1000);
  const hp = a.hp; advance(s, .2); assert.equal(a.hp, hp);
  s.x += 250; advance(s, 1.3); assert.ok(far.hp < 1000); assert.equal(b.hp, hp);
});

test('EMP affects only its radius, interrupts movement, and clears nearby hostile shots', () => {
  const s = playing(); equipWeapon(s, 'emp');
  const near = foe(s, 100), far = foe(s, 400); near.speed = 100; s.enemies = [near, far];
  s.hostileBullets = [100,400].map(x => ({ x:s.x+x,y:s.y,vx:0,vy:0,life:2,damage:12 }));
  const x = near.x; step(s,.01); assert.ok(near.hp < 1000); assert.equal(far.hp,1000); assert.ok(near.stun > 0);
  advance(s,.3); assert.equal(near.x,x); assert.equal(s.hostileBullets.length,1);
});

test('gravity well is anchored, pulls normal enemies more than bosses, and DOT is time based', () => {
  const simulate = dt => {
    const s = playing(); s.weaponZones = [{kind:'gravity',x:s.x,y:s.y,r:150,damage:32,life:2.6,max:2.6}];
    const normal=foe(s,100), boss=foe(s,100); boss.type='boss'; boss.cooldown=999; s.enemies=[normal,boss];
    for(let t=0;t<.5-1e-8;t+=dt) stepWeapons(s,dt,()=>.5);
    assert.ok(normal.x < boss.x); return normal.hp;
  };
  assert.ok(Math.abs(simulate(.01)-simulate(.02))<1e-6);
});

test('orbital strike rolls targets without replacement, warns first, then boosted blast deals more damage', () => {
  const simulate = random => {
    const s = playing(); equipWeapon(s,'orbital'); s.enemies=[foe(s,250),foe(s,-250),foe(s,0,300)];
    step(s,.01,random); assert.equal(s.weaponZones.length,2);
    assert.equal(new Set(s.weaponZones.map(z=>`${z.x},${z.y}`)).size,2);
    assert.ok(s.enemies.every(e=>e.hp===1000)); advance(s,.7,.01,random);
    assert.ok(s.weaponFx.some(f=>f.kind==='orbital')); return 3000-s.enemies.reduce((sum,e)=>sum+e.hp,0);
  };
  assert.ok(simulate(()=>0)>simulate(()=>.99));
});

test('pending orbital blasts freeze when paused and cannot damage the player', () => {
  const s=playing(); s.weaponZones=[{kind:'strike',x:s.x,y:s.y,r:150,damage:999,life:.2,max:.2}];
  s.mode='paused'; step(s,1); assert.equal(s.weaponZones[0].life,.2);
  s.mode='playing'; step(s,.3); assert.equal(s.hp,100); assert.equal(s.weaponZones.length,0);
});

test('weapon kills award XP once and weapon damage and cooldown scale with upgrades', () => {
  const s=playing(); equipWeapon(s,'wire'); const e=foe(s,50); e.hp=1; s.enemies=[e];
  step(s,.01); step(s,.01); assert.equal(s.kills,1); assert.equal(s.gems.length,1);
  const base=weaponStats(s,'wire'); choose(s,'wire');
  assert.ok(weaponStats(s,'wire').damage>base.damage); assert.ok(weaponStats(s,'wire').cooldown<base.cooldown);
});

test('an unowned rifle never fires and one upgrade cannot be applied twice', () => {
  const s=playing(); equipWeapon(s,'wire'); s.enemies=[foe(s,350)];
  advance(s,.5); assert.deepEqual(s.bullets,[]);
  choose(s,'rifle'); const level=s.weapons.rifle; chooseUpgrade(s,'rifle'); assert.equal(s.weapons.rifle,level);
  step(s,.01); assert.ok(s.bullets.length>0);
});

test('all equipped weapon behaviors execute together without replacing each other', () => {
  const s=playing(); s.invuln=100;
  WEAPONS.forEach(w=>equipWeapon(s,w.id));
  s.enemies=[foe(s,80),foe(s,-140),foe(s,240),foe(s,0,310)].map(e=>({...e,hp:1e6,maxHp:1e6}));
  const kinds=new Set(), events=new Set(); let rifle=false,drone=false;
  for(let i=0;i<650;i++) {
    step(s,.01,()=>.1); s.weaponFx.forEach(f=>kinds.add(f.kind));s.weaponZones.forEach(z=>kinds.add(z.kind));
    s.sounds.splice(0).forEach(n=>events.add(n));
    rifle ||= s.bullets.some(b=>!b.drone); drone ||= s.bullets.some(b=>b.drone);
  }
  assert.ok(rifle&&drone);
  for(const kind of ['wire','emp','arc','gravity','strike','orbital']) assert.ok(kinds.has(kind),kind);
  for(const cue of ['wire','emp','arc','gravity','lock-on','jackpot']) assert.ok(events.has(cue),cue);
  assert.equal(s.hp,100); assert.equal(Object.keys(s.weapons).length,7);
});

test('every weapon can be the sole starter and repeated grants do not add free weapons', () => {
  const ids=new Set();
  for(let i=0;i<150;i++) {
    const s=playing();grantStarterWeapon(s,()=>i/150); grantStarterWeapon(s,()=>.99);
    assert.equal(Object.keys(s.weapons).length,1);ids.add(Object.keys(s.weapons)[0]);
  }
  assert.equal(ids.size,7);
});

test('chain lightning never hits the same enemy twice in one discharge', () => {
  const s=playing();equipWeapon(s,'arc'); s.enemies=[foe(s,100),foe(s,140),foe(s,180)];
  step(s,.01,()=>0); assert.ok(s.enemies.every(e=>e.hp===955));
});

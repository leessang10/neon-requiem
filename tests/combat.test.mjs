import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, step, nextSector, overclock, render } from '../src/game.js';
import { equipWeapon } from '../src/weapons.js';

const playing = () => Object.assign(createState(), { mode: 'playing', spawn: 999 });
const enemy = (s, type, dx = 200) => ({ type, x: s.x + dx, y: s.y, hp: 100, maxHp: 100, speed: 60, walk: 0, hit: 0, cooldown: 0 });
const advance = (s, seconds) => { for (let i = 0; i < Math.round(seconds * 100); i++) step(s, .01); };

test('relay capture matches the visible 72 by 48 ellipse, including its boundary', () => {
  const s = playing(), n = s.nodes[0];
  s.x = n.x; s.y = n.y + 60; step(s, .04);
  assert.equal(n.p, 0, 'outside the displayed ellipse must not capture');
  s.y = n.y + 48; step(s, .04); assert.ok(n.p > 0);
  const p = n.p; s.x = n.x + 60; s.y = n.y + 40; step(s, .04); assert.equal(n.p, p);
});

test('charger telegraphs, locks direction, then dashes and recovers', () => {
  const s = playing(), e = enemy(s, 'charger'); s.enemies = [e];
  step(s, .01); assert.equal(e.phase, 'windup');
  const start = e.x; advance(s, .3); assert.equal(e.x, start);
  s.y += 160; advance(s, .5);
  assert.ok(e.x < start - 30); assert.ok(Math.abs(e.y - (s.y - 160)) < 1, 'dash must follow its original warning');
  advance(s, .5); assert.ok(e.cooldown > 0);
});

test('gunner maintains range and fires a warned, dodgeable projectile', () => {
  const s = playing(), e = enemy(s, 'gunner', 290); s.enemies = [e];
  step(s, .01); assert.equal(e.phase, 'windup'); assert.equal(s.hostileBullets.length, 0);
  advance(s, .85); assert.ok(s.hostileBullets.length > 0);
  assert.equal(s.hp, 100); advance(s, 1.3); assert.ok(s.hp < 100);
});

test('bomber stops to warn before exploding; fleeing and killing it both prevent damage', () => {
  const s = playing(), e = enemy(s, 'bomber', 65); s.enemies = [e];
  step(s, .01); assert.equal(e.phase, 'windup'); assert.equal(s.hp, 100);
  advance(s, .4); assert.equal(s.hp, 100);
  s.y += 200; advance(s, .8); assert.equal(s.hp, 100); assert.equal(s.enemies.length, 0);
  assert.equal(s.kills, 0, 'self-destruct is not a player kill');
  const t = playing(); t.enemies = [enemy(t, 'bomber', 65)]; step(t, .01);
  overclock(t); advance(t, 1.3); assert.equal(t.hp, 100); assert.equal(t.kills, 1);
});

test('hostile projectiles respect invulnerability and freeze while paused', () => {
  const s = playing();
  s.hostileBullets = [{ x: s.x, y: s.y, vx: 0, vy: 0, life: 2, damage: 12 }];
  s.invuln = 1; step(s, .01); assert.equal(s.hp, 100); assert.equal(s.hostileBullets.length, 0);
  s.hostileBullets.push({ x: s.x + 50, y: s.y, vx: -100, vy: 0, life: 2, damage: 12 });
  s.mode = 'paused'; step(s, 1); assert.equal(s.hostileBullets[0].life, 2);
});

test('final relays spawn exactly one boss and victory requires killing it', () => {
  const s = playing(); s.sector = 2; s.nodes.forEach(n => n.p = 1);
  step(s, .01); assert.equal(s.mode, 'playing');
  const boss = s.enemies.find(e => e.type === 'boss'); assert.ok(boss);
  step(s, .01); assert.equal(s.enemies.filter(e => e.type === 'boss').length, 1);
  boss.hp = 0; step(s, .01); assert.equal(s.mode, 'won'); assert.equal(s.bossDefeated, true);
});

test('boss attacks are telegraphed, phase two activates, and death takes precedence over victory', () => {
  const s = playing(); s.sector = 2; s.nodes.forEach(n => n.p = 1); step(s, .01);
  const boss = s.enemies.find(e => e.type === 'boss'); assert.ok(boss);
  boss.x = s.x + 260; boss.y = s.y; boss.cooldown = 0;
  step(s, .01); assert.equal(boss.phase, 'windup'); advance(s, 1.1);
  assert.ok(s.hostileBullets.length >= 5);
  boss.hp = boss.maxHp * .4; step(s, .01); assert.equal(boss.enraged, true);
  boss.hp = 0; s.hp = 0; step(s, .01); assert.equal(s.mode, 'dead');
});

test('sector transition clears hostile shots, boss state, and leftover effects', () => {
  const s = playing(); s.hostileBullets = [{}]; s.fx = [{}]; s.bossSpawned = true;
  nextSector(s); assert.deepEqual(s.hostileBullets, []); assert.deepEqual(s.fx, []); assert.equal(s.bossSpawned, false);
});

test('sound events are produced for real combat and relay completion only once', () => {
  const s = playing(); s.damage = 100; s.enemies = [enemy(s, 'soldier', 30)];
  equipWeapon(s, 'rifle');
  advance(s, .12); assert.ok(s.sounds.includes('shot')); assert.ok(s.sounds.includes('kill'));
  const n = s.nodes[0]; s.x = n.x; s.y = n.y; n.p = .999;
  step(s, .02); step(s, .02); assert.equal(s.sounds.filter(x => x === 'relay').length, 1);
});

test('off-screen boss has a visible direction marker on narrow viewports', () => {
  const s = playing(); s.sector = 2; s.bossSpawned = true;
  s.nodes.forEach(n => n.p = 1);
  s.enemies = [enemy(s, 'boss', 460)];
  const labels = [];
  const ctx = new Proxy({}, { get: (_, key) => key === 'fillText' ? (...args) => labels.push(args) : () => {}, set: () => true });
  const loaded = { complete: true, naturalWidth: 10 };
  render(ctx, s, { bg: loaded, terminal: loaded, arcology: loaded, player: loaded, enemy: loaded }, 390, 844);
  assert.ok(labels.some(([text, x]) => text === '집행관 →' && x > s.x && x < s.x + 236), 'boss marker should be inside mobile camera');
});

test('boss ground blast locks its target and can be dodged during the warning', () => {
  const s = playing(); s.sector = 2; s.nodes.forEach(n => n.p = 1); step(s, .01);
  const e = s.enemies[0]; e.x = s.x + 280; e.y = s.y; e.cooldown = 0; e.attackIndex = 1;
  step(s, .01); assert.equal(e.attack, 'blast'); const targetX = e.targetX;
  s.x -= 160; advance(s, 1.1);
  assert.equal(s.hp, 100); assert.equal(e.targetX, targetX);
  assert.ok(s.fx.some(f => f.type === 'blast'));
});

test('lethal damage cannot be reversed by completing a relay in the same frame', () => {
  const s = playing(); s.sector = 2; s.hp = 1; s.nodes.forEach(n => n.p = 1);
  const n = s.nodes[2]; n.p = .999; s.x = n.x; s.y = n.y;
  s.hostileBullets = [{ x: s.x, y: s.y, vx: 0, vy: 0, damage: 100, life: 1 }];
  step(s, .02); assert.equal(s.mode, 'dead'); assert.equal(s.hp, 0);
  assert.equal(s.bossSpawned, false); assert.equal(n.p, .999);
});

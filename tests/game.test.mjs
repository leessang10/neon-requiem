import test from "node:test";
import assert from "node:assert/strict";
import {
  createState,
  step,
  dash,
  overclock,
  chooseUpgrade,
  nextSector,
} from "../src/game.js";
const playing = () =>
  Object.assign(createState(), { mode: "playing", spawn: 999 });
test("pause freezes simulation and movement is frame-rate independent", () => {
  const a = playing(),
    b = playing();
  a.keys.add("d");
  b.keys.add("d");
  for (let i = 0; i < 60; i++) step(a, 1 / 60);
  for (let i = 0; i < 120; i++) step(b, 1 / 120);
  assert.ok(Math.abs(a.x - b.x) < 0.01);
  a.mode = "paused";
  const x = a.x;
  step(a, 1);
  assert.equal(a.x, x);
});
test("dash cooldown and overclock cannot be spammed", () => {
  const s = playing();
  dash(s);
  assert.ok(s.dash > 0);
  s.dash = 2;
  dash(s);
  assert.equal(s.dash, 2);
  s.enemies = [{ x: s.x + 30, y: s.y, hp: 300 }];
  overclock(s);
  assert.equal(s.heat, 0);
  const hp = s.enemies[0].hp;
  overclock(s);
  assert.equal(s.enemies[0].hp, hp);
});
test("XP pauses combat for three upgrade choices, healing is capped", () => {
  const s = playing();
  s.xp = 8;
  step(s, 0.01, () => 0.4);
  assert.equal(s.mode, "upgrade");
  assert.equal(s.level, 2);
  assert.equal(s.choices.length, 3);
  chooseUpgrade(s, "heal");
  assert.equal(s.mode, "playing");
  assert.equal(s.hp, 115);
});
test("relay progress persists on exit; three captures advance and last sector wins", () => {
  const s = playing();
  s.x = s.nodes[0].x;
  s.y = s.nodes[0].y;
  for (let i = 0; i < 240; i++) step(s, 1 / 60);
  const p = s.nodes[0].p;
  assert.ok(p > 0.49 && p < 0.51);
  s.x = 720;
  s.y = 520;
  step(s, 0.1);
  assert.equal(s.nodes[0].p, p);
  s.nodes.forEach((n) => (n.p = 1));
  step(s, 0.01);
  assert.equal(s.mode, "sector");
  s.damage = 40;
  nextSector(s);
  assert.equal(s.sector, 1);
  assert.equal(s.damage, 40);
  assert.equal(s.nodes[0].p, 0);
  s.sector = 2;
  s.nodes.forEach((n) => (n.p = 1));
  step(s, 0.01);
  assert.equal(s.mode, "won");
});
test("contact death ends run before victory or level-up", () => {
  const s = playing();
  s.hp = 1;
  s.enemies = [{ x: s.x, y: s.y, hp: 100, maxHp: 100, speed: 0 }];
  s.xp = 8;
  step(s, 0.01);
  assert.equal(s.mode, "dead");
  assert.equal(s.hp, 0);
});
test("dead enemies count once and bullets expire", () => {
  const s = playing();
  s.enemies = [{ x: 100, y: 100, hp: 0 }];
  step(s, 0.01);
  step(s, 0.01);
  assert.equal(s.kills, 1);
  assert.equal(s.gems.length, 1);
});

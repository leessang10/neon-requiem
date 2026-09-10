import { ABILITIES, abilityStats, upgradeAbility } from './abilities.js';
import { splash } from './attack-art.js';
import { renderBallistics } from './ballistic-art.js';
import { RELAY_RADIUS, ENEMY_STYLE, cue, createEnemy, updateEnemy, updateHostileBullets, renderThreats } from './combat.js';
import { WEAPONS, equipWeapon, rollUpgrades, stepWeapons, renderWeapons } from './weapons.js';
export const WORLD = { width: 4320, height: 3072 };
export const SPAWN = { x: 2160, y: 1536 };
export const SECTORS = [
  "BLACK RAIN DISTRICT",
  "GHOSTLINE TERMINAL",
  "KINTSUGI ARCOLOGY",
];
export const UPGRADES = [...WEAPONS,...ABILITIES];
export function createState() {
  return {
    mode: "menu",
    x: SPAWN.x,
    y: SPAWN.y,
    walk: 0,
    moving: false,
    hp: 100,
    maxHp: 100,
    time: 0,
    sector: 0,
    sectorTime: 0,
    kills: 0,
    xp: 0,
    level: 1,
    nextXp: 8,
    damage: 18,
    speed: 205,
    drones: 0,
    spawn: 0,
    dash: 0,
    dashTime: 0,
    invuln: 0,
    heat: 100,
    enemies: [],
    weapons: {},
    abilities: { dash:1, overclock:1 },
    weaponTimers: {},
    weaponZones: [],
    weaponFx: [],
    bullets: [],
    hostileBullets: [],
    sounds: [],
    bossSpawned: false,
    bossDefeated: false,
    gems: [],
    fx: [],
    nodes: [
      { x: 1550, y: 1130, p: 0 },
      { x: 3050, y: 1490, p: 0 },
      { x: 2050, y: 2350, p: 0 },
    ],
    keys: new Set(),
    stick: { x: 0, y: 0 },
    face: 0,
    choices: [],
    notice: "중계기 안에서 버티면 해킹이 진행됩니다.",
    noticeTime: 7,
  };
}
export function chooseUpgrade(s, id) {
  if (s.mode !== 'upgrade' || !s.choices.some(w => w.id === id)) return false;
  if (ABILITIES.some(a=>a.id===id)) { if(!upgradeAbility(s,id)) return false; }
  else equipWeapon(s, id);
  s.mode = "playing";
  s.choices = [];
  s.keys.clear();
  s.stick = { x: 0, y: 0 };
  cue(s, 'upgrade');
}
export function dash(s) {
  if (s.mode !== "playing" || s.dash > 0) return;
  const stats=abilityStats(s,'dash');
  s.dash = stats.cooldown;
  s.dashTime = 0.18;
  s.invuln = Math.max(s.invuln,stats.invuln);
  cue(s, 'dash');
}
export function overclock(s) {
  if (s.mode !== "playing" || s.heat < 100) return;
  s.heat = 0;
  const stats=abilityStats(s,'overclock');
  s.invuln = Math.max(s.invuln,1.2);
  cue(s, 'overclock');
  s.fx.push({ x: s.x, y: s.y, life: 0.7, max: 0.7, type: "pulse", r: stats.radius });
  for (const e of s.enemies)
    if (Math.hypot(e.x - s.x, e.y - s.y) < stats.radius) e.hp -= stats.damage;
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function step(s, dt, random = Math.random) {
  if (s.mode !== "playing") return;
  s.time += dt;
  s.sectorTime += dt;
  s.spawn -= dt;
  s.dash = Math.max(0, s.dash - dt);
  s.dashTime = Math.max(0, s.dashTime - dt);
  s.invuln = Math.max(0, s.invuln - dt);
  s.heat = Math.min(100, s.heat + dt * abilityStats(s,'overclock').charge);
  s.noticeTime -= dt;
  let dx =
    (s.keys.has("d") ? 1 : 0) -
    (s.keys.has("a") ? 1 : 0) +
    s.stick.x;
  let dy =
    (s.keys.has("s") ? 1 : 0) -
    (s.keys.has("w") ? 1 : 0) +
    s.stick.y;
  const length = Math.hypot(dx, dy);
  if (length > 0) {
    dx /= Math.max(1, length);
    dy /= Math.max(1, length);
    s.face = Math.atan2(dy, dx);
  }
  if (s.dashTime > 0 && length === 0) {
    dx = Math.cos(s.face);
    dy = Math.sin(s.face);
  }
  const speed = s.speed * (s.dashTime > 0 ? 4.5 : 1);
  const oldX = s.x, oldY = s.y;
  s.x = clamp(s.x + dx * speed * dt, 90, WORLD.width - 90);
  s.y = clamp(s.y + dy * speed * dt, 90, WORLD.height - 90);
  const distance = Math.hypot(s.x - oldX, s.y - oldY);
  s.moving = distance > 0.01;
  s.walk = s.moving ? s.walk + distance / 24 : 0;
  if (s.spawn <= 0 && s.enemies.length < 90 && !s.bossSpawned) {
    s.spawn = Math.max(0.18, 0.55 - s.time * 0.001 - s.sector * 0.08);
    s.enemies.push(createEnemy(s, random));
  }
  stepWeapons(s, dt, random);
  const live = s.enemies.filter(e => e.hp > 0);
  for (const b of s.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    for (const e of live) {
      if (e.hp > 0 && Math.hypot(e.x - b.x, e.y - b.y) < (e.type === 'boss' ? 48 : e.elite ? 30 : 23)) {
        e.hp -= b.damage;
        e.hit = 0.09;
        b.life = 0;
        s.fx.push({ x: b.x, y: b.y, life: 0.13, max: 0.13, type: "hit" });
        cue(s, 'hit');
        break;
      }
    }
  }
  s.bullets = s.bullets.filter((b) => b.life > 0);
  for (const e of s.enemies) {
    if (e.hp <= 0) {
      s.kills++;
      cue(s, 'kill');
      if (e.type === 'boss') s.bossDefeated = true;
      s.gems.push({ x: e.x, y: e.y, value: e.elite ? 4 : 1 });
      e.dead = true;
      continue;
    }
    updateEnemy(s, e, dt);
  }
  s.enemies = s.enemies.filter((e) => !e.dead);
  updateHostileBullets(s, dt);
  // Lethal combat damage wins over any relay healing, upgrade, or boss transition.
  if (s.hp <= 0) {
    s.hp = 0;
    s.mode = 'dead';
    s.keys.clear(); s.stick = { x: 0, y: 0 };
    return;
  }
  for (const g of s.gems) {
    const d = Math.hypot(g.x - s.x, g.y - s.y);
    if (d < 135) {
      g.x += (s.x - g.x) * dt * 8;
      g.y += (s.y - g.y) * dt * 8;
    }
    if (d < 24) {
      s.xp += g.value;
      g.dead = true;
    }
  }
  s.gems = s.gems.filter((g) => !g.dead).slice(-250);
  for (const n of s.nodes) {
    if (n.p < 1 && ((s.x - n.x) / RELAY_RADIUS.x) ** 2 + ((s.y - n.y) / RELAY_RADIUS.y) ** 2 <= 1) {
      n.p = Math.min(1, n.p + dt / 8);
      if (n.p === 1) {
        s.hp = Math.min(s.maxHp, s.hp + 15);
        s.notice = "중계기 연결 완료 · 체력 +15";
        s.noticeTime = 3;
        cue(s, 'relay');
      }
    }
  }
  s.fx = s.fx.filter((f) => (f.life -= dt) > 0);
  if (s.nodes.every((n) => n.p >= 1)) {
    if (s.sector < 2 || s.bossDefeated) {
      s.mode = s.sector === 2 ? 'won' : 'sector';
      s.keys.clear(); s.stick = { x: 0, y: 0 };
      cue(s, s.mode === 'won' ? 'victory' : 'relay');
      return;
    }
    if (!s.bossSpawned) {
      s.bossSpawned = true;
      s.enemies = [createEnemy(s, random, 'boss')];
      s.hostileBullets = []; s.bullets = [];
      s.weaponZones = []; s.weaponFx = []; s.weaponTimers = {};
      s.notice = '격리망 최종 방어 · 집행관 NULL WARDEN을 처치하세요.';
      s.noticeTime = 6;
      cue(s, 'warning');
    }
  }
  if (s.xp >= s.nextXp) {
    s.xp -= s.nextXp;
    s.level++;
    s.nextXp = Math.round(s.nextXp * 1.3);
    s.choices = rollUpgrades(s, random);
    s.mode = "upgrade";
    s.keys.clear();
    s.stick = { x: 0, y: 0 };
  }
}
export function nextSector(s) {
  s.sector++;
  s.sectorTime = 0;
  s.enemies = [];
  s.bullets = [];
  s.hostileBullets = [];
  s.weaponTimers = {};
  s.weaponZones = [];
  s.weaponFx = [];
  s.bossSpawned = false;
  s.bossDefeated = false;
  s.fx = [];
  s.sounds = [];
  s.gems = [];
  s.x = SPAWN.x;
  s.y = SPAWN.y;
  s.stick = { x: 0, y: 0 };
  s.keys.clear();
  s.nodes.forEach((n) => (n.p = 0));
  s.hp = Math.min(s.maxHp, s.hp + 35);
  s.heat = 100;
  s.mode = "playing";
  s.notice = s.sector === 2 ? '최종 구역 · 중계기 3개 연결 후 집행관을 처치하세요.' : '새 구역 연결 · 중계기 3개를 확보하세요.';
  s.noticeTime = 5;
}

export function render(ctx, s, images, w, h, ambientTime = 0) {
  ctx.clearRect(0, 0, w, h);
  const scale = Math.max(w / 1440, h / 1024),
    vw = w / scale,
    vh = h / scale,
    cx = clamp(s.x - vw / 2, 0, WORLD.width - vw),
    cy = clamp(s.y - vh / 2, 0, WORLD.height - vh);
  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(-cx, -cy);
  const bg =
    s.sector === 1
      ? images.terminal
      : s.sector === 2
        ? images.arcology
        : images.bg;
  if (bg.complete && bg.naturalWidth) {
    if (s.mode === "menu") {
      const cover = Math.max(vw / bg.naturalWidth, vh / bg.naturalHeight);
      const bw = bg.naturalWidth * cover, bh = bg.naturalHeight * cover;
      ctx.drawImage(bg, cx + (vw - bw) / 2, cy + (vh - bh) / 2, bw, bh);
    }
    else for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
      ctx.save();
      ctx.translate(col * 1440 + (col % 2 ? 1440 : 0), row * 1024 + (row % 2 ? 1024 : 0));
      ctx.scale(col % 2 ? -1 : 1, row % 2 ? -1 : 1);
      ctx.drawImage(bg, 0, 0, 1440, 1024);
      ctx.restore();
    }
  }
  ctx.fillStyle = "rgba(0,8,15,.22)";
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  const rainTime = s.mode === "menu" ? ambientTime : s.time;
  for (let i = 0; i < 65; i++) {
    const x = cx + (i * 193 + rainTime * 55) % vw,
      y = cy + (i * 97 + rainTime * 620) % vh;
    ctx.strokeStyle = "rgba(160,215,235,.15)";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 5, y + 20);
    ctx.stroke();
  }
  if (s.mode === "menu") {
    ctx.restore();
    return;
  }
  for (const [i, n] of s.nodes.entries()) {
    ctx.save();
    ctx.translate(n.x, n.y);
    ctx.strokeStyle = n.p >= 1 ? "#6fffc1" : "#5de8f7";
    ctx.fillStyle = n.p >= 1 ? "rgba(42,255,168,.09)" : "rgba(65,200,244,.07)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, 0, RELAY_RADIUS.x, RELAY_RADIUS.y, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(
      0,
      0,
      RELAY_RADIUS.x,
      RELAY_RADIUS.y,
      0,
      -Math.PI / 2,
      -Math.PI / 2 + Math.PI * 2 * n.p,
    );
    ctx.stroke();
    ctx.fillStyle = "#b7faff";
    ctx.font = "14px monospace";
    ctx.textAlign = "center";
    ctx.fillText(n.p >= 1 ? "LINKED" : `RELAY 0${i + 1}`, 0, -60);
    ctx.font = "12px monospace";
    ctx.fillText(`${Math.floor(n.p * 100)}%`, 0, 5);
    ctx.restore();
  }
  for (const g of s.gems) {
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.shadowColor = "#5bf5ff";
    ctx.shadowBlur = 12;
    ctx.strokeStyle = "#b4ffff";
    ctx.fillStyle = "#159ec0";
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(5, 0);
    ctx.lineTo(0, 8);
    ctx.lineTo(-5, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  renderWeapons(ctx, s);
  renderThreats(ctx, s);
  const units = [
    ...s.enemies.map((e) => ({ ...e, enemy: true })),
    { x: s.x, y: s.y, player: true },
  ].sort((a, b) => a.y - b.y);
  for (const e of units) {
    const img = e.player ? images.player : images.enemy;
    const size = e.player ? 94 : e.type === 'boss' ? 164 : e.elite ? 100 : 74;
    ctx.save();
    ctx.translate(e.x, e.y);
    if (e.enemy && e.type && e.type !== 'soldier') {
      const style = ENEMY_STYLE[e.type];
      ctx.strokeStyle = style.color;
      ctx.lineWidth = e.type === 'boss' ? 3 : 1.5;
      ctx.beginPath(); ctx.ellipse(0, 12, e.type === 'boss' ? 53 : 27, e.type === 'boss' ? 28 : 15, 0, 0, Math.PI * 2); ctx.stroke();
    }
    if (e.player) {
      ctx.strokeStyle = "#66efff";
      ctx.shadowColor = "#28dfff";
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 14, 29, 16, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      if (s.invuln > 0 && Math.floor(s.time * 16) % 2) ctx.globalAlpha = 0.55;
    }
    ctx.save();
    if (e.enemy && e.hit > 0) ctx.filter = 'brightness(1.8)';
    if (Math.cos(e.player ? s.face : e.face) < 0) ctx.scale(-1, 1);
    const enemyRow={charger:[0,.222],gunner:[.222,.46],bomber:[.46,.69],boss:[.69,1]}[e.type];
    if(e.enemy && enemyRow && images.enemyTypes?.complete && images.enemyTypes.naturalWidth) {
      const atlas=images.enemyTypes, fw=atlas.naturalWidth/4;
      const sy=atlas.naturalHeight*enemyRow[0], fh=atlas.naturalHeight*(enemyRow[1]-enemyRow[0]);
      const frame=Math.floor(e.walk||0)%4;
      const height=size*.95,width=height*fw/fh;
      ctx.drawImage(atlas,frame*fw,sy,fw,fh,-width/2,-height*.85,width,height);
    } else if (images.walkAtlas) {
      const atlas = images.walkAtlas, fw = atlas.width / 4, fh = atlas.height / 2;
      const frame = Math.floor(e.player ? s.walk : e.walk) % 4;
      ctx.drawImage(atlas, frame * fw, e.player ? 0 : fh, fw, fh,
        -size * .375, -size * .78, size * .75, size);
    } else if (img.complete && img.naturalWidth) ctx.drawImage(img, -size / 2, -size * .72, size, size);
    ctx.restore();
    if (e.enemy) {
      ctx.fillStyle = "#421f2a";
      ctx.fillRect(-19, -size * 0.7, 38, 3);
      ctx.fillStyle = e.elite ? "#ffd165" : "#ff4b66";
      ctx.fillRect(-19, -size * 0.7, (38 * e.hp) / e.maxHp, 3);
    }
    ctx.restore();
  }
  renderBallistics(ctx, s);
  for (const f of s.fx) {
    const p=1-f.life/f.max;
    splash(ctx,f.x,f.y,f.type==='pulse'||f.type==='blast'?f.r:34,p,
      f.type==='hurt'||f.type==='blast'?'#ff668c':'#7af4ff');
  }
  ctx.globalAlpha = 1;
  for (const [i, n] of s.nodes.entries()) {
    if (n.p < 1 && (n.x < cx + 45 || n.x > cx + vw - 45 || n.y < cy + 110 || n.y > cy + vh - 150)) {
      const x = clamp(n.x, cx + 26, cx + vw - 26),
        y = clamp(n.y, cy + 120, cy + vh - 160);
      ctx.fillStyle = "#9cf8ff";
      ctx.font = "bold 17px monospace";
      ctx.textAlign = "center";
      ctx.fillText(n.y < cy + 110 ? "↑" : n.y > cy + vh - 150 ? "↓" : n.x < cx ? "←" : "→", x, y);
      ctx.font = "12px monospace";
      ctx.fillText(`0${i + 1}`, x, y + 17);
    }
  }
  const boss = s.enemies.find(e => e.type === 'boss' && e.hp > 0);
  if (boss && (boss.x < cx + 60 || boss.x > cx + vw - 60 || boss.y < cy + 160 || boss.y > cy + vh - 150)) {
    const angle = Math.atan2(boss.y - s.y, boss.x - s.x);
    const arrow = ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'][(Math.round(angle / (Math.PI / 4)) + 8) % 8];
    ctx.fillStyle = '#ffb9d4'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`집행관 ${arrow}`, clamp(boss.x, cx + 60, cx + vw - 60), clamp(boss.y, cy + 165, cy + vh - 160));
  }
  ctx.restore();
  if (s.fx.some(f => f.type === 'hurt')) {
    ctx.fillStyle = 'rgba(255,40,85,.07)'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,80,110,.45)'; ctx.lineWidth = 6; ctx.strokeRect(3, 3, w - 6, h - 6);
  }
}

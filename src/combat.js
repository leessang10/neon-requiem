import { attackStamp } from './attack-art.js';
export const RELAY_RADIUS = { x: 72, y: 48 };
export const ENEMY_STYLE = {
  soldier: { color: '#ff667d', label: '' },
  charger: { color: '#ffba66', label: '돌진' },
  gunner: { color: '#df94ff', label: '사격' },
  bomber: { color: '#c4f875', label: '자폭' },
  boss: { color: '#ff6eac', label: '집행관 · NULL WARDEN' },
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function cue(s, name) {
  // The UI drains this queue each frame, including while muted.
  if (s.sounds.length < 32) s.sounds.push(name);
}

export function hurtPlayer(s, damage) {
  if (s.invuln > 0 || s.hp <= 0) return;
  s.hp = Math.max(0, s.hp - damage);
  s.invuln = .65;
  s.fx.push({ x: s.x, y: s.y, life: .3, max: .3, type: 'hurt' });
  cue(s, 'hurt');
}

export function createEnemy(s, random = Math.random, type) {
  const a = random() * Math.PI * 2;
  const roll = random();
  type ??= s.time < 10 ? 'soldier' : roll < .55 ? 'soldier' : roll < .70 ? 'charger' : roll < .88 ? 'gunner' : 'bomber';
  const boss = type === 'boss';
  const elite = boss || (type === 'soldier' && random() < .08 + s.sector * .04);
  const hp = boss ? 2200 : (elite ? 100 : type === 'bomber' ? 32 : 42) + s.sector * 22 + s.time * .13;
  const radius = boss ? 460 : 820;
  return {
    type, elite, hp, maxHp: hp,
    x: clamp(s.x + Math.cos(a) * radius, 60, 4260),
    y: clamp(s.y + Math.sin(a) * radius, 60, 3012),
    speed: boss ? 85 : (type === 'bomber' ? 85 : elite ? 39 : 55) + random() * 20 + s.sector * 12,
    walk: 0, face: a + Math.PI, hit: 0, phase: 'chase', cooldown: boss ? 1.8 : .8,
    attackIndex: 0, enraged: false,
  };
}

function move(e, dx, dy, speed, dt) {
  const x = e.x, y = e.y;
  e.x = clamp(e.x + dx * speed * dt, 40, 4280);
  e.y = clamp(e.y + dy * speed * dt, 40, 3032);
  e.walk = (e.walk || 0) + Math.hypot(e.x - x, e.y - y) / 16;
}

function fire(s, e, count) {
  for (let i = 0; i < count; i++) {
    const a = e.aim + (i - (count - 1) / 2) * .19;
    s.hostileBullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 250, vy: Math.sin(a) * 250,
      damage: e.type === 'boss' ? 18 : 12, life: 3.2 });
  }
  cue(s, 'enemy-shot');
}

function blast(s, x, y, r, damage) {
  s.fx.push({ x, y, r, life: .45, max: .45, type: 'blast' });
  if (Math.hypot(s.x - x, s.y - y) <= r) hurtPlayer(s, damage);
  cue(s, 'blast');
}

export function updateEnemy(s, e, dt) {
  if (e.stun > 0) { e.stun = Math.max(0, e.stun - dt); return; }
  const type = e.type || 'soldier';
  const distance = Math.hypot(s.x - e.x, s.y - e.y);
  const a = Math.atan2(s.y - e.y, s.x - e.x);
  e.cooldown = Math.max(0, (e.cooldown || 0) - dt);
  e.hit = Math.max(0, (e.hit || 0) - dt);
  e.face = a;
  if (type === 'boss' && !e.enraged && e.hp <= e.maxHp / 2) {
    e.enraged = true;
    s.notice = '집행관 과부하 · 탄막과 공격 주기가 강화됩니다.';
    s.noticeTime = 4;
    cue(s, 'warning');
  }

  if (e.phase === 'windup') {
    e.timer -= dt;
    e.face = e.aim;
    if (e.timer <= 0) {
      if (type === 'charger') {
        e.phase = 'charge'; e.timer = .42; cue(s, 'dash');
      } else if (type === 'bomber') {
        blast(s, e.x, e.y, 120, 26); e.detonated = true; e.dead = true;
      } else {
        if (type === 'boss' && e.attack === 'blast') blast(s, e.targetX, e.targetY, 115, 28);
        else fire(s, e, type === 'boss' ? e.enraged ? 9 : 5 : 1);
        e.attackIndex = (e.attackIndex || 0) + 1;
        e.phase = 'chase'; e.cooldown = type === 'boss' ? e.enraged ? 1.3 : 2.1 : 2.2;
      }
    }
  } else if (e.phase === 'charge') {
    // A swept collision test prevents tunnelling through the player on slow frames.
    const x = e.x, y = e.y;
    move(e, Math.cos(e.aim), Math.sin(e.aim), 650, Math.min(dt, e.timer));
    if (segmentDistance(s.x, s.y, x, y, e.x, e.y) < 30) hurtPlayer(s, 18);
    e.face = e.aim; e.timer -= dt;
    if (e.timer <= 0) { e.phase = 'chase'; e.cooldown = 2.4; }
  } else {
    const inRange = type === 'charger' ? distance < 340 : type === 'bomber' ? distance < 100 : distance < 580;
    if (type !== 'soldier' && inRange && e.cooldown <= 0) {
      e.phase = 'windup'; e.aim = a;
      e.attack = type === 'boss' && (e.attackIndex || 0) % 2 ? 'blast' : 'shot';
      e.targetX = s.x; e.targetY = s.y;
      e.timer = type === 'charger' ? .65 : type === 'bomber' ? 1.1 : type === 'boss' ? 1.05 : .8;
      e.windupDuration = e.timer;
      if (type === 'bomber' || type === 'boss') cue(s, 'warning');
    } else {
      const ranged = type === 'gunner' || type === 'boss';
      const direction = ranged ? distance < 210 ? -1 : distance > 330 ? 1 : 0 : 1;
      move(e, Math.cos(a) * direction, Math.sin(a) * direction, e.speed, dt);
    }
  }
  if (!e.dead && type !== 'bomber' && Math.hypot(s.x - e.x, s.y - e.y) < (type === 'boss' ? 44 : 30)) {
    hurtPlayer(s, type === 'boss' ? 24 : e.elite ? 18 : 9);
  }
}

function segmentDistance(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}

export function updateHostileBullets(s, dt) {
  for (const b of s.hostileBullets) {
    const x = b.x, y = b.y;
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (b.life > 0 && segmentDistance(s.x, s.y, x, y, b.x, b.y) < 21) {
      hurtPlayer(s, b.damage); b.life = 0;
    }
  }
  s.hostileBullets = s.hostileBullets.filter(b => b.life > 0);
}

export function renderThreats(ctx, s) {
  for (const e of s.enemies) {
    if (e.phase !== 'windup' && e.phase !== 'charge') continue;
    ctx.save();
    const color = ENEMY_STYLE[e.type]?.color || '#ff667d';
    ctx.strokeStyle = color; ctx.fillStyle = color;
    if (e.type === 'bomber' || (e.type === 'boss' && e.attack === 'blast')) {
      const x = e.type === 'bomber' ? e.x : e.targetX, y = e.type === 'bomber' ? e.y : e.targetY;
      const r = e.type === 'bomber' ? 120 : 115;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.globalAlpha = .12; ctx.fill(); ctx.globalAlpha = .9; ctx.lineWidth = 2; ctx.stroke();
      attackStamp(ctx,'ring',color,x,y,r*(1 - Math.max(0, e.timer)/e.windupDuration),s.time,.55);
      attackStamp(ctx,'burst',color,x,y,35,0,.35);
    } else {
      const count = e.type === 'boss' ? e.enraged ? 9 : 5 : 1;
      for (let i = 0; i < count; i++) {
        const a = e.aim + (i - (count - 1) / 2) * .19;
        const length = e.type === 'charger' ? 273 : 580;
        ctx.save();ctx.translate(e.x,e.y);ctx.rotate(a);
        const width=e.type==='charger'?30:9;
        ctx.globalAlpha=.13;ctx.beginPath();ctx.moveTo(0,-width);ctx.lineTo(length,-width*.25);ctx.lineTo(length, width*.25);ctx.lineTo(0,width);ctx.closePath();ctx.fill();
        ctx.globalAlpha=.5;
        for(let j=1;j<=5;j++) {
          const x=length*j/6;
          ctx.beginPath();ctx.moveTo(x-7,-width*.5);ctx.lineTo(x+3,0);ctx.lineTo(x-7,width*.5);ctx.lineWidth=2;ctx.stroke();
        }
        ctx.globalAlpha=1;
        attackStamp(ctx,'burst',color,0,0,e.phase==='charge'?55:28,0,.65);
        if(e.phase==='charge') attackStamp(ctx,'bolt',color,-48,0,85,0,.7);
        ctx.restore();
      }
    }
    ctx.restore();
  }
  for (const b of s.hostileBullets) {
    attackStamp(ctx,'bolt','#ff628e',b.x,b.y,24,Math.atan2(b.vy,b.vx),1,.85);
    attackStamp(ctx,'burst','#ff9cbd',b.x,b.y,12,0,.8);
  }
}

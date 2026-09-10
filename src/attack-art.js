// Transparent raster stamps are baked once, then animated with cheap canvas blits.
// Stable geometry keeps paused effects still and never consumes gameplay randomness.
const stamps = new Map();
const TAU = Math.PI * 2;
const noise = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

function bake(kind, color) {
  if (typeof document === 'undefined') return null;
  const key = `${kind}:${color}`;
  if (stamps.has(key)) return stamps.get(key);
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 384;
  const c = canvas.getContext('2d'); c.translate(192, 192);
  const glow = (r, intensity = .7) => {
    const g = c.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, '#ffffff'); g.addColorStop(.12, color);
    g.addColorStop(.42, `${color}90`); g.addColorStop(1, `${color}00`);
    c.globalAlpha = intensity; c.fillStyle = g; c.fillRect(-r, -r, r * 2, r * 2); c.globalAlpha = 1;
  };
  c.fillStyle = color;
  if (kind === 'slash') {
    for (let layer = 0; layer < 7; layer++) {
      const r = 155 - layer * 6;
      c.globalAlpha = .12 + layer * .08;
      c.beginPath(); c.arc(0, 0, r, -.9, 2.6);
      c.bezierCurveTo(-r * .6, r * .1, r * .5, r * .8, Math.cos(-.9) * r, Math.sin(-.9) * r);
      c.fill();
    }
    c.globalAlpha = 1; c.strokeStyle = '#e7ffff'; c.lineWidth = 3;
    c.beginPath(); c.arc(0, 0, 156, -.8, 2.1); c.stroke();
  } else if (kind === 'ring' || kind === 'vortex') {
    const g = c.createRadialGradient(0, 0, 40, 0, 0, 181);
    g.addColorStop(0, `${color}00`); g.addColorStop(.55, `${color}08`);
    g.addColorStop(.78, `${color}65`); g.addColorStop(.87, color); g.addColorStop(1, `${color}00`);
    c.fillStyle = g; c.fillRect(-184, -184, 368, 368);
    c.strokeStyle = color;
    for (let i = 0; i < 11; i++) {
      c.lineWidth = 2 + noise(i) * 7; c.globalAlpha = .3 + noise(i + 5) * .6;
      c.beginPath(); c.arc(0, 0, kind === 'vortex' ? 28 + i * 12 : 148 + noise(i) * 15, i * 2.4, i * 2.4 + .35 + noise(i + 8)); c.stroke();
    }
    if (kind === 'vortex') { c.globalAlpha = 1; c.fillStyle = '#080318'; c.beginPath(); c.arc(0, 0, 36, 0, TAU); c.fill(); }
  } else if (kind === 'bolt') {
    c.save(); c.scale(1, .22); glow(176); c.restore();
    for (let i = 0; i < 9; i++) {
      const y = (noise(i) - .5) * 38;
      c.fillStyle = i % 3 ? color : '#ffffff'; c.globalAlpha = .4 + noise(i) * .5;
      c.beginPath(); c.moveTo(140, y); c.lineTo(-140 + noise(i + 5) * 140, y - 4); c.lineTo(-80, y + 7); c.closePath(); c.fill();
    }
  } else {
    glow(175, .85);
    for (let i = 0; i < 42; i++) {
      const a = i * 2.399, r = 32 + noise(i) * 135;
      c.save(); c.rotate(a); c.globalAlpha = .3 + noise(i + 2) * .7;
      c.fillStyle = i % 4 ? color : '#fff7ef';
      c.beginPath(); c.moveTo(r, 0); c.lineTo(r - 22 - noise(i + 4) * 65, -2 - noise(i) * 8); c.lineTo(r - 12, 3 + noise(i + 1) * 7); c.closePath(); c.fill(); c.restore();
    }
  }
  c.globalAlpha = 1;
  // Broken glowing fragments around the silhouette give each stamp a splash edge.
  for (let i = 0; i < 24; i++) {
    const a = i * 2.399, r = 120 + noise(i + 18) * 57;
    c.save(); c.rotate(a); c.fillStyle = i % 3 ? color : '#eaffff';
    c.globalAlpha = .25 + noise(i + 1) * .6;
    if (kind !== 'bolt') c.fillRect(r, -2, 2 + noise(i) * 10, 2 + noise(i + 5) * 4);
    c.restore();
  }
  stamps.set(key, canvas); return canvas;
}

export function attackStamp(ctx, kind, color, x, y, radius, angle = 0, alpha = 1, aspect = 1) {
  const sprite = bake(kind, color); if (!sprite || radius <= 0 || alpha <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.globalAlpha *= alpha;
  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(sprite, -radius, -radius * aspect, radius * 2, radius * 2 * aspect);
  ctx.restore();
}

export function splash(ctx, x, y, r, progress, color) {
  const p = Math.max(0, Math.min(1, progress));
  attackStamp(ctx, 'burst', color, x, y, r * (.3 + .85 * Math.sqrt(p)), p * .2, (1 - p) * .9);
  attackStamp(ctx, 'ring', color, x, y, r * (.3 + .75 * p), -p * .2, (1 - p) * .8);
}

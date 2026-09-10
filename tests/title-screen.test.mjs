import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, render } from '../src/game.js';

test('title backdrop covers portrait and landscape without distortion; rain animates without advancing gameplay', () => {
  const draws = [], drops = [];
  const ctx = new Proxy({}, {
    get: (_, key) => key === 'drawImage' ? (...args) => draws.push(args)
      : key === 'moveTo' ? (...args) => drops.push(args) : () => {},
    set: () => true,
  });
  const bg = { complete: true, naturalWidth: 1536, naturalHeight: 1024 };
  const state = createState();
  for (const [width, height] of [[390, 844], [1440, 900]]) {
    draws.length = 0; drops.length = 0;
    render(ctx, state, { bg }, width, height, 0);
    const [, , , bw, bh] = draws[0];
    assert.equal(bw / bh, 1.5);
    const scale = Math.max(width / 1440, height / 1024);
    assert.ok(bw * scale >= width && bh * scale >= height);
    assert.equal(drops.length, 65);
    const first = drops[0]; drops.length = 0;
    render(ctx, state, { bg }, width, height, 1);
    assert.notDeepEqual(drops[0], first);
    assert.equal(state.time, 0);
    assert.equal(state.mode, 'menu');
  }
});

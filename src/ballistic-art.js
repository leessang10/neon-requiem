// Authored RGBA artwork: preserve metal, smoke and the original transparent alpha.
let atlas;
export function setBallisticAtlas(image) { atlas = image; }
export function ballisticStamp(ctx, row, frame, x, y, size, angle = 0) {
  if (!atlas) return;
  const w = atlas.naturalWidth || atlas.width, h = atlas.naturalHeight || atlas.height;
  const col = Math.max(0, Math.min(3, Math.floor(frame)));
  // Rifle muzzle flash extends past the nominal second-cell edge in the authored sheet.
  const bounds=row===1?[0,313/1254,662/1254,955/1254,1]:[0,.25,.5,.75,1];
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  if (row < 2 && Math.cos(angle) < 0) ctx.scale(1, -1);
  ctx.drawImage(atlas, bounds[col]*w, row*h/4, (bounds[col+1]-bounds[col])*w, h/4, -size/2, -size/2, size, size);
  ctx.restore();
}
export function dronePosition(s, i) {
  const a=s.time*2+(i+1)*2;
  return {x:s.x+Math.cos(a)*60,y:s.y+Math.sin(a)*40-20};
}
export function renderBallistics(ctx, s) {
  for(let i=0;i<s.drones;i++) {
    const pos=dronePosition(s,i),shot=s.ballisticShots?.[`drone${i}`];
    ballisticStamp(ctx,0,(s.time*10+i)%4,pos.x,pos.y,58,shot?.angle??0);
  }
  if(s.weapons.rifle) {
    const shot=s.ballisticShots?.rifle,age=shot?s.time-shot.time:Infinity;
    const frame=age<.06?1:age<.12?2:age<.19?3:0;
    ballisticStamp(ctx,1,frame,s.x,s.y-20,62,shot?.angle??s.face);
  }
  for(const b of s.bullets) {
    ballisticStamp(ctx,b.drone?2:3,Math.floor((.7-b.life)*20)%4,b.x,b.y,b.drone?48:42,Math.atan2(b.vy,b.vx));
  }
}

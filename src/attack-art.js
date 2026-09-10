// Authored four-frame VFX atlas, matching the game's painted character sprites.
const ROWS={slash:0,ring:1,burst:2,vortex:3,bolt:4};
// Authored sheet gutters; explicit bounds prevent sparks from adjacent frames.
const COLS=[0,245/1122,550/1122,845/1122,1];
const BANDS=[0,300/1402,570/1402,860/1402,1165/1402,1];
let atlas,clock=0;
const variants=new Map();
export function setAttackTime(time){clock=time;}
export function setAttackAtlas(image){
  if(atlas?.source===image)return;
  variants.clear();
  if(typeof document==='undefined'){atlas={source:image,sheet:image};return;}
  const sheet=document.createElement('canvas');sheet.width=image.naturalWidth;sheet.height=image.naturalHeight;
  const c=sheet.getContext('2d',{willReadFrequently:true});c.drawImage(image,0,0);
  // The exported source includes a white matte. Remove connected neutral
  // background once during loading, just as for the character walk atlas.
  const pixels=c.getImageData(0,0,sheet.width,sheet.height),d=pixels.data;
  const w=sheet.width,h=sheet.height,seen=new Uint8Array(w*h),queue=new Int32Array(w*h);
  let head=0,tail=0;
  const add=i=>{if(i<0||i>=w*h||seen[i])return;seen[i]=1;
    const r=d[i*4],g=d[i*4+1],b=d[i*4+2];
    if(Math.min(r,g,b)>165&&Math.max(r,g,b)-Math.min(r,g,b)<22)queue[tail++]=i;
  };
  for(let x=0;x<w;x++){add(x);add((h-1)*w+x);}
  for(let y=0;y<h;y++){add(y*w);add(y*w+w-1);}
  // Open centers of closed shockwaves also need background removal.
  for(let row=0;row<5;row++)for(let col=0;col<4;col++)add(Math.floor((BANDS[row]+BANDS[row+1])*h/2)*w+Math.floor((COLS[col]+COLS[col+1])*w/2));
  while(head<tail){const i=queue[head++];d[i*4+3]=0;if(i%w)add(i-1);if(i%w<w-1)add(i+1);add(i-w);add(i+w);}
  c.putImageData(pixels,0,0);atlas={source:image,sheet};
}
function spriteVariant(kind,color){
  const warm=['#ff628e','#ff9cbd','#ff6eac','#ff667d'].includes(color)?'red'
    :['#ffcf87','#ffe9b0','#ffe297','#ffba66'].includes(color)?'gold':'base';
  if(kind!=='bolt'||warm==='base'||typeof document==='undefined')return atlas.sheet;
  if(!variants.has(warm)){
    const c=document.createElement('canvas');c.width=atlas.sheet.width;c.height=atlas.sheet.height;
    const ctx=c.getContext('2d');ctx.filter=`hue-rotate(${warm==='red'?135:195}deg)`;ctx.drawImage(atlas.sheet,0,0);variants.set(warm,c);
  }
  return variants.get(warm);
}
export function attackStamp(ctx,kind,color,x,y,radius,angle=0,alpha=1,aspect=1,progress){
  if(!atlas||radius<=0||alpha<=0)return;
  const row=ROWS[kind]??2,frame=progress===undefined?Math.floor(clock*12)%4:Math.min(3,Math.floor(Math.max(0,progress)*4));
  const sprite=spriteVariant(kind,color);
  const sx=COLS[frame]*sprite.width,sy=BANDS[row]*sprite.height;
  const fw=(COLS[frame+1]-COLS[frame])*sprite.width,fh=(BANDS[row+1]-BANDS[row])*sprite.height;
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.globalAlpha*=alpha;
  // Source-over preserves the dark smoke and solid debris instead of bleaching it.
  ctx.drawImage(sprite,sx,sy,fw,fh,-radius,-radius*aspect,radius*2,radius*2*aspect);
  ctx.restore();
}
export function splash(ctx,x,y,r,progress,color){
  const p=Math.max(0,Math.min(1,progress));
  const cold=['#7af4ff','#76baff','#b9b5ff'].includes(color);
  attackStamp(ctx,cold?'ring':'burst',color,x,y,r*(.85+.2*p),0,Math.min(1,(1-p)*3),1,p);
}

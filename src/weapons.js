import { ABILITIES, MAX_ABILITY_LEVEL } from './abilities.js';
import { attackStamp, splash, setAttackTime } from './attack-art.js';
import { cue } from './combat.js';
import { dronePosition } from './ballistic-art.js';

export const WEAPONS = [
  { id:'rifle', name:'스마트 라이플', en:'SMART RIFLE', icon:'crosshair', weapon:true, weight:3, color:'#ffdda6', desc:'가까운 적을 조준하는 고속 자동 사격', damage:18, cooldown:.34, radius:440 },
  { id:'drone', name:'헌터 드론', en:'HUNTER DRONE', icon:'drone', weapon:true, weight:2, color:'#83edff', desc:'독립 사격 드론 · 강화하면 최대 3기', damage:20, cooldown:.44, radius:440 },
  { id:'arc', name:'아크 방전', en:'CHAIN ARC', icon:'lightning', weapon:true, weight:2, color:'#a2b8ff', desc:'무작위 적에게 방전 후 주변 적에게 연쇄 전격', damage:45, cooldown:2.1, radius:350 },
  { id:'wire', name:'모노와이어', en:'MONOWIRE SWEEP', icon:'sword', weapon:true, weight:3, color:'#8cfff3', desc:'플레이어 주변 360°를 주기적으로 베는 근접 공격', damage:58, cooldown:1.4, radius:130 },
  { id:'emp', name:'EMP 노바', en:'EMP NOVA', icon:'waves', weapon:true, weight:3, color:'#76baff', desc:'플레이어 중심 범위 피해 · 적 정지 · 적 탄환 제거', damage:70, cooldown:3.6, radius:200 },
  { id:'gravity', name:'중력 우물', en:'GRAVITY WELL', icon:'spiral', weapon:true, weight:1, color:'#c1a0ff', desc:'무작위 적 위치에 2.6초 중력장 · 흡인과 지속 피해', damage:32, cooldown:5, radius:150 },
  { id:'orbital', name:'궤도 강습', en:'ORBITAL JACKPOT', icon:'planet', weapon:true, weight:1, color:'#ffe297', desc:'무작위 적 위치 폭격 · 20% 확률로 피해 2.5배·범위 1.4배', damage:155, cooldown:5.8, radius:90 },
];
const pick = (array, random) => array[Math.min(array.length - 1, Math.floor(Math.max(0, random()) * array.length))];
function weightedPick(array, random) {
  let roll = Math.min(.999999, Math.max(0, random())) * array.reduce((sum,w)=>sum+w.weight,0);
  return array.find(w => (roll -= w.weight) < 0) || array.at(-1);
}

export function weaponStats(s, id, level = s.weapons[id] || 1) {
  const w = WEAPONS.find(w=>w.id===id), tier = Math.min(6, level - 1);
  return { damage:w.damage * (1 + .4 * (level - 1)) * (s.damage / 18),
    cooldown:w.cooldown / (1 + .08 * tier), radius:w.radius + (['wire','emp','gravity','orbital'].includes(id) ? tier * 10 : 0),
    count:id==='drone' ? Math.min(3,level) : id==='arc' ? Math.min(7,2+level) : id==='orbital' ? Math.min(4,1+level) : 1 };
}

export function equipWeapon(s, id) {
  if (!WEAPONS.some(w=>w.id===id)) return;
  s.weapons[id] = (s.weapons[id] || 0) + 1;
  s.weaponTimers[id] = 0;
  if (id==='drone') s.drones = weaponStats(s,id).count;
}

export function grantStarterWeapon(s, random = Math.random) {
  if (Object.keys(s.weapons).length) return;
  const w = weightedPick(WEAPONS,random); equipWeapon(s,w.id);
  s.notice = `시작 무기 · ${w.name} / 중계기 3개를 연결하세요.`; s.noticeTime = 8;
  return w;
}

export function rollUpgrades(s, random = Math.random) {
  const owned=WEAPONS.filter(w=>s.weapons[w.id]), fresh=WEAPONS.filter(w=>!s.weapons[w.id]);
  const choices=[];
  if (owned.length) choices.push(weightedPick(owned,random));
  if (fresh.length) choices.push(weightedPick(fresh,random));
  const pool=[...WEAPONS,...ABILITIES.filter(a=>(s.abilities?.[a.id]||1)<MAX_ABILITY_LEVEL)];
  while(choices.length<3) choices.push(weightedPick(pool.filter(w=>!choices.includes(w)),random));
  // Preserve a new weapon and owned weapon choice where possible; the remaining slot can improve an ability.
  for(let i=choices.length-1;i>0;i--) {
    const j=Math.min(i,Math.floor(Math.max(0,random())*(i+1)));
    [choices[i],choices[j]]=[choices[j],choices[i]];
  }
  return choices;
}

export function weaponSummary(s,id,level=s.weapons[id]||1) {
  const v=weaponStats(s,id,level);
  const effect=id==='gravity' ? `초당 ${Math.round(v.damage)} 피해` : `${Math.round(v.damage)} 피해`;
  const count=['drone','arc','orbital'].includes(id) ? ` · ${v.count}${id==='drone'?'기':id==='arc'?'명':'곳'}` : '';
  return `${effect} · ${v.cooldown.toFixed(1)}초${count}`;
}

function hit(e, damage) { if(e.hp>0) { e.hp-=damage; e.hit=.12; } }
function inRadius(e,x,y,r) { return e.hp>0 && Math.hypot(e.x-x,e.y-y)<=r; }
function fx(s,kind,x,y,r,life=.5,extra={}) { s.weaponFx.push({kind,x,y,r,life,max:life,...extra}); }
function bullet(s,x,y,target,damage,drone) {
  const a=Math.atan2(target.y-y,target.x-x);
  s.bullets.push({x,y,vx:Math.cos(a)*790,vy:Math.sin(a)*790,life:.7,damage,drone});
}

export function stepWeapons(s,dt,random=Math.random) {
  if(s.mode!=='playing') return;
  s.weaponFx=s.weaponFx.filter(f=>(f.life-=dt)>0);
  for(const z of s.weaponZones) {
    const elapsed=Math.min(dt,Math.max(0,z.life)); z.life-=dt;
    if(z.kind==='gravity') {
      for(const e of s.enemies) if(inRadius(e,z.x,z.y,z.r)) {
        hit(e,z.damage*elapsed);
        const d=Math.hypot(z.x-e.x,z.y-e.y)||1;
        const pull=Math.min(d,110*elapsed*(e.type==='boss'?.15:1));
        e.x+=(z.x-e.x)/d*pull; e.y+=(z.y-e.y)/d*pull;
      }
    } else if(z.life<=0) {
      for(const e of s.enemies) if(inRadius(e,z.x,z.y,z.r)) hit(e,z.damage);
      fx(s,'orbital',z.x,z.y,z.r,.6,{boosted:z.boosted}); cue(s,z.boosted?'jackpot':'orbital');
    }
  }
  s.weaponZones=s.weaponZones.filter(z=>z.life>0);
  for(const w of WEAPONS) {
    if(!s.weapons[w.id]) continue;
    s.weaponTimers[w.id]=(s.weaponTimers[w.id]||0)-dt;
    if(s.weaponTimers[w.id]>0) continue;
    const v=weaponStats(s,w.id), targets=s.enemies.filter(e=>inRadius(e,s.x,s.y,['gravity','orbital'].includes(w.id)?600:v.radius));
    if(!targets.length && !['wire','emp'].includes(w.id)) { s.weaponTimers[w.id]=0; continue; }
    s.weaponTimers[w.id]=v.cooldown;
    if(w.id==='rifle'||w.id==='drone') {
      for(let i=0;i<v.count;i++) {
        const drone=w.id==='drone';
        const {x,y}=drone?dronePosition(s,i):{x:s.x,y:s.y};
        const target=targets.reduce((a,b)=>Math.hypot(a.x-x,a.y-y)<Math.hypot(b.x-x,b.y-y)?a:b);
        bullet(s,x,y,target,v.damage,drone);
        s.ballisticShots??={};
        s.ballisticShots[drone?`drone${i}`:'rifle']={angle:Math.atan2(target.y-y,target.x-x),time:s.time};
      }
      cue(s,'shot');
    } else if(w.id==='wire'||w.id==='emp') {
      for(const e of targets) {
        hit(e,v.damage);
        if(w.id==='emp') e.stun=Math.max(e.stun||0,e.type==='boss'?.2:.9);
      }
      if(w.id==='emp') s.hostileBullets=s.hostileBullets.filter(b=>Math.hypot(b.x-s.x,b.y-s.y)>v.radius);
      fx(s,w.id,s.x,s.y,v.radius,w.id==='wire'?.38:.65,{angle:s.face}); cue(s,w.id);
    } else if(w.id==='arc') {
      let target=pick(targets,random); const visited=new Set(), points=[{x:s.x,y:s.y}];
      while(target && visited.size<v.count) {
        visited.add(target); hit(target,v.damage); points.push({x:target.x,y:target.y});
        const from=target;
        target=pick(s.enemies.filter(e=>!visited.has(e)&&inRadius(e,from.x,from.y,190)),random);
      }
      fx(s,'arc',s.x,s.y,0,.28,{points}); cue(s,'arc');
    } else if(w.id==='gravity') {
      const target=pick(targets,random);
      s.weaponZones.push({kind:'gravity',x:target.x,y:target.y,r:v.radius,damage:v.damage,life:2.6,max:2.6}); cue(s,'gravity');
    } else if(w.id==='orbital') {
      const boosted=random()<.2, pool=[...targets];
      for(let i=0;i<v.count&&pool.length;i++) {
        const target=pick(pool,random); pool.splice(pool.indexOf(target),1);
        s.weaponZones.push({kind:'strike',x:target.x,y:target.y,r:v.radius*(boosted?1.4:1),damage:v.damage*(boosted?2.5:1),life:.65,max:.65,boosted});
      }
      cue(s,'lock-on');
    }
  }
}

export function renderWeapons(ctx,s) {
  setAttackTime(s.time);
  for(const z of s.weaponZones) {
    ctx.save(); ctx.translate(z.x,z.y);
    const p=1-z.life/z.max;
    if(z.kind==='gravity') {
      attackStamp(ctx,'vortex','#b18aff',0,0,z.r,s.time*.8,.85);
      for(let i=0;i<8;i++) {
        const a=i*2.4+s.time*2, r=z.r*(1-((s.time*.6+i/8)%1));
        attackStamp(ctx,'bolt','#dac0ff',Math.cos(a)*r,Math.sin(a)*r,14,a+Math.PI/2,.7);
      }
    } else {
      ctx.fillStyle='#ffe297';ctx.globalAlpha=.08+p*.1;
      ctx.beginPath();ctx.arc(0,0,z.r,0,Math.PI*2);ctx.fill();
      ctx.globalAlpha=.7;ctx.strokeStyle='#ffe297';ctx.lineWidth=2;ctx.stroke();
      attackStamp(ctx,'ring','#ffe297',0,0,z.r*(1-p*.7),p,.5);
      ctx.font='bold 11px monospace';ctx.textAlign='center';ctx.fillStyle='#ffe297';ctx.globalAlpha=1;
      ctx.fillText(z.boosted?'JACKPOT ×2.5':'ORBITAL',0,-z.r-12);
    }
    ctx.restore();
  }
  for(const f of s.weaponFx) {
    const p=1-f.life/f.max, fade=Math.min(1,(1-p)*2);
    if(f.kind==='arc') {
      for(let i=1;i<f.points.length;i++) {
        const a=f.points[i-1],b=f.points[i],d=Math.hypot(b.x-a.x,b.y-a.y),angle=Math.atan2(b.y-a.y,b.x-a.x);
        const count=Math.max(2,Math.ceil(d/45));
        for(let j=0;j<count;j++) {
          const t=(j+.5)/count, offset=Math.sin(j*2.3+i)*10;
          attackStamp(ctx,'bolt','#a2b8ff',a.x+(b.x-a.x)*t-Math.sin(angle)*offset,a.y+(b.y-a.y)*t+Math.cos(angle)*offset,d/count*.85,angle+(j%2?.22:-.22),fade);
        }
        splash(ctx,b.x,b.y,48,p,'#b9b5ff');
      }
    } else if(f.kind==='wire') {
      // The authored frames supply the sweep. A lifetime rotation made it spin like a wheel.
      attackStamp(ctx,'slash','#8cfff3',f.x,f.y,f.r*1.08,f.angle||0,fade,1,p);
    } else if(f.kind==='emp') {
      splash(ctx,f.x,f.y,f.r,p,'#76baff');
    } else if(f.kind==='orbital') {
      splash(ctx,f.x,f.y,f.r,p,f.boosted?'#ffd36d':'#ffac68');
      attackStamp(ctx,'bolt','#ffe9b0',f.x,f.y-180,255,Math.PI/2,fade*.7,.24);
      if(f.boosted) {
        ctx.save();ctx.globalAlpha=fade;ctx.fillStyle='#fff0ba';ctx.font='bold 15px monospace';ctx.textAlign='center';
        ctx.fillText('JACKPOT ×2.5',f.x,f.y-f.r-14);ctx.restore();
      }
    }
  }
}

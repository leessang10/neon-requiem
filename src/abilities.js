export const ABILITIES = [
  {id:'dash',name:'위상 회피',en:'PHASE DASH',icon:'dash',ability:true,weight:2,color:'#8cfff3',desc:'재사용 시간 감소 · 회피 무적 시간 증가'},
  {id:'overclock',name:'신경 과부하',en:'NEURAL OVERCLOCK',icon:'lightning',ability:true,weight:2,color:'#ffcc82',desc:'충전 속도 · 충격파 범위 · 피해량 증가'},
];
export const MAX_ABILITY_LEVEL = 6;
export function abilityStats(s,id,level=s.abilities?.[id]||1) {
  const tier=Math.max(0,Math.min(MAX_ABILITY_LEVEL-1,level-1));
  return id==='dash' ? {cooldown:3.2-tier*.3,invuln:.4+tier*.06}
    : {charge:4+tier*.6,radius:430+tier*25,damage:(100+s.damage*2)*(1+tier*.25)};
}
export function abilitySummary(s,id,level) {
  const v=abilityStats(s,id,level);
  return id==='dash' ? `재사용 ${v.cooldown.toFixed(1)}초 · 무적 ${v.invuln.toFixed(2)}초`
    : `${Math.round(v.damage)} 피해 · 범위 ${v.radius} · 충전 ${(100/v.charge).toFixed(1)}초`;
}
export function upgradeAbility(s,id) {
  if(!ABILITIES.some(a=>a.id===id)||(s.abilities[id]||1)>=MAX_ABILITY_LEVEL) return false;
  s.abilities[id]=(s.abilities[id]||1)+1;
  if(id==='dash') s.dash=Math.min(s.dash,abilityStats(s,id).cooldown);
  return true;
}

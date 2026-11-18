import {DISTRICTS,NETWORKS,UNIT_TYPES} from './data.js';
import {NEIGHBORS} from './geography.js';
import {capabilities,alterCell} from './cartels.js';
import {transportCost} from './infrastructure.js';
import {terrainAt} from './scenarios.js';

export const TACTICS={
 deliberate:{name:'Deliberate advance',days:4,cost:7,power:1,damage:1,supply:1,risk:1,escape:1,description:'Balanced pressure with time to establish contact.'},
 cordon:{name:'Cordon and contain',days:5,cost:9,power:.92,damage:1.1,supply:1.1,risk:.7,escape:.55,description:'Adjacent security units close exits. Longer deployment, fewer escapes.'},
 rapid:{name:'Rapid intervention',days:3,cost:8,power:1.16,damage:.9,supply:1.6,risk:1.7,escape:1.2,description:'Fast pressure and heavier supply use. Greater civilian and escape risk.'},
 precision:{name:'Intelligence-led operation',days:5,cost:10,power:1.05,damage:1.2,supply:.8,risk:.35,escape:.8,description:'Requires 60% intelligence. Lower civilian risk and focused pressure.'},
};
const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,n));
export const forcePower=(s,u)=>(UNIT_TYPES[u.type].power+(s.completed.includes('training')&&u.type!=='intel'?8:0))*(s.governor==='ibarra'?1.2:1)*(.6+u.readiness*.004)*(.6+u.supply*.004)*(1-u.fatigue*.003);
export const operatingUnits=o=>o.battle?.units??(o.unit===null?[]:[o.unit]);
export function combatForecast(s,id,network,tactic='deliberate',ids=null){
 const d=s.districts[id],t=TACTICS[tactic];if(!d||!s.networks[network]||!t)return null;
 const here=s.units.filter(u=>u.district===id&&u.type!=='intel'&&(ids?ids.includes(u.id)&&['ready','operating'].includes(u.status):u.status==='ready')).sort((a,b)=>forcePower(s,b)-forcePower(s,a)||a.id-b.id);
 const units=ids?here:here.slice(0,1),terrain=terrainAt(s,id),cover={mountain:38,forest:27,wetland:30,arid:8,urban:22,capital:22,port:18,border:12,rural:12,coast:10}[terrain];
 const exits=NEIGHBORS[id].filter(next=>Number.isFinite(transportCost(s,id,next)??1)),blocked=exits.filter(next=>s.units.some(u=>u.district===next&&u.type!=='intel'&&u.status==='ready'&&forcePower(s,u)>=5)).length,cordon=exits.length?blocked/exits.length:1;
 const power=units.reduce((v,u)=>v+forcePower(s,u),0)*t.power,c=capabilities(s,network),fortifications=d.fortifications?.[network]??0;
 const defense=(12+d.cells[network]*.55+cover*.35+fortifications*.25)*c.defense;
 const escapeRisk=clamp((61+cover*.3-d.intel*.32-cordon*50)*t.escape,3,90),civilianRisk=clamp((8+(['urban','capital','port'].includes(terrain)?18:4)+d.displacement*.12-d.intel*.08)*t.risk,2,65);
 const chance=clamp(.46+d.intel*.0033+power*.005-(c.defense-1)*.1-cover*.002-fortifications*.0015+(tactic==='cordon'?cordon*.15:0),.15,.98);
 return {power,defense,cover,fortifications,terrain,exits:exits.length,blocked,cordon,escapeRisk,civilianRisk,chance,units:units.map(u=>u.id),factors:[{label:'Security power',value:Math.round(power)},{label:'Defensive strength',value:Math.round(defense)},{label:'Intelligence',value:Math.round(d.intel)},{label:'Terrain cover',value:cover},{label:'Closed exits',value:`${blocked}/${exits.length}`} ]};
}
export function beginBattle(s,id,network,tactic,ids){
 const f=combatForecast(s,id,network,tactic,ids);
 return {tactic,units:f.units,control:0,friendlySuppression:0,enemySuppression:0,escapeRisk:f.escapeRisk,civilianRisk:f.civilianRisk,initialThreat:s.districts[id].cells[network],lastOrderDay:-1,phase:'approach',entries:[],forecast:f.chance};
}
export function battlePhase(o){const progress=(o.total-o.remaining)/o.total;return progress<.18?'approach':progress<.72?'contact':'containment';}
export function stepBattle(s,o,random){
 const b=o.battle,t=TACTICS[b.tactic],f=combatForecast(s,o.district,o.network,b.tactic,b.units),d=s.districts[o.district];b.phase=battlePhase(o);
 const ratio=f.power/Math.max(12,f.defense),surprise=d.intel/100;
 const gain=clamp((9+ratio*10+surprise*5+f.cordon*5+random()*4)*(b.phase==='approach'?.55:1),3,34);
 b.control=clamp(b.control+gain-b.friendlySuppression*.025);b.enemySuppression=clamp(b.enemySuppression+ratio*9+surprise*3);b.friendlySuppression=clamp(b.friendlySuppression+7/Math.max(.4,ratio)-d.intel*.025-(b.tactic==='precision'?2:0),0,95);
 b.escapeRisk=clamp(f.escapeRisk-b.control*.14,2,95);b.civilianRisk=f.civilianRisk;b.forecast=clamp(f.chance+(b.control-50)*.002-b.friendlySuppression*.001,0,1);
 d.fortifications[o.network]=clamp(d.fortifications[o.network]-(2+f.power*.025));
 alterCell(d,o.network,-Math.min(d.cells[o.network]*.04,f.power*.04*t.damage));
 for(const id of b.units){const u=s.units.find(u=>u.id===id);u.supply=clamp(u.supply-t.supply*.8);u.readiness=clamp(u.readiness-(1+f.defense/(f.power+20))*(b.tactic==='rapid'?1.3:.8));u.fatigue=clamp(u.fatigue+t.supply*.6);}
 const message=b.phase==='approach'?'Units establish their approach.':f.blocked?`${f.blocked} of ${f.exits} exits covered by nearby units.`:b.friendlySuppression>40?'Defenders are pinning down the advance.':'Security units increase pressure on the cell.';
 b.entries.unshift({day:s.day,text:message});b.entries=b.entries.slice(0,5);
}
export function finishBattle(s,o,random,report){
 const b=o.battle,t=TACTICS[b.tactic],d=s.districts[o.district],n=s.networks[o.network],f=combatForecast(s,o.district,o.network,b.tactic,b.units);
 const success=random()<b.forecast;let escaped=false;
 if(success){
  escaped=random()<b.escapeRisk/100*(1-b.control/100)*.4;
  const reduction=(18+f.power*.5+d.intel*.07)*t.damage*(.7+b.control/130)*(escaped?.65:1);
  alterCell(d,n.id,-reduction);d.security=clamp(d.security+8+b.control*.06);d.support=clamp(d.support+3);d.fear=clamp(d.fear-4);d.intel=clamp(d.intel+7);n.evidence=clamp(n.evidence+8);n.funds=clamp(n.funds-9);n.cohesion=clamp(n.cohesion-6);n.arsenal=clamp(n.arsenal-6);n.manpower=clamp(n.manpower-8);
 }else{alterCell(d,n.id,-5);d.intel=clamp(d.intel+10);n.cohesion=clamp(n.cohesion-2);s.trust=clamp(s.trust-(s.completed.includes('oversight')?1:2));}
 if(random()<b.civilianRisk/100){const harm=b.tactic==='rapid'?3:1;d.support=clamp(d.support-harm);d.displacement=clamp(d.displacement+harm);s.trust=clamp(s.trust-harm*.3);b.entries.unshift({day:s.day,text:'Civilian disruption reduced local support.'});}
 const result=d.cells[n.id]<1?'cleared':success?'suppressed':'evaded';n.heat=clamp(n.heat+8);
 const label=result==='cleared'?'cell contained':result==='suppressed'?'cell weakened':'cell evaded';
 report(s,`${NETWORKS[n.id].name} in ${DISTRICTS[d.id].name}: ${label}. ${Math.round(b.control)}% control, ${Math.round(b.escapeRisk)}% escape risk.${escaped?' Some members dispersed.':''}` ,result==='evaded'?'warning':'success',{district:d.id,unit:o.unit,network:n.id,result});
 s.lastBattle={day:s.day,district:d.id,network:n.id,tactic:b.tactic,result,control:b.control,escapeRisk:b.escapeRisk,civilianRisk:b.civilianRisk,units:[...b.units],entries:b.entries.slice(0,5)};
}

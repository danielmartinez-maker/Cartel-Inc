import {DISTRICTS,HQ,INITIATIVES} from './data.js';
import {NEIGHBORS} from './geography.js';

// Presentation uses its own deterministic geometry, never the campaign PRNG.
export const DAY_MS=Object.freeze({1:1200,2:400,3:200});
export class CampaignClock{
  constructor(){this.fraction=0;}
  reset(){this.fraction=0;}
  step(elapsed,{running,speed=1}){
    if(!running)return 0;
    this.fraction+=Math.max(0,Math.min(250,elapsed))/DAY_MS[speed];
    const days=Math.floor(this.fraction+1e-10);this.fraction=Math.max(0,this.fraction-days);return days;
  }
}
export const bounded=n=>Math.max(0,Math.min(1,n));
export const progressOf=(item,fraction=0)=>bounded((item.total-item.remaining+fraction)/Math.max(1,item.total));
export function samplePolyline(points,progress){
  if(!points.length)return {x:0,y:0,angle:0};
  if(points.length===1)return {x:points[0][0],y:points[0][1],angle:0};
  const distances=points.slice(1).map((p,i)=>Math.hypot(p[0]-points[i][0],p[1]-points[i][1]));
  let distance=bounded(progress)*distances.reduce((a,b)=>a+b,0);
  for(let i=0;i<distances.length;i++){
    if(distance<=distances[i]||i===distances.length-1){
      const a=points[i],b=points[i+1],t=distances[i]?bounded(distance/distances[i]):0;
      return {x:a[0]+(b[0]-a[0])*t,y:a[1]+(b[1]-a[1])*t,angle:Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI};
    }
    distance-=distances[i];
  }
}
export function unitPose(unit,fraction=0,slot=0){
  if(unit.status==='moving'&&unit.path.length>1){
    return samplePolyline(unit.path.map(id=>[DISTRICTS[id].x,DISTRICTS[id].y]),progressOf(unit,fraction));
  }
  const d=DISTRICTS[unit.district];return {x:d.x+29+slot*21,y:d.y+1,angle:0};
}
export const CIVILIAN_ROUTES=NEIGHBORS.flatMap((neighbors,a)=>neighbors.filter(b=>a<b&&(a+b)%3!==0).map(b=>({
  a,b,phase:((a*17+b*31)%97)/97,points:[[DISTRICTS[a].x,DISTRICTS[a].y],[DISTRICTS[b].x,DISTRICTS[b].y]],
})));
export const SEA_ROUTES=[
  [[74,280],[65,420],[125,567],[240,685],[390,746]],
  [[400,758],[565,766],[760,753],[982,728],[1093,642]],
  [[1112,228],[1148,377],[1133,531],[1089,645]],
];
export function roadIsActive(s,route){
  const a=s.districts[route.a],b=s.districts[route.b];
  return a.threat<35&&b.threat<35&&route.phase<0.3+(a.support+b.support)/220;
}
export function atmosphere(seed,day){
  const phase=day%56;
  const light=phase<28?'Daylight':phase<40?'Golden hour':phase<48?'Night watch':'First light';
  const night=phase>=40&&phase<48;
  const rain=day>=7&&((Math.floor(day/14)*5+(seed%13))%7)<2;
  return {light,night,rain,label:rain?'Passing rain':night?'Clear skies':phase>=28&&phase<40?'Coastal haze':'Clear skies',shade:night?0.2:phase>=28&&phase<40?0.065:0};
}
export const projectDistrict=p=>INITIATIVES.find(i=>i.id===p.id)?.scope==='province'?HQ:p.district;
const operationNames={investigate:'Investigation',raid:'Containment',interdict:'Asset disruption',arrest:'Leader arrest'};
export function activeOrders(s){
  const orders=[
    ...s.operations.map(o=>({key:`operation-${o.district}`,district:o.district,label:operationNames[o.type],kind:'operation',...o})),
    ...s.projects.map(p=>({...p,key:`project-${p.id}-${p.district}`,district:projectDistrict(p),label:INITIATIVES.find(i=>i.id===p.id).name,kind:'project'})),
    ...s.units.filter(u=>['moving','training'].includes(u.status)).map(u=>({...u,key:`unit-${u.id}`,unit:u.id,district:u.status==='moving'?u.path.at(-1):HQ,label:`${u.name} · ${u.status==='moving'?'Deploying':'Training'}`,kind:'unit'})),
  ];
  return orders.sort((a,b)=>a.remaining-b.remaining||a.key.localeCompare(b.key));
}
export const isStable=d=>d.stability>=75&&d.support>=60&&d.threat<8;
export function campaignSnapshot(s){
  return {day:s.day,completed:[...s.completed],districts:s.districts.map(d=>({id:d.id,stable:isStable(d),threat:d.threat,completed:[...d.completed]})),
    units:s.units.map(u=>({id:u.id,name:u.name,status:u.status,district:u.district})),networks:s.networks.map(n=>({...n})),operations:s.operations.map(o=>({...o}))};
}
export function campaignMilestones(before,after){
  if(!before||after.day<=before.day)return [];
  const events=[];
  for(const d of after.districts){
    const old=before.districts[d.id];
    for(const id of d.completed.filter(id=>!old.completed.includes(id)))events.push({district:d.id,text:INITIATIVES.find(i=>i.id===id).name+' delivered',kind:'success'});
    if(d.stable&&!old.stable)events.push({district:d.id,text:'District stabilized',kind:'success'});
    else if(!d.stable&&old.stable)events.push({district:d.id,text:'Stability at risk',kind:'warning'});
    if(d.threat>=12&&old.threat<12)events.push({district:d.id,text:'New network activity',kind:'warning'});
    else if(d.threat<1&&old.threat>=1)events.push({district:d.id,text:'Local cell contained',kind:'success'});
  }
  for(const u of after.units){
    const old=before.units.find(n=>n.id===u.id);
    if(u.status==='ready'&&['moving','training'].includes(old?.status))events.push({district:u.district,text:`${u.name} ${old.status==='moving'?'arrived':'ready'}`,kind:'info'});
  }
  for(const o of before.operations){
    if(!after.operations.some(n=>n.district===o.district))events.push({district:o.district,text:o.type==='investigate'?'Intelligence updated':o.type==='arrest'?'Leader in custody':'Operation resolved',kind:o.type==='raid'?'info':'success',operation:o.type});
  }
  for(const id of after.completed.filter(id=>!before.completed.includes(id)))events.push({district:HQ,text:INITIATIVES.find(i=>i.id===id).name+' active',kind:'success'});
  return events.slice(0,8);
}

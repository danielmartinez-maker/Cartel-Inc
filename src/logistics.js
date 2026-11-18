import {DISTRICTS,TERRAIN} from './data.js';
import {findRoute} from './geography.js';
import {terrainAt} from './scenarios.js';
import {transportCost} from './infrastructure.js';

export function movementCost(s,a,b){
  return transportCost(s,a,b)??Math.max(1,TERRAIN[terrainAt(s,b)].travel-(s.districts[b].completed.includes('roads')?1:0));
}

export const routeDuration=days=>days.reduce((sum,days)=>sum+days,0);

// Completed legs stay in the route so the token never jumps back to its origin.
// Replanning happens at junctions; a crossing already entered is completed first.
export function prepareTravelDay(s,u,report){
  const elapsed=u.total-u.remaining;
  let crossed=0,index=0;
  for(;index<u.routeDays.length;index++){
    if(crossed+u.routeDays[index]>elapsed)break;
    crossed+=u.routeDays[index];
  }
  if(index>=u.routeDays.length||crossed!==elapsed)return true;
  const current=u.path[index],next=u.path[index+1],cost=movementCost(s,current,next);
  if(!Number.isFinite(cost)){
    const destination=u.path.at(-1),detour=findRoute(current,destination,(a,b)=>movementCost(s,a,b));
    if(!detour.length){
      if(!u.blocked)report(s,`${u.name} is holding at ${DISTRICTS[current].name}. No open land route remains.`,'warning');
      u.blocked=true;return false;
    }
    u.path=[...u.path.slice(0,index),...detour];
    u.routeDays=[...u.routeDays.slice(0,index),...detour.slice(1).map((id,i)=>movementCost(s,detour[i],id))];
    u.total=routeDuration(u.routeDays);u.remaining=u.total-elapsed;
    report(s,`${u.name} rerouted around a closed crossing. ${u.remaining} days to ${DISTRICTS[destination].name}.`,'warning');
  }else if(cost!==u.routeDays[index]){
    u.routeDays[index]=cost;u.total=routeDuration(u.routeDays);u.remaining=u.total-elapsed;
  }
  if(u.blocked)report(s,`${u.name} resumed deployment after a land route reopened.`);
  u.blocked=false;return true;
}

// Version-three campaigns predating weighted animation retain their accepted ETA.
export function restoreTravelTimings(s){
  for(const u of s.units){
    if(u.routeDays===undefined){
      const count=u.status==='moving'?u.path.length-1:0;
      u.routeDays=Array.from({length:count},(_,i)=>Math.floor(u.total/count)+(i<u.total%count?1:0));
    }
    if(u.blocked===undefined)u.blocked=false;
  }
}

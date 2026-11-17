import {DISTRICTS, LANDS,TRANSPORT_LINKS} from './data.js';

function clip(poly, a, b, c) {
  const out=[];
  for(let i=0;i<poly.length;i++){
    const p=poly[i], q=poly[(i+1)%poly.length];
    const dp=a*p[0]+b*p[1]-c, dq=a*q[0]+b*q[1]-c;
    if(dp<=0.000001) out.push(p);
    if((dp<0 && dq>0)||(dp>0 && dq<0)){
      const t=dp/(dp-dq); out.push([p[0]+t*(q[0]-p[0]),p[1]+t*(q[1]-p[1])]);
    }
  }
  return out;
}
export const CELLS = DISTRICTS.map(d=>{
  let p=LANDS[d.region];
  for(const n of DISTRICTS.filter(n=>n.region===d.region)){
    if(d.id===n.id)continue;
    p=clip(p,2*(n.x-d.x),2*(n.y-d.y),n.x*n.x+n.y*n.y-d.x*d.x-d.y*d.y);
  }
  return p;
});
export const NEIGHBORS = DISTRICTS.map(d=>DISTRICTS.filter(n=>{
  if(n.id===d.id||n.region!==d.region)return false;
  const a=2*(n.x-d.x),b=2*(n.y-d.y),c=n.x*n.x+n.y*n.y-d.x*d.x-d.y*d.y;
  return CELLS[d.id].filter(p=>Math.abs(a*p[0]+b*p[1]-c)<0.01).length>=2;
}).map(n=>n.id));
for(const {a,b}of TRANSPORT_LINKS){NEIGHBORS[a].push(b);NEIGHBORS[b].push(a);}

export function findRoute(start,end,cost=null){
  if(!DISTRICTS[start] || !DISTRICTS[end])return [];
  if(cost){
    const distances=new Map([[start,0]]),previous=new Map(),pending=new Set([start]);
    while(pending.size){
      const current=[...pending].sort((a,b)=>distances.get(a)-distances.get(b)||a-b)[0];pending.delete(current);
      if(current===end){const path=[end];while(path[0]!==start)path.unshift(previous.get(path[0]));return path;}
      for(const next of NEIGHBORS[current]){const value=distances.get(current)+cost(current,next);if(value<(distances.get(next)??Infinity)){distances.set(next,value);previous.set(next,current);pending.add(next);}}
    }
    return [];
  }
  const queue=[[start]],visited=new Set([start]);
  while(queue.length){
    const path=queue.shift(),last=path.at(-1);
    if(last===end)return path;
    for(const n of NEIGHBORS[last])if(!visited.has(n)){visited.add(n);queue.push([...path,n]);}
  }
  return [];
}

export const polygonPath = p=>'M'+p.map(v=>v.map(n=>n.toFixed(2)).join(',')).join('L')+'Z';

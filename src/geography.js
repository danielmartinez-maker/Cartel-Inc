import {DISTRICTS,REGIONS,LANDS,TRANSPORT_LINKS,NEIGHBORHOODS} from './data.js';
export function clipPolygon(poly,a,b,c){const out=[];for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length],dp=a*p[0]+b*p[1]-c,dq=a*q[0]+b*q[1]-c;if(dp<=.000001)out.push(p);if((dp<0&&dq>0)||(dp>0&&dq<0)){const t=dp/(dp-dq);out.push([p[0]+t*(q[0]-p[0]),p[1]+t*(q[1]-p[1])]);}}return out;}
export const REGION_DISTRICTS=REGIONS.map(r=>DISTRICTS.filter(d=>d.region===r.id));
export const CELLS=DISTRICTS.map(d=>{let p=LANDS[d.region];for(const n of REGION_DISTRICTS[d.region])if(n.id!==d.id)p=clipPolygon(p,2*(n.x-d.x),2*(n.y-d.y),n.x*n.x+n.y*n.y-d.x*d.x-d.y*d.y);return p;});
export const NEIGHBORHOOD_CELLS=DISTRICTS.map(d=>NEIGHBORHOODS[d.id].map(n=>{let p=CELLS[d.id];for(const other of NEIGHBORHOODS[d.id])if(n.index!==other.index)p=clipPolygon(p,2*(other.x-n.x),2*(other.y-n.y),other.x*other.x+other.y*other.y-n.x*n.x-n.y*n.y);return p;}));
export const NEIGHBORS=DISTRICTS.map(d=>REGION_DISTRICTS[d.region].filter(n=>{if(n.id===d.id)return false;const a=2*(n.x-d.x),b=2*(n.y-d.y),c=n.x*n.x+n.y*n.y-d.x*d.x-d.y*d.y;return CELLS[d.id].filter(p=>Math.abs(a*p[0]+b*p[1]-c)<.01).length>=2;}).map(n=>n.id));
for(const {a,b}of TRANSPORT_LINKS){if(!NEIGHBORS[a].includes(b))NEIGHBORS[a].push(b);if(!NEIGHBORS[b].includes(a))NEIGHBORS[b].push(a);}
export class MinHeap{
  constructor(){this.items=[];}
  push(item){const a=this.items;let i=a.length;a.push(item);while(i){const p=(i-1)>>1;if(a[p][0]<=item[0])break;a[i]=a[p];i=p;}a[i]=item;}
  pop(){const a=this.items,top=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let child=i*2+1;if(child+1<a.length&&a[child+1][0]<a[child][0])child++;if(a[child][0]>=last[0])break;a[i]=a[child];i=child;}a[i]=last;}return top;}
}
export function findRoute(start,end,cost=null){
  if(!Number.isInteger(start)||!Number.isInteger(end)||!DISTRICTS[start]||!DISTRICTS[end])return [];
  const previous=new Int32Array(DISTRICTS.length).fill(-1),distances=new Float64Array(DISTRICTS.length).fill(Infinity);distances[start]=0;
  if(cost){const queue=new MinHeap();queue.push([0,start]);while(queue.items.length){const [distance,current]=queue.pop();if(distance!==distances[current])continue;if(current===end)break;for(const next of NEIGHBORS[current]){const edge=cost(current,next);if(!Number.isFinite(edge)||edge<0)continue;const total=distance+edge;if(total<distances[next]){distances[next]=total;previous[next]=current;queue.push([total,next]);}}}}
  else{const queue=[start];for(let i=0;i<queue.length;i++){const current=queue[i];if(current===end)break;for(const next of NEIGHBORS[current])if(distances[next]===Infinity){distances[next]=distances[current]+1;previous[next]=current;queue.push(next);}}}
  if(distances[end]===Infinity)return [];const path=[end];while(path[0]!==start)path.unshift(previous[path[0]]);return path;
}
export const polygonPath=p=>'M'+p.map(v=>v.map(n=>n.toFixed(2)).join(',')).join('L')+'Z';

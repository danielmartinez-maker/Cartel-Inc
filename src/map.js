import {DISTRICTS,REGIONS,MAP,NETWORKS,NEIGHBORHOODS,TRANSPORT_LINKS} from './data.js';
import {CELLS,NEIGHBORHOOD_CELLS,REGION_DISTRICTS,NEIGHBORS} from './geography.js';
import {movementPlan,dominantNetwork} from './engine.js';
import {INFRA_BY_REGION,assetState,assetOutput} from './infrastructure.js';
import {RasterArt,canvasPath,contains,bounds,TERRAIN_TILES,NEIGHBORHOOD_TILES,TERRAIN_IMAGES,nativeZoomLimit} from './raster.js';
import {terrainAt,SECTORS} from './scenarios.js';
import {unitPose,activeOrders,progressOf,CIVILIAN_ROUTES,samplePolyline,atmosphere,campaignSnapshot,campaignMilestones} from './world.js';
import {activeConfrontations,encounterResults,encounterKey,exchangeFrame,tacticalFrame} from './confrontation.js';
import {TACTICS} from './combat.js';
const center=r=>[r.x+600,r.y+400],clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const cellBounds=CELLS.map(bounds),neighborhoodBounds=NEIGHBORHOOD_CELLS.map(cells=>cells.map(bounds));
export class ProvinceMap{
 constructor(element,onSelect,onUnit,onPreview=()=>{}){
  this.element=element;this.onSelect=onSelect;this.onUnit=onUnit;this.onPreview=onPreview;this.zoom=1;this.center=[MAP.width/2,MAP.height/2];this.activeRegion=null;this.motion=true;this.ambientTime=0;this.combatTime=0;this.lastFrame=0;this.selected=9;this.selectedNeighborhood=0;this.previewDestination=null;this.dispatchUnit=null;this.seen=new Set();this.effects=[];this.hits=[];this.previous=null;this.pointer=null;this.backgroundDirty=true;
  element.innerHTML='<canvas id="terrain-canvas" aria-hidden="true"></canvas><canvas id="province-map" tabindex="0" role="application" aria-label="Campaign map. Scroll to zoom, drag to pan. Arrow keys move district selection, Enter inspects, plus and minus zoom."></canvas><div id="map-hover" class="map-hover" hidden></div>';
  this.canvas=element.querySelector('#province-map');this.canvas.dataset.renderer='raster';this.ground=element.querySelector('#terrain-canvas');this.ctx=this.canvas.getContext('2d');this.gctx=this.ground.getContext('2d');this.tooltip=element.querySelector('#map-hover');
  this.art=new RasterArt(()=>{this.backgroundDirty=true;if(this.currentState)this.paint();});
  const resize=()=>{const box=element.getBoundingClientRect();if(!box.width||!box.height)return;this.width=box.width;this.height=box.height;this.dpr=Math.min(2,devicePixelRatio||1);for(const c of [this.canvas,this.ground]){c.width=Math.round(box.width*this.dpr);c.height=Math.round(box.height*this.dpr);}this.backgroundDirty=true;this.setView();};
  this.observer=new ResizeObserver(resize);this.observer.observe(element);
  this.canvas.addEventListener('wheel',e=>{e.preventDefault();const before=this.toWorld(e.offsetX,e.offsetY);this.zoom=this.limitZoom(this.zoom*(e.deltaY<0?1.15:1/1.15));this.exitDetailIfDistant();this.setView();const after=this.toWorld(e.offsetX,e.offsetY);this.center[0]+=before.x-after.x;this.center[1]+=before.y-after.y;this.setView();},{passive:false});
  this.canvas.addEventListener('pointerdown',e=>{this.drag={x:e.clientX,y:e.clientY,center:[...this.center]};this.wasDragged=false;this.canvas.setPointerCapture(e.pointerId);});
  this.canvas.addEventListener('pointermove',e=>{if(this.drag){const dx=e.clientX-this.drag.x,dy=e.clientY-this.drag.y;if(Math.hypot(dx,dy)>5){this.wasDragged=true;this.center=[this.drag.center[0]-dx/this.scale,this.drag.center[1]-dy/this.scale];this.setView();}}else this.hover(e.offsetX,e.offsetY);});
  this.canvas.addEventListener('pointerup',e=>{if(!this.wasDragged)this.choose(e.offsetX,e.offsetY);this.drag=null;});
  this.canvas.addEventListener('dblclick',e=>{const hit=this.pick(e.offsetX,e.offsetY);if(hit?.type==='district'){this.focusDistrict(hit.id);this.onSelect(hit.id);}else if(hit?.type==='neighborhood'){this.focusNeighborhood(hit.id,hit.index);this.onNeighborhood?.(hit.id,hit.index);}});
  this.canvas.addEventListener('pointercancel',()=>this.drag=null);
  this.canvas.addEventListener('pointerleave',()=>{this.tooltip.hidden=true;this.previewRoute(null);});
  this.canvas.addEventListener('keydown',e=>{if(e.key==='+'||e.key==='='){e.preventDefault();this.setZoom(this.zoom*.2);}else if(e.key==='-'){e.preventDefault();this.setZoom(-this.zoom*.2);}else if(e.key==='Enter'){e.preventDefault();this.onSelect(this.selected);}else if(e.key.startsWith('Arrow')){e.preventDefault();const dir={ArrowRight:1,ArrowLeft:-1,ArrowUp:-4,ArrowDown:4}[e.key],id=clamp(this.selected+dir,0,DISTRICTS.length-1);this.selected=id;this.focusDistrict(id);this.onSelect(id);}});
 }
 setView(){
  if(!this.width||!this.height)return;const aspect=this.width/this.height,base=Math.max(MAP.width,MAP.height*aspect);this.view={w:base/this.zoom,h:base/this.zoom/aspect};this.scale=this.width/this.view.w;this.view.x=this.center[0]-this.view.w/2;this.view.y=this.center[1]-this.view.h/2;
  const region=this.zoom<3.6?null:(REGIONS.find(r=>contains(r.polygon,...this.center))??REGIONS.reduce((a,b)=>Math.hypot(...center(a).map((v,i)=>v-this.center[i]))<Math.hypot(...center(b).map((v,i)=>v-this.center[i]))?a:b)).id;
  const scale=this.zoom<3.6?'country':!this.close?'province':'neighborhood';
  if(scale==='neighborhood'&&this.canvas.dataset.scale!=='neighborhood'&&region!==null){const d=REGION_DISTRICTS[region].find(d=>contains(CELLS[d.id],...this.center));if(d&&d.id!==this.selected){this.selected=d.id;this.selectedNeighborhood=0;this.onFocusDistrict?.(d.id);}}
  if(region!==this.activeRegion){this.activeRegion=region;this.onView?.(region);}this.canvas.dataset.scale=scale;this.canvas.dataset.region=region??'all';this.onScale?.(scale);this.backgroundDirty=true;if(this.currentState)this.paint();
 }
 get fine(){return this.detailMode==='neighborhood'||this.zoom>=35;}
 get close(){return !!this.detailMode||this.zoom>=17;}
 nativeLimit(cell,index){const pixels=this.art.images[TERRAIN_IMAGES[index]]?.naturalWidth||1254;return nativeZoomLimit(this.width||1363,this.height||936,this.dpr||1,cell,pixels);}
 limitZoom(zoom){
  zoom=clamp(zoom,1,55);if(zoom<17&&!this.detailMode)return zoom;
  const r=REGIONS.find(r=>contains(r.polygon,...this.center)),d=r&&REGION_DISTRICTS[r.id].find(d=>contains(CELLS[d.id],...this.center));if(!d)return zoom;
  const n=NEIGHBORHOODS[d.id].find(n=>contains(NEIGHBORHOOD_CELLS[d.id][n.index],...this.center))??NEIGHBORHOODS[d.id][0];
  const limit=this.nativeLimit(neighborhoodBounds[d.id][n.index],NEIGHBORHOOD_TILES[n.type]);
  if(zoom>limit){this.detailMode='neighborhood';this.selected=d.id;this.selectedNeighborhood=n.index;this.onFocusDistrict?.(d.id,n.index);}
  return Math.min(zoom,Math.max(4,limit));
 }
 exitDetailIfDistant(){const n=NEIGHBORHOODS[this.selected][this.selectedNeighborhood],limit=this.nativeLimit(neighborhoodBounds[this.selected][this.selectedNeighborhood],NEIGHBORHOOD_TILES[n.type]);if(this.zoom<Math.min(11.5,limit*.65))this.detailMode=null;}
 setZoom(delta){this.zoom=this.limitZoom(this.zoom+delta);this.exitDetailIfDistant();if(this.zoom===1)this.center=[MAP.width/2,MAP.height/2];this.setView();return this.zoom;}
 fit(){this.detailMode=null;this.zoom=1;this.center=[MAP.width/2,MAP.height/2];this.setView();this.onView?.(null);}
 focusRegion(id){const r=REGIONS[id];if(!r)return;this.detailMode=null;this.zoom=6.8;this.center=center(r);this.setView();}
 focusDistrict(id,index=0){const d=DISTRICTS[id];if(!d)return;this.detailMode='district';this.selected=id;this.selectedNeighborhood=index;this.zoom=Math.min(26,this.nativeLimit(cellBounds[id],TERRAIN_TILES[terrainAt(this.currentState,id)]));this.center=[d.x,d.y];this.setView();}
 focusNeighborhood(id,index=0){const n=NEIGHBORHOODS[id]?.[index];if(!n)return;const b=neighborhoodBounds[id][index];this.detailMode='neighborhood';this.selected=id;this.selectedNeighborhood=index;this.zoom=Math.min(48,this.nativeLimit(b,NEIGHBORHOOD_TILES[n.type]));const poly=NEIGHBORHOOD_CELLS[id][index];this.center=[0,1].map(axis=>poly.reduce((sum,p)=>sum+p[axis],0)/poly.length);this.setView();}
 setMotion(enabled){this.motion=enabled;this.canvas.dataset.motion=String(enabled);if(!enabled)this.effects=[];if(this.currentState)this.paint();}
 toWorld(x,y){return {x:this.view.x+x/this.scale,y:this.view.y+y/this.scale};}
 visible(poly){const b=bounds(poly);return b.x+b.w>=this.view.x&&b.x<=this.view.x+this.view.w&&b.y+b.h>=this.view.y&&b.y<=this.view.y+this.view.h;}
 pick(x,y){const p=this.toWorld(x,y);for(const hit of [...this.hits].reverse())if(Math.hypot(p.x-hit.x,p.y-hit.y)*this.scale<hit.radius)return hit;
  if(this.close){for(const r of REGIONS.filter(r=>contains(r.polygon,p.x,p.y)))for(const d of REGION_DISTRICTS[r.id]){if(!contains(CELLS[d.id],p.x,p.y))continue;for(const n of NEIGHBORHOODS[d.id])if(contains(NEIGHBORHOOD_CELLS[d.id][n.index],p.x,p.y))return {type:'neighborhood',id:d.id,index:n.index,label:`${d.localName} · ${n.name}`};}}
  if(this.activeRegion!==null){const d=REGION_DISTRICTS[this.activeRegion].find(d=>contains(CELLS[d.id],p.x,p.y));if(d)return {type:'district',id:d.id,label:d.name};}
  const r=REGIONS.find(r=>contains(r.polygon,p.x,p.y));return r?{type:'province',id:r.id,label:r.name}:null;
 }
 choose(x,y){const hit=this.pick(x,y);if(!hit){this.onClear?.();return;}if(hit.type==='unit')this.onUnit(hit.id);if(hit.type==='asset')this.onInfrastructure?.(hit.id);if(hit.type==='district')this.onSelect(hit.id);if(hit.type==='province'){this.focusRegion(hit.id);this.onProvince?.(hit.id);}if(hit.type==='neighborhood'){this.selectedNeighborhood=hit.index;this.onNeighborhood?.(hit.id,hit.index);}}
 hover(x,y){const hit=this.pick(x,y);this.canvas.style.cursor=hit?'pointer':'grab';this.tooltip.hidden=!hit;if(hit){this.tooltip.textContent=hit.label;this.tooltip.style.left=`${Math.min(x+16,this.width-220)}px`;this.tooltip.style.top=`${Math.min(y+18,this.height-70)}px`;}this.previewRoute(['district','neighborhood'].includes(hit?.type)?hit.id:null);}
 previewRoute(destination){this.previewDestination=destination;const plan=this.dispatchUnit!==null&&destination!==null&&this.currentState?movementPlan(this.currentState,this.dispatchUnit,destination):null;this.routePlan=plan?.ok?plan:null;this.onPreview(plan,destination);if(this.currentState)this.paint();}
 render(s,selected,layer='control',{fraction=0,dispatchUnit=null}={}){
  if(this.currentState!==s){this.previous=null;this.seen=new Set(encounterResults(s.log).map(encounterKey));this.effects=[];this.backgroundDirty=true;}
  const snapshot=campaignSnapshot(s);if(this.motion)for(const event of campaignMilestones(this.previous,snapshot))this.effects.push({...event,born:this.ambientTime});
  for(const event of encounterResults(s.log))if(!this.seen.has(encounterKey(event))&&this.motion)this.effects.push({district:event.district,text:{cleared:'CELL CONTAINED',suppressed:'CELL WEAKENED',evaded:'CELL EVADED'}[event.result],kind:event.result==='evaded'?'warning':'success',born:this.ambientTime});
  this.seen=new Set(encounterResults(s.log).map(encounterKey));if(this.selected!==selected&&this.zoom>=17)this.backgroundDirty=true;
  this.previous=snapshot;this.currentState=s;this.selected=selected;this.layer=layer;this.fraction=fraction;this.dispatchUnit=dispatchUnit;this.effects=this.effects.filter(e=>this.ambientTime-e.born<4).slice(-12);this.canvas.dataset.running=String(!s.paused&&!s.pendingEvent&&!s.outcome);this.paint();
 }
 world(ctx){ctx.setTransform(this.dpr*this.scale,0,0,this.dpr*this.scale,-this.view.x*this.dpr*this.scale,-this.view.y*this.dpr*this.scale);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';}
 line(ctx,points,color,width=1,dash=[]){if(!points.length)return;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.strokeStyle=color;ctx.lineWidth=width/this.scale;ctx.setLineDash(dash.map(n=>n/this.scale));ctx.stroke();ctx.setLineDash([]);}
 label(ctx,text,x,y,size=12,color='#f6e7bd',align='center'){ctx.font=`${size/this.scale}px Georgia`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.lineWidth=3/this.scale;ctx.strokeStyle='#133e35';ctx.strokeText(text,x,y);ctx.fillStyle=color;ctx.fillText(text,x,y);}
 drawBackground(){
  const ctx=this.gctx,s=this.currentState;ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#0b3632';ctx.fillRect(0,0,this.ground.width,this.ground.height);this.world(ctx);
  if(this.art.ready('country'))ctx.drawImage(this.art.images.country,0,0,MAP.width,MAP.height);
  // One coherent painting at province scale. Street scenes are independent
  // raster detail layers; zoom never swaps the scenery for SVG buildings.
  if(this.zoom>=3.1)for(const r of REGIONS.filter(r=>this.visible(r.polygon))){ctx.save();canvasPath(ctx,r.polygon);ctx.clip();ctx.globalAlpha=clamp((this.zoom-3.1)/1.4,0,1);const b=bounds(r.polygon);this.art.cover(ctx,'region',b.x,b.y,b.w,b.h);ctx.restore();}
  if(this.zoom>=11.5)for(const r of REGIONS.filter(r=>this.visible(r.polygon)))for(const d of REGION_DISTRICTS[r.id]){if(!this.visible(CELLS[d.id]))continue;ctx.save();canvasPath(ctx,CELLS[d.id]);ctx.clip();ctx.globalAlpha=clamp((this.zoom-11.5)/5.5,0,1);const b=cellBounds[d.id];this.art.tile(ctx,TERRAIN_TILES[terrainAt(s,d.id)],b.x,b.y,b.w,b.h);ctx.restore();}
  if(this.close)for(const r of REGIONS.filter(r=>this.visible(r.polygon)))for(const d of REGION_DISTRICTS[r.id]){if(!this.visible(CELLS[d.id]))continue;for(const n of NEIGHBORHOODS[d.id]){const b=neighborhoodBounds[d.id][n.index],terrain=terrainAt(s,d.id),index=['arid','wetland'].includes(terrain)?TERRAIN_TILES[terrain]:NEIGHBORHOOD_TILES[n.type],ratio=this.zoom/this.nativeLimit(b,index);ctx.save();canvasPath(ctx,NEIGHBORHOOD_CELLS[d.id][n.index]);ctx.clip();ctx.globalAlpha=this.fine?1:clamp((ratio-.45)/.4,0,1);this.art.tile(ctx,index,b.x,b.y,b.w,b.h);ctx.restore();}}
  this.backgroundDirty=false;
 }
 paint(){
  if(!this.currentState||!this.view)return;const ctx=this.ctx,s=this.currentState,t=this.ambientTime;if(this.backgroundDirty)this.drawBackground();ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,this.canvas.width,this.canvas.height);this.world(ctx);this.hits=[];
  const country=this.zoom<3.6,close=this.close;
  if(country)for(const r of REGIONS){const ds=s.districts.slice(r.id*24,r.id*24+24),strength=NETWORKS.map(n=>ds.reduce((v,d)=>v+d.cells[n.id],0)),nid=strength.indexOf(Math.max(...strength)),b=bounds(r.polygon);ctx.save();canvasPath(ctx,r.polygon);ctx.fillStyle=this.layer==='economy'?SECTORS[s.regions[r.id].sector??'commerce'].color:NETWORKS[nid].color;ctx.globalAlpha=this.layer==='economy'?.32:.12;ctx.fill();ctx.globalAlpha=.65;ctx.strokeStyle='#f3ddad';ctx.lineWidth=1/this.scale;ctx.stroke();ctx.restore();const [x,y]=center(r);this.label(ctx,r.name.toUpperCase(),x,y,Math.max(8,12*this.zoom));}
  if(!country){
   const regions=REGIONS.filter(r=>this.visible(r.polygon));for(const r of regions)for(const d of REGION_DISTRICTS[r.id]){
    const ds=s.districts[d.id];ctx.save();canvasPath(ctx,CELLS[d.id]);if(d.id===this.selected){ctx.strokeStyle='#f4ce7f';ctx.lineWidth=2.2/this.scale;ctx.stroke();}else if(!close){ctx.strokeStyle='#f8dfb760';ctx.lineWidth=.7/this.scale;ctx.stroke();}
    if(this.layer==='support'||this.layer==='intelligence'){ctx.globalAlpha=.3;ctx.fillStyle=this.layer==='support'?`hsl(${35+ds.support} 40% 45%)`:`hsl(170 40% ${85-ds.intel*.5}%)`;ctx.fill();}ctx.restore();
    if(!close){this.label(ctx,d.localName.toUpperCase(),d.x,d.y+20/this.scale,10);if(ds.threat>8){const count=Math.min(5,Math.ceil(ds.threat/15));for(let i=0;i<count;i++){ctx.beginPath();ctx.arc(d.x+(i-2)*7/this.scale,d.y-12/this.scale,2.6/this.scale,0,Math.PI*2);ctx.fillStyle=NETWORKS[dominantNetwork(ds)].color;ctx.fill();ctx.strokeStyle='#f7e3b7';ctx.lineWidth=.6/this.scale;ctx.stroke();}}}
   }
   if(close)for(const r of regions)for(const d of REGION_DISTRICTS[r.id]){if(!this.visible(CELLS[d.id]))continue;for(const n of NEIGHBORHOODS[d.id]){const state=s.districts[d.id].neighborhoods[n.index],selected=d.id===this.selected;ctx.save();canvasPath(ctx,NEIGHBORHOOD_CELLS[d.id][n.index]);ctx.strokeStyle=selected&&n.index===this.selectedNeighborhood?'#f6da90':'#f4e3b96c';ctx.lineWidth=(selected&&n.index===this.selectedNeighborhood?2.4:.7)/this.scale;ctx.stroke();ctx.restore();this.label(ctx,n.name.toUpperCase(),n.x,n.y,selected?14:10);if(selected)this.label(ctx,`${Math.round(state.access)}% ACCESS`,n.x,n.y+17/this.scale,9,'#e5dab6');}}
   for(const l of TRANSPORT_LINKS){if(!regions.some(r=>l.regions.includes(r.id)))continue;const a=assetState(s,l.id);this.line(ctx,[[DISTRICTS[l.a].x,DISTRICTS[l.a].y],[DISTRICTS[l.b].x,DISTRICTS[l.b].y]],a.condition<15&&l.type==='bridge'?'#dd714b':'#f4ddb2',2,[5,7]);}
   for(const r of regions){for(const def of INFRA_BY_REGION[r.id]){
    const a=assetState(s,def.id),size=(close?26:42)/this.scale,pulse=this.motion?Math.sin(t*2+def.district)*1.4:0;this.art.sprite(ctx,def.type,def.x,def.y,size+pulse/this.scale);
    if(a.condition<35||a.downtime>0){ctx.beginPath();ctx.arc(def.x,def.y,22/this.scale,0,Math.PI*2);ctx.strokeStyle=`rgba(235,137,81,${.5+(this.motion?Math.sin(t*3)*.3:0)})`;ctx.lineWidth=2/this.scale;ctx.stroke();}
    if(s.works.some(w=>w.kind==='infrastructure'&&w.target===def.id)){this.art.sprite(ctx,'construction',def.x+20/this.scale,def.y+Math.sin(t*3)/this.scale,26/this.scale,Math.sin(t*2)*.045);this.art.sprite(ctx,'dust',def.x+25/this.scale,def.y+12/this.scale,18/this.scale,0,.35);}
    if(!close&&this.layer==='infrastructure')this.label(ctx,def.type.toUpperCase(),def.x,def.y+23/this.scale,9);
    if(['power','depot','rail'].includes(def.type)&&assetOutput(a)>30)this.art.sprite(ctx,'smoke',def.x+(8+Math.sin(t)) /this.scale,def.y-(14+(t*5+def.district)%12)/this.scale,18/this.scale,0,.35);
    if(['water','dam','port'].includes(def.type)&&assetOutput(a)>25)this.art.frame(ctx,'ripple',this.motion?t:0,def.x,def.y+14/this.scale,38/this.scale,{phase:def.region,alpha:.7});
    if(def.type==='telecom'&&assetOutput(a)>25){const pulse=(t*.7+def.region*.1)%1;ctx.beginPath();ctx.arc(def.x,def.y-8/this.scale,(8+pulse*18)/this.scale,0,Math.PI*2);ctx.strokeStyle=`rgba(241,222,163,${this.motion?(1-pulse)*.4:.2})`;ctx.lineWidth=1/this.scale;ctx.stroke();}
    this.hits.push({type:'asset',id:def.id,x:def.x,y:def.y,radius:18,label:`${def.name} · ${Math.round(a.condition)}% condition`});
   }
   if(this.layer==='economy'){const [x,y]=center(r);this.art.sprite(ctx,s.regions[r.id].sector??'commerce',x,y,58/this.scale);}
   }
   for(const route of CIVILIAN_ROUTES.filter(route=>regions.some(r=>r.id===DISTRICTS[route.a].region)).filter((r,i)=>i%3===0)){if(s.districts[route.a].threat>40||s.districts[route.b].threat>40)continue;const p=samplePolyline(route.points,(t/(16+route.a%8)+route.phase)%1);this.art.sprite(ctx,route.a%3?'car':'truck',p.x,p.y,(close?20:17)/this.scale,p.angle*Math.PI/180);}
   for(const r of regions){const rail=INFRA_BY_REGION[r.id].find(a=>a.type==='rail'),depot=INFRA_BY_REGION[r.id].find(a=>a.type==='depot');if(rail&&depot&&Math.min(assetOutput(assetState(s,rail.id)),assetOutput(assetState(s,depot.id)))>25){const p=samplePolyline([[rail.x,rail.y],[depot.x,depot.y]],(t*.035+r.id*.1)%1);this.art.sprite(ctx,'rail',p.x,p.y,38/this.scale,p.angle*Math.PI/180);}const port=INFRA_BY_REGION[r.id].find(a=>a.type==='port');if(port)this.art.sprite(ctx,'boat',port.x+Math.cos(t*.2)*20,port.y+Math.sin(t*.2)*12,24/this.scale,Math.sin(t*.2)*.2);}
   if(close)this.drawNeighborhoodLife(ctx,regions);
  }
  // These convoys represent recorded trade, using the same real corridor that
  // carried the settlement. A newly closed bridge immediately hides its flow.
  if(!close)for(const f of (s.economy?.shipments??[]).filter(f=>f.amount>1).slice(0,32)){
   const l=TRANSPORT_LINKS.find(l=>l.id===f.link);if(l.type==='bridge'&&assetState(s,l.id).condition<15)continue;
   const a=DISTRICTS[l.regions[0]===f.from?l.a:l.b],b=DISTRICTS[l.regions[0]===f.from?l.b:l.a],p=samplePolyline([[a.x,a.y],[b.x,b.y]],(t*.06+f.from*.137)%1);
   this.art.sprite(ctx,'truck',p.x,p.y,(country?15:24)/this.scale,p.angle*Math.PI/180,.8);
  }
  if(this.routePlan)this.line(ctx,this.routePlan.path.map(id=>[DISTRICTS[id].x,DISTRICTS[id].y]),'#f9cf6f',3,[6,6]);
  const encounters=activeConfrontations(s),engaged=new Set(encounters.flatMap(e=>e.operation.battle?.units??[e.unit.id]));
  for(const u of s.units){if(u.status==='training')continue;const p=unitPose(u,this.fraction);if(u.status!=='moving'){const slot=s.units.filter(v=>v.district===u.district&&v.id<u.id&&!['moving','training'].includes(v.status)).length;p.x+=(slot%3)*47/this.scale;p.y+=Math.floor(slot/3)*48/this.scale;}if(u.status==='moving')this.line(ctx,u.path.map(id=>[DISTRICTS[id].x,DISTRICTS[id].y]),'#f5df9b88',1.3,[4,7]);if(engaged.has(u.id))continue;const size=(country?24:42)/this.scale;
   if(close&&u.type!=='intel'){if(!this.art.frame(ctx,'patrol',u.status==='moving'&&this.motion?this.combatTime:0,p.x,p.y,size*1.35,{flip:p.angle>90||p.angle< -90}))this.art.sprite(ctx,u.type,p.x,p.y,size);}
   else this.art.sprite(ctx,u.status==='moving'&&u.type!=='intel'?'jeep':u.type,p.x,p.y+Math.sin(t*1.5+u.id)/this.scale,size,u.status==='moving'?p.angle*Math.PI/180:0);
   if(!country)this.label(ctx,u.name,p.x,p.y-28/this.scale,11);this.hits.push({type:'unit',id:u.id,x:p.x,y:p.y,radius:23,label:`${u.name} · ${u.status}`});}
  for(const o of activeOrders(s).filter(o=>o.kind!=='unit'&&o.type!=='raid')){const d=DISTRICTS[o.district];ctx.beginPath();ctx.arc(d.x,d.y,24/this.scale,-Math.PI/2,-Math.PI/2+progressOf(o,this.fraction)*Math.PI*2);ctx.strokeStyle='#f5cd7f';ctx.lineWidth=3/this.scale;ctx.stroke();}
  for(const e of encounters)this.drawCombat(ctx,e);
  if(this.motion){for(let i=0;i<(country?5:2);i++){const r=country?REGIONS[i*7]:REGIONS[this.activeRegion??0],x=r.x+((t*10+i*300)%1200),y=r.y+170+i*100;this.art.sprite(ctx,'cloud',x,y,(country?165:120)/this.scale,0,.18);}if(!country){const r=REGIONS[this.activeRegion??0];this.art.sprite(ctx,'birds',r.x+200+(t*20%700),r.y+180+Math.sin(t)*6,28/this.scale,Math.sin(t*.6)*.1);}}
  const weather=atmosphere(s.seed,s.day);if(weather.night){ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#08262944';ctx.fillRect(0,0,this.canvas.width,this.canvas.height);this.world(ctx);}
  for(const effect of this.effects){if(country)continue;const d=DISTRICTS[effect.district];this.label(ctx,effect.text.toUpperCase(),d.x,d.y-45/this.scale,11,effect.kind==='warning'?'#f0af7e':'#e6ecc0');}
 }
 drawCombat(ctx,e){
  const d=DISTRICTS[e.district],o=e.operation,b=o.battle,p=progressOf(o,this.fraction),phase=tacticalFrame(p),t=this.combatTime,unitNames=(b?.units??[e.unit.id]).map(id=>this.currentState.units.find(u=>u.id===id)?.name).join(' + '),x=d.x,y=d.y,k=1/this.scale;
  ctx.save();ctx.translate(x,y);ctx.fillStyle='#0a302bdc';ctx.strokeStyle='#d8bd7d';ctx.lineWidth=k;ctx.beginPath();ctx.roundRect(-104*k,-73*k,208*k,134*k,10*k);ctx.fill();ctx.stroke();
  this.label(ctx,unitNames,-47*k,-53*k,10,'#e5e4ac');this.label(ctx,NETWORKS[e.network].short,48*k,-53*k,10,'#e9a17c');
  const friendly={x:(-68+phase.advance*18)*k,y:0},enemy={x:45*k,y:0};
  if(!this.art.frame(ctx,'patrol',this.motion?t:0,friendly.x,friendly.y,55*k))this.art.sprite(ctx,e.unit.type,friendly.x,friendly.y,43*k);
  if(!this.art.frame(ctx,'hostile',this.motion?t:0,enemy.x,enemy.y,55*k))this.art.sprite(ctx,'cartel',enemy.x,enemy.y,43*k);
  if(b?.units.length>1)this.art.sprite(ctx,'jeep',friendly.x-10*k,22*k,26*k);
  exchangeFrame(t).forEach((f,i)=>{if(!phase.contact||!this.motion)return;const a=i?enemy:friendly,z=i?friendly:enemy;
   if(f.visible)this.line(ctx,[[a.x+(z.x-a.x)*Math.max(0,f.travel-.18),a.y],[a.x+(z.x-a.x)*f.travel,a.y]],i?'#e79666':'#ffe1a0',2);
   if(f.muzzle>0)this.art.sprite(ctx,'muzzle',a.x,a.y,22*k,0,f.muzzle);if(f.contact>0)this.art.sprite(ctx,'impact',z.x,z.y,30*k,0,f.contact);
  });
  this.art.sprite(ctx,'smoke',15*k,(-13-(t*8%20))*k,32*k,0,this.motion?.3:0);
  this.label(ctx,phase.phase,0,-29*k,9,'#f0d18c');
  const control=b?.control??p*100,escape=b?.escapeRisk??0;ctx.fillStyle='#284b40';ctx.fillRect(-86*k,31*k,172*k,5*k);ctx.fillStyle='#c6d49c';ctx.fillRect(-86*k,31*k,172*k*control/100,5*k);this.label(ctx,`${Math.round(control)}% CONTROL  /  ${Math.round(escape)}% ESCAPE`,0,46*k,9);
  ctx.restore();this.hits.push({type:'district',id:d.id,x,y,radius:100,label:`${TACTICS[b?.tactic??'deliberate'].name} · ${Math.round(control)}% control`});
 }
 drawNeighborhoodLife(ctx,regions){
  const s=this.currentState,t=this.motion?this.ambientTime:0;
  for(const r of regions)for(const d of REGION_DISTRICTS[r.id]){
   if(!this.visible(CELLS[d.id]))continue;const ds=s.districts[d.id],b=cellBounds[d.id];
   ctx.save();canvasPath(ctx,CELLS[d.id]);ctx.clip();
   if(ds.threat<45)for(const n of NEIGHBORHOODS[d.id]){
    const phase=(t*.023+d.id*.119+n.index*.32)%1,x=n.x+(phase-.5)*b.w*.22,y=n.y+18+Math.sin(phase*Math.PI)*6;
    this.art.frame(ctx,'civilian',t,x,y,25/this.scale,{phase:d.id+n.index,alpha:.9,flip:n.index===1});
   }
   if(['forest','mountain','rural','wetland'].includes(terrainAt(s,d.id)))for(let i=0;i<3;i++)this.art.sprite(ctx,'trees',b.x+b.w*(.18+i*.29),b.y+b.h*.76,29/this.scale,Math.sin(t*1.2+i)*.025);
   for(const id of ds.completed.filter(id=>['clinic','school','station','jobs'].includes(id))){const i=['clinic','school','station','jobs'].indexOf(id);this.art.sprite(ctx,['hospital','university','police','commerce'][i],d.x+(i-1.5)*28/this.scale,d.y+44/this.scale,25/this.scale);}
   if(s.economy.projects.some(p=>p.region===r.id)&&d.id===REGIONS[r.id].hub)this.art.sprite(ctx,'construction',d.x+48/this.scale,d.y+30/this.scale,38/this.scale,Math.sin(t*3)*.04);
   ctx.restore();
  }
 }
 frame(now,{visible,fraction=0}){this.canvas.dataset.active=String(visible);if(!visible)return;const dt=Math.min(.1,Math.max(0,(now-(this.lastFrame||now))/1000));this.lastFrame=now;this.fraction=fraction;if(this.motion){this.ambientTime+=dt;if(this.currentState&&!this.currentState.paused&&!this.currentState.pendingEvent&&!this.currentState.outcome)this.combatTime+=dt;}this.effects=this.effects.filter(e=>this.ambientTime-e.born<4);if(this.motion||this.backgroundDirty||this.currentState&&!this.currentState.paused)this.paint();}
}

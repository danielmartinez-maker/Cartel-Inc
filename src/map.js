import {DISTRICTS,TERRAIN,LANDS,NETWORKS,REGIONS,MAP,TRANSPORT_LINKS} from './data.js';
import {CELLS,polygonPath} from './geography.js';
import {ART} from './assets.js';
import {movementPlan,dominantNetwork} from './engine.js';
import {ConfrontationLayer} from './confrontation.js';
import {CIVILIAN_ROUTES,SEA_ROUTES,roadIsActive,samplePolyline,unitPose,progressOf,atmosphere,projectDistrict,campaignSnapshot,campaignMilestones} from './world.js';

const ns='http://www.w3.org/2000/svg';
const node=(tag,attrs={},content='')=>{const n=document.createElementNS(ns,tag);for(const [key,value]of Object.entries(attrs))n.setAttribute(key,value);n.innerHTML=content;return n;};
const hash=(a,b)=>{const n=Math.sin(a*127.1+b*311.7)*43758.5453;return n-Math.floor(n);};
export class ProvinceMap{
  constructor(element,onSelect,onUnit,onPreview=()=>{}){
    this.element=element;this.onSelect=onSelect;this.onUnit=onUnit;this.layer='control';this.zoom=1;this.center=[MAP.width/2,MAP.height/2];
    this.onPreview=onPreview;this.motion=true;this.ambientTime=0;this.effectTime=0;this.lastFrame=0;
    this.unitViews=new Map();this.ringViews=new Map();this.effects=[];this.dispatchUnit=null;this.previewDestination=null;
    element.innerHTML=`<svg id="province-map" viewBox="0 0 ${MAP.width} ${MAP.height}" role="group" aria-label="Five-province mandate. Select one of 120 districts for information and orders.">
      <defs>
        <pattern id="sea-grid" width="90" height="90" patternUnits="userSpaceOnUse"><path d="M90 0H0V90" fill="none" stroke="#a5b89a" stroke-opacity=".08" stroke-width="1"/></pattern>
        <pattern id="contested" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="9" stroke="#9b5944" stroke-width="1" opacity=".18"/></pattern>
        <clipPath id="land-clip"><path d="${LANDS.map(polygonPath).join(' ')}"/></clipPath>
        <mask id="sea-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="${MAP.width}" height="${MAP.height}"><rect width="100%" height="100%" fill="white"/><path d="${LANDS.map(polygonPath).join(' ')}" fill="black"/></mask>
        ${CELLS.map((p,i)=>`<clipPath id="clip-${i}"><path d="${polygonPath(p)}"/></clipPath>`).join('')}
      </defs>
      <rect class="ocean" x="-2000" y="-2000" width="7300" height="5900" fill="#0b3632"/>
      <rect width="${MAP.width}" height="${MAP.height}" fill="url(#sea-grid)"/>
      <g class="sea-life" mask="url(#sea-mask)" pointer-events="none" aria-hidden="true"><g id="harbor-boats">${SEA_ROUTES.map((_,i)=>`<g class="harbor-boat" data-boat="${i}"><path class="boat-wake" d="M-22-4L-10-2M-25 4L-10 2"/><path class="boat-hull" d="M-8-3H7L10 0 7 3H-8Z"/><path class="boat-sail" d="M-2-1L-2-9 5-1Z"/></g>`).join('')}</g></g>
      <g class="transport-corridors" pointer-events="none">${TRANSPORT_LINKS.map(({a,b,days})=>`<path d="M${DISTRICTS[a].x} ${DISTRICTS[a].y}L${DISTRICTS[b].x} ${DISTRICTS[b].y}"><title>Transport corridor · ${days} days</title></path>`).join('')}</g>
      <path d="${LANDS.map(polygonPath).join(' ')}" fill="#dfc497" stroke="#eacb90" stroke-width="5"/>
      <image class="province-art" href="${ART.province}" width="${MAP.width}" height="${MAP.height}" preserveAspectRatio="none" clip-path="url(#land-clip)" pointer-events="none"/>
      <g id="districts"></g><g id="terrain" pointer-events="none"></g>
      <g class="civilian-traffic" clip-path="url(#land-clip)" pointer-events="none" aria-hidden="true">${CIVILIAN_ROUTES.map((r,i)=>`<g data-traffic="${i}"><path class="civilian-link" d="M${r.points.map(p=>p.join(',')).join('L')}"/><g class="civilian-vehicle"><path class="vehicle-trail" d="M-10 0H-3"/><rect x="-3" y="-1.5" width="6" height="3" rx="1"/></g></g>`).join('')}</g>
      <g class="province-atmosphere" pointer-events="none" aria-hidden="true"><rect class="world-shade" width="${MAP.width}" height="${MAP.height}" clip-path="url(#land-clip)"/>
        <g class="clouds" clip-path="url(#land-clip)">${Array.from({length:10},(_,i)=>`<g class="cloud-bank" data-cloud="${i}"><path d="M-100 0Q-110-13-78-15Q-65-36-26-22Q-5-46 32-25Q62-36 73-15Q112-17 108 0Z"/><path d="M-75 5Q-30 14 84 5"/></g>`).join('')}</g>
        <g class="rain-streaks" clip-path="url(#land-clip)">${Array.from({length:90},(_,i)=>`<path class="rain-streak" d="M${170+(i*137)%2900} ${110+(i*167)%1650}l-4 13" style="animation-delay:-${i*.13}s"/>`).join('')}</g>
        <g class="bird-flocks">${REGIONS.map((_,i)=>`<g class="bird-flock" data-flock="${i}">${[[-9,2],[0,0],[10,5]].map(([x,y])=>`<path class="bird-wing" transform="translate(${x} ${y})" d="M-4 0Q-2-3 0 0Q2-3 4 0"/>`).join('')}</g>`).join('')}</g>
      </g>
      <g id="service-markers" pointer-events="none"></g><g id="work-markers" pointer-events="none"></g><g id="settlements" pointer-events="none"></g>
      <g class="town-lights" pointer-events="none" aria-hidden="true">${DISTRICTS.filter(d=>['urban','capital','port'].includes(d.terrain)).map(d=>`<g transform="translate(${d.x} ${d.y})">${[[12,-12],[20,-7],[-15,-9],[-10,8]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="1.6"/>`).join('')}</g>`).join('')}</g>
      <g class="region-labels" pointer-events="none">${REGIONS.map(r=>`<text x="${r.x+600}" y="${r.y+765}" text-anchor="middle">${r.name.toUpperCase()}<tspan x="${r.x+600}" dy="27">24 DISTRICTS / ${r.subtitle.toUpperCase()}</tspan></text>`).join('')}</g>
      <g id="unit-paths" pointer-events="none"></g><path id="route-preview-line" pointer-events="none" hidden/><g id="units"></g><g id="map-effects" pointer-events="none" aria-hidden="true"></g>
    </svg>`;
    this.svg=element.querySelector('svg');
    this.confrontations=new ConfrontationLayer(this.svg);
    this.svg.querySelector('.province-art').addEventListener('load',()=>this.svg.classList.add('map-art-ready'));
    this.svg.querySelector('.province-art').addEventListener('error',()=>this.svg.classList.remove('map-art-ready'));
    const groups=this.svg.querySelector('#districts');
    this.cells=DISTRICTS.map(d=>{
      const g=node('g',{'data-district':d.id,role:'button',tabindex:0,'aria-label':d.name,class:'district'});
      g.append(node('path',{d:polygonPath(CELLS[d.id]),class:'district-fill',fill:TERRAIN[d.terrain].fill}));
      g.append(node('path',{d:polygonPath(CELLS[d.id]),class:'threat-fill',fill:'url(#contested)',opacity:0}));
      g.append(node('path',{d:polygonPath(CELLS[d.id]),class:'district-border',fill:'none'}));
      g.addEventListener('click',()=>{if(!this.wasDragged)onSelect(d.id);});
      g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(d.id);}});
      g.addEventListener('pointerenter',()=>this.previewRoute(d.id));
      g.addEventListener('focus',()=>this.previewRoute(d.id));
      g.addEventListener('pointerleave',()=>this.previewRoute(null));
      g.addEventListener('blur',()=>this.previewRoute(null));
      groups.append(g);return g;
    });
    this.traffic=[...this.svg.querySelectorAll('[data-traffic]')].map((group,i)=>({group,vehicle:group.querySelector('.civilian-vehicle'),route:CIVILIAN_ROUTES[i]}));
    this.boats=[...this.svg.querySelectorAll('[data-boat]')];this.clouds=[...this.svg.querySelectorAll('[data-cloud]')];this.flocks=[...this.svg.querySelectorAll('[data-flock]')];
    for(const d of DISTRICTS){
      const g=node('g',{'clip-path':`url(#clip-${d.id})`});
      for(let i=0;i<(d.terrain==='mountain'?20:d.terrain==='forest'?18:8);i++){
        const x=d.x-90+hash(d.id,i)*180,y=d.y-90+hash(i,d.id+32)*180;
        if(Math.hypot(x-d.x,y-d.y)<40)continue;
        if(d.terrain==='mountain')g.append(node('path',{d:`M${x-9} ${y+6}l9-16 9 16m-13-7l4 2 3-4`,class:'terrain-mountain'}));
        else if(d.terrain==='forest')g.append(node('path',{d:`M${x} ${y+6}v-5m-5 0l5-9 5 9Z`,class:'terrain-tree'}));
        else if(d.terrain==='rural')g.append(node('path',{d:`M${x-8} ${y}l12-4m-10 8l12-4m-10 8l12-4`,class:'terrain-field'}));
      }
      this.svg.querySelector('#terrain').append(g);
    }
    this.markers=DISTRICTS.map(d=>{
      const g=node('g',{transform:`translate(${d.x} ${d.y})`,class:'settlement'});
      const capital=d.id===9;
      g.innerHTML=`<circle class="district-aura" r="${capital?26:22}"/><circle class="district-hub" r="${capital?10:6}"/>${capital?'<path d="M-4 0l3 3 5-6" class="hq-mark"/>':''}<text class="district-name" text-anchor="middle" y="${capital?32:26}">${d.name.toUpperCase()}</text><g class="population-dots" transform="translate(-16 37)">${Array.from({length:6},(_,i)=>`<circle cx="${i*6.5}" r="1.6"/>`).join('')}</g><g class="enemy-dots" transform="translate(-12 -17)"></g><g class="op-indicator" transform="translate(26 -5)"></g>`;
      this.svg.querySelector('#settlements').append(g);return g;
    });
    let drag=null;
    this.svg.addEventListener('pointerdown',e=>{this.wasDragged=false;if(e.button===0){drag={x:e.clientX,y:e.clientY,center:[...this.center]};}});
    this.svg.addEventListener('pointermove',e=>{
      if(!drag||this.zoom===1)return;
      const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
      if(Math.hypot(dx,dy)<5)return;this.wasDragged=true;
      const ratio=MAP.width/this.svg.getBoundingClientRect().width/this.zoom;
      this.center=[Math.max(0,Math.min(MAP.width,drag.center[0]-dx*ratio)),Math.max(0,Math.min(MAP.height,drag.center[1]-dy*ratio))];this.setView();
    });
    window.addEventListener('pointerup',()=>{drag=null;});this.setView();
  }
  setView(){
    const w=MAP.width/this.zoom,h=MAP.height/this.zoom;
    this.svg.classList.toggle('country-view',this.zoom<2.2);
    const region=this.zoom<2.2?null:REGIONS.reduce((a,b)=>Math.hypot(a.x+600-this.center[0],a.y+400-this.center[1])<Math.hypot(b.x+600-this.center[0],b.y+400-this.center[1])?a:b).id;
    this.onView?.(region);
    this.svg.setAttribute('viewBox',`${this.center[0]-w/2} ${this.center[1]-h/2} ${w} ${h}`);
  }
  setZoom(delta){this.zoom=Math.max(1,Math.min(5,this.zoom+delta));if(this.zoom===1)this.center=[MAP.width/2,MAP.height/2];this.setView();return this.zoom;}
  fit(){this.zoom=1;this.center=[MAP.width/2,MAP.height/2];this.setView();}
  focusRegion(id){const r=REGIONS[id];if(!r)return;this.zoom=2.65;this.center=[r.x+600,r.y+400];this.setView();}
  setMotion(enabled){this.motion=enabled;this.svg.dataset.motion=String(enabled);this.confrontations.setMotion(enabled);if(!enabled){this.effects.forEach(e=>e.element.remove());this.effects=[];}}
  previewRoute(destination){
    this.previewDestination=destination;const line=this.svg.querySelector('#route-preview-line');
    const plan=this.dispatchUnit!==null&&destination!==null&&this.currentState?movementPlan(this.currentState,this.dispatchUnit,destination):null;
    line.hidden=!plan?.ok;line.setAttribute('visibility',plan?.ok?'visible':'hidden');
    if(plan?.ok)line.setAttribute('d','M'+plan.path.map(id=>`${DISTRICTS[id].x},${DISTRICTS[id].y}`).join('L'));
    this.onPreview(plan,destination);
  }
  render(s,selected,layer='control',{fraction=0,dispatchUnit=null}={}){
    this.layer=layer;
    this.svg.dataset.layer=layer;
    if(this.currentState!==s){this.previous=null;this.effects.forEach(e=>e.element.remove());this.effects=[];}
    const snapshot=campaignSnapshot(s);
    const resolvedRaids=new Set((this.previous?.operations||[]).filter(o=>o.type==='raid'&&!snapshot.operations.some(n=>n.district===o.district)).map(o=>o.district));
    if(this.motion)for(const event of campaignMilestones(this.previous,snapshot))if(!resolvedRaids.has(event.district))this.addMilestone(event);
    this.previous=snapshot;this.currentState=s;this.dispatchUnit=dispatchUnit;
    this.svg.classList.toggle('dispatching',dispatchUnit!==null);
    this.svg.dataset.running=String(!s.paused&&!s.outcome&&s.pendingEvent===null);
    const weather=atmosphere(s.seed,s.day);this.svg.dataset.night=String(weather.night);this.svg.dataset.rain=String(weather.rain);
    this.svg.querySelector('.world-shade').style.opacity=weather.shade;
    for(const traffic of this.traffic){traffic.active=roadIsActive(s,traffic.route);traffic.group.setAttribute('visibility',traffic.active?'visible':'hidden');}
    for(const d of s.districts){
      const g=this.cells[d.id],def=DISTRICTS[d.id],stable=d.stability>=75&&d.support>=60&&d.threat<8;
      let color=TERRAIN[def.terrain].fill;
      if(layer==='support')color=`hsl(${39+d.support*1.08} 30% ${79-d.support*0.22}%)`;
      if(layer==='intelligence')color=`hsl(${148+d.intel*0.36} ${20+d.intel*0.17}% ${81-d.intel*0.33}%)`;
      if(layer==='control'&&stable)color='#8daf93';
      if(layer==='control'&&d.threat>=25)color='#c9976d';
      g.classList.toggle('selected',d.id===selected);g.classList.toggle('hostile',d.threat>=25);
      g.classList.toggle('stabilized',stable);
      g.setAttribute('aria-pressed',d.id===selected?'true':'false');
      g.setAttribute('aria-label',`${def.name}. ${stable?'Stabilized':d.threat>=25?'Cartel presence':'Unsecured'}. Support ${Math.floor(d.support)} percent. Intelligence ${Math.floor(d.intel)} percent.`);
      if(dispatchUnit!==null){const plan=movementPlan(s,dispatchUnit,d.id);g.setAttribute('aria-label',`${def.name}. ${plan.message}`);}
      g.querySelector('.district-fill').setAttribute('fill',color);
      g.querySelector('.threat-fill').setAttribute('opacity',d.threat>=25?0.7:0);
      const m=this.markers[d.id];m.classList.toggle('selected',d.id===selected);
      m.querySelector('.district-aura').setAttribute('class',`district-aura ${d.id===selected?'active':stable?'stable':''}`);
      m.querySelector('.district-hub').setAttribute('fill',d.id===9?'#134d3c':d.threat>=25?'#a35230':stable?'#326f4c':'#fff0c5');
      m.querySelector('.population-dots').setAttribute('fill',stable?'#246147':d.threat>=25?'#9d4d2c':'#405a40');
      m.querySelector('.enemy-dots').innerHTML=d.threat>=12?Array.from({length:Math.min(5,Math.ceil(d.threat/12))},(_,i)=>`<circle cx="${i*6.5}" r="2.8" fill="${NETWORKS[dominantNetwork(d)].color}" stroke="#f0d8ba" stroke-width=".6"/>`).join(''):'';
      const dots=m.querySelector('.enemy-dots');dots.classList.toggle('active-cell',d.threat>=25);
    }
    const services=s.districts.map(d=>`${d.id}:${d.services}:${d.completed.join(',')}`).join('|');
    if(services!==this.serviceSignature){
      this.serviceSignature=services;
      this.svg.querySelector('#service-markers').innerHTML=s.districts.filter(d=>d.services||d.completed.includes('station')).map(d=>{
        const def=DISTRICTS[d.id],station=d.completed.includes('station');
        return `<g class="service-stamp" transform="translate(${def.x-22} ${def.y-10})"><title>${def.name}: ${d.services} civilian services${station?', police station':''}</title><circle r="7"/><path d="${station?'M-3-4H3V0L0 4-3 0Z':'M-3 0L-1 2 4-3'}"/></g>`;
      }).join('');
    }
    this.renderWork(s);
    const routes=this.svg.querySelector('#unit-paths'),units=this.svg.querySelector('#units');
    const visible=new Set();
    const counts={};
    for(const u of s.units){
      if(u.status==='training')continue;
      visible.add(u.id);let view=this.unitViews.get(u.id);
      if(!view){
        const g=node('g',{role:'button',tabindex:0,'data-unit':u.id});
        const symbol=u.type==='intel'?'<circle r="3" fill="none" stroke="#f3e9cd"/><path d="M3 3l3 3" stroke="#f3e9cd"/>':u.type==='federal'?'<path d="M-4-3h8v4l-4 4-4-4Z" fill="none" stroke="#f3e9cd" stroke-width="1.2"/>':'<circle r="3" fill="#f3e9cd"/>';
        g.innerHTML=`<circle r="14" class="unit-beacon"/><circle r="10" class="unit-shadow"/><circle r="8.5" class="unit-body"/>${symbol}<text class="unit-map-label" y="-18" text-anchor="middle"></text>`;
        g.querySelector('.unit-map-label').textContent=u.name;
        g.addEventListener('click',e=>{e.stopPropagation();this.onUnit(u.id);});
        g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();this.onUnit(u.id);}});
        const route=node('path',{class:'unit-route'});routes.append(route);units.append(g);view={element:g,route};this.unitViews.set(u.id,view);
      }
      view.unit=u;view.slot=counts[u.district]||0;if(u.status!=='moving')counts[u.district]=view.slot+1;
      view.element.setAttribute('class',`map-unit ${u.type} ${u.status}`);
      view.element.setAttribute('aria-label',`${u.name}, ${u.type} unit, ${u.status}`);
      view.route.setAttribute('visibility',u.status==='moving'?'visible':'hidden');
      if(u.status==='moving')view.route.setAttribute('d','M'+u.path.map(id=>`${DISTRICTS[id].x},${DISTRICTS[id].y}`).join('L'));
    }
    for(const [id,view]of this.unitViews)if(!visible.has(id)){view.element.remove();view.route.remove();this.unitViews.delete(id);}
    this.confrontations.sync(s,this.unitViews);
    const engagedDistricts=this.confrontations.districts,engagedUnits=this.confrontations.units;
    this.markers.forEach((marker,id)=>marker.classList.toggle('engaged',engagedDistricts.has(id)));
    for(const [id,view]of this.unitViews)view.element.classList.toggle('engaged',engagedUnits.has(id));
    for(const view of this.ringViews.values())view.element.classList.toggle('has-confrontation',view.item.type==='raid'&&engagedDistricts.has(view.item.district));
    this.updateOrders(this.motion?fraction:0);this.previewRoute(this.previewDestination);
  }
  renderWork(s){
    const projectCounts={};
    const items=[...s.operations.map(o=>({item:o,key:`op-${o.district}`,district:o.district,type:o.type,radius:17})),
      ...s.projects.map(p=>{const district=projectDistrict(p),slot=projectCounts[district]||0;projectCounts[district]=slot+1;return {item:p,key:`project-${p.id}-${p.district}`,district,type:'project',radius:24+slot*5};})];
    const keys=new Set(items.map(i=>i.key));
    for(const [key,view]of this.ringViews)if(!keys.has(key)){view.element.remove();this.ringViews.delete(key);}
    for(const item of items){
      let view=this.ringViews.get(item.key);
      if(!view){
        const def=DISTRICTS[item.district],g=node('g',{class:`work-marker work-${item.type}`,transform:`translate(${def.x} ${def.y})`});
        g.innerHTML=`<circle class="work-ring-base" r="${item.radius}"/><circle class="work-ring-fill" r="${item.radius}" pathLength="100" transform="rotate(-90)"/><g class="work-sweep"><path d="M0 0L0-15A15 15 0 0 1 15 0Z"/></g><circle class="work-spark" r="2.5" cy="-${item.radius}"/>`;
        this.svg.querySelector('#work-markers').append(g);view={element:g,ring:g.querySelector('.work-ring-fill')};this.ringViews.set(item.key,view);
      }
      view.item=item.item;view.element.querySelectorAll('.work-ring-base,.work-ring-fill').forEach(c=>c.setAttribute('r',item.radius));view.element.querySelector('.work-spark').setAttribute('cy',-item.radius);
    }
  }
  updateOrders(fraction){
    for(const view of this.unitViews.values()){
      const pose=unitPose(view.unit,fraction,view.slot);view.element.setAttribute('transform',`translate(${pose.x.toFixed(2)} ${pose.y.toFixed(2)})`);
    }
    for(const view of this.ringViews.values())view.ring.setAttribute('stroke-dasharray',`${(progressOf(view.item,fraction)*100).toFixed(2)} 100`);
  }
  addMilestone(event){
    this.effects=this.effects.filter(effect=>{if(effect.district===event.district){effect.element.remove();return false;}return true;});
    const d=DISTRICTS[event.district],g=node('g',{class:`map-milestone ${event.kind}`,transform:`translate(${d.x} ${d.y})`});
    g.append(node('circle',{class:'milestone-wave',r:12}));
    const width=Math.max(110,event.text.length*6.2+20);
    const label=node('g',{class:'milestone-label'});label.append(node('rect',{x:-width/2,y:-48,width,height:20,rx:2}));label.append(node('text',{x:0,y:-35,'text-anchor':'middle'},event.text));g.append(label);
    this.svg.querySelector('#map-effects').append(g);this.effects.push({element:g,born:this.effectTime,district:event.district});
    while(this.effects.length>12)this.effects.shift().element.remove();
  }
  frame(now,{visible,fraction=0}){
    if(this.svg.dataset.active!==String(visible))this.svg.dataset.active=String(visible);
    if(!visible)this.confrontations.suspend();
    if(!visible||!this.motion||now-this.lastFrame<32)return;
    const delta=Math.min(100,now-(this.lastFrame||now))/1000;this.lastFrame=now;
    this.ambientTime+=delta;this.effectTime+=delta;
    const time=this.ambientTime;
    for(const {vehicle,route,active}of this.traffic)if(active){
      const t=(time/(15+route.a%7)+route.phase)%1,pose=samplePolyline(route.points,t);
      vehicle.setAttribute('transform',`translate(${pose.x.toFixed(1)} ${pose.y.toFixed(1)}) rotate(${pose.angle.toFixed(1)})`);
      vehicle.style.opacity=Math.min(1,t*12,(1-t)*12);
    }
    this.boats.forEach((boat,i)=>{const t=(time/(48+i*9)+i*.29)%1,p=samplePolyline(SEA_ROUTES[i],t);boat.setAttribute('transform',`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${p.angle.toFixed(1)})`);boat.style.opacity=Math.min(.9,t*10,(1-t)*10);});
    this.clouds.forEach((cloud,i)=>{const r=REGIONS[Math.floor(i/2)];cloud.setAttribute('transform',`translate(${r.x+100+((time*(4+i%2)+i*330)%1000)} ${r.y+180+(i%2)*300}) scale(1.4 .8)`);});
    this.flocks.forEach((flock,i)=>{const r=REGIONS[i];flock.setAttribute('transform',`translate(${r.x+170+((time*(7+i)+i*295)%850)} ${r.y+175+Math.sin(time*.22+i)*35})`);});
    this.updateOrders(fraction);
    this.confrontations.frame(delta,{visible,running:this.svg.dataset.running==='true'});
    this.effects=this.effects.filter(effect=>{if(this.effectTime-effect.born>4){effect.element.remove();return false;}return true;});
  }
}

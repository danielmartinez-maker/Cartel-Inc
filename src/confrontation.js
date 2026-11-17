import {DISTRICTS,NETWORKS,MANDATE_DAYS,MAX_UNITS} from './data.js';
import {bounded,progressOf,unitPose} from './world.js';

export const RESULT_LABELS=Object.freeze({cleared:'CELL CONTAINED',suppressed:'CELL WEAKENED',evaded:'CELL EVADED'});
export const encounterKey=e=>`${e.day}:${e.district}:${e.unit}:${e.result}`;
export function activeConfrontations(s){
  return s.operations.filter(o=>o.type==='raid'&&(s.districts[o.district]?.cells?.[o.network]??s.districts[o.district]?.threat)>0).flatMap(o=>{
    const unit=s.units.find(u=>u.id===o.unit&&u.type!=='intel'&&u.status==='operating'&&u.district===o.district);
    if(!unit)return [];
    return [{key:`${o.district}:${o.unit}:${s.day-(o.total-o.remaining)}`,district:o.district,unit,operation:o,network:o.network??DISTRICTS[o.district].network,
      members:Math.max(1,Math.min(5,Math.ceil((s.districts[o.district].cells?.[o.network]??s.districts[o.district].threat)/12)))}];
  });
}
export function encounterResults(log){
  return log.filter(l=>Number.isInteger(l.day)&&l.day>=0&&l.day<=MANDATE_DAYS&&l.encounter&&Object.hasOwn(RESULT_LABELS,l.encounter.result)&&Number.isInteger(l.encounter.district)&&DISTRICTS[l.encounter.district]&&Number.isInteger(l.encounter.unit)&&l.encounter.unit>0)
    .map(l=>({day:l.day,...l.encounter}));
}
// Bursts illustrate an active confrontation; they are not per-hit damage events.
// A dust contact occurs after its tracer travels, with a quiet interval between sides.
export function exchangeFrame(seconds){
  const cycle=((seconds%1.8)+1.8)%1.8;
  return ['security','cartel'].map((side,i)=>{
    const age=cycle-(i ? .99 : .09),travel=.3;
    return {side,travel:bounded(age/travel),visible:age>=0&&age<travel,
      muzzle:age>=0&&age<.14?1-age/.14:0,contact:age>=travel&&age<travel+.32?1-(age-travel)/.32:0};
  });
}
export class EncounterTimeline{
  constructor(){this.seconds=0;}
  step(delta,{visible,running,motion}){if(visible&&running&&motion)this.seconds+=Math.max(0,Math.min(.1,delta));return this.seconds;}
}
const ns='http://www.w3.org/2000/svg';
const svg=(tag,attrs={})=>{const n=document.createElementNS(ns,tag);for(const [key,value]of Object.entries(attrs))n.setAttribute(key,value);return n;};
const setPose=(element,x,y)=>element.setAttribute('transform',`translate(${x.toFixed(2)} ${y.toFixed(2)})`);
const formation=[[-25,-22],[-34,-15],[-18,-31],[-39,-29],[-16,-13]];

export class ConfrontationLayer{
  constructor(parent){
    this.parent=parent;this.views=new Map();this.results=new Map();this.seen=new Set();this.state=null;this.motion=true;
    this.layer=svg('g',{id:'confrontations','pointer-events':'none'});parent.append(this.layer);
  }
  reset(){for(const v of [...this.views.values(),...this.results.values()])v.element.remove();this.views.clear();this.results.clear();this.seen.clear();}
  setMotion(enabled){this.motion=enabled;if(!enabled){for(const v of this.results.values())v.element.remove();this.results.clear();}this.paint();}
  suspend(){for(const v of this.results.values())v.element.remove();this.results.clear();}
  sync(state,unitViews){
    const reports=encounterResults(state.log);
    if(this.state!==state){this.reset();this.seen=new Set(reports.map(encounterKey));this.state=state;}
    for(const event of reports.filter(e=>!this.seen.has(encounterKey(e))).reverse())if(this.motion)this.addResult(event);
    this.seen=new Set(reports.map(encounterKey));
    const models=activeConfrontations(state),keys=new Set(models.map(m=>m.key));
    for(const [key,view]of this.views)if(!keys.has(key)){view.element.remove();this.views.delete(key);}
    for(const model of models){
      let view=this.views.get(model.key);
      if(!view){view=this.createView(model);this.views.set(model.key,view);}
      const district=DISTRICTS[model.district],pose=unitPose(model.unit,0,unitViews.get(model.unit.id)?.slot||0);
      view.model=model;view.friendly={x:pose.x-district.x,y:pose.y-district.y-3};
      view.element.setAttribute('aria-label',`${model.unit.name} confronting ${NETWORKS[model.network].name} in ${district.name}`);
      view.element.style.setProperty('--cartel-color',NETWORKS[model.network].color);
      view.element.querySelector('.encounter-unit-name').textContent=model.unit.name;
      view.element.querySelector('.encounter-pressure').setAttribute('stroke-dasharray',`${progressOf(model.operation)*100} 100`);
      view.enemies.forEach((e,i)=>{e.style.display=i<model.members?'':'none';});
    }
    this.paint();
  }
  createView(model){
    const d=DISTRICTS[model.district],g=svg('g',{class:'confrontation',role:'img','data-encounter':model.key,transform:`translate(${d.x} ${d.y})`});
    g.innerHTML=`<ellipse class="encounter-ground" cx="3" cy="-8" rx="57" ry="33"/>
      <path class="encounter-pressure-base" d="M-48 7Q-54-46 5-45Q65-43 65 11"/>
      <path class="encounter-pressure" d="M-48 7Q-54-46 5-45Q65-43 65 11" pathLength="100"/>
      <g class="encounter-members">${formation.map(()=>'<g class="cartel-member"><circle class="member-shadow" r="4.4"/><circle r="3.1"/><path d="M-2 0H2"/></g>').join('')}</g>
      <g class="encounter-security">${[0,1,2].map(()=>'<g class="security-member"><circle r="3.2"/><path d="M-1.5 0L0 1.5 2-1"/></g>').join('')}</g>
      <g class="exchange exchange-security"><path class="encounter-tracer"/><circle class="encounter-muzzle" r="3"/><g class="encounter-contact"><circle r="4"/><path d="M-6-2L-3-1M3-4L5-6M3 3L6 5"/></g></g>
      <g class="exchange exchange-cartel"><path class="encounter-tracer"/><circle class="encounter-muzzle" r="3"/><g class="encounter-contact"><circle r="4"/><path d="M-6-2L-3-1M3-4L5-6M3 3L6 5"/></g></g>
      <text class="encounter-caption" x="5" y="-51" text-anchor="middle">CONFRONTATION</text><text class="encounter-unit-name" x="44" y="23" text-anchor="middle"></text>`;
    this.layer.append(g);
    return {element:g,model,timeline:new EncounterTimeline(),friendly:{x:29,y:-2},enemies:[...g.querySelectorAll('.cartel-member')],allies:[...g.querySelectorAll('.security-member')],exchanges:[...g.querySelectorAll('.exchange')].map(e=>({element:e,tracer:e.querySelector('.encounter-tracer'),muzzle:e.querySelector('.encounter-muzzle'),contact:e.querySelector('.encounter-contact')}))};
  }
  addResult(event){
    const d=DISTRICTS[event.district],key=encounterKey(event),g=svg('g',{class:`confrontation-result result-${event.result}`,transform:`translate(${d.x} ${d.y})`,role:'img','aria-label':`${d.name}: ${RESULT_LABELS[event.result].toLowerCase()}`,'data-encounter-result':event.result});
    const previous=[...this.views.values()].find(v=>v.model.district===event.district&&v.model.unit.id===event.unit);
    g.innerHTML=`<circle class="resolution-ring" r="20"/><g class="resolution-dots">${formation.slice(0,previous?.model.members||1).map(([x,y])=>`<circle cx="${x}" cy="${y}" r="3"/>`).join('')}</g><g class="resolution-label"><rect x="-62" y="-52" width="124" height="20" rx="2"/><text y="-38" text-anchor="middle"></text></g>`;
    g.querySelector('text').textContent=RESULT_LABELS[event.result];this.layer.append(g);
    // A district keeps only its latest outcome, with a hard province-wide cap.
    for(const [oldKey,view]of this.results)if(view.event.district===event.district){view.element.remove();this.results.delete(oldKey);}
    this.results.set(key,{element:g,event,timeline:new EncounterTimeline(),dots:g.querySelector('.resolution-dots'),ring:g.querySelector('.resolution-ring')});
    while(this.results.size>MAX_UNITS){const key=this.results.keys().next().value;this.results.get(key).element.remove();this.results.delete(key);}
  }
  paint(){
    for(const view of this.views.values()){
      const time=view.timeline.seconds,wave=this.motion?Math.sin(time*3):0,origin=view.friendly;
      view.enemies.forEach((e,i)=>{const [x,y]=formation[i];setPose(e,x+wave*(i%2?1.4:-1.4),y+wave*.7);});
      view.allies.forEach((e,i)=>setPose(e,origin.x-9+i*6+wave*.7,origin.y-9+(i%2)*15));
      exchangeFrame(time).forEach((sample,i)=>{
        const v=view.exchanges[i],source=i?{x:-25,y:-22}:origin,target=i?origin:{x:-25,y:-22};
        const point=t=>[source.x+(target.x-source.x)*t,source.y+(target.y-source.y)*t];
        const a=point(Math.max(0,sample.travel-.18)),b=point(sample.travel);
        v.tracer.setAttribute('d',`M${a.join(',')}L${b.join(',')}`);v.tracer.style.opacity=this.motion&&sample.visible ? .85 : 0;
        setPose(v.muzzle,source.x,source.y);v.muzzle.style.opacity=this.motion?sample.muzzle*.65:0;
        setPose(v.contact,target.x,target.y);v.contact.style.opacity=this.motion?sample.contact*.6:0;
        v.contact.querySelector('circle').setAttribute('r',4+(1-sample.contact)*5);
      });
    }
    for(const view of this.results.values()){
      const age=view.timeline.seconds,t=bounded(age/3.2),escape=view.event.result==='evaded';
      view.element.style.opacity=Math.min(1,(1-t)*3);view.ring.setAttribute('r',20+t*35);view.ring.style.opacity=1-t;
      view.dots.setAttribute('transform',`translate(${-t*(escape?40:15)} ${-t*(escape?18:5)})`);view.dots.style.opacity=1-t;
    }
  }
  frame(delta,{visible,running}){
    if(!visible){this.suspend();return;}
    for(const view of [...this.views.values(),...this.results.values()])view.timeline.step(delta,{visible,running,motion:this.motion});
    for(const [key,view]of this.results)if(view.timeline.seconds>=3.2){view.element.remove();this.results.delete(key);}
    this.paint();
  }
  get districts(){return new Set([...this.views.values()].map(v=>v.model.district));}
  get units(){return new Set([...this.views.values()].map(v=>v.model.unit.id));}
}

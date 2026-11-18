import {LEGACY_DISTRICTS as DISTRICTS,GOVERNORS,DIFFICULTIES,UNIT_TYPES,INITIATIVES,EVENTS} from './data.js';
import {NEIGHBORS} from './geography.js';
const VERSION=1;
const initiative=id=>INITIATIVES.find(i=>i.id===id);
export function restoreLegacy(text){
  // Imports are data, never executable. Enforce resource limits and all identifiers
  // used by the simulation before permitting a user-provided save to run.
  if(typeof text!=='string'||text.length>300000)throw new Error('This save file is too large.');
  const envelope=JSON.parse(text),s=envelope?.state;
  const assert=(test)=>{if(!test)throw new Error('This save is incompatible or damaged.');};
  const num=(v,lo=0,hi=100)=>typeof v==='number'&&Number.isFinite(v)&&v>=lo&&v<=hi;
  const integer=(v,lo=0,hi=100)=>Number.isInteger(v)&&num(v,lo,hi);
  const ids=(items)=>Array.isArray(items)&&new Set(items.map(d=>d.id)).size===items.length;
  const validProjects=(list,local)=>Array.isArray(list)&&new Set(list).size===list.length&&list.every(id=>INITIATIVES.some(i=>i.id===id&&i.scope===(local?'local':'province')));
  assert(envelope.game==='cartel-containment'&&envelope.version===VERSION&&s?.version===VERSION);
  assert(integer(s.day,0,730)&&integer(s.rng,0,4294967295)&&integer(s.seed,0,4294967295));
  assert(GOVERNORS.some(g=>g.id===s.governor)&&Object.hasOwn(DIFFICULTIES,s.difficulty));
  assert(num(s.money,0,999)&&num(s.trust)&&num(s.corruption)&&num(s.inflation,0,50)&&integer(s.holdDays,0,14));
  assert(typeof s.paused==='boolean'&&typeof s.started==='boolean'&&[1,2,3].includes(s.speed)&&[null,'victory','defeat'].includes(s.outcome));
  assert(ids(s.districts)&&s.districts.length===DISTRICTS.length);
  assert(s.districts.every((d,i)=>d.id===i&&['support','intel','threat','security','stability'].every(k=>num(d[k]))&&integer(d.services,0,10)&&validProjects(d.completed,true)));
  assert(ids(s.networks)&&s.networks.length===3&&s.networks.every((n,i)=>n.id===i&&num(n.funds)&&num(n.evidence)&&typeof n.captured==='boolean'&&typeof n.dismantled==='boolean'&&(!n.dismantled||n.captured)));
  assert(ids(s.units)&&s.units.length>=3&&s.units.length<=6&&integer(s.nextUnitId,4,100));
  assert(s.units.every(u=>integer(u.id,1,99)&&u.id<s.nextUnitId&&typeof u.name==='string'&&u.name.length<=20&&Object.hasOwn(UNIT_TYPES,u.type)&&integer(u.district,0,23)&&['ready','moving','training','operating'].includes(u.status)&&integer(u.remaining,0,100)&&integer(u.total,0,100)&&u.remaining<=u.total&&Array.isArray(u.path)&&u.path.length<=24&&u.path.every((id,i)=>integer(id,0,23)&&(!i||NEIGHBORS[u.path[i-1]].includes(id)))&&(u.status!=='moving'||(u.remaining>0&&u.path.length>=2&&u.path[0]===u.district))&&(u.status!=='training'||u.remaining>0)));
  assert(validProjects(s.completed,false)&&Array.isArray(s.projects)&&s.projects.length<=6);
  assert(s.projects.every(p=>initiative(p.id)&&integer(p.district,0,23)&&integer(p.remaining,1,50)&&integer(p.total,p.remaining,50)));
  assert(new Set(s.projects.map(p=>`${p.id}:${initiative(p.id).scope==='local'?p.district:'all'}`)).size===s.projects.length);
  assert(Array.isArray(s.operations)&&s.operations.length<=24&&new Set(s.operations.map(o=>o.district)).size===s.operations.length);
  assert(s.operations.every(o=>['investigate','raid','interdict','arrest'].includes(o.type)&&integer(o.district,0,23)&&integer(o.network,0,2)&&o.network===DISTRICTS[o.district].network&&integer(o.remaining,1,10)&&integer(o.total,o.remaining,10)&&num(o.power,0,500)&&num(o.chance,0,1)&&(o.type==='investigate'?o.unit===null:s.units.some(u=>u.id===o.unit&&u.status==='operating'&&u.district===o.district&&u.type!=='intel'))));
  assert(s.units.filter(u=>u.status==='operating').every(u=>s.operations.some(o=>o.unit===u.id)));
  assert(integer(s.nextEvent,0,1000)&&integer(s.eventCount,0,100)&&(s.pendingEvent===null||EVENTS.some(e=>e.id===s.pendingEvent)));
  assert(Array.isArray(s.log)&&s.log.length<=70&&s.log.every(l=>integer(l.day,0,730)&&typeof l.text==='string'&&l.text.length<1000&&['info','project','success','warning','decision'].includes(l.kind)));
  assert(s.log.every(l=>l.encounter===undefined||(l.encounter&&typeof l.encounter==='object'&&!Array.isArray(l.encounter)&&integer(l.encounter.district,0,23)&&s.units.some(u=>u.id===l.encounter.unit&&u.type!=='intel')&&['cleared','suppressed','evaded'].includes(l.encounter.result))));
  assert(s.stats&&['raids','arrests','projects','spending'].every(k=>num(s.stats[k],0,100000)));
  s.paused=true;return s;
}

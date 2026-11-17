import {VERSION,DISTRICTS,REGIONS,NETWORKS,GOVERNORS,DIFFICULTIES,UNIT_TYPES,INITIATIVES,EVENTS,MAX_UNITS,MAX_PROJECTS,MANDATE_DAYS} from './data.js';
import {NEIGHBORS} from './geography.js';
import {TRAITS,MEMBER_ROLES,INTENTS,syncThreat} from './cartels.js';
import {createGame} from './simulation.js';
import {restoreLegacy} from './legacy-save.js';
function migrate(text){
  const old=restoreLegacy(text),s=createGame({seed:old.seed,governor:old.governor,difficulty:old.difficulty});
  for(const key of ['day','rng','started','speed','money','trust','corruption','inflation','nextUnitId','nextEvent','pendingEvent','eventCount','completed','log'])s[key]=structuredClone(old[key]);
  s.outcome=old.outcome==='defeat'?'defeat':null;s.paused=true;s.holdDays=0;
  for(const d of old.districts){Object.assign(s.districts[d.id],d);s.districts[d.id].cells=NETWORKS.map(n=>n.id===DISTRICTS[d.id].network?d.threat:0);}
  s.units=old.units.map(u=>({...u,supply:95,readiness:90,fatigue:5}));
  for(const n of old.networks){Object.assign(s.networks[n.id],n);if(n.captured)s.members.find(m=>m.id===`${n.id}-0`).status='captured';if(n.dismantled)for(const m of s.members.filter(m=>m.network===n.id&&m.status==='active'))m.status='defected';if(n.captured&&!n.dismantled)s.networks[n.id].successionAt=s.day+24;}
  for(const d of s.districts)for(const n of s.networks)if(n.dismantled){d.cells[n.id]=0;syncThreat(d);}
  s.projects=old.projects.map(p=>({...p,region:DISTRICTS[p.district].region}));
  s.operations=old.operations.map(o=>({...o,member:o.type==='arrest'?`${o.network}-0`:null}));
  Object.assign(s.stats,old.stats);s.stats.membersCaptured=s.members.filter(m=>m.status==='captured').length;
  s.migration={from:1,legacyOutcome:old.outcome};s.log.unshift({day:s.day,kind:'info',text:'Campaign expanded to five provinces. Your original districts, units and cases have been preserved.'});s.log=s.log.slice(0,100);
  return s;
}
export function validateCampaign(s){
  const assert=test=>{if(!test)throw new Error('This save is incompatible or damaged.');};
  const num=(v,lo=0,hi=100)=>typeof v==='number'&&Number.isFinite(v)&&v>=lo&&v<=hi,integer=(v,lo=0,hi=100)=>Number.isInteger(v)&&num(v,lo,hi);
  const district=id=>integer(id,0,DISTRICTS.length-1),network=id=>integer(id,0,NETWORKS.length-1),ids=list=>Array.isArray(list)&&new Set(list.map(x=>x.id)).size===list.length;
  const completed=(list,scope)=>Array.isArray(list)&&new Set(list).size===list.length&&list.every(id=>INITIATIVES.some(i=>i.id===id&&i.scope===scope));
  assert(s&&s.version===VERSION&&integer(s.day,0,MANDATE_DAYS)&&integer(s.seed,0,4294967295)&&integer(s.rng,0,4294967295));
  assert(GOVERNORS.some(g=>g.id===s.governor)&&Object.hasOwn(DIFFICULTIES,s.difficulty));
  assert(num(s.money,0,9999)&&num(s.trust)&&num(s.corruption)&&num(s.inflation,0,50)&&integer(s.holdDays,0,14)&&typeof s.started==='boolean'&&typeof s.paused==='boolean'&&[1,2,3].includes(s.speed)&&[null,'victory','defeat'].includes(s.outcome));
  assert(ids(s.districts)&&s.districts.length===DISTRICTS.length&&s.districts.every((d,i)=>d.id===i&&['support','intel','threat','security','stability','prosperity','fear','displacement','institutions'].every(k=>num(d[k]))&&integer(d.services,0,10)&&completed(d.completed,'local')&&Array.isArray(d.cells)&&d.cells.length===NETWORKS.length&&d.cells.every(v=>num(v))&&d.cells.reduce((a,b)=>a+b,0)<=100.000001&&Math.abs(d.threat-d.cells.reduce((a,b)=>a+b,0))<.00001));
  assert(ids(s.regions)&&s.regions.length===REGIONS.length&&s.regions.every((r,i)=>r.id===i&&completed(r.completed,'region'))&&completed(s.completed,'province'));
  assert(ids(s.members)&&s.members.length===NETWORKS.length*5&&s.members.every(m=>typeof m.id==='string'&&m.id.length<20&&network(m.network)&&typeof m.name==='string'&&m.name.length>0&&m.name.length<80&&Object.hasOwn(MEMBER_ROLES,m.role)&&Array.isArray(m.traits)&&m.traits.length===2&&new Set(m.traits).size===2&&m.traits.every(t=>Object.hasOwn(TRAITS,t))&&num(m.skill)&&num(m.loyalty)&&num(m.exposure)&&district(m.location)&&['active','captured','defected'].includes(m.status)&&integer(m.watchedUntil,0,MANDATE_DAYS+100)));
  assert(NETWORKS.every(n=>s.members.filter(m=>m.network===n.id).length===5&&s.members.filter(m=>m.network===n.id&&m.role==='leader').length===1));
  assert(ids(s.networks)&&s.networks.length===NETWORKS.length&&s.networks.every((n,i)=>n.id===i&&['funds','evidence','cohesion','heat','logistics'].every(k=>num(n[k]))&&typeof n.captured==='boolean'&&typeof n.dismantled==='boolean'&&s.members.some(m=>m.id===n.leaderId&&m.network===n.id&&m.role==='leader'&&(n.captured?m.status==='captured':m.status==='active'))&&(!n.dismantled||n.captured)&&Object.hasOwn(INTENTS,n.intent)&&district(n.focus)&&integer(n.nextDecision,0,MANDATE_DAYS+200)&&integer(n.successionAt,0,MANDATE_DAYS+100)&&integer(n.successions,0,4)&&Array.isArray(n.aiLog)&&n.aiLog.length<=6&&n.aiLog.every(l=>integer(l.day,0,MANDATE_DAYS)&&Object.hasOwn(INTENTS,l.intent)&&district(l.target)&&typeof l.reason==='string'&&l.reason.length<200)));
  assert(Array.isArray(s.relations)&&s.relations.length===NETWORKS.length&&s.relations.every((row,a)=>Array.isArray(row)&&row.length===NETWORKS.length&&row.every((v,b)=>num(v,-100,100)&&v===s.relations[b]?.[a]&&(a!==b||v===0))));
  assert(Array.isArray(s.pacts)&&s.pacts.length<=36&&new Set(s.pacts.map(p=>`${p.a}:${p.b}`)).size===s.pacts.length&&s.pacts.every(p=>network(p.a)&&network(p.b)&&p.a<p.b&&integer(p.until,0,MANDATE_DAYS+100)));
  assert(ids(s.units)&&s.units.length>=3&&s.units.length<=MAX_UNITS&&integer(s.nextUnitId,4,100));
  assert(s.units.every(u=>integer(u.id,1,99)&&u.id<s.nextUnitId&&typeof u.name==='string'&&u.name.length<=20&&Object.hasOwn(UNIT_TYPES,u.type)&&district(u.district)&&['ready','moving','training','operating'].includes(u.status)&&integer(u.remaining,0,240)&&integer(u.total,u.remaining,240)&&['supply','readiness','fatigue'].every(k=>num(u[k]))&&Array.isArray(u.path)&&u.path.length<=DISTRICTS.length&&u.path.every((id,i)=>district(id)&&(!i||NEIGHBORS[u.path[i-1]].includes(id)))&&(u.status!=='moving'||(u.remaining>0&&u.path.length>=2&&u.path[0]===u.district))&&(u.status!=='training'||u.remaining>0)));
  assert(Array.isArray(s.projects)&&s.projects.length<=MAX_PROJECTS&&s.projects.every(p=>INITIATIVES.some(i=>i.id===p.id)&&district(p.district)&&p.region===DISTRICTS[p.district].region&&integer(p.remaining,1,60)&&integer(p.total,p.remaining,60)));
  assert(new Set(s.projects.map(p=>{const scope=INITIATIVES.find(i=>i.id===p.id).scope;return `${p.id}:${scope==='province'?'all':scope==='region'?p.region:p.district}`;})).size===s.projects.length);
  const operations=['investigate','raid','interdict','arrest','capture','flip','resupply'];
  assert(Array.isArray(s.operations)&&s.operations.length<=DISTRICTS.length&&new Set(s.operations.map(o=>o.district)).size===s.operations.length);
  assert(s.operations.every(o=>operations.includes(o.type)&&district(o.district)&&network(o.network)&&integer(o.remaining,1,10)&&integer(o.total,o.remaining,10)&&num(o.power,0,1000)&&num(o.chance,0,1)&&(['investigate','flip'].includes(o.type)?o.unit===null:s.units.some(u=>u.id===o.unit&&u.status==='operating'&&u.district===o.district&&(o.type==='resupply'||u.type!=='intel')))&&(['arrest','capture','flip'].includes(o.type)?s.members.some(m=>m.id===o.member&&m.network===o.network&&m.location===o.district&&m.status==='active'):o.member===null)));
  assert(s.units.filter(u=>u.status==='operating').every(u=>s.operations.some(o=>o.unit===u.id)));
  assert(integer(s.nextEvent,0,MANDATE_DAYS+100)&&integer(s.eventCount,0,100)&&(s.pendingEvent===null||EVENTS.some(e=>e.id===s.pendingEvent)));
  assert(Array.isArray(s.log)&&s.log.length<=100&&s.log.every(l=>integer(l.day,0,MANDATE_DAYS)&&typeof l.text==='string'&&l.text.length<1000&&['info','project','success','warning','decision'].includes(l.kind)));
  assert(s.log.every(l=>l.encounter===undefined||(l.encounter&&typeof l.encounter==='object'&&!Array.isArray(l.encounter)&&district(l.encounter.district)&&s.units.some(u=>u.id===l.encounter.unit&&u.type!=='intel')&&(l.encounter.network===undefined||network(l.encounter.network))&&['cleared','suppressed','evaded'].includes(l.encounter.result))));
  assert(s.stats&&['raids','arrests','membersCaptured','defections','projects','spending'].every(k=>num(s.stats[k],0,1000000)));
  assert(s.migration===null||(s.migration&&s.migration.from===1&&[null,'victory','defeat'].includes(s.migration.legacyOutcome)));
  return s;
}
export function restore(text){
  if(typeof text!=='string'||text.length>300000)throw new Error('This save file is too large.');const envelope=JSON.parse(text);if(envelope?.game!=='cartel-containment')throw new Error('This save is incompatible or damaged.');
  const s=envelope.version===1?migrate(text):envelope.version===VERSION?envelope.state:null;validateCampaign(s);s.paused=true;return s;
}

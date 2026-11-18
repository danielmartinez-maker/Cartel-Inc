import {VERSION,DISTRICTS,REGIONS,NETWORKS,GOVERNORS,DIFFICULTIES,UNIT_TYPES,INITIATIVES,EVENTS,MAX_UNITS,MAX_PROJECTS,MANDATE_DAYS,MEMBERS_PER_CARTEL,SAVE_LIMIT,PROVINCE_PRIORITIES} from './data.js';
import {NEIGHBORS} from './geography.js';
import {TRAITS,MEMBER_ROLES,INTENTS,STRATEGIES,syncThreat} from './cartels.js';
import {createNeighborhoods,NEIGHBORHOOD_TASKS} from './neighborhoods.js';
import {INFRASTRUCTURE,INFRA_INDEX,INFRA_TASKS,provincialInfrastructure} from './infrastructure.js';
import {findRoute} from './geography.js';
import {restore as restorePrevious} from './compat-v2/saves.js';
import {createGame} from './simulation.js';
import {restoreTravelTimings,routeDuration} from './logistics.js';
import {BRANCH_ACTIONS} from './regional-command.js';

function migrate(text){
 const source=JSON.parse(text),old=restorePrevious(text),s=createGame({seed:old.seed,governor:old.governor,difficulty:old.difficulty});
 for(const key of ['day','rng','started','speed','money','trust','corruption','inflation','nextUnitId','nextEvent','pendingEvent','eventCount','completed','log'])s[key]=structuredClone(old[key]);
 s.outcome=old.outcome==='defeat'?'defeat':null;s.paused=true;s.holdDays=0;
 for(const d of old.districts){Object.assign(s.districts[d.id],structuredClone(d));s.districts[d.id].neighborhoods=createNeighborhoods(s.districts[d.id]);}
 for(const oldMember of old.members){const m=s.members.find(m=>m.id===oldMember.id);if(m)Object.assign(m,structuredClone(oldMember));}
 const usedNames=new Set();for(const m of [...s.members.filter(m=>old.members.some(o=>o.id===m.id)),...s.members.filter(m=>!old.members.some(o=>o.id===m.id))]){if(usedNames.has(m.name))m.name+=` ${m.id}`;usedNames.add(m.name);}
 for(const n of old.networks){const current=s.networks[n.id];Object.assign(current,structuredClone(n));if(current.dismantled)for(const m of s.members.filter(m=>m.network===n.id&&m.status==='active'))m.status='defected';for(const m of s.members.filter(m=>m.network===n.id))if(m.role==='leader'||m.role==='formerLeader')m.commander=null;}
 for(const d of s.districts)for(const n of s.networks)if(n.dismantled){d.cells[n.id]=0;syncThreat(d);}
 s.units=old.units.map(u=>{const current={...u,patrol:null};if(u.status==='moving'){current.path=findRoute(u.district,u.path.at(-1));current.total=Math.max(1,(current.path.length-1)*2);current.remaining=Math.max(1,Math.ceil(current.total*u.remaining/u.total));}return current;});
 s.projects=structuredClone(old.projects);s.operations=structuredClone(old.operations);s.relations=structuredClone(old.relations);s.pacts=structuredClone(old.pacts);Object.assign(s.stats,old.stats);
 s.migration={from:source.version,legacyOutcome:old.outcome};s.log.unshift({day:s.day,kind:'info',text:'Campaign migrated to fifty connected provinces. Original districts, members and orders are retained; moving routes are recalculated over land.'});s.log=s.log.slice(0,100);return s;
}
export function validateCampaign(s){
  const assert=test=>{if(!test)throw new Error('This save is incompatible or damaged.');};
  const num=(v,lo=0,hi=100)=>typeof v==='number'&&Number.isFinite(v)&&v>=lo&&v<=hi,integer=(v,lo=0,hi=100)=>Number.isInteger(v)&&num(v,lo,hi);
  const district=id=>integer(id,0,DISTRICTS.length-1),network=id=>integer(id,0,NETWORKS.length-1),ids=list=>Array.isArray(list)&&new Set(list.map(x=>x.id)).size===list.length;
  const completed=(list,scope)=>Array.isArray(list)&&new Set(list).size===list.length&&list.every(id=>INITIATIVES.some(i=>i.id===id&&i.scope===scope));
  assert(s&&s.version===VERSION&&integer(s.day,0,MANDATE_DAYS)&&integer(s.seed,0,4294967295)&&integer(s.rng,0,4294967295));
  assert(GOVERNORS.some(g=>g.id===s.governor)&&Object.hasOwn(DIFFICULTIES,s.difficulty));
  assert(num(s.money,0,999999)&&num(s.trust)&&num(s.corruption)&&num(s.inflation,0,50)&&integer(s.holdDays,0,14)&&typeof s.started==='boolean'&&typeof s.paused==='boolean'&&[1,2,3].includes(s.speed)&&[null,'victory','defeat'].includes(s.outcome));
  assert(ids(s.districts)&&s.districts.length===DISTRICTS.length&&s.districts.every((d,i)=>d.id===i&&['support','intel','threat','security','stability','prosperity','fear','displacement','institutions'].every(k=>num(d[k]))&&integer(d.services,0,10)&&completed(d.completed,'local')&&Array.isArray(d.cells)&&d.cells.length===NETWORKS.length&&d.cells.every(v=>num(v))&&Array.isArray(d.neighborhoods)&&d.neighborhoods.length===3&&d.neighborhoods.every((n,j)=>n.id===j&&['support','employment','grievance','access','security'].every(k=>num(n[k]))&&Array.isArray(n.influence)&&n.influence.length===NETWORKS.length&&n.influence.every(v=>num(v)))&&d.cells.reduce((a,b)=>a+b,0)<=100.000001&&Math.abs(d.threat-d.cells.reduce((a,b)=>a+b,0))<.00001));
  assert(ids(s.regions)&&s.regions.length===REGIONS.length&&s.regions.every((r,i)=>r.id===i&&completed(r.completed,'region')&&Object.hasOwn(PROVINCE_PRIORITIES,r.priority)&&r.services&&['power','water','health','comms','logistics','commerce','education','average'].every(k=>num(r.services[k])))&&completed(s.completed,'province'));
  assert(ids(s.members)&&s.members.length===NETWORKS.length*MEMBERS_PER_CARTEL&&s.members.every(m=>typeof m.id==='string'&&m.id.length<20&&network(m.network)&&typeof m.name==='string'&&m.name.length>0&&m.name.length<80&&Object.hasOwn(MEMBER_ROLES,m.role)&&Array.isArray(m.traits)&&m.traits.length===2&&new Set(m.traits).size===2&&m.traits.every(t=>Object.hasOwn(TRAITS,t))&&num(m.skill)&&num(m.loyalty)&&num(m.exposure)&&district(m.location)&&['active','captured','defected'].includes(m.status)&&integer(m.neighborhood,0,2)&&['ambition','stress','authority'].every(k=>num(m[k]))&&(m.commander===null||s.members.some(c=>c.id===m.commander&&c.id!==m.id&&c.network===m.network))&&integer(m.watchedUntil,0,MANDATE_DAYS+100)));
  assert(NETWORKS.every(n=>s.members.filter(m=>m.network===n.id).length===MEMBERS_PER_CARTEL&&s.members.filter(m=>m.network===n.id&&m.role==='leader').length===1));
  for(const member of s.members){
    let parent=member;const seen=new Set([member.id]);
    while(parent.commander!==null){parent=s.members.find(m=>m.id===parent.commander);assert(parent&&!seen.has(parent.id));seen.add(parent.id);}
  }
  assert(s.networks.every(n=>n.branches.every(b=>b.lastAction===undefined||(b.lastAction&&integer(b.lastAction.day,0,s.day)&&Object.hasOwn(BRANCH_ACTIONS,b.lastAction.intent)&&district(b.lastAction.target)&&typeof b.lastAction.reason==='string'&&b.lastAction.reason.length<200))));
  assert(ids(s.networks)&&s.networks.length===NETWORKS.length&&s.networks.every((n,i)=>n.id===i&&['funds','evidence','cohesion','heat','logistics'].every(k=>num(n[k]))&&typeof n.captured==='boolean'&&typeof n.dismantled==='boolean'&&s.members.some(m=>m.id===n.leaderId&&m.network===n.id&&m.role==='leader'&&(n.captured?m.status==='captured':m.status==='active'))&&(!n.dismantled||n.captured)&&Object.hasOwn(INTENTS,n.intent)&&district(n.focus)&&integer(n.nextDecision,0,MANDATE_DAYS+200)&&integer(n.successionAt,0,MANDATE_DAYS+100)&&integer(n.successions,0,MEMBERS_PER_CARTEL-1)&&['arsenal','manpower','counterintel','infiltration','patronage','laundering','infighting'].every(k=>num(n[k]))&&Object.hasOwn(STRATEGIES,n.strategy)&&integer(n.strategySince,0,MANDATE_DAYS)&&n.revenue&&['extortion','trade','fronts'].every(k=>num(n.revenue[k],0,100000))&&Array.isArray(n.fronts)&&new Set(n.fronts).size===n.fronts.length&&n.fronts.every(id=>INFRA_INDEX.has(id))&&Array.isArray(n.branches)&&n.branches.length===3&&n.branches.every((b,j)=>b.id===j&&integer(b.region,0,REGIONS.length-1)&&s.members.some(m=>m.id===b.commander&&m.network===n.id)&&['autonomy','loyalty','stockpile'].every(k=>num(b[k]))&&['hold','extract','autonomous','disrupted'].includes(b.posture)&&typeof b.splintered==='boolean'&&integer(b.nextDecision,0,MANDATE_DAYS+100))&&Array.isArray(n.aiLog)&&n.aiLog.length<=6&&n.aiLog.every(l=>integer(l.day,0,MANDATE_DAYS)&&Object.hasOwn(INTENTS,l.intent)&&district(l.target)&&typeof l.reason==='string'&&l.reason.length<200)));
  assert(Array.isArray(s.relations)&&s.relations.length===NETWORKS.length&&s.relations.every((row,a)=>Array.isArray(row)&&row.length===NETWORKS.length&&row.every((v,b)=>num(v,-100,100)&&v===s.relations[b]?.[a]&&(a!==b||v===0))));
  assert(Array.isArray(s.pacts)&&s.pacts.length<=36&&new Set(s.pacts.map(p=>`${p.a}:${p.b}`)).size===s.pacts.length&&s.pacts.every(p=>network(p.a)&&network(p.b)&&p.a<p.b&&integer(p.until,0,MANDATE_DAYS+100)));
  assert(ids(s.units)&&s.units.length>=3&&s.units.length<=MAX_UNITS&&integer(s.nextUnitId,4,200));
  assert(s.units.every(u=>integer(u.id,1,199)&&u.id<s.nextUnitId&&typeof u.name==='string'&&u.name.length<=20&&Object.hasOwn(UNIT_TYPES,u.type)&&district(u.district)&&['ready','moving','training','operating'].includes(u.status)&&integer(u.remaining,0,DISTRICTS.length*10)&&integer(u.total,u.remaining,DISTRICTS.length*10)&&['supply','readiness','fatigue'].every(k=>num(u[k]))&&(u.patrol===null||integer(u.patrol,0,2))&&Array.isArray(u.path)&&u.path.length<=DISTRICTS.length&&u.path.every((id,i)=>district(id)&&(!i||NEIGHBORS[u.path[i-1]].includes(id)))&&typeof u.blocked==='boolean'&&Array.isArray(u.routeDays)&&u.routeDays.every(v=>integer(v,1,10))&&(u.status==='moving'?(u.remaining>0&&u.path.length>=2&&u.path[0]===u.district&&u.routeDays.length===u.path.length-1&&routeDuration(u.routeDays)===u.total):(!u.blocked&&u.routeDays.length===0))&&(u.status!=='training'||u.remaining>0)));
  assert(Array.isArray(s.projects)&&s.projects.length<=MAX_PROJECTS&&s.projects.every(p=>INITIATIVES.some(i=>i.id===p.id)&&district(p.district)&&p.region===DISTRICTS[p.district].region&&integer(p.remaining,1,90)&&integer(p.total,p.remaining,90)));
  assert(new Set(s.projects.map(p=>{const scope=INITIATIVES.find(i=>i.id===p.id).scope;return `${p.id}:${scope==='province'?'all':scope==='region'?p.region:p.district}`;})).size===s.projects.length);
  const operations=['investigate','raid','interdict','arrest','capture','flip','resupply'];
  assert(Array.isArray(s.operations)&&s.operations.length<=DISTRICTS.length&&new Set(s.operations.map(o=>o.district)).size===s.operations.length);
  assert(s.operations.every(o=>operations.includes(o.type)&&district(o.district)&&network(o.network)&&integer(o.remaining,1,10)&&integer(o.total,o.remaining,10)&&num(o.power,0,1000)&&num(o.chance,0,1)&&(['investigate','flip'].includes(o.type)?o.unit===null:s.units.some(u=>u.id===o.unit&&u.status==='operating'&&u.district===o.district&&(o.type==='resupply'||u.type!=='intel')))&&(['arrest','capture','flip'].includes(o.type)?s.members.some(m=>m.id===o.member&&m.network===o.network&&m.location===o.district&&m.status==='active'):o.member===null)));
  assert(s.units.filter(u=>u.status==='operating').every(u=>s.operations.some(o=>o.unit===u.id)));
  assert(s.pendingRegion===null||integer(s.pendingRegion,0,REGIONS.length-1));
  assert((EVENTS.find(e=>e.id===s.pendingEvent)?.scope==='regional')===(s.pendingRegion!==null));
  assert(integer(s.nextEvent,0,MANDATE_DAYS+100)&&integer(s.eventCount,0,100)&&(s.pendingEvent===null||EVENTS.some(e=>e.id===s.pendingEvent)));
  assert(Array.isArray(s.log)&&s.log.length<=100&&s.log.every(l=>integer(l.day,0,MANDATE_DAYS)&&typeof l.text==='string'&&l.text.length<1000&&['info','project','success','warning','decision'].includes(l.kind)));
  assert(s.log.every(l=>l.encounter===undefined||(l.encounter&&typeof l.encounter==='object'&&!Array.isArray(l.encounter)&&district(l.encounter.district)&&s.units.some(u=>u.id===l.encounter.unit&&u.type!=='intel')&&(l.encounter.network===undefined||network(l.encounter.network))&&['cleared','suppressed','evaded'].includes(l.encounter.result))));
  assert(s.stats&&['raids','arrests','membersCaptured','defections','projects','spending','infrastructure','neighborhoodProjects'].every(k=>num(s.stats[k],0,1000000)));
  assert(s.migration===null||(s.migration&&[1,2].includes(s.migration.from)&&[null,'victory','defeat'].includes(s.migration.legacyOutcome)));
  assert(ids(s.assets)&&s.assets.length===INFRASTRUCTURE.length&&s.assets.every((a,i)=>a.id===INFRASTRUCTURE[i].id&&['condition','security','infiltration','load'].every(k=>num(a[k]))&&integer(a.level,1,3)&&integer(a.downtime,0,100)&&(a.controller===null||network(a.controller))));
  assert(integer(s.nextWorkId,1,100000)&&ids(s.works)&&s.works.length<=40&&s.works.every(w=>integer(w.id,1,s.nextWorkId-1)&&district(w.district)&&['infrastructure','neighborhood'].includes(w.kind)&&integer(w.remaining,1,60)&&integer(w.total,w.remaining,60)&&(w.kind==='infrastructure'?INFRA_INDEX.has(w.target)&&Object.hasOwn(INFRA_TASKS,w.task)&&INFRASTRUCTURE[INFRA_INDEX.get(w.target)].district===w.district:integer(w.target,0,DISTRICTS.length*3-1)&&Math.floor(w.target/3)===w.district&&Object.hasOwn(NEIGHBORHOOD_TASKS,w.task))));
  assert(new Set(s.works.map(w=>`${w.kind}:${w.target}`)).size===s.works.length);
  return s;
}
export function restore(text){
  if(typeof text!=='string'||text.length>SAVE_LIMIT)throw new Error('This save file is too large.');const envelope=JSON.parse(text);if(envelope?.game!=='cartel-containment')throw new Error('This save is incompatible or damaged.');
  const s=[1,2].includes(envelope.version)?migrate(text):envelope.version===VERSION?envelope.state:null;
  if(s&&Array.isArray(s.units))restoreTravelTimings(s);
  validateCampaign(s);s.paused=true;return s;
}

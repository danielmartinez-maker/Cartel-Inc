import {VERSION,HQ,DISTRICTS,REGIONS,NETWORKS,TERRAIN,GOVERNORS,DIFFICULTIES,UNIT_TYPES,INITIATIVES,EVENTS,TRANSPORT_LINKS,MAX_UNITS,MAX_PROJECTS,MANDATE_DAYS,STABILITY_TARGET,NEIGHBORHOODS,PROVINCE_PRIORITIES,MAX_WORKS} from './data.js';
import {findRoute,NEIGHBORS} from './geography.js';
import {createMembers,seeded,ARCHETYPES,capabilities,leaderOf,dominantNetwork,alterCell,syncThreat,TRAITS} from './cartels.js';
import {createInfrastructure,INFRASTRUCTURE,assetState,provincialInfrastructure,nationalAccess,transportCost,INFRA_TASKS,infrastructureAvailability,finishInfrastructure,stepInfrastructure} from './infrastructure.js';
import {createNeighborhoods,communityProfile,NEIGHBORHOOD_TASKS,finishNeighborhood,stepNeighborhoods} from './neighborhoods.js';
import {stepCartels} from './cartel-ai.js';
export const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,n));
const round=n=>Math.round(n*100)/100,initiative=id=>INITIATIVES.find(i=>i.id===id),has=(s,id)=>s.completed.includes(id);
const ok=message=>({ok:true,message}),no=message=>({ok:false,message});
function random(s){s.rng=(s.rng+0x6D2B79F5)>>>0;let t=s.rng;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;}
function report(s,text,kind='info',encounter=null){s.log.unshift({day:s.day,text,kind,...(encounter?{encounter}:{})});s.log=s.log.slice(0,100);}
export function createGame({seed=72841,governor='cruz',difficulty='standard'}={}){
  if(!GOVERNORS.some(g=>g.id===governor))governor='cruz';if(!Object.hasOwn(DIFFICULTIES,difficulty))difficulty='standard';
  const relations=NETWORKS.map(()=>NETWORKS.map(()=>0)),r=seeded(seed^0x81b7);
  for(let a=0;a<NETWORKS.length;a++)for(let b=a+1;b<NETWORKS.length;b++)relations[a][b]=relations[b][a]=Math.floor(r()*51)-30;
  const s={version:VERSION,seed:seed>>>0,rng:seed>>>0,governor,difficulty,day:0,started:false,paused:true,speed:1,money:DIFFICULTIES[difficulty].starting,trust:76,corruption:18,inflation:0,holdDays:0,outcome:null,
    districts:DISTRICTS.map(d=>({id:d.id,support:d.id===HQ?67:d.id%24===9?58:39+(d.id*7)%15,intel:d.id===HQ?70:d.threat>20?34:16+(d.id*3)%12,threat:d.threat,cells:NETWORKS.map(n=>n.id===d.network?d.threat:0),security:d.id===HQ?55:d.id===13?28:d.id%24===9?25:8,stability:d.id===HQ?75:d.id%24===9?35:0,services:d.id===HQ?2:0,completed:[],prosperity:35+(d.id*11)%27,fear:d.threat*.65,displacement:4+(d.id*3)%9,institutions:d.id===HQ?65:24+(d.id*7)%19})),
    regions:REGIONS.map(r=>({id:r.id,completed:[],priority:'balanced',services:null})),
    units:[{id:1,name:'ALPHA',type:'federal',district:HQ},{id:2,name:'BRAVO',type:'police',district:13},{id:3,name:'ECHO',type:'intel',district:HQ}].map(u=>({...u,status:'ready',path:[],remaining:0,total:0,supply:95,readiness:90,fatigue:5,patrol:null})),
    networks:NETWORKS.map(n=>({id:n.id,funds:80,evidence:12,captured:false,dismantled:false,leaderId:`${n.id}-0`,cohesion:n.archetype==='territorial'?85:n.archetype==='patronage'?76:n.archetype==='clandestine'?74:65,heat:20,logistics:70,intent:'entrench',focus:n.home,nextDecision:6+n.id%4,successionAt:0,successions:0,aiLog:[],arsenal:65,manpower:60,counterintel:30,infiltration:25,patronage:25,laundering:20,infighting:15,strategy:n.archetype==='mercantile'?'profit':n.archetype==='patronage'?'penetrate':'consolidate',strategySince:0,revenue:{extortion:0,trade:0,fronts:0},fronts:[],branches:[]})),
    members:createMembers(seed),assets:createInfrastructure(seed),works:[],nextWorkId:1,relations,pacts:[],projects:[],operations:[],completed:[],log:[],nextUnitId:4,nextEvent:18,pendingEvent:null,pendingRegion:null,eventCount:0,stats:{raids:0,arrests:0,membersCaptured:0,defections:0,projects:0,spending:0,infrastructure:0,neighborhoodProjects:0},migration:null};
  for(const d of s.districts)d.neighborhoods=createNeighborhoods(d);
  for(const r of s.regions)r.services=provincialInfrastructure(s,r.id);
  for(const n of s.networks){
    const regions=[...new Set(DISTRICTS.filter(d=>d.network===n.id).map(d=>d.region))];
    n.branches=[0,1,2].map(index=>{const region=regions[Math.floor(index*regions.length/3)],commander=`${n.id}-${index===0?5:index===1?6:7}`,m=s.members.find(m=>m.id===commander);m.location=DISTRICTS.find(d=>d.region===region&&d.network===n.id&&d.threat>0)?.id??REGIONS[region].hub;return {id:index,region,commander,autonomy:30+(n.id*7+index*13)%30,loyalty:48+(n.id*11+index*7)%25,stockpile:45,posture:'hold',splintered:false,nextDecision:14+index*4};});
    const front=INFRASTRUCTURE.find(a=>['port','rail','airport'].includes(a.type)&&DISTRICTS[a.district].network===n.id&&assetState(s,a.id).controller===null);if(front){const a=assetState(s,front.id);a.controller=n.id;a.infiltration=45;n.fronts.push(a.id);}
  }
  report(s,'National mandate: fifty connected provinces, 1,200 districts, 3,600 neighborhoods and critical infrastructure.');return s;
}
export const projectCost=(s,base)=>Math.ceil(base*(1+s.inflation/100));
function spend(s,cost){s.money=round(s.money-cost);s.inflation=clamp(s.inflation+cost*.025,0,50);s.stats.spending+=cost;}
export const stableDistricts=s=>s.districts.filter(d=>d.stability>=75&&d.threat<8&&d.support>=60).length;
export const totalThreat=(s,network)=>s.districts.reduce((v,d)=>v+(network===undefined?d.threat:d.cells[network]),0);
export const unitsHere=(s,id)=>s.units.filter(u=>u.district===id&&u.status==='ready');
export function unitPower(s,u){return (UNIT_TYPES[u.type].power+(has(s,'training')&&u.type!=='intel'?8:0))*(s.governor==='ibarra'?1.2:1)*(.6+u.readiness*.004)*(.6+u.supply*.004)*(1-u.fatigue*.003);}
export const localPower=(s,id)=>unitsHere(s,id).reduce((v,u)=>v+unitPower(s,u),0);
export {dominantNetwork,leaderOf,capabilities};
export function budgetForecast(s){const income=round((64+stableDistricts(s)*.16+s.districts.reduce((v,d)=>v+d.prosperity,0)*.003+(has(s,'finance')?12:0))*DIFFICULTIES[s.difficulty].income),upkeep=round(12+s.units.length*1.15+s.assets.length*.04+s.regions.reduce((v,r)=>v+PROVINCE_PRIORITIES[r.priority].cost,0));return {income,upkeep,net:round(income-upkeep)};}
const supplyCache=new WeakMap();
export function supplyScore(s,id){const d=s.districts[id];if(!d)return 0;let cache=supplyCache.get(s);if(!cache||cache.day!==s.day){cache={day:s.day,access:nationalAccess(s)};supplyCache.set(s,cache);}const region=s.regions[DISTRICTS[id].region],distance=cache.access[region.id];if(!Number.isFinite(distance))return 0;return clamp(65-distance*1.4-d.threat*.18+region.services.logistics*.25+(d.completed.includes('station')?12:0)+(region.completed.includes('regional-administration')?18:0)+(has(s,'logistics')?15:0));}
export function recruitmentBase(s,id){const d=s.districts[id];return !!d&&(id===HQ||(d.threat<12&&d.completed.includes('station'))||(REGIONS[DISTRICTS[id].region].hub===id&&d.threat<20&&s.regions[DISTRICTS[id].region].completed.includes('regional-administration')));}
export function movementPlan(s,unitId,destination){
  const u=s.units.find(u=>u.id===unitId),d=s.districts[destination];if(!u||!d)return {...no('Choose a unit and a district.'),path:[],days:0};if(u.status!=='ready')return {...no('This unit is already assigned.'),path:[],days:0};if(u.district===destination)return {...no('This unit is already stationed here.'),path:[],days:0};
  const cost=(a,b)=>transportCost(s,a,b)??Math.max(1,TERRAIN[DISTRICTS[b].terrain].travel-(s.districts[b].completed.includes('roads')?1:0));
  const path=findRoute(u.district,destination,cost);if(!path.length)return {...no('No connected route is available.'),path:[],days:0};const days=path.slice(1).reduce((v,id,i)=>v+cost(path[i],id),0);return {ok:true,path,days,message:`ETA ${days} ${days===1?'day':'days'}`};
}
export function operationForecast(s,id,network=null){const d=s.districts[id];if(!d)return 0;network=network??dominantNetwork(d);if(!Number.isInteger(network)||!s.networks[network])return 0;const c=capabilities(s,network);return clamp(.5+d.intel*.0035+localPower(s,id)*.004-s.corruption*.0015-d.cells[network]*.0012-(c.defense-1)*.12-d.fear*.0006,.25,.98);}
export function initiativeAvailability(s,id,districtId){
  const item=initiative(id),d=s.districts[districtId];if(!item||!d)return no('Choose a valid initiative and district.');if(s.outcome)return no('This operation has ended.');
  const region=DISTRICTS[districtId].region,scope=item.scope==='local'?d.completed:item.scope==='region'?s.regions[region].completed:s.completed;
  if(scope.includes(id))return no('Already completed.');if(s.projects.some(p=>p.id===id&&(item.scope==='province'||(item.scope==='region'?p.region===region:p.district===districtId))))return no('Already in progress.');
  if(item.requires&&!scope.includes(item.requires))return no(`Requires ${initiative(item.requires).name.toLowerCase()}.`);if(s.projects.length>=MAX_PROJECTS)return no(`${MAX_PROJECTS} projects are already active.`);
  if(item.scope==='local'&&d.threat>=35)return no('Reduce local threat below 35 before starting local projects.');const cost=projectCost(s,item.cost);if(s.money<cost)return no(`Requires $${cost}.`);return ok('Ready to fund');
}
export function memberRequirements(s,id,type='capture'){
  const m=s.members.find(m=>m.id===id);if(!m)return ['Choose a valid member.'];const n=s.networks[m.network],d=s.districts[m.location],requirements=[];
  if(m.status!=='active'||n.dismantled)return ['This member is no longer active.'];if(m.role==='leader'&&type==='capture')return arrestRequirements(s,m.network);
  if(type==='flip'&&m.role==='leader')return ['Target the leader through an arrest operation.'];
  if(n.evidence<(type==='flip'?30:35))requirements.push(`Build case evidence to ${type==='flip'?30:35}%`);if(m.exposure<35)requirements.push('Investigate the member’s district to establish their identity');
  if(d.intel<(type==='flip'?40:50))requirements.push(`Reach ${type==='flip'?40:50}% local intelligence`);
  if(type!=='flip'&&!unitsHere(s,m.location).some(u=>u.type!=='intel'))requirements.push('Deploy a ready security unit to the member’s district');
  if(s.operations.some(o=>o.district===m.location))requirements.push('Another operation is already active in this district');if(s.money<projectCost(s,10))requirements.push(`Have $${projectCost(s,10)} available`);return requirements;
}
export function arrestRequirements(s,networkId){
  const n=s.networks[networkId],leader=n&&leaderOf(s,networkId);if(!n||!leader)return ['Choose a valid network.'];if(n.captured)return ['Leader already in custody.'];const d=s.districts[leader.location],requirements=[];
  if(!has(s,'prosecutors'))requirements.push('Complete Special prosecutors');if(n.evidence<65)requirements.push(`Build case evidence to 65% (now ${Math.floor(n.evidence)}%)`);if(d.intel<60)requirements.push(`Reach 60% intelligence in ${DISTRICTS[d.id].name}`);
  if(localPower(s,d.id)<12)requirements.push(`Deploy a supplied security unit to ${DISTRICTS[d.id].name}`);if(d.threat>30)requirements.push(`Reduce local threat to 30% (now ${Math.floor(d.threat)}%)`);
  if(s.operations.some(o=>o.district===d.id))requirements.push('Another operation is already active in this district');if(s.money<projectCost(s,12))requirements.push(`Have $${projectCost(s,12)} available`);return requirements;
}
export function act(s,a){
  if(!a||typeof a!=='object')return no('Invalid action.');if(s.outcome)return no('This operation has ended. Start a new campaign.');
  if(a.district!==undefined&&(!Number.isInteger(a.district)||!s.districts[a.district]))return no('Choose a valid district.');
  if(a.network!==undefined&&(!Number.isInteger(a.network)||!s.networks[a.network]))return no('Choose a valid network.');
  if(a.type==='pause'){s.paused=!s.paused;if(!s.paused)s.started=true;return ok(s.paused?'Simulation paused.':'Operation running.');}
  if(a.type==='speed'){if(![1,2,3].includes(a.speed))return no('Invalid speed.');s.speed=a.speed;return ok(`Speed ${a.speed}×`);}
  if(a.type==='province-priority'){const r=s.regions[a.region];if(!Number.isInteger(a.region)||!r||!Object.hasOwn(PROVINCE_PRIORITIES,a.priority))return no('Choose a province and a valid priority.');r.priority=a.priority;return ok(`${REGIONS[r.id].name}: ${PROVINCE_PRIORITIES[a.priority].name}. Weekly allocation $${PROVINCE_PRIORITIES[a.priority].cost}.`);}
  if(a.type==='patrol'){const u=s.units.find(u=>u.id===a.unit&&u.status==='ready'&&u.type!=='intel');if(!u||(a.neighborhood!==null&&(!Number.isInteger(a.neighborhood)||a.neighborhood<0||a.neighborhood>2)))return no('Choose a ready security unit and a neighborhood.');u.patrol=a.neighborhood;return ok(a.neighborhood===null?`${u.name} resumed district coverage.`:`${u.name} assigned to neighborhood patrol in ${NEIGHBORHOODS[u.district][a.neighborhood].name}.`);}
  if(a.type==='infrastructure'||a.type==='neighborhood'){
    if(s.works.length>=MAX_WORKS)return no('The national works desk is at capacity.');let task,cost,target,district;
    if(a.type==='infrastructure'){const reason=infrastructureAvailability(s,a.asset,a.task);if(reason)return no(reason);task=INFRA_TASKS[a.task];target=a.asset;district=INFRASTRUCTURE.find(i=>i.id===a.asset).district;}
    else{task=NEIGHBORHOOD_TASKS[a.task];if(!task||!Number.isInteger(a.neighborhood)||a.neighborhood<0||a.neighborhood>2||!s.districts[a.district])return no('Choose a valid neighborhood and program.');district=a.district;target=district*3+a.neighborhood;if(s.works.some(w=>w.kind==='neighborhood'&&w.target===target))return no('A program is already active in this neighborhood.');if(s.districts[district].threat>55&&a.task!=='intelligence')return no('Reduce district threat below 55 before sending civic teams.');}
    cost=projectCost(s,task.cost);if(s.money<cost)return no(`Requires $${cost}.`);spend(s,cost);s.works.push({id:s.nextWorkId++,kind:a.type,target,task:a.task,district,remaining:task.days,total:task.days});return ok(`${task.name} commissioned. Completion in ${task.days} days.`);
  }
  if(a.type==='project'){
    const available=initiativeAvailability(s,a.id,a.district);if(!available.ok)return available;const item=initiative(a.id),cost=projectCost(s,item.cost),days=Math.ceil(item.days*(s.governor==='cruz'&&item.category==='civilian'?.75:1));
    spend(s,cost);s.projects.push({id:a.id,district:a.district,region:DISTRICTS[a.district].region,remaining:days,total:days});report(s,`${item.name} funded ${item.scope==='local'?`in ${DISTRICTS[a.district].name}`:item.scope==='region'?`for ${REGIONS[DISTRICTS[a.district].region].name}`:'across the mandate'}.`,'project');return ok(`${item.name} funded. Completion in ${days} days.`);
  }
  if(a.type==='move'){const plan=movementPlan(s,a.unit,a.district);if(!plan.ok)return no(plan.message);const u=s.units.find(u=>u.id===a.unit);u.patrol=null;u.path=plan.path;u.remaining=plan.days;u.total=plan.days;u.status='moving';report(s,`${u.name} en route to ${DISTRICTS[a.district].name}. ${plan.message}.`);return ok(`${u.name} dispatched. ${plan.message}.`);}
  if(a.type==='recruit'){
    const type=Object.hasOwn(UNIT_TYPES,a.unitType)?UNIT_TYPES[a.unitType]:null,location=a.district??HQ;if(!type)return no('Unknown unit type.');if(!recruitmentBase(s,location))return no('Recruit at headquarters, a secure police station or a regional administration base.');if(s.units.length>=MAX_UNITS)return no(`The mandate supports ${MAX_UNITS} units.`);const cost=projectCost(s,type.cost);if(s.money<cost)return no(`Requires $${cost}.`);
    const names=['DELTA','FOXTROT','GOLF','HOTEL','INDIA','JULIET','KILO','LIMA','MIKE','NOVEMBER','OSCAR','PAPA','QUEBEC','ROMEO','SIERRA'];spend(s,cost);const id=s.nextUnitId++,name=names[id-4]||`UNIT ${id}`;
    s.units.push({id,name,type:a.unitType,district:location,status:'training',path:[],remaining:type.days,total:type.days,supply:95,readiness:90,fatigue:5,patrol:null});return ok(`${name} recruited at ${DISTRICTS[location].name}. Ready in ${type.days} days.`);
  }
  if(['investigate','raid','interdict','arrest','capture','flip','resupply'].includes(a.type)){
    let id=a.district,member=null,unit=null,network=a.network;
    if(a.type==='arrest'){const req=arrestRequirements(s,network);if(req.length)return no(req[0]);member=leaderOf(s,network);id=member.location;}
    if(a.type==='capture'||a.type==='flip'){const req=memberRequirements(s,a.member,a.type);if(req.length)return no(req[0]);member=s.members.find(m=>m.id===a.member);network=member.network;id=member.location;if(member.role==='leader')return act(s,{type:'arrest',network});}
    if(a.type==='resupply'){unit=s.units.find(u=>u.id===a.unit&&u.status==='ready');if(!unit)return no('Choose a ready unit to resupply.');id=unit.district;}
    const d=s.districts[id];if(!d)return no('Choose a district.');network=network??dominantNetwork(d);if(!s.networks[network]||s.networks[network].dismantled&&a.type!=='resupply')return no('Choose an active network.');
    if(s.operations.some(o=>o.district===id))return no('An operation is already active in this district.');const bases={investigate:6,raid:7,interdict:7,arrest:12,capture:10,flip:10,resupply:8},cost=projectCost(s,bases[a.type]);if(s.money<cost)return no(`Requires $${cost}.`);
    if(!['investigate','flip','resupply'].includes(a.type)){if(d.intel<(a.type==='raid'?40:30))return no(`Requires ${a.type==='raid'?40:30}% local intelligence.`);unit=unitsHere(s,id).find(u=>u.type!=='intel');if(!unit)return no('Deploy a ready security unit here first.');if(a.type==='raid'&&d.cells[network]<1)return no('No active cell is present here.');}
    const days={investigate:4,raid:4,interdict:5,arrest:5,capture:4,flip:4,resupply:3}[a.type];
    const chance=a.type==='flip'?clamp(.95-member.loyalty/140+(has(s,'witness')?.22:0),.12,.9):operationForecast(s,id,network);
    const power=localPower(s,id);spend(s,cost);s.operations.push({type:a.type,district:id,network,unit:unit?.id??null,member:member?.id??null,remaining:days,total:days,power,chance});if(unit)unit.status='operating';return ok(`${a.type==='resupply'?'Resupply':'Operation'} started. Results in ${days} days.`);
  }
  if(a.type==='event'){
    if(s.pendingEvent===null)return no('No decision is pending.');const event=EVENTS.find(e=>e.id===s.pendingEvent),choice=event?.choices[a.choice];if(!choice)return no('Choose a valid response.');if(s.money<choice.cost)return no(`Requires $${choice.cost}.`);if(choice.cost)spend(s,choice.cost);
    s.trust=clamp(s.trust+(choice.trust||0));s.corruption=clamp(s.corruption+(choice.corruption||0));
    const eventDistricts=event.scope==='regional'?s.districts.filter(d=>DISTRICTS[d.id].region===s.pendingRegion):s.districts;
    for(const d of eventDistricts){for(const neighborhood of d.neighborhoods){neighborhood.access=clamp(neighborhood.access+(choice.neighborhoodAccess||0));neighborhood.grievance=clamp(neighborhood.grievance+(choice.grievance||0));}d.support=clamp(d.support+(choice.support||0)+(['port','coast'].includes(DISTRICTS[d.id].terrain)?choice.coastSupport||0:0));d.intel=clamp(d.intel+(choice.intel||0));d.security=clamp(d.security+(choice.security||0));}for(const n of s.networks)n.evidence=clamp(n.evidence+(choice.evidence||0));
    if(event.scope==='regional')for(const def of INFRASTRUCTURE.filter(a=>a.region===s.pendingRegion)){const asset=assetState(s,def.id);asset.infiltration=clamp(asset.infiltration+(choice.assetInfiltration||0));const repair=def.type==='power'?choice.repairPower:def.type==='rail'?choice.repairRail:def.type==='depot'?choice.repairDepot:0;if(repair){asset.condition=clamp(asset.condition+repair);asset.downtime=0;}}
    if(s.pendingRegion!==null){s.regions[s.pendingRegion].services=provincialInfrastructure(s,s.pendingRegion);supplyCache.delete(s);}
    report(s,`${event.title}: ${choice.label.toLowerCase()}.`,'decision');s.pendingEvent=null;s.pendingRegion=null;s.nextEvent=s.day+24+Math.floor(random(s)*12);return ok('Decision recorded. Resume when ready.');
  }
  return no('Unknown command.');
}
function deliverLocal(s,d,item){
  if(d.completed.includes(item.id))return;d.completed.push(item.id);d.support=clamp(d.support+(item.support||0));
  if(['water','clinic','school','jobs'].includes(item.id))d.services++;
  for(const n of d.neighborhoods){n.support=clamp(n.support+(item.support||0));if(item.id==='jobs')n.employment=clamp(n.employment+12);if(item.id==='water'||item.id==='clinic')n.access=clamp(n.access+8);}
  if(item.id==='water'){d.prosperity=clamp(d.prosperity+5);d.fear=clamp(d.fear-5);}
  if(item.id==='clinic')d.displacement=clamp(d.displacement-6);
  if(item.id==='jobs')d.prosperity=clamp(d.prosperity+16);
  if(item.id==='school')d.institutions=clamp(d.institutions+8);
  if(item.id==='station'){d.security=clamp(d.security+20);d.institutions=clamp(d.institutions+12);}
  if(item.id==='roads'){d.security=clamp(d.security+10);d.institutions=clamp(d.institutions+3);}
}
function finishProject(s,p){
  const item=initiative(p.id),d=s.districts[p.district];
  if(item.scope==='local')deliverLocal(s,d,item);
  else if(item.scope==='region'){s.regions[p.region].completed.push(item.id);if(item.id==='regional-administration')for(const region of s.districts.filter(d=>DISTRICTS[d.id].region===p.region)){region.institutions=clamp(region.institutions+10);region.security=clamp(region.security+6);}}
  else{
    s.completed.push(item.id);if(item.id==='analysis')for(const region of s.districts)region.intel=clamp(region.intel+8);if(item.id==='integrity')s.corruption=clamp(s.corruption-10);if(item.id==='audit'){s.corruption=clamp(s.corruption-8);for(const n of s.networks)n.evidence=clamp(n.evidence+5);}if(item.id==='prosecutors')for(const n of s.networks)n.evidence=clamp(n.evidence+15);if(item.id==='finance')for(const n of s.networks){n.funds=clamp(n.funds-30);n.logistics=clamp(n.logistics-10);}if(item.id==='oversight')s.trust=clamp(s.trust+6);
  }
  s.stats.projects++;report(s,`${item.name} is now operating${item.scope==='local'?` in ${DISTRICTS[d.id].name}`:item.scope==='region'?` across ${REGIONS[p.region].name}`:''}.`,'success');
}
function finishOperation(s,o){
  const d=s.districts[o.district],n=s.networks[o.network],name=DISTRICTS[d.id].name,m=s.members.find(m=>m.id===o.member),c=capabilities(s,n.id);
  if(o.type==='investigate'){
    d.intel=clamp(d.intel+(32+(has(s,'analysis')?10:0))/Math.sqrt(c.stealth));n.evidence=clamp(n.evidence+(12+(has(s,'witness')?6:0))*(s.governor==='vega'?1.25:1));n.heat=clamp(n.heat+12);
    for(const member of s.members.filter(m=>m.network===n.id&&m.location===d.id&&m.status==='active')){member.exposure=clamp(member.exposure+25);member.watchedUntil=s.day+(member.traits.includes('secretive')?14:24);}
    report(s,`Investigation complete in ${name}. Intelligence, member identities and ${NETWORKS[n.id].name} case evidence improved.`,'success');
  }else if(o.type==='interdict'){n.funds=clamp(n.funds-30);n.evidence=clamp(n.evidence+9);n.cohesion=clamp(n.cohesion-9);n.arsenal=clamp(n.arsenal-12);n.infiltration=clamp(n.infiltration-5);n.logistics=clamp(n.logistics-12);alterCell(d,n.id,-8);report(s,`${NETWORKS[n.id].name} assets disrupted in ${name}. Funding, cohesion and logistics reduced.`,'success');}
  else if(o.type==='arrest'||o.type==='capture'){
    if(m?.status==='active'&&m.location===d.id&&(o.type==='arrest'||random(s)<o.chance)){
      m.status='captured';m.exposure=100;n.cohesion=clamp(n.cohesion-(m.role==='leader'?30:12));n.infighting=clamp(n.infighting+8);for(const branch of n.branches)if(branch.commander===m.id){branch.stockpile=clamp(branch.stockpile-25);branch.posture='disrupted';}n.funds=clamp(n.funds-(m.role==='financier'?30:10));n.nextDecision+=3;s.stats.membersCaptured++;
      if(m.role==='leader'){n.captured=true;n.successionAt=s.day+Math.max(14,Math.round(24/c.cohesion));s.stats.arrests++;for(const district of s.districts)alterCell(district,n.id,-district.cells[n.id]*.18);}
      report(s,`${m.name}, ${m.role} of ${NETWORKS[n.id].name}, is in custody.${m.role==='leader'?' A strong organization may attempt succession.':''}`,'success');
    }else{n.heat=clamp(n.heat+8);if(m)m.exposure=clamp(m.exposure+10);report(s,`The target evaded the operation in ${name}. The case remains active.`,'warning');}
  }else if(o.type==='flip'){
    if(m?.status==='active'&&random(s)<o.chance){m.status='defected';n.evidence=clamp(n.evidence+15);n.cohesion=clamp(n.cohesion-16);n.funds=clamp(n.funds-10);for(const member of s.members.filter(m=>m.network===n.id))member.exposure=clamp(member.exposure+15);s.stats.defections++;report(s,`${m.name} accepted a witness deal. ${NETWORKS[n.id].name} evidence and member identities improved.`,'success');}else{if(m)m.loyalty=clamp(m.loyalty+8);report(s,'The witness offer was refused. The organization remains on alert.','warning');}
  }else if(o.type==='resupply'){const u=s.units.find(u=>u.id===o.unit);if(u){u.supply=100;u.fatigue=clamp(u.fatigue-35);u.readiness=clamp(u.readiness+20);report(s,`${u.name} resupplied and recovered readiness in ${name}.`,'success');}}
  else{
    s.stats.raids++;const success=random(s)<o.chance;
    if(success){alterCell(d,n.id,-(22+o.power*.6+d.intel*.09));d.security=clamp(d.security+12);d.support=clamp(d.support+4);d.fear=clamp(d.fear-5);d.intel=clamp(d.intel+7);n.evidence=clamp(n.evidence+8);n.funds=clamp(n.funds-9);n.cohesion=clamp(n.cohesion-6);n.arsenal=clamp(n.arsenal-6);n.manpower=clamp(n.manpower-8);report(s,`Security operation succeeded in ${name}. ${NETWORKS[n.id].name} ${d.cells[n.id]<1?'cell dismantled.':'armed presence reduced.'}`,'success',{district:d.id,unit:o.unit,network:n.id,result:d.cells[n.id]<1?'cleared':'suppressed'});}
    else{alterCell(d,n.id,-8);d.intel=clamp(d.intel+10);s.trust=clamp(s.trust-(has(s,'oversight')?1:2));n.cohesion=clamp(n.cohesion-2);report(s,`${NETWORKS[n.id].name} evaded containment in ${name}. New intelligence recovered.`,'warning',{district:d.id,unit:o.unit,network:n.id,result:'evaded'});}n.heat=clamp(n.heat+8);
  }
  const unit=s.units.find(u=>u.id===o.unit);if(unit)unit.status='ready';
}
export function tick(s,{force=false}={}){
  if(s.outcome||s.pendingEvent!==null||(!force&&(s.paused||!s.started)))return false;s.day++;
  for(const u of s.units){
    if(u.status==='moving'||u.status==='training'){u.remaining--;if(u.status==='moving'){u.supply=clamp(u.supply-.25);u.fatigue=clamp(u.fatigue+.4);}if(u.remaining<=0){if(u.status==='moving')u.district=u.path.at(-1);report(s,`${u.name} ${u.status==='moving'?`arrived in ${DISTRICTS[u.district].name}`:'is ready at its recruitment base'}.`);u.status='ready';u.path=[];u.remaining=0;u.total=0;}}
    if(u.status==='operating'){u.supply=clamp(u.supply-.6);u.fatigue=clamp(u.fatigue+.5);u.readiness=clamp(u.readiness-.15);}
    if(u.status==='ready'){const target=supplyScore(s,u.district),quiet=s.districts[u.district].threat<12;u.supply=clamp(u.supply+clamp(target-u.supply,-.7,1.4));u.fatigue=clamp(u.fatigue-(quiet?1.3:.25));u.readiness=clamp(u.readiness+(quiet?.5:.08));}
  }
  const finishedWorks=s.works.filter(w=>--w.remaining<=0);s.works=s.works.filter(w=>w.remaining>0);for(const w of finishedWorks)if(w.kind==='infrastructure')finishInfrastructure(s,w,report);else finishNeighborhood(s,w,report);
  const finished=s.projects.filter(p=>--p.remaining<=0);s.projects=s.projects.filter(p=>p.remaining>0);for(const p of finished)finishProject(s,p);
  const resolved=s.operations.filter(o=>--o.remaining<=0);s.operations=s.operations.filter(o=>o.remaining>0);for(const o of resolved)finishOperation(s,o);
  for(const region of s.regions)for(const [policy,local]of [['regional-water','water'],['regional-clinics','clinic']])if(region.completed.includes(policy)){const d=s.districts.find(d=>DISTRICTS[d.id].region===region.id&&d.threat<35&&!d.completed.includes(local)&&!s.projects.some(p=>p.district===d.id&&p.id===local));if(d)deliverLocal(s,d,initiative(local));}
  if(has(s,'national-administration')&&s.day%7===0){const region=s.regions.find(r=>!r.completed.includes('regional-water'));if(region){region.completed.push('regional-water');if(!region.completed.includes('regional-administration'))region.completed.push('regional-administration');report(s,`National public service authority opened water delivery and administration in ${REGIONS[region.id].name}.`,'success');}}
  stepInfrastructure(s,report);
  const diff=DIFFICULTIES[s.difficulty],profiles=s.networks.map(n=>capabilities(s,n.id));
  for(const d of s.districts){
    const power=localPower(s,d.id),station=d.completed.includes('station')?1:0,intelUnit=unitsHere(s,d.id).some(u=>u.type==='intel');
    d.intel=clamp(d.intel+(intelUnit?1.1:0)+(has(s,'radio')?.15:0));
    for(const n of s.networks)if(d.cells[n.id]>0){const growth=n.captured||n.dismantled?0:.035*diff.growth*profiles[n.id].recruit*(.3+n.funds/100)*(1-d.support/140)*(0.7+communityProfile(d).grievance*.006);const suppression=power*.013+station*.13+(d.security>30?.04:0)+d.institutions*.0008+d.services*.003+(n.captured?.3:0);alterCell(d,n.id,n.dismantled?-d.cells[n.id]:growth-suppression);}
    d.fear=clamp(d.fear+d.threat*.0015-d.security*.0007-d.services*.008);d.prosperity=clamp(d.prosperity+d.services*.015+(d.completed.includes('jobs')?.025:0)-d.threat*.0015);
    d.displacement=clamp(d.displacement+Math.max(0,d.fear-35)*.0015-(d.completed.includes('clinic')?.03:.002));d.institutions=clamp(d.institutions+station*.025+d.services*.003-d.threat*.0005);
    d.support=clamp(d.support+(has(s,'outreach')?.09:0)+d.services*.012-d.fear*.0006-d.displacement*.0003);d.security=clamp(d.security+(power>0?.12:0)+station*.05-(d.threat>35?.04:0));
    if(d.support>=60&&d.threat<8&&(d.services>=1||d.security>=30))d.stability=clamp(d.stability+1.6+station*.2);else d.stability=clamp(d.stability-(d.threat>20?.8:.18));
  }
  s.corruption=clamp(s.corruption+.018*(s.governor==='vega'?.5:1)+s.projects.length*.004-(has(s,'integrity')?.06:0));s.inflation=clamp(s.inflation-.04,0,50);
  stepNeighborhoods(s);
  stepCartels(s,()=>random(s),report);
  const stable=stableDistricts(s),danger=s.districts.filter(d=>d.threat>=25).length,displacement=s.districts.reduce((v,d)=>v+d.displacement,0)/DISTRICTS.length;
  s.trust=clamp(s.trust+(stable*.0002-danger*.00025-s.corruption*.0005-displacement*.0002)*diff.trust);
  if(s.day%7===0){const budget=budgetForecast(s);s.money=round(clamp(s.money+budget.net,0,999999));report(s,`Weekly funding +$${Math.round(budget.income)}; operating costs $${Math.round(budget.upkeep)}.`);}
  if(stable>=STABILITY_TARGET&&s.networks.every(n=>n.dismantled))s.holdDays++;else s.holdDays=0;
  if(s.holdDays>=14){s.outcome='victory';s.paused=true;report(s,'Mandate fulfilled. The cartel organizations are dismantled and civilian institutions hold the connected country.','success');}
  else if(s.trust<=0||s.day>=MANDATE_DAYS){s.outcome='defeat';s.paused=true;report(s,s.trust<=0?'Public confidence collapsed. The mandate was withdrawn.':'The five-year national mandate expired.','warning');}
  else if(s.day>=s.nextEvent){const event=EVENTS[s.eventCount%EVENTS.length];s.pendingEvent=event.id;s.pendingRegion=event.scope==='regional'?Math.floor(random(s)*REGIONS.length):null;if(event.damage){const asset=assetState(s,`${s.pendingRegion}-${event.damage}`);if(asset){asset.condition=clamp(asset.condition-30);asset.downtime=7;}}s.eventCount++;s.paused=true;report(s,'A provincial decision needs your attention.','decision');}return true;
}
export function serialize(s){return JSON.stringify({game:'cartel-containment',version:VERSION,state:s});}

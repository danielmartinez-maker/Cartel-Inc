import {VERSION,HQ,DISTRICTS,TERRAIN,GOVERNORS,DIFFICULTIES,UNIT_TYPES,INITIATIVES,NETWORKS,EVENTS} from './data.js';
import {findRoute,NEIGHBORS} from './geography.js';

export const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,n));
const round=n=>Math.round(n*100)/100;
const initiative=id=>INITIATIVES.find(i=>i.id===id);
const has=(s,id)=>s.completed.includes(id);
const district=(s,id)=>s.districts.find(d=>d.id===id);
const ok=message=>({ok:true,message});
const no=message=>({ok:false,message});

function random(s){
  // A serializable PRNG makes a saved campaign reproduce exactly after loading.
  s.rng=(s.rng+0x6D2B79F5)>>>0;
  let t=s.rng; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61);
  return ((t^(t>>>14))>>>0)/4294967296;
}
function report(s,text,kind='info',encounter=null){
  s.log.unshift({day:s.day,text,kind,...(encounter?{encounter}:{})});
  s.log=s.log.slice(0,70);
}
export function createGame({seed=72841,governor='cruz',difficulty='standard'}={}){
  if(!GOVERNORS.some(g=>g.id===governor))governor='cruz';
  if(!DIFFICULTIES[difficulty])difficulty='standard';
  const s={version:VERSION,seed:seed>>>0,rng:seed>>>0,governor,difficulty,day:0,started:false,paused:true,speed:1,
    money:DIFFICULTIES[difficulty].starting,trust:76,corruption:18,inflation:0,holdDays:0,outcome:null,
    districts:DISTRICTS.map(d=>({id:d.id,support:d.id===HQ?67:39+(d.id*7)%15,intel:d.id===HQ?70:d.threat>20?34:16+(d.id*3)%12,
      threat:d.threat,security:d.id===HQ?55:d.id===13?28:8,stability:d.id===HQ?75:0,services:d.id===HQ?2:0,completed:[]})),
    units:[{id:1,name:'ALPHA',type:'federal',district:HQ,status:'ready',path:[],remaining:0,total:0},
      {id:2,name:'BRAVO',type:'police',district:13,status:'ready',path:[],remaining:0,total:0},
      {id:3,name:'ECHO',type:'intel',district:HQ,status:'ready',path:[],remaining:0,total:0}],
    networks:NETWORKS.map(n=>({id:n.id,funds:85,evidence:12,captured:false,dismantled:false})),
    projects:[],operations:[],completed:[],log:[],nextUnitId:4,nextEvent:18,pendingEvent:null,eventCount:0,stats:{raids:0,arrests:0,projects:0,spending:0},
  };
  report(s,'Mandate received. Protect communities, contain the networks, and build lasting control.');
  return s;
}
export const projectCost=(s,base)=>Math.ceil(base*(1+s.inflation/100));
function spend(s,cost){s.money=round(s.money-cost);s.inflation=clamp(s.inflation+cost*0.035,0,50);s.stats.spending+=cost;}
export const stableDistricts=s=>s.districts.filter(d=>d.stability>=75 && d.threat<8 && d.support>=60).length;
export const totalThreat=(s,network)=>s.districts.reduce((v,d)=>v+(network===undefined||DISTRICTS[d.id].network===network?d.threat:0),0);
export const unitsHere=(s,id)=>s.units.filter(u=>u.district===id&&u.status==='ready');
export function unitPower(s,u){return (UNIT_TYPES[u.type].power+(has(s,'training')&&u.type!=='intel'?8:0))*(s.governor==='ibarra'?1.2:1);}
export function localPower(s,id){return unitsHere(s,id).reduce((v,u)=>v+unitPower(s,u),0);}
export function movementPlan(s,unitId,destination){
  const u=s.units.find(u=>u.id===unitId);
  if(!u||!district(s,destination))return {...no('Choose a unit and a district.'),path:[],days:0};
  if(u.status!=='ready')return {...no('This unit is already assigned.'),path:[],days:0};
  if(u.district===destination)return {...no('This unit is already stationed here.'),path:[],days:0};
  const path=findRoute(u.district,destination);
  if(!path.length)return {...no('No connected route is available.'),path:[],days:0};
  const days=path.slice(1).reduce((v,id)=>v+Math.max(1,TERRAIN[DISTRICTS[id].terrain].travel-(district(s,id).completed.includes('roads')?1:0)),0);
  return {ok:true,path,days,message:`ETA ${days} ${days===1?'day':'days'}`};
}
export function operationForecast(s,id){
  const d=district(s,id);if(!d)return 0;
  return clamp(0.48+d.intel*0.004+localPower(s,id)*0.004-s.corruption*0.0015-d.threat*0.0015,0.35,0.98);
}
export function initiativeAvailability(s,id,districtId){
  const item=initiative(id),d=district(s,districtId);
  if(!item||!d)return no('Choose a valid initiative and district.');
  if(s.outcome)return no('This operation has ended.');
  const scope=item.scope==='local'?d.completed:s.completed;
  if(scope.includes(id))return no('Already completed.');
  if(s.projects.some(p=>p.id===id&&(item.scope==='province'||p.district===districtId)))return no('Already in progress.');
  if(item.requires&&!scope.includes(item.requires))return no(`Requires ${initiative(item.requires).name.toLowerCase()}.`);
  if(s.projects.length>=6)return no('Six projects are already active. Wait for one to finish.');
  if(item.scope==='local'&&d.threat>=35)return no('Reduce local threat below 35 before starting civilian or garrison projects.');
  const cost=projectCost(s,item.cost);
  if(s.money<cost)return no(`Requires $${cost}.`);
  return ok('Ready to fund');
}
export function arrestRequirements(s,networkId){
  const n=s.networks[networkId],def=NETWORKS[networkId];
  if(!n||!def)return ['Choose a valid network.'];
  const home=district(s,def.home),requirements=[];
  if(n.captured)return ['Leader already in custody.'];
  if(!has(s,'prosecutors'))requirements.push('Complete Special prosecutors');
  if(n.evidence<65)requirements.push(`Build case evidence to 65% (now ${Math.floor(n.evidence)}%)`);
  if(home.intel<60)requirements.push(`Reach 60% intelligence in ${DISTRICTS[def.home].name}`);
  if(localPower(s,def.home)<15)requirements.push(`Deploy a security unit to ${DISTRICTS[def.home].name}`);
  if(home.threat>30)requirements.push(`Reduce threat in ${DISTRICTS[def.home].name} to 30%`);
  if(s.operations.some(o=>o.type==='arrest'&&o.network===networkId))requirements.push('Arrest operation is in progress');
  if(s.money<projectCost(s,10))requirements.push(`Have $${projectCost(s,10)} available`);
  return requirements;
}

export function act(s,a){
  if(!a||typeof a!=='object')return no('Invalid action.');
  if(s.outcome)return no('This operation has ended. Start a new campaign.');
  if(a.type==='pause'){s.paused=!s.paused;if(!s.paused)s.started=true;return ok(s.paused?'Simulation paused.':'Operation running.');}
  if(a.type==='speed'){if(![1,2,3].includes(a.speed))return no('Invalid speed.');s.speed=a.speed;return ok(`Speed ${a.speed}×`);}
  if(a.type==='project'){
    const available=initiativeAvailability(s,a.id,a.district);if(!available.ok)return available;
    const item=initiative(a.id),cost=projectCost(s,item.cost);
    const days=Math.ceil(item.days*(s.governor==='cruz'&&item.category==='civilian'?0.75:1));
    spend(s,cost);s.projects.push({id:a.id,district:a.district,remaining:days,total:days});
    report(s,`${item.name} funded${item.scope==='local'?` in ${DISTRICTS[a.district].name}`:' across the province'}.`,'project');
    return ok(`${item.name} funded. Completion in ${days} days.`);
  }
  if(a.type==='move'){
    const plan=movementPlan(s,a.unit,a.district);if(!plan.ok)return no(plan.message);
    const u=s.units.find(u=>u.id===a.unit),{path,days}=plan;
    u.path=path;u.remaining=days;u.total=days;u.status='moving';
    report(s,`${u.name} is en route to ${DISTRICTS[a.district].name}. ETA ${days} days.`);
    return ok(`${u.name} dispatched. ETA ${days} days.`);
  }
  if(a.type==='recruit'){
    const type=UNIT_TYPES[a.unitType];if(!type)return no('Unknown unit type.');
    if(s.units.length>=6)return no('The province supports a maximum of six units.');
    const cost=projectCost(s,type.cost);if(s.money<cost)return no(`Requires $${cost}.`);
    spend(s,cost);const id=s.nextUnitId++,name=['','','','','DELTA','FOXTROT','GOLF','HOTEL','INDIA'][id]||`UNIT ${id}`;
    s.units.push({id,name,type:a.unitType,district:HQ,status:'training',path:[],remaining:type.days,total:type.days});
    return ok(`${name} recruited. Ready in ${type.days} days.`);
  }
  if(a.type==='investigate'||a.type==='raid'||a.type==='interdict'||a.type==='arrest'){
    let id=a.district;
    if(a.type==='arrest'){
      const req=arrestRequirements(s,a.network);if(req.length)return no(req[0]);
      id=NETWORKS[a.network].home;
    }
    const d=district(s,id);if(!d)return no('Choose a district.');
    if(s.operations.some(o=>o.district===id))return no('An operation is already active in this district.');
    const cost=projectCost(s,{investigate:6,raid:7,interdict:7,arrest:10}[a.type]);
    if(s.money<cost)return no(`Requires $${cost}.`);
    let assigned=null;
    if(a.type!=='investigate'){
      if(d.intel<(a.type==='raid'?40:30))return no(`Requires ${a.type==='raid'?40:30}% local intelligence.`);
      assigned=unitsHere(s,id).find(u=>u.type!=='intel');
      if(!assigned)return no('Deploy a ready security unit to this district first.');
      if(a.type==='raid'&&d.threat<1)return no('No active cell is present here.');
    }
    const days={investigate:4,raid:4,interdict:5,arrest:5}[a.type];
    spend(s,cost);
    s.operations.push({type:a.type,district:id,network:DISTRICTS[id].network,unit:assigned?.id??null,remaining:days,total:days,
      power:localPower(s,id),chance:operationForecast(s,id)});
    if(assigned)assigned.status='operating';
    return ok(`${{investigate:'Investigation',raid:'Security operation',interdict:'Disruption operation',arrest:'Arrest operation'}[a.type]} started. Results in ${days} days.`);
  }
  if(a.type==='event'){
    if(s.pendingEvent===null)return no('No decision is pending.');
    const event=EVENTS.find(e=>e.id===s.pendingEvent),choice=event?.choices[a.choice];if(!choice)return no('Choose a valid response.');
    if(s.money<choice.cost)return no(`Requires $${choice.cost}.`);
    if(choice.cost)spend(s,choice.cost);
    s.trust=clamp(s.trust+(choice.trust||0));s.corruption=clamp(s.corruption+(choice.corruption||0));
    for(const d of s.districts){
      d.support=clamp(d.support+(choice.support||0)+(['port','coast'].includes(DISTRICTS[d.id].terrain)?choice.coastSupport||0:0));
      d.intel=clamp(d.intel+(choice.intel||0));d.security=clamp(d.security+(choice.security||0));
    }
    for(const n of s.networks)n.evidence=clamp(n.evidence+(choice.evidence||0));
    report(s,`${event.title}: ${choice.label.toLowerCase()}.`,'decision');
    s.pendingEvent=null;s.nextEvent=s.day+24+Math.floor(random(s)*12);
    return ok('Decision recorded. Resume when ready.');
  }
  return no('Unknown command.');
}

function finishProject(s,p){
  const item=initiative(p.id),d=district(s,p.district);
  if(item.scope==='local'){
    d.completed.push(item.id);d.support=clamp(d.support+(item.support||0));
    if(['water','clinic','school','jobs'].includes(item.id))d.services++;
    if(item.id==='station')d.security=clamp(d.security+20);
    if(item.id==='roads')d.security=clamp(d.security+10);
  }else{
    s.completed.push(item.id);
    if(item.id==='analysis')for(const region of s.districts)region.intel=clamp(region.intel+8);
    if(item.id==='integrity')s.corruption=clamp(s.corruption-10);
    if(item.id==='audit'){s.corruption=clamp(s.corruption-8);for(const n of s.networks)n.evidence=clamp(n.evidence+5);}
    if(item.id==='prosecutors')for(const n of s.networks)n.evidence=clamp(n.evidence+15);
    if(item.id==='finance')for(const n of s.networks)n.funds=clamp(n.funds-30);
    if(item.id==='oversight')s.trust=clamp(s.trust+6);
  }
  s.stats.projects++;report(s,`${item.name} is now operating${item.scope==='local'?` in ${DISTRICTS[d.id].name}`:''}.`,'success');
}
function finishOperation(s,o){
  const d=district(s,o.district),n=s.networks[o.network],name=DISTRICTS[d.id].name;
  if(o.type==='investigate'){
    d.intel=clamp(d.intel+32+(has(s,'analysis')?10:0));
    const evidence=(12+(has(s,'witness')?6:0))*(s.governor==='vega'?1.25:1);
    n.evidence=clamp(n.evidence+evidence);report(s,`Investigation complete in ${name}. Local intelligence and case evidence improved.`,'success');
  }else if(o.type==='interdict'){
    n.funds=clamp(n.funds-24);n.evidence=clamp(n.evidence+9);d.threat=clamp(d.threat-8);
    report(s,`Network assets disrupted in ${name}. ${NETWORKS[n.id].name} funding reduced.`,'success');
  }else if(o.type==='arrest'){
    n.captured=true;n.funds=clamp(n.funds-35);s.trust=clamp(s.trust+5);s.stats.arrests++;
    report(s,`${NETWORKS[n.id].leader} is in custody. Remaining ${NETWORKS[n.id].name} cells can no longer recruit.`,'success');
  }else{
    s.stats.raids++;
    if(random(s)<o.chance){
      const removed=22+o.power*0.55+d.intel*0.08;
      d.threat=clamp(d.threat-removed);d.security=clamp(d.security+12);d.support=clamp(d.support+4);
      d.intel=clamp(d.intel+7);n.evidence=clamp(n.evidence+8);n.funds=clamp(n.funds-9);
      report(s,`Security operation succeeded in ${name}. ${d.threat<1?'The local cell was dismantled.':'Armed presence reduced.'}`,'success',{district:d.id,unit:o.unit,result:d.threat<1?'cleared':'suppressed'});
    }else{
      d.threat=clamp(d.threat-8);d.intel=clamp(d.intel+10);
      s.trust=clamp(s.trust-(has(s,'oversight')?1:3));
      report(s,`The cell in ${name} evaded containment. New intelligence recovered; public confidence fell.`,'warning',{district:d.id,unit:o.unit,result:'evaded'});
    }
  }
  const unit=s.units.find(u=>u.id===o.unit);if(unit)unit.status='ready';
}

export function tick(s,{force=false}={}){
  if(s.outcome||s.pendingEvent!==null||(!force&&(s.paused||!s.started)))return false;
  s.day++;
  for(const u of s.units)if(u.status==='moving'||u.status==='training'){
    u.remaining--;
    if(u.remaining<=0){
      if(u.status==='moving')u.district=u.path.at(-1);
      report(s,`${u.name} ${u.status==='moving'?`arrived in ${DISTRICTS[u.district].name}`:'is ready at headquarters'}.`);
      u.status='ready';u.path=[];u.remaining=0;u.total=0;
    }
  }
  const finished=s.projects.filter(p=>--p.remaining<=0);
  s.projects=s.projects.filter(p=>p.remaining>0);for(const p of finished)finishProject(s,p);
  const resolved=s.operations.filter(o=>--o.remaining<=0);
  s.operations=s.operations.filter(o=>o.remaining>0);for(const o of resolved)finishOperation(s,o);

  const diff=DIFFICULTIES[s.difficulty];
  for(const d of s.districts){
    const n=s.networks[DISTRICTS[d.id].network],power=localPower(s,d.id);
    const garrison=d.completed.includes('station')?1:0;
    const intelUnit=unitsHere(s,d.id).some(u=>u.type==='intel');
    d.intel=clamp(d.intel+(intelUnit?1.1:0)+(has(s,'radio')?0.15:0));
    d.support=clamp(d.support+(has(s,'outreach')?0.065:0)+d.services*0.012-(d.threat>25?0.045:0));
    if(d.threat>0){
      const growth=n.captured?0:0.16*diff.growth*(0.25+n.funds/100)*(1-d.support/150);
      const suppression=power*0.013+garrison*0.12+(d.security>30?0.045:0)+(n.captured?0.10:0);
      d.threat=clamp(d.threat+growth-suppression);
      if(d.threat<0.35)d.threat=0;
    }
    d.security=clamp(d.security+(power>0?0.12:0)+(garrison?0.05:0)-(d.threat>35?0.04:0));
    if(d.support>=60&&d.threat<8&&(d.services>=1||d.security>=30))d.stability=clamp(d.stability+1.6+(garrison?0.2:0));
    else d.stability=clamp(d.stability-(d.threat>20?0.8:0.18));
  }
  s.corruption=clamp(s.corruption+0.018*(s.governor==='vega'?0.5:1)+s.projects.length*0.006-(has(s,'integrity')?0.044:0));
  s.inflation=clamp(s.inflation-0.025,0,50);
  for(const n of s.networks){
    if(!n.captured)n.funds=clamp(n.funds+(has(s,'finance')?-0.06:0.10));
    if(n.captured&&totalThreat(s,n.id)<1&&!n.dismantled){
      n.dismantled=true;s.trust=clamp(s.trust+7);report(s,`${NETWORKS[n.id].name} has been dismantled. Its leader and remaining cells are contained.`,'success');
    }
  }
  if(s.day%21===0){
    for(const n of s.networks){
      if(n.captured||n.funds<15)continue;
      const origins=s.districts.filter(d=>DISTRICTS[d.id].network===n.id&&d.threat>28);
      const candidates=[...new Set(origins.flatMap(d=>NEIGHBORS[d.id]))].filter(id=>DISTRICTS[id].network===n.id&&s.districts[id].threat<12&&localPower(s,id)===0&&!s.districts[id].completed.includes('station'));
      if(candidates.length&&random(s)<0.58*diff.growth){
        const target=district(s,candidates[Math.floor(random(s)*candidates.length)]);
        target.threat=20;target.support=clamp(target.support-5);target.stability=clamp(target.stability-20);n.funds=clamp(n.funds-7);
        report(s,`${NETWORKS[n.id].name} activity is spreading into ${DISTRICTS[target.id].name}.`,'warning');
      }
    }
  }
  const stable=stableDistricts(s),danger=s.districts.filter(d=>d.threat>=25).length;
  s.trust=clamp(s.trust+(stable*0.008-danger*0.012-s.corruption*0.0004)*diff.trust);
  if(s.day%7===0){
    const income=round((15+stable*0.7)*diff.income);
    const upkeep=round(2+s.units.length*0.65);
    s.money=round(clamp(s.money+income-upkeep,0,999));
    report(s,`Weekly budget received: +$${income.toFixed(0)}, −$${upkeep.toFixed(0)} operating costs.`);
  }
  if(stable>=18&&s.networks.every(n=>n.dismantled))s.holdDays++;else s.holdDays=0;
  if(s.holdDays>=14){s.outcome='victory';s.paused=true;report(s,'Mandate fulfilled. Civilian institutions hold the province and all three networks are dismantled.','success');}
  else if(s.trust<=0||s.day>=730){s.outcome='defeat';s.paused=true;report(s,s.trust<=0?'Public confidence has collapsed. Your mandate has been withdrawn.':'The two-year mandate expired before lasting control was achieved.','warning');}
  else if(s.day>=s.nextEvent){
    s.pendingEvent=EVENTS[s.eventCount%EVENTS.length].id;s.eventCount++;s.paused=true;
    report(s,'A provincial decision needs your attention.','decision');
  }
  return true;
}

export function serialize(s){return JSON.stringify({game:'cartel-containment',version:VERSION,state:s});}
export function restore(text){
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

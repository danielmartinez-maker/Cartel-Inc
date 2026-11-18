import {DISTRICTS,NETWORKS,DIFFICULTIES} from './data.js';
import {INFRASTRUCTURE,INFRA_BY_REGION,assetState,transportCost} from './infrastructure.js';
import {communityProfile} from './neighborhoods.js';
import {NEIGHBORS} from './geography.js';
import {capabilities,leaderOf,successionCandidate,alterCell,cellThreat,INTENTS} from './cartels.js';
import {INCOME_TYPES,incomeForecast,stepEconomy} from './economy.js';
import {operatingUnits} from './combat.js';
import {terrainAt} from './scenarios.js';
import {stepRegionalCommand} from './regional-command.js';
const clamp=(v,min=0,max=100)=>Math.max(min,Math.min(max,v));
const present=(s,id)=>s.units.filter(u=>u.district===id&&u.type!=='intel'&&['ready','operating'].includes(u.status)).length;
const total=(s,id)=>s.districts.reduce((v,d)=>v+d.cells[id],0);
const allied=(s,a,b)=>s.pacts.some(p=>((p.a===a&&p.b===b)||(p.a===b&&p.b===a))&&p.until>s.day);
const scoreTerrain=(d,type)=>type==='mercantile'?(['port','coast'].includes(d.terrain)?18:0):type==='territorial'?(['mountain','forest'].includes(d.terrain)?16:0):type==='patronage'?(['urban','capital'].includes(d.terrain)?14:0):type==='clandestine'?(d.terrain==='forest'?18:0):type==='mobile'?(d.terrain==='border'?16:0):0;
export function planCartel(s,n){
  if(n.dismantled||n.captured)return [];
  const c=capabilities(s,n.id),leader=leaderOf(s,n.id),type=n.archetype??NETWORKS[n.id].archetype;
  const occupied=s.districts.filter(d=>d.cells[n.id]>1),front=occupied.filter(d=>d.cells[n.id]>=16),active=occupied.filter(d=>d.cells[n.id]>=12).length;
  const pressure=occupied.filter(d=>present(s,d.id)>0).sort((a,b)=>b.cells[n.id]-a.cells[n.id])[0];
  const home=s.districts[leader.location],plans=[];
  const add=(intent,score,cost,target,reason,extra={})=>{if(n.funds>=cost&&target!==undefined)plans.push({intent,score,cost,target,reason,...extra});};
  const reinforce=occupied.filter(d=>d.cells[n.id]<65).sort((a,b)=>(b.cells[n.id]+present(s,b.id)*18)-(a.cells[n.id]+present(s,a.id)*18))[0];
  if(reinforce){
    add('entrench',(12+(pressure?27:0)+(100-n.cohesion)*.18)*c.defense,6,reinforce.id,'Protecting established cells');
    add('recruit',(19+(65-reinforce.support)*.3+(45-reinforce.prosperity)*.2+communityProfile(reinforce).grievance*.12)*c.recruit,7,reinforce.id,'Seeking recruits where services are weak');
    add('coerce',(10+(100-n.cohesion)*.15)*c.coercion,5,reinforce.id,'Using intimidation to regain control');
  }
  const destinations=[...new Set(front.flatMap(d=>NEIGHBORS[d.id].filter(id=>Number.isFinite(transportCost(s,d.id,id)??1))))].map(id=>s.districts[id]);
  const expand=destinations.filter(d=>d.cells[n.id]<1&&d.id!==9&&d.threat<65&&d.stability<75).map(d=>({d,score:40-d.security*.45-d.institutions*.25-d.support*.18-present(s,d.id)*45+scoreTerrain({...DISTRICTS[d.id],terrain:terrainAt(s,d.id)},type)+(type==='mercantile'?d.prosperity*.2:0)})).sort((a,b)=>b.score-a.score||a.d.id-b.d.id)[0];
  if(expand&&active<80&&n.manpower>=8&&n.arsenal>=5)add('expand',(18+expand.score)*c.aggression,12,expand.d.id,'Probing a vulnerable neighboring district');
  const corrupt=occupied.filter(d=>d.institutions<70).sort((a,b)=>(b.prosperity-b.institutions)-(a.prosperity-a.institutions))[0];
  if(corrupt)add('bribe',(16+s.corruption*.25-corrupt.institutions*.1)*c.bribe,9,corrupt.id,'Cultivating weak local institutions');
  if(pressure){
    const refuge=NEIGHBORS[pressure.id].filter(id=>Number.isFinite(transportCost(s,pressure.id,id)??1)).map(id=>s.districts[id]).filter(d=>!present(s,d.id)&&d.threat<75&&d.id!==9).sort((a,b)=>(b.cells[n.id]-b.security)-(a.cells[n.id]-a.security))[0];
    if(refuge)add('regroup',(35+n.heat*.2)*c.logistics,5,refuge.id,'Withdrawing from concentrated security pressure',{origin:pressure.id});
  }
  if(leader.watchedUntil<s.day&&n.heat>45&&!s.operations.some(o=>o.member===leader.id)){
    const refuge=occupied.filter(d=>d.id!==leader.location&&!present(s,d.id)&&d.intel<70).sort((a,b)=>(a.intel+a.security-b.intel-b.security))[0];
    if(refuge)add('relocate',(22+n.heat*.35+present(s,home.id)*20)*c.stealth,8,refuge.id,'Moving command away from exposure');
  }
  const contested=destinations.flatMap(d=>s.networks.filter(r=>r.id!==n.id&&!r.dismantled&&d.cells[r.id]>10&&!allied(s,n.id,r.id)).map(r=>({d,r,score:22+(50-s.relations[n.id][r.id])*.18-present(s,d.id)*18+scoreTerrain({...DISTRICTS[d.id],terrain:terrainAt(s,d.id)},type)}))).sort((a,b)=>b.score-a.score)[0];
  if(contested)add('rivalry',contested.score*c.aggression,10,contested.d.id,'Contesting a rival cell',{rival:contested.r.id});
  const partner=s.networks.filter(r=>r.id!==n.id&&!r.dismantled&&!r.captured&&!allied(s,n.id,r.id)&&s.relations[n.id][r.id]>-10).sort((a,b)=>s.relations[n.id][b.id]-s.relations[n.id][a.id])[0];
  if(partner)add('pact',(12+(65-n.funds)*.4+n.heat*.08)*c.diplomacy,8,leader.location,'Seeking breathing room through a temporary pact',{rival:partner.id});
  const occupiedIds=new Set(occupied.map(d=>d.id)),available=INFRASTRUCTURE.filter(a=>occupiedIds.has(a.district));
  const infiltrate=available.filter(a=>assetState(s,a.id).infiltration<80&&assetState(s,a.id).security<65).sort((a,b)=>assetState(s,a.id).security-assetState(s,b.id).security)[0];
  if(infiltrate)add('infiltrate',(20+n.infiltration*.2+(type==='patronage'?15:0))*c.bribe,10,infiltrate.district,'Seeking leverage over a public-service or transport node',{asset:infiltrate.id});
  const frontAsset=available.filter(a=>['rail','port','airport'].includes(a.type)&&assetState(s,a.id).controller===n.id&&!n.fronts.includes(a.id))[0];
  if(frontAsset)add('front',(24+(100-n.laundering)*.15)*c.income,14,frontAsset.district,'Converting institutional access into a commercial front',{asset:frontAsset.id});
  const strategic=available.filter(a=>['power','depot','rail','bridge'].includes(a.type)&&assetState(s,a.id).condition>35).sort((a,b)=>assetState(s,a.id).security-assetState(s,b.id).security)[0];
  if(strategic&&pressure&&n.arsenal>=12)add('sabotage',(20+n.heat*.22+(type==='predatory'?20:0))*c.aggression,16,strategic.district,'Disrupting logistics under government pressure',{asset:strategic.id});
  if(n.heat>35||n.evidence>55)add('counterintel',(15+n.heat*.3+n.evidence*.13)*c.stealth,10,leader.location,'Protecting command and exposed members');
  if(n.infighting>35)add('discipline',(n.infighting*.65)*c.cohesion,12,leader.location,'Containing a leadership dispute');
  const revenues=incomeForecast(s,n.id).revenue,best=Object.keys(INCOME_TYPES).filter(key=>n.rackets[key].level<85&&n.rackets[key].blockedUntil<=s.day).sort((a,b)=>(revenues[b]+1)/(n.rackets[b].level+10)-(revenues[a]+1)/(n.rackets[a].level+10))[0];
  if(best&&occupied.length)add('diversify',(n.strategy==='profit'?43:18)+(60-n.funds)*.15,12,leader.location,`Developing ${INCOME_TYPES[best].name.toLowerCase()}`,{racket:best});
  const weights={consolidate:{entrench:1.45,regroup:1.3,recruit:1.15},profit:{front:1.65,bribe:1.25,pact:1.2},penetrate:{infiltrate:1.6,bribe:1.35},contest:{rivalry:1.25,expand:1.3,sabotage:1.35},evade:{relocate:1.5,counterintel:1.5,regroup:1.2}};
  for(const p of plans)p.score*=weights[n.strategy]?.[p.intent]??1;
  return plans.filter(p=>p.score>0).sort((a,b)=>b.score-a.score||a.target-b.target);
}
function applyPlan(s,n,p,c,random,report){
  const d=s.districts[p.target],scale=DIFFICULTIES[s.difficulty].growth;
  n.funds=clamp(n.funds-p.cost);n.intent=p.intent;n.focus=p.target;
  n.aiLog.unshift({day:s.day,intent:p.intent,target:p.target,reason:p.reason});n.aiLog=n.aiLog.slice(0,6);
  if(p.intent==='entrench'){d.fortifications[n.id]=clamp(d.fortifications[n.id]+8*c.defense);alterCell(d,n.id,2.5*c.defense);n.cohesion=clamp(n.cohesion+4);n.logistics=clamp(n.logistics+2);}
  if(p.intent==='diversify'){n.rackets[p.racket].level=clamp(n.rackets[p.racket].level+18);n.heat=clamp(n.heat+3);}
  if(p.intent==='recruit'){n.manpower=clamp(n.manpower+8*c.recruit);alterCell(d,n.id,(3+(100-d.support)*.025+(100-d.prosperity)*.015)*c.recruit*scale);n.heat=clamp(n.heat+2);}
  if(p.intent==='expand'){n.manpower=clamp(n.manpower-8);n.arsenal=clamp(n.arsenal-5);alterCell(d,n.id,12+5*scale);d.fear=clamp(d.fear+6);d.stability=clamp(d.stability-10);report(s,`${NETWORKS[n.id].name} established a cell in ${DISTRICTS[d.id].name}.`,'warning');}
  if(p.intent==='bribe'){n.infiltration=clamp(n.infiltration+3);n.patronage=clamp(n.patronage+2);d.institutions=clamp(d.institutions-3*c.bribe);s.corruption=clamp(s.corruption+.4*c.bribe);n.heat=clamp(n.heat-4);if(!s.completed.includes('witness'))n.evidence=clamp(n.evidence-1);}
  if(p.intent==='coerce'){d.fear=clamp(d.fear+5*c.coercion);d.support=clamp(d.support-1.5);d.prosperity=clamp(d.prosperity-1);n.cohesion=clamp(n.cohesion+3);n.heat=clamp(n.heat+7);if(d.intel>45)n.evidence=clamp(n.evidence+2);}
  if(p.intent==='regroup'){const origin=s.districts[p.origin],moved=Math.min(origin.cells[n.id]*.3,9*c.logistics);alterCell(origin,n.id,-moved);alterCell(d,n.id,moved);n.heat=clamp(n.heat-5);}
  if(p.intent==='relocate'){const leader=leaderOf(s,n.id);leader.location=d.id;leader.exposure=clamp(leader.exposure-12);n.heat=clamp(n.heat-12);if(n.evidence>35)report(s,`Analysts suspect ${NETWORKS[n.id].name} has relocated its command. Investigate to refresh the case.`,'info');}
  if(p.intent==='rivalry'){alterCell(d,p.rival,-(5+random()*5)*c.aggression);alterCell(d,n.id,3*scale);d.fear=clamp(d.fear+3);s.relations[n.id][p.rival]=s.relations[p.rival][n.id]=clamp(s.relations[n.id][p.rival]-12,-100,100);}
  if(p.intent==='infiltrate'){const a=assetState(s,p.asset);a.infiltration=clamp(a.infiltration+14*c.bribe);if(a.infiltration>35)a.controller=n.id;n.infiltration=clamp(n.infiltration+3);n.heat=clamp(n.heat+3);if(d.intel>50)n.evidence=clamp(n.evidence+2);}
  if(p.intent==='front'){n.fronts.push(p.asset);n.laundering=clamp(n.laundering+12);n.heat=clamp(n.heat+6);}
  if(p.intent==='sabotage'){const a=assetState(s,p.asset);a.condition=clamp(a.condition-(18+random()*12)*(s.completed.includes('resilience')?.55:1));a.downtime=5;n.arsenal=clamp(n.arsenal-12);n.heat=clamp(n.heat+12);n.evidence=clamp(n.evidence+5);d.fear=clamp(d.fear+6);report(s,`${NETWORKS[n.id].name} disrupted ${INFRASTRUCTURE.find(a=>a.id===p.asset).name}. Repairs and alternate routes may be needed.`,'warning');}
  if(p.intent==='counterintel'){n.counterintel=clamp(n.counterintel+10);n.heat=clamp(n.heat-9);d.intel=clamp(d.intel-4);for(const m of s.members.filter(m=>m.network===n.id&&m.status==='active'&&m.watchedUntil<s.day))m.exposure=clamp(m.exposure-5);}
  if(p.intent==='discipline'){n.infighting=clamp(n.infighting-22);n.cohesion=clamp(n.cohesion+8);for(const m of s.members.filter(m=>m.network===n.id&&m.status==='active'))m.loyalty=clamp(m.loyalty+3);}
  if(p.intent==='pact'){const a=Math.min(n.id,p.rival),b=Math.max(n.id,p.rival);s.pacts.push({a,b,until:s.day+21});s.relations[a][b]=s.relations[b][a]=clamp(s.relations[a][b]+15,-100,100);report(s,`${NETWORKS[a].name} and ${NETWORKS[b].name} appear to have reached a temporary arrangement.`,'info');}
}
export function stepCartels(s,random,report){
  s.pacts=s.pacts.filter(p=>p.until>s.day&&!s.networks[p.a].dismantled&&!s.networks[p.b].dismantled);
  for(const n of s.networks){
    if(n.dismantled)continue;
    const c=capabilities(s,n.id),cells=s.districts.filter(d=>d.cells[n.id]>1),leader=leaderOf(s,n.id);
    n.logistics=clamp(n.logistics+(n.funds>30?.06:-.018));n.heat=clamp(n.heat-.15*c.stealth);n.cohesion=clamp(n.cohesion+(n.captured?-.12:.035*c.cohesion));
    if(s.day%7===0){
      const ports=cells.filter(d=>['port','border'].includes(DISTRICTS[d.id].terrain)).length,trade=s.pacts.filter(p=>p.a===n.id||p.b===n.id).length;
      for(const m of s.members.filter(m=>m.network===n.id&&m.status==='active')){m.stress=clamp(m.stress+n.heat*.03+(n.captured?5:0)-(n.funds>35?2:0));m.loyalty=clamp(m.loyalty+(n.cohesion-55)*.015-(m.ambition-50)*.006-(m.stress>65?1:0)+(m.traits.includes('loyal')?.2:0));}
      stepEconomy(s,n);n.arsenal=clamp(n.arsenal+2*c.logistics);n.manpower=clamp(n.manpower+2*c.recruit);n.infighting=clamp(n.infighting+(50-n.cohesion)*.03+n.branches.filter(b=>b.splintered).length);
      if(s.day%28===0){n.strategy=n.heat>72?'evade':n.funds<30?'profit':n.infighting>55?'consolidate':n.archetype==='patronage'?'penetrate':n.archetype==='mercantile'?'profit':'contest';n.strategySince=s.day;}
    }
    stepRegionalCommand(s,n,c,random,report);
    if(n.captured){
      n.intent='recover';
      if(n.successionAt&&s.day>=n.successionAt){
        const successor=successionCandidate(s,n.id);
        if(successor&&n.cohesion>44&&n.funds>=20&&total(s,n.id)>35){
          leader.role='formerLeader';successor.role='leader';
          // Remove the promoted member from its old chain before reattaching staff.
          const previousParent=successor.commander;
          successor.commander=null;successor.authority=90;
          for(const m of s.members.filter(m=>m.network===n.id&&m.id!==successor.id)){
            if(m.commander===successor.id)m.commander=previousParent===m.id?successor.id:previousParent;
            if(m.commander===leader.id&&m.status==='active')m.commander=successor.id;
          }
          n.leaderId=successor.id;n.captured=false;n.successions++;n.cohesion=clamp(n.cohesion-15);n.evidence=Math.max(25,n.evidence-15);n.funds=clamp(n.funds-20);n.heat=35;
          report(s,`${successor.name} has taken command of ${NETWORKS[n.id].name}. Its captured leader has been replaced.`,'warning');
        }
        n.successionAt=0;
      }
      if(n.captured&&total(s,n.id)<3){
        n.dismantled=true;n.cohesion=0;for(const d of s.districts)alterCell(d,n.id,-d.cells[n.id]);
        for(const m of s.members.filter(m=>m.network===n.id&&m.status==='active'))m.status='defected';for(const branch of n.branches){branch.posture='disrupted';branch.splintered=false;}
        const cancelled=s.operations.filter(o=>o.network===n.id&&o.type!=='resupply');
        for(const o of cancelled)for(const id of operatingUnits(o)){const unit=s.units.find(u=>u.id===id);if(unit)unit.status='ready';}
        s.operations=s.operations.filter(o=>o.network!==n.id||o.type==='resupply');
        s.trust=clamp(s.trust+4);report(s,`${NETWORKS[n.id].name} has been dismantled. Remaining members have abandoned the organization.`,'success');
      }
      if(n.captured)continue;
    }
    if(s.day<n.nextDecision)continue;
    const plans=planCartel(s,n);
    if(plans.length){const top=plans.slice(0,3),sum=top.reduce((v,p)=>v+p.score*p.score,0);let pick=random()*sum,chosen=top[0];for(const p of top){pick-=p.score*p.score;if(pick<=0){chosen=p;break;}}applyPlan(s,n,chosen,c,random,report);}
    else{n.intent='recover';n.focus=leader.location;}
    n.nextDecision=s.day+Math.max(5,Math.round((9+random()*4)/c.logistics));
  }
}

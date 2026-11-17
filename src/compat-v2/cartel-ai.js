import {DISTRICTS,NETWORKS,DIFFICULTIES} from './data.js';
import {NEIGHBORS} from './geography.js';
import {capabilities,leaderOf,successionCandidate,alterCell,cellThreat,INTENTS} from './cartels.js';
const clamp=(v,min=0,max=100)=>Math.max(min,Math.min(max,v));
const present=(s,id)=>s.units.filter(u=>u.district===id&&u.type!=='intel'&&['ready','operating'].includes(u.status)).length;
const total=(s,id)=>s.districts.reduce((v,d)=>v+d.cells[id],0);
const allied=(s,a,b)=>s.pacts.some(p=>((p.a===a&&p.b===b)||(p.a===b&&p.b===a))&&p.until>s.day);
const scoreTerrain=(d,type)=>type==='mercantile'?(['port','coast'].includes(d.terrain)?18:0):type==='territorial'?(['mountain','forest'].includes(d.terrain)?16:0):type==='patronage'?(['urban','capital'].includes(d.terrain)?14:0):type==='clandestine'?(d.terrain==='forest'?18:0):type==='mobile'?(d.terrain==='border'?16:0):0;
export function planCartel(s,n){
  if(n.dismantled||n.captured)return [];
  const c=capabilities(s,n.id),leader=leaderOf(s,n.id),type=NETWORKS[n.id].archetype;
  const occupied=s.districts.filter(d=>d.cells[n.id]>1),front=occupied.filter(d=>d.cells[n.id]>=16),active=occupied.filter(d=>d.cells[n.id]>=12).length;
  const pressure=occupied.filter(d=>present(s,d.id)>0).sort((a,b)=>b.cells[n.id]-a.cells[n.id])[0];
  const home=s.districts[leader.location],plans=[];
  const add=(intent,score,cost,target,reason,extra={})=>{if(n.funds>=cost&&target!==undefined)plans.push({intent,score,cost,target,reason,...extra});};
  const reinforce=occupied.filter(d=>d.cells[n.id]<65).sort((a,b)=>(b.cells[n.id]+present(s,b.id)*18)-(a.cells[n.id]+present(s,a.id)*18))[0];
  if(reinforce){
    add('entrench',(12+(pressure?27:0)+(100-n.cohesion)*.18)*c.defense,6,reinforce.id,'Protecting established cells');
    add('recruit',(19+(65-reinforce.support)*.3+(45-reinforce.prosperity)*.2)*c.recruit,7,reinforce.id,'Seeking recruits where services are weak');
    add('coerce',(10+(100-n.cohesion)*.15)*c.coercion,5,reinforce.id,'Using intimidation to regain control');
  }
  const destinations=[...new Set(front.flatMap(d=>NEIGHBORS[d.id]))].map(id=>s.districts[id]);
  const expand=destinations.filter(d=>d.cells[n.id]<1&&d.id!==9&&d.threat<65&&d.stability<75).map(d=>({d,score:40-d.security*.45-d.institutions*.25-d.support*.18-present(s,d.id)*45+scoreTerrain(DISTRICTS[d.id],type)+(type==='mercantile'?d.prosperity*.2:0)})).sort((a,b)=>b.score-a.score||a.d.id-b.d.id)[0];
  if(expand&&active<18)add('expand',(18+expand.score)*c.aggression,12,expand.d.id,'Probing a vulnerable neighboring district');
  const corrupt=occupied.filter(d=>d.institutions<70).sort((a,b)=>(b.prosperity-b.institutions)-(a.prosperity-a.institutions))[0];
  if(corrupt)add('bribe',(16+s.corruption*.25-corrupt.institutions*.1)*c.bribe,9,corrupt.id,'Cultivating weak local institutions');
  if(pressure){
    const refuge=NEIGHBORS[pressure.id].map(id=>s.districts[id]).filter(d=>!present(s,d.id)&&d.threat<75&&d.id!==9).sort((a,b)=>(b.cells[n.id]-b.security)-(a.cells[n.id]-a.security))[0];
    if(refuge)add('regroup',(35+n.heat*.2)*c.logistics,5,refuge.id,'Withdrawing from concentrated security pressure',{origin:pressure.id});
  }
  if(leader.watchedUntil<s.day&&n.heat>45&&!s.operations.some(o=>o.member===leader.id)){
    const refuge=occupied.filter(d=>d.id!==leader.location&&!present(s,d.id)&&d.intel<70).sort((a,b)=>(a.intel+a.security-b.intel-b.security))[0];
    if(refuge)add('relocate',(22+n.heat*.35+present(s,home.id)*20)*c.stealth,8,refuge.id,'Moving command away from exposure');
  }
  const contested=destinations.flatMap(d=>s.networks.filter(r=>r.id!==n.id&&!r.dismantled&&d.cells[r.id]>10&&!allied(s,n.id,r.id)).map(r=>({d,r,score:22+(50-s.relations[n.id][r.id])*.18-present(s,d.id)*18+scoreTerrain(DISTRICTS[d.id],type)}))).sort((a,b)=>b.score-a.score)[0];
  if(contested)add('rivalry',contested.score*c.aggression,10,contested.d.id,'Contesting a rival cell',{rival:contested.r.id});
  const partner=s.networks.filter(r=>r.id!==n.id&&!r.dismantled&&!r.captured&&!allied(s,n.id,r.id)&&s.relations[n.id][r.id]>-10).sort((a,b)=>s.relations[n.id][b.id]-s.relations[n.id][a.id])[0];
  if(partner)add('pact',(12+(65-n.funds)*.4+n.heat*.08)*c.diplomacy,8,leader.location,'Seeking breathing room through a temporary pact',{rival:partner.id});
  return plans.filter(p=>p.score>0).sort((a,b)=>b.score-a.score||a.target-b.target);
}
function applyPlan(s,n,p,c,random,report){
  const d=s.districts[p.target],scale=DIFFICULTIES[s.difficulty].growth;
  n.funds=clamp(n.funds-p.cost);n.intent=p.intent;n.focus=p.target;
  n.aiLog.unshift({day:s.day,intent:p.intent,target:p.target,reason:p.reason});n.aiLog=n.aiLog.slice(0,6);
  if(p.intent==='entrench'){alterCell(d,n.id,2.5*c.defense);n.cohesion=clamp(n.cohesion+4);n.logistics=clamp(n.logistics+2);}
  if(p.intent==='recruit'){alterCell(d,n.id,(3+(100-d.support)*.025+(100-d.prosperity)*.015)*c.recruit*scale);n.heat=clamp(n.heat+2);}
  if(p.intent==='expand'){alterCell(d,n.id,12+5*scale);d.fear=clamp(d.fear+6);d.stability=clamp(d.stability-10);report(s,`${NETWORKS[n.id].name} established a cell in ${DISTRICTS[d.id].name}.`,'warning');}
  if(p.intent==='bribe'){d.institutions=clamp(d.institutions-3*c.bribe);s.corruption=clamp(s.corruption+.4*c.bribe);n.heat=clamp(n.heat-4);if(!s.completed.includes('witness'))n.evidence=clamp(n.evidence-1);}
  if(p.intent==='coerce'){d.fear=clamp(d.fear+5*c.coercion);d.support=clamp(d.support-1.5);d.prosperity=clamp(d.prosperity-1);n.cohesion=clamp(n.cohesion+3);n.heat=clamp(n.heat+7);if(d.intel>45)n.evidence=clamp(n.evidence+2);}
  if(p.intent==='regroup'){const origin=s.districts[p.origin],moved=Math.min(origin.cells[n.id]*.3,9*c.logistics);alterCell(origin,n.id,-moved);alterCell(d,n.id,moved);n.heat=clamp(n.heat-5);}
  if(p.intent==='relocate'){const leader=leaderOf(s,n.id);leader.location=d.id;leader.exposure=clamp(leader.exposure-12);n.heat=clamp(n.heat-12);if(n.evidence>35)report(s,`Analysts suspect ${NETWORKS[n.id].name} has relocated its command. Investigate to refresh the case.`,'info');}
  if(p.intent==='rivalry'){alterCell(d,p.rival,-(5+random()*5)*c.aggression);alterCell(d,n.id,3*scale);d.fear=clamp(d.fear+3);s.relations[n.id][p.rival]=s.relations[p.rival][n.id]=clamp(s.relations[n.id][p.rival]-12,-100,100);}
  if(p.intent==='pact'){const a=Math.min(n.id,p.rival),b=Math.max(n.id,p.rival);s.pacts.push({a,b,until:s.day+21});s.relations[a][b]=s.relations[b][a]=clamp(s.relations[a][b]+15,-100,100);report(s,`${NETWORKS[a].name} and ${NETWORKS[b].name} appear to have reached a temporary arrangement.`,'info');}
}
export function stepCartels(s,random,report){
  s.pacts=s.pacts.filter(p=>p.until>s.day&&!s.networks[p.a].dismantled&&!s.networks[p.b].dismantled);
  for(const n of s.networks){
    if(n.dismantled)continue;
    const c=capabilities(s,n.id),cells=s.districts.filter(d=>d.cells[n.id]>1),leader=leaderOf(s,n.id);
    n.logistics=clamp(n.logistics+(n.funds>30?.06:-.018));n.heat=clamp(n.heat-.15*c.stealth);n.cohesion=clamp(n.cohesion+(n.captured?-.12:.035*c.cohesion));
    if(s.day%7===0){
      const ports=cells.filter(d=>['port','border'].includes(DISTRICTS[d.id].terrain)).length;
      const trade=s.pacts.filter(p=>p.a===n.id||p.b===n.id).length;
      const income=(5+cells.length*.3+ports*.7+trade)*c.income*(s.completed.includes('finance')?.45:1);
      n.funds=clamp(n.funds+income*(n.captured?.25:1));
    }
    if(n.captured){
      n.intent='recover';
      if(n.successionAt&&s.day>=n.successionAt){
        const successor=successionCandidate(s,n.id);
        if(successor&&n.cohesion>44&&n.funds>=20&&total(s,n.id)>35){
          leader.role='formerLeader';successor.role='leader';n.leaderId=successor.id;n.captured=false;n.successions++;n.cohesion=clamp(n.cohesion-15);n.evidence=Math.max(25,n.evidence-15);n.funds=clamp(n.funds-20);n.heat=35;
          report(s,`${successor.name} has taken command of ${NETWORKS[n.id].name}. Its captured leader has been replaced.`,'warning');
        }
        n.successionAt=0;
      }
      if(n.captured&&total(s,n.id)<3){
        n.dismantled=true;n.cohesion=0;for(const d of s.districts)alterCell(d,n.id,-d.cells[n.id]);
        for(const m of s.members.filter(m=>m.network===n.id&&m.status==='active'))m.status='defected';
        const cancelled=s.operations.filter(o=>o.network===n.id&&o.type!=='resupply');
        for(const o of cancelled){const unit=s.units.find(u=>u.id===o.unit);if(unit)unit.status='ready';}
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

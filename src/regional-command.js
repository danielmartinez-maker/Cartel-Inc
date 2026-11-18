import {DISTRICTS,REGIONS,NETWORKS,HQ} from './data.js';
import {NEIGHBORS} from './geography.js';
import {alterCell} from './cartels.js';
import {INFRA_BY_REGION,assetState,transportCost} from './infrastructure.js';
import {communityProfile} from './neighborhoods.js';

const clamp=(v,min=0,max=100)=>Math.max(min,Math.min(max,v));
export const BRANCH_ACTIONS={hold:'Consolidate a cell',recruit:'Recruit locally',withdraw:'Disperse from security pressure',infiltrate:'Penetrate a facility',expand:'Establish a neighboring cell',rivalry:'Contest a rival',extract:'Collect local revenue'};
const security=(s,id)=>s.units.some(u=>u.district===id&&u.type!=='intel'&&['ready','operating'].includes(u.status));
const openEdge=(s,a,b)=>Number.isFinite(transportCost(s,a,b)??1);

export function commandEffectiveness(s,member){
  if(!member||member.status!=='active')return 0;
  let authority=1,parent=member,seen=new Set([member.id]);
  while(parent.commander!==null){
    parent=s.members.find(m=>m.id===parent.commander);
    if(!parent||seen.has(parent.id))return 0;
    seen.add(parent.id);
    if(parent.status!=='active')authority*=.72;
  }
  return clamp((.55+member.skill*.005+member.authority*.002-member.stress*.003)*authority,.25,1.5);
}

export function planBranch(s,n,branch){
  const commander=s.members.find(m=>m.id===branch.commander),command=commandEffectiveness(s,commander);
  if(!command||n.dismantled||(n.captured&&!branch.splintered))return [];
  const local=s.districts.slice(branch.region*24,branch.region*24+24).filter(d=>d.cells[n.id]>1);
  if(!local.length)return [];
  const plans=[],add=(intent,score,stockpile,cost,target,reason,extra={})=>{
    if(score>0&&branch.stockpile>=stockpile&&(branch.splintered||n.funds>=cost))plans.push({intent,score:score*command,stockpile,cost,target,reason,...extra});
  };
  const strongest=[...local].sort((a,b)=>b.cells[n.id]-a.cells[n.id]||a.id-b.id)[0];
  add('hold',18+(n.captured?30:0)+(100-n.cohesion)*.25,4,5,strongest.id,'Consolidating the branch after command disruption');
  const vulnerable=[...local].sort((a,b)=>communityProfile(b).grievance-communityProfile(a).grievance||a.id-b.id)[0];
  add('recruit',12+communityProfile(vulnerable).grievance*.28+(commander.traits.includes('charismatic')?15:0),8,4,vulnerable.id,'Recruiting where grievance outpaces legitimate employment');
  if(n.strategy==='profit')add('extract',45+(100-n.funds)*.15,3,0,strongest.id,'Collecting local revenue to sustain the branch');
  const pressured=local.filter(d=>security(s,d.id)).sort((a,b)=>b.cells[n.id]-a.cells[n.id])[0];
  if(pressured){
    const refuge=NEIGHBORS[pressured.id].filter(id=>id!==HQ&&DISTRICTS[id].region===branch.region&&openEdge(s,pressured.id,id)&&!security(s,id)&&s.districts[id].threat<70).sort((a,b)=>s.districts[a].security-s.districts[b].security||a-b)[0];
    if(refuge!==undefined)add('withdraw',70+n.heat*.2+(commander.traits.includes('cautious')?18:0),5,3,refuge,'Preserving local cells under concentrated security pressure',{origin:pressured.id});
  }
  const fronts=local.filter(d=>d.cells[n.id]>=16),destinations=[...new Set(fronts.flatMap(d=>NEIGHBORS[d.id].filter(id=>openEdge(s,d.id,id))))];
  const frontier=destinations.filter(id=>DISTRICTS[id].region===branch.region&&id!==HQ&&s.districts[id].cells[n.id]<1&&s.districts[id].threat<60&&s.districts[id].stability<65&&!security(s,id)).sort((a,b)=>s.districts[a].security-s.districts[b].security||a-b)[0];
  if(frontier!==undefined&&n.manpower>=6&&n.arsenal>=4&&local.length<10&&!n.captured)add('expand',25+(100-s.districts[frontier].security)*.12+(commander.traits.includes('reckless')?15:0),12,8,frontier,'Probing a neighboring district with weak institutions');
  const localIds=new Set(local.map(d=>d.id)),site=INFRA_BY_REGION[branch.region].filter(a=>localIds.has(a.district)&&assetState(s,a.id).security<60&&assetState(s,a.id).infiltration<75).sort((a,b)=>assetState(s,a.id).security-assetState(s,b.id).security||a.id.localeCompare(b.id))[0];
  if(site&&!n.captured)add('infiltrate',17+(n.strategy==='penetrate'?25:0)+(commander.traits.includes('networker')?18:0),7,6,site.district,'Cultivating a local infrastructure intermediary',{asset:site.id});
  const rival=local.flatMap(d=>s.networks.filter(r=>r.id!==n.id&&!r.dismantled&&d.cells[r.id]>8&&!s.pacts.some(p=>p.until>s.day&&[p.a,p.b].includes(n.id)&&[p.a,p.b].includes(r.id))).map(r=>({d,r}))).sort((a,b)=>a.d.id-b.d.id||a.r.id-b.r.id)[0];
  if(rival&&!n.captured)add('rivalry',22+(n.strategy==='contest'?20:0),10,7,rival.d.id,'Contesting a rival inside regional territory',{rival:rival.r.id});
  return plans.sort((a,b)=>b.score-a.score||a.target-b.target);
}

function applyBranchPlan(s,n,b,p,c){
  const d=s.districts[p.target];b.stockpile=clamp(b.stockpile-p.stockpile);
  if(!b.splintered)n.funds=clamp(n.funds-p.cost);
  b.lastAction={day:s.day,intent:p.intent,target:p.target,reason:p.reason};
  if(p.intent==='hold')alterCell(d,n.id,b.splintered?4:2*c.defense);
  if(p.intent==='recruit'){n.manpower=clamp(n.manpower+3*c.recruit);alterCell(d,n.id,2*c.recruit);}
  if(p.intent==='withdraw'){const origin=s.districts[p.origin],moved=Math.min(origin.cells[n.id]*.2,6);alterCell(origin,n.id,-moved);alterCell(d,n.id,moved);}
  if(p.intent==='expand'){alterCell(d,n.id,10);n.manpower=clamp(n.manpower-6);n.arsenal=clamp(n.arsenal-4);d.fear=clamp(d.fear+3);d.stability=clamp(d.stability-8);}
  if(p.intent==='extract'){const income=3+d.prosperity*.03;n.funds=clamp(n.funds+income*(b.splintered?.25:1));b.stockpile=clamp(b.stockpile+income);d.prosperity=clamp(d.prosperity-.5);}
  if(p.intent==='infiltrate'){const a=assetState(s,p.asset);a.infiltration=clamp(a.infiltration+8*c.bribe);if(a.infiltration>35)a.controller=n.id;}
  if(p.intent==='rivalry'){alterCell(d,p.rival,-4*c.aggression);alterCell(d,n.id,2);d.fear=clamp(d.fear+2);s.relations[n.id][p.rival]=s.relations[p.rival][n.id]=clamp(s.relations[n.id][p.rival]-5,-100,100);}
  if(b.splintered)d.fear=clamp(d.fear+1);
}

export function stepRegionalCommand(s,n,c,random,report){
  for(const b of n.branches){
    const commander=s.members.find(m=>m.id===b.commander),active=commander?.status==='active';
    b.autonomy=clamp(b.autonomy+(n.captured?.35:-.025)+(active&&commander.traits.includes('ambitious')?.04:0));
    b.loyalty=clamp(b.loyalty+(n.cohesion-60)*.0007-(commander?.ambition??50)*.00015-(n.captured?.15:0));
    if(active&&b.autonomy>75&&b.loyalty<40&&!b.splintered){b.splintered=true;n.infighting=clamp(n.infighting+12);report(s,`${commander.name}'s regional branch of ${NETWORKS[n.id].name} has become autonomous.`,'warning');}
    if(s.day%7===0&&active){
      const local=s.districts.slice(b.region*24,b.region*24+24).filter(d=>d.cells[n.id]>1);
      if(b.splintered)b.stockpile=clamp(b.stockpile+local.length*.5);
      else if(!n.captured&&n.funds>=4){n.funds-=4;b.stockpile=clamp(b.stockpile+8*c.logistics);}
    }
    if(s.day<b.nextDecision)continue;
    b.posture=!active?'disrupted':b.splintered?'autonomous':n.strategy==='profit'?'extract':'hold';
    const plans=planBranch(s,n,b),top=plans.slice(0,3);let chosen;
    if(top.length){let pick=random()*top.reduce((v,p)=>v+p.score*p.score,0);chosen=top.at(-1);for(const p of top){pick-=p.score*p.score;if(pick<=0){chosen=p;break;}}applyBranchPlan(s,n,b,chosen,c);}
    b.nextDecision=s.day+Math.round(21+(1-commandEffectiveness(s,commander))*8);
  }
}

// A deterministic legal-orders-only campaign driver for balance regression.
// It never edits campaign resources, evidence, locations or AI state.
import {createGame,act,tick,stableDistricts,arrestRequirements,totalThreat,localPower,serialize,restore,leaderOf} from '../src/engine.js';
import {DISTRICTS,REGIONS,MANDATE_DAYS,HQ,EVENTS} from '../src/data.js';
import {fileURLToPath} from 'node:url';
export function simulateCampaign({seed=72841,difficulty='standard',governor='cruz',maxDays=MANDATE_DAYS}={}){
  let s=createGame({seed,difficulty,governor});
  const issue=a=>act(s,a).ok;
  const scheduled=(id,region=null)=>s.completed.includes(id)||region!==null&&s.regions[region].completed.includes(id)||s.projects.some(p=>p.id===id&&(region===null||p.region===region));
  for(let day=0;day<maxDays&&!s.outcome;day++){
    if(s.pendingEvent){
      const choices=EVENTS.find(e=>e.id===s.pendingEvent).choices;
      const choice=choices[1].cost<=s.money?1:choices.findIndex(c=>c.cost<=s.money);
      if(choice<0)throw new Error(`No affordable response to ${s.pendingEvent} on day ${s.day}.`);
      if(!issue({type:'event',choice}))throw new Error('The legal campaign driver could not resolve its pending decision.');
    }
    // Secure core institutions before expanding the force and provincial programs.
    for(const id of ['outreach','analysis','prosecutors','integrity','training','witness','finance','radio','logistics','oversight','audit'])if(!scheduled(id)&&s.money>45)issue({type:'project',id,district:HQ});
    if(s.units.length<11&&s.money>70)issue({type:'recruit',unitType:s.units.length%3===0?'federal':'police'});
    const security=s.units.filter(u=>u.type!=='intel'),assigned=new Set();
    for(const [index,u]of security.entries()){
      if(u.status!=='ready')continue;
      let nid=index%9;
      if(s.networks[nid].dismantled)nid=s.networks.filter(n=>!n.dismantled&&!assigned.has(n.id)).sort((a,b)=>totalThreat(s,b.id)-totalThreat(s,a.id))[0]?.id;
      if(nid===undefined)continue;assigned.add(nid);
      const n=s.networks[nid],leader=leaderOf(s,nid),local=s.districts[u.district];
      if((u.supply<48||u.fatigue>45)&&issue({type:'resupply',unit:u.id}))continue;
      const target=n.captured?s.districts.filter(d=>d.cells[nid]>1).sort((a,b)=>b.cells[nid]-a.cells[nid]||a.id-b.id)[0]?.id:leader.location;
      if(target===undefined)continue;
      const d=s.districts[target];
      if(!n.captured&&(n.evidence<65||d.intel<65||leader.watchedUntil<s.day+6)&&s.money>15)issue({type:'investigate',district:target,network:nid});
      if(u.district!==target){issue({type:'move',unit:u.id,district:target});continue;}
      if(s.operations.some(o=>o.district===target))continue;
      if(!n.captured&&local.threat<=30&&n.cohesion<63&&!arrestRequirements(s,nid).length){issue({type:'arrest',network:nid});continue;}
      if(local.threat>28||n.captured){
        const cell=local.cells[nid]>1?nid:local.cells.indexOf(Math.max(...local.cells));
        if(local.intel<40)issue({type:'investigate',district:target,network:nid});else issue({type:'raid',district:target,network:cell});
      }else if(!n.captured&&n.cohesion>=63&&local.intel>=30)issue({type:'interdict',district:target,network:nid});
    }
    // Civilian rollouts stabilize whole provinces without issuing 120 duplicate orders.
    for(const r of REGIONS)for(const id of ['regional-water','regional-clinics','regional-administration'])if(!scheduled(id,r.id)&&s.money>100)issue({type:'project',id,district:r.hub});
    const intel=s.units.find(u=>u.type==='intel');
    if(intel?.status==='ready'){
      const target=s.networks.filter(n=>!n.captured).map(n=>leaderOf(s,n.id)).filter(m=>s.districts[m.location].intel<70).sort((a,b)=>s.districts[a.location].intel-s.districts[b.location].intel)[0];
      if(target&&intel.district!==target.location)issue({type:'move',unit:intel.id,district:target.location});
    }
    tick(s,{force:true});
    if(day%37===0)s=restore(serialize(s));
  }
  return s;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const runs=[];
  for(const difficulty of ['relaxed','standard','veteran'])for(const seed of [72841,4,197]){
    const s=simulateCampaign({seed,difficulty});runs.push({difficulty,seed,outcome:s.outcome,day:s.day,stable:stableDistricts(s),arrests:s.stats.arrests,dismantled:s.networks.filter(n=>n.dismantled).length,remainingThreat:Math.round(totalThreat(s)),trust:Math.round(s.trust),money:Math.round(s.money)});
  }
  console.table(runs);if(runs.some(r=>r.outcome!=='victory'))process.exitCode=1;
}

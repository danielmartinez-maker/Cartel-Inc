// A deterministic legal-orders-only campaign driver for balance regression.
// It never edits resources, threat, evidence or progress directly.
import {createGame,act,tick,stableDistricts,arrestRequirements,totalThreat,localPower,serialize,restore} from '../src/engine.js';
import {DISTRICTS,NETWORKS} from '../src/data.js';
import {fileURLToPath} from 'node:url';

export function simulateCampaign({seed=72841,difficulty='standard',governor='cruz',maxDays=730}={}){
  let s=createGame({seed,difficulty,governor});
  const issue=a=>act(s,a).ok;
  const scheduled=id=>s.completed.includes(id)||s.projects.some(p=>p.id===id);
  for(let day=0;day<maxDays&&!s.outcome;day++){
    if(s.pendingEvent){issue({type:'event',choice:1});}
    if(s.units.length<4)issue({type:'recruit',unitType:'police'});
    for(const id of ['analysis','prosecutors','outreach','integrity'])if(!scheduled(id))issue({type:'project',id,district:9});
    for(const n of s.networks){
      if(!n.captured){
        const home=NETWORKS[n.id].home,d=s.districts[home];
        if(n.evidence<65||d.intel<60)issue({type:'investigate',district:home});
        if(!arrestRequirements(s,n.id).length)issue({type:'arrest',network:n.id});
      }
    }
    const security=s.units.filter(u=>u.type!=='intel');
    for(const [index,u]of security.entries()){
      if(u.status!=='ready')continue;
      const network=index%3,n=s.networks[network],home=NETWORKS[network].home;
      const local=s.districts[u.district];
      if(DISTRICTS[u.district].network===network&&local.threat>5){
        if(local.intel<40)issue({type:'investigate',district:u.district});
        else issue({type:'raid',district:u.district});
        continue;
      }
      let target=home;
      if(n.captured){
        const targets=s.districts.filter(d=>DISTRICTS[d.id].network===network&&d.threat>0.5).sort((a,b)=>b.threat-a.threat);
        if(targets.length)target=targets[0].id;
        else continue;
      }
      if(u.district!==target)issue({type:'move',unit:u.id,district:target});
    }
    const intel=s.units.find(u=>u.type==='intel');
    if(intel?.status==='ready'){
      const target=s.districts.filter(d=>d.threat>0&&d.intel<60).sort((a,b)=>b.threat-a.threat)[0];
      if(target&&intel.district!==target.id)issue({type:'move',unit:intel.id,district:target.id});
    }
    // A local job program plus time and community outreach can establish support.
    const quiet=s.districts.filter(d=>d.threat<25&&d.services<1&&!s.projects.some(p=>p.district===d.id&&['jobs','clinic','water'].includes(p.id))).sort((a,b)=>b.support-a.support);
    const serviceCount=s.districts.filter(d=>d.services>0).length+s.projects.filter(p=>['jobs','clinic','water'].includes(p.id)).length;
    if(serviceCount<19&&s.networks.filter(n=>n.captured).length>=2){
      for(const d of quiet)if(issue({type:'project',id:'jobs',district:d.id}))break;
    }
    for(const d of s.districts.filter(d=>d.services>0&&d.support<60&&d.threat<25&&!d.completed.includes('water'))){
      if(s.networks.every(n=>n.captured))if(issue({type:'project',id:'water',district:d.id}))break;
    }
    tick(s,{force:true});
    // Validate saves while work is in flight, not just at campaign creation.
    if(day%37===0)s=restore(serialize(s));
  }
  return s;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const runs=[];
  for(const difficulty of ['relaxed','standard','veteran'])for(const seed of [72841,4,197]){
    const s=simulateCampaign({seed,difficulty});
    runs.push({difficulty,seed,outcome:s.outcome,day:s.day,stable:stableDistricts(s),captured:s.stats.arrests,remainingThreat:Math.round(totalThreat(s)),trust:Math.round(s.trust),money:Math.round(s.money)});
  }
  console.table(runs);
  if(runs.some(r=>r.outcome!=='victory'))process.exitCode=1;
}

import {REGIONS,DISTRICTS,TRANSPORT_LINKS,PROVINCE_NEIGHBORS,HQ} from './data.js';
import {seeded} from './cartels.js';
const clamp=(v,min=0,max=100)=>Math.max(min,Math.min(max,v));
export const INFRA_TYPES={
 power:{name:'Power station',icon:'power',description:'Electricity feeds water pumping, hospitals and communications.'},
 water:{name:'Waterworks',icon:'water',description:'Reliable water reduces grievance and supports public health; pumping depends on power.'},
 hospital:{name:'Regional hospital',icon:'hospital',description:'Health coverage depends on water and electricity.'},
 telecom:{name:'Telecom exchange',icon:'radio',description:'Communications improve intelligence and coordination; power interruptions reduce coverage.'},
 depot:{name:'Logistics depot',icon:'depot',description:'Supplies security units and relief teams. Infiltration diverts deliveries.'},
 rail:{name:'Rail terminal',icon:'train',description:'Freight capacity supports jobs, commerce and military supply.'},
 port:{name:'Commercial port',icon:'anchor',description:'Coastal trade supports jobs and revenue, but attracts cartel infiltration.'},
 airport:{name:'Regional airfield',icon:'plane',description:'Improves logistics, commerce and disaster response.'},
 dam:{name:'Reservoir and dam',icon:'dam',description:'Provides reserve power and water, limiting outage cascades.'},
 university:{name:'Technical university',icon:'school',description:'Education supports employment, legitimacy and institutional capacity.'},
 highway:{name:'Interprovincial highway',icon:'road',description:'A real land corridor. Condition and infiltration affect travel and national access.'},
 bridge:{name:'Strategic bridge',icon:'bridge',description:'A critical land crossing. Severe damage closes it and forces rerouting.'},
};
const slots={power:7,water:20,hospital:13,telecom:8,depot:9,rail:21,port:18,airport:4,dam:15,university:16};
export const INFRASTRUCTURE=REGIONS.flatMap(r=>['power','water','hospital','telecom','depot','rail',...(r.coastal?['port']:[]),...(r.id%4===0?['airport']:[]),...(r.id%5===0?['dam']:[]),...(r.id%2===0?['university']:[])].map(type=>({id:`${r.id}-${type}`,type,region:r.id,district:r.id*24+slots[type],name:`${r.name} ${INFRA_TYPES[type].name.toLowerCase()}`,x:DISTRICTS[r.id*24+slots[type]].x+37,y:DISTRICTS[r.id*24+slots[type]].y-24}))).concat(TRANSPORT_LINKS.map(l=>({id:l.id,type:l.type,region:DISTRICTS[l.a].region,regions:l.regions,district:l.a,link:l.id,name:`${REGIONS[l.regions[0]].name}–${REGIONS[l.regions[1]].name} ${l.type}`,x:(DISTRICTS[l.a].x+DISTRICTS[l.b].x)/2,y:(DISTRICTS[l.a].y+DISTRICTS[l.b].y)/2})));
export const INFRA_INDEX=new Map(INFRASTRUCTURE.map((a,index)=>[a.id,index]));
export const INFRA_BY_REGION=REGIONS.map(r=>INFRASTRUCTURE.filter(a=>a.region===r.id||a.regions?.includes(r.id)));
export const INFRA_TASKS={repair:{name:'Repair',cost:18,days:12},upgrade:{name:'Expand capacity',cost:38,days:24},secure:{name:'Secure facility',cost:14,days:8},audit:{name:'Audit and remove fronts',cost:12,days:7}};
export function createInfrastructure(seed){const random=seeded(seed^0x7811);return INFRASTRUCTURE.map(a=>({id:a.id,condition:65+Math.floor(random()*29),level:1,security:a.type==='depot'?45:20+Math.floor(random()*15),infiltration:['port','rail','airport'].includes(a.type)?15+Math.floor(random()*15):5+Math.floor(random()*9),controller:null,load:55+Math.floor(random()*25),downtime:0}));}
export const assetState=(s,id)=>s.assets[INFRA_INDEX.get(id)];
const output=a=>a?clamp(a.condition*(.8+a.level*.2)*(1-a.infiltration/180)*(a.downtime>0?.25:1)):0;
export function provincialInfrastructure(s,region){
 const assets=INFRA_BY_REGION[region];const read=type=>output(assetState(s,assets.find(a=>a.type===type)?.id)),power=clamp(read('power')+read('dam')*.2),water=read('water')*(.4+power*.006),health=read('hospital')*(.3+power*.0035+water*.0035),comms=read('telecom')*(.35+power*.0065);
 const logistics=clamp(read('depot')*.5+read('rail')*.35+read('airport')*.15),commerce=clamp(read('rail')*.55+(assets.some(a=>a.type==='port')?read('port')*.3:power*.3)+read('airport')*.15);
 return {power,water,health,comms,logistics,commerce,education:read('university'),average:(power+water+health+comms+logistics+commerce)/6};
}
export function nationalAccess(s){const distance=REGIONS.map(()=>Infinity),pending=new Set(REGIONS.map(r=>r.id));distance[DISTRICTS[HQ].region]=0;while(pending.size){let current=-1;for(const id of pending)if(current<0||distance[id]<distance[current])current=id;pending.delete(current);if(distance[current]===Infinity)break;for(const next of PROVINCE_NEIGHBORS[current]){const link=TRANSPORT_LINKS.find(l=>l.regions.includes(current)&&l.regions.includes(next)),a=assetState(s,link.id);if(a.type==='bridge'&&a.condition<15)continue;if(link.type==='bridge'&&a.condition<15)continue;const cost=3/(.3+output(a)/100);distance[next]=Math.min(distance[next],distance[current]+cost);}}return distance;}
export function transportCost(s,a,b){const link=TRANSPORT_LINKS.find(l=>(l.a===a&&l.b===b)||(l.a===b&&l.b===a));if(!link)return null;const asset=assetState(s,link.id);return link.type==='bridge'&&asset.condition<15?Infinity:Math.ceil(link.days+(100-output(asset))*.035);}
export function infrastructureAvailability(s,id,task){const a=assetState(s,id),def=INFRASTRUCTURE[INFRA_INDEX.get(id)],t=INFRA_TASKS[task];if(!a||!t)return 'Choose a valid facility and task.';if(s.outcome)return 'The mandate has ended.';if(s.works.some(w=>w.kind==='infrastructure'&&w.target===id))return 'Work is already underway here.';if(task==='upgrade'&&a.level>=3)return 'Capacity is already at its maximum.';if(task==='audit'&&s.districts[def.district].intel<30)return 'Requires 30% intelligence in this district.';if(s.works.length>=40)return 'The national works desk is at capacity.';return '';}
export function finishInfrastructure(s,work,report){const a=assetState(s,work.target),def=INFRASTRUCTURE[INFRA_INDEX.get(work.target)];if(work.task==='repair'){a.condition=clamp(a.condition+50);a.downtime=0;}if(work.task==='upgrade'){a.level++;a.condition=clamp(a.condition+15);a.load=clamp(a.load-20);}if(work.task==='secure'){a.security=clamp(a.security+40);a.infiltration=clamp(a.infiltration-12);}if(work.task==='audit'){if(a.controller!==null){const n=s.networks[a.controller];n.funds=clamp(n.funds-18);n.evidence=clamp(n.evidence+14);n.infiltration=clamp(n.infiltration-8);}a.infiltration=clamp(a.infiltration-(s.completed.includes('counterintelligence')?45:30));if(a.infiltration<20)a.controller=null;}s.stats.infrastructure++;report(s,`${def.name}: ${INFRA_TASKS[work.task].name.toLowerCase()} complete.`,'success');}
export function stepInfrastructure(s,report){
 for(const a of s.assets){const def=INFRASTRUCTURE[INFRA_INDEX.get(a.id)],d=s.districts[def.district],priority=s.regions[def.region].priority;const wear=(.012+Math.max(0,a.load-75)*.0007)*(s.completed.includes('resilience')?.45:1);a.condition=clamp(a.condition-wear+(priority==='economy'?.025:0));a.downtime=Math.max(0,a.downtime-1);a.load=clamp(a.load+(70-a.level*16+d.threat*.08-a.load)*.002);a.infiltration=clamp(a.infiltration+(d.threat*.0006-a.security*.00045-(priority==='integrity'?.035:0)-(s.completed.includes('counterintelligence')?.018:0)));if(a.controller!==null&&s.networks[a.controller].dismantled){a.controller=null;a.infiltration=clamp(a.infiltration-20);}}
 s.regions.forEach(r=>{r.services=provincialInfrastructure(s,r.id);});
 if(s.day%14===0){const failures=s.assets.filter(a=>a.condition<25);if(failures.length)report(s,`${failures.length} major infrastructure sites need urgent repairs.`,'warning');}
}

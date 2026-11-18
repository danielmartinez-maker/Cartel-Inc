import {DISTRICTS,REGIONS,NETWORKS,EVENTS,HQ,PROVINCE_NEIGHBORS} from './data.js';
import {seeded,syncThreat} from './cartels.js';
import {createNeighborhoods} from './neighborhoods.js';
import {INFRASTRUCTURE,assetState,provincialInfrastructure} from './infrastructure.js';

export const SCENARIO_VERSION=1;
export const SCENARIOS={
 recovery:{name:'After the storm',description:'Damaged utilities, displaced communities and exposed public works.',damage:22,fear:5,biomes:['wetland','forest','temperate']},
 trade:{name:'The contested corridor',description:'Rich freight routes attract rival networks and commercial fronts.',damage:5,fear:3,biomes:['temperate','arid','forest']},
 drought:{name:'The dry season',description:'Water shortages strain employment and confidence in government.',damage:12,fear:4,biomes:['arid','highland','temperate']},
 fractured:{name:'A fractured command',description:'Disloyal regional bosses contest weak central leadership.',damage:7,fear:7,biomes:['forest','highland','temperate']},
 urban:{name:'The city contract',description:'Urban influence and procurement corruption fund competing organizations.',damage:8,fear:3,biomes:['temperate','forest','arid']},
 frontier:{name:'Beyond the checkpoints',description:'Remote resource provinces sustain mobile cells and illicit extraction.',damage:10,fear:6,biomes:['highland','forest','arid']},
};
export const SECTORS={agriculture:{name:'Agriculture',color:'#aab479'},mining:{name:'Minerals',color:'#bb9371'},industry:{name:'Industry',color:'#7faaa0'},commerce:{name:'Commerce',color:'#d5b56e'},energy:{name:'Energy',color:'#bd9a51'}};
export const BIOMES={temperate:{name:'Temperate',color:'#cfbb84'},forest:{name:'Woodland',color:'#879f79'},highland:{name:'Highlands',color:'#b59c79'},arid:{name:'Dry country',color:'#d3ab70'},wetland:{name:'Wetlands',color:'#86a69c'}};
const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,n));
const pick=(r,a)=>a[Math.floor(r()*a.length)];
function shuffled(random,items){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function distances(start){const d=REGIONS.map(()=>Infinity),q=[start];d[start]=0;for(const id of q)for(const next of PROVINCE_NEIGHBORS[id])if(d[next]===Infinity){d[next]=d[id]+1;q.push(next);}return d;}
export function scenarioCode(s){return s.scenario?`CC${s.scenario.version}-${s.seed}-${s.scenario.type}-${s.governor}-${s.difficulty}`:`CLASSIC-${s.seed}-${s.governor}-${s.difficulty}`;}
export function terrainAt(s,id){
 const base=DISTRICTS[id].terrain,biome=s.regions[DISTRICTS[id].region]?.biome;
 if(!s.scenario||!['rural','forest','mountain'].includes(base))return base;
 if(biome==='highland'&&id%3!==0)return 'mountain';
 if(biome==='forest'&&id%3!==0)return 'forest';
 if(biome==='wetland'&&base!=='mountain'&&id%2===0)return 'wetland';
 if(biome==='arid'&&base!=='mountain')return 'arid';
 return base;
}

export function applyScenario(s,requested='auto'){
 if(requested==='classic'){s.scenario=null;return;}
 const random=seeded(s.seed^0x742ac51),directed=pick(random,Object.keys(SCENARIOS)),type=requested==='auto'?directed:requested;
 if(!Object.hasOwn(SCENARIOS,type))throw new Error('Choose a valid campaign scenario.');
 const theme=SCENARIOS[type],sectors=Object.keys(SECTORS),archetypes=['territorial','mercantile','clandestine','predatory','patronage','mobile'];
 const anchors=[];
 for(const id of shuffled(random,REGIONS.map(r=>r.id)).filter(id=>id!==0)){
  if(anchors.every(other=>distances(other)[id]>=2))anchors.push(id);
  if(anchors.length===NETWORKS.length)break;
 }
 for(const id of shuffled(random,REGIONS.map(r=>r.id)))if(anchors.length<NETWORKS.length&&!anchors.includes(id))anchors.push(id);
 const routes=anchors.map(distances),owners=REGIONS.map(r=>routes.map((d,n)=>({n,score:d[r.id]+random()*.95})).sort((a,b)=>a.score-b.score||a.n-b.n)[0].n);
 anchors.forEach((region,n)=>owners[region]=n);
 s.scenario={version:SCENARIO_VERSION,type,name:`${pick(random,['Amber','Cedar','Copper','Dawn','Juniper','Salt','Silver','Verdant'])} ${pick(random,['Accord','Horizon','Mandate','Passage','Watch'])}`,anchors,owners,eventDeck:shuffled(random,EVENTS.map(e=>e.id)),signature:''};
 for(const r of s.regions){
  r.biome=pick(random,theme.biomes);r.sector=pick(random,sectors);r.weather=type==='drought'?10+Math.floor(random()*25):type==='recovery'?65+Math.floor(random()*30):25+Math.floor(random()*55);
  r.resources={agriculture:20+Math.floor(random()*60),minerals:10+Math.floor(random()*70),fuel:10+Math.floor(random()*70),market:25+Math.floor(random()*60)};
  if(r.sector==='agriculture')r.resources.agriculture=85;if(r.sector==='mining')r.resources.minerals=90;if(r.sector==='energy')r.resources.fuel=90;if(['commerce','industry'].includes(r.sector))r.resources.market=90;
 }
 for(const d of s.districts){
  const def=DISTRICTS[d.id],r=s.regions[def.region],safe=d.id===HQ||d.id===13,owner=owners[def.region];
  d.cells=NETWORKS.map(()=>0);d.cells[owner]=safe?0:random()<.20?25+Math.floor(random()*25):random()<.4?2+Math.floor(random()*7):0;
  if(!safe&&random()<.09){const rival=pick(random,NETWORKS.filter(n=>n.id!==owner));d.cells[rival.id]=8+Math.floor(random()*12);}
  syncThreat(d);d.support=safe?67:37+Math.floor(random()*22);d.intel=safe?70:d.threat>=25?30+Math.floor(random()*12):14+Math.floor(random()*18);
  d.security=safe?55:6+Math.floor(random()*12);d.stability=d.id===HQ?75:0;d.services=d.id===HQ?2:0;
  d.prosperity=clamp(24+r.resources.market*.25+random()*18-(type==='drought'?8:0));d.fear=clamp(d.threat*.6+theme.fear);d.displacement=3+Math.floor(random()*9)+(type==='recovery'?8:0);d.institutions=safe?65:20+Math.floor(random()*25);
 }
 const homes=[];
 for(const n of s.networks){
  n.archetype=pick(random,archetypes);n.funds=62+Math.floor(random()*25);n.cohesion=type==='fractured'?42+random()*22:60+random()*25;n.heat=12+random()*20;n.arsenal=45+random()*35;n.manpower=45+random()*30;n.logistics=55+random()*30;n.nextDecision=5+Math.floor(random()*9);
  n.fronts=[];const available=s.districts.filter(d=>DISTRICTS[d.id].region===anchors[n.id]&&d.id!==HQ&&d.id!==13),home=pick(random,available);homes[n.id]=home.id;
  home.cells[n.id]=Math.max(42,home.cells[n.id]);syncThreat(home);n.focus=home.id;
  const territories=s.districts.filter(d=>d.cells[n.id]>1&&d.id!==HQ),staff=s.members.filter(m=>m.network===n.id);
  for(const m of staff){m.location=m.role==='leader'?home.id:pick(random,territories).id;m.neighborhood=Math.floor(random()*3);}
  const regions=[...new Set(territories.map(d=>DISTRICTS[d.id].region))];
  n.branches.forEach((b,i)=>{b.region=regions[Math.min(i,regions.length-1)];const boss=staff.find(m=>m.id===b.commander);boss.location=pick(random,territories.filter(d=>DISTRICTS[d.id].region===b.region)).id;b.autonomy=type==='fractured'?65+random()*20:25+random()*35;b.loyalty=type==='fractured'?30+random()*25:50+random()*30;b.stockpile=35+random()*25;b.nextDecision=12+i*3+Math.floor(random()*7);});
 }
 for(const a of s.assets){
  const def=INFRASTRUCTURE.find(d=>d.id===a.id),r=s.regions[def.region];a.controller=null;
  const exposed=type==='recovery'||type==='drought'&&['power','water','dam'].includes(def.type);
  a.condition=clamp(78+random()*20-theme.damage*(exposed?1.5:.5),20,100);a.infiltration=5+random()*18+(type==='urban'?10:0);a.load=45+random()*35+(type==='trade'&&['rail','port'].includes(def.type)?12:0);
  if(exposed&&!['bridge','highway'].includes(def.type)&&random()<.13){a.downtime=3+Math.floor(random()*5);a.condition=clamp(a.condition-20,20,100);}
 }
 for(const n of s.networks){const front=INFRASTRUCTURE.find(a=>['rail','port','airport'].includes(a.type)&&owners[a.region]===n.id&&s.districts[a.district].cells[n.id]>1&&assetState(s,a.id).controller===null);if(front){const a=assetState(s,front.id);a.controller=n.id;a.infiltration=45;n.fronts.push(a.id);}}
 for(let i=0;i<2;i++){const a=Math.floor(random()*8),b=a+1+Math.floor(random()*(8-a));s.relations[a][b]=s.relations[b][a]=20+random()*30;if(!s.pacts.some(p=>p.a===a&&p.b===b))s.pacts.push({a,b,until:14+Math.floor(random()*14)});}
 for(const d of s.districts)d.neighborhoods=createNeighborhoods(d);
 for(const r of s.regions)r.services=provincialInfrastructure(s,r.id);
 s.nextEvent=18+Math.floor(random()*15);s.scenario.homes=homes;
 // This digest labels the authored opening, not an evolving save or UI image.
 const source=JSON.stringify([s.seed,type,owners,homes,s.regions.map(r=>[r.biome,r.sector,r.resources]),s.districts.map(d=>d.cells),s.assets.map(a=>[a.condition,a.downtime])]);
 let hash=2166136261;for(let i=0;i<source.length;i++)hash=Math.imul(hash^source.charCodeAt(i),16777619)>>>0;s.scenario.signature=hash.toString(16).padStart(8,'0');
}

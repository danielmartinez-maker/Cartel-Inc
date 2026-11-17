import {DISTRICTS,NETWORKS} from './data.js';
export const ARCHETYPES={
  territorial:{name:'Territorial stronghold',description:'Fortifies established cells, values difficult terrain and rebuilds cohesion under pressure.',income:1,recruit:1,defense:1.3,stealth:.8,aggression:1,logistics:.9,bribe:.8,diplomacy:.8,cohesion:1.25,coercion:1.1},
  mercantile:{name:'Mercantile network',description:'Prioritizes prosperous ports, accumulates funds and bargains with rivals to protect its corridors.',income:1.45,recruit:.85,defense:.9,stealth:1,aggression:.8,logistics:1.3,bribe:1.2,diplomacy:1.4,cohesion:1,coercion:.8},
  clandestine:{name:'Clandestine cells',description:'Avoids exposure, disperses under pressure and relocates leaders when intelligence closes in.',income:.9,recruit:.9,defense:1,stealth:1.5,aggression:.75,logistics:1.1,bribe:1,diplomacy:1,cohesion:1.1,coercion:.8},
  predatory:{name:'Predatory enforcers',description:'Uses coercion and aggressive recruitment, creating fear but also exposure and fragile public support.',income:1.15,recruit:1.25,defense:1,stealth:.65,aggression:1.5,logistics:.9,bribe:.8,diplomacy:.6,cohesion:.85,coercion:1.5},
  patronage:{name:'Patronage machine',description:'Targets weak institutions, builds local connections and spreads where legitimate livelihoods have failed.',income:1.1,recruit:1.3,defense:.9,stealth:1.1,aggression:.8,logistics:1,bribe:1.5,diplomacy:1.3,cohesion:1.1,coercion:.8},
  mobile:{name:'Mobile raiders',description:'Probes exposed districts, attacks rivals opportunistically and withdraws from concentrated security forces.',income:1,recruit:1.1,defense:.85,stealth:1.2,aggression:1.3,logistics:1.5,bribe:.7,diplomacy:.9,cohesion:.8,coercion:1.1},
};
export const MEMBER_ROLES={leader:'Leader',lieutenant:'Lieutenant',financier:'Financier',recruiter:'Recruiter',fixer:'Fixer',formerLeader:'Former leader'};
export const TRAITS={
  cautious:{name:'Cautious',description:'Stronger defense, less aggressive expansion.',defense:.16,aggression:-.18},
  reckless:{name:'Reckless',description:'Pushes aggressive moves but creates more exposure.',aggression:.25,stealth:-.18},
  charismatic:{name:'Charismatic',description:'Improves recruitment and local influence.',recruit:.28,bribe:.08},
  secretive:{name:'Secretive',description:'Protects locations and slows investigations, at the expense of income.',stealth:.3,income:-.12},
  accountant:{name:'Meticulous',description:'Raises income and favors financial consolidation.',income:.32,aggression:-.08},
  ruthless:{name:'Ruthless',description:'Stronger coercion creates fear and greater exposure.',coercion:.32,stealth:-.12},
  loyal:{name:'Loyal',description:'Maintains cohesion and strongly resists witness deals.',cohesion:.25,loyalty:16},
  ambitious:{name:'Ambitious',description:'Likely to seek succession but strains internal cohesion.',succession:.35,cohesion:-.16,loyalty:-10},
  disciplined:{name:'Disciplined',description:'Improves defensive coordination and logistics.',defense:.18,logistics:.12},
  smuggler:{name:'Route specialist',description:'Improves logistics and income from connected districts.',logistics:.28,income:.12},
  corrupt:{name:'Venal',description:'Effective at bribery but more susceptible to a witness deal.',bribe:.3,loyalty:-18},
  opportunist:{name:'Opportunist',description:'Favors rival arrangements and vulnerable opportunities.',diplomacy:.28,aggression:.12},
  resilient:{name:'Resilient',description:'Helps the organization recover cohesion after losses.',cohesion:.24,defense:.08},
  patient:{name:'Patient',description:'Keeps a low profile and waits before expanding.',stealth:.18,aggression:-.12},
};
export const INTENTS={entrench:'Fortifying cells',recruit:'Recruiting',expand:'Expanding influence',bribe:'Cultivating connections',regroup:'Regrouping',rivalry:'Contesting a rival',pact:'Seeking an arrangement',coerce:'Coercing communities',relocate:'Relocating command',recover:'Rebuilding command'};
export function seeded(seed){let value=seed>>>0;return ()=>{value=(value+0x6D2B79F5)>>>0;let t=value;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
export function createMembers(seed){
  const random=seeded(seed^0x59b183),traits=Object.keys(TRAITS),roles=['leader','lieutenant','financier','recruiter','fixer'];
  const first=['Adriana','Bruno','Celina','Diego','Emilia','Felipe','Gabriela','Héctor','Irene','Jacinto','Karina','Leandro','Marina','Nicolás','Olivia','Pablo','Renata','Sergio','Teresa','Víctor'];
  const last=['Aranda','Barragán','Carrillo','Delgado','Escobar','Fierro','Gálvez','Herrera','Ibarra','Jurado','Ledesma','Medina','Navarro','Ortega','Paredes','Quiroz','Rivas','Salazar','Téllez','Varela'];
  const names=new Set(NETWORKS.map(n=>n.leader));
  return NETWORKS.flatMap(n=>roles.map((role,index)=>{
    let name=n.leader;
    if(index){do{name=first[Math.floor(random()*first.length)]+' '+last[Math.floor(random()*last.length)];}while(names.has(name));names.add(name);}
    const picked=[];while(picked.length<2){const t=traits[Math.floor(random()*traits.length)];if(!picked.includes(t)&&!([t,...picked].includes('cautious')&&[t,...picked].includes('reckless')))picked.push(t);}
    const candidates=DISTRICTS.filter(d=>d.network===n.id&&d.id!==n.home),location=index?candidates[Math.floor(random()*candidates.length)]?.id??n.home:n.home;
    return {id:`${n.id}-${index}`,network:n.id,name,role,traits:picked,skill:45+Math.floor(random()*41),loyalty:Math.max(15,Math.min(95,55+Math.floor(random()*31)+picked.reduce((v,t)=>v+(TRAITS[t].loyalty||0),0))),exposure:index?18:35,location,status:'active',watchedUntil:0};
  }));
}
const cap=(n,min,max)=>Math.max(min,Math.min(max,n));
export function capabilities(s,networkId){
  const n=s.networks[networkId],base=ARCHETYPES[NETWORKS[networkId].archetype],members=s.members.filter(m=>m.network===networkId&&m.status==='active');
  const result={};
  for(const key of ['income','recruit','defense','stealth','aggression','logistics','bribe','diplomacy','cohesion','coercion']){
    const changes=members.reduce((sum,m)=>sum+m.traits.reduce((v,t)=>v+(TRAITS[t][key]||0),0)*(m.skill/100)*(m.role==='leader'?.65:.35),0);
    result[key]=cap(base[key]*(1+changes),.45,2.2);
  }
  if(!members.some(m=>m.role==='financier'))result.income*=.65;
  if(!members.some(m=>m.role==='recruiter'))result.recruit*=.65;
  if(!members.some(m=>m.role==='lieutenant'))result.defense*=.82;
  if(!members.some(m=>m.role==='fixer'))result.bribe*=.65;
  result.logistics*=.55+n.logistics*.0065;
  result.defense*=.75+n.cohesion*.003;result.aggression*=.7+n.cohesion*.003;
  if(n.captured){result.recruit*=.1;result.aggression*=.35;}
  return result;
}
export const leaderOf=(s,id)=>s.members.find(m=>m.id===s.networks[id]?.leaderId);
export const cellThreat=(d,id)=>d.cells?.[id]||0;
export function syncThreat(d){d.threat=Math.min(100,d.cells.reduce((a,b)=>a+b,0));}
export function alterCell(d,id,delta){const old=d.cells[id];d.cells[id]=cap(old+delta,0,Math.max(0,100-(d.threat-old)));if(d.cells[id]<.25)d.cells[id]=0;syncThreat(d);}
export function dominantNetwork(d){let id=DISTRICTS[d.id].network;for(let i=0;i<d.cells.length;i++)if(d.cells[i]>d.cells[id])id=i;return id;}
export function successionCandidate(s,id){return s.members.filter(m=>m.network===id&&m.status==='active'&&m.role!=='leader').sort((a,b)=>(b.skill+b.loyalty*.3+(b.traits.includes('ambitious')?25:0))-(a.skill+a.loyalty*.3+(a.traits.includes('ambitious')?25:0))||a.id.localeCompare(b.id))[0];}

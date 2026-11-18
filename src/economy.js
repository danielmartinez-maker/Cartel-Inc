import {DISTRICTS,NETWORKS,TRANSPORT_LINKS} from './data.js';
import {capabilities,seeded} from './cartels.js';
import {INFRASTRUCTURE,assetState,assetOutput,transportCost} from './infrastructure.js';
import {terrainAt} from './scenarios.js';

export const INCOME_TYPES={
 extortion:{name:'Protection rackets',description:'Coercive collections from occupied markets. Community security and legitimate livelihoods reduce the take.',icon:'people'},
 trade:{name:'Contraband trade',description:'Illicit trade needs occupied border or port districts and open transport capacity.',icon:'road'},
 narcotics:{name:'Illicit drug markets',description:'Rural supply and urban demand sustain an abstract illegal market. Intelligence and secure communities constrain it.',icon:'leaf'},
 extraction:{name:'Illegal extraction',description:'Mineral and agricultural resource theft in controlled rural territory harms local prosperity.',icon:'industry'},
 cargo:{name:'Freight theft',description:'Occupied freight nodes and weak facility security expose commercial cargo.',icon:'train'},
 fuel:{name:'Fuel diversion',description:'Energy resources and compromised logistics facilities expose fuel revenue.',icon:'power'},
 procurement:{name:'Procurement fraud',description:'Weak public institutions and controlled facilities expose public contracts.',icon:'scales'},
 fronts:{name:'Commercial fronts',description:'Controlled freight businesses generate revenue and increase the capacity to convert illicit cash into usable funds.',icon:'coin'},
};
const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,n));
const keys=Object.keys(INCOME_TYPES),round=n=>Math.round(n*100)/100;
const AT_DISTRICT=DISTRICTS.map(d=>INFRASTRUCTURE.filter(a=>a.district===d.id)),LINKS_AT=DISTRICTS.map(d=>TRANSPORT_LINKS.filter(l=>l.a===d.id||l.b===d.id)),DEFINITIONS=new Map(INFRASTRUCTURE.map(a=>[a.id,a]));
const resources=(s,id)=>s.regions[DISTRICTS[id].region].resources??{agriculture:55,minerals:45,fuel:45,market:60};
const garrison=(s,id)=>s.units.filter(u=>u.district===id&&u.type!=='intel'&&['ready','operating'].includes(u.status)).length;
export function ensureEconomy(s){
 const random=seeded(s.seed^0x663fa91);
 for(const d of s.districts)if(d.fortifications===undefined)d.fortifications=NETWORKS.map(n=>Math.min(35,d.cells[n.id]*.4));
 for(const n of s.networks){
  if(n.archetype===undefined)n.archetype=NETWORKS[n.id].archetype;
  if(n.rackets===undefined){const favored={territorial:['extortion','extraction'],mercantile:['trade','cargo','fronts'],clandestine:['narcotics','fronts'],predatory:['extortion','fuel'],patronage:['procurement','fronts'],mobile:['cargo','trade']}[n.archetype];n.rackets=Object.fromEntries(keys.map(key=>[key,{level:25+Math.floor(random()*20)+(favored.includes(key)?25:0),blockedUntil:0}]));}
  if(n.dirtyCash===undefined)n.dirtyCash=25;
  if(n.cashflow===undefined)n.cashflow={gross:0,converted:0,overhead:0,net:0,capacity:0};
  for(const key of keys)if(n.revenue[key]===undefined)n.revenue[key]=0;
 }
 if(s.scenario===undefined)s.scenario=null;
}

function districtOpportunity(s,n,d,key){
 const r=resources(s,d.id),terrain=terrainAt(s,d.id),control=Math.min(1,d.cells[n.id]/18),security=1/(1+garrison(s,d.id)*1.8+d.security/65+d.institutions/100);
 let opportunity=0;
 if(key==='extortion')opportunity=(.18+r.market*.005)*(0.5+d.fear/100);
 if(key==='trade'&&['border','port','coast'].includes(terrain)){
  const corridors=LINKS_AT[d.id],open=corridors.length?corridors.filter(l=>Number.isFinite(transportCost(s,l.a,l.b))).length/corridors.length:1;
  const port=AT_DISTRICT[d.id].find(a=>a.type==='port');opportunity=(.7+r.market*.008)*open*(port?assetOutput(assetState(s,port.id))/100:1);
 }
 if(key==='narcotics')opportunity=(['rural','forest','mountain','arid','wetland'].includes(terrain)?r.agriculture*.009:['urban','capital','port'].includes(terrain)?r.market*.01:0)*(1-d.intel/170);
 if(key==='extraction'&&['rural','forest','mountain','arid','wetland'].includes(terrain))opportunity=r.minerals*.008+r.agriculture*.003;
 const sites=AT_DISTRICT[d.id];
 if(key==='cargo')opportunity=sites.filter(a=>['rail','port','depot','highway','bridge'].includes(a.type)).reduce((v,a)=>{const st=assetState(s,a.id);return v+assetOutput(st)/100*(1-st.security/140)*.85;},0);
 if(key==='fuel')opportunity=sites.filter(a=>['depot','port','power'].includes(a.type)).reduce((v,a)=>{const st=assetState(s,a.id);return v+r.fuel*.014*(.4+st.infiltration/100)*(1-st.security/140);},0);
 if(key==='procurement')opportunity=(1-d.institutions/115)*(.25+n.infiltration*.01)*(1+s.corruption/100)*(sites.length?.9:.18);
 if(key==='fronts')opportunity=n.fronts.filter(id=>DEFINITIONS.get(id)?.district===d.id).reduce((v,id)=>{const a=assetState(s,id);return v+(a.controller===n.id&&a.infiltration>20?assetOutput(a)*.035:0);},0);
 return Math.max(0,opportunity*control*security);
}
export function incomeTargets(s,network,key){
 if(!Object.hasOwn(INCOME_TYPES,key)||!s.networks[network])return [];
 const n=s.networks[network];return s.districts.filter(d=>d.cells[network]>1).map(d=>({district:d.id,value:districtOpportunity(s,n,d,key)})).filter(d=>d.value>.01).sort((a,b)=>b.value-a.value||a.district-b.district);
}
export function incomeForecast(s,network){
 const n=s.networks[network],c=capabilities(s,network),revenue={};
 for(const key of keys){const racket=n.rackets[key],available=key==='fronts'?s.districts.filter(d=>n.fronts.some(id=>DEFINITIONS.get(id)?.district===d.id)):s.districts.filter(d=>d.cells[network]>1);
  const potential=available.reduce((v,d)=>v+districtOpportunity(s,n,d,key),0),cap=key==='fronts'?16:18;
  revenue[key]=round(Math.min(cap,potential)*(racket.level/100)*c.income*(racket.blockedUntil>s.day?.18:1)*(n.captured?.2:1)*(s.completed.includes('finance')?.55:1));
 }
 const gross=round(Object.values(revenue).reduce((a,b)=>a+b,0)),financier=s.members.some(m=>m.network===network&&m.role==='financier'&&m.status==='active');
 const capacity=round((5+n.laundering*.16+revenue.fronts*1.8)*(financier?1:.35)*(s.completed.includes('finance')?.65:1)),converted=round(Math.min(n.dirtyCash+gross,capacity)),overhead=round(Math.min(converted,2+n.branches.filter(b=>b.posture!=='disrupted').length*.6+n.arsenal*.015));
 return {revenue,gross,capacity,converted,overhead,net:round(converted-overhead)};
}
export function stepEconomy(s,n){
 n.fronts=n.fronts.filter(id=>assetState(s,id)?.controller===n.id&&assetState(s,id).infiltration>20);
 const forecast=incomeForecast(s,n.id);n.revenue=forecast.revenue;n.cashflow=Object.fromEntries(['gross','converted','overhead','net','capacity'].map(k=>[k,forecast[k]]));
 n.dirtyCash=round(clamp(n.dirtyCash+forecast.gross-forecast.converted,0,1000));n.funds=round(clamp(n.funds+forecast.net));
 // Harm is local to the sources actually producing money; collections cannot
 // generate income in unoccupied districts or destroyed freight facilities.
 for(const key of ['extortion','extraction','fuel'])if(n.revenue[key]>0)for(const target of incomeTargets(s,n.id,key).slice(0,3)){const d=s.districts[target.district];d.prosperity=clamp(d.prosperity-.12*n.rackets[key].level/100);if(key==='extortion')d.fear=clamp(d.fear+.12);}
}
export function disruptIncome(s,n,key){
 const racket=n.rackets[key];racket.level=clamp(racket.level-25);racket.blockedUntil=Math.max(racket.blockedUntil,s.day+28);n.dirtyCash=clamp(n.dirtyCash-35,0,1000);n.funds=clamp(n.funds-12);n.evidence=clamp(n.evidence+10);
}

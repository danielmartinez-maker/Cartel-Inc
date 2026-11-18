import {REGIONS,DISTRICTS,TRANSPORT_LINKS} from './data.js';
import {assetState,assetOutput,nationalAccess} from './infrastructure.js';
import {seeded} from './cartels.js';

export const GOODS={food:{name:'Food',base:1},fuel:{name:'Fuel',base:1.4},materials:{name:'Materials',base:1.2},medicine:{name:'Medical supplies',base:2}};
export const FISCAL_POLICIES={low:{name:'Recovery taxes',rate:.12,description:'Lower receipts, less pressure on household employment.'},balanced:{name:'Balanced taxes',rate:.16,description:'Balance public revenue and household recovery.'},high:{name:'Emergency taxes',rate:.22,description:'Higher receipts increase household grievance.'}};
const clamp=(v,min=0,max=100)=>Math.max(min,Math.min(max,v)),round=v=>Math.round(v*100)/100;
export function ensureCivilEconomy(s){
 const random=seeded(s.seed^0xc119a2);
 if(s.economy===undefined)s.economy={policy:'balanced',debt:0,taxReceipts:0,priceIndex:100,trade:0,lastDay:0};
 for(const r of s.regions)if(r.economy===undefined)r.economy={inventory:Object.fromEntries(Object.keys(GOODS).map(key=>[key,55+Math.floor(random()*55)])),prices:Object.fromEntries(Object.entries(GOODS).map(([key,g])=>[key,g.base])),production:Object.fromEntries(Object.keys(GOODS).map(key=>[key,0])),demand:Object.fromEntries(Object.keys(GOODS).map(key=>[key,0])),output:0,employment:50,shortages:0,imports:0,exports:0,taxBase:0};
}
export function stepCivilEconomy(s,{initial=false}={}){
 const access=nationalAccess(s),policy=FISCAL_POLICIES[s.economy.policy];
 for(const r of s.regions){
  const e=r.economy,ds=s.districts.slice(r.id*24,r.id*24+24),population=ds.reduce((v,d)=>v+DISTRICTS[d.id].population,0),jobs=ds.reduce((v,d)=>v+d.neighborhoods.reduce((v,n)=>v+n.employment,0)/3,0)/24,threat=ds.reduce((v,d)=>v+d.threat,0)/24;
  const stock=r.resources??{agriculture:55,minerals:50,fuel:50,market:60},sector=r.sector??['agriculture','mining','industry','commerce','energy'][r.id%5],labor=.45+jobs/150,power=.35+r.services.power/150,security=1-threat/160;
  const drought=s.scenario?.type==='drought'?.78:1;
  e.production={food:round((16+stock.agriculture*.45)*(sector==='agriculture'?1.4:1)*labor*security*drought),fuel:round((12+stock.fuel*.4)*(sector==='energy'?1.5:1)*power*security),materials:round((12+stock.minerals*.4)*(sector==='mining'||sector==='industry'?1.4:1)*power*labor*security),medicine:round((12+r.services.health*.3+r.services.education*.12)*power*security)};
  const base=18+population/140;
  e.demand={food:round(base*1.25),fuel:round(base*.9),materials:round(base*.8),medicine:round(base*.65)};
  e.output=round(Object.entries(e.production).reduce((v,[key,qty])=>v+qty*GOODS[key].base,0));e.employment=round(jobs);e.imports=0;e.exports=0;
  if(!initial)for(const key of Object.keys(GOODS))e.inventory[key]=round(clamp(e.inventory[key]+e.production[key]-e.demand[key],0,500));
 }
 // Neighboring markets clear through real corridors. Several rounds allow
 // freight to pass through an intermediate province without teleporting it.
 let trade=0;
 if(!initial)for(let pass=0;pass<3;pass++)for(const l of TRANSPORT_LINKS){
  const a=assetState(s,l.id);if(l.type==='bridge'&&a.condition<15)continue;
  const left=s.regions[l.regions[0]].economy,right=s.regions[l.regions[1]].economy,capacity=(3+assetOutput(a)*.13)/3;
  for(const key of Object.keys(GOODS)){
   const donor=left.inventory[key]>right.inventory[key]?left:right,recipient=donor===left?right:left,need=Math.max(0,recipient.demand[key]*1.7-recipient.inventory[key]),surplus=Math.max(0,donor.inventory[key]-donor.demand[key]*2),amount=Math.min(need,surplus,capacity);
   donor.inventory[key]=round(donor.inventory[key]-amount);recipient.inventory[key]=round(recipient.inventory[key]+amount);donor.exports+=amount;recipient.imports+=amount;trade+=amount;
  }
 }
 let receipts=0,index=0;
 for(const r of s.regions){
  const e=r.economy;let shortage=0,prices=0;
  for(const [key,g]of Object.entries(GOODS)){const availability=e.inventory[key]/Math.max(1,e.demand[key]),target=g.base*clamp(1.6-availability*.22,.65,2.8);e.prices[key]=round(clamp(e.prices[key]+(target-e.prices[key])*.3,g.base*.5,g.base*3));shortage+=Math.max(0,1-availability);prices+=e.prices[key]/g.base;}
  e.shortages=round(shortage/4*100);index+=prices/4*100;
  const prosperity=s.districts.slice(r.id*24,r.id*24+24).reduce((v,d)=>v+d.prosperity,0)/24;
  e.taxBase=round(e.output*(.5+prosperity/100)*(Number.isFinite(access[r.id])?1:.45));receipts+=e.taxBase*policy.rate*.06;
  if(!initial)for(const d of s.districts.slice(r.id*24,r.id*24+24)){
   d.prosperity=clamp(d.prosperity+(e.output/200-1)*.25-e.shortages*.012);
   for(const n of d.neighborhoods){n.grievance=clamp(n.grievance+e.shortages*.02+(policy.rate-.16)*10);n.employment=clamp(n.employment+(e.output/230-1)*.2-(policy.rate-.16)*4);}
  }
 }
 s.economy.taxReceipts=round(receipts);s.economy.priceIndex=round(index/50);s.economy.trade=round(trade);s.economy.lastDay=s.day;
}

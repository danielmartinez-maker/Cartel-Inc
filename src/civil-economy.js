import {REGIONS,DISTRICTS,TRANSPORT_LINKS} from './data.js';
import {assetState,assetOutput,nationalAccess} from './infrastructure.js';
import {seeded} from './cartels.js';

export const GOODS={
 food:{name:'Food',base:1,icon:'leaf'},fuel:{name:'Fuel',base:1.4,icon:'power'},
 materials:{name:'Materials',base:1.2,icon:'industry'},medicine:{name:'Medical supplies',base:2,icon:'hospital'},
};
export const FISCAL_POLICIES={
 low:{name:'Recovery taxes',rate:.12,description:'Lower receipts leave more household income and encourage formal employment.'},
 balanced:{name:'Balanced taxes',rate:.16,description:'A moderate rate balances public receipts and household recovery.'},
 high:{name:'Emergency taxes',rate:.22,description:'Higher receipts reduce disposable income and push marginal firms into the informal economy.'},
};
export const TRADE_POLICIES={
 open:{name:'Open freight',cost:0,capacity:1,loss:1,description:'Full corridor capacity. Theft depends on local threat and facility security.'},
 escorted:{name:'Escorted freight',cost:8,capacity:.82,loss:.22,description:'Escorts cut cargo losses by 78%, but inspections reduce throughput by 18%.'},
 relief:{name:'Essential goods first',cost:6,capacity:1,loss:.85,description:'Food and medical supplies get first use of shared freight capacity. Industry may wait.'},
};
export const ECONOMIC_PROJECTS={
 agriculture:{name:'Agricultural cooperatives',cost:32,materials:18,days:14,description:'Raise farm output and rural wages. Farms still need fuel and water.'},
 industry:{name:'Industrial workshops',cost:42,materials:25,days:21,description:'Expand fuel, materials and medical production. Power and input stocks still limit output.'},
 logistics:{name:'Freight consolidation',cost:36,materials:20,days:16,description:'Increase this province’s corridor capacity and reduce cargo theft.'},
 enterprise:{name:'Small business credit',cost:28,materials:8,days:12,description:'Improve formal employment, household purchasing power and the taxable economy.'},
};
const keys=Object.keys(GOODS),clamp=(v,min=0,max=100)=>Math.max(min,Math.min(max,v)),round=v=>Math.round(v*100)/100;
const average=(items,key)=>items.reduce((v,item)=>v+item[key],0)/items.length;

// Fill absent fields only. Malformed imported values belong to the validator.
export function ensureCivilEconomy(s){
 const random=seeded(s.seed^0xc119a2);
 if(s.economy===undefined)s.economy={policy:'balanced',debt:0,taxReceipts:0,priceIndex:100,trade:0,lastDay:0};
 const national={tradePolicy:'open',projects:[],history:[],shipments:[],cargoLoss:0,leakage:0,realIncome:100,poverty:0};
 for(const [key,value]of Object.entries(national))if(s.economy[key]===undefined)s.economy[key]=value;
 for(const r of s.regions){
  if(r.economy===undefined)r.economy={inventory:Object.fromEntries(keys.map(key=>[key,55+Math.floor(random()*55)])),prices:Object.fromEntries(Object.entries(GOODS).map(([key,g])=>[key,g.base])),production:Object.fromEntries(keys.map(key=>[key,0])),demand:Object.fromEntries(keys.map(key=>[key,0])),output:0,employment:50,shortages:0,imports:0,exports:0,taxBase:0};
  const defaults={investment:Object.fromEntries(Object.keys(ECONOMIC_PROJECTS).map(key=>[key,0])),inputs:Object.fromEntries(keys.map(key=>[key,0])),consumption:Object.fromEntries(keys.map(key=>[key,0])),waste:Object.fromEntries(keys.map(key=>[key,0])),utilization:100,formality:55,wage:100,realIncome:100,poverty:20,taxRevenue:0,leakage:0,cargoLoss:0,freight:0};
  for(const [key,value]of Object.entries(defaults))if(r.economy[key]===undefined)r.economy[key]=value;
 }
}

export function economicProjectReason(s,region,project){
 const r=s.regions[region],p=Object.hasOwn(ECONOMIC_PROJECTS,project)?ECONOMIC_PROJECTS[project]:null;
 if(!Number.isInteger(region)||!r||!p)return 'Choose a province and an investment.';
 if(s.outcome)return 'The mandate has ended.';
 if(s.economy.projects.length>=6)return 'Six economic investments are already underway.';
 if(s.economy.projects.some(p=>p.region===region&&p.project===project))return 'This investment is already underway here.';
 if(r.economy.investment[project]>=3)return 'This investment is fully developed.';
 if(r.economy.inventory.materials<p.materials)return `Requires ${p.materials} local materials. Reopen freight routes or expand materials production.`;
 return '';
}

export function stepEconomicProjects(s,report){
 const completed=s.economy.projects.filter(p=>--p.remaining<=0);
 s.economy.projects=s.economy.projects.filter(p=>p.remaining>0);
 for(const p of completed){s.regions[p.region].economy.investment[p.project]++;report(s,`${REGIONS[p.region].name}: ${ECONOMIC_PROJECTS[p.project].name.toLowerCase()} opened.`,'success');}
}

function produce(s,r,initial){
 const e=r.economy,ds=s.districts.slice(r.id*24,r.id*24+24),population=ds.reduce((v,d)=>v+DISTRICTS[d.id].population,0);
 const jobs=ds.reduce((v,d)=>v+average(d.neighborhoods,'employment'),0)/24,threat=average(ds,'threat');
 const stock=r.resources??{agriculture:55,minerals:50,fuel:50,market:60},sector=r.sector??['agriculture','mining','industry','commerce','energy'][r.id%5];
 const labor=.55+jobs/160,power=.4+r.services.power/135,security=1-threat/180;
 const agriculture=1+e.investment.agriculture*.18,industry=1+e.investment.industry*.16;
 const drought=s.scenario?.type==='drought'?.8:1,water=.65+r.services.water/250;
 const potential={
  food:(25+stock.agriculture*.55)*(sector==='agriculture'?1.5:1)*labor*security*drought*water*agriculture,
  fuel:(25+stock.fuel*.5)*(sector==='energy'?1.55:1)*power*security*industry,
  materials:(23+stock.minerals*.5)*(['mining','industry'].includes(sector)?1.45:1)*power*labor*security*industry,
  medicine:(23+r.services.health*.5+r.services.education*.15)*power*security*industry,
 };
 // Producers share opening input stocks; the same fuel cannot be used twice.
 const fuelNeed=potential.food*.08+potential.materials*.12+potential.medicine*.06;
 const materialsNeed=potential.fuel*.07+potential.medicine*.16;
 const fuelCoverage=Math.min(1,e.inventory.fuel/Math.max(1,fuelNeed)),materialsCoverage=Math.min(1,e.inventory.materials/Math.max(1,materialsNeed));
 e.production=Object.fromEntries(keys.map(key=>[key,round(potential[key]*(key==='fuel'?materialsCoverage:key==='medicine'?Math.min(fuelCoverage,materialsCoverage):fuelCoverage))]));
 e.inputs={food:0,fuel:round(e.production.food*.08+e.production.materials*.12+e.production.medicine*.06),materials:round(e.production.fuel*.07+e.production.medicine*.16),medicine:0};
 const base=18+population/140;
 e.demand={food:round(base*1.25),fuel:round(base*.9),materials:round(base*.8),medicine:round(base*.65)};
 e.output=round(keys.reduce((v,key)=>v+e.production[key]*GOODS[key].base,0));
 e.utilization=round(clamp(100*keys.reduce((v,key)=>v+e.production[key]/Math.max(1,potential[key]),0)/keys.length));
 e.employment=round(jobs);e.imports=0;e.exports=0;e.cargoLoss=0;e.freight=0;
 if(!initial)for(const key of keys)e.inventory[key]=round(Math.max(0,e.inventory[key]-e.inputs[key]+e.production[key]));
 return {ds,jobs,threat};
}

function clearMarkets(s){
 const policy=TRADE_POLICIES[s.economy.tradePolicy],shipments=new Map();
 for(let pass=0;pass<3;pass++)for(const l of TRANSPORT_LINKS){
  const a=assetState(s,l.id);if(l.type==='bridge'&&a.condition<15)continue;
  const left=s.regions[l.regions[0]].economy,right=s.regions[l.regions[1]].economy;
  let capacity=(12+assetOutput(a)*.65)*policy.capacity*(1+(left.investment.logistics+right.investment.logistics)*.1)/3;
  const priority=policy===TRADE_POLICIES.relief?['food','medicine','fuel','materials']:[...keys].sort((x,y)=>Math.min(left.inventory[x]/left.demand[x],right.inventory[x]/right.demand[x])-Math.min(left.inventory[y]/left.demand[y],right.inventory[y]/right.demand[y]));
  for(const key of priority){
   const donor=left.inventory[key]/left.demand[key]>right.inventory[key]/right.demand[key]?left:right,recipient=donor===left?right:left;
   const need=Math.max(0,recipient.demand[key]*1.7-recipient.inventory[key]),surplus=Math.max(0,donor.inventory[key]-donor.demand[key]*2),amount=Math.min(need,surplus,capacity);
   if(amount<=.01)continue;
   const threat=(s.districts[l.a].threat+s.districts[l.b].threat)/2;
   const lossRate=clamp((threat*.0015+a.infiltration*.0008)*(1-a.security/150)*policy.loss/(1+(left.investment.logistics+right.investment.logistics)*.2),0,.3);
   const loss=round(amount*lossRate),delivered=round(amount-loss);
   donor.inventory[key]=round(Math.max(0,donor.inventory[key]-amount));recipient.inventory[key]=round(recipient.inventory[key]+delivered);
   donor.exports+=amount;recipient.imports+=delivered;donor.cargoLoss+=loss;donor.freight+=amount;recipient.freight+=delivered;capacity-=amount;
   const from=donor===left?l.regions[0]:l.regions[1],to=donor===left?l.regions[1]:l.regions[0],id=`${l.id}:${key}:${from}`;
   const line=shipments.get(id)??{link:l.id,good:key,from,to,amount:0,loss:0};line.amount=round(line.amount+amount);line.loss=round(line.loss+loss);shipments.set(id,line);
   // Stolen cargo still needs cash conversion before the faction can spend it.
   if(a.controller!==null&&loss>0){const n=s.networks[a.controller];if(!n.dismantled)n.dirtyCash=round(clamp(n.dirtyCash+loss*GOODS[key].base*.1,0,1000));}
  }
 }
 s.economy.shipments=[...shipments.values()];
 s.economy.trade=round(s.economy.shipments.reduce((v,f)=>v+f.amount-f.loss,0));
 s.economy.cargoLoss=round(s.economy.shipments.reduce((v,f)=>v+f.loss,0));
}

export function stepCivilEconomy(s,{initial=false}={}){
 const access=nationalAccess(s),policy=FISCAL_POLICIES[s.economy.policy];
 const profiles=s.regions.map(r=>produce(s,r,initial));
 if(!initial)clearMarkets(s);
 let receipts=0,index=0,leakage=0,income=0,poverty=0;
 for(const r of s.regions){
  const e=r.economy,{ds,jobs,threat}=profiles[r.id];let shortage=0,prices=0;
  for(const [key,g]of Object.entries(GOODS)){
   if(!initial){
    e.consumption[key]=round(Math.min(e.inventory[key],e.demand[key]));
    const remaining=e.inventory[key]-e.consumption[key],spoilage=remaining*(key==='food'?.02:key==='medicine'?.01:0)/(1+e.investment.logistics*.25);
    e.waste[key]=round(spoilage+Math.max(0,remaining-spoilage-500));
    e.inventory[key]=round(clamp(remaining-e.waste[key],0,500));
   }
   const unfilled=initial?0:Math.max(0,1-e.consumption[key]/Math.max(1,e.demand[key]));
   const availability=e.inventory[key]/Math.max(1,e.demand[key]),target=g.base*clamp(1.6+unfilled*.6-availability*.22,.65,2.8);
   e.prices[key]=round(clamp(e.prices[key]+(target-e.prices[key])*.3,g.base*.5,g.base*3));shortage+=unfilled;prices+=e.prices[key]/g.base;
  }
  e.shortages=round(shortage/4*100);index+=prices/4*100;
  const costOfLiving=e.prices.food*.45+e.prices.fuel/GOODS.fuel.base*.25+e.prices.medicine/GOODS.medicine.base*.2+e.prices.materials/GOODS.materials.base*.1;
  e.wage=round(clamp(62+jobs*.6+e.investment.enterprise*7+e.investment.agriculture*2,35,160));
  e.realIncome=round(clamp(e.wage*(1-policy.rate)/Math.max(.5,costOfLiving)/.84,0,200));
  e.poverty=round(clamp(58-e.realIncome*.38+e.shortages*.22+threat*.12));
  if(!initial)e.formality=round(clamp(e.formality+(average(ds,'institutions')-35)*.015+e.investment.enterprise*.3-(policy.rate-.16)*4-threat*.003,15,95));
  const localLeakage=clamp(s.corruption*.32+threat*.18,0,55)/100;
  e.taxBase=round(e.output*(.5+average(ds,'prosperity')/100)*(.4+e.formality*.006)*(Number.isFinite(access[r.id])?1:.45));
  const gross=e.taxBase*policy.rate*.06;e.leakage=round(gross*localLeakage);e.taxRevenue=round(gross-e.leakage);
  receipts+=e.taxRevenue;leakage+=e.leakage;income+=e.realIncome;poverty+=e.poverty;
  if(!initial)for(const d of ds){
   d.prosperity=clamp(d.prosperity+(e.output/200-1)*.25-e.shortages*.012);
   for(const n of d.neighborhoods){
    n.grievance=clamp(n.grievance+e.shortages*.02+(policy.rate-.16)*10+Math.max(0,80-e.realIncome)*.002);
    n.employment=clamp(n.employment+(e.output/230-1)*.2-(policy.rate-.16)*4+e.investment.enterprise*.06);
   }
  }
 }
 Object.assign(s.economy,{taxReceipts:round(receipts),priceIndex:round(index/REGIONS.length),leakage:round(leakage),realIncome:round(income/REGIONS.length),poverty:round(poverty/REGIONS.length),lastDay:s.day});
}

export const economicUpkeep=s=>TRADE_POLICIES[s.economy.tradePolicy].cost+s.regions.reduce((v,r)=>v+Object.values(r.economy.investment).reduce((sum,level)=>sum+level*.3,0),0);
export function recordSettlement(s,budget){
 s.economy.history.push({day:s.day,income:budget.income,upkeep:budget.upkeep,net:budget.net,prices:s.economy.priceIndex,realIncome:s.economy.realIncome,trade:s.economy.trade});
 s.economy.history=s.economy.history.slice(-12);
}

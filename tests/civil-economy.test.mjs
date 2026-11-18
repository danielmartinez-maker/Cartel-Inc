import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,serialize,restore,act,tick,budgetForecast,projectCost} from '../src/engine.js';
import {GOODS,ECONOMIC_PROJECTS,stepCivilEconomy} from '../src/civil-economy.js';
import {TRANSPORT_LINKS,EVENTS} from '../src/data.js';
import {assetState,assetOutput} from '../src/infrastructure.js';
import {activeOrders} from '../src/world.js';

const copy=s=>restore(serialize(s));
const sum=(s,field,key)=>s.regions.reduce((v,r)=>v+r.economy[field][key],0);
function advance(s,days){for(let i=0;i<days;i++){if(s.pendingEvent)assert.ok(act(s,{type:'event',choice:1}).ok);tick(s,{force:true});}}
function freightFixture(){
 const s=createGame({seed:197});
 const link=TRANSPORT_LINKS.find(l=>l.type==='bridge'&&l.regions.includes(24));
 for(const l of TRANSPORT_LINKS.filter(l=>l.type==='bridge'))assetState(s,l.id).condition=0;
 Object.assign(assetState(s,link.id),{condition:100,security:0,infiltration:80,controller:0});
 for(const r of s.regions)for(const key of Object.keys(GOODS))r.economy.inventory[key]=[24,37].includes(r.id)?0:450;
 for(const id of [24,37])s.regions[id].resources={agriculture:0,minerals:0,fuel:0,market:0};
 return {s,link};
}

test('a fuel stockout idles dependent producers without consuming nonexistent inputs',()=>{
 const full=createGame({seed:197}),empty=copy(full);empty.regions[0].economy.inventory.fuel=0;
 stepCivilEconomy(full);stepCivilEconomy(empty);
 const a=full.regions[0].economy,b=empty.regions[0].economy;
 assert.ok(a.production.food>0&&a.production.materials>0&&a.production.medicine>0);
 assert.equal(b.production.food,0);assert.equal(b.production.materials,0);assert.equal(b.production.medicine,0);assert.equal(b.inputs.fuel,0);
 assert.ok(b.production.fuel>0,'energy production can replenish fuel using the available materials');
 assert.ok(b.utilization<a.utilization);assert.ok(Object.values(b.inventory).every(v=>v>=0));
});

test('all freight goods share a corridor capacity rather than receiving a separate allowance each',()=>{
 const {s,link}=freightFixture();stepCivilEconomy(s);
 const movements=s.economy.shipments.filter(f=>f.link===link.id);
 assert.ok(movements.length>1,'more than one good competes for the same crossing');
 const loaded=movements.reduce((v,f)=>v+f.amount,0),capacity=12+assetOutput(assetState(s,link.id))*.65;
 assert.ok(loaded<=capacity+.03,`${loaded} exceeds the shared weekly capacity ${capacity}`);
});

test('goods are conserved across inputs, consumption, freight theft, spoilage and warehouse overflow',()=>{
 const {s}=freightFixture(),before=Object.fromEntries(Object.keys(GOODS).map(key=>[key,sum(s,'inventory',key)])),rng=s.rng;
 stepCivilEconomy(s);
 for(const key of Object.keys(GOODS)){
  const losses=s.economy.shipments.filter(f=>f.good===key).reduce((v,f)=>v+f.loss,0);
  const expected=before[key]+sum(s,'production',key)-sum(s,'inputs',key)-sum(s,'consumption',key)-sum(s,'waste',key)-losses;
  assert.ok(Math.abs(sum(s,'inventory',key)-expected)<.6,`${key} stock ledger does not balance`);
 }
 assert.equal(s.rng,rng,'market clearing does not consume campaign randomness');
 assert.ok(s.regions.every(r=>Object.values(r.economy.inventory).every(v=>v>=0&&v<=500)));
});

test('freight escorts lower the stolen share and charge an explicit continuing allocation',()=>{
 const {s,link}=freightFixture(),escorted=copy(s);assert.ok(act(escorted,{type:'trade-policy',policy:'escorted'}).ok);
 const delta=budgetForecast(escorted).upkeep-budgetForecast(s).upkeep;assert.ok(Math.abs(delta-8)<.01);
 stepCivilEconomy(s);stepCivilEconomy(escorted);
 const ratio=state=>{const fs=state.economy.shipments.filter(f=>f.link===link.id);return fs.reduce((v,f)=>v+f.loss,0)/fs.reduce((v,f)=>v+f.amount,0);};
 assert.ok(ratio(escorted)<ratio(s)*.3);
 assert.ok(s.networks[0].dirtyCash>25,'compromised freight produces cash that still needs conversion');
 assert.equal(act(s,{type:'trade-policy',policy:'toString'}).ok,false);
});

test('higher taxes trade household purchasing power for receipts while corruption diverts revenue',()=>{
 const low=createGame({seed:197}),high=copy(low),corrupt=copy(low);
 act(low,{type:'fiscal',policy:'low'});act(high,{type:'fiscal',policy:'high'});act(corrupt,{type:'fiscal',policy:'low'});corrupt.corruption=100;
 for(const s of [low,high,corrupt])stepCivilEconomy(s,{initial:true});
 assert.ok(high.economy.taxReceipts>low.economy.taxReceipts);assert.ok(high.economy.realIncome<low.economy.realIncome);
 assert.ok(corrupt.economy.taxReceipts<low.economy.taxReceipts);assert.ok(corrupt.economy.leakage>low.economy.leakage);
});

test('economic investments reserve actual money and materials, finish on time and appear in active orders',()=>{
 const s=createGame({seed:197}),p=ECONOMIC_PROJECTS.industry,e=s.regions[0].economy;
 const money=s.money,materials=e.inventory.materials,cost=projectCost(s,p.cost);
 assert.ok(act(s,{type:'economic-project',region:0,project:'industry'}).ok);
 assert.equal(s.money,money-cost);assert.equal(e.inventory.materials,materials-p.materials);assert.equal(e.investment.industry,0);
 assert.ok(activeOrders(s).some(o=>o.kind==='economy'&&o.label===p.name));
 assert.equal(act(s,{type:'economic-project',region:0,project:'industry'}).ok,false);
 advance(s,p.days-1);assert.equal(e.investment.industry,0);assert.equal(s.economy.projects[0].remaining,1);
 const saved=copy(s);advance(s,1);advance(saved,1);assert.equal(e.investment.industry,1);assert.equal(s.economy.projects.length,0);assert.equal(serialize(s),serialize(saved));
 assert.ok(budgetForecast(s).costs.economy>=.3);
});

test('investment requirements and development limits cannot be bypassed by repeated orders',()=>{
 const s=createGame();s.regions[0].economy.inventory.materials=0;const money=s.money;
 assert.equal(act(s,{type:'economic-project',region:0,project:'industry'}).ok,false);assert.equal(s.money,money);
 s.regions[0].economy.inventory.materials=100;s.regions[0].economy.investment.industry=3;
 assert.equal(act(s,{type:'economic-project',region:0,project:'industry'}).ok,false);
 assert.equal(act(s,{type:'economic-project',region:0,project:'toString'}).ok,false);
 assert.equal(act(s,{type:'economic-project',region:50,project:'industry'}).ok,false);
});

test('an empty treasury never traps a campaign inside a mandatory emergency decision',()=>{
 for(const event of EVENTS){
  const s=createGame();s.money=0;s.pendingEvent=event.id;s.pendingRegion=event.scope==='regional'?0:null;
  const choice=event.choices.findIndex(c=>c.cost===0);assert.ok(choice>=0,`${event.id} has no affordable fallback`);
  assert.equal(act(s,{type:'event',choice}).ok,true);assert.equal(s.money,0);assert.equal(s.pendingEvent,null);
  assert.equal(tick(s,{force:true}),true);assert.equal(s.day,1);assert.equal(copy(s).day,1);
 }
});

test('weekly public accounts reconcile and keep a bounded, deterministic settlement history',()=>{
 const a=createGame({seed:197}),b=copy(a);
 for(const s of [a,b]){act(s,{type:'fiscal',policy:'high'});act(s,{type:'trade-policy',policy:'escorted'});act(s,{type:'economic-project',region:0,project:'enterprise'});advance(s,98);}
 assert.equal(a.economy.history.length,12);assert.equal(a.economy.history[0].day,21);assert.equal(a.economy.history.at(-1).day,98);
 const last=a.economy.history.at(-1);assert.ok(Math.abs(last.income-last.upkeep-last.net)<.01);
 assert.equal(serialize(a),serialize(b));assert.equal(serialize(copy(a)),serialize(a));
});

test('older economic saves acquire new accounting fields while malformed investments and shipments are rejected',()=>{
 const old=createGame({seed:197}),cells=old.districts.map(d=>[...d.cells]);
 for(const key of ['tradePolicy','projects','history','shipments','cargoLoss','leakage','realIncome','poverty'])delete old.economy[key];
 for(const r of old.regions)for(const key of ['investment','inputs','consumption','waste','utilization','formality','wage','realIncome','poverty','taxRevenue','leakage','cargoLoss','freight'])delete r.economy[key];
 const migrated=copy(old);assert.deepEqual(migrated.districts.map(d=>d.cells),cells);assert.equal(migrated.economy.tradePolicy,'open');advance(migrated,7);assert.equal(copy(migrated).day,7);
 for(const damage of [s=>s.economy.tradePolicy='toString',s=>s.regions[0].economy.investment.industry=4,s=>s.regions[0].economy.consumption.food=-1,s=>s.economy.projects=[{project:'industry',region:0,remaining:0,total:21}],s=>s.economy.history=[{day:99}],s=>s.economy.shipments=[{link:'missing',good:'food',from:0,to:1,amount:10,loss:0}]]){
  const s=createGame();damage(s);assert.throws(()=>copy(s));
 }
});

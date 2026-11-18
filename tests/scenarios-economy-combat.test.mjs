import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,act,tick,serialize,restore,budgetForecast} from '../src/engine.js';
import {SCENARIOS,scenarioCode,terrainAt} from '../src/scenarios.js';
import {scenarioManifest} from '../src/scenario-image.js';
import {NETWORKS,TRANSPORT_LINKS,REGIONS} from '../src/data.js';
import {INCOME_TYPES,incomeForecast,incomeTargets,stepEconomy} from '../src/economy.js';
import {stepCivilEconomy} from '../src/civil-economy.js';
import {assetState,provincialInfrastructure,nationalAccess} from '../src/infrastructure.js';
import {TACTICS,combatForecast} from '../src/combat.js';
import {alterCell} from '../src/cartels.js';
import {activeConfrontations} from '../src/confrontation.js';
function advance(s,days){for(let i=0;i<days;i++){if(s.pendingEvent)act(s,{type:'event',choice:1});tick(s,{force:true});}}
function freeze(s){for(const n of s.networks){n.nextDecision=1800;for(const b of n.branches)b.nextDecision=1800;}}
function battlefield(){const s=createGame({scenario:'classic'});s.money=1000;freeze(s);for(const u of s.units)u.district=0;s.districts[0].intel=85;return s;}

test('scenario director and explicit replay code produce the exact same opening',()=>{
 const a=createGame({seed:72841}),b=createGame({seed:72841,scenario:a.scenario.type});assert.equal(serialize(a),serialize(b));assert.match(scenarioCode(a),/^CC1-72841-/);assert.equal(scenarioManifest(a).signature,a.scenario.signature);
});
test('changing seed changes territories, leaders, resource sectors, infrastructure and event order',()=>{
 const a=createGame({seed:4}),b=createGame({seed:197});for(const field of ['owners','homes','eventDeck','signature'])assert.notDeepEqual(a.scenario[field],b.scenario[field]);assert.notDeepEqual(a.regions.map(r=>r.resources),b.regions.map(r=>r.resources));assert.notDeepEqual(a.assets.map(a=>a.condition),b.assets.map(a=>a.condition));
});
test('every authored scenario retains safe headquarters, all nine commands and connected opening land routes',()=>{
 for(const scenario of Object.keys(SCENARIOS)){const s=createGame({seed:197,scenario});assert.equal(s.districts.length,1200);assert.equal(s.districts[9].threat,0);assert.ok(nationalAccess(s).every(Number.isFinite));for(const n of s.networks){const leader=s.members.find(m=>m.id===n.leaderId);assert.ok(s.districts[leader.location].cells[n.id]>=42);assert.equal(n.branches.length,3);}assert.equal(restore(serialize(s)).scenario.signature,s.scenario.signature);}
});
test('scenario image manifest describes the actual state without consuming its RNG',()=>{
 const s=createGame({seed:44}),before=serialize(s),m=scenarioManifest(s);assert.equal(m.hotspots,s.districts.filter(d=>d.threat>=25).length);assert.equal(m.outages,s.assets.filter(a=>a.downtime>0).length);assert.deepEqual(m.factions.map(f=>f.home),s.scenario.homes);assert.equal(m.provinces.length,50);assert.equal(serialize(s),before);
});
test('seeded event decks and biome travel are authoritative gameplay data',()=>{
 const s=createGame({seed:197,scenario:'drought'});s.nextEvent=1;tick(s,{force:true});assert.equal(s.pendingEvent,s.scenario.eventDeck[0]);assert.ok(s.districts.some(d=>terrainAt(s,d.id)==='arid'));assert.equal(restore(serialize(s)).pendingEvent,s.pendingEvent);
});
test('same seeded orders replay exactly through market settlement and cartel decisions',()=>{
 const a=createGame({seed:197}),b=restore(serialize(a));for(let i=0;i<70;i++){if(a.pendingEvent){act(a,{type:'event',choice:1});act(b,{type:'event',choice:1});}tick(a,{force:true});tick(b,{force:true});}assert.equal(serialize(a),serialize(b));
});
test('old version-three campaigns gain economy data without reseeding their territory',()=>{
 const s=createGame({scenario:'classic'}),cells=s.districts.map(d=>d.cells);delete s.scenario;delete s.economy;delete s.lastBattle;for(const d of s.districts)delete d.fortifications;for(const r of s.regions)delete r.economy;for(const n of s.networks){delete n.rackets;delete n.dirtyCash;delete n.cashflow;delete n.archetype;}const restored=restore(serialize(s));assert.equal(restored.scenario,null);assert.deepEqual(restored.districts.map(d=>d.cells),cells);assert.ok(restored.networks.every(n=>Object.keys(n.rackets).length===8));
});
test('income requires occupied activity and laundering capacity limits usable cash',()=>{
 const s=createGame(),n=s.networks[0],before=incomeForecast(s,0);assert.ok(before.gross>0);n.dirtyCash=900;n.laundering=0;for(const m of s.members.filter(m=>m.network===0&&m.role==='financier'))m.status='captured';const limited=incomeForecast(s,0);assert.ok(limited.converted<limited.gross+900);for(const d of s.districts)alterCell(d,0,-d.cells[0]);assert.equal(incomeForecast(s,0).gross,0);const cash=n.dirtyCash;stepEconomy(s,n);assert.ok(n.dirtyCash<cash);assert.ok(n.funds<=100);
});
test('financial disruption is costed, timed, selective and suppresses a source for 28 days',()=>{
 const s=createGame({seed:197}),n=s.networks[0];freeze(s);s.money=1000;const key=Object.keys(INCOME_TYPES).find(k=>incomeTargets(s,0,k).length),id=incomeTargets(s,0,key)[0].district;s.units[0].district=id;s.districts[id].intel=80;const level=n.rackets[key].level,money=s.money,other=n.rackets[Object.keys(INCOME_TYPES).find(k=>k!==key)].level;
 assert.equal(act(s,{type:'interdict',district:id,network:0,racket:key}).ok,true);assert.ok(s.money<money);advance(s,4);assert.equal(n.rackets[key].level,level);advance(s,1);assert.equal(n.rackets[key].level,Math.max(0,level-25));assert.equal(n.rackets[key].blockedUntil,s.day+28);assert.ok(n.evidence>=22);assert.ok(Object.values(n.rackets).some(r=>r.level===other));assert.equal(restore(serialize(s)).networks[0].rackets[key].blockedUntil,s.day+28);
});
test('power and material resources constrain civilian production and market prices',()=>{
 const healthy=createGame({seed:4}),damaged=restore(serialize(healthy));for(const r of damaged.regions){assetState(damaged,`${r.id}-power`).condition=0;r.services=provincialInfrastructure(damaged,r.id);}stepCivilEconomy(healthy);stepCivilEconomy(damaged);assert.ok(damaged.regions.reduce((v,r)=>v+r.economy.production.materials,0)<healthy.regions.reduce((v,r)=>v+r.economy.production.materials,0));
});
test('closed bridges stop goods transfers into an isolated province and scarcity raises prices',()=>{
 const open=createGame({seed:197}),closed=restore(serialize(open));for(const s of [open,closed]){for(const r of s.regions)for(const key of Object.keys(r.economy.inventory))r.economy.inventory[key]=[24,37].includes(r.id)?0:450;for(const id of [24,37]){s.regions[id].resources={agriculture:0,minerals:0,fuel:0,market:0};s.regions[id].sector='commerce';assetState(s,`${id}-power`).condition=0;s.regions[id].services=provincialInfrastructure(s,id);}}
 for(const l of TRANSPORT_LINKS.filter(l=>l.type==='bridge'))assetState(closed,l.id).condition=0;stepCivilEconomy(open);stepCivilEconomy(closed);assert.ok(open.regions[24].economy.imports>0);assert.equal(closed.regions[24].economy.imports,0);assert.ok(closed.regions[24].economy.shortages>open.regions[24].economy.shortages);assert.ok(closed.regions[24].economy.prices.food>open.regions[24].economy.prices.food);
});
test('tax policy changes receipts, bonds add a matching liability and borrowing cannot exceed its cap',()=>{
 const s=createGame();act(s,{type:'fiscal',policy:'low'});stepCivilEconomy(s,{initial:true});const low=s.economy.taxReceipts;act(s,{type:'fiscal',policy:'high'});stepCivilEconomy(s,{initial:true});assert.ok(s.economy.taxReceipts>low);const money=s.money;assert.equal(act(s,{type:'borrow'}).ok,true);assert.equal(s.money,money+120);assert.equal(s.economy.debt,120);const upkeep=budgetForecast(s).upkeep;act(s,{type:'repay'});assert.equal(s.economy.debt,60);assert.ok(budgetForecast(s).upkeep<upkeep);while(s.economy.debt<=480)act(s,{type:'borrow'});const debt=s.economy.debt;assert.equal(act(s,{type:'borrow'}).ok,false);assert.equal(s.economy.debt,debt);
});
test('combat tactics have distinct duration, cost, escape pressure and civilian risk',()=>{
 const s=battlefield(),normal=combatForecast(s,0,0),rapid=combatForecast(s,0,0,'rapid'),precision=combatForecast(s,0,0,'precision'),cordon=combatForecast(s,0,0,'cordon');assert.ok(rapid.civilianRisk>normal.civilianRisk);assert.ok(precision.civilianRisk<normal.civilianRisk);assert.ok(cordon.escapeRisk<normal.escapeRisk);assert.ok(TACTICS.rapid.days<TACTICS.precision.days);s.districts[0].intel=59;const before=s.money;assert.equal(act(s,{type:'raid',district:0,network:0,tactic:'precision'}).ok,false);assert.equal(s.money,before);
});
test('neighboring units close exits and fortifications increase defensive strength',()=>{
 const s=battlefield(),before=combatForecast(s,0,0,'cordon');s.units[1].district=6;const cordon=combatForecast(s,0,0,'cordon');assert.ok(cordon.blocked>before.blocked);assert.ok(cordon.escapeRisk<before.escapeRisk);s.districts[0].fortifications[0]=100;assert.ok(combatForecast(s,0,0).defense>before.defense);
});
test('committed units are reserved, reinforcement spends funds and withdrawal releases the entire team',()=>{
 const s=battlefield();assert.equal(act(s,{type:'raid',district:0,network:0,units:[1]}).ok,true);const money=s.money;assert.equal(act(s,{type:'reinforce',district:0,unit:2}).ok,true);assert.ok(s.money<money);assert.deepEqual(s.operations[0].battle.units,[1,2]);assert.equal(s.units[1].status,'operating');assert.equal(restore(serialize(s)).operations[0].battle.units.length,2);assert.equal(act(s,{type:'tactic',district:0,tactic:'cordon'}).ok,false);assert.equal(act(s,{type:'withdraw',district:0}).ok,true);assert.ok(s.units.every(u=>u.status==='ready'));assert.equal(activeConfrontations(s).length,0);assert.equal(restore(serialize(s)).lastBattle.result,'withdrawn');
});
test('battle control, suppression and unit readiness change during contact; tactical changes cost time',()=>{
 const s=battlefield();act(s,{type:'raid',district:0,network:0,tactic:'deliberate'});const o=s.operations[0],readiness=s.units[0].readiness,threat=s.districts[0].cells[0];advance(s,1);assert.ok(o.battle.control>0);assert.ok(s.units[0].readiness<readiness);assert.ok(s.districts[0].cells[0]<threat);const remaining=o.remaining;assert.equal(act(s,{type:'tactic',district:0,tactic:'cordon'}).ok,true);assert.equal(o.remaining,remaining+1);const b=restore(serialize(s));advance(s,8);advance(b,8);assert.equal(serialize(s),serialize(b));assert.ok(s.lastBattle);assert.ok(['cleared','suppressed','evaded'].includes(s.lastBattle.result));
});
test('malformed scenario, economy and combat payloads are rejected',()=>{
 for(const damage of [s=>s.scenario.signature='bad',s=>s.scenario.eventDeck=['missing'],s=>s.regions[0].economy.inventory.food=-1,s=>s.economy.debt=999,s=>s.networks[0].rackets.fuel.level=Infinity,s=>s.networks[0].archetype='unknown']){const s=createGame();damage(s);assert.throws(()=>restore(serialize(s)));}
 const s=battlefield();act(s,{type:'raid',district:0,network:0});s.operations[0].battle.units=[1,1];assert.throws(()=>restore(serialize(s)));
});

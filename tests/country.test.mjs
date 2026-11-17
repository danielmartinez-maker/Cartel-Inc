import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGame,act,tick,serialize,restore,movementPlan,unitPower,supplyScore} from '../src/engine.js';
import {REGIONS,DISTRICTS,NEIGHBORHOODS,TRANSPORT_LINKS,NETWORKS,MAX_UNITS,SAVE_LIMIT} from '../src/data.js';
import {NEIGHBORHOOD_CELLS,findRoute} from '../src/geography.js';
import {INFRASTRUCTURE,INFRA_BY_REGION,assetState,provincialInfrastructure,nationalAccess} from '../src/infrastructure.js';
import {planCartel,stepCartels} from '../src/cartel-ai.js';
import {capabilities,alterCell} from '../src/cartels.js';
import {activeOrders,campaignSnapshot,campaignMilestones} from '../src/world.js';
function advance(s,n){for(let i=0;i<n;i++){if(s.pendingEvent)act(s,{type:'event',choice:1});tick(s,{force:true});}}
function freezeAI(s){for(const n of s.networks){n.nextDecision=1800;for(const b of n.branches)b.nextDecision=1800;}}

test('every district has three valid neighborhood polygons and corresponding simulation records',()=>{
 const s=createGame();assert.equal(s.districts.length,1200);for(const d of s.districts){assert.equal(d.neighborhoods.length,3);for(const n of NEIGHBORHOODS[d.id]){assert.equal(n.district,d.id);assert.equal(n.id,d.id*3+n.index);assert.ok(NEIGHBORHOOD_CELLS[d.id][n.index].length>=3);assert.equal(d.neighborhoods[n.index].influence.length,9);}}
});
test('every province has power, water, health, communications, rail and a logistics depot',()=>{
 const s=createGame();assert.equal(INFRASTRUCTURE.length,454);assert.equal(s.assets.length,454);for(const r of REGIONS){const types=INFRA_BY_REGION[r.id].map(a=>a.type);for(const t of ['power','water','hospital','telecom','rail','depot'])assert.ok(types.includes(t));assert.ok(Number.isFinite(s.regions[r.id].services.average));}assert.ok(nationalAccess(s).every(Number.isFinite));
});
test('power-station damage cascades into water pumping, health and communications',()=>{
 const s=createGame(),before=provincialInfrastructure(s,1);assetState(s,'1-power').condition=0;const after=provincialInfrastructure(s,1);assert.ok(after.power<before.power);assert.ok(after.water<before.water*.7);assert.ok(after.health<before.health);assert.ok(after.comms<before.comms*.7);
});
test('a reservoir limits the severity of a power outage',()=>{
 const s=createGame();assetState(s,'0-power').condition=0;assetState(s,'0-dam').condition=100;const backup=provincialInfrastructure(s,0);assetState(s,'0-dam').condition=0;assert.ok(backup.power>provincialInfrastructure(s,0).power);assert.ok(backup.water>provincialInfrastructure(s,0).water);
});
test('a destroyed bridge forces a real weighted route detour and repair reopens it',()=>{
 const s=createGame(),bridge=TRANSPORT_LINKS.find(l=>l.type==='bridge'),u=s.units[0];u.district=bridge.a;const open=movementPlan(s,u.id,bridge.b);assetState(s,bridge.id).condition=0;const closed=movementPlan(s,u.id,bridge.b);assert.ok(closed.ok);assert.ok(closed.days>open.days);assert.ok(!closed.path.some((id,i)=>i&&((id===bridge.a&&closed.path[i-1]===bridge.b)||(id===bridge.b&&closed.path[i-1]===bridge.a))));
 assert.equal(act(s,{type:'infrastructure',asset:bridge.id,task:'repair'}).ok,true);advance(s,12);assert.ok(assetState(s,bridge.id).condition>=49);assert.ok(movementPlan(s,u.id,bridge.b).days<closed.days);
});
test('infrastructure work is costed, timed, unique and represented in active orders',()=>{
 const s=createGame(),a=assetState(s,'0-power');a.condition=25;const before=s.money;assert.equal(act(s,{type:'infrastructure',asset:a.id,task:'repair'}).ok,true);assert.equal(before-s.money,18);const spent=s.money;assert.equal(act(s,{type:'infrastructure',asset:a.id,task:'repair'}).ok,false);assert.equal(s.money,spent);const work=activeOrders(s).find(w=>w.kind==='infrastructure');assert.equal(work.remaining,12);assert.equal(work.district,7);advance(s,11);assert.ok(a.condition<30);advance(s,1);assert.ok(a.condition>70);assert.equal(s.stats.infrastructure,1);assert.equal(restore(serialize(s)).stats.infrastructure,1);
});
test('expanded capacity lowers congestion and cannot be upgraded beyond level three',()=>{
 const s=createGame(),a=assetState(s,'0-rail');s.money=5000;freezeAI(s);const before=a.load;act(s,{type:'infrastructure',asset:a.id,task:'upgrade'});advance(s,24);assert.equal(a.level,2);assert.ok(a.load<before);act(s,{type:'infrastructure',asset:a.id,task:'upgrade'});advance(s,24);assert.equal(a.level,3);assert.equal(act(s,{type:'infrastructure',asset:a.id,task:'upgrade'}).ok,false);
});
test('auditing an infiltrated front cuts cartel funds and exposes a case',()=>{
 const s=createGame(),n=s.networks.find(n=>n.fronts.length),a=assetState(s,n.fronts[0]),def=INFRASTRUCTURE.find(d=>d.id===a.id);s.districts[def.district].intel=70;n.nextDecision=1800;freezeAI(s);const before=n.evidence;assert.equal(act(s,{type:'infrastructure',asset:a.id,task:'audit'}).ok,true);advance(s,7);assert.ok(a.infiltration<20);assert.equal(a.controller,null);assert.ok(n.evidence>before);assert.ok(n.funds<100);
});
test('fronts generate actual revenue and organizational capability depends on stockpiles',()=>{
 const s=createGame(),n=s.networks[0];freezeAI(s);advance(s,7);assert.ok(n.revenue.fronts>0);const strong=capabilities(s,0);n.arsenal=0;n.manpower=0;n.counterintel=0;const weak=capabilities(s,0);assert.ok(weak.defense<strong.defense);assert.ok(weak.recruit<strong.recruit);assert.ok(weak.stealth<strong.stealth);
});
test('regional command has named commanders, real hierarchy, ambition, authority and stress',()=>{
 const s=createGame();assert.equal(s.members.length,117);for(const n of s.networks){assert.equal(n.branches.length,3);for(const b of n.branches){assert.ok(s.members.some(m=>m.id===b.commander&&m.network===n.id));assert.ok(REGIONS[b.region]);}const staff=s.members.filter(m=>m.network===n.id);assert.equal(staff.filter(m=>m.role==='captain').length,4);assert.equal(staff.filter(m=>m.role==='regionalBoss').length,2);for(const m of staff)if(m.commander)assert.ok(staff.some(parent=>parent.id===m.commander));}
});
test('an ambitious disloyal branch can become autonomous during a leadership vacuum',()=>{
 const s=createGame(),n=s.networks[0],branch=n.branches[0];n.captured=true;s.members.find(m=>m.id===n.leaderId).status='captured';n.cohesion=20;branch.autonomy=85;branch.loyalty=20;branch.nextDecision=0;const local=s.districts.filter(d=>DISTRICTS[d.id].region===branch.region&&d.cells[0]>1).sort((a,b)=>b.threat-a.threat)[0],before=local.cells[0];s.day=1;stepCartels(s,()=>0,()=>{});assert.equal(branch.splintered,true);assert.equal(branch.posture,'autonomous');assert.ok(n.infighting>15);assert.ok(s.log.every(l=>l.text));assert.equal(local.cells[0],before+4);
});
test('capturing a regional commander disrupts that branch instead of generating a replacement',()=>{
 const s=createGame(),n=s.networks[0],b=n.branches[0],m=s.members.find(m=>m.id===b.commander);s.units[0].district=m.location;s.districts[m.location].intel=90;n.evidence=80;m.exposure=80;freezeAI(s);assert.equal(act(s,{type:'capture',member:m.id}).ok,true);s.operations[0].chance=1;advance(s,4);assert.equal(m.status,'captured');assert.equal(b.posture,'disrupted');assert.ok(b.stockpile<45);assert.equal(s.members.length,117);
});
test('the planner can choose institutional infiltration, counterintelligence and infrastructure disruption',()=>{
 const s=createGame(),n=s.networks[0];n.funds=100;n.heat=85;n.evidence=80;n.arsenal=90;n.infighting=65;s.units[0].district=0;
 // Place a pressured cell at an existing strategic infrastructure site.
 alterCell(s.districts[7],0,40-s.districts[7].cells[0]);const plans=planCartel(s,n);for(const intent of ['infiltrate','sabotage','counterintel','discipline'])assert.ok(plans.some(p=>p.intent===intent));assert.ok(plans.filter(p=>p.asset).every(p=>INFRASTRUCTURE.some(a=>a.id===p.asset)));
});
test('neighborhood employment projects affect one neighborhood and cannot be duplicated',()=>{
 const s=createGame(),d=s.districts[9],before=d.neighborhoods.map(n=>n.employment);assert.equal(act(s,{type:'neighborhood',district:9,neighborhood:1,task:'employment'}).ok,true);const money=s.money;assert.equal(act(s,{type:'neighborhood',district:9,neighborhood:1,task:'outreach'}).ok,false);assert.equal(s.money,money);advance(s,12);assert.ok(d.neighborhoods[1].employment>before[1]+15);assert.ok(d.neighborhoods[0].employment<before[0]+15);assert.equal(s.stats.neighborhoodProjects,1);
});
test('neighborhood patrols improve local security and deploying the unit clears its assignment',()=>{
 const s=createGame(),u=s.units[0],d=s.districts[u.district];assert.equal(act(s,{type:'patrol',unit:u.id,neighborhood:2}).ok,true);const before=d.neighborhoods[2].security;advance(s,15);assert.ok(d.neighborhoods[2].security>before);assert.equal(act(s,{type:'move',unit:u.id,district:8}).ok,true);assert.equal(u.patrol,null);assert.equal(act(s,{type:'patrol',unit:3,neighborhood:0}).ok,false);
});
test('regional priorities have continuing budget costs and improve their selected local layer',()=>{
 const s=createGame();assert.equal(act(s,{type:'province-priority',region:1,priority:'services'}).ok,true);assert.equal(s.regions[1].priority,'services');assert.equal(act(s,{type:'province-priority',region:50,priority:'economy'}).ok,false);assert.equal(act(s,{type:'province-priority',region:1,priority:'__proto__'}).ok,false);assert.equal(restore(serialize(s)).regions[1].priority,'services');
});
test('low utility continuity changes neighborhood access and grievance over time',()=>{
 const baseline=createGame(),damaged=createGame();freezeAI(baseline);freezeAI(damaged);for(const type of ['power','water','hospital','telecom'])assetState(damaged,`1-${type}`).condition=0;advance(baseline,80);advance(damaged,80);const a=baseline.districts[33].neighborhoods[0],b=damaged.districts[33].neighborhoods[0];assert.ok(b.access<a.access-10);assert.ok(b.grievance>a.grievance);
});
test('regional infrastructure emergencies apply to their affected province and survive saves',()=>{
 const s=createGame();s.pendingEvent='grid-failure';s.pendingRegion=1;assetState(s,'1-power').condition=25;assetState(s,'1-power').downtime=7;const other=assetState(s,'2-power').condition;const restored=restore(serialize(s));assert.equal(restored.pendingRegion,1);assert.equal(act(s,{type:'event',choice:0}).ok,true);assert.equal(assetState(s,'1-power').condition,60);assert.equal(assetState(s,'1-power').downtime,0);assert.equal(assetState(s,'2-power').condition,other);assert.equal(s.pendingRegion,null);
});
test('version-two migration preserves original member identities and district cases inside the new country',()=>{
 const text=readFileSync(new URL('./fixtures/v2-campaign.json',import.meta.url),'utf8'),old=JSON.parse(text).state,s=restore(text);assert.equal(s.migration.from,2);assert.equal(s.districts.length,1200);assert.equal(s.members.length,117);for(const m of old.members){const current=s.members.find(n=>n.id===m.id);assert.equal(current.name,m.name);assert.equal(current.status,m.status);assert.deepEqual(current.traits,m.traits);}for(const d of old.districts){assert.equal(s.districts[d.id].support,d.support);assert.deepEqual(s.districts[d.id].cells,d.cells);}assert.equal(s.paused,true);advance(s,7);assert.equal(restore(serialize(s)).day,7);
});
test('national-scale saves retain determinism through infrastructure, neighborhood works and AI decisions',()=>{
 let a=createGame({seed:197});act(a,{type:'infrastructure',asset:'0-power',task:'repair'});act(a,{type:'neighborhood',district:9,neighborhood:2,task:'outreach'});advance(a,3);let b=restore(serialize(a));for(let i=0;i<100;i++){if(a.pendingEvent){act(a,{type:'event',choice:1});act(b,{type:'event',choice:1});}tick(a,{force:true});tick(b,{force:true});}assert.equal(serialize(a),serialize(b));assert.ok(serialize(a).length<SAVE_LIMIT);
});
test('damaged, infiltrated and malformed national-scale save fields are rejected',()=>{
 const damage=[s=>s.assets.pop(),s=>s.assets[0].condition=-1,s=>s.assets[0].controller=99,s=>s.assets[0].level=4,s=>s.districts[0].neighborhoods.pop(),s=>s.districts[0].neighborhoods[1].influence=[1],s=>s.members[0].commander=s.members[0].id,s=>s.networks[0].branches[0].commander='missing',s=>s.networks[0].arsenal=Infinity,s=>s.regions[0].priority='bad',s=>{s.pendingEvent='grid-failure';s.pendingRegion=null;}];for(const edit of damage){const s=createGame();edit(s);assert.throws(()=>restore(serialize(s)));}
});
test('completed public works produce truthful map milestones only after their duration elapses',()=>{
 const s=createGame();act(s,{type:'infrastructure',asset:'0-power',task:'repair'});const before=campaignSnapshot(s);advance(s,11);assert.ok(!campaignMilestones(before,campaignSnapshot(s)).some(e=>e.text==='Repair complete'));const pending=campaignSnapshot(s);advance(s,1);assert.ok(campaignMilestones(pending,campaignSnapshot(s)).some(e=>e.text==='Repair complete'));
});

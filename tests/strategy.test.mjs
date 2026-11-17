import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGame,act,tick,restore,serialize,unitPower,supplyScore,recruitmentBase,memberRequirements,leaderOf,totalThreat,budgetForecast} from '../src/engine.js';
import {LAND,LANDS,DISTRICTS,REGIONS,NETWORKS,MAX_UNITS,HQ} from '../src/data.js';
import {NEIGHBORS,findRoute} from '../src/geography.js';
import {ARCHETYPES,TRAITS,createMembers,capabilities,alterCell,dominantNetwork} from '../src/cartels.js';
import {planCartel,stepCartels} from '../src/cartel-ai.js';
import {activeConfrontations} from '../src/confrontation.js';
import {activeOrders,CIVILIAN_ROUTES} from '../src/world.js';
const area=p=>Math.abs(p.reduce((v,[x,y],i)=>{const [a,b]=p[(i+1)%p.length];return v+x*b-a*y;},0)/2);
function advance(s,n){for(let i=0;i<n;i++){if(s.pendingEvent)act(s,{type:'event',choice:1});tick(s,{force:true});}}
function expose(s,nid=0){const m=leaderOf(s,nid);s.completed.push('prosecutors');s.networks[nid].evidence=80;s.units[0].district=m.location;s.districts[m.location].intel=85;alterCell(s.districts[m.location],nid,10-s.districts[m.location].cells[nid]);s.networks[nid].nextDecision=900;return m;}

test('playable land is exactly five times the original, with 120 uniquely named districts',()=>{
  assert.equal(DISTRICTS.length,120);assert.equal(LANDS.length,5);assert.equal(new Set(DISTRICTS.map(d=>d.name)).size,120);
  assert.ok(Math.abs(LANDS.reduce((v,p)=>v+area(p),0)/area(LAND)-5)<1e-9);
  for(const r of REGIONS){assert.equal(DISTRICTS.filter(d=>d.region===r.id).length,24);assert.equal(DISTRICTS[r.hub].region,r.id);assert.ok(findRoute(HQ,r.hub).length>0);}
  assert.ok(CIVILIAN_ROUTES.every(r=>DISTRICTS[r.a].region===DISTRICTS[r.b].region));
});
test('weighted routing chooses a cheaper detour when terrain or transport makes a short path expensive',()=>{
  const start=HQ,end=0,bfs=findRoute(start,end),expensive=bfs[1];
  const cost=(a,b)=>b===expensive?100:1,path=findRoute(start,end,cost),sum=p=>p.slice(1).reduce((v,b,i)=>v+cost(p[i],b),0);
  assert.ok(sum(path)<sum(bfs));assert.ok(path.every((id,i)=>!i||NEIGHBORS[path[i-1]].includes(id)));
});
test('nine factions use six archetypes and have 45 reproducible, unique members with two distinct traits',()=>{
  const s=createGame({seed:4});assert.equal(s.networks.length,9);assert.equal(Object.keys(ARCHETYPES).length,6);assert.equal(s.members.length,45);
  assert.equal(new Set(s.members.map(m=>m.name)).size,45);assert.deepEqual(s.members,createMembers(4));assert.notDeepEqual(createMembers(4),createMembers(197));
  for(const n of NETWORKS){assert.equal(s.members.filter(m=>m.network===n.id).length,5);assert.ok(ARCHETYPES[n.archetype]);}
  for(const m of s.members){assert.equal(new Set(m.traits).size,2);assert.ok(m.traits.every(t=>TRAITS[t]));assert.ok(!(m.traits.includes('cautious')&&m.traits.includes('reckless')));}
});
test('individual traits and specialist losses change actual organizational capabilities',()=>{
  const s=createGame(),leader=leaderOf(s,0);leader.skill=100;leader.traits=['reckless','ruthless'];const aggressive=capabilities(s,0);
  leader.traits=['cautious','patient'];const cautious=capabilities(s,0);assert.ok(aggressive.aggression>cautious.aggression);assert.ok(cautious.defense>aggressive.defense);assert.ok(cautious.stealth>aggressive.stealth);
  const before=capabilities(s,0).income;s.members.find(m=>m.network===0&&m.role==='financier').status='captured';assert.ok(capabilities(s,0).income<before);
});
test('archetypes and traits produce distinct ranked plans, with affordable actions only',()=>{
  const s=createGame();const choices=s.networks.map(n=>planCartel(s,n));assert.ok(new Set(choices.map(p=>p[0].intent)).size>=3);
  for(const [i,plans]of choices.entries())for(const p of plans){assert.ok(p.cost<=s.networks[i].funds);assert.ok(p.score>0);assert.ok(s.districts[p.target]);}
  s.networks[0].funds=0;assert.deepEqual(planCartel(s,s.networks[0]),[]);
});
test('security pressure adds withdrawal plans and exposure can trigger leader relocation',()=>{
  const s=createGame(),n=s.networks[0],m=leaderOf(s,0);n.heat=90;m.watchedUntil=0;s.day=10;s.units[0].district=m.location;
  assert.ok(planCartel(s,n).some(p=>p.intent==='regroup'));assert.ok(planCartel(s,n).some(p=>p.intent==='relocate'));
  m.watchedUntil=25;assert.ok(!planCartel(s,n).some(p=>p.intent==='relocate'));
});
test('cartel decisions spend funds, record reasons and preserve symmetric rivalry relations',()=>{
  const s=createGame();s.day=10;for(const n of s.networks)n.nextDecision=0;const funds=s.networks.map(n=>n.funds);
  stepCartels(s,()=>0,()=>{});
  for(const n of s.networks){assert.ok(n.funds<funds[n.id]);assert.equal(n.aiLog.length,1);assert.ok(n.aiLog[0].reason.length>0);assert.ok(n.nextDecision>s.day);}
  for(let a=0;a<9;a++)for(let b=0;b<9;b++)assert.equal(s.relations[a][b],s.relations[b][a]);
});
test('temporary pacts prevent rivalry plans against that partner and expire on schedule',()=>{
  const s=createGame();const n=s.networks.find(n=>planCartel(s,n).some(p=>p.intent==='rivalry')),rival=planCartel(s,n).find(p=>p.intent==='rivalry').rival;
  s.pacts.push({a:Math.min(n.id,rival),b:Math.max(n.id,rival),until:10});assert.ok(!planCartel(s,n).some(p=>p.intent==='rivalry'&&p.rival===rival));
  s.day=10;for(const f of s.networks)f.nextDecision=900;stepCartels(s,()=>0,()=>{});assert.equal(s.pacts.length,0);assert.ok(planCartel(s,n).some(p=>p.intent==='rivalry'&&p.rival===rival));
});
test('a cohesive funded cartel can appoint a named successor after an actual leader arrest',()=>{
  const s=createGame(),m=expose(s);s.networks[0].cohesion=96;for(const id of [1,7,8])alterCell(s.districts[id],0,50-s.districts[id].cells[0]);
  assert.equal(act(s,{type:'arrest',network:0}).ok,true);advance(s,5);assert.equal(s.networks[0].captured,true);assert.equal(m.status,'captured');
  advance(s,s.networks[0].successionAt-s.day);assert.equal(s.networks[0].captured,false);assert.equal(s.networks[0].successions,1);assert.notEqual(leaderOf(s,0).id,m.id);assert.equal(m.role,'formerLeader');assert.equal(restore(serialize(s)).networks[0].leaderId,s.networks[0].leaderId);
});
test('disrupted cohesion prevents succession even when territory and members survive',()=>{
  const s=createGame();expose(s);s.networks[0].cohesion=50;for(const id of [1,7])alterCell(s.districts[id],0,60-s.districts[id].cells[0]);
  act(s,{type:'arrest',network:0});advance(s,5);advance(s,s.networks[0].successionAt-s.day+1);assert.equal(s.networks[0].captured,true);assert.equal(s.networks[0].successions,0);assert.ok(totalThreat(s,0)>3);
});
test('member investigations establish exposure and security captures weaken the specialist role',()=>{
  const s=createGame(),m=s.members.find(m=>m.network===0&&m.role==='financier');s.networks[0].evidence=50;s.units[0].district=m.location;s.districts[m.location].intel=65;
  assert.ok(memberRequirements(s,m.id).some(r=>r.includes('identity')));act(s,{type:'investigate',district:m.location,network:0});advance(s,4);assert.equal(m.exposure,43);assert.deepEqual(memberRequirements(s,m.id),[]);
  const before=capabilities(s,0).income;assert.equal(act(s,{type:'capture',member:m.id}).ok,true);s.operations[0].chance=1;advance(s,4);assert.equal(m.status,'captured');assert.equal(s.stats.membersCaptured,1);assert.ok(capabilities(s,0).income<before);
});
test('witness deals use loyalty, remove a member and reveal the surviving organization',()=>{
  const s=createGame(),m=s.members.find(m=>m.network===1&&m.role==='fixer');m.exposure=50;s.networks[1].evidence=50;s.districts[m.location].intel=60;m.loyalty=20;
  assert.equal(act(s,{type:'flip',member:m.id}).ok,true);const chance=s.operations[0].chance;assert.ok(chance>.7);s.operations[0].chance=1;advance(s,4);assert.equal(m.status,'defected');assert.equal(s.stats.defections,1);assert.ok(s.networks[1].evidence>50);
  const high=createGame(),h=high.members.find(candidate=>candidate.id===m.id);h.exposure=50;h.loyalty=90;high.networks[1].evidence=50;high.districts[h.location].intel=60;assert.equal(act(high,{type:'flip',member:h.id}).ok,true);assert.ok(high.operations[0].chance<chance);
});
test('rival cells coexist and an explicitly targeted operation affects the correct faction',()=>{
  const s=createGame();alterCell(s.districts[0],1,25);assert.equal(dominantNetwork(s.districts[0]),0);s.units[0].district=0;s.districts[0].intel=100;
  assert.equal(act(s,{type:'raid',district:0,network:1}).ok,true);s.operations[0].chance=1;assert.equal(activeConfrontations(s)[0].network,1);advance(s,4);assert.equal(s.districts[0].cells[1],0);assert.ok(s.districts[0].cells[0]>30);assert.equal(s.log.find(l=>l.encounter).encounter.network,1);
});
test('regional programs roll out one district each day and never duplicate an active local delivery',()=>{
  const s=createGame();s.money=1000;assert.equal(act(s,{type:'project',id:'regional-water',district:HQ}).ok,true);assert.equal(act(s,{type:'project',id:'regional-water',district:13}).ok,false);assert.equal(act(s,{type:'project',id:'regional-water',district:33}).ok,true);
  const days=s.projects[0].remaining;advance(s,days);assert.equal(s.districts.filter(d=>d.completed.includes('water')).length,2);advance(s,1);assert.equal(s.districts.filter(d=>d.completed.includes('water')).length,4);
  assert.ok(activeOrders(s).every(o=>Number.isInteger(o.district)));assert.equal(restore(serialize(s)).regions[0].completed[0],'regional-water');
});
test('supply, readiness and fatigue alter power; resupply restores the operating unit',()=>{
  const s=createGame(),u=s.units[0],full=unitPower(s,u);u.supply=20;u.readiness=40;u.fatigue=70;assert.ok(unitPower(s,u)<full*.6);
  const supply=u.supply,fatigue=u.fatigue;assert.equal(act(s,{type:'resupply',unit:u.id}).ok,true);assert.equal(u.status,'operating');assert.equal(restore(serialize(s)).operations[0].type,'resupply');advance(s,3);assert.equal(u.status,'ready');assert.ok(u.supply>supply);assert.ok(u.fatigue<fatigue);
});
test('regional administration improves supply and opens a real recruitment base, with an 18-unit cap',()=>{
  const s=createGame(),hub=REGIONS[1].hub,before=supplyScore(s,hub);s.money=1000;assert.equal(recruitmentBase(s,hub),false);assert.equal(act(s,{type:'recruit',unitType:'police',district:hub}).ok,false);
  assert.equal(act(s,{type:'project',id:'regional-administration',district:hub}).ok,true);advance(s,20);assert.equal(recruitmentBase(s,hub),true);assert.ok(supplyScore(s,hub)>before);assert.equal(act(s,{type:'recruit',unitType:'police',district:hub}).ok,true);assert.equal(s.units.at(-1).district,hub);
  while(s.units.length<MAX_UNITS){s.money=1000;assert.equal(act(s,{type:'recruit',unitType:'police'}).ok,true);}assert.equal(act(s,{type:'recruit',unitType:'police'}).ok,false);
});
test('prosperity increases the tax base while an expanded force consumes weekly upkeep',()=>{
  const s=createGame(),before=budgetForecast(s);for(const d of s.districts)d.prosperity=100;assert.ok(budgetForecast(s).income>before.income);s.money=1000;act(s,{type:'recruit',unitType:'police'});assert.ok(budgetForecast(s).upkeep>before.upkeep);
});
test('version-one migration preserves all original districts and in-flight orders while adding the wider world',()=>{
  const text=readFileSync(new URL('./fixtures/v1-campaign.json',import.meta.url),'utf8'),old=JSON.parse(text).state,s=restore(text);assert.equal(s.version,2);assert.equal(s.districts.length,120);assert.equal(s.members.length,45);assert.equal(s.day,old.day);assert.equal(s.money,old.money);assert.equal(s.paused,true);
  for(const d of old.districts)for(const k of Object.keys(d))assert.deepEqual(s.districts[d.id][k],d[k]);
  for(const u of old.units)for(const k of Object.keys(u))assert.deepEqual(s.units.find(n=>n.id===u.id)[k],u[k]);
  assert.equal(s.operations[0].remaining,old.operations[0].remaining);assert.equal(s.projects[0].remaining,old.projects[0].remaining);assert.equal(s.migration.from,1);advance(s,3);assert.equal(restore(serialize(s)).day,5);
});
test('new save fields reject broken member identities, cells, relations, projects and operations',()=>{
  for(const damage of [s=>s.members[1].id=s.members[0].id,s=>s.members[0].network=8,s=>s.members[0].traits=['unknown','loyal'],s=>s.members[0].location=120,s=>s.districts[0].cells[0]=99,s=>s.networks[0].leaderId='missing',s=>s.units[0].supply=-1,s=>s.relations[0][1]=s.relations[1][0]+1,s=>s.regions[0].completed=['water'],s=>s.pacts=[{a:0,b:0,until:5}]]){const s=createGame();damage(s);assert.throws(()=>restore(serialize(s)));}
});

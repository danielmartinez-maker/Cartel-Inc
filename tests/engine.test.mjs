import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame as createOpening,act,tick,serialize,restore,stableDistricts,arrestRequirements,projectCost} from '../src/engine.js';
const createGame=(options={})=>createOpening({...options,scenario:'classic'});
import {DISTRICTS,NETWORKS} from '../src/data.js';
import {alterCell} from '../src/cartels.js';
import {CELLS,NEIGHBORS,findRoute} from '../src/geography.js';

function advance(s,days){for(let i=0;i<days;i++){if(s.pendingEvent)act(s,{type:'event',choice:1});tick(s,{force:true});}}

test('every district has valid land geometry and a symmetric connected route to headquarters',()=>{
  for(const d of DISTRICTS){
    assert.ok(CELLS[d.id].length>=3);
    assert.ok(NEIGHBORS[d.id].length>=2);
    for(const n of NEIGHBORS[d.id])assert.ok(NEIGHBORS[n].includes(d.id));
    const route=findRoute(9,d.id);assert.equal(route.at(0),9);assert.equal(route.at(-1),d.id);
  }
  assert.deepEqual(findRoute(-1,5),[]);
});
test('paused campaigns do not advance and duplicate or invalid orders do not spend money',()=>{
  const s=createGame();assert.equal(tick(s),false);assert.equal(s.day,0);
  assert.equal(act(s,{type:'project',id:'water',district:9}).ok,true);
  const money=s.money;
  assert.equal(act(s,{type:'project',id:'water',district:9}).ok,false);
  assert.equal(act(s,{type:'project',id:'school',district:9}).ok,false);
  assert.equal(act(s,{type:'raid',district:0}).ok,false);
  assert.equal(act(s,{type:'move',unit:999,district:0}).ok,false);
  assert.equal(s.money,money);
  assert.equal(act(s,{type:'pause'}).ok,true);assert.equal(tick(s),true);assert.equal(s.day,1);
});
test('local and province initiatives have separate scopes, unlock dependencies and complete once',()=>{
  const s=createGame();
  act(s,{type:'project',id:'water',district:9});act(s,{type:'project',id:'water',district:13});
  act(s,{type:'project',id:'analysis',district:9});
  const before=s.money;assert.equal(act(s,{type:'project',id:'analysis',district:13}).ok,false);assert.equal(s.money,before);
  advance(s,8);
  assert.ok(s.districts[9].completed.includes('water'));assert.ok(s.districts[13].completed.includes('water'));
  assert.ok(s.completed.includes('analysis'));assert.equal(s.stats.projects,3);
  assert.equal(act(s,{type:'project',id:'school',district:13}).ok,true);
  assert.equal(act(s,{type:'project',id:'school',district:12}).ok,false);
  assert.equal(act(s,{type:'project',id:'water',district:0}).ok,false);
});
test('investigations create evidence only when complete; in-flight orders cannot be duplicated',()=>{
  const s=createGame(),intel=s.districts[0].intel,evidence=s.networks[0].evidence;
  assert.equal(act(s,{type:'investigate',district:0}).ok,true);
  const money=s.money;assert.equal(act(s,{type:'investigate',district:0}).ok,false);assert.equal(s.money,money);
  advance(s,3);assert.equal(s.districts[0].intel,intel);assert.equal(s.networks[0].evidence,evidence);
  advance(s,1);assert.ok(s.districts[0].intel>intel);assert.ok(s.networks[0].evidence>evidence);assert.equal(s.operations.length,0);
});
test('units travel for their route duration, then become available for a real operation',()=>{
  const s=createGame({seed:4});
  act(s,{type:'investigate',district:0});advance(s,4);
  assert.equal(act(s,{type:'move',unit:1,district:0}).ok,true);
  const days=s.units[0].remaining;
  assert.equal(act(s,{type:'move',unit:1,district:18}).ok,false);
  assert.equal(act(s,{type:'raid',district:0}).ok,false);
  advance(s,days);assert.equal(s.units[0].district,0);assert.equal(s.units[0].status,'ready');
  const threat=s.districts[0].threat;
  assert.equal(act(s,{type:'raid',district:0}).ok,true);assert.equal(s.units[0].status,'operating');
  assert.equal(act(s,{type:'move',unit:1,district:1}).ok,false);
  advance(s,4);assert.ok(s.districts[0].threat<threat);assert.equal(s.units[0].status,'ready');
});
test('leader arrests require a prosecutable case, intelligence, containment and a present unit',()=>{
  const s=createGame();assert.ok(arrestRequirements(s,0).length>=4);
  const money=s.money;assert.equal(act(s,{type:'arrest',network:0}).ok,false);assert.equal(s.money,money);
  s.completed.push('prosecutors');s.networks[0].evidence=70;s.districts[0].intel=70;alterCell(s.districts[0],0,10-s.districts[0].cells[0]);s.units[0].district=0;
  assert.deepEqual(arrestRequirements(s,0),[]);
  assert.equal(act(s,{type:'arrest',network:0}).ok,true);assert.equal(s.networks[0].captured,false);
  advance(s,5);assert.equal(s.networks[0].captured,true);assert.equal(s.stats.arrests,1);
  const after=s.money;assert.equal(act(s,{type:'arrest',network:0}).ok,false);assert.equal(s.money,after);
});
test('a low-cohesion captured network cannot expand and is dismantled after its last cells are contained',()=>{
  const s=createGame();s.networks[0].captured=true;s.networks[0].cohesion=20;s.members[0].status='captured';
  for(const d of s.districts)alterCell(d,0,-d.cells[0]);
  alterCell(s.districts[1],0,4);
  advance(s,1);assert.equal(s.networks[0].dismantled,false);assert.ok(s.districts[1].cells[0]<4);
  advance(s,24);assert.equal(s.networks[0].dismantled,true);
  assert.equal(s.districts.reduce((v,d)=>v+d.cells[0],0),0);
});
test('save/load preserves deterministic outcomes and always restores time paused',()=>{
  const a=createGame({seed:197});act(a,{type:'pause'});act(a,{type:'investigate',district:18});act(a,{type:'move',unit:1,district:18});
  advance(a,2);const b=restore(serialize(a));assert.equal(b.paused,true);a.paused=true;
  for(let day=0;day<110;day++){
    if(a.pendingEvent){act(a,{type:'event',choice:1});act(b,{type:'event',choice:1});}
    tick(a,{force:true});tick(b,{force:true});
  }
  assert.deepEqual(a,b);
});
test('save import rejects oversized files, foreign saves, duplicate districts and broken operations',()=>{
  assert.throws(()=>restore('x'.repeat(300001)));
  assert.throws(()=>restore('{"game":"other"}'));
  const invalid=[
    s=>s.money=-1,s=>s.districts[1].id=0,s=>s.units[0].type='unknown',s=>s.difficulty='__proto__',
    s=>{s.units[0].status='moving';s.units[0].remaining=2;s.units[0].total=2;s.units[0].path=[9,0];},
    s=>{s.operations.push({type:'raid',district:0,network:0,remaining:2,total:4,power:50,chance:0.8,unit:999});},
    s=>s.networks[0].dismantled=true,
  ];
  for(const corrupt of invalid){const s=createGame();corrupt(s);assert.throws(()=>restore(serialize(s)));}
});
test('decisions block time, affordable alternatives remain available, and choices apply only once',()=>{
  const s=createGame();advance(s,18);assert.equal(s.pendingEvent,'witness');assert.equal(tick(s,{force:true}),false);
  s.money=0;assert.equal(act(s,{type:'event',choice:0}).ok,false);assert.equal(s.pendingEvent,'witness');
  const evidence=s.networks[0].evidence;
  assert.equal(act(s,{type:'event',choice:1}).ok,true);assert.equal(s.networks[0].evidence,evidence+5);
  assert.equal(act(s,{type:'event',choice:1}).ok,false);assert.equal(s.networks[0].evidence,evidence+5);
});
test('victory requires both objectives held for fourteen days and terminal states reject new orders',()=>{
  const s=createGame();
  for(const d of s.districts){d.cells.fill(0);d.threat=0;d.support=80;d.stability=100;d.services=1;}
  for(const n of s.networks){n.captured=true;n.dismantled=true;}
  assert.equal(stableDistricts(s),DISTRICTS.length);advance(s,13);assert.equal(s.outcome,null);advance(s,1);assert.equal(s.outcome,'victory');
  const ended=serialize(s);assert.equal(tick(s,{force:true}),false);assert.equal(act(s,{type:'investigate',district:0}).ok,false);assert.equal(serialize(s),ended);
  const lost=createGame();lost.trust=0;advance(lost,1);assert.equal(lost.outcome,'defeat');
});
test('weekly net funding matches difficulty and unit upkeep without exceeding treasury bounds',()=>{
  for(const difficulty of ['relaxed','standard','veteran']){
    const s=createGame({difficulty}),money=s.money;advance(s,7);assert.ok(s.money>money);assert.ok(s.money<=9999);
  }
  const s=createGame();s.money=0;assert.equal(act(s,{type:'recruit',unitType:'federal'}).ok,false);
  assert.equal(s.money,0);assert.equal(projectCost(s,7),7);
});

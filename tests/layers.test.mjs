import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame as createOpening,act,tick,serialize,restore,movementPlan} from '../src/engine.js';
const createGame=(options={})=>createOpening({...options,scenario:'classic'});
import {DISTRICTS,TRANSPORT_LINKS} from '../src/data.js';
import {assetState,assetOutput} from '../src/infrastructure.js';
import {capabilities} from '../src/cartels.js';
import {planBranch,stepRegionalCommand,commandEffectiveness} from '../src/regional-command.js';
import {unitPose,activeOrders} from '../src/world.js';
import {tacticalFrame} from '../src/confrontation.js';

test('unit interpolation follows accepted segment durations instead of geometric distance',()=>{
  const s=createGame(),u=s.units[0],plan=movementPlan(s,u.id,0);
  assert.equal(act(s,{type:'move',unit:u.id,district:0}).ok,true);
  assert.deepEqual(u.routeDays,plan.durations);
  const first=DISTRICTS[u.path[0]],second=DISTRICTS[u.path[1]];
  u.remaining=u.total;const pose=unitPose(u,plan.durations[0]/2);
  assert.ok(Math.abs(pose.x-(first.x+second.x)/2)<1e-8);
  assert.ok(Math.abs(pose.y-(first.y+second.y)/2)<1e-8);
  assert.deepEqual(restore(serialize(s)).units[0].routeDays,u.routeDays);
});

test('an accepted deployment reroutes at a junction when its bridge closes before entry',()=>{
  const s=createGame(),bridge=TRANSPORT_LINKS.find(l=>l.type==='bridge'),u=s.units[0];
  u.district=bridge.a;assert.equal(act(s,{type:'move',unit:u.id,district:bridge.b}).ok,true);
  const days=u.total;assetState(s,bridge.id).condition=0;
  tick(s,{force:true});
  assert.ok(u.total>days);assert.equal(u.status,'moving');assert.equal(u.path.at(-1),bridge.b);
  assert.ok(!u.path.some((id,i)=>i&&id===bridge.b&&u.path[i-1]===bridge.a));
  assert.ok(s.log.some(l=>l.text.includes('rerouted')));
  assert.equal(restore(serialize(s)).units[0].remaining,u.remaining);
});

test('old version-three deployments gain valid segment timings while retaining the accepted ETA',()=>{
  const s=createGame();act(s,{type:'move',unit:1,district:1100});tick(s,{force:true});
  const accepted=s.units[0].remaining;delete s.units[0].routeDays;delete s.units[0].blocked;
  const restored=restore(serialize(s));assert.equal(restored.units[0].remaining,accepted);
  assert.equal(restored.units[0].routeDays.reduce((a,b)=>a+b,0),restored.units[0].total);
  assert.equal(restored.units[0].blocked,false);
  const corrupt=JSON.parse(serialize(restored));corrupt.state.units[0].routeDays[0]++;
  assert.throws(()=>restore(JSON.stringify(corrupt)));
});

test('an isolated deployment holds without phantom progress, then resumes after a real bridge repair',()=>{
  const s=createGame(),bridge=TRANSPORT_LINKS.find(l=>l.regions.includes(24)),u=s.units[0];
  const inside=DISTRICTS[bridge.a].region===24?bridge.a:bridge.b,outside=inside===bridge.a?bridge.b:bridge.a;
  u.district=outside;assert.equal(act(s,{type:'move',unit:u.id,district:inside}).ok,true);
  const accepted=u.remaining;
  for(const l of TRANSPORT_LINKS.filter(l=>l.type==='bridge'))assetState(s,l.id).condition=0;
  tick(s,{force:true});assert.equal(u.blocked,true);assert.equal(u.remaining,accepted);
  assert.deepEqual(unitPose(u,.9),unitPose(u,0));assert.equal(restore(serialize(s)).units[0].blocked,true);
  assert.equal(act(s,{type:'infrastructure',asset:bridge.id,task:'repair'}).ok,true);
  for(let i=0;i<13;i++)tick(s,{force:true});
  assert.equal(u.blocked,false);assert.ok(s.log.some(l=>l.text.includes('resumed deployment')));
  assert.ok(assetState(s,bridge.id).condition>40);
});

test('invalid civic task names never corrupt the budget or create unfinished work',()=>{
  const s=createGame(),before=serialize(s);
  for(const task of ['__proto__','constructor','missing']){
    assert.equal(act(s,{type:'infrastructure',asset:'0-power',task}).ok,false);
    assert.equal(act(s,{type:'neighborhood',district:9,neighborhood:0,task}).ok,false);
  }
  assert.equal(serialize(s),before);
});

test('freight congestion reduces delivered output even when condition is unchanged',()=>{
  const s=createGame(),a=assetState(s,'0-rail');a.condition=90;a.load=60;
  const clear=assetOutput(a);a.load=100;
  assert.ok(assetOutput(a)<clear*.85);assert.equal(a.condition,90);
});

test('regional commanders select withdrawal under local security pressure and spend branch supplies',()=>{
  const s=createGame(),n=s.networks[0],b=n.branches[0];s.day=1;
  const local=s.districts.slice(b.region*24,b.region*24+24).filter(d=>d.cells[0]>1).sort((a,b)=>b.cells[0]-a.cells[0])[0];
  s.units[0].district=local.id;n.heat=80;b.nextDecision=0;
  const plans=planBranch(s,n,b),stockpile=b.stockpile,funds=n.funds;
  assert.equal(plans[0].intent,'withdraw');
  stepRegionalCommand(s,n,capabilities(s,n.id),()=>0,()=>{});
  assert.equal(b.lastAction.intent,'withdraw');assert.ok(b.stockpile<stockpile);assert.ok(n.funds<funds);
  assert.equal(DISTRICTS[b.lastAction.target].region,b.region);
  assert.equal(restore(serialize(s)).networks[0].branches[0].lastAction.intent,'withdraw');
});

test('an autonomous branch can resist with its own supplies after central funds and command collapse',()=>{
  const s=createGame(),n=s.networks[0],b=n.branches[0];n.captured=true;n.funds=0;
  s.members.find(m=>m.id===n.leaderId).status='captured';b.splintered=true;b.stockpile=30;b.nextDecision=0;
  assert.ok(planBranch(s,n,b).length);
  stepRegionalCommand(s,n,capabilities(s,n.id),()=>0,()=>{});
  assert.ok(b.lastAction);assert.ok(b.stockpile<30);assert.equal(n.funds,0);
  s.members.find(m=>m.id===b.commander).status='captured';
  assert.deepEqual(planBranch(s,n,b),[]);
});

test('broken command chains and stress slow regional action, and cyclic hierarchies are rejected',()=>{
  const s=createGame(),n=s.networks[0],b=n.branches[0],m=s.members.find(m=>m.id===b.commander);
  const before=commandEffectiveness(s,m);m.stress=100;
  assert.ok(commandEffectiveness(s,m)<before);
  const parent=s.members.find(p=>p.id===m.commander);parent.status='captured';
  assert.ok(commandEffectiveness(s,m)<before*.8);
  m.commander=parent.id;parent.commander=m.id;
  assert.equal(commandEffectiveness(s,m),0);assert.throws(()=>restore(serialize(s)));
});

test('activity locates training at a provincial recruitment base and retains blocked-route information',()=>{
  const s=createGame(),id=33;s.regions[1].completed.push('regional-administration');
  assert.equal(act(s,{type:'recruit',unitType:'police',district:id}).ok,true);
  assert.equal(activeOrders(s).find(o=>o.kind==='unit'&&o.label.includes('Training')).district,id);
  act(s,{type:'move',unit:1,district:0});s.units[0].blocked=true;
  assert.match(activeOrders(s).find(o=>o.unit===1).label,/Route blocked/);
  assert.deepEqual(unitPose(s.units[0],.8),unitPose(s.units[0],0));
});

test('confrontation stages follow authoritative operation progress and never change simulation state',()=>{
  const s=createGame(),before=serialize(s);
  assert.equal(tacticalFrame(0).phase,'ADVANCING');assert.equal(tacticalFrame(.3).phase,'IN CONTACT');
  assert.equal(tacticalFrame(.9).phase,'CONTAINING');assert.equal(tacticalFrame(-1).advance,0);
  assert.equal(tacticalFrame(2).encircle,1);assert.equal(serialize(s),before);
});

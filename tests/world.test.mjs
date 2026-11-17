import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,act,tick,movementPlan,serialize} from '../src/engine.js';
import {DISTRICTS,HQ} from '../src/data.js';
import {CampaignClock,DAY_MS,progressOf,samplePolyline,unitPose,CIVILIAN_ROUTES,roadIsActive,atmosphere,activeOrders,campaignSnapshot,campaignMilestones} from '../src/world.js';

test('the animation clock preserves a partially elapsed day while paused and changing speed',()=>{
  const clock=new CampaignClock();
  assert.equal(clock.step(240,{running:true,speed:1}),0);
  assert.equal(clock.fraction,.2);
  assert.equal(clock.step(100000,{running:false,speed:1}),0);
  assert.equal(clock.fraction,.2);
  assert.equal(clock.step(160,{running:true,speed:3}),1);
  assert.ok(clock.fraction<1e-10);
  clock.reset();assert.equal(clock.fraction,0);
});
test('all animation speeds advance the same campaign when given equivalent campaign time',()=>{
  const results=[];
  for(const speed of [1,2,3]){
    const clock=new CampaignClock(),state=createGame({seed:65});act(state,{type:'pause'});
    for(let i=0;i<10*DAY_MS[speed]/20;i++)for(let day=clock.step(20,{running:true,speed});day>0;day--)tick(state);
    results.push(serialize({...state,speed:1}));assert.equal(state.day,10);
  }
  assert.equal(results[0],results[1]);assert.equal(results[1],results[2]);
});
test('background stalls are bounded rather than fast-forwarding the mandate',()=>{
  const clock=new CampaignClock();assert.equal(clock.step(60000,{running:true,speed:3}),1);
  assert.equal(clock.fraction,.25);
});
test('route sampling follows distance, handles duplicate points and stays at the endpoints',()=>{
  const points=[[0,0],[30,0],[30,10]];
  assert.deepEqual(samplePolyline(points,.5),{x:20,y:0,angle:0});
  assert.deepEqual(samplePolyline(points,2),{x:30,y:10,angle:90});
  assert.deepEqual(samplePolyline([[3,4],[3,4]],.7),{x:3,y:4,angle:0});
  assert.equal(progressOf({remaining:4,total:4},.5),.125);
  assert.equal(progressOf({remaining:0,total:4},1),1);
});
test('deployment previews are read-only and match the exact accepted route and arrival time',()=>{
  for(const d of DISTRICTS.filter(d=>d.id!==HQ)){
    const state=createGame();state.districts[d.id].completed.push('roads');
    const before=serialize(state),plan=movementPlan(state,1,d.id);
    assert.equal(serialize(state),before);assert.equal(plan.ok,true);
    assert.equal(act(state,{type:'move',unit:1,district:d.id}).ok,true);
    assert.deepEqual(state.units[0].path,plan.path);assert.equal(state.units[0].remaining,plan.days);
    const pose=unitPose(state.units[0],0);assert.equal(pose.x,DISTRICTS[HQ].x);assert.equal(pose.y,DISTRICTS[HQ].y);
    assert.equal(movementPlan(state,1,0).ok,false);
  }
  assert.equal(movementPlan(createGame(),999,0).ok,false);
});
test('civilian movement responds to threat and presentation never consumes campaign randomness',()=>{
  const state=createGame(),before=serialize(state),route=CIVILIAN_ROUTES.find(r=>roadIsActive(state,r));
  assert.ok(route);for(let day=0;day<100;day++){atmosphere(state.seed,day);activeOrders(state);campaignSnapshot(state);for(const r of CIVILIAN_ROUTES)roadIsActive(state,r);}
  assert.equal(serialize(state),before);
  state.districts[route.a].threat=35;assert.equal(roadIsActive(state,route),false);
});
test('the activity view combines work and travel in completion order, placing province policies at headquarters',()=>{
  const state=createGame({difficulty:'relaxed'});
  assert.equal(act(state,{type:'project',id:'analysis',district:3}).ok,true);
  assert.equal(act(state,{type:'investigate',district:0}).ok,true);
  assert.equal(act(state,{type:'move',unit:1,district:0}).ok,true);
  assert.equal(act(state,{type:'recruit',unitType:'police'}).ok,true);
  const orders=activeOrders(state);
  assert.equal(orders.length,4);
  assert.equal(orders.find(o=>o.id==='analysis').district,HQ);
  assert.equal(orders.find(o=>o.kind==='operation').district,0);
  assert.ok(orders.every((o,i)=>i===0||o.remaining>=orders[i-1].remaining));
});
test('map milestones describe completed work once and never claim a raid succeeded without evidence',()=>{
  const state=createGame();act(state,{type:'investigate',district:0});
  const before=campaignSnapshot(state);
  for(let i=0;i<4;i++)tick(state,{force:true});
  const after=campaignSnapshot(state),events=campaignMilestones(before,after);
  assert.ok(events.some(e=>e.district===0&&e.text==='Intelligence updated'));
  assert.deepEqual(campaignMilestones(after,after),[]);
  const raidBefore={...after,operations:[{district:0,type:'raid'}]};
  const raidAfter={...after,day:after.day+1};
  assert.deepEqual(campaignMilestones(raidBefore,raidAfter),[{district:0,text:'Operation resolved',kind:'info',operation:'raid'}]);
});

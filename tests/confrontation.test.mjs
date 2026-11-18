import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame as createOpening,act,tick,serialize,restore} from '../src/engine.js';
const createGame=(options={})=>createOpening({...options,scenario:'classic'});
import {alterCell} from '../src/cartels.js';
import {activeConfrontations,exchangeFrame,EncounterTimeline,encounterResults,encounterKey} from '../src/confrontation.js';

function prepared(){
  const s=createGame({seed:197});s.units[0].district=0;s.districts[0].intel=80;return s;
}
function raid({threat=44,chance=1}={}){
  const s=prepared();alterCell(s.districts[0],0,threat-s.districts[0].cells[0]);
  assert.equal(act(s,{type:'raid',district:0}).ok,true);s.operations[0].chance=chance;delete s.operations[0].battle;return s;
}
function finish(s){for(let i=0;i<4;i++)tick(s,{force:true});return s;}

test('a confrontation belongs to an accepted raid with a present operating security unit',()=>{
  const s=prepared();assert.equal(act(s,{type:'investigate',district:0}).ok,true);
  assert.deepEqual(activeConfrontations(s),[]);
  const battle=raid(),before=serialize(battle),models=activeConfrontations(battle);
  assert.equal(models.length,1);assert.equal(models[0].unit.id,1);assert.equal(models[0].district,0);assert.equal(models[0].members,4);
  assert.equal(serialize(battle),before);
  const key=models[0].key;tick(battle,{force:true});assert.equal(activeConfrontations(battle)[0].key,key);
  battle.units[0].status='moving';assert.deepEqual(activeConfrontations(battle),[]);
  battle.units[0].status='operating';battle.units[0].type='intel';assert.deepEqual(activeConfrontations(battle),[]);
});
test('disruption operations and districts with no cell do not display a firefight',()=>{
  const s=prepared();assert.equal(act(s,{type:'interdict',district:0}).ok,true);assert.deepEqual(activeConfrontations(s),[]);
  const battle=raid();alterCell(battle.districts[0],0,-battle.districts[0].cells[0]);assert.deepEqual(activeConfrontations(battle),[]);
});
test('a tracer travels before dust contact and exchanges alternate with quiet intervals',()=>{
  assert.equal(exchangeFrame(0).some(f=>f.visible||f.contact>0||f.muzzle>0),false);
  assert.equal(exchangeFrame(.22)[0].visible,true);assert.equal(exchangeFrame(.22)[0].contact,0);
  assert.equal(exchangeFrame(.45)[0].visible,false);assert.ok(exchangeFrame(.45)[0].contact>0);
  assert.equal(exchangeFrame(.85).some(f=>f.visible||f.contact>0||f.muzzle>0),false);
  assert.equal(exchangeFrame(1.15)[1].visible,true);assert.equal(exchangeFrame(1.15)[0].visible,false);
  for(let i=0;i<200;i++)for(const f of exchangeFrame(i*.017)){
    assert.ok(f.travel>=0&&f.travel<=1&&f.muzzle>=0&&f.muzzle<=1&&f.contact>=0&&f.contact<=1);
    if(f.contact>0)assert.equal(f.travel,1);
  }
});
test('confrontation time freezes for pause, hidden views and disabled motion',()=>{
  const clock=new EncounterTimeline(),on={visible:true,running:true,motion:true};
  clock.step(.05,on);assert.equal(clock.seconds,.05);
  for(const off of [{...on,running:false},{...on,visible:false},{...on,motion:false}])clock.step(4,off);
  assert.equal(clock.seconds,.05);clock.step(.05,on);assert.equal(clock.seconds,.1);
  clock.step(60,on);assert.equal(clock.seconds,.2);
});
test('the engine reports distinct contained, weakened and evaded outcomes after resolution',()=>{
  for(const [options,result]of [[{threat:20,chance:1},'cleared'],[{threat:90,chance:1},'suppressed'],[{threat:44,chance:0},'evaded']]){
    const s=raid(options);assert.deepEqual(encounterResults(s.log),[]);finish(s);
    const events=encounterResults(s.log);assert.equal(events.length,1);assert.equal(events[0].result,result);
    assert.equal(events[0].district,0);assert.equal(events[0].unit,1);assert.equal(events[0].day,4);
    assert.equal(s.log.find(l=>l.encounter).kind,result==='evaded'?'warning':'success');
    assert.equal(activeConfrontations(s).length,0);assert.equal(s.units[0].status,'ready');
    assert.equal(encounterKey(events[0]),`4:0:1:${result}`);
  }
});
test('new encounter reports survive saves, legacy reports still load and malformed details are rejected',()=>{
  const s=finish(raid({threat:20})),text=serialize(s),saved=JSON.parse(text);
  assert.equal(encounterResults(restore(text).log)[0].result,'cleared');
  for(const l of saved.state.log)delete l.encounter;
  assert.equal(restore(JSON.stringify(saved)).day,4);
  const report=JSON.parse(text).state.log.find(l=>l.encounter);
  for(const encounter of [null,[],{...report.encounter,district:-1},{...report.encounter,unit:3},{...report.encounter,result:'victory'}]){
    const invalid=JSON.parse(text);invalid.state.log.find(l=>l.encounter).encounter=encounter;
    assert.throws(()=>restore(JSON.stringify(invalid)));
  }
});
test('animation sampling and encounter views never affect simulation resources, outcomes or randomness',()=>{
  const plain=raid(),animated=raid();
  for(let day=0;day<4;day++){
    for(let frame=0;frame<120;frame++){activeConfrontations(animated);exchangeFrame(frame/60);encounterResults(animated.log);}
    tick(plain,{force:true});tick(animated,{force:true});
  }
  assert.equal(serialize(animated),serialize(plain));
});

"use strict";
const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const path = require("node:path");
const html = fs.readFileSync(path.join(__dirname, "sierra-command.html"), "utf8");
const start = html.indexOf("var SierraEngine =");
const stop = html.indexOf('(function () {\n"use strict";\nconst E = SierraEngine;', start);
assert(start >= 0 && stop > start, "Standalone game engine was not found");
const context = {};
vm.createContext(context);
vm.runInContext(html.slice(start, stop), context);
const E = context.SierraEngine;
let count = 0;
function test(name, fn) { fn(); count++; console.log("PASS " + name); }
function cleanTick(s, n) {
 for (let i=0;i<n;i++) {
  if (s.event) { const e=E.EVENTS.find(e=>e.id===s.event.id); E.choose(s,e.choices.findIndex(c=>c.cost<=0)); }
  E.tick(s);
 }
}
test("Seeded simulation is deterministic",()=>{
 const a=E.create({seed:123}),b=E.create({seed:123});
 cleanTick(a,25);cleanTick(b,25);assert.equal(JSON.stringify(a),JSON.stringify(b));
});
test("Unaffordable orders preserve funds and projects",()=>{
 const s=E.create();s.budget=0;assert.equal(E.action(s,"services",0).ok,false);
 assert.equal(s.budget,0);assert.equal(s.projects.length,0);
});
test("Duplicate projects are rejected without charging twice",()=>{
 const s=E.create();assert(E.action(s,"services",0).ok);const b=s.budget;
 assert.equal(E.action(s,"services",0).ok,false);assert.equal(s.budget,b);
});
test("Moving units do not provide local protection",()=>{
 const s=E.create();assert.equal(E.unitsAt(s,14).length,1);assert(E.action(s,"move",0,1).ok);
 assert.equal(E.unitsAt(s,14).length,0);cleanTick(s,s.teams[0].eta);
 assert.equal(s.teams[0].regionId,0);assert.equal(s.teams[0].eta,0);
});
test("Disruption requires a stationed unit and intelligence",()=>{
 const s=E.create();assert.equal(E.action(s,"disrupt",0).ok,false);
 s.regions[14].intel=0;assert.equal(E.action(s,"disrupt",14).ok,false);
 s.regions[14].intel=50;assert(E.action(s,"disrupt",14).ok);
});
test("Cancelled operations return half their cost",()=>{
 const s=E.create();s.regions[14].intel=50;E.action(s,"disrupt",14);E.action(s,"move",0,1);
 cleanTick(s,2);assert(s.log.some(l=>l.message.includes("Operation cancelled")));
 assert(s.factions[1].power>85);
});
test("Leadership cases enforce all three prerequisites",()=>{
 const s=E.create();assert.equal(E.action(s,"capture",14,0).ok,false);
 s.levels.justice=1;assert.equal(E.action(s,"capture",14,0).ok,false);
 s.factions[0].intel=70;assert.equal(E.action(s,"capture",14,0).ok,false);
 s.factions[0].power=50;assert(E.action(s,"capture",14,0).ok);
});
test("Unresolved decisions pause campaign time",()=>{
 const s=E.create();cleanTick(s,7);assert(s.event);const w=s.week;E.tick(s);assert.equal(s.week,w);
 const e=E.EVENTS.find(e=>e.id===s.event.id);assert(E.choose(s,e.choices.findIndex(c=>c.cost<=0)).ok);
 E.tick(s);assert.equal(s.week,w+1);
});
test("Purchasing and upkeep cannot create negative funds",()=>{
 const s=E.create();
 for(let n=0;n<100;n++){E.action(s,"recruit");E.action(s,"services",n%24);E.action(s,"intel",n%24);cleanTick(s,1);assert(s.budget>=0);}
});
test("Save validation rejects malformed destinations and logs",()=>{
 const s=E.create();assert(E.validate(s));
 const b=JSON.parse(JSON.stringify(s));b.teams[0].eta=2;b.teams[0].destination=null;assert.equal(E.validate(b),false);
 const c=JSON.parse(JSON.stringify(s));c.log=[null];assert.equal(E.validate(c),false);assert.equal(E.validate({version:1}),false);
});
test("Trust collapse ends the campaign",()=>{const s=E.create();s.mandate=0;E.tick(s);assert.equal(s.status,"lost");});
test("The 144-week mandate deadline is enforced",()=>{const s=E.create();s.week=143;s.nextEvent=999;E.tick(s);assert.equal(s.status,"lost");});
test("Stabilization also requires civilian development",()=>{
 const s=E.create(),r=s.regions[0];r.threat=0;r.support=90;r.development=0;r.corruption=10;r.progress=0;
 E.tick(s);assert.equal(r.progress,0);r.development=75;cleanTick(s,13);assert(r.stable);
});
test("Arrests alone do not dismantle organizations",()=>{
 const s=E.create();s.factions.forEach(f=>{f.leaderCaptured=true;f.power=60;});
 cleanTick(s,1);assert.equal(E.metric(s).networks,0);
});
const auto = function auto(seed) {
 const s=E.create({seed:seed,difficulty:"standard",profile:"administrator"});
 const priorities=["integrity","health","jobs","justice","intelligence","training","health","jobs","integrity","intelligence","training","health","jobs","justice","integrity"];
 let bought=0;
 for(let w=0;w<145&&s.status==="active";w++){
  if(s.event){
   const ev=E.EVENTS.find(e=>e.id===s.event.id);
   const choices=ev.choices.map((c,i)=>({c,i})).filter(x=>x.c.cost<=s.budget).sort((a,b)=>((b.c.trust||0)+(b.c.intel||0)/5-(b.c.cost||0)/8)-((a.c.trust||0)+(a.c.intel||0)/5-(a.c.cost||0)/8));
   E.choose(s,choices[0].i);
  }
  for(const f of s.factions)if(!f.leaderCaptured)E.action(s,"capture",14,f.id);
  if(bought<priorities.length&&E.action(s,"upgrade",14,priorities[bought]).ok)bought++;
  if(s.teams.length<5&&s.week>12&&s.budget>28)E.action(s,"recruit");
  for(const t of s.teams){
   if(t.eta)continue;
   const r=s.regions[t.regionId],f=s.factions[r.faction];
   if(!r.stable&&r.development<45&&!E.pending(s,"services",r.id)&&s.budget>12)E.action(s,"services",r.id);
   if(r.corruption>48&&!E.pending(s,"audit",r.id)&&s.budget>12)E.action(s,"audit",r.id);
   if(!f.dismantled&&r.threat>24&&r.intel<42&&!E.pending(s,"intel",r.id)&&s.budget>10)E.action(s,"intel",r.id);
   if(!f.dismantled&&r.threat>26&&r.intel>=35&&!E.pending(s,"disrupt",r.id)&&s.budget>13)E.action(s,"disrupt",r.id);
   if(r.stable||(r.threat<18&&r.support>53&&r.corruption<49&&r.development>=34)){
    const targets=s.regions.filter(n=>!n.stable&&!s.teams.some(o=>o.id!==t.id&&(o.regionId===n.id||o.destination===n.id))&&!E.pending(s,"disrupt",n.id));
    targets.sort((a,b)=>(b.threat+(s.factions[b.faction].leaderCaptured?0:5))-(a.threat+(s.factions[a.faction].leaderCaptured?0:5)));
    if(targets[0])E.action(s,"move",targets[0].id,t.id);
   }
  }
  for(const f of s.factions)if(f.intel<65&&f.power<=65&&s.budget>10){
   const r=s.regions.filter(r=>r.faction===f.id&&!E.pending(s,"intel",r.id)).sort((a,b)=>a.intel-b.intel)[0];
   if(r)E.action(s,"intel",r.id);
  }
  E.tick(s);
 }
 return {seed:seed,status:s.status,week:s.week};
};
test("Eight seeded standard campaigns can be won",()=>{
 for(const seed of [1,2,3,17,42,123,2026,57314]){
  const r=auto(seed);assert.equal(r.status,"won","Seed "+seed+" failed");
  assert(r.week<=144);console.log("  seed "+seed+": victory at week "+r.week);
 }
});
console.log(count+" checks passed. Browser layout and interaction still require visual QA.");

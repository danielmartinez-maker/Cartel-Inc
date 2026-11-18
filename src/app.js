import {HQ,DISTRICTS,TERRAIN,GOVERNORS,DIFFICULTIES,NETWORKS,UNIT_TYPES,INITIATIVES,CATEGORIES,EVENTS,REGIONS,MAX_UNITS,MAX_PROJECTS,STABILITY_TARGET,MANDATE_DAYS,NEIGHBORHOODS,PROVINCE_PRIORITIES,SAVE_LIMIT,MEMBERS_PER_CARTEL} from './data.js';
import {createGame,act,tick,projectCost,stableDistricts,totalThreat,unitsHere,unitPower,operationForecast,initiativeAvailability,arrestRequirements,serialize,restore,dominantNetwork,leaderOf,capabilities,budgetForecast,supplyScore,recruitmentBase,memberRequirements} from './engine.js';
import {ARCHETYPES,MEMBER_ROLES,TRAITS,INTENTS,STRATEGIES} from './cartels.js';
import {INFRASTRUCTURE,INFRA_BY_REGION,INFRA_TYPES,INFRA_TASKS,assetState,assetOutput,infrastructureAvailability} from './infrastructure.js';
import {NEIGHBORHOOD_TASKS} from './neighborhoods.js';
import {BRANCH_ACTIONS,commandEffectiveness} from './regional-command.js';
import {ProvinceMap} from './map.js';
import {icon,portrait,badge,escapeHTML as esc} from './icons.js';
import {ART,TERRAIN_ART,preloadAssets} from './assets.js';
import {SCENARIOS,scenarioCode,terrainAt} from './scenarios.js';
import {INCOME_TYPES,incomeTargets} from './economy.js';
import {TACTICS,combatForecast} from './combat.js';
import {cartelMenu,economyMenu} from './panels.js';
import {renderScenarioImage,downloadScenarioImage} from './scenario-image.js';
import {CampaignClock,activeOrders,progressOf,atmosphere} from './world.js';

const $=selector=>document.querySelector(selector);
const SAVE_KEY='cartel-containment:v1';
const MOTION_KEY='cartel-containment:map-motion',clock=new CampaignClock();
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
let mapMotion=!reducedMotion.matches,customMotion=false;
try{const saved=localStorage.getItem(MOTION_KEY);if(['on','off'].includes(saved)){mapMotion=saved==='on'&&!reducedMotion.matches;customMotion=true;}}catch{}
let state=createGame(),loadNotice='',storageAvailable=true,hasCampaign=false;
try{const saved=localStorage.getItem(SAVE_KEY);if(saved){state=restore(saved);hasCampaign=true;loadNotice=state.migration?'Campaign expanded to fifty connected provinces. Your earlier progress is preserved. Time is paused.':'Campaign restored. Time is paused.';}}
catch{loadNotice='The saved campaign could not be read. A new campaign is ready.';}
let selected=HQ,pane='district',category='civilian',dispatchUnit=null,focusedUnit=null,layer='control',focusedNetwork=null,targetNetwork=null,selectedNeighborhood=0,focusedAsset='0-power';
let sound=false,audioContext=null,toastTimer=null,lastOutcome=null,newGovernor='cruz',wasRunningBeforeModal=false;
let scene='loading',loadingTarget='menu',loadingSerial=0,loadingDone=false;
const modal=$('#modal'),commandMenu=$('#command-menu');
let dossierTab='overview',contextVisible=false,combatTactic='deliberate',combatUnits=null,targetRacket='extortion',previewScenario=null,previewSerial=0,previewTimer=null;
const menuNames={district:'District command',units:'Security forces',initiatives:'Development',networks:'Cartel intelligence',infrastructure:'Infrastructure',province:'Provincial administration',economy:'National economy',activity:'Intelligence & operations'};
function openCommand(view){pane=view;dispatchUnit=null;state.paused=true;$('#game-menu-title').textContent=menuNames[view];$('#command-menu').dataset.menu=view;if(!commandMenu.open)commandMenu.showModal();$('#panel-content').scrollTop=0;render();}
function closeCommand(){if(commandMenu.open)commandMenu.close();state.paused=true;render();}
commandMenu.addEventListener('cancel',e=>{e.preventDefault();closeCommand();});
commandMenu.addEventListener('click',e=>{if(e.target===commandMenu){const r=commandMenu.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeCommand();}});


function notify(message,error=false){
  const toast=$('#toast');toast.textContent=message;toast.classList.toggle('error',error);toast.classList.add('visible');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('visible'),4200);
}
function chime(error=false){
  if(!sound)return;
  try{
    audioContext??=new (window.AudioContext||window.webkitAudioContext)();
    if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});
    const osc=audioContext.createOscillator(),gain=audioContext.createGain();
    osc.connect(gain);gain.connect(audioContext.destination);osc.type='sine';osc.frequency.value=error?220:540;
    gain.gain.setValueAtTime(0.025,audioContext.currentTime);gain.gain.exponentialRampToValueAtTime(0.001,audioContext.currentTime+0.12);
    osc.start();osc.stop(audioContext.currentTime+0.12);
  }catch{sound=false;}
}
function save(silent=true){
  if(!hasCampaign)return;
  try{localStorage.setItem(SAVE_KEY,serialize(state));storageAvailable=true;$('#save-status').textContent='CAMPAIGN SAVED';if(!silent)notify('Campaign saved on this device.');}
  catch{storageAvailable=false;$('#save-status').textContent='AUTOSAVE UNAVAILABLE';if(!silent)notify('Browser storage is unavailable. Use Export save to keep this campaign.',true);}
}
function command(action,{quiet=false}={}){
  const result=act(state,action);
  if(!quiet)notify(result.message,!result.ok);
  chime(!result.ok);if(result.ok)save();render();return result;
}
function selectDistrict(id,network=null){
  if(selected!==id)combatUnits=null;contextVisible=true;selected=id;selectedNeighborhood=0;targetNetwork=network??dominantNetwork(state.districts[id]);
  if(map.activeRegion!==DISTRICTS[id].region)map.focusRegion(DISTRICTS[id].region);
  if(dispatchUnit!==null){
    const result=command({type:'move',unit:dispatchUnit,district:id});
    if(result.ok){dispatchUnit=null;pane='units';}
  }else{pane='district';chime();}
  render();
}
const map=new ProvinceMap($('#map-container'),selectDistrict,id=>{
  focusedUnit=id;openCommand('units');
  setTimeout(()=>document.querySelector(`[data-roster="${id}"]`)?.scrollIntoView({block:'nearest',behavior:'smooth'}),0);
},(plan,destination)=>{
  const preview=$('#route-preview');preview.hidden=!plan||dispatchUnit===null;
  if(plan){const unit=state.units.find(u=>u.id===dispatchUnit);preview.innerHTML=`<strong>${esc(unit?.name||'Unit')} → ${DISTRICTS[destination].name}</strong>${plan.ok?`${plan.days} days · ${plan.path.length-1} district crossings`:'Unavailable'}<small>${plan.ok?'Select this district to dispatch.':esc(plan.message)}</small>`;}
});
map.onProvince=id=>{selected=REGIONS[id].hub;selectedNeighborhood=0;contextVisible=true;render();};
map.onInfrastructure=id=>{focusedAsset=id;selected=INFRASTRUCTURE.find(a=>a.id===id).district;openCommand('infrastructure');};
map.onNeighborhood=(id,index)=>{selected=id;selectedNeighborhood=index;contextVisible=true;map.selectedNeighborhood=index;render();};
map.onClear=()=>{contextVisible=false;render();};
map.onView=id=>{
  const r=id===null?null:REGIONS[id];$('#region-focus').value=id===null?'all':String(id);
  $('.map-heading h1').textContent=r?r.name:'Santa Esperanza';
  $('.map-heading .eyebrow').textContent=r?`PROVINCE ${r.id+1} / ${r.subtitle.toUpperCase()}`:'FIFTY PROVINCES / NATIONAL MANDATE';
  $('.map-heading p').textContent=r?'24 districts · 72 neighborhoods · connected by land.':'50 provinces · 1,200 districts · 3,600 neighborhoods.';
};
map.setMotion(mapMotion);
reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches||!customMotion){mapMotion=!reducedMotion.matches;map.setMotion(mapMotion);render();}});
for(const [i,view]of ['economy','activity','economy','province','networks'].entries()){const el=document.querySelectorAll('.metric')[i];el.dataset.action='view';el.dataset.view=view;el.setAttribute('role','button');el.tabIndex=0;}
$('#brand-mark').innerHTML=badge(0);
$('#menu-insignia').innerHTML=badge(0);
$('#campaign-menu-button').innerHTML=icon('home',16);
for(const [id,name]of [['money','coin'],['trust','heart'],['corruption','scales'],['stability','flag'],['network','network']])$(`#${id}-icon`).innerHTML=icon(name);
$('#sound-button').innerHTML=icon('mute',16);$('#help-button').innerHTML=icon('help',17);$('#settings-button').innerHTML=icon('save',16);$('#briefing-icon').innerHTML=icon('book');
const railIcons={district:'map',units:'shield',initiatives:'leaf',networks:'network',infrastructure:'depot',province:'flag'};
document.querySelectorAll('.rail-top button').forEach(b=>b.innerHTML=icon(railIcons[b.dataset.view]));
document.querySelector('.rail-bottom [data-action="reports"]').innerHTML=icon('chart');
document.querySelector('.rail-bottom [data-action="briefing"]').innerHTML=icon('book');
for(const b of document.querySelectorAll('.command-dock button'))b.querySelector('.dock-emblem').innerHTML=icon(({units:'shield',networks:'network',initiatives:'leaf',infrastructure:'depot',economy:'coin',province:'flag',activity:'eye'})[b.dataset.view],30);
for(const [action,name]of [['zoom-in','plus'],['zoom-out','minus'],['zoom-fit','expand']])document.querySelector(`[data-action="${action}"]`).innerHTML=icon(name);

function setScene(next){
  scene=next;document.body.dataset.scene=next;
  for(const [id,value]of [['main-menu','menu'],['loading-screen','loading'],['game-screen','game']]){
    const element=document.getElementById(id);element.hidden=value!==next;element.inert=value!==next;
  }
}
function renderMenu(){
  const gov=GOVERNORS.find(g=>g.id===state.governor);
  $('#main-menu').dataset.hasCampaign=String(hasCampaign);
  $('#continue-button').disabled=!hasCampaign;
  $('#continue-summary').textContent=hasCampaign?`${gov.name} · Day ${state.day+1} · ${DIFFICULTIES[state.difficulty].label}`:'No saved operation';
  const card=$('#menu-save-card');card.hidden=!hasCampaign;
  if(hasCampaign)card.innerHTML=`${portrait(gov.portrait)}<div><strong>${state.outcome?'Campaign report available':'Your mandate continues'}</strong><small>${stableDistricts(state)} / ${DISTRICTS.length} districts stabilized · ${Math.floor(state.trust)}% public trust<br>${state.networks.filter(n=>n.dismantled).length} / ${NETWORKS.length} networks dismantled</small></div>`;
  $('#menu-sound-button').innerHTML=icon(sound?'volume':'mute',15)+`Sound ${sound?'on':'off'}`;
}
function showMenu(){
  if(commandMenu.open)commandMenu.close();
  loadingSerial++;state.paused=true;dispatchUnit=null;wasRunningBeforeModal=false;
  if(modal.open)modal.close();save();renderMenu();setScene('menu');
  (hasCampaign?$('#continue-button'):$('#menu-new-game')).focus({preventScroll:true});
}
function finishLoading(){
  if(!loadingDone)return;
  if(loadingTarget==='menu'){showMenu();return;}
  state.paused=true;render();setScene('game');
  $('#pause-button').focus({preventScroll:true});
  if(loadNotice){notify(loadNotice);loadNotice='';}
  if(state.pendingEvent!==null)eventModal();else if(state.outcome)outcomeModal();
}
async function runLoading(target){
  const serial=++loadingSerial,started=performance.now();
  loadingTarget=target;loadingDone=false;state.paused=true;
  if(modal.open)modal.close();wasRunningBeforeModal=false;
  $('#loading-recovery').hidden=true;$('#loading-back').hidden=target==='menu';
  $('#loading-kicker').textContent=target==='game'?'OPERATION SANTA ESPERANZA':'PREPARING THE PROVINCE';
  $('#loading-title').innerHTML=target==='game'?'Your province.<br>Your mandate.':'A new mandate<br>takes shape.';
  $('#loading-tip').textContent=hasCampaign&&state.day>0?'Containment lasts when local institutions can hold after your units move on.':'Public support turns temporary security into lasting control.';
  setScene('loading');
  const result=await preloadAssets(Object.values(ART),{onProgress:({percent})=>{
    if(serial!==loadingSerial)return;
    $('#asset-progress').value=percent;$('#asset-progress').textContent=`${percent}%`;
    $('#loading-percent').textContent=`${percent}%`;
    $('#loading-stage').textContent=percent<35?'Charting the province':percent<85?'Preparing the mandate':'Opening provincial command';
  }});
  // Keep the transition readable on cached loads; the percentage is always
  // calculated from actual image loads, never from this short visual hold.
  await new Promise(resolve=>setTimeout(resolve,Math.max(0,750-(performance.now()-started))));
  if(serial!==loadingSerial)return;
  loadingDone=true;
  if(result.failed.length){$('#loading-stage').textContent='Campaign ready';$('#loading-recovery').hidden=false;return;}
  finishLoading();
}

const percent=n=>`${Math.floor(n)}%`;
const bar=(label,value,type='')=>`<div class="status-row"><div><span>${label}</span><strong>${percent(value)}</strong></div><div class="status-track ${type}"><i style="width:${Math.max(0,Math.min(100,value))}%"></i></div></div>`;
const progress=(remaining,total)=>`<div class="project-progress"><div class="status-track"><i style="width:${100*(1-remaining/total)}%"></i></div><span>${remaining}d remaining</span></div>`;
const heading=(eyebrow,title,subtitle='')=>`<div class="panel-eyebrow">${eyebrow}</div><h2 class="panel-title">${title}</h2>${subtitle?`<p class="panel-subtitle">${subtitle}</p>`:''}`;
const actionButton=({action,title,detail,iconName='arrow',cost='',extra='',disabled=false,primary=false,danger=false})=>`<button class="action-button ${primary?'primary':''} ${danger?'danger':''}" data-action="${action}" ${extra} ${disabled?'disabled':''}>${icon(iconName)}<span><strong>${title}</strong>${detail?`<small>${detail}</small>`:''}</span>${cost?`<span class="cost">${cost}</span>`:icon('chevron',13)}</button>`;
const unitToken=u=>`<span class="unit-token">${icon(UNIT_TYPES[u.type].icon)}</span>`;

function operationReason(type,d,network=null){
  const nid=network??(d.id===selected?targetNetwork:null)??dominantNetwork(d);
  if(state.outcome)return 'The campaign has ended.';
  if(state.operations.some(o=>o.district===d.id))return 'An operation is already in progress here.';
  if(state.networks[nid].dismantled)return 'This faction has been dismantled. Choose another target.';
  if(type==='raid'&&combatTactic==='precision'&&d.intel<60)return 'Requires 60% local intelligence.';
  if(type==='raid'&&combatUnits?.length===0)return 'Select at least one security unit.';
  if(type==='raid'&&d.cells[nid]<1)return 'No active cell is present.';
  if(type!=='investigate'&&d.intel<(type==='raid'?40:30))return `Requires ${type==='raid'?40:30}% local intelligence.`;
  if(type!=='investigate'&&!unitsHere(state,d.id).some(u=>u.type!=='intel'))return 'Requires a ready security unit in this district.';
  const cost=projectCost(state,type==='investigate'?6:type==='raid'?TACTICS[combatTactic].cost:7);
  if(state.money<cost)return `Requires $${cost} in the treasury.`;
  return '';
}
function districtPanel(){
  const d=state.districts[selected],def=DISTRICTS[selected],nid=targetNetwork??dominantNetwork(d);
  const stable=d.stability>=75&&d.support>=60&&d.threat<8;
  const status=stable?'STABILIZED':d.threat>=25?'CARTEL PRESENCE':'UNSECURED';
  const here=state.units.filter(u=>u.district===selected&&u.status!=='moving'&&u.status!=='training');
  const op=state.operations.find(o=>o.district===selected);
  const investigateReason=operationReason('investigate',d),raidReason=operationReason('raid',d);
  let priority=d.threat>=25?'Contain the local cell before committing to civilian projects.':d.support<60?'Public support is too low for lasting control. Fund local services.':d.stability<75?'Support is growing. Keep threat below 8% and allow stability to build.':'Keep local institutions strong and prevent the networks from returning.';
  if(selected===HQ&&state.day===0)priority='Your headquarters is secure. Investigate a district with cartel presence, then send ALPHA to contain it.';
  return `<div class="district-scene" role="img" aria-label="Illustrated ${esc(TERRAIN[terrainAt(state,selected)].label.toLowerCase())}"><div class="district-scene-art terrain-scene-${TERRAIN_ART[terrainAt(state,selected)]}"></div><span>${TERRAIN[terrainAt(state,selected)].label}</span></div><div class="panel-eyebrow"><span>DISTRICT ${String(selected+1).padStart(2,'0')} / ${DISTRICTS.length}</span><span class="state-tag ${stable?'good':d.threat>=25?'danger':''}">${status}</span></div>
    <h2 class="panel-title">${def.name}</h2><div class="district-meta"><span>${icon('pin')}${REGIONS[def.region].name}</span><span>${icon('people')}${def.population},000 residents</span></div>
    <div class="status-bars">${bar('Public support',d.support)}${bar('Intelligence coverage',d.intel,'intel')}${bar('Cartel threat',d.threat,'threat')}</div><details class="civilian-details"><summary>Community conditions</summary>${bar('Prosperity',d.prosperity)}${bar('Fear',d.fear,'threat')}${bar('Displacement',d.displacement,'threat')}${bar('Institutions',d.institutions)}<p>Supply access: ${Math.round(supplyScore(state,selected))}%. Fear and displacement weaken support. Prosperity and institutions constrain recruitment.</p></details><label class="target-label">TARGET FACTION<select id="district-network" aria-label="Target faction">${NETWORKS.filter(n=>d.cells[n.id]>.25||n.id===nid).map(n=>`<option value="${n.id}" ${n.id===nid?'selected':''}>${n.name} · ${Math.round(d.cells[n.id])} threat</option>`).join('')}</select></label>
    ${tacticalPanel(d,nid,op)}<details class="neighborhood-disclosure"><summary>Neighborhood programs</summary>${neighborhoodPanel(d)}</details><div class="section-label">DISTRICT OPERATIONS <span>Orders take time</span></div>
    ${op&&op.type!=='raid'?`<div class="notice"><strong>${{investigate:'Investigation underway',raid:'Security operation underway',arrest:'Arrest operation underway',interdict:'Asset disruption underway',capture:'Member arrest underway',flip:'Witness negotiation underway',resupply:'Resupply underway'}[op.type]}</strong>${progress(op.remaining,op.total)}${op.type==='raid'?`<div class="confrontation-readout"><span><i class="encounter-key security-key"></i>${esc(state.units.find(u=>u.id===op.unit)?.name||'Security')}</span><span>engaging</span><span><i class="encounter-key cartel-key" style="background:${NETWORKS[op?.network??nid].color}"></i>${NETWORKS[op?.network??nid].name}</span></div>`:''}</div>`:''}
    ${actionButton({action:'investigate',title:'Gather intelligence',detail:'4 days · build intelligence & case evidence',iconName:'eye',cost:`$${projectCost(state,6)}`,disabled:!!investigateReason,primary:true})}
    ${investigateReason?`<p class="reason">${investigateReason}</p>`:''}
    ${actionButton({action:'raid',title:'Contain cartel cell',detail:raidReason||`${TACTICS[combatTactic].days} days · ${Math.round(combatForecast(state,selected,nid,combatTactic,combatUnits)?.chance*100)}% forecast`,iconName:'target',cost:`$${projectCost(state,TACTICS[combatTactic].cost)}`,disabled:!!raidReason})}
    ${actionButton({action:'view',title:'Deploy security forces',detail:'Select a unit, then its destination on the map',iconName:'shield',extra:'data-view="units"'})}
    <div class="section-label">DEPLOYED HERE <span>${here.length} ${here.length===1?'unit':'units'}</span></div>
    ${here.length?here.map(u=>`<button class="unit-inline" data-action="focus-unit" data-unit="${u.id}">${unitToken(u)}<span><strong>${esc(u.name)}</strong><small>${UNIT_TYPES[u.type].name} · ${u.status==='operating'?'Operation in progress':'Ready for orders'}</small></span>${icon('chevron',12)}</button>`).join(''):'<p class="empty-text">No unit stationed in this district.</p>'}
    <div class="notice"><strong>${icon('leaf',12)} FIELD PRIORITY</strong>${priority}</div>
    ${actionButton({action:'category',title:'Fund a local initiative',detail:`${d.services} services delivered · ${Math.floor(d.stability)}% stability`,iconName:'people',extra:'data-category="civilian"'})}
    <button class="network-mini" data-action="view-network" data-network="${nid}">${portrait(NETWORKS[nid].portrait)}<span><strong>${NETWORKS[op?.network??nid].name}</strong><small>${state.networks[nid].dismantled?'Network dismantled':state.networks[nid].captured?'Leader in custody':'Regional network'} · ${percent(state.networks[nid].evidence)} case evidence</small></span>${icon('chevron')}</button>`;
}
function renderContext(){
 const el=$('#district-context');el.hidden=!contextVisible;if(!contextVisible)return;
 const d=state.districts[selected],def=DISTRICTS[selected],op=state.operations.find(o=>o.district===selected),n=NEIGHBORHOODS[selected][selectedNeighborhood];
 el.innerHTML=`<button class="context-dismiss" data-action="dismiss-context" aria-label="Close district inspection">×</button><small>${REGIONS[def.region].name.toUpperCase()} / ${map.zoom>=17?n.name.toUpperCase():'DISTRICT'}</small><h2>${map.zoom>=17?n.name:def.localName}</h2><div class="context-stats"><span>${Math.round(d.support)}<em>SUPPORT</em></span><span>${Math.round(d.intel)}<em>INTEL</em></span><span>${Math.round(d.threat)}<em>THREAT</em></span>${op?.battle?`<span>${Math.round(op.battle.control)}<em>CONTROL</em></span>`:''}</div>${op?`<p>${op.battle?TACTICS[op.battle.tactic].name:op.type} · ${op.remaining} days remaining</p>`:''}<div class="context-actions"><button data-action="inspect-district">${op?.battle?'Tactical command':'Inspect & issue orders'}</button><button data-action="neighborhood-map">Neighborhoods</button></div>`;
}
function tacticalPanel(d,nid,op){
 if(op?.battle){const b=op.battle,ready=state.units.filter(u=>u.district===d.id&&u.type!=='intel'&&u.status==='ready');return `<section class="tactical-card"><div class="tactical-heading"><small>LIVE TACTICAL COMMAND</small><strong>${NETWORKS[nid].name}</strong></div><div class="tactical-score">${bar('Area control',b.control)}${bar('Friendly suppression',b.friendlySuppression,'threat')}${bar('Enemy suppression',b.enemySuppression)}${bar('Escape risk',b.escapeRisk,'threat')}</div><p>${b.units.map(id=>esc(state.units.find(u=>u.id===id).name)).join(' + ')} · ${op.remaining} days remaining · ${Math.round(b.forecast*100)}% current forecast</p><label class="target-label">TACTICAL ORDER<select id="active-tactic">${Object.entries(TACTICS).map(([id,t])=>`<option value="${id}" ${id===b.tactic?'selected':''}>${t.name}</option>`).join('')}</select></label><p class="reason">Changing tactics adds one reorganization day. One command per day.</p>${ready.map(u=>`<button class="game-button" data-action="reinforce" data-unit="${u.id}" ${b.units.length>=3||b.lastOrderDay===state.day||state.money<projectCost(state,3)?'disabled':''}>Reinforce with ${u.name} · $${projectCost(state,3)}</button>`).join('')}<button class="game-button retreat-button" data-action="withdraw">Order withdrawal</button><div class="battle-log">${b.entries.map(e=>`<p><small>DAY ${e.day+1}</small>${esc(e.text)}</p>`).join('')}</div></section>`;}
 const f=combatForecast(state,d.id,nid,combatTactic,combatUnits),ready=state.units.filter(u=>u.district===d.id&&u.type!=='intel'&&u.status==='ready');
 const targets=incomeTargets(state,nid,targetRacket),financialReason=d.intel<50?'Requires 50% intelligence':!ready.length?'Requires a ready security unit here':!targets.some(t=>t.district===d.id)?'This source has no activity here':op?'Another operation is active':state.money<projectCost(state,9)?'Insufficient treasury':'';
 return `<section class="tactical-card"><small>OPERATION PLANNING</small><h3>Choose an approach</h3><label class="target-label">TACTIC<select id="combat-tactic">${Object.entries(TACTICS).map(([id,t])=>`<option value="${id}" ${id===combatTactic?'selected':''}>${t.name} · ${t.days}d · $${projectCost(state,t.cost)}</option>`).join('')}</select></label><p>${TACTICS[combatTactic].description}</p>${ready.length?`<div class="commit-units">${ready.map(u=>`<label><input type="checkbox" data-combat-unit="${u.id}" ${f.units.includes(u.id)?'checked':''}>${u.name}<small>${Math.round(u.supply)}% supply · ${Math.round(unitPower(state,u))} power</small></label>`).join('')}</div>`:'<p class="reason">Deploy a security unit here to carry out containment.</p>'}<div class="combat-factors">${f.factors.map(v=>`<span>${v.label}<b>${v.value}</b></span>`).join('')}<span>Escape risk<b>${Math.round(f.escapeRisk)}%</b></span><span>Civilian risk<b>${Math.round(f.civilianRisk)}%</b></span></div><p class="reason">Terrain and fortifications protect defenders. Nearby security units cover exits; supply and readiness determine force power.</p></section><details class="financial-operations"><summary>Target a cartel income source</summary><label class="target-label">SOURCE<select id="income-target">${Object.entries(INCOME_TYPES).map(([id,t])=>`<option value="${id}" ${id===targetRacket?'selected':''}>${t.name}</option>`).join('')}</select></label><p>${INCOME_TYPES[targetRacket].description}</p><button class="game-button" data-action="disrupt-income" ${financialReason?'disabled':''}>Financial disruption · 5d · $${projectCost(state,9)}</button><p class="reason">${financialReason||'Suppress this income source for 28 days, seize illicit cash and build case evidence.'}</p></details>`;
}
function schedulePreview(){clearTimeout(previewTimer);previewSerial++;const button=$('#export-scenario');if(button)button.disabled=true;previewTimer=setTimeout(()=>void updatePreview(),180);}
async function updatePreview(){
 const input=$('#new-seed'),target=$('#scenario-preview');if(!input||!target)return;const seed=Number(input.value),serial=++previewSerial;
 if(input.value===''||!Number.isInteger(seed)||seed<0||seed>4294967295){$('#scenario-description').textContent='Enter a whole seed between 0 and 4294967295.';return;}
 try{const candidate=createGame({seed,governor:newGovernor,difficulty:$('#new-difficulty').value,scenario:$('#new-scenario').value}),offscreen=document.createElement('canvas');const manifest=await renderScenarioImage(candidate,offscreen);if(serial!==previewSerial||!$('#scenario-preview'))return;target.width=offscreen.width;target.height=offscreen.height;target.getContext('2d').drawImage(offscreen,0,0);target.dataset.signature=manifest.signature;previewScenario=candidate;$('#replay-code').textContent=scenarioCode(candidate);$('#scenario-description').textContent=SCENARIOS[candidate.scenario?.type]?.description??'The fixed classic opening, with seeded character traits.';$('#export-scenario').disabled=false;}catch(error){if(serial===previewSerial)$('#scenario-description').textContent=error.message;}
}
function loadReplayCode(){
 const code=$('#replay-input').value.trim(),parts=code.split('-');let seed,type,governor,difficulty;
 if(parts[0]==='CC1'&&parts.length===5){[,seed,type,governor,difficulty]=parts;}else if(parts[0]==='CLASSIC'&&parts.length===4){[,seed,governor,difficulty]=parts;type='classic';}else{notify('Use a valid CC1 or CLASSIC replay code.',true);return;}
 if(!/^\d+$/.test(seed)||Number(seed)>4294967295||!GOVERNORS.some(g=>g.id===governor)||!Object.hasOwn(DIFFICULTIES,difficulty)||type!=='classic'&&!Object.hasOwn(SCENARIOS,type)){notify('This replay code is invalid or unsupported.',true);return;}
 $('#new-seed').value=seed;$('#new-scenario').value=type;$('#new-difficulty').value=difficulty;newGovernor=governor;document.querySelectorAll('.governor-option').forEach(b=>b.classList.toggle('active',b.dataset.id===newGovernor));schedulePreview();
}
function scenarioBrief(){
 previewScenario=createGame({seed:state.seed,governor:state.governor,difficulty:state.difficulty,scenario:state.scenario?.type??'classic'});openModal('Campaign atlas','SEED BRIEFING',`<canvas id="active-scenario-image" class="scenario-atlas" aria-label="Rendered opening campaign atlas"></canvas><p>${scenarioCode(previewScenario)}</p><button class="game-button" data-action="export-scenario">Export briefing PNG</button>`);void renderScenarioImage(previewScenario,$('#active-scenario-image')).catch(error=>notify(error.message,true));
}

function neighborhoodPanel(d){
 const n=d.neighborhoods[selectedNeighborhood],def=NEIGHBORHOODS[d.id][selectedNeighborhood],working=state.works.find(w=>w.kind==='neighborhood'&&w.target===d.id*3+selectedNeighborhood);
 return `<div class="section-label">NEIGHBORHOODS <span>District / neighborhood command</span></div><div class="neighborhood-tabs">${NEIGHBORHOODS[d.id].map(b=>`<button data-action="neighborhood-focus" data-neighborhood="${b.index}" class="${b.index===selectedNeighborhood?'active':''}">${b.name}</button>`).join('')}</div>
 <article class="neighborhood-card"><h3>${def.name}</h3><small>${def.type.toUpperCase()} · ${Math.round(DISTRICTS[d.id].population/3)},000 residents</small>${bar('Neighborhood support',n.support)}${bar('Service access',n.access,'intel')}${bar('Employment',n.employment)}${bar('Grievance',n.grievance,'threat')}<p>Local security ${Math.round(n.security)}%. Largest faction influence ${Math.round(Math.max(...n.influence))}%.</p>
 <button class="small-button secondary" data-action="neighborhood-map">Inspect neighborhood map</button>${working?progress(working.remaining,working.total):`<div class="civic-actions">${Object.entries(NEIGHBORHOOD_TASKS).map(([id,t])=>`<button class="small-button" data-action="neighborhood-work" data-task="${id}" ${state.money<projectCost(state,t.cost)||state.outcome?'disabled':''}>${t.name} · ${t.days}d · $${projectCost(state,t.cost)}</button>`).join('')}</div>`}</article>`;
}
function provincePanel(){
 const id=DISTRICTS[selected].region,r=REGIONS[id],status=state.regions[id],ds=state.districts.slice(id*24,id*24+24),services=status.services;
 return heading(`PROVINCE ${id+1} / 50`,r.name,'Twenty-four districts and seventy-two neighborhoods linked to the national economy and infrastructure network.')+
 `<div class="province-overview"><span><b>${ds.filter(d=>d.stability>=75&&d.support>=60&&d.threat<8).length}/24</b> stable districts</span><span><b>${Math.round(ds.reduce((v,d)=>v+d.threat,0)/24)}%</b> mean threat</span><span><b>${Math.round(services.average)}%</b> service continuity</span></div>
 <label class="target-label">PROVINCIAL PRIORITY<select id="province-priority" aria-label="Provincial priority">${Object.entries(PROVINCE_PRIORITIES).map(([key,p])=>`<option value="${key}" ${status.priority===key?'selected':''}>${p.name} · $${p.cost}/week</option>`).join('')}</select></label><p class="reason">Services reduces neighborhood grievance. Economy sustains jobs and repairs. Security builds local watch capacity. Integrity pushes back infiltration.</p>
 <div class="section-label">CONNECTED PUBLIC SERVICES</div>${['power','water','health','comms','logistics','commerce'].map(key=>bar(key.toUpperCase(),services[key],key==='comms'?'intel':'')).join('')}<p class="reason">Water, health and communications depend on power. Depots, rail and airfields sustain logistics.</p>
 ${actionButton({action:'infrastructure-view',title:'Inspect major infrastructure',detail:`${INFRA_BY_REGION[id].length} sites and land corridors`,iconName:'depot'})}
 <div class="section-label">DISTRICT DIRECTORY <span>24 districts</span></div><div class="district-directory">${ds.map(d=>`<button data-action="select" data-district="${d.id}"><span>${DISTRICTS[d.id].localName}<small>${Math.round(d.support)}% support · ${Math.round(d.intel)}% intel</small></span><b class="${d.threat>25?'threat-text':''}">${Math.round(d.threat)}%</b></button>`).join('')}</div>`;
}
function infrastructurePanel(){
 const region=DISTRICTS[selected].region,sites=INFRA_BY_REGION[region];if(!sites.some(a=>a.id===focusedAsset))focusedAsset=sites[0].id;
 const def=INFRASTRUCTURE.find(a=>a.id===focusedAsset),a=assetState(state,def.id),work=state.works.find(w=>w.kind==='infrastructure'&&w.target===def.id),services=state.regions[region].services;
 return heading('NATIONAL WORKS & UTILITIES','Critical infrastructure',`${REGIONS[region].name}. Inspect a facility on the map or choose one below.`)+
 `<label class="target-label">FACILITY<select id="infrastructure-focus" aria-label="Infrastructure facility">${sites.map(site=>`<option value="${site.id}" ${site.id===def.id?'selected':''}>${INFRA_TYPES[site.type].name} · ${Math.round(assetState(state,site.id).condition)}% condition</option>`).join('')}</select></label>
 <article class="infrastructure-card"><div class="infrastructure-title">${icon(INFRA_TYPES[def.type].icon,35)}<div><h3>${INFRA_TYPES[def.type].name}</h3><small>${DISTRICTS[def.district].localName}</small></div><span class="state-tag ${a.condition<30?'danger':''}">LEVEL ${a.level}</span></div><p>${INFRA_TYPES[def.type].description}</p>${bar('Condition',a.condition)}${bar('Security',a.security)}${bar('Cartel infiltration',a.infiltration,'threat')}${bar('Capacity utilization',a.load,'intel')}${bar('Effective output',assetOutput(a),'intel')}<div class="notice"><strong>${a.downtime>0?'Service interruption':a.condition<25?'Critical repairs needed':'Operational'}</strong>${a.controller===null?'No controlling cartel identified.':`${NETWORKS[a.controller].name} has influence inside this facility.`}${a.downtime>0?` ${a.downtime} days of disruption remain.`:''}</div>
 ${work?progress(work.remaining,work.total):Object.entries(INFRA_TASKS).map(([id,t])=>{const reason=infrastructureAvailability(state,def.id,id);return actionButton({action:'infrastructure-work',title:t.name,detail:reason||`${t.days} days · ${id==='repair'?'+50 condition':id==='upgrade'?'higher capacity and less congestion':id==='secure'?'+40 security, reduced infiltration':'expose fronts, cut funding and build evidence'}`,iconName:INFRA_TYPES[def.type].icon,cost:`$${projectCost(state,t.cost)}`,extra:`data-task="${id}" data-asset="${def.id}"`,disabled:!!reason||state.money<projectCost(state,t.cost)});}).join('')}</article>
 <div class="section-label">DEPENDENCY NETWORK</div><div class="dependency-row">${icon('power')} Power → Water → Health</div><div class="dependency-row">${icon('train')} Rail + Depots + Airfields → Supply</div><p class="reason">Power ${Math.round(services.power)}% · Water ${Math.round(services.water)}% · Health ${Math.round(services.health)}% · Logistics ${Math.round(services.logistics)}%. Damaged bridges can close routes. Infiltrated freight facilities finance cartel fronts.</p>
 <div class="section-label">PROVINCIAL ASSETS</div>${sites.map(site=>{const st=assetState(state,site.id);return `<button class="asset-list-row" data-action="asset-focus" data-asset="${site.id}">${icon(INFRA_TYPES[site.type].icon)}<span>${INFRA_TYPES[site.type].name}<small>${st.infiltration>45?'Infiltration warning':st.condition<35?'Repair priority':'Operational'} · level ${st.level}</small></span><b>${Math.round(st.condition)}%</b></button>`;}).join('')}`;
}
function initiativesPanel(){
  const d=state.districts[selected],cat=CATEGORIES.find(c=>c.id===category);
  const cards=INITIATIVES.filter(i=>i.category===category).map(item=>{
    const finished=(item.scope==='local'?d.completed:item.scope==='region'?state.regions[DISTRICTS[selected].region].completed:state.completed).includes(item.id);
    const project=state.projects.find(p=>p.id===item.id&&(item.scope==='province'||(item.scope==='region'?p.region===DISTRICTS[selected].region:p.district===selected)));
    const avail=initiativeAvailability(state,item.id,selected);
    const duration=Math.ceil(item.days*(state.governor==='cruz'&&item.category==='civilian'?0.75:1));
    return `<article class="initiative-card"><div class="initiative-card-head">${badge(item.icon)}<div><h3>${item.name}</h3><small>${item.scope==='local'?'LOCAL INITIATIVE':item.scope==='region'?'PROVINCIAL PROGRAM':'MANDATE POLICY'} · ${duration} DAYS</small></div></div><p>${item.description}</p>
      ${project?progress(project.remaining,project.total):`<div class="initiative-card-footer"><span>${finished?'DELIVERED':`$${projectCost(state,item.cost)} funding`}</span><button class="small-button ${finished?'secondary':''}" data-action="project" data-id="${item.id}" ${!avail.ok?'disabled':''}>${finished?`${icon('check',12)} Complete`:'Fund initiative'}</button></div>`}
      ${!finished&&!project&&!avail.ok?`<div class="reason" style="margin-top:8px;margin-bottom:0">${avail.message}</div>`:''}</article>`;
  }).join('');
  const active=state.projects.filter(p=>initiativeById(p.id).scope==='province'||p.district===selected);
  return heading('INITIATIVE DESK',cat.label,`Local projects apply to ${DISTRICTS[selected].name}. Provincial programs cover ${REGIONS[DISTRICTS[selected].region].name}; mandate policies cover all fifty provinces.`)+
    `<div class="category-tabs">${CATEGORIES.map(c=>`<button data-action="category" data-category="${c.id}" class="${c.id===category?'active':''}">${c.name}</button>`).join('')}</div><div class="scope-label">${icon('pin',11)} SELECTED DISTRICT: ${DISTRICTS[selected].name.toUpperCase()}</div>${cards}
    <div class="notice"><strong>${state.projects.length} / ${MAX_PROJECTS} projects in progress</strong>${active.length?'Projects continue while time is running.':'Select districts on the map to choose where local projects are delivered.'} Inflation adds ${state.inflation.toFixed(1)}% to new funding.</div>`;
}
function initiativeById(id){return INITIATIVES.find(i=>i.id===id);}
function unitsPanel(){
  return heading('SECURITY COMMAND','Your forces','Deploy units across connected districts. Use intelligence to prepare, security to contain, and local institutions to hold.')+
    `<div class="notice"><strong>Logistics and readiness</strong>Long deployments and operations consume supply and build fatigue. Regional administration, secure stations and the Logistics policy sustain distant units.</div><div class="section-label">ACTIVE ROSTER <span>${state.units.length} / ${MAX_UNITS} units</span></div>`+
    state.units.map(u=>{
      const ready=u.status==='ready';
      const destination=u.status==='moving'?DISTRICTS[u.path.at(-1)].name:DISTRICTS[u.district].name;
      const reason=operationReason('interdict',state.districts[u.district],dominantNetwork(state.districts[u.district]));
      return `<article class="roster-card" data-roster="${u.id}" ${focusedUnit===u.id?'style="border-color:#71945b"':''}><div class="roster-head">${unitToken(u)}<div><h3>${esc(u.name)}</h3><small>${UNIT_TYPES[u.type].name}</small></div><span class="state-tag ${ready?'good':''}">${u.blocked?'ROUTE BLOCKED':{ready:'READY',moving:'EN ROUTE',training:'TRAINING',operating:'ASSIGNED'}[u.status]}</span></div>
        <p>${u.status==='moving'?'Moving to ':u.status==='training'?'Training at ':'Stationed in '}<button class="network-home" data-action="select" data-district="${u.status==='moving'?u.path.at(-1):u.district}">${destination}</button></p>
        ${u.blocked?'<p class="reason">Holding at a closed crossing. Repair the bridge or reopen a land corridor.</p>':''}${!ready&&u.remaining>0?progress(u.remaining,u.total):''}${ready&&u.type!=='intel'?`<label class="target-label">NEIGHBORHOOD PATROL<select data-patrol-unit="${u.id}" aria-label="${u.name} neighborhood patrol"><option value="none">District coverage</option>${NEIGHBORHOODS[u.district].map(n=>`<option value="${n.index}" ${u.patrol===n.index?'selected':''}>${n.name}</option>`).join('')}</select></label>`:''}<div class="logistics-grid"><span>Supply <b>${Math.round(u.supply)}%</b></span><span>Readiness <b>${Math.round(u.readiness)}%</b></span><span>Fatigue <b>${Math.round(u.fatigue)}%</b></span></div>${ready?`<button class="small-button secondary resupply-button" data-action="resupply" data-unit="${u.id}" ${state.operations.some(o=>o.district===u.district)||state.money<projectCost(state,8)?'disabled':''}>Resupply · 3d · $${projectCost(state,8)}</button>`:''}<div class="roster-controls"><span>${u.type==='intel'?'+1.1 LOCAL INTEL / DAY':`${Math.floor(unitPower(state,u))} OPERATIONAL POWER`}</span><button class="small-button" data-action="dispatch" data-unit="${u.id}" ${!ready||state.outcome?'disabled':''}>${dispatchUnit===u.id?'Choose district…':'Deploy'} ${icon('arrow',12)}</button></div>
        ${u.type!=='intel'&&ready?`<button class="action-button" data-action="interdict" data-district="${u.district}" data-network="${dominantNetwork(state.districts[u.district])}" ${reason?'disabled':''}>${icon('network',14)}<span><strong>Disrupt network assets</strong><small>${reason||'5 days · reduce funding & build evidence'}</small></span><span class="cost">$${projectCost(state,7)}</span></button>`:''}
      </article>`;
    }).join('')+`<div class="section-label">RECRUITMENT <span>Selected regional base or HQ</span></div>`+
    Object.entries(UNIT_TYPES).map(([type,def])=>`<div class="recruit-row"><span><strong>${def.name}</strong><small>${def.days} days · ${def.description}</small></span><button class="small-button secondary" data-action="recruit" data-unit-type="${type}" ${state.money<projectCost(state,def.cost)||state.units.length>=MAX_UNITS||state.outcome?'disabled':''}>+ $${projectCost(state,def.cost)}</button></div>`).join('')+
    `<div class="notice"><strong>Containment needs a permanent presence.</strong>Security units suppress local cells each day. Intelligence teams reveal activity. Police stations keep working after a unit moves on.</div>`;
}
function networksPanel(){return cartelMenu(state,focusedNetwork,dossierTab);}

function activityPanel(){
  const urgent=INFRASTRUCTURE.filter(a=>{const st=assetState(state,a.id);return st.condition<40||st.downtime>0||st.infiltration>45;}).sort((a,b)=>assetOutput(assetState(state,a.id))-assetOutput(assetState(state,b.id)));
  const orders=activeOrders(state),hotspots=state.districts.filter(d=>d.threat>=20).sort((a,b)=>b.threat-a.threat),stable=stableDistricts(state);
  return heading('PROVINCIAL WATCH','A living province','Follow active orders, protect vulnerable communities, and hold the ground you reclaim.')+
    `<div class="activity-summary"><div><strong>${orders.length}</strong><small>Active orders</small></div><div><strong>${hotspots.length}</strong><small>Hotspots</small></div><div><strong>${stable}</strong><small>Stabilized</small></div></div>
    <div class="notice"><strong>Mandate progress</strong>${bar(`${stable} / ${STABILITY_TARGET} districts stabilized`,Math.min(100,stable/STABILITY_TARGET*100))}${bar(`${state.networks.filter(n=>n.dismantled).length} / ${NETWORKS.length} networks dismantled`,state.networks.filter(n=>n.dismantled).length/NETWORKS.length*100)}${state.holdDays?`<p>Both objectives secured for ${state.holdDays} / 14 days.</p>`:''}</div>
    <div class="section-label">ACTIVE ORDERS <span>Next to finish first</span></div>
    ${orders.length?orders.map(o=>`<button class="order-card ${o.kind}" data-action="select" data-district="${o.district}"><span class="order-card-head"><strong>${o.label}</strong><em>${o.remaining}d</em></span><small>${DISTRICTS[o.district].name}</small><div class="status-track"><i style="width:${progressOf(o)*100}%"></i></div></button>`).join(''):'<p class="activity-empty">No orders in progress. Select a district to investigate, fund services, or deploy a ready unit.</p>'}
    <div class="section-label">INFRASTRUCTURE WATCH <span>${urgent.length} sites need attention</span></div>${urgent.slice(0,4).map(site=>{const st=assetState(state,site.id);return `<button class="asset-list-row" data-action="asset-focus" data-asset="${site.id}">${icon(INFRA_TYPES[site.type].icon)}<span>${REGIONS[site.region].name}<small>${INFRA_TYPES[site.type].name} · ${st.downtime?'outage':st.condition<40?'repair priority':'infiltration warning'}</small></span><b>${Math.round(assetOutput(st))}%</b></button>`;}).join('')}<div class="section-label">DISTRICTS TO WATCH <span>Highest threat</span></div>
    ${hotspots.length?hotspots.slice(0,5).map(d=>`<button class="watch-card" data-action="select" data-district="${d.id}">${icon('pin',14)}<span><strong>${DISTRICTS[d.id].name}</strong><small>${Math.floor(d.intel)}% intelligence · ${Math.floor(d.support)}% support</small></span><em>${Math.floor(d.threat)}%</em></button>`).join(''):'<p class="activity-empty">No district has an entrenched cell. Keep services and institutions strong.</p>'}
    <div class="activity-deadline"><span>Budget in ${7-state.day%7}d</span><span>${Math.max(0,MANDATE_DAYS-state.day)}d in mandate</span></div>
    <div class="section-label">LATEST FROM THE FIELD</div>${state.log.slice(0,4).map(l=>`<div class="activity-logline"><small>DAY ${String(l.day+1).padStart(3,'0')}</small>${esc(l.text)}</div>`).join('')}`;
}

function renderPanel(){
  if(!commandMenu.open)return;
  const panel=$('#panel-content'),scroll=panel.scrollTop;
  const active=document.activeElement;
  const activeData=panel.contains(active)&&active?.dataset.action?{...active.dataset}:null;
  panel.innerHTML=({district:districtPanel,initiatives:initiativesPanel,units:unitsPanel,networks:networksPanel,activity:activityPanel,province:provincePanel,infrastructure:infrastructurePanel,economy:()=>economyMenu(state)}[pane])();
  panel.scrollTop=scroll;
  if(activeData){
    const replacement=[...panel.querySelectorAll('[data-action]')].find(e=>Object.entries(activeData).every(([k,v])=>e.dataset[k]===v));
    if(replacement&&!replacement.disabled)replacement.focus({preventScroll:true});
  }
}
function render(){
  renderContext();
  const gov=GOVERNORS.find(g=>g.id===state.governor),stable=stableDistricts(state),progressValue=Math.round(stable/DISTRICTS.length*100);
  $('#money-value').textContent=`$${Math.floor(state.money)}`;
  $('#income-value').textContent=`+$${Math.round(budgetForecast(state).net)} / week`;
  $('#trust-value').innerHTML=`${Math.floor(state.trust)}<span>%</span>`;$('#trust-track').style.width=`${state.trust}%`;
  $('#corruption-value').innerHTML=`${Math.floor(state.corruption)}<span>%</span>`;
  $('#corruption-label').textContent=state.corruption<25?'Manageable':state.corruption<50?'Rising concern':'Critical';
  $('#stability-value').innerHTML=`${stable}<span> / ${DISTRICTS.length}</span>`;
  $('#networks-value').innerHTML=`${state.networks.filter(n=>n.dismantled).length}<span> / ${NETWORKS.length}</span>`;
  const atLarge=state.networks.filter(n=>!n.captured).length;
  $('#threat-label').textContent=atLarge?`${atLarge} ${atLarge===1?'leader':'leaders'} at large`:'All leaders in custody';
  $('#commander').innerHTML=`${portrait(gov.portrait)}<div><small>PROVINCIAL GOVERNOR</small><strong>${gov.name}</strong><p>${gov.role} · ${DIFFICULTIES[state.difficulty].label}</p></div><button class="icon-button" data-action="briefing" title="Governor and mission briefing" aria-label="Governor and mission briefing">${icon('info',15)}</button>`;
  document.querySelectorAll('[data-action="view"]').forEach(b=>{
    const active=b.dataset.view===pane;b.classList.toggle('active',active);
    if(b.getAttribute('role')==='tab')b.setAttribute('aria-selected',String(active));
  });
  $('#initiative-categories').innerHTML=CATEGORIES.map(c=>`<button class="category-card ${pane==='initiatives'&&category===c.id?'active':''}" data-action="category" data-category="${c.id}">${badge(c.icon)}<span><strong>${c.label}</strong><small>${c.description}</small></span>${icon('chevron')}</button>`).join('');
  $('#day-display').textContent=`DAY ${String(state.day+1).padStart(3,'0')}`;
  $('#week-display').textContent=`WEEK ${String(Math.floor((state.day%365)/7)+1).padStart(2,'0')} · YEAR ${Math.floor(state.day/365)+1}`;
  $('#simulation-indicator').classList.toggle('running',!state.paused);
  $('#simulation-label').textContent=state.outcome?(state.outcome==='victory'?'Mandate fulfilled':'Mandate ended'):state.pendingEvent?'Decision required':!state.started?'Planning phase':state.paused?'Operation paused':'Operation active';
  $('#simulation-detail').textContent=state.outcome?'Start a new operation to play again.':state.pendingEvent?'Open the provincial decision.':state.paused?'Issue orders, then advance time.':'Projects and operations are progressing.';
  $('#pause-button').innerHTML=icon(state.paused?'play':'pause',13)+`<span>${state.pendingEvent?'Decision':state.paused?(state.started?'Resume':'Begin'):'Pause'}</span>`;
  $('#pause-button').disabled=!!state.outcome;
  document.querySelectorAll('[data-action="speed"]').forEach(b=>{const active=Number(b.dataset.speed)===state.speed;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
  $('#mission-percent').textContent=`${progressValue}%`;$('#mission-track').style.width=`${progressValue}%`;
  const latest=state.log[0];if(latest){$('#latest-report').textContent=latest.text;$('#report-day').textContent=`DAY ${String(latest.day+1).padStart(3,'0')}`;}
  const hint=$('#dispatch-hint');hint.hidden=dispatchUnit===null;
  if(dispatchUnit!==null){const unit=state.units.find(u=>u.id===dispatchUnit);hint.innerHTML=`Choose a destination on the map for <strong>${esc(unit?.name||'your unit')}</strong>.<button data-action="cancel-dispatch">Cancel</button>`;}
  const weather=atmosphere(state.seed,state.day);
  $('#weather-label').textContent=weather.label;$('#light-label').textContent=weather.light;
  $('.province-life-controls').dataset.weather=weather.rain?'rain':'clear';
  const motion=$('#map-motion-button');motion.textContent=mapMotion?'Map life on':'Map life off';motion.setAttribute('aria-pressed',String(mapMotion));motion.title=reducedMotion.matches?'Reduced motion is enabled on your device.':'Toggle ambient movement without changing campaign time.';
  $('#active-order-count').textContent=activeOrders(state).length;
  map.selectedNeighborhood=selectedNeighborhood;map.render(state,selected,layer,{fraction:clock.fraction,dispatchUnit});renderPanel();
}

function openModal(title,kicker,body,{resume=false,locked=false}={}){
  if(commandMenu.open)commandMenu.close();
  wasRunningBeforeModal=resume&&!state.paused;
  state.paused=true;render();
  $('#modal-content').innerHTML=`<div class="modal-header"><div><div class="eyebrow">${kicker}</div><h2 id="modal-title">${title}</h2></div>${locked?'':`<button class="modal-close" data-action="close-modal" aria-label="Close dialog">${icon('close')}</button>`}</div><div class="modal-body">${body}</div>`;
  modal.dataset.locked=locked?'true':'false';if(!modal.open)modal.showModal();
}
function closeModal(){
  modal.close();if(scene==='game'&&wasRunningBeforeModal&&!state.pendingEvent&&!state.outcome)state.paused=false;
  wasRunningBeforeModal=false;save();render();
}
modal.addEventListener('cancel',e=>{e.preventDefault();if(modal.dataset.locked!=='true')closeModal();});
modal.addEventListener('click',e=>{if(e.target===modal&&modal.dataset.locked!=='true'){const r=modal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeModal();}});

function briefing(){
  const gov=GOVERNORS.find(g=>g.id===state.governor),stable=stableDistricts(state);
  openModal('A province worth protecting','OPERATION SANTA ESPERANZA',`<div class="briefing-lead">${portrait(gov.portrait)}<p>Nine criminal organizations contest fifty provinces. Your mandate is to restore lasting civilian control before public confidence or the five-year mandate runs out.</p></div>
    <div class="mission-objective"><strong>1. Stabilize at least 900 of 1,200 districts</strong><p>${stable} / ${STABILITY_TARGET} stabilized. A district needs 60% support, less than 8% threat, and a local service or 30% security. Stability then builds to 75% over time.</p></div>
    <div class="mission-objective"><strong>2. Dismantle all nine networks</strong><p>${state.networks.filter(n=>n.dismantled).length} / ${NETWORKS.length} dismantled. Arrest each leader and reduce their remaining total cell strength below 3 threat points. Hold both objectives for 14 consecutive days to win.</p></div>
    <h3>Your governor: ${gov.name}</h3><p>${gov.description} ${gov.bonus}</p>
    <h3>Your first moves</h3><ol><li>Investigate a known command location from a cartel dossier to raise local intelligence above 40%.</li><li>Deploy ALPHA or BRAVO there. When the unit arrives, start a containment operation.</li><li>Fund water, clinics and employment in quiet districts to build public support.</li><li>Fund Special prosecutors and build 65% case evidence to unlock leader arrests.</li></ol>
    <p>All people, districts and organizations are fictional. This is a strategy simulation with abstract operations and original artwork.</p>
    ${actionButton({action:'close-modal',title:'Return to command',detail:'Time remains paused while you review your plan.',iconName:'arrow',primary:true})}`);
}
function help(){
  openModal('Field manual','COMMAND REFERENCE',`<p>Click a district to inspect its needs and issue orders. Projects and operations only progress while the simulation is running. You can issue orders while paused.</p>
    <h3>Contain, rebuild, hold</h3><ul><li>Security operations require a ready federal or police unit and at least 40% local intelligence. Their forecast depends on intelligence, unit power, local threat and corruption.</li><li>Investigations take four days and improve local intelligence and evidence against the regional network.</li><li>Cartels evaluate recruitment, expansion, fortification, bribery, coercion, retreat, leadership relocation, rival attacks and temporary pacts. Each organization has an archetype, thirteen members, three regional branches, stockpiles, fronts and a changing strategy. Member traits, loyalty, ambition and stress shape its capabilities.</li><li>Arresting a leader disrupts recruitment. A funded and cohesive organization can appoint a successor. Disrupt its assets and capture or turn its staff to prevent recovery.</li><li>Civilian projects are blocked when local threat is 35% or higher. Water, clinics, schools and jobs count as local services.</li><li>A district stabilizes after support reaches 60%, threat stays below 8%, and a service is delivered or security reaches 30%. Stability needs time to reach 75%.</li><li>New spending increases inflation slightly. Anti-corruption policies protect the mandate; weekly funding supports your campaign.</li></ul>
    <h3>Fifty connected provinces</h3><p>Use the province selector to inspect a region, or fit the entire country. Land corridors connect 1,200 districts and 3,600 neighborhoods. Major infrastructure has condition, capacity, security, infiltration and dependency effects. Bridges can close; units reroute at the next junction or hold until access reopens. Power failures interrupt water, health and communications. Provincial water and clinic programs deliver one eligible district per day after opening. Regional administration improves institutions, supply, and unlocks a recruitment hub. Supply, readiness and fatigue change unit power; resupply restores an exhausted unit in three days.</p><h3>Members and succession</h3><p>Investigate a member’s district to raise exposure. Arrest specialist staff to weaken their role, or offer a witness deal. Loyalty determines whether a member is likely to defect. Leader arrests open a succession window; break cohesion and funding before the organization replaces its command.</p><h3>Time and saves</h3><p>Decisions and dialogs pause the simulation. Autosave runs after orders and every five days. Reopening a save always pauses time. Export saves from the campaign menu for backups.</p>
    <h3>The living country</h3><p>Freight convoys respond to rail and depot output; power pulses stop when dependent facilities lose service. Civilian traffic thins out in threatened districts. Infrastructure markers identify public utilities, freight facilities and strategic land crossings. Progress rings show investigations and construction; moving unit tokens follow their routes. Open Activity to find active orders and threatened communities. While deploying, point to a district or focus it with Tab to preview the route and travel time.</p><p>Clouds, birds, rain and changing light are atmosphere only. They never change costs, travel times or operation outcomes. Ambient life can continue while the mandate is paused; units and orders wait for you. Turn Map life off for a still map. Your device’s reduced-motion setting is respected.</p>
    <h3>Confrontations</h3><p>A containment operation shows security and cartel markers exchanging bursts around the district. Short trails, dust and shifting dots represent the ongoing encounter. They do not indicate individual casualties or extra damage. The ending follows the actual operation report: cell contained, cell weakened, or cell evaded. Security dots advance into contact, shift into containment, and separate after the actual outcome. Confrontations freeze while time is paused. Map life off keeps a static encounter marker.</p>
    <h3>Keyboard</h3><div class="keyboard-grid"><kbd>Space</kbd><span>Pause / resume</span><kbd>1 / 2 / 3</kbd><span>Normal / 3× / 6× speed</span><kbd>H</kbd><span>Open this manual</span><kbd>Escape</kbd><span>Close a dialog, cancel deployment, or open the pause menu</span><kbd>Tab / Enter</kbd><span>Navigate controls and select map districts</span></div>`);
}
function reports(){
  openModal('Reports from the field','PROVINCIAL ACTIVITY LOG',state.log.map(l=>`<div class="report-entry ${l.kind}"><span>DAY ${String(l.day+1).padStart(3,'0')}</span><span>${esc(l.text)}</span></div>`).join(''));
}
function settings(){
  openModal('Campaign desk','SAVE & CAMPAIGN OPTIONS',`<p>${storageAvailable?'Your campaign is saved in this browser automatically.':'Browser storage is unavailable. Export a save file to keep your progress.'} Exported files can be imported on another device.</p><div class="settings-grid">
    ${actionButton({action:'save',title:'Save campaign',detail:'Keep progress on this device',iconName:'save'})}
    ${actionButton({action:'export',title:'Export save',detail:'Download a portable JSON save',iconName:'download'})}
    ${actionButton({action:'import',title:'Import save',detail:'Restore a compatible campaign',iconName:'upload'})}
    ${actionButton({action:'new-game',title:'New operation',detail:'Choose a governor and difficulty',iconName:'reset'})}${actionButton({action:'scenario-brief',title:'Campaign atlas',detail:'View and export the seeded opening image',iconName:'map'})}</div><div class="notice"><strong>Current campaign</strong>${GOVERNORS.find(g=>g.id===state.governor).name} · ${DIFFICULTIES[state.difficulty].label} · Seed ${state.seed}<br>Day ${state.day+1} of ${MANDATE_DAYS} · ${state.stats.projects} projects completed · ${state.stats.arrests} leaders arrested</div>`);
}
function newGame(){
  openModal('A new mandate','CAMPAIGN SETUP',`<div class="province-card"><img src="${ART.province}" alt="Illustrated Santa Esperanza campaign map" width="160" height="106"><div><small>CAMPAIGN 01 / COASTAL CORRIDOR</small><h3>Santa Esperanza</h3><p>1,200 districts. Fifty connected provinces. Nine cartel organizations.<br>Restore civilian control before the mandate expires.</p></div></div><p>Choose the governor who will lead your next operation. Each brings a different advantage.</p><div class="governor-options">${GOVERNORS.map(g=>`<button class="governor-option ${g.id===newGovernor?'active':''}" data-action="governor" data-id="${g.id}">${portrait(g.portrait)}<span><strong>${g.name}</strong><small>${g.bonus}</small></span></button>`).join('')}</div>
    <div class="new-game-fields"><label>Difficulty<select id="new-difficulty">${Object.entries(DIFFICULTIES).map(([id,d])=>`<option value="${id}" ${id==='standard'?'selected':''}>${d.label}</option>`).join('')}</select></label><label>Campaign seed<input id="new-seed" inputmode="numeric" type="number" min="0" max="4294967295" value="${Math.floor(Math.random()*1000000)}"></label></div>
    <div class="scenario-setup"><label class="target-label">CAMPAIGN SCENARIO<select id="new-scenario"><option value="auto">Seed director</option>${Object.entries(SCENARIOS).map(([id,t])=>`<option value="${id}">${t.name}</option>`).join('')}<option value="classic">Classic opening</option></select></label><div class="scenario-buttons"><button class="game-button" data-action="random-seed">Reroll seed</button><button class="game-button" data-action="export-scenario" id="export-scenario" disabled>Export briefing PNG</button></div><canvas id="scenario-preview" aria-label="Image briefing of the selected campaign seed"></canvas><p id="scenario-description">Preparing the seeded opening…</p><code id="replay-code"></code><div class="replay-entry"><input id="replay-input" placeholder="Paste a replay code" aria-label="Replay code"><button class="game-button" data-action="load-replay">Load code</button></div></div>
    ${hasCampaign?'<div class="confirmation">Starting a new operation replaces this device’s autosave. Export your current campaign first if you want to keep it.</div>':''}
    ${actionButton({action:'start-new',title:'Begin new operation',detail:'Start paused with a fresh provincial mandate',iconName:'flag',primary:true})}`);
  schedulePreview();
}
function pauseMenu(){
  openModal('Provincial command','CAMPAIGN PAUSED',`<p>${GOVERNORS.find(g=>g.id===state.governor).name} · Day ${state.day+1} · ${DIFFICULTIES[state.difficulty].label}</p>
    ${actionButton({action:'resume-game',title:state.outcome?'Review the province':'Resume operation',detail:'Return to the map and your current orders',iconName:'play',primary:true})}
    ${actionButton({action:'save',title:'Save campaign',detail:'Keep this mandate on your device',iconName:'save'})}
    ${actionButton({action:'settings',title:'Campaign desk',detail:'Export, import or start another operation',iconName:'book'})}
    ${actionButton({action:'main-menu',title:'Return to main menu',detail:'Save progress and pause the operation',iconName:'home'})}`);
}
function credits(){
  openModal('A province worth protecting','ABOUT CARTEL: CONTAINMENT',`<p>An original province strategy game about public trust, accountable security and dismantling fictional criminal networks.</p><h3>Fifty provinces, 3,600 neighborhoods</h3><p>The illustrated map spans mountain settlements, woodland, farmland, civic centers, border roads and coastal ports. Every district has its own needs.</p><h3>Art direction</h3><p>Angular cut-paper scenery, ochre highlights, cream silhouettes and deep teal ink connect the province, its people and its institutions.</p><p>All characters, organizations and places in the campaign are fictional.</p>${actionButton({action:'close-modal',title:'Return',iconName:'arrow',primary:true})}`);
}
function eventModal(){
  const event=EVENTS.find(e=>e.id===state.pendingEvent);if(!event)return;
  openModal(event.title,event.tag.toUpperCase()+(state.pendingRegion===null?'':` / ${REGIONS[state.pendingRegion].name.toUpperCase()}`),`<div class="event-portrait">${portrait(event.portrait)}<p>${event.text}</p></div>${event.choices.map((c,i)=>actionButton({action:'decision',title:c.label,detail:c.detail,iconName:i===0?'check':'arrow',extra:`data-choice="${i}"`,disabled:state.money<c.cost,primary:i===0})).join('')}<p class="reason">The simulation stays paused until a response is chosen.</p>`,{locked:true});
}
function outcomeModal(){
  const won=state.outcome==='victory';lastOutcome=state.outcome;
  openModal(won?'Civilian control restored':'The mandate has ended','CAMPAIGN REPORT',`<div class="outcome-banner">${icon(won?'flag':'scales')}<h3>${won?'Santa Esperanza holds.':'A difficult province.'}</h3><p>${won?'All nine networks are dismantled, and civilian institutions have held the majority of districts for fourteen days.':state.trust<=0?'Public trust collapsed before lasting control could be established.':'The five-year mandate expired before both objectives were secured.'}</p></div><div class="outcome-stats"><div><strong>${state.day}</strong><small>Days elapsed</small></div><div><strong>${stableDistricts(state)}</strong><small>Districts stabilized</small></div><div><strong>${state.stats.arrests}</strong><small>Leaders arrested</small></div></div>
    ${actionButton({action:'new-game',title:'Start a new operation',detail:'Try another governor, seed or difficulty',iconName:'reset',primary:true})}${actionButton({action:'close-modal',title:'Review the province',detail:'Inspect the final campaign state',iconName:'map'})}`);
}

document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-action]');if(!button||button.disabled)return;
  const a=button.dataset.action;
  if(a==='close-command')closeCommand();
  else if(a==='inspect-district')openCommand('district');
  else if(a==='dismiss-context'){contextVisible=false;render();}
  else if(a==='cartel-gallery'){focusedNetwork=null;render();}
  else if(a==='dossier-tab'){dossierTab=button.dataset.tab;$('#panel-content').scrollTop=0;render();}
  else if(a==='borrow'||a==='repay')command({type:a});
  else if(a==='province-market'){selected=REGIONS[Number(button.dataset.region)].hub;openCommand('province');}
  else if(a==='financial-target'){targetRacket=button.dataset.racket;if(commandMenu.open)commandMenu.close();selectDistrict(Number(button.dataset.district),Number(button.dataset.network));openCommand('district');}
  else if(a==='disrupt-income')command({type:'interdict',district:selected,network:targetNetwork??dominantNetwork(state.districts[selected]),racket:targetRacket});
  else if(a==='reinforce')command({type:a,district:selected,unit:Number(button.dataset.unit)});
  else if(a==='withdraw')command({type:a,district:selected});
  else if(a==='random-seed'){$('#new-seed').value=String(Math.floor(Math.random()*4294967296));schedulePreview();}
  else if(a==='export-scenario'){try{await downloadScenarioImage(previewScenario??createGame({seed:state.seed,governor:state.governor,difficulty:state.difficulty,scenario:state.scenario?.type??'classic'}));notify('Campaign briefing image exported.');}catch(error){notify(error.message,true);}}
  else if(a==='scenario-brief')scenarioBrief();
  else if(a==='load-replay')loadReplayCode();
  else if(a==='main-menu'){showMenu();}
  else if(a==='continue-game'){if(hasCampaign)void runLoading('game');}
  else if(a==='retry-loading'){if(scene==='loading'&&loadingDone)void runLoading(loadingTarget);}
  else if(a==='finish-loading'){if(scene==='loading')finishLoading();}
  else if(a==='pause-menu')pauseMenu();
  else if(a==='credits')credits();
  else if(a==='map-motion'){
    mapMotion=reducedMotion.matches?false:!mapMotion;customMotion=true;
    try{localStorage.setItem(MOTION_KEY,mapMotion?'on':'off');}catch{}
    map.setMotion(mapMotion);render();
    if(reducedMotion.matches)notify('Map movement stays off while your device uses reduced motion.');
  }
  else if(a==='resume-game'){
    wasRunningBeforeModal=false;closeModal();if(!state.outcome&&!state.pendingEvent&&state.paused)command({type:'pause'},{quiet:true});
  }else if(a==='view'){
    if(button.dataset.view==='networks'){focusedNetwork=null;dossierTab='overview';}openCommand(button.dataset.view);
  }else if(a==='category'){
    category=button.dataset.category;openCommand('initiatives');
  }else if(a==='select'){
    if(commandMenu.open)commandMenu.close();dispatchUnit=null;selectDistrict(Number(button.dataset.district),button.dataset.network===undefined?null:Number(button.dataset.network));
  }else if(a==='investigate'||a==='raid'){const result=command({type:a,district:selected,network:targetNetwork??dominantNetwork(state.districts[selected]),...(a==='raid'?{tactic:combatTactic,...(combatUnits!==null?{units:combatUnits}:{})}:{})});if(result.ok&&a==='raid'){if(commandMenu.open)commandMenu.close();contextVisible=true;map.focusDistrict(selected,selectedNeighborhood);render();}}
  else if(a==='interdict')command({type:a,district:Number(button.dataset.district),network:Number(button.dataset.network)});
  else if(a==='project')command({type:a,id:button.dataset.id,district:selected});
  else if(a==='recruit')command({type:a,unitType:button.dataset.unitType,district:recruitmentBase(state,selected)?selected:recruitmentBase(state,REGIONS[DISTRICTS[selected].region].hub)?REGIONS[DISTRICTS[selected].region].hub:HQ});
  else if(a==='investigate-member'){const m=state.members.find(m=>m.id===button.dataset.member);if(m)command({type:'investigate',district:m.location,network:m.network});}
  else if(a==='neighborhood-focus'){selectedNeighborhood=Number(button.dataset.neighborhood);map.selectedNeighborhood=selectedNeighborhood;render();}
  else if(a==='neighborhood-map'){if(commandMenu.open)commandMenu.close();contextVisible=true;map.focusDistrict(selected,selectedNeighborhood);render();}
  else if(a==='neighborhood-work')command({type:'neighborhood',district:selected,neighborhood:selectedNeighborhood,task:button.dataset.task});
  else if(a==='infrastructure-work')command({type:'infrastructure',asset:button.dataset.asset,task:button.dataset.task});
  else if(a==='asset-focus'){const def=INFRASTRUCTURE.find(a=>a.id===button.dataset.asset);focusedAsset=def.id;selected=def.district;pane='infrastructure';if(map.activeRegion!==DISTRICTS[selected].region)map.focusRegion(DISTRICTS[selected].region);render();}
  else if(a==='infrastructure-view'){openCommand('infrastructure');layer='infrastructure';$('#map-layer').value=layer;map.focusRegion(DISTRICTS[selected].region);$('#panel-content').scrollTop=0;render();}
  else if(a==='province-view'){openCommand('province');map.focusRegion(DISTRICTS[selected].region);$('#panel-content').scrollTop=0;render();}
  else if(a==='resupply')command({type:a,unit:Number(button.dataset.unit)});
  else if(a==='capture-member'||a==='flip-member')command({type:a==='capture-member'?'capture':'flip',member:button.dataset.member});
  else if(a==='arrest')command({type:a,network:Number(button.dataset.network)});
  else if(a==='focus-unit'){focusedUnit=Number(button.dataset.unit);openCommand('units');}
  else if(a==='view-network'){
    focusedNetwork=Number(button.dataset.network);dossierTab='overview';openCommand('networks');
  }else if(a==='dispatch'){
    dispatchUnit=Number(button.dataset.unit);focusedUnit=dispatchUnit;state.paused=true;if(commandMenu.open)commandMenu.close();render();
    if(innerWidth<=760)$('.map-area').scrollIntoView({block:'start',behavior:'smooth'});
  }else if(a==='cancel-dispatch'){dispatchUnit=null;render();}
  else if(a==='pause'){
    if(state.pendingEvent!==null)eventModal();else command({type:'pause'},{quiet:true});
  }else if(a==='speed')command({type:a,speed:Number(button.dataset.speed)},{quiet:true});
  else if(a==='zoom-in')map.setZoom(map.zoom*.3);
  else if(a==='zoom-out')map.setZoom(-map.zoom*.3);
  else if(a==='zoom-fit')map.fit();
  else if(a==='help')help();else if(a==='briefing')briefing();else if(a==='reports')reports();else if(a==='settings')settings();
  else if(a==='sound'){
    sound=!sound;const gameSound=$('#sound-button');gameSound.innerHTML=icon(sound?'volume':'mute',16);gameSound.setAttribute('aria-label',sound?'Mute sound':'Enable sound');gameSound.title=sound?'Mute sound':'Enable sound';$('#menu-sound-button').setAttribute('aria-label',sound?'Mute sound':'Enable sound');renderMenu();chime();
  }else if(a==='close-modal')closeModal();
  else if(a==='save'){save(false);}
  else if(a==='export'){
    const url=URL.createObjectURL(new Blob([serialize(state)],{type:'application/json'}));
    const anchor=document.createElement('a');anchor.href=url;anchor.download=`containment-day-${state.day+1}.json`;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('Campaign exported.');
  }else if(a==='import')$('#import-save').click();
  else if(a==='new-game')newGame();
  else if(a==='governor'){
    newGovernor=button.dataset.id;schedulePreview();document.querySelectorAll('.governor-option').forEach(b=>b.classList.toggle('active',b.dataset.id===newGovernor));
  }else if(a==='start-new'){
    const seedInput=$('#new-seed'),seed=Number(seedInput.value);
    if(!Number.isInteger(seed)||seed<0||seed>4294967295||seedInput.value===''){notify('Enter a whole campaign seed from 0 to 4294967295.',true);return;}
    state=createGame({seed,difficulty:$('#new-difficulty').value,governor:newGovernor,scenario:$('#new-scenario').value});contextVisible=false;combatUnits=null;clock.reset();hasCampaign=true;loadNotice='New operation ready. Issue orders, then begin.';lastOutcome=null;selected=HQ;pane='district';selectedNeighborhood=0;dispatchUnit=null;focusedUnit=null;wasRunningBeforeModal=false;map.fit();modal.close();save();render();void runLoading('game');
  }else if(a==='decision'){
    const result=command({type:'event',choice:Number(button.dataset.choice)});if(result.ok){wasRunningBeforeModal=false;closeModal();}
  }
});
$('#region-focus').innerHTML='<option value="all">All fifty provinces</option>'+REGIONS.map(r=>`<option value="${r.id}">${r.name}</option>`).join('');
map.fit();
$('#region-focus').addEventListener('change',event=>{if(event.target.value==='all')map.fit();else{const id=Number(event.target.value);map.focusRegion(id);selected=REGIONS[id].hub;selectedNeighborhood=0;pane='province';render();}});
document.addEventListener('input',event=>{if(event.target.id==='new-seed')schedulePreview();});
document.addEventListener('change',event=>{
 if(event.target.id==='combat-tactic'){combatTactic=event.target.value;render();}
 if(event.target.id==='active-tactic')command({type:'tactic',district:selected,tactic:event.target.value});
 if(event.target.matches('[data-combat-unit]')){combatUnits=[...document.querySelectorAll('[data-combat-unit]:checked')].map(e=>Number(e.dataset.combatUnit));render();}
 if(event.target.id==='income-target'){targetRacket=event.target.value;render();}
 if(event.target.id==='fiscal-policy')command({type:'fiscal',policy:event.target.value});
 if(['new-scenario','new-difficulty'].includes(event.target.id))schedulePreview();
if(event.target.id==='infrastructure-focus'){focusedAsset=event.target.value;render();}if(event.target.id==='province-priority'){command({type:'province-priority',region:DISTRICTS[selected].region,priority:event.target.value});}if(event.target.dataset.patrolUnit){command({type:'patrol',unit:Number(event.target.dataset.patrolUnit),neighborhood:event.target.value==='none'?null:Number(event.target.value)});}if(event.target.id==='faction-focus'){focusedNetwork=Number(event.target.value);$('#panel-content').scrollTop=0;render();}if(event.target.id==='district-network'){targetNetwork=Number(event.target.value);render();}});
$('#map-layer').addEventListener('change',event=>{
  layer=event.target.value;render();
  $('#map-key').innerHTML=layer==='infrastructure'?'<span><i class="key-dot stable"></i>Operating</span><span><i class="key-dot hostile"></i>Outage / damaged</span><span>LINES: UTILITY DEPENDENCIES</span>':layer==='control'?'<span><i class="key-dot stable"></i>Stabilized</span><span><i class="key-dot unsecured"></i>Unsecured</span><span><i class="key-dot hostile"></i>Cartel presence</span><span><i class="key-unit"></i>Your units</span>':`<span>LIGHT: LOW ${layer==='support'?'SUPPORT':layer==='infrastructure'?'SERVICE CONTINUITY':'INTELLIGENCE'}</span><span>DEEP GREEN: HIGH COVERAGE</span>`;
});
$('#import-save').addEventListener('change',async event=>{
  const file=event.target.files[0];if(!file)return;
  try{
    if(file.size>SAVE_LIMIT)throw new Error('This save file is too large.');
    const imported=restore(await file.text());state=imported;clock.reset();hasCampaign=true;loadNotice='Campaign imported. Time is paused.';lastOutcome=null;selected=HQ;pane='district';dispatchUnit=null;wasRunningBeforeModal=false;map.fit();modal.close();save();render();await runLoading('game');
  }catch(error){notify(error.message==='This save file is too large.'?error.message:'Import failed. Choose a valid Cartel: Containment save file.',true);}
  event.target.value='';
});
document.addEventListener('keydown',event=>{
  if(commandMenu.open){if(event.key==='Escape'){event.preventDefault();closeCommand();}return;}
  if(event.key==='Enter'&&event.target.classList.contains('metric')){event.target.click();return;}
  if(['INPUT','SELECT','TEXTAREA'].includes(event.target.tagName))return;
  if(event.key==='Escape'&&dispatchUnit!==null){dispatchUnit=null;render();return;}
  if(modal.open||event.ctrlKey||event.metaKey||event.altKey)return;
  if(scene!=='game'){if(event.key.toLowerCase()==='h'&&scene==='menu')help();return;}
  if(event.key==='Escape'){event.preventDefault();pauseMenu();return;}
  if(event.code==='Space'&&!['BUTTON','A'].includes(event.target.tagName)&&!event.target.closest('[data-district],[role="button"]')){
    event.preventDefault();if(state.pendingEvent!==null)eventModal();else command({type:'pause'},{quiet:true});
  }else if(['1','2','3'].includes(event.key))command({type:'speed',speed:Number(event.key)},{quiet:true});
  else if(event.key.toLowerCase()==='h')help();
});
document.addEventListener('visibilitychange',()=>{if(document.hidden){state.paused=true;save();render();}});
window.addEventListener('beforeunload',()=>save());
let lastTime=performance.now();
function frame(now){
  const elapsed=now-lastTime;lastTime=now;
  const running=scene==='game'&&!document.hidden&&!state.paused&&!modal.open&&!commandMenu.open&&!state.outcome&&state.pendingEvent===null;
  const days=clock.step(elapsed,{running,speed:state.speed});
  for(let i=0;i<days;i++){
    if(tick(state)){render();if(state.day%5===0||state.pendingEvent||state.outcome)save();}
    if(state.pendingEvent!==null){clock.reset();eventModal();break;}
    if(state.outcome&&state.outcome!==lastOutcome){clock.reset();outcomeModal();break;}
  }
  map.frame(now,{visible:scene==='game'&&!document.hidden&&!modal.open&&!commandMenu.open,fraction:clock.fraction});
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
render();
renderMenu();
void runLoading('menu');

import {HQ,DISTRICTS,TERRAIN,GOVERNORS,DIFFICULTIES,NETWORKS,UNIT_TYPES,INITIATIVES,CATEGORIES,EVENTS} from './data.js';
import {createGame,act,tick,projectCost,stableDistricts,totalThreat,unitsHere,unitPower,operationForecast,initiativeAvailability,arrestRequirements,serialize,restore} from './engine.js';
import {ProvinceMap} from './map.js';
import {icon,portrait,badge,escapeHTML as esc} from './icons.js';
import {ART,TERRAIN_ART,preloadAssets} from './assets.js';

const $=selector=>document.querySelector(selector);
const SAVE_KEY='cartel-containment:v1';
let state=createGame(),loadNotice='',storageAvailable=true,hasCampaign=false;
try{const saved=localStorage.getItem(SAVE_KEY);if(saved){state=restore(saved);hasCampaign=true;loadNotice='Campaign restored. Time is paused.';}}
catch{loadNotice='The saved campaign could not be read. A new campaign is ready.';}
let selected=HQ,pane='district',category='civilian',dispatchUnit=null,focusedUnit=null,layer='control';
let sound=false,audioContext=null,toastTimer=null,lastOutcome=null,newGovernor='cruz',wasRunningBeforeModal=false;
let scene='loading',loadingTarget='menu',loadingSerial=0,loadingDone=false;
const modal=$('#modal');

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
function selectDistrict(id){
  selected=id;
  if(dispatchUnit!==null){
    const result=command({type:'move',unit:dispatchUnit,district:id});
    if(result.ok){dispatchUnit=null;pane='units';}
  }else{pane='district';chime();}
  render();
}
const map=new ProvinceMap($('#map-container'),selectDistrict,id=>{
  focusedUnit=id;pane='units';dispatchUnit=null;render();
  setTimeout(()=>document.querySelector(`[data-roster="${id}"]`)?.scrollIntoView({block:'nearest',behavior:'smooth'}),0);
});
$('#brand-mark').innerHTML=badge(0);
$('#menu-insignia').innerHTML=badge(0);
$('#campaign-menu-button').innerHTML=icon('home',16);
for(const [id,name]of [['money','coin'],['trust','heart'],['corruption','scales'],['stability','flag'],['network','network']])$(`#${id}-icon`).innerHTML=icon(name);
$('#sound-button').innerHTML=icon('mute',16);$('#help-button').innerHTML=icon('help',17);$('#settings-button').innerHTML=icon('save',16);$('#briefing-icon').innerHTML=icon('book');
const railIcons={district:'map',units:'shield',initiatives:'leaf',networks:'network'};
document.querySelectorAll('.rail-top button').forEach(b=>b.innerHTML=icon(railIcons[b.dataset.view]));
document.querySelector('.rail-bottom [data-action="reports"]').innerHTML=icon('chart');
document.querySelector('.rail-bottom [data-action="briefing"]').innerHTML=icon('book');
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
  if(hasCampaign)card.innerHTML=`${portrait(gov.portrait)}<div><strong>${state.outcome?'Campaign report available':'Your mandate continues'}</strong><small>${stableDistricts(state)} / 24 districts stabilized · ${Math.floor(state.trust)}% public trust<br>${state.networks.filter(n=>n.dismantled).length} / 3 networks dismantled</small></div>`;
  $('#menu-sound-button').innerHTML=icon(sound?'volume':'mute',15)+`Sound ${sound?'on':'off'}`;
}
function showMenu(){
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

function operationReason(type,d){
  if(state.outcome)return 'The campaign has ended.';
  if(state.operations.some(o=>o.district===d.id))return 'An operation is already in progress here.';
  if(type==='raid'&&d.threat<1)return 'No active cell is present.';
  if(type!=='investigate'&&d.intel<(type==='raid'?40:30))return `Requires ${type==='raid'?40:30}% local intelligence.`;
  if(type!=='investigate'&&!unitsHere(state,d.id).some(u=>u.type!=='intel'))return 'Requires a ready security unit in this district.';
  const cost=projectCost(state,type==='investigate'?6:7);
  if(state.money<cost)return `Requires $${cost} in the treasury.`;
  return '';
}
function districtPanel(){
  const d=state.districts[selected],def=DISTRICTS[selected];
  const stable=d.stability>=75&&d.support>=60&&d.threat<8;
  const status=stable?'STABILIZED':d.threat>=25?'CARTEL PRESENCE':'UNSECURED';
  const here=state.units.filter(u=>u.district===selected&&u.status!=='moving'&&u.status!=='training');
  const op=state.operations.find(o=>o.district===selected);
  const investigateReason=operationReason('investigate',d),raidReason=operationReason('raid',d);
  let priority=d.threat>=25?'Contain the local cell before committing to civilian projects.':d.support<60?'Public support is too low for lasting control. Fund local services.':d.stability<75?'Support is growing. Keep threat below 8% and allow stability to build.':'Keep local institutions strong and prevent the networks from returning.';
  if(selected===HQ&&state.day===0)priority='Your headquarters is secure. Investigate a district with cartel presence, then send ALPHA to contain it.';
  return `<div class="district-scene" role="img" aria-label="Illustrated ${esc(TERRAIN[def.terrain].label.toLowerCase())}"><div class="district-scene-art terrain-scene-${TERRAIN_ART[def.terrain]}"></div><span>${TERRAIN[def.terrain].label}</span></div><div class="panel-eyebrow"><span>DISTRICT ${String(selected+1).padStart(2,'0')} / 24</span><span class="state-tag ${stable?'good':d.threat>=25?'danger':''}">${status}</span></div>
    <h2 class="panel-title">${def.name}</h2><div class="district-meta"><span>${icon('pin')}${TERRAIN[def.terrain].label}</span><span>${icon('people')}${def.population},000 residents</span></div>
    <div class="status-bars">${bar('Public support',d.support)}${bar('Intelligence coverage',d.intel,'intel')}${bar('Cartel threat',d.threat,'threat')}</div>
    <div class="section-label">DISTRICT OPERATIONS <span>Orders take time</span></div>
    ${op?`<div class="notice"><strong>${{investigate:'Investigation underway',raid:'Security operation underway',arrest:'Arrest operation underway',interdict:'Asset disruption underway'}[op.type]}</strong>${progress(op.remaining,op.total)}</div>`:''}
    ${actionButton({action:'investigate',title:'Gather intelligence',detail:'4 days · build intelligence & case evidence',iconName:'eye',cost:`$${projectCost(state,6)}`,disabled:!!investigateReason,primary:true})}
    ${investigateReason?`<p class="reason">${investigateReason}</p>`:''}
    ${actionButton({action:'raid',title:'Contain cartel cell',detail:raidReason||`4 days · ${Math.round(operationForecast(state,selected)*100)}% success forecast`,iconName:'target',cost:`$${projectCost(state,7)}`,disabled:!!raidReason})}
    ${actionButton({action:'view',title:'Deploy security forces',detail:'Select a unit, then its destination on the map',iconName:'shield',extra:'data-view="units"'})}
    <div class="section-label">DEPLOYED HERE <span>${here.length} ${here.length===1?'unit':'units'}</span></div>
    ${here.length?here.map(u=>`<button class="unit-inline" data-action="focus-unit" data-unit="${u.id}">${unitToken(u)}<span><strong>${esc(u.name)}</strong><small>${UNIT_TYPES[u.type].name} · ${u.status==='operating'?'Operation in progress':'Ready for orders'}</small></span>${icon('chevron',12)}</button>`).join(''):'<p class="empty-text">No unit stationed in this district.</p>'}
    <div class="notice"><strong>${icon('leaf',12)} FIELD PRIORITY</strong>${priority}</div>
    ${actionButton({action:'category',title:'Fund a local initiative',detail:`${d.services} services delivered · ${Math.floor(d.stability)}% stability`,iconName:'people',extra:'data-category="civilian"'})}
    <button class="network-mini" data-action="view-network" data-network="${def.network}">${portrait(NETWORKS[def.network].portrait)}<span><strong>${NETWORKS[def.network].name}</strong><small>${state.networks[def.network].dismantled?'Network dismantled':state.networks[def.network].captured?'Leader in custody':'Regional network'} · ${percent(state.networks[def.network].evidence)} case evidence</small></span>${icon('chevron')}</button>`;
}
function initiativesPanel(){
  const d=state.districts[selected],cat=CATEGORIES.find(c=>c.id===category);
  const cards=INITIATIVES.filter(i=>i.category===category).map(item=>{
    const finished=(item.scope==='local'?d.completed:state.completed).includes(item.id);
    const project=state.projects.find(p=>p.id===item.id&&(item.scope==='province'||p.district===selected));
    const avail=initiativeAvailability(state,item.id,selected);
    const duration=Math.ceil(item.days*(state.governor==='cruz'&&item.category==='civilian'?0.75:1));
    return `<article class="initiative-card"><div class="initiative-card-head">${badge(item.icon)}<div><h3>${item.name}</h3><small>${item.scope==='local'?'LOCAL INITIATIVE':'PROVINCE-WIDE POLICY'} · ${duration} DAYS</small></div></div><p>${item.description}</p>
      ${project?progress(project.remaining,project.total):`<div class="initiative-card-footer"><span>${finished?'DELIVERED':`$${projectCost(state,item.cost)} funding`}</span><button class="small-button ${finished?'secondary':''}" data-action="project" data-id="${item.id}" ${!avail.ok?'disabled':''}>${finished?`${icon('check',12)} Complete`:'Fund initiative'}</button></div>`}
      ${!finished&&!project&&!avail.ok?`<div class="reason" style="margin-top:8px;margin-bottom:0">${avail.message}</div>`:''}</article>`;
  }).join('');
  const active=state.projects.filter(p=>initiativeById(p.id).scope==='province'||p.district===selected);
  return heading('INITIATIVE DESK',cat.label,`Local projects apply to ${DISTRICTS[selected].name}. Province-wide policies benefit every district.`)+
    `<div class="category-tabs">${CATEGORIES.map(c=>`<button data-action="category" data-category="${c.id}" class="${c.id===category?'active':''}">${c.name}</button>`).join('')}</div><div class="scope-label">${icon('pin',11)} SELECTED DISTRICT: ${DISTRICTS[selected].name.toUpperCase()}</div>${cards}
    <div class="notice"><strong>${state.projects.length} / 6 projects in progress</strong>${active.length?'Projects continue while time is running.':'Select districts on the map to choose where local projects are delivered.'} Inflation adds ${state.inflation.toFixed(1)}% to new funding.</div>`;
}
function initiativeById(id){return INITIATIVES.find(i=>i.id===id);}
function unitsPanel(){
  return heading('SECURITY COMMAND','Your forces','Deploy units across connected districts. Use intelligence to prepare, security to contain, and local institutions to hold.')+
    `<div class="section-label">ACTIVE ROSTER <span>${state.units.length} / 6 units</span></div>`+
    state.units.map(u=>{
      const ready=u.status==='ready';
      const destination=u.status==='moving'?DISTRICTS[u.path.at(-1)].name:DISTRICTS[u.district].name;
      const reason=operationReason('interdict',state.districts[u.district]);
      return `<article class="roster-card" data-roster="${u.id}" ${focusedUnit===u.id?'style="border-color:#71945b"':''}><div class="roster-head">${unitToken(u)}<div><h3>${esc(u.name)}</h3><small>${UNIT_TYPES[u.type].name}</small></div><span class="state-tag ${ready?'good':''}">${{ready:'READY',moving:'EN ROUTE',training:'TRAINING',operating:'ASSIGNED'}[u.status]}</span></div>
        <p>${u.status==='moving'?'Moving to ':u.status==='training'?'Training at ':'Stationed in '}<button class="network-home" data-action="select" data-district="${u.status==='moving'?u.path.at(-1):u.district}">${destination}</button></p>
        ${!ready&&u.remaining>0?progress(u.remaining,u.total):''}<div class="roster-controls"><span>${u.type==='intel'?'+1.1 LOCAL INTEL / DAY':`${Math.floor(unitPower(state,u))} OPERATIONAL POWER`}</span><button class="small-button" data-action="dispatch" data-unit="${u.id}" ${!ready||state.outcome?'disabled':''}>${dispatchUnit===u.id?'Choose district…':'Deploy'} ${icon('arrow',12)}</button></div>
        ${u.type!=='intel'&&ready?`<button class="action-button" data-action="interdict" data-district="${u.district}" ${reason?'disabled':''}>${icon('network',14)}<span><strong>Disrupt network assets</strong><small>${reason||'5 days · reduce funding & build evidence'}</small></span><span class="cost">$${projectCost(state,7)}</span></button>`:''}
      </article>`;
    }).join('')+`<div class="section-label">RECRUITMENT <span>New units arrive at HQ</span></div>`+
    Object.entries(UNIT_TYPES).map(([type,def])=>`<div class="recruit-row"><span><strong>${def.name}</strong><small>${def.days} days · ${def.description}</small></span><button class="small-button secondary" data-action="recruit" data-unit-type="${type}" ${state.money<projectCost(state,def.cost)||state.units.length>=6||state.outcome?'disabled':''}>+ $${projectCost(state,def.cost)}</button></div>`).join('')+
    `<div class="notice"><strong>Containment needs a permanent presence.</strong>Security units suppress local cells each day. Intelligence teams reveal activity. Police stations keep working after a unit moves on.</div>`;
}
function networksPanel(){
  return heading('ORGANIZED CRIME DOSSIERS','The networks','Build a case, arrest each leader, and contain the remaining cells. Leader arrests permanently stop recruitment.')+
    NETWORKS.map(n=>{
      const status=state.networks[n.id],requirements=arrestRequirements(state,n.id),home=DISTRICTS[n.home];
      const threat=totalThreat(state,n.id),cells=state.districts.filter(d=>DISTRICTS[d.id].network===n.id&&d.threat>=1).length;
      return `<article class="network-card" id="network-${n.id}"><div class="network-card-head">${portrait(n.portrait)}<div><h3>${n.name}</h3><small>${n.leader} · ${n.alias}</small><span class="state-tag ${status.dismantled?'good':status.captured?'':'danger'}">${status.dismantled?'DISMANTLED':status.captured?'LEADER IN CUSTODY':'ACTIVE NETWORK'}</span></div></div><div class="network-card-body"><p>${n.description}</p>
        ${bar('Case evidence',status.evidence,'intel')}${bar('Network funding',status.funds,'threat')}
        <p style="margin-top:12px">${cells} active ${cells===1?'cell':'cells'} · ${Math.round(threat)} total threat points</p>
        <button class="network-home" data-action="select" data-district="${n.home}">${icon('pin',10)} Known base: ${home.name} ${icon('arrow',10)}</button>
        ${status.captured?`<div class="notice"><strong>${status.dismantled?'Network contained':'Contain the remaining cells'}</strong>${status.dismantled?'Civilian institutions can now hold these districts.':'Recruitment has stopped. Deploy security units and finish containing the network.'}</div>`:`<div class="network-prerequisites">${requirements.map(r=>`<span>${icon('lock',10)}${r}</span>`).join('')}</div>${actionButton({action:'arrest',title:'Arrest network leader',detail:'5 days · permanent recruitment shutdown',cost:`$${projectCost(state,10)}`,iconName:'scales',extra:`data-network="${n.id}"`,disabled:!!requirements.length,danger:true})}`}
      </div></article>`;
    }).join('')+
    `<div class="notice"><strong>Gather evidence in the network’s districts.</strong>Each completed investigation adds case evidence. Special prosecutors, independent audits and witness protection strengthen your cases.</div>`;
}

function renderPanel(){
  const panel=$('#panel-content'),scroll=panel.scrollTop;
  const active=document.activeElement;
  const activeData=panel.contains(active)&&active?.dataset.action?{...active.dataset}:null;
  panel.innerHTML=({district:districtPanel,initiatives:initiativesPanel,units:unitsPanel,networks:networksPanel}[pane])();
  panel.scrollTop=scroll;
  if(activeData){
    const replacement=[...panel.querySelectorAll('[data-action]')].find(e=>Object.entries(activeData).every(([k,v])=>e.dataset[k]===v));
    if(replacement&&!replacement.disabled)replacement.focus({preventScroll:true});
  }
}
function render(){
  const gov=GOVERNORS.find(g=>g.id===state.governor),stable=stableDistricts(state),progressValue=Math.round(stable/24*100);
  $('#money-value').textContent=`$${Math.floor(state.money)}`;
  $('#income-value').textContent=`+$${Math.round((15+stable*0.7)*DIFFICULTIES[state.difficulty].income-2-state.units.length*0.65)} / week`;
  $('#trust-value').innerHTML=`${Math.floor(state.trust)}<span>%</span>`;$('#trust-track').style.width=`${state.trust}%`;
  $('#corruption-value').innerHTML=`${Math.floor(state.corruption)}<span>%</span>`;
  $('#corruption-label').textContent=state.corruption<25?'Manageable':state.corruption<50?'Rising concern':'Critical';
  $('#stability-value').innerHTML=`${stable}<span> / 24</span>`;
  $('#networks-value').innerHTML=`${state.networks.filter(n=>n.dismantled).length}<span> / 3</span>`;
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
  map.render(state,selected,layer);renderPanel();
}

function openModal(title,kicker,body,{resume=false,locked=false}={}){
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
  openModal('A province worth protecting','OPERATION SANTA ESPERANZA',`<div class="briefing-lead">${portrait(gov.portrait)}<p>Three criminal networks have taken root in Santa Esperanza. Your mandate is to restore lasting civilian control before public confidence or the two-year mandate runs out.</p></div>
    <div class="mission-objective"><strong>1. Stabilize at least 18 of 24 districts</strong><p>${stable} / 18 stabilized. A district needs 60% support, less than 8% threat, and a local service or 30% security. Stability then builds to 75% over time.</p></div>
    <div class="mission-objective"><strong>2. Dismantle all three networks</strong><p>${state.networks.filter(n=>n.dismantled).length} / 3 dismantled. Arrest each leader and reduce all of their district cells below 1 threat point. Hold both objectives for 14 consecutive days to win.</p></div>
    <h3>Your governor: ${gov.name}</h3><p>${gov.description} ${gov.bonus}</p>
    <h3>Your first moves</h3><ol><li>Investigate Sierra Alta, Puerto Viejo, or La Frontera to raise local intelligence above 40%.</li><li>Deploy ALPHA or BRAVO there. When the unit arrives, start a containment operation.</li><li>Fund water, clinics and employment in quiet districts to build public support.</li><li>Fund Special prosecutors and build 65% case evidence to unlock leader arrests.</li></ol>
    <p>All people, districts and organizations are fictional. This is a strategy simulation with abstract operations and original artwork.</p>
    ${actionButton({action:'close-modal',title:'Return to command',detail:'Time remains paused while you review your plan.',iconName:'arrow',primary:true})}`);
}
function help(){
  openModal('Field manual','COMMAND REFERENCE',`<p>Click a district to inspect its needs and issue orders. Projects and operations only progress while the simulation is running. You can issue orders while paused.</p>
    <h3>Contain, rebuild, hold</h3><ul><li>Security operations require a ready federal or police unit and at least 40% local intelligence. Their forecast depends on intelligence, unit power, local threat and corruption.</li><li>Investigations take four days and improve local intelligence and evidence against the regional network.</li><li>Uncaptured leaders recruit into existing cells and can spread to neighboring, unprotected districts every three weeks.</li><li>Arresting a leader stops recruitment permanently. Security units and police stations suppress the remaining cells.</li><li>Civilian projects are blocked when local threat is 35% or higher. Water, clinics, schools and jobs count as local services.</li><li>A district stabilizes after support reaches 60%, threat stays below 8%, and a service is delivered or security reaches 30%. Stability needs time to reach 75%.</li><li>New spending increases inflation slightly. Anti-corruption policies protect the mandate; weekly funding supports your campaign.</li></ul>
    <h3>Time and saves</h3><p>Decisions and dialogs pause the simulation. Autosave runs after orders and every five days. Reopening a save always pauses time. Export saves from the campaign menu for backups.</p>
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
    ${actionButton({action:'new-game',title:'New operation',detail:'Choose a governor and difficulty',iconName:'reset'})}</div><div class="notice"><strong>Current campaign</strong>${GOVERNORS.find(g=>g.id===state.governor).name} · ${DIFFICULTIES[state.difficulty].label} · Seed ${state.seed}<br>Day ${state.day+1} of 730 · ${state.stats.projects} projects completed · ${state.stats.arrests} leaders arrested</div>`);
}
function newGame(){
  openModal('A new mandate','CAMPAIGN SETUP',`<div class="province-card"><img src="${ART.province}" alt="Illustrated Santa Esperanza campaign map" width="160" height="106"><div><small>CAMPAIGN 01 / COASTAL CORRIDOR</small><h3>Santa Esperanza</h3><p>24 districts. Three entrenched networks.<br>Restore civilian control before the mandate expires.</p></div></div><p>Choose the governor who will lead your next operation. Each brings a different advantage.</p><div class="governor-options">${GOVERNORS.map(g=>`<button class="governor-option ${g.id===newGovernor?'active':''}" data-action="governor" data-id="${g.id}">${portrait(g.portrait)}<span><strong>${g.name}</strong><small>${g.bonus}</small></span></button>`).join('')}</div>
    <div class="new-game-fields"><label>Difficulty<select id="new-difficulty">${Object.entries(DIFFICULTIES).map(([id,d])=>`<option value="${id}" ${id==='standard'?'selected':''}>${d.label}</option>`).join('')}</select></label><label>Campaign seed<input id="new-seed" inputmode="numeric" type="number" min="0" max="4294967295" value="${Math.floor(Math.random()*1000000)}"></label></div>
    ${hasCampaign?'<div class="confirmation">Starting a new operation replaces this device’s autosave. Export your current campaign first if you want to keep it.</div>':''}
    ${actionButton({action:'start-new',title:'Begin new operation',detail:'Start paused with a fresh provincial mandate',iconName:'flag',primary:true})}`);
}
function pauseMenu(){
  openModal('Provincial command','CAMPAIGN PAUSED',`<p>${GOVERNORS.find(g=>g.id===state.governor).name} · Day ${state.day+1} · ${DIFFICULTIES[state.difficulty].label}</p>
    ${actionButton({action:'resume-game',title:state.outcome?'Review the province':'Resume operation',detail:'Return to the map and your current orders',iconName:'play',primary:true})}
    ${actionButton({action:'save',title:'Save campaign',detail:'Keep this mandate on your device',iconName:'save'})}
    ${actionButton({action:'settings',title:'Campaign desk',detail:'Export, import or start another operation',iconName:'book'})}
    ${actionButton({action:'main-menu',title:'Return to main menu',detail:'Save progress and pause the operation',iconName:'home'})}`);
}
function credits(){
  openModal('A province worth protecting','ABOUT CARTEL: CONTAINMENT',`<p>An original province strategy game about public trust, accountable security and dismantling fictional criminal networks.</p><h3>One province, many communities</h3><p>The illustrated map spans mountain settlements, woodland, farmland, civic centers, border roads and coastal ports. Every district has its own needs.</p><h3>Art direction</h3><p>Angular cut-paper scenery, ochre highlights, cream silhouettes and deep teal ink connect the province, its people and its institutions.</p><p>All characters, organizations and places in the campaign are fictional.</p>${actionButton({action:'close-modal',title:'Return',iconName:'arrow',primary:true})}`);
}
function eventModal(){
  const event=EVENTS.find(e=>e.id===state.pendingEvent);if(!event)return;
  openModal(event.title,event.tag.toUpperCase(),`<div class="event-portrait">${portrait(event.portrait)}<p>${event.text}</p></div>${event.choices.map((c,i)=>actionButton({action:'decision',title:c.label,detail:c.detail,iconName:i===0?'check':'arrow',extra:`data-choice="${i}"`,disabled:state.money<c.cost,primary:i===0})).join('')}<p class="reason">The simulation stays paused until a response is chosen.</p>`,{locked:true});
}
function outcomeModal(){
  const won=state.outcome==='victory';lastOutcome=state.outcome;
  openModal(won?'Civilian control restored':'The mandate has ended','CAMPAIGN REPORT',`<div class="outcome-banner">${icon(won?'flag':'scales')}<h3>${won?'Santa Esperanza holds.':'A difficult province.'}</h3><p>${won?'All three networks are dismantled, and civilian institutions have held the majority of districts for fourteen days.':state.trust<=0?'Public trust collapsed before lasting control could be established.':'The two-year mandate expired before both objectives were secured.'}</p></div><div class="outcome-stats"><div><strong>${state.day}</strong><small>Days elapsed</small></div><div><strong>${stableDistricts(state)}</strong><small>Districts stabilized</small></div><div><strong>${state.stats.arrests}</strong><small>Leaders arrested</small></div></div>
    ${actionButton({action:'new-game',title:'Start a new operation',detail:'Try another governor, seed or difficulty',iconName:'reset',primary:true})}${actionButton({action:'close-modal',title:'Review the province',detail:'Inspect the final campaign state',iconName:'map'})}`);
}

document.addEventListener('click',event=>{
  const button=event.target.closest('[data-action]');if(!button||button.disabled)return;
  const a=button.dataset.action;
  if(a==='main-menu'){showMenu();}
  else if(a==='continue-game'){if(hasCampaign)void runLoading('game');}
  else if(a==='retry-loading'){if(scene==='loading'&&loadingDone)void runLoading(loadingTarget);}
  else if(a==='finish-loading'){if(scene==='loading')finishLoading();}
  else if(a==='pause-menu')pauseMenu();
  else if(a==='credits')credits();
  else if(a==='resume-game'){
    wasRunningBeforeModal=false;closeModal();if(!state.outcome&&!state.pendingEvent&&state.paused)command({type:'pause'},{quiet:true});
  }else if(a==='view'){
    pane=button.dataset.view;dispatchUnit=null;$('#panel-content').scrollTop=0;render();
    if(innerWidth<=760)$('#panel-content').scrollIntoView({block:'start',behavior:'smooth'});
  }else if(a==='category'){
    pane='initiatives';category=button.dataset.category;dispatchUnit=null;$('#panel-content').scrollTop=0;render();
    if(innerWidth<=760)$('#panel-content').scrollIntoView({block:'start',behavior:'smooth'});
  }else if(a==='select'){
    dispatchUnit=null;selectDistrict(Number(button.dataset.district));
  }else if(a==='investigate'||a==='raid')command({type:a,district:selected});
  else if(a==='interdict')command({type:a,district:Number(button.dataset.district)});
  else if(a==='project')command({type:a,id:button.dataset.id,district:selected});
  else if(a==='recruit')command({type:a,unitType:button.dataset.unitType});
  else if(a==='arrest')command({type:a,network:Number(button.dataset.network)});
  else if(a==='focus-unit'){pane='units';focusedUnit=Number(button.dataset.unit);render();}
  else if(a==='view-network'){
    pane='networks';render();document.getElementById(`network-${button.dataset.network}`)?.scrollIntoView({block:'start',behavior:'smooth'});
  }else if(a==='dispatch'){
    dispatchUnit=Number(button.dataset.unit);focusedUnit=dispatchUnit;state.paused=true;render();
    if(innerWidth<=760)$('.map-area').scrollIntoView({block:'start',behavior:'smooth'});
  }else if(a==='cancel-dispatch'){dispatchUnit=null;render();}
  else if(a==='pause'){
    if(state.pendingEvent!==null)eventModal();else command({type:'pause'},{quiet:true});
  }else if(a==='speed')command({type:a,speed:Number(button.dataset.speed)},{quiet:true});
  else if(a==='zoom-in')map.setZoom(0.2);
  else if(a==='zoom-out')map.setZoom(-0.2);
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
    newGovernor=button.dataset.id;document.querySelectorAll('.governor-option').forEach(b=>b.classList.toggle('active',b.dataset.id===newGovernor));
  }else if(a==='start-new'){
    const seedInput=$('#new-seed'),seed=Number(seedInput.value);
    if(!Number.isInteger(seed)||seed<0||seed>4294967295||seedInput.value===''){notify('Enter a whole campaign seed from 0 to 4294967295.',true);return;}
    state=createGame({seed,difficulty:$('#new-difficulty').value,governor:newGovernor});hasCampaign=true;loadNotice='New operation ready. Issue orders, then begin.';lastOutcome=null;selected=HQ;pane='district';dispatchUnit=null;focusedUnit=null;wasRunningBeforeModal=false;map.fit();modal.close();save();render();void runLoading('game');
  }else if(a==='decision'){
    const result=command({type:'event',choice:Number(button.dataset.choice)});if(result.ok){wasRunningBeforeModal=false;closeModal();}
  }
});
$('#map-layer').addEventListener('change',event=>{
  layer=event.target.value;render();
  $('#map-key').innerHTML=layer==='control'?'<span><i class="key-dot stable"></i>Stabilized</span><span><i class="key-dot unsecured"></i>Unsecured</span><span><i class="key-dot hostile"></i>Cartel presence</span><span><i class="key-unit"></i>Your units</span>':`<span>LIGHT: LOW ${layer==='support'?'SUPPORT':'INTELLIGENCE'}</span><span>DEEP GREEN: HIGH COVERAGE</span>`;
});
$('#import-save').addEventListener('change',async event=>{
  const file=event.target.files[0];if(!file)return;
  try{
    if(file.size>300000)throw new Error('This save file is too large.');
    const imported=restore(await file.text());state=imported;hasCampaign=true;loadNotice='Campaign imported. Time is paused.';lastOutcome=null;selected=HQ;pane='district';dispatchUnit=null;wasRunningBeforeModal=false;map.fit();modal.close();save();render();await runLoading('game');
  }catch(error){notify(error.message==='This save file is too large.'?error.message:'Import failed. Choose a valid Cartel: Containment save file.',true);}
  event.target.value='';
});
document.addEventListener('keydown',event=>{
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
let lastTime=performance.now(),accumulator=0;
setInterval(()=>{
  const now=performance.now(),elapsed=Math.min(now-lastTime,250);lastTime=now;
  if(scene!=='game'||state.paused||modal.open||state.outcome||state.pendingEvent!==null){accumulator=0;return;}
  accumulator+=elapsed;const duration={1:1200,2:400,3:200}[state.speed];
  if(accumulator>=duration){
    accumulator-=duration;
    if(tick(state)){render();if(state.day%5===0||state.pendingEvent||state.outcome)save();}
    if(state.pendingEvent!==null)eventModal();
    else if(state.outcome&&state.outcome!==lastOutcome)outcomeModal();
  }
},80);
render();
renderMenu();
void runLoading('menu');

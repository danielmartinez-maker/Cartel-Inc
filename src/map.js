import {DISTRICTS,TERRAIN,LAND,NETWORKS} from './data.js';
import {CELLS,polygonPath} from './geography.js';

const ns='http://www.w3.org/2000/svg';
const node=(tag,attrs={},content='')=>{const n=document.createElementNS(ns,tag);for(const [key,value]of Object.entries(attrs))n.setAttribute(key,value);n.innerHTML=content;return n;};
const hash=(a,b)=>{const n=Math.sin(a*127.1+b*311.7)*43758.5453;return n-Math.floor(n);};
export class ProvinceMap{
  constructor(element,onSelect,onUnit){
    this.element=element;this.onSelect=onSelect;this.onUnit=onUnit;this.layer='control';this.zoom=1;this.center=[590,400];
    element.innerHTML=`<svg id="province-map" viewBox="0 0 1200 800" role="group" aria-label="Santa Esperanza province. Select a district for information and orders.">
      <defs>
        <pattern id="sea-grid" width="44" height="44" patternUnits="userSpaceOnUse"><path d="M44 0H0V44" fill="none" stroke="#a5b89a" stroke-opacity=".07" stroke-width=".65"/></pattern>
        <pattern id="contested" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="9" stroke="#9b5944" stroke-width="1" opacity=".18"/></pattern>
        <filter id="land-shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#001d19" flood-opacity=".35"/></filter>
        <clipPath id="land-clip"><path d="${polygonPath(LAND)}"/></clipPath>
        ${CELLS.map((p,i)=>`<clipPath id="clip-${i}"><path d="${polygonPath(p)}"/></clipPath>`).join('')}
      </defs>
      <rect class="ocean" x="-2000" y="-2000" width="5200" height="4800" fill="#0b3632"/>
      <rect x="-2000" y="-2000" width="5200" height="4800" fill="url(#sea-grid)"/>
      <g class="sea-lines" fill="none" stroke="#88a98d" stroke-width=".8" opacity=".2">
        <path d="M90 170Q40 330 75 485T292 731M74 160Q20 330 57 493T281 747M60 148Q1 330 39 500T269 765"/>
        <path d="M1035 560Q1030 661 913 736T674 730m374-162q-10 112-126 183t-250-1"/>
      </g>
      <text class="sea-label" x="110" y="650" transform="rotate(33 110 650)">MAR DE LA CALMA</text>
      <text class="map-geographic-label" x="796" y="61">NORTHERN TERRITORIES</text>
      <path d="${polygonPath(LAND)}" fill="#dfc497" stroke="#eacb90" stroke-width="6" filter="url(#land-shadow)"/>
      <g id="districts"></g>
      <g clip-path="url(#land-clip)" class="cartography" pointer-events="none">
        <path class="river river-border" d="M735 105C678 179 722 201 646 250S713 356 610 410 655 498 565 551 607 659 541 715"/>
        <path class="river" d="M735 105C678 179 722 201 646 250S713 356 610 410 655 498 565 551 607 659 541 715"/>
        <path class="road road-border" d="M274 568L323 435 375 307 515 305 657 316 802 329 978 282M657 316L614 464 685 591 930 614M323 435L468 434 614 464 763 465 958 411M240 177L390 184 540 165 700 180 847 203 978 282"/>
        <path class="road" d="M274 568L323 435 375 307 515 305 657 316 802 329 978 282M657 316L614 464 685 591 930 614M323 435L468 434 614 464 763 465 958 411M240 177L390 184 540 165 700 180 847 203 978 282"/>
      </g>
      <g id="terrain" pointer-events="none"></g>
      <g id="settlements" pointer-events="none"></g>
      <g id="unit-paths" pointer-events="none"></g>
      <g id="units"></g>
      <g class="compass" transform="translate(1091 651)" pointer-events="none"><path d="M0-31L8 3 0-1-8 3ZM0 25L-7 0 0 4 7 0Z" fill="#385e54"/><path d="M-23 0H23M0-24V24" stroke="#385e54" stroke-width=".8"/><circle r="17" fill="none" stroke="#385e54" stroke-width=".7"/><text y="-40" text-anchor="middle">N</text></g>
      <g class="scale" transform="translate(100 728)" pointer-events="none"><path d="M0-5v5h100v-5M50 0v-5" stroke="#406056" fill="none" stroke-width="1.5"/><text x="0" y="17">0</text><text x="82" y="17">20 km</text></g>
    </svg>`;
    this.svg=element.querySelector('svg');
    const groups=this.svg.querySelector('#districts');
    this.cells=DISTRICTS.map(d=>{
      const g=node('g',{'data-district':d.id,role:'button',tabindex:0,'aria-label':d.name,class:'district'});
      g.append(node('path',{d:polygonPath(CELLS[d.id]),class:'district-fill',fill:TERRAIN[d.terrain].fill}));
      g.append(node('path',{d:polygonPath(CELLS[d.id]),class:'threat-fill',fill:'url(#contested)',opacity:0}));
      g.append(node('path',{d:polygonPath(CELLS[d.id]),class:'district-border',fill:'none'}));
      g.addEventListener('click',()=>{if(!this.wasDragged)onSelect(d.id);});
      g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(d.id);}});
      groups.append(g);return g;
    });
    for(const d of DISTRICTS){
      const g=node('g',{'clip-path':`url(#clip-${d.id})`});
      for(let i=0;i<(d.terrain==='mountain'?20:d.terrain==='forest'?18:8);i++){
        const x=d.x-90+hash(d.id,i)*180,y=d.y-90+hash(i,d.id+32)*180;
        if(Math.hypot(x-d.x,y-d.y)<40)continue;
        if(d.terrain==='mountain')g.append(node('path',{d:`M${x-9} ${y+6}l9-16 9 16m-13-7l4 2 3-4`,class:'terrain-mountain'}));
        else if(d.terrain==='forest')g.append(node('path',{d:`M${x} ${y+6}v-5m-5 0l5-9 5 9Z`,class:'terrain-tree'}));
        else if(d.terrain==='rural')g.append(node('path',{d:`M${x-8} ${y}l12-4m-10 8l12-4m-10 8l12-4`,class:'terrain-field'}));
      }
      this.svg.querySelector('#terrain').append(g);
    }
    this.markers=DISTRICTS.map(d=>{
      const g=node('g',{transform:`translate(${d.x} ${d.y})`,class:'settlement'});
      const capital=d.id===9;
      g.innerHTML=`<circle class="district-aura" r="${capital?26:22}"/><circle class="district-hub" r="${capital?10:6}"/>${capital?'<path d="M-4 0l3 3 5-6" class="hq-mark"/>':''}<text class="district-name" text-anchor="middle" y="${capital?32:26}">${d.name.toUpperCase()}</text><g class="population-dots" transform="translate(-16 37)">${Array.from({length:6},(_,i)=>`<circle cx="${i*6.5}" r="1.6"/>`).join('')}</g><g class="enemy-dots" transform="translate(-12 -17)"></g><g class="op-indicator" transform="translate(26 -5)"></g>`;
      this.svg.querySelector('#settlements').append(g);return g;
    });
    let drag=null;
    this.svg.addEventListener('pointerdown',e=>{this.wasDragged=false;if(e.button===0){drag={x:e.clientX,y:e.clientY,center:[...this.center]};}});
    this.svg.addEventListener('pointermove',e=>{
      if(!drag||this.zoom===1)return;
      const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
      if(Math.hypot(dx,dy)<5)return;this.wasDragged=true;
      const ratio=1200/this.svg.getBoundingClientRect().width/this.zoom;
      this.center=[Math.max(300,Math.min(900,drag.center[0]-dx*ratio)),Math.max(230,Math.min(570,drag.center[1]-dy*ratio))];this.setView();
    });
    window.addEventListener('pointerup',()=>{drag=null;});
  }
  setView(){
    const w=1200/this.zoom,h=800/this.zoom;
    this.svg.setAttribute('viewBox',`${this.center[0]-w/2} ${this.center[1]-h/2} ${w} ${h}`);
  }
  setZoom(delta){this.zoom=Math.max(1,Math.min(2.2,this.zoom+delta));if(this.zoom===1)this.center=[590,400];this.setView();return this.zoom;}
  fit(){this.zoom=1;this.center=[590,400];this.setView();}
  render(s,selected,layer='control'){
    this.layer=layer;
    for(const d of s.districts){
      const g=this.cells[d.id],def=DISTRICTS[d.id],stable=d.stability>=75&&d.support>=60&&d.threat<8;
      let color=TERRAIN[def.terrain].fill;
      if(layer==='support')color=`hsl(${39+d.support*1.08} 30% ${79-d.support*0.22}%)`;
      if(layer==='intelligence')color=`hsl(${148+d.intel*0.36} ${20+d.intel*0.17}% ${81-d.intel*0.33}%)`;
      if(layer==='control'&&stable)color='#8daf93';
      if(layer==='control'&&d.threat>=25)color='#c9976d';
      g.classList.toggle('selected',d.id===selected);g.classList.toggle('hostile',d.threat>=25);
      g.setAttribute('aria-pressed',d.id===selected?'true':'false');
      g.setAttribute('aria-label',`${def.name}. ${stable?'Stabilized':d.threat>=25?'Cartel presence':'Unsecured'}. Support ${Math.floor(d.support)} percent. Intelligence ${Math.floor(d.intel)} percent.`);
      g.querySelector('.district-fill').setAttribute('fill',color);
      g.querySelector('.threat-fill').setAttribute('opacity',d.threat>=25?0.7:0);
      const m=this.markers[d.id];m.classList.toggle('selected',d.id===selected);
      m.querySelector('.district-aura').setAttribute('class',`district-aura ${d.id===selected?'active':stable?'stable':''}`);
      m.querySelector('.district-hub').setAttribute('fill',d.id===9?'#134d3c':d.threat>=25?'#a35230':stable?'#326f4c':'#fff0c5');
      m.querySelector('.population-dots').setAttribute('fill',stable?'#246147':d.threat>=25?'#9d4d2c':'#405a40');
      m.querySelector('.enemy-dots').innerHTML=d.threat>=12?Array.from({length:Math.min(5,Math.ceil(d.threat/12))},(_,i)=>`<circle cx="${i*6.5}" r="2.8" fill="${NETWORKS[def.network].color}" stroke="#f0d8ba" stroke-width=".6"/>`).join(''):'';
      const op=s.operations.find(o=>o.district===d.id);
      m.querySelector('.op-indicator').innerHTML=op?`<circle r="7" class="operation-pulse" fill="${op.type==='investigate'?'#3f7d86':'#b56f46'}"/><path d="M-2-2h4v4h-4Z" fill="#f8eaca"/>`:'';
    }
    const routes=this.svg.querySelector('#unit-paths');routes.replaceChildren();
    const units=this.svg.querySelector('#units');units.replaceChildren();
    const counts={};
    for(const u of s.units){
      if(u.status==='training')continue;
      const def=DISTRICTS[u.district];let x=def.x+29,y=def.y+1;
      if(u.status==='moving'&&u.path.length){
        const path=u.path.map(id=>DISTRICTS[id]),progress=(u.total-u.remaining)/u.total;
        const segment=Math.min(path.length-2,Math.floor(progress*(path.length-1))),fraction=progress*(path.length-1)-segment;
        x=path[segment].x+(path[segment+1].x-path[segment].x)*fraction;
        y=path[segment].y+(path[segment+1].y-path[segment].y)*fraction;
        routes.append(node('path',{d:'M'+path.map(d=>`${d.x} ${d.y}`).join('L'),class:'unit-route'}));
      }else{counts[u.district]=(counts[u.district]||0)+1;x+=(counts[u.district]-1)*21;}
      const g=node('g',{class:`map-unit ${u.type} ${u.status==='operating'?'operating':''}`,transform:`translate(${x} ${y})`,role:'button',tabindex:0,'aria-label':`${u.name}, ${u.type} unit, ${u.status}`});
      const symbol=u.type==='intel'?'<circle r="3" fill="none" stroke="#f3e9cd"/><path d="M3 3l3 3" stroke="#f3e9cd"/>':u.type==='federal'?'<path d="M-4-3h8v4l-4 4-4-4Z" fill="none" stroke="#f3e9cd" stroke-width="1.2"/>':'<circle r="3" fill="#f3e9cd"/>';
      g.innerHTML=`<circle r="10" class="unit-shadow"/><circle r="8.5" class="unit-body"/>${symbol}`;
      g.addEventListener('click',e=>{e.stopPropagation();this.onUnit(u.id);});
      g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();this.onUnit(u.id);}});units.append(g);
    }
  }
}

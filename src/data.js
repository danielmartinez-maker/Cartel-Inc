// All places, organizations and characters in this game are fictional.
export const VERSION=3;
export const HQ=9;
export const MANDATE_DAYS=1825,STABILITY_TARGET=900,MAX_UNITS=60,MAX_PROJECTS=32,MAX_WORKS=40;
export const DISTRICTS_PER_PROVINCE=24,NEIGHBORHOODS_PER_DISTRICT=3,MEMBERS_PER_CARTEL=13;
export const SAVE_LIMIT=6000000;
export const MAP={width:9900,height:5900};
// Province polygons share the very same boundary vertices. There are no sea gaps
// or ferry-only connections: the fifty provinces form one continuous country.
export const LAND=[[180,130],[295,94],[425,120],[550,82],[685,110],[840,103],[972,177],[1065,280],[1018,403],[1071,502],[993,615],[905,681],[792,699],[679,662],[557,708],[426,660],[319,682],[212,606],[155,519],[110,416],[156,315],[135,222]];
const provinceNames=['Santa Esperanza','Sierra del Sol','Costa Dorada','Valle del Sur','Bahía de las Brumas','Altos de Encina','Nueva Castilla','Río de Plata','Valle del Cobre','Sierra del Viento','Costa del Cedro','Llanos de Aurora','Monte Sereno','Piedra del Águila','Puerto del Este','Bosques de Oliva','Valle Real','Sierra del Laurel','Costa Esmeralda','Río del Alba','Llanos del Norte','Montes Claros','Santa Aurelia','Valle de Azahar','Sierra Morena','Costa del Roble','Río de la Luna','Altos de San Luis','Nueva Granada','Valle de Cristal','Sierra de la Cruz','Costa de las Palmas','Río de Jade','Llanos del Sur','Monte de los Santos','Santa Lucía','Valle de Jacaranda','Sierra del Fuego','Costa de Nácar','Río de los Pinos','Altos de Maravilla','Nueva Providencia','Valle del Río Seco','Sierra del Horizonte','Costa Serena del Oeste','Río de los Sauces','Llanos de Castaña','Montes de Bronce','Santa Celina','Valle de la Concordia'];
const tiles=[];for(let row=0;row<7;row++){const start=[1,0,0,0,0,0,1][row],count=[6,8,8,8,8,7,5][row];for(let col=start;col<start+count;col++)tiles.push({col,row});}
const first=[[3,3],[3,2],[4,3],[3,4],[2,3]];
tiles.sort((a,b)=>{const ai=first.findIndex(([x,y])=>x===a.col&&y===a.row),bi=first.findIndex(([x,y])=>x===b.col&&y===b.row);return (ai<0?100+Math.abs(a.col-3)+Math.abs(a.row-3):ai)-(bi<0?100+Math.abs(b.col-3)+Math.abs(b.row-3):bi)||a.row-b.row||a.col-b.col;});
const vertex=(x,y)=>[150+x*1200+Math.sin(x*7.31+y*3.7)*75,150+y*800+Math.sin(x*4.1+y*8.17)*50];
export const REGIONS=tiles.map((t,id)=>({id,...t,name:provinceNames[id],subtitle:['Central plateau','Northern highlands','Eastern corridor','Southern valleys','Western heartland'][id%5],x:150+t.col*1200,y:150+t.row*800,mirror:false,hub:id*24+9,polygon:[vertex(t.col,t.row),vertex(t.col+1,t.row),vertex(t.col+1,t.row+1),vertex(t.col,t.row+1)],coastal:!tiles.some(n=>n.col===t.col-1&&n.row===t.row)||!tiles.some(n=>n.col===t.col+1&&n.row===t.row)||!tiles.some(n=>n.col===t.col&&n.row===t.row-1)||!tiles.some(n=>n.col===t.col&&n.row===t.row+1)}));
export const regionPoint=(r,[x,y])=>[r.x+x,r.y+y];
export const LANDS=REGIONS.map(r=>r.polygon);
export const PROVINCE_NEIGHBORS=REGIONS.map(r=>REGIONS.filter(n=>Math.abs(n.col-r.col)+Math.abs(n.row-r.row)===1).map(n=>n.id));
const regions = [
  ['Sierra Alta',240,177,'mountain',26,0,44], ['El Pinar',390,184,'forest',32,0,27],
  ['Paso del Norte',540,165,'rural',43,0,5], ['Las Cumbres',700,180,'mountain',27,2,4],
  ['San Miguel',847,203,'urban',80,2,7], ['La Frontera',978,282,'border',34,2,43],
  ['Valle Verde',230,305,'rural',45,0,8], ['San Jacinto',375,307,'rural',58,0,4],
  ['Los Olivos',515,305,'forest',35,0,3], ['Santa Esperanza',657,316,'capital',145,2,0],
  ['El Mirador',802,329,'rural',39,2,7], ['La Cantera',958,411,'mountain',24,2,29],
  ['Costa Azul',175,436,'coast',53,1,5], ['San Pedro',323,435,'urban',88,1,2],
  ['Las Palmas',468,434,'rural',44,1,5], ['Río Claro',614,464,'rural',49,1,3],
  ['El Rosario',763,465,'urban',72,2,6], ['Agua Fría',902,523,'forest',30,2,4],
  ['Puerto Viejo',269,562,'port',79,1,42], ['El Salto',414,574,'mountain',25,1,26],
  ['La Presa',555,613,'rural',37,1,4], ['Nueva Luz',685,591,'urban',68,1,3],
  ['San Lorenzo',802,619,'rural',40,2,4], ['Bahía Sur',930,614,'port',61,2,7],
];
export const LEGACY_DISTRICTS=regions.map(([name,x,y,terrain,population,network,threat],id)=>({id,name,x,y,terrain,population,network,threat}));
const districtNames=[[],['Cerro Rojo','Bosque Santo','Paso del Sol','Las Torres','San Isidro','El Portillo','Valle Seco','Las Encinas','Bosque Niebla','Nueva Aurora','El Vigía','Piedra Blanca','Costa Escondida','San Gabriel','Los Nogales','Río Seco','Villa del Sol','Monte Frío','Puerto del Alba','El Peñón','La Laguna','Nueva Sierra','San Rafael','Bahía Clara'],['Sierra Dorada','El Robledal','Paso Real','Las Águilas','San Cristóbal','La Puerta','Valle Dorado','San Lucas','Los Laureles','Ciudad Dorada','La Atalaya','El Mármol','Costa Serena','San Vicente','Las Acacias','Río de Oro','El Calvario','Agua Clara','Puerto Dorado','El Campanario','La Represa','Nueva Costa','San Joaquín','Bahía del Este'],['Sierra del Sur','El Cedral','Paso del Valle','Las Mesas','San Benito','La Raya','Valle del Trigo','San Andrés','Los Fresnos','Ciudad del Valle','El Balcón','La Calera','Costa del Sur','San Felipe','Las Cañas','Río Manso','El Santuario','Agua Dulce','Puerto del Sur','El Cañón','La Acequia','Nueva Tierra','San Marcos','Bahía Verde'],['Sierra Brumosa','El Encinar','Paso de Niebla','Las Atalayas','San Ignacio','La Ventana','Valle de Niebla','San Nicolás','Los Cipreses','Ciudad de las Brumas','El Faro','La Pizarra','Costa de Niebla','San Salvador','Las Dunas','Río Sombrío','El Refugio','Agua Salada','Puerto Bruma','El Acantilado','La Salina','Nueva Bahía','San Gregorio','Bahía del Viento']];
export const DISTRICTS=REGIONS.flatMap(r=>LEGACY_DISTRICTS.map(base=>{
  const id=r.id*24+base.id,[x,y]=regionPoint(r,[base.x,base.y]);
  const network=r.id===0?base.network:r.id===1?(base.terrain==='forest'?6:3):r.id===2?(base.network===2?8:4):r.id===3?(['port','coast'].includes(base.terrain)?1:5):r.id===4?(['border','mountain'].includes(base.terrain)?2:7):(r.id*7+Math.floor(base.id/8))%9;
  const terrain=!r.coastal&&['port','coast'].includes(base.terrain)?(base.terrain==='port'?'urban':'rural'):base.terrain;
  return {...base,id,region:r.id,localName:r.id<5?(r.id?districtNames[r.id][base.id]:base.name):base.name,name:r.id<5?(r.id?districtNames[r.id][base.id]:base.name):`${r.name} · ${base.name}`,x,y,terrain,network,threat:base.id===9?0:r.id===0?base.threat:base.threat>=25?28+(id%9):3+(id*7)%7,population:r.id?Math.round(base.population*(.65+(r.id%5*.1))):base.population};
}));
export const TRANSPORT_LINKS=REGIONS.flatMap(r=>PROVINCE_NEIGHBORS[r.id].filter(id=>id>r.id).map(id=>{
  const other=REGIONS[id],east=other.col>r.col,west=other.col<r.col;
  const a=r.id*24+(east?11:west?12:other.row>r.row?20:2),b=id*24+(east?12:west?11:other.row>r.row?2:20);
  return {id:`road-${r.id}-${id}`,a,b,regions:[r.id,id],days:3,type:(r.id+id)%4===0?'bridge':'highway'};
}));
export const NEIGHBORHOOD_TYPES={civic:{name:'Civic center',icon:'scales'},market:{name:'Market quarter',icon:'coin'},residential:{name:'Residential quarter',icon:'people'},industrial:{name:'Industrial ward',icon:'industry'},outskirts:{name:'Outer settlements',icon:'pin'},docks:{name:'Dockside',icon:'anchor'},hills:{name:'Hillside settlements',icon:'mountain'}};
export const NEIGHBORHOODS=DISTRICTS.map(d=>{
  const types=['urban','capital'].includes(d.terrain)?['civic','market','residential']:d.terrain==='port'?['docks','industrial','residential']:d.terrain==='mountain'?['hills','market','outskirts']:['residential','market','outskirts'];
  return types.map((type,index)=>({id:d.id*3+index,index,district:d.id,type,name:[['Centro','La Estación','Las Lomas'],['San Antonio','El Mercado','Los Jardines'],['La Plaza','El Molino','La Ribera']][d.id%3][index],x:d.x+[-29,28,0][index],y:d.y+[-19,-13,28][index]}));
});
export const PROVINCE_PRIORITIES={balanced:{name:'Balanced administration',cost:0},services:{name:'Public service delivery',cost:2},economy:{name:'Economic recovery',cost:2},security:{name:'Community security',cost:2},integrity:{name:'Institutional integrity',cost:2}};
export const TERRAIN = {
  arid:{label:'Dry country',fill:'#d5ab73',travel:2},wetland:{label:'Wetland',fill:'#94aaa0',travel:3},
  mountain: { label:'Highlands', fill:'#b9a17b', travel:3 }, forest:{label:'Woodland',fill:'#9cad8b',travel:2},
  rural:{label:'Rural district',fill:'#dfc497',travel:2}, urban:{label:'Urban district',fill:'#ecd1a2',travel:1},
  capital:{label:'Provincial capital',fill:'#f4dbaa',travel:1}, border:{label:'Border crossing',fill:'#c9ab80',travel:2},
  coast:{label:'Coastal district',fill:'#d4bd91',travel:2}, port:{label:'Port district',fill:'#e1c28e',travel:1},
};
export const GOVERNORS = [
  {id:'cruz',name:'Elena Cruz',role:'The community builder',portrait:0,bonus:'Civilian projects finish 25% faster.',description:'Rebuild public confidence from the ground up.'},
  {id:'ibarra',name:'Rafael Ibarra',role:'The commissioner',portrait:1,bonus:'Security units have 20% more operational power.',description:'Keep pressure on armed networks and hold the ground.'},
  {id:'vega',name:'Lucía Vega',role:'The prosecutor',portrait:2,bonus:'Investigations gather 25% more evidence; corruption rises more slowly.',description:'Build cases that survive beyond the next arrest.'},
];
export const DIFFICULTIES = {
  relaxed:{label:'Assisted',growth:0.7,income:1.3,trust:0.7,starting:850},
  standard:{label:'Standard',growth:1,income:1,trust:1,starting:650},
  veteran:{label:'Veteran',growth:1.3,income:0.85,trust:1.3,starting:500},
};
export const NETWORKS = [
  {id:0,name:'Los Cedros',short:'CEDROS',leader:'Mateo Salcedo',alias:'The Broker',portrait:3,color:'#bb6555',home:0,archetype:'territorial',description:'An entrenched highland organization that fortifies its home communities.'},
  {id:1,name:'La Marea',short:'MAREA',leader:'Inés Valdés',alias:'The Tide',portrait:4,color:'#c99851',home:18,archetype:'mercantile',description:'A coastal network whose strength depends on ports and reliable corridors.'},
  {id:2,name:'La Frontera',short:'FRONTERA',leader:'Tomás Roca',alias:'The Quarry',portrait:5,color:'#96667c',home:5,archetype:'clandestine',description:'A secretive organization that avoids exposure and relocates its command.'},
  {id:3,name:'Los Soles',short:'SOLES',leader:'Alicia Montoya',alias:'The Regent',portrait:6,color:'#b9753d',home:29,archetype:'predatory',description:'An intimidating highland faction that trades public fear for immediate control.'},
  {id:4,name:'Los Cuervos',short:'CUERVOS',leader:'Darío Beltrán',alias:'The Raven',portrait:7,color:'#7d8e9d',home:51,archetype:'mobile',description:'A restless frontier faction that withdraws from pressure and probes weak districts.'},
  {id:5,name:'La Red',short:'RED',leader:'Valeria Castaño',alias:'The Weaver',portrait:8,color:'#9b7751',home:85,archetype:'patronage',description:'A political machine that targets weak institutions and cultivates local connections.'},
  {id:6,name:'Las Brumas',short:'BRUMAS',leader:'Esteban Mena',alias:'The Mist',portrait:9,color:'#688b7c',home:32,archetype:'clandestine',description:'A woodland network that protects its members through dispersed cells.'},
  {id:7,name:'El Consorcio',short:'CONSORCIO',leader:'Camila Duarte',alias:'The Treasurer',portrait:10,color:'#b9a867',home:119,archetype:'mercantile',description:'A port coalition that accumulates funds and favors temporary arrangements with rivals.'},
  {id:8,name:'La Unión',short:'UNION',leader:'Julián Ochoa',alias:'The Councillor',portrait:11,color:'#8c9a58',home:64,archetype:'patronage',description:'A civic-front organization that recruits where prosperity and trust have collapsed.'},
];
for(const n of NETWORKS){DISTRICTS[n.home].network=n.id;DISTRICTS[n.home].threat=Math.max(42,DISTRICTS[n.home].threat);}
export const UNIT_TYPES = {
  federal:{name:'Federal unit',short:'FED',cost:18,days:12,power:24,icon:'shield',description:'Strong operational power. Best used against entrenched cells.'},
  police:{name:'Police unit',short:'POL',cost:12,days:8,power:15,icon:'badge',description:'Affordable containment and a permanent presence in vulnerable districts.'},
  intel:{name:'Intelligence team',short:'INT',cost:14,days:10,power:0,icon:'eye',description:'Gathers local intelligence every day. Cannot carry out security operations.'},
};
export const CATEGORIES = [
  {id:'civilian',name:'Civilian',label:'Civilian affairs',icon:7,description:'Win lasting public support'},
  {id:'security',name:'Security',label:'Security',icon:0,description:'Contain armed networks'},
  {id:'intelligence',name:'Intelligence',label:'Intelligence',icon:1,description:'Turn information into action'},
  {id:'governance',name:'Governance',label:'Governance',icon:2,description:'Build institutions that last'},
];
export const INITIATIVES = [
  {id:'water',name:'Clean water',category:'civilian',scope:'local',cost:8,days:8,icon:6,support:10,description:'Restore reliable water access. +10 support and one service.'},
  {id:'clinic',name:'Community clinic',category:'civilian',scope:'local',cost:10,days:10,icon:3,support:13,description:'Reopen primary care. +13 support and one service.'},
  {id:'school',name:'School restoration',category:'civilian',scope:'local',cost:11,days:14,icon:4,support:15,requires:'water',description:'Give families a reason to stay. +15 support and one service. Requires clean water.'},
  {id:'jobs',name:'Local employment',category:'civilian',scope:'local',cost:13,days:14,icon:7,support:18,description:'Support lawful livelihoods. +18 support and one service.'},
  {id:'roads',name:'Road repairs',category:'civilian',scope:'local',cost:9,days:10,icon:5,support:7,description:'Connect isolated communities. +7 support, +10 security and faster unit travel.'},
  {id:'outreach',name:'Community liaisons',category:'civilian',scope:'province',cost:15,days:12,icon:7,description:'Trusted local contacts slowly improve support in every district.'},
  {id:'station',name:'Local police station',category:'security',scope:'local',cost:12,days:12,icon:0,support:5,description:'A permanent garrison. +20 security; suppresses small cells each day.'},
  {id:'training',name:'Operational training',category:'security',scope:'province',cost:16,days:12,icon:0,description:'Improve accountability and readiness. +8 power to every security unit.'},
  {id:'oversight',name:'Civilian oversight',category:'security',scope:'province',cost:13,days:10,icon:2,description:'Reduce the trust cost of operations and add 6 public trust.'},
  {id:'analysis',name:'Intelligence analysis',category:'intelligence',scope:'province',cost:12,days:8,icon:1,description:'Connect the evidence. +8 intelligence everywhere; stronger investigations.'},
  {id:'radio',name:'Regional communications',category:'intelligence',scope:'province',cost:15,days:10,icon:1,requires:'analysis',description:'A secure reporting network gradually reveals activity in every district.'},
  {id:'witness',name:'Witness protection',category:'intelligence',scope:'province',cost:14,days:12,icon:7,description:'Increase case evidence from investigations and protect informants.'},
  {id:'integrity',name:'Anti-corruption office',category:'governance',scope:'province',cost:14,days:14,icon:2,description:'Reduce corruption by 10 and limit its daily growth.'},
  {id:'audit',name:'Independent audits',category:'governance',scope:'province',cost:11,days:10,icon:2,description:'Reduce corruption by 8; add 5 case evidence against every network.'},
  {id:'prosecutors',name:'Special prosecutors',category:'governance',scope:'province',cost:18,days:16,icon:2,description:'Unlock leader arrests and add 15 evidence against every network.'},
  {id:'finance',name:'Financial investigations',category:'governance',scope:'province',cost:16,days:14,icon:1,description:'Freeze 30% of each network’s funding and slow its recovery.'},
  {id:'regional-water',name:'Regional water network',category:'civilian',scope:'region',cost:44,days:20,icon:6,description:'Roll out clean water in this province. One accessible district receives service each day after completion.'},
  {id:'regional-clinics',name:'Regional health service',category:'civilian',scope:'region',cost:58,days:24,icon:3,requires:'regional-water',description:'Roll out clinics across this province after its water network is established.'},
  {id:'regional-administration',name:'Regional administration',category:'governance',scope:'region',cost:48,days:20,icon:2,description:'Strengthen local institutions, improve supply and open a regional recruitment base.'},
  {id:'national-administration',name:'National public service authority',category:'governance',scope:'province',cost:160,days:40,icon:2,requires:'integrity',description:'Create provincial administration and coordinate basic water delivery across the fifty provinces, one province at a time.'},
  {id:'resilience',name:'Infrastructure resilience',category:'governance',scope:'province',cost:100,days:30,icon:5,description:'Reduce infrastructure wear and sabotage damage; improve repairs and national continuity.'},
  {id:'counterintelligence',name:'Counter-infiltration bureau',category:'intelligence',scope:'province',cost:90,days:26,icon:1,requires:'analysis',description:'Uncover cartel fronts and reduce institutional penetration. Improves infrastructure audits.'},
  {id:'logistics',name:'Supply coordination',category:'security',scope:'province',cost:25,days:16,icon:5,description:'Improve security-unit supply and readiness recovery across the connected country.'},
];

export const EVENTS = [
  {id:'witness',title:'A witness comes forward',tag:'Intelligence opportunity',portrait:2,text:'A port worker is willing to testify about a network’s financial connections, but asks for protection for their family.',choices:[
    {label:'Fund protected relocation',detail:'−$8 · +15 evidence for all networks · +2 trust',cost:8,evidence:15,trust:2},
    {label:'Take an anonymous statement',detail:'+5 evidence for all networks',cost:0,evidence:5},
  ]},
  {id:'audit',title:'An irregularity in procurement',tag:'Governance decision',portrait:2,text:'An independent reporter has found inflated invoices in the provincial supply budget. Your office must decide how to respond.',choices:[
    {label:'Commission a public audit',detail:'−$7 · −8 corruption · +3 trust',cost:7,corruption:-8,trust:3},
    {label:'Publish the existing records',detail:'−2 corruption · +1 trust',cost:0,corruption:-2,trust:1},
  ]},
  {id:'storm',title:'Flooding along the coast',tag:'Civilian emergency',portrait:0,text:'Heavy rain has cut off several coastal communities. Local councils request emergency supplies before essential services fail.',choices:[
    {label:'Release emergency supplies',detail:'−$10 · +8 support in coastal districts · +3 trust',cost:10,coastSupport:8,trust:3},
    {label:'Coordinate local volunteers',detail:'+3 support in coastal districts · −2 trust',cost:0,coastSupport:3,trust:-2},
  ]},
  {id:'council',title:'A place at the table',tag:'Community relations',portrait:0,text:'Community representatives offer to share information if the government commits to regular, open meetings in their districts.',choices:[
    {label:'Establish community councils',detail:'−$6 · +5 support everywhere · +4 trust',cost:6,support:5,trust:4},
    {label:'Open a public reporting line',detail:'+3 intelligence everywhere',cost:0,intel:3},
  ]},
  {id:'pressure',title:'Pressure for a quick victory',tag:'Security decision',portrait:1,text:'National officials are pushing for a more visible response. Your commissioner recommends investing in readiness before expanding operations.',choices:[
    {label:'Fund additional training',detail:'−$8 · +5 security everywhere · +2 trust',cost:8,security:5,trust:2},
    {label:'Continue the current strategy',detail:'No budget or policy change',cost:0},
  ]},
  {id:'grid-failure',scope:'regional',damage:'power',title:'A regional grid failure',tag:'Infrastructure emergency',portrait:1,text:'A power station failure has interrupted water pumping, communications and hospital capacity. Provincial engineers request an emergency allocation.',choices:[
    {label:'Restore emergency generation',detail:'−$20 · repair the affected power station by 35 points',cost:20,repairPower:35},
    {label:'Stabilize critical circuits',detail:'−$4 · repair 10 points; slower recovery for other services',cost:4,repairPower:10},
  ]},
  {id:'freight-crisis',scope:'regional',damage:'rail',title:'Freight corridor under strain',tag:'Logistics disruption',portrait:1,text:'A rail terminal outage is holding up essential freight. Road detours can carry some deliveries, but sustained congestion will hurt jobs and force supply.',choices:[
    {label:'Fund a rapid rail repair',detail:'−$16 · +30 rail-terminal condition',cost:16,repairRail:30},
    {label:'Organize road detours',detail:'−$5 · +12 depot condition',cost:5,repairDepot:12},
  ]},
  {id:'neighborhood-relief',scope:'regional',title:'Families leave the outer wards',tag:'Humanitarian decision',portrait:0,text:'Neighborhood councils report that interrupted services and poor employment are driving displacement. Targeted relief can protect public confidence.',choices:[
    {label:'Fund a provincial relief program',detail:'−$14 · improve neighborhood access and reduce grievance',cost:14,neighborhoodAccess:15,grievance:-12},
    {label:'Support community shelters',detail:'−$4 · reduce neighborhood grievance by 5',cost:4,grievance:-5},
  ]},
  {id:'terminal-audit',scope:'regional',title:'A front inside the freight system',tag:'Institutional infiltration',portrait:2,text:'Inspectors suspect cartel intermediaries are diverting trade through an infrastructure contractor. An audit can expose the arrangement before it becomes entrenched.',choices:[
    {label:'Audit infrastructure contractors',detail:'−$14 · reduce provincial infrastructure infiltration by 25',cost:14,assetInfiltration:-25},
    {label:'Publish inspection records',detail:'+8 intelligence in this province',cost:0,intel:8},
  ]},
];

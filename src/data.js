// All places, organizations and characters in this game are fictional.
export const VERSION = 1;
export const HQ = 9;
export const LAND = [[180,130],[295,94],[425,120],[550,82],[685,110],[840,103],[972,177],[1065,280],[1018,403],[1071,502],[993,615],[905,681],[792,699],[679,662],[557,708],[426,660],[319,682],[212,606],[155,519],[110,416],[156,315],[135,222]];

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
export const DISTRICTS = regions.map(([name,x,y,terrain,population,network,threat],id)=>({id,name,x,y,terrain,population,network,threat}));
export const TERRAIN = {
  mountain: { label:'Highlands', fill:'#b3b396', travel:3 }, forest:{label:'Woodland',fill:'#aebc92',travel:2},
  rural:{label:'Rural district',fill:'#c7c6a2',travel:2}, urban:{label:'Urban district',fill:'#d0cbb0',travel:1},
  capital:{label:'Provincial capital',fill:'#d8d0b2',travel:1}, border:{label:'Border crossing',fill:'#c3b99a',travel:2},
  coast:{label:'Coastal district',fill:'#c3c7a5',travel:2}, port:{label:'Port district',fill:'#ccc4a6',travel:1},
};
export const GOVERNORS = [
  {id:'cruz',name:'Elena Cruz',role:'The community builder',portrait:0,bonus:'Civilian projects finish 25% faster.',description:'Rebuild public confidence from the ground up.'},
  {id:'ibarra',name:'Rafael Ibarra',role:'The commissioner',portrait:1,bonus:'Security units have 20% more operational power.',description:'Keep pressure on armed networks and hold the ground.'},
  {id:'vega',name:'Lucía Vega',role:'The prosecutor',portrait:2,bonus:'Investigations gather 25% more evidence; corruption rises more slowly.',description:'Build cases that survive beyond the next arrest.'},
];
export const DIFFICULTIES = {
  relaxed:{label:'Assisted',growth:0.7,income:1.3,trust:0.7,starting:100},
  standard:{label:'Standard',growth:1,income:1,trust:1,starting:80},
  veteran:{label:'Veteran',growth:1.3,income:0.85,trust:1.3,starting:65},
};
export const NETWORKS = [
  {id:0,name:'Los Cedros',short:'CEDROS',leader:'Mateo Salcedo',alias:'The Broker',portrait:3,color:'#bb6555',home:0,description:'A highland network sustained by intimidation and rural recruitment.'},
  {id:1,name:'La Marea',short:'MAREA',leader:'Inés Valdés',alias:'The Tide',portrait:4,color:'#c99851',home:18,description:'A coastal organization with deep financial ties to the port districts.'},
  {id:2,name:'La Frontera',short:'FRONTERA',leader:'Tomás Roca',alias:'The Quarry',portrait:5,color:'#96667c',home:5,description:'An entrenched network controlling isolated crossings in the east.'},
];
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
];

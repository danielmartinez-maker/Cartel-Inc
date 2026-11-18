import {ART} from './assets.js';
export const SPRITES={federal:0,police:1,intel:2,cartel:3,jeep:4,car:5,power:6,water:7,hospital:8,telecom:9,depot:10,rail:11,port:12,airport:13,dam:14,university:15,highway:16,bridge:17,agriculture:18,mining:19,industry:20,commerce:21,energy:22,front:23,cloud:24,birds:25,boat:26,truck:27,smoke:28,dust:29,muzzle:30,sparks:31,impact:32,houses:33,trees:34,construction:35};
export const TERRAIN_TILES={capital:0,urban:1,port:2,rural:3,forest:4,mountain:4,arid:6,wetland:7,coast:8,border:5};
export const NEIGHBORHOOD_TILES={civic:0,market:1,residential:1,industrial:5,docks:2,hills:4,outskirts:3};
export const TERRAIN_IMAGES=['terrainCivic','terrainResidential','terrainDocks','terrainRural','terrainHills','terrainIndustrial','terrainArid','terrainWetland','terrainCoast'];
export class RasterArt{
 constructor(onReady=()=>{}){this.images={};for(const [key,url]of [['country',ART.province],['terrain',ART.neighborhoods],['sprites',ART.sprites],...TERRAIN_IMAGES.map(key=>[key,ART[key]])]){const img=new Image();img.decoding='async';img.onload=()=>onReady();img.src=url;this.images[key]=img;}}
 ready(key){return this.images[key]?.complete&&this.images[key].naturalWidth>0;}
 sprite(ctx,key,x,y,size,angle=0,alpha=1){
  if(!this.ready('sprites'))return;const img=this.images.sprites,i=typeof key==='number'?key:SPRITES[key],sw=img.naturalWidth/6,sh=img.naturalHeight/6;
  if(i===undefined)return;ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.globalAlpha*=alpha;ctx.drawImage(img,(i%6)*sw,Math.floor(i/6)*sh,sw,sh,-size/2,-size/2,size,size);ctx.restore();
 }
 tile(ctx,index,x,y,w,h){const key=TERRAIN_IMAGES[index];if(this.ready(key)){ctx.drawImage(this.images[key],x,y,w,h);return true;}if(!this.ready('terrain'))return false;const img=this.images.terrain,sw=img.naturalWidth/3,sh=img.naturalHeight/3;ctx.drawImage(img,(index%3)*sw,Math.floor(index/3)*sh,sw,sh,x,y,w,h);return true;}
}
export const bounds=poly=>({x:Math.min(...poly.map(p=>p[0])),y:Math.min(...poly.map(p=>p[1])),w:Math.max(...poly.map(p=>p[0]))-Math.min(...poly.map(p=>p[0])),h:Math.max(...poly.map(p=>p[1]))-Math.min(...poly.map(p=>p[1]))});
export function canvasPath(ctx,poly){ctx.beginPath();poly.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();}
export function contains(poly,x,y){let hit=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;}
